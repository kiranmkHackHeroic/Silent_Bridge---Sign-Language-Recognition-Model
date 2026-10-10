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
from pathlib import Path

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


def eval_data_summary(vocab_labels: set[str] | None = None) -> dict:
    """What the evaluation data contains, plus metadata warnings (labels, signer and session IDs)."""
    store = eval_store()
    per_label: Counter = Counter()
    sessions, signers = Counter(), Counter()
    warnings: list[str] = []
    missing_meta = default_signer = not_eval = unknown = 0
    for s in store.iter_samples():
        per_label[s["label"]] += 1
        sessions[s.get("session_id") or ""] += 1
        signers[s.get("signer_id") or ""] += 1
        missing_meta += not s.get("session_id") or not s.get("signer_id")
        default_signer += s.get("signer_id") == "signer1"
        not_eval += s.get("purpose") != "eval"
        unknown += bool(vocab_labels) and s["label"] not in vocab_labels
    seqs = list_sequences()
    for d in seqs:
        signers[d.get("signer_id") or ""] += 0
        sessions[d.get("session_id") or ""] += 0
    total = sum(per_label.values())
    if missing_meta:
        warnings.append(f"{missing_meta} recording(s) without a signer or session ID")
    if default_signer:
        warnings.append(f"{default_signer} recording(s) use the default signer ID 'signer1': give every person their own ID")
    if not_eval:
        warnings.append(f"{not_eval} recording(s) in the evaluation store are not marked purpose=eval")
    if unknown:
        warnings.append(f"{unknown} recording(s) have a label that is not in the vocabulary")
    if total and len([k for k in sessions if k]) < 2:
        warnings.append("only one evaluation session: record a second one so the threshold can be checked fairly")
    return {"isolated": total, "per_label": dict(per_label), "sessions": sorted(x for x in sessions if x),
            "signers": sorted(x for x in signers if x), "recordings_per_session": {k: v for k, v in sessions.items() if k},
            "sequences": len(seqs), "sequence_signs": sum(len(s["glosses"]) for s in seqs), "metadata_warnings": warnings}


def _effective(pred_label: str, conf: float, threshold: float) -> str:
    """What the live app would do: below the threshold or '_none' -> no word."""
    return pred_label if (pred_label != NONE_LABEL and conf >= threshold) else NONE_LABEL


REPORTS_DIR = DATA_DIR.parent / "reports"


def save_report(rep: dict, out: Path | None = None, prefix: str = "live_eval") -> Path:
    """Write a report WITHOUT overwriting earlier ones: <prefix>_<UTC timestamp>.json (+ -2, -3 ... if taken)."""
    if out is None:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        out = REPORTS_DIR / f"{prefix}_{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.json"
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    base, k = out, 2
    while out.exists():
        out = base.with_name(f"{base.stem}-{k}{base.suffix}")
        k += 1
    out.write_text(json.dumps(rep, indent=1, ensure_ascii=False), encoding="utf-8")
    return out


def end_style(frames: list[dict]) -> str:
    """How the recorded sign ended: 'lowered' (hands gone at the end), 'hold' (hands still for the last
    ~0.5 s) or 'moving' (recording stopped while the hands were still moving)."""
    tail = frames[-15:]
    if not tail or not any(f.get("hands") for f in tail[-5:]):
        return "lowered"
    wrists = [f["hands"][0]["landmarks"][0][:2] for f in tail if f.get("hands")]
    if len(wrists) >= 10:
        steps = np.linalg.norm(np.diff(np.asarray(wrists, dtype=float), axis=0), axis=1)
        if float(np.mean(steps)) < 0.004:
            return "hold"
    return "moving"


def frame_timing(frames: list[dict]) -> dict:
    t = np.asarray([float(f.get("t", 0)) for f in frames])
    if len(t) < 3:
        return {"frames": len(t), "fps": None, "dropped_frames": 0}
    dt = np.diff(t)
    med = float(np.median(dt)) or 33.3
    return {"frames": len(t), "fps": round(1000.0 / med, 1), "dropped_frames": int(np.sum(dt > 1.5 * med)),
            "max_gap_ms": round(float(dt.max()), 1)}


