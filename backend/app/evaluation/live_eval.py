"""Live-performance evaluation on the user's own EVALUATION-ONLY webcam recordings.

Evaluation recordings are stored outside every training store (data/eval_recordings for single
signs, data/eval_sequences for consecutive-sign sequences), so they can never leak into training,
and the numbers here measure how the deployed model generalises to *new* live recordings.

Isolated recordings -> accuracy, precision / recall / macro-F1 (rejections count as "no word"),
false detections (non-sign '_none' recordings that produced a word), per-condition accuracy,
confusions. Sequences -> each recording is replayed frame by frame through the live
RecognitionSession and aligned with the glosses the signer declared (sign error rate,
substitutions, deletions, insertions).
"""
from __future__ import annotations

import json
import re
import secrets
import time
from collections import Counter
from datetime import datetime, timezone

import numpy as np

from ..config import DATA_DIR, NONE_LABEL, RecognitionSettings
from ..dataset.store import SAFE_ID, DatasetError, DatasetStore
from ..recognition.landmarks import parse_frame
from ..recognition.sequence_features import frames_to_vector

EVAL_DATASET_DIR = DATA_DIR / "eval_recordings"
EVAL_SEQUENCE_DIR = DATA_DIR / "eval_sequences"
MAX_SEQUENCE_FRAMES = 2400          # 80 s at 30 fps
CONDITION_KEYS = ("speed", "distance", "lighting", "position")
CONDITION_VALUE = re.compile(r"^[a-z_]{1,20}$")


def eval_store() -> DatasetStore:
    return DatasetStore(EVAL_DATASET_DIR)


def clean_conditions(conditions: dict | None) -> dict:
    out = {}
    for k, v in (conditions or {}).items():
        if k in CONDITION_KEYS and isinstance(v, str) and CONDITION_VALUE.match(v):
            out[k] = v
    return out


