"""Live / API inference for the continuous (sentence) model."""
from __future__ import annotations

import json
import threading
from pathlib import Path

import joblib
import numpy as np

from ..recognition.landmarks import FrameFeatures, HAND_DIM, POS_OFFSET
from .model import edit_distance
from .train import CONT_DIR, nearest_sentence, resample


def features_to_sequence(feats: list[FrameFeatures], stride: int | None = None) -> np.ndarray | None:
    """Same sequence features as app.continuous.dataset.frames_to_sequence, from parsed frames.
    Adaptively selects stride to target the ~15 fps (66.7 ms/frame) temporal resolution the model was trained on."""
    has = [f.has_hands for f in feats]
    if sum(has) < 6:
        return None
    first, last = has.index(True), len(has) - 1 - has[::-1].index(True)
    active = feats[first:last + 1]
    if stride is None:
        if len(active) >= 2:
            dt_avg = (active[-1].t - active[0].t) / (len(active) - 1)
            # If input is already ~15-20 fps (dt >= 48ms), stride 1 preserves temporal resolution
            # If input is ~30 fps or higher (dt < 48ms), stride 2 downsamples to ~15 fps
            stride = 1 if dt_avg >= 48.0 else max(1, int(round(66.6 / max(dt_avg, 1.0))))
        else:
            stride = 1
    mat = np.stack([f.vector for f in active])[::stride]
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

    def partial(self, feats: list[FrameFeatures]) -> dict | None:
        """Incremental (tentative) gloss decode of the sentence signed SO FAR: greedy CTC path only. Shown
        while signing; never added to the transcript (the final sentence is decided at the segment end)."""
        if not self.loaded:
            return None
        seq = features_to_sequence(feats)
        if seq is None:
            return None
        glosses, conf = self.bundle["ctc"].decode_greedy(seq)
        return {"glosses": glosses, "gloss_confidence": round(conf, 3), "tentative": True}

    def recognize(self, feats: list[FrameFeatures]) -> dict | None:
        if not self.loaded:
            return None
        seq = features_to_sequence(feats)
        if seq is None:
            return None
        b = self.bundle
        table = b["table"]
        glosses, conf = b["ctc"].decode(seq, beam_width=8)
        if not glosses:
            glosses, conf = b["ctc"].decode_greedy(seq)
        sid, dist = nearest_sentence(glosses, table, b.get("normalized_matcher", False))
        x = resample(seq, b["resample"]).reshape(1, -1)
        probs = b["baseline"].predict_proba(x)[0]
        classes = [str(c) for c in b["baseline"].classes_]
        base_sid = classes[int(np.argmax(probs))]
        base_p = float(np.max(probs))
        decoder = b.get("decoder") or ("greedy_nearest" if b["selected"] == "ctc" else "baseline")
        posterior, candidates = None, []
        if decoder in ("ctc_likelihood", "fusion"):
            ll = b["ctc"].sentence_log_likelihoods(seq, {k: e["gloss"] for k, e in table.items()})
            lam = float(b.get("fusion_lambda", 1.0)) if decoder == "fusion" else 0.0
            logpb = dict(zip(classes, np.log(np.maximum(probs, 1e-12))))
            ids = list(ll)
            # Alignment term: incorporate gloss sequence match to reward agreeing candidates
            gloss_term = []
            for k in ids:
                c_gloss = table.get(k, {}).get("gloss", [])
                ed = edit_distance(glosses, c_gloss)
                sim = 1.0 - (ed / max(len(glosses), len(c_gloss), 1))
                gloss_term.append(np.log(max(sim, 0.001)))
            score = np.array([ll[k] + lam * logpb.get(k, float("-inf")) for k in ids]) + 1.2 * np.array(gloss_term)
            finite = np.isfinite(score)
            post = np.zeros(len(ids))
            if finite.any() and len(ids) > 0:
                e = np.exp(score[finite] - score[finite].max())
                s = e.sum()
                if s > 0:
                    post[finite] = e / s
                order = np.argsort(-post)
                chosen = ids[order[0]]
                posterior = float(post[order[0]])
                candidates = [
                    {
                        "sentence_id": ids[i],
                        "sentence": table.get(ids[i], {}).get("sentence", ids[i]),
                        "kannada": table.get(ids[i], {}).get("kannada", ""),
                        "posterior": round(float(post[i]), 3),
                    }
                    for i in order[:3]
                ]
            else:
                chosen = sid
                posterior = 0.0
                candidates = []
        else:
            chosen = sid if decoder == "greedy_nearest" else base_sid
            if decoder == "greedy_nearest":
                sorted_by_dist = sorted(table.items(), key=lambda kv: edit_distance(glosses, kv[1].get("gloss", [])))
                candidates = [
                    {
                        "sentence_id": k,
                        "sentence": v.get("sentence", k),
                        "kannada": v.get("kannada", ""),
                        "posterior": round(1.0 - edit_distance(glosses, v.get("gloss", [])) / max(len(glosses), len(v.get("gloss", [])), 1), 3),
                    }
                    for k, v in sorted_by_dist[:3]
                ]
                posterior = candidates[0]["posterior"] if candidates else None
            else:
                top_base = np.argsort(-probs)[:3]
                candidates = [
                    {
                        "sentence_id": classes[i],
                        "sentence": table.get(classes[i], {}).get("sentence", classes[i]),
                        "kannada": table.get(classes[i], {}).get("kannada", ""),
                        "posterior": round(float(probs[i]), 3),
                    }
                    for i in top_base
                ]
                posterior = float(probs[top_base[0]]) if len(top_base) else None

        # accept when posterior meets threshold or top-margin is clear
        threshold = b.get("accept_threshold")
        if len(candidates) > 1:
            p0 = candidates[0].get("posterior") or 0.0
            p1 = candidates[1].get("posterior") or 0.0
            margin = max(0.0, float(p0) - float(p1))
        else:
            margin = float(posterior or 0.0)

        accepted = (
            posterior is None
            or threshold is None
            or posterior >= float(threshold)
            or (posterior >= 0.28 and margin >= 0.12)
        )
        entry = table.get(chosen) or table.get(sid) or {
            "sentence": chosen,
            "kannada": "",
            "gloss": [],
            "translation_status": "unmapped",
        }
        actual_dist = edit_distance(glosses, entry.get("gloss", []))
        base_entry = table.get(base_sid) or {}
        return {
            "accepted": accepted,
            "posterior": None if posterior is None else round(posterior, 3),
            "accept_threshold": threshold,
            "candidates": candidates,
            "glosses": glosses,
            "gloss_confidence": round(conf, 3),
            "method": decoder,
            "sentence_id": chosen,
            "sentence": entry.get("sentence", chosen),
            "kannada": entry.get("kannada", ""),
            "reference_gloss": entry.get("gloss", []),
            "gloss_distance": int(actual_dist),
            "baseline_sentence": base_entry.get("sentence", base_sid),
            "baseline_confidence": round(base_p, 3),
            "translation_status": entry.get("translation_status", "fallback"),
        }