def replay_isolated(predictor, vocab, threshold: float, samples: list[dict]) -> dict:
    """Each single-sign recording through the LIVE session (segmentation, threshold, suppression), then the
    cause of every error (app.evaluation.error_causes)."""
    import time as _time
    from ..recognition.pipeline import RecognitionSession
    from .error_causes import classify
    per, proc = [], []
    for s in samples:
        frames = s["frames"]
        sess = RecognitionSession(predictor, vocab, RecognitionSettings(confidence_threshold=threshold))
        last_t = float(frames[-1].get("t", 0))
        stream = list(frames) + [{"t": last_t + (i + 1) * 33.3, "w": frames[-1].get("w", 640), "h": frames[-1].get("h", 480),
                                  "hands": []} for i in range(30)]
        events = []
        for f in stream:
            t0 = _time.perf_counter()
            events += [e for e in sess.process(f) if e.get("type") in ("sign", "uncertain", "segment")]
            proc.append((_time.perf_counter() - t0) * 1000)
        c = classify(s["label"], events)
        per.append({"sample_id": s["sample_id"], "label": s["label"], "session": s.get("session_id"),
                    "end_style": end_style(frames), **c})
    causes = Counter(r["cause"] for r in per)
    by_end: dict = {}
    for r in per:
        by_end.setdefault(r["end_style"], Counter())[r["cause"]] += 1
    return {"recordings": len(per), "completed_signs": sum(r["decided_segments"] for r in per),
            "causes": dict(causes), "by_end_style": {k: dict(v) for k, v in by_end.items()},
            "correct_by_end_style": {k: {"correct": v.get("correct", 0), "n": sum(v.values())} for k, v in by_end.items()},
            "frame_processing_ms": {"mean": round(float(np.mean(proc)), 2), "p95": round(float(np.percentile(proc, 95)), 2)} if proc else None,
            "errors": [r for r in per if r["cause"] != "correct"]}


def evaluate_isolated(predictor, threshold: float, vocab=None) -> dict:
    from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
    rows = []
    raw_samples = []
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
                     "session": s.get("session_id"), "latency_ms": p.latency_ms, "timing": frame_timing(s.get("frames") or [])})
        raw_samples.append(s)
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
    res: dict = {"recordings": len(rows), "total_labeled_examples": len(rows), "not_in_model_vocabulary": out_vocab,
                 "threshold": threshold, "sign_recordings": len(signs), "none_recordings": len(nones)}
    all_labels = sorted(set(y_true) | set(y_eff))
    res["confusion_matrix"] = {"labels": all_labels, "matrix": confusion_matrix(y_true, y_eff, labels=all_labels).tolist(),
                               "note": "columns: word added at the threshold; '_none' = no word"}
    hist = {"correct": [0] * 10, "wrong": [0] * 10}
    for i in signs:
        if in_vocab[i]["pred"] is not None:
            b = min(9, int(in_vocab[i]["conf"] * 10))
            hist["correct" if y_top1[i] == y_true[i] else "wrong"][b] += 1
    res["confidence_histogram_top1"] = {"bins": [f"{b / 10:.1f}-{(b + 1) / 10:.1f}" for b in range(10)], **hist}
    lat = [r["latency_ms"] for r in in_vocab if r.get("latency_ms") is not None]
    res["classifier_latency_ms"] = ({"mean": round(float(np.mean(lat)), 2), "p95": round(float(np.percentile(lat, 95)), 2)}
                                    if lat else None)
    tim = [r["timing"] for r in in_vocab if r.get("timing")]
    fps = [t["fps"] for t in tim if t.get("fps")]
    res["recording_timing"] = {"mean_fps": round(float(np.mean(fps)), 1) if fps else None,
                               "dropped_frames": int(sum(t["dropped_frames"] for t in tim)),
                               "frames": int(sum(t["frames"] for t in tim))}
    if signs:
        res["top1_accuracy_ignoring_threshold"] = round(float(np.mean([y_top1[i] == y_true[i] for i in signs])), 4)
        res["accuracy"] = round(float(np.mean([y_eff[i] == y_true[i] for i in signs])), 4)
        res["rejected_as_uncertain"] = int(sum(y_eff[i] == NONE_LABEL for i in signs))
        res["rejection_rate"] = round(res["rejected_as_uncertain"] / len(signs), 4)
        res["outcomes_at_threshold"] = {
            "correct": int(sum(y_eff[i] == y_true[i] for i in signs)),
            "wrong": int(sum(y_eff[i] not in (NONE_LABEL, y_true[i]) for i in signs)),
            "rejected_or_missed": int(sum(y_eff[i] == NONE_LABEL for i in signs)),
            "false_detections": int(sum(y_eff[i] != NONE_LABEL for i in nones))}
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
    if vocab is not None:
        known_samples = [x for x in raw_samples if x["label"] in known and x.get("frames")]
        res["live_replay"] = replay_isolated(predictor, vocab, threshold, known_samples)
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
                    "sign_error_rate": c["sign_error_rate"], "conditions": d.get("conditions") or {},
                    "timing": frame_timing(frames)})
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
        "isolated": evaluate_isolated(predictor, threshold, vocab),
        "sequences": evaluate_sequences(predictor, vocab, threshold),
        "data": eval_data_summary(set(vocab.entries) if vocab is not None else None),
        "note": "Evaluation-only webcam recordings (stored separately, never used for training).",
        "evaluated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