def save_sequence(glosses: list[str], frames: list[dict], session_id: str, signer_id: str,
                  conditions: dict | None = None) -> dict:
    for name, value in (("session_id", session_id), ("signer_id", signer_id)):
        if not SAFE_ID.match(value or ""):
            raise DatasetError(f"invalid {name}")
    if not 1 <= len(glosses) <= 12 or not all(SAFE_ID.match(g) for g in glosses):
        raise DatasetError("a sequence needs 1-12 valid sign labels")
    if not frames or len(frames) > MAX_SEQUENCE_FRAMES:
        raise DatasetError(f"a sequence needs 1-{MAX_SEQUENCE_FRAMES} frames")
    hand_frames = sum(1 for f in frames if f.get("hands"))
    if hand_frames == 0:
        raise DatasetError("no hands were detected in this recording - sequence not saved")
    EVAL_SEQUENCE_DIR.mkdir(parents=True, exist_ok=True)
    seq_id = f"seq_{session_id}_{int(time.time() * 1000)}_{secrets.token_hex(2)}"
    doc = {"sequence_id": seq_id, "glosses": glosses, "session_id": session_id, "signer_id": signer_id,
           "conditions": clean_conditions(conditions), "purpose": "eval",
           "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "num_frames": len(frames), "hand_frames": hand_frames, "frames": frames}
    (EVAL_SEQUENCE_DIR / f"{seq_id}.json").write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    return {k: v for k, v in doc.items() if k != "frames"}


def list_sequences() -> list[dict]:
    if not EVAL_SEQUENCE_DIR.exists():
        return []
    out = []
    for f in sorted(EVAL_SEQUENCE_DIR.glob("seq_*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        out.append(d)
    return out


def delete_sequence(seq_id: str) -> bool:
    if not SAFE_ID.match(seq_id):
        raise DatasetError("invalid id")
    f = EVAL_SEQUENCE_DIR / f"{seq_id}.json"
    if f.exists():
        f.unlink()
        return True
    return False


def eval_data_summary() -> dict:
    store = eval_store()
    per_label: Counter = Counter()
    sessions = set()
    for s in store.iter_samples():
        per_label[s["label"]] += 1
        sessions.add(s.get("session_id"))
    seqs = list_sequences()
    return {"isolated": sum(per_label.values()), "per_label": dict(per_label), "sessions": sorted(x for x in sessions if x),
            "sequences": len(seqs), "sequence_signs": sum(len(s["glosses"]) for s in seqs)}


def _effective(pred_label: str, conf: float, threshold: float) -> str:
    """What the live app would do: below the threshold or '_none' -> no word."""
    return pred_label if (pred_label != NONE_LABEL and conf >= threshold) else NONE_LABEL


def evaluate_isolated(predictor, threshold: float) -> dict:
    from sklearn.metrics import precision_recall_fscore_support
    rows = []
    for s in eval_store().iter_samples():
        frames = []
        for f in s.get("frames") or []:
            try:
                frames.append(parse_frame(f))
            except Exception:
                continue
        vec = frames_to_vector(frames, predictor.feature_config) if frames else None
        if vec is None:
            rows.append({"label": s["label"], "pred": None, "conf": 0.0, "conditions": s.get("conditions") or {}})
            continue
        p = predictor.predict_vector(vec)
        rows.append({"label": s["label"], "pred": p.label, "conf": float(p.confidence), "conditions": s.get("conditions") or {},
                     "session": s.get("session_id")})
    if not rows:
        return {"recordings": 0}
    known = set(predictor.classes)
    in_vocab = [r for r in rows if r["label"] in known or r["label"] == NONE_LABEL]
    out_vocab = len(rows) - len(in_vocab)
    y_true = [r["label"] for r in in_vocab]
    y_eff = [_effective(r["pred"] or NONE_LABEL, r["conf"], threshold) for r in in_vocab]
    y_top1 = [r["pred"] or NONE_LABEL for r in in_vocab]
    sign_labels = sorted({y for y in y_true if y != NONE_LABEL})
    signs = [i for i, y in enumerate(y_true) if y != NONE_LABEL]
    nones = [i for i, y in enumerate(y_true) if y == NONE_LABEL]
    res: dict = {"recordings": len(rows), "not_in_model_vocabulary": out_vocab, "threshold": threshold,
                 "sign_recordings": len(signs), "none_recordings": len(nones)}
    if signs:
        res["top1_accuracy_ignoring_threshold"] = round(float(np.mean([y_top1[i] == y_true[i] for i in signs])), 4)
        res["accuracy"] = round(float(np.mean([y_eff[i] == y_true[i] for i in signs])), 4)
        res["rejected_as_uncertain"] = int(sum(y_eff[i] == NONE_LABEL for i in signs))
        p, r, f, _ = precision_recall_fscore_support(y_true, y_eff, labels=sign_labels, average="macro", zero_division=0)
        res.update({"macro_precision": round(float(p), 4), "macro_recall": round(float(r), 4), "macro_f1": round(float(f), 4)})
        pc, rc, fc, sup = precision_recall_fscore_support(y_true, y_eff, labels=sign_labels, zero_division=0)
        res["per_class"] = {lab: {"precision": round(float(pc[i]), 3), "recall": round(float(rc[i]), 3), "f1": round(float(fc[i]), 3),
                                  "support": int(sup[i])} for i, lab in enumerate(sign_labels)}
        conf = Counter((y_true[i], y_eff[i]) for i in signs if y_eff[i] != y_true[i] and y_eff[i] != NONE_LABEL)
        res["top_confusions"] = [{"true": a, "predicted": b, "count": c} for (a, b), c in conf.most_common(10)]
        by_cond: dict = {}
        for i in signs:
            for k, v in in_vocab[i]["conditions"].items():
                d = by_cond.setdefault(k, {}).setdefault(v, [0, 0])
                d[0] += y_eff[i] == y_true[i]
                d[1] += 1
        res["accuracy_by_condition"] = {k: {v: {"accuracy": round(a / n, 3), "n": n} for v, (a, n) in vals.items()}
                                        for k, vals in by_cond.items()}
    res["thresholds"] = threshold_analysis(in_vocab, threshold)
    if nones:
        fd = sum(y_eff[i] != NONE_LABEL for i in nones)
        res["false_detections"] = int(fd)
        res["false_detection_rate"] = round(fd / len(nones), 4)
    return res


THRESHOLDS = [round(float(t), 2) for t in np.arange(0.05, 0.96, 0.05)]


def _at_threshold(rows: list[dict], t: float) -> dict:
    """What the live app would do on these recordings at threshold t."""
    signs = [r for r in rows if r["label"] != NONE_LABEL]
    nones = [r for r in rows if r["label"] == NONE_LABEL]
    eff = lambda r: _effective(r["pred"] or NONE_LABEL, r["conf"], t)  # noqa: E731
    correct = sum(eff(r) == r["label"] for r in signs)
    wrong = sum(eff(r) not in (NONE_LABEL, r["label"]) for r in signs)
    missed = sum(eff(r) == NONE_LABEL for r in signs)
    false_det = sum(eff(r) != NONE_LABEL for r in nones)
    acc_words = correct + wrong + false_det
    prec = correct / acc_words if acc_words else 0.0
    rec = correct / len(signs) if signs else 0.0
    return {"threshold": t, "correct": correct, "wrong_words": wrong, "missed_signs": missed, "false_detections": false_det,
            "coverage": round((correct + wrong) / len(signs), 4) if signs else 0.0,
            "precision": round(prec, 4), "recall": round(rec, 4),
            "f1": round(2 * prec * rec / (prec + rec), 4) if prec + rec else 0.0,
            "false_detection_rate": round(false_det / len(nones), 4) if nones else None}


def threshold_analysis(rows: list[dict], model_threshold: float) -> dict:
    """Threshold curve on the webcam evaluation recordings, plus an honest leave-one-SESSION-out choice:
    the threshold is chosen (max F1, where false detections count as wrong words) on the other sessions
    and scored on the held-out one."""
    rows = [r for r in rows if r["pred"] is not None]
    curve = [_at_threshold(rows, t) for t in THRESHOLDS]
    out = {"curve": curve, "at_model_threshold": _at_threshold(rows, model_threshold)}
    sessions = sorted({r.get("session") for r in rows if r.get("session")})
    if len(sessions) < 2:
        out["selection"] = {"possible": False, "reason": "needs evaluation recordings from at least 2 sessions"}
        return out
    held = []
    for sess in sessions:
        other = [r for r in rows if r.get("session") != sess]
        mine = [r for r in rows if r.get("session") == sess]
        best = max(THRESHOLDS, key=lambda t: (_at_threshold(other, t)["f1"], -abs(t - model_threshold)))
        held.append({"session": sess, "chosen_threshold": best, **{k: v for k, v in _at_threshold(mine, best).items() if k != "threshold"}})
    pooled = {k: sum(h[k] for h in held) for k in ("correct", "wrong_words", "missed_signs", "false_detections")}
    recommended = max(THRESHOLDS, key=lambda t: (_at_threshold(rows, t)["f1"], -abs(t - model_threshold)))
    out["selection"] = {"possible": True, "per_held_out_session": held, "held_out_totals": pooled,
                        "recommended_threshold": recommended,
                        "note": "chosen with all sessions; its expected performance is the held-out (leave-one-session-out) result"}
    return out


def evaluate_sequences(predictor, vocab, threshold: float, settings: dict | None = None) -> dict:
    from ..recognition.pipeline import RecognitionSession
    from ..training.train_model import edit_counts
    seqs = list_sequences()
    if not seqs:
        return {"sequences": 0}
    total = Counter()
    per = []
    for d in seqs:
        cfg = RecognitionSettings(confidence_threshold=threshold)
        cfg.update(settings or {})
        session = RecognitionSession(predictor, vocab, cfg)
        emitted = []
        frames = d["frames"]
        for f in frames:
            for ev in session.process(f):
                if ev["type"] == "sign":
                    emitted.append(ev["token"]["label"])
        t = frames[-1].get("t", 0)
        for _ in range(45):                     # hands down at the end closes the last sign
            t += 33.3
            for ev in session.process({"t": t, "w": frames[-1].get("w", 640), "h": frames[-1].get("h", 480), "hands": []}):
                if ev["type"] == "sign":
                    emitted.append(ev["token"]["label"])
        c = edit_counts(d["glosses"], emitted)
        for k in ("reference_signs", "emitted_signs", "substitutions", "deletions", "insertions"):
            total[k] += c[k]
        per.append({"sequence_id": d["sequence_id"], "glosses": d["glosses"], "emitted": emitted,
                    "sign_error_rate": c["sign_error_rate"], "conditions": d.get("conditions") or {}})
    n = total["reference_signs"]
    return {"sequences": len(seqs), **dict(total),
            "sign_error_rate": round((total["substitutions"] + total["deletions"] + total["insertions"]) / n, 4) if n else None,
            "exactly_right": sum(p["glosses"] == p["emitted"] for p in per), "per_sequence": per}


def evaluate_live(predictor, vocab, threshold: float | None = None) -> dict:
    if not predictor.loaded:
        return {"error": "no trained model is loaded"}
    if threshold is None:
        cal = (predictor.meta or {}).get("calibration") or {}
        threshold = float(cal.get("threshold") or RecognitionSettings().confidence_threshold)
    return {
        "model_version": (predictor.meta or {}).get("model_version"),
        "threshold": threshold,
        "isolated": evaluate_isolated(predictor, threshold),
        "sequences": evaluate_sequences(predictor, vocab, threshold),
        "data": eval_data_summary(),
        "note": "Evaluation-only webcam recordings (stored separately, never used for training).",
        "evaluated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
