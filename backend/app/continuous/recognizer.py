"""Live / API inference for the continuous (sentence) model."""
from __future__ import annotations

import json
import threading
from pathlib import Path

import joblib
import numpy as np

from ..recognition.landmarks import FrameFeatures, HAND_DIM, POS_OFFSET
from .train import CONT_DIR, nearest_sentence, resample


def features_to_sequence(feats: list[FrameFeatures], stride: int = 2) -> np.ndarray | None:
    """Same sequence features as app.continuous.dataset.frames_to_sequence, from parsed frames."""
    has = [f.has_hands for f in feats]
    if sum(has) < 6:
        return None
    first, last = has.index(True), len(has) - 1 - has[::-1].index(True)
    mat = np.stack([f.vector for f in feats[first:last + 1]])[::stride]
    pos = np.concatenate([mat[:, s * HAND_DIM + POS_OFFSET: s * HAND_DIM + POS_OFFSET + 3] for s in range(2)], axis=1)
    vel = np.vstack([np.zeros((1, 6), np.float32), np.diff(pos, axis=0) * 5.0])
    return np.concatenate([mat, vel], axis=1).astype(np.float32)


class ContinuousRecognizer:
    def __init__(self, root: Path = CONT_DIR):
        self.root = Path(root)
        self.bundle = None
        self.metrics: dict = {}
        self.error: str | None = None
        self._lock = threading.Lock()

    @property
    def loaded(self) -> bool:
        return self.bundle is not None

    def load(self) -> bool:
        with self._lock:
            self.bundle, self.metrics, self.error = None, {}, None
            try:
                version = json.loads((self.root / "active.json").read_text(encoding="utf-8"))["version"]
                folder = self.root / version
                self.bundle = joblib.load(folder / "continuous_model.joblib")
                self.metrics = json.loads((folder / "metrics.json").read_text(encoding="utf-8"))
                return True
            except (OSError, KeyError, ValueError, json.JSONDecodeError) as exc:
                self.error = f"no continuous model ({exc.__class__.__name__}) - import ISL-CSLTR and run app.continuous.train"
                return False

    def status(self) -> dict:
        return {"loaded": self.loaded, "error": self.error, "version": self.metrics.get("version"),
                "selected_method": self.metrics.get("selected_method"),
                "ctc": self.metrics.get("ctc"), "baseline": self.metrics.get("baseline"),
                "sentences": self.metrics.get("sentences"), "gloss_vocabulary": self.metrics.get("gloss_vocabulary")}

    def recognize(self, feats: list[FrameFeatures]) -> dict | None:
        if not self.loaded:
            return None
        seq = features_to_sequence(feats)
        if seq is None:
            return None
        b = self.bundle
        table = b["table"]
        glosses, conf = b["ctc"].decode(seq)
        sid, dist = nearest_sentence(glosses, table, b.get("normalized_matcher", False))
        x = resample(seq, b["resample"]).reshape(1, -1)
        probs = b["baseline"].predict_proba(x)[0]
        classes = [str(c) for c in b["baseline"].classes_]
        base_sid = classes[int(np.argmax(probs))]
        base_p = float(np.max(probs))
        decoder = b.get("decoder") or ("greedy_nearest" if b["selected"] == "ctc" else "baseline")
        if decoder in ("ctc_likelihood", "fusion"):
            ll = b["ctc"].sentence_log_likelihoods(seq, {k: e["gloss"] for k, e in table.items()})
            lam = float(b.get("fusion_lambda", 1.0)) if decoder == "fusion" else 0.0
            logpb = dict(zip(classes, np.log(np.maximum(probs, 1e-12))))
            chosen = max(ll, key=lambda k: ll[k] + lam * logpb.get(k, float("-inf")))
        else:
            chosen = sid if decoder == "greedy_nearest" else base_sid
        entry = table[chosen]
        return {
            "glosses": glosses, "gloss_confidence": round(conf, 3), "method": decoder,
            "sentence_id": chosen, "sentence": entry["sentence"], "kannada": entry["kannada"],
            "reference_gloss": entry["gloss"], "gloss_distance": int(dist),
            "baseline_sentence": table[base_sid]["sentence"], "baseline_confidence": round(base_p, 3),
            "translation_status": entry["translation_status"],
        }
