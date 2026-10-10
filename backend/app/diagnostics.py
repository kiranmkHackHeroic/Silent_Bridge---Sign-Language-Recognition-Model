"""Live-pipeline diagnostics: where does a recognition error come from?

Stages: camera -> detection (MediaPipe) -> features (schema hands-face-v2)
-> segmentation -> classification -> translation (Kannada).
Every frame gets a compact per-stage diagnostic; every segment result is
attributed to the stage that decided it. Nothing here changes a prediction.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone

import numpy as np

from .config import DATA_DIR, DEFAULT_FEATURE_CONFIG
from .recognition.landmarks import (FACE_FLAG_INDEX, FACEREL_OFFSET, FEATURE_SCHEMA, FRAME_DIM, HAND_DIM,
                                    ORIENT_OFFSET, PRESENCE_OFFSET, SIGNER_SIDE_FOR_LABEL, SLOTS, FrameFeatures,
                                    parse_frame)
from .recognition.sequence_features import feature_dim

DIAG_DIR = DATA_DIR / "diagnostics"
FEATURE_BLOCKS = {           # per-hand offsets inside a 73-value hand block
    "hand_shape": (0, 60), "image_position": (60, 63), "face_relative": (FACEREL_OFFSET, FACEREL_OFFSET + 3),
    "orientation": (ORIENT_OFFSET, ORIENT_OFFSET + 6), "presence": (PRESENCE_OFFSET, PRESENCE_OFFSET + 1),
}


def palm_facing(normal_img: np.ndarray) -> str:
    """Normal is in image axes (x right, y down, z away from camera): z < 0 means the palm faces the camera."""
    if not np.any(normal_img):
        return "unknown"
    z = float(normal_img[2])
    return "towards camera" if z < -0.5 else "away from camera" if z > 0.5 else "sideways"


def frame_diag(payload: dict, frame: FrameFeatures, prev_t: float | None) -> dict:
    """Compact per-frame diagnostics (sent with every 'state' message)."""
    v = frame.vector
    hands = []
    for i, slot in enumerate(SLOTS):
        if not frame.present[i]:
            continue
        blk = v[i * HAND_DIM:(i + 1) * HAND_DIM]
        score = next((h.get("score") for h in payload.get("hands") or [] if h.get("handedness") == slot), None)
        hands.append({
            "mediapipe_label": slot, "signer_hand": SIGNER_SIDE_FOR_LABEL[slot], "score": score,
            "palm": palm_facing(blk[ORIENT_OFFSET + 3:ORIENT_OFFSET + 6]),
            "face_relative": [round(float(x), 2) for x in blk[FACEREL_OFFSET:FACEREL_OFFSET + 2]] if frame.face else None,
        })
    w, h = payload.get("w") or 0, payload.get("h") or 0
    return {
        "resolution": f"{int(w)}x{int(h)}", "aspect": round(w / h, 3) if h else None,
        "dt_ms": None if prev_t is None else round(frame.t - prev_t, 1),
        "hands_sent": len(payload.get("hands") or []), "hands_valid": len(hands), "hands": hands,
        "face": frame.face,
        "feature_dim": int(v.shape[0]), "schema_ok": v.shape[0] == FRAME_DIM and bool(np.all(np.isfinite(v))),
        "face_flag": bool(v[FACE_FLAG_INDEX] > 0.5),
    }


def ood_stats(predictor, vector: np.ndarray | None) -> dict | None:
    """How far a live segment vector is from the training distribution (mean |z| under the model's scaler)."""
    if vector is None or predictor.model is None:
        return None
    from .training.train_model import _scaler_of
    sc = _scaler_of(predictor.model)
    if sc is None:
        return None
    mu, sd = sc
    z = np.abs((vector - mu) / np.where(sd == 0, 1, sd))
    ref = (predictor.meta or {}).get("ood_reference") or {}
    p99 = ref.get("mean_abs_z_p99")
    T = DEFAULT_FEATURE_CONFIG.resample_frames
    per_block = {}
    frame_part = z[: T * FRAME_DIM].reshape(T, FRAME_DIM)
    for name, (a, b) in FEATURE_BLOCKS.items():
        cols = [s * HAND_DIM + c for s in range(2) for c in range(a, b)]
        per_block[name] = round(float(frame_part[:, cols].mean()), 2)
    per_block["motion"] = round(float(z[T * FRAME_DIM:].mean()), 2)
    mean_z = float(z.mean())
    return {"mean_abs_z": round(mean_z, 3), "reference_p99": p99,
            "out_of_distribution": bool(p99 and mean_z > p99), "per_block_mean_abs_z": per_block,
            "worst_block": max(per_block, key=per_block.get)}


def schema_report() -> dict:
    return {"schema": FEATURE_SCHEMA, "frame_dim": FRAME_DIM, "hand_block_dim": HAND_DIM,
            "model_input_dim": feature_dim(DEFAULT_FEATURE_CONFIG), "resample_frames": DEFAULT_FEATURE_CONFIG.resample_frames,
            "blocks": {k: list(v) for k, v in FEATURE_BLOCKS.items()}}


# ---------------------------------------------------------------- snapshots (saved diagnostics logs)
def analyze_frames(frames: list[dict]) -> dict:
    """Summary of a recorded stretch of live frames, per pipeline stage."""
    if not frames:
        return {"frames": 0}
    ts = [float(f.get("t", 0)) for f in frames]
    dts = np.diff(ts) if len(ts) > 1 else np.array([0.0])
    parsed, bad = [], 0
    for f in frames:
        try:
            parsed.append(parse_frame(f))
        except Exception:
            bad += 1
    sizes = {f"{int(f.get('w', 0))}x{int(f.get('h', 0))}" for f in frames}
    labels = [h.get("handedness") for f in frames for h in f.get("hands") or []]
    finite = all(np.all(np.isfinite(p.vector)) for p in parsed)
    return {
        "frames": len(frames),
        "camera": {"resolutions": sorted(sizes), "mean_fps": round(1000.0 / float(np.mean(dts)), 1) if np.mean(dts) > 0 else None,
                   "frame_interval_ms": {"mean": round(float(np.mean(dts)), 1), "p95": round(float(np.percentile(dts, 95)), 1),
                                         "max": round(float(np.max(dts)), 1)}},
        "detection": {"frames_with_hands": round(float(np.mean([bool(f.get("hands")) for f in frames])), 3),
                      "frames_with_two_hands": round(float(np.mean([len(f.get("hands") or []) >= 2 for f in frames])), 3),
                      "frames_with_face": round(float(np.mean([bool(f.get("face")) for f in frames])), 3),
                      "mediapipe_labels": {k: labels.count(k) for k in set(labels) if k}},
        "features": {"unparseable_frames": bad, "all_finite": bool(finite), "frame_dim_ok": all(p.vector.shape[0] == FRAME_DIM for p in parsed),
                     "valid_hand_frames": int(sum(p.has_hands for p in parsed))},
    }


def save_snapshot(frames: list[dict], events: list[dict], note: str = "") -> dict:
    DIAG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    summary = analyze_frames(frames)
    stages = count_stages(events)
    doc = {"created_at": stamp, "note": note[:500], "summary": summary, "event_stages": stages,
           "events": events[-300:], "frames": frames[-1800:]}
    path = DIAG_DIR / f"diag_{stamp}.json"
    path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    return {"file": str(path), "summary": summary, "event_stages": stages}


def count_stages(events: list[dict]) -> dict:
    out: dict[str, int] = {}
    for e in events:
        stage = (e.get("diagnosis") or {}).get("stage")
        if stage:
            out[stage] = out.get(stage, 0) + 1
    return out


# ---------------------------------------------------------------- browser vs Python extraction
def compare_extractions(browser_frames: list[dict], python_frames: list[dict], python_fps: float) -> dict:
    """Compare landmarks extracted by the BROWSER (live path) and by Python (training path) from the
    same video file. Browser frames carry 'media_t' (video time, s); Python frames carry 't' (ms)."""
    if not browser_frames or not python_frames:
        return {"matched_frames": 0}
    py_t = np.array([f["t"] / 1000.0 for f in python_frames])
    diffs, label_agree, presence_agree, feat_diffs = [], [], [], []
    block_diffs: dict[str, list[float]] = {k: [] for k in FEATURE_BLOCKS}
    face_agree = []
    for bf in browser_frames:
        mt = bf.get("media_t")
        if mt is None or not math.isfinite(mt):
            continue
        j = int(np.argmin(np.abs(py_t - mt)))
        if abs(py_t[j] - mt) > 0.6 / max(python_fps, 1):
            continue
        pf = python_frames[j]
        presence_agree.append(bool(bf.get("hands")) == bool(pf.get("hands")))
        bmap = {h["handedness"]: np.asarray(h["landmarks"]) for h in bf.get("hands") or []}
        pmap = {h["handedness"]: np.asarray(h["landmarks"]) for h in pf.get("hands") or []}
        for lab, pts in pmap.items():
            if lab in bmap:
                label_agree.append(True)
                diffs.append(float(np.mean(np.linalg.norm(bmap[lab][:, :2] - pts[:, :2], axis=1))))
            elif bmap:
                label_agree.append(False)
        try:
            a, b = parse_frame({**bf, "t": pf["t"]}), parse_frame(pf)
            face_agree.append(bool(a.face) == bool(b.face))
            if a.has_hands and b.has_hands:
                d = np.abs(a.vector - b.vector)
                feat_diffs.append(float(np.mean(d)))
                for name, (lo, hi) in FEATURE_BLOCKS.items():
                    cols = [s_ * HAND_DIM + c for s_ in range(2) for c in range(lo, hi)]
                    block_diffs[name].append(float(np.mean(d[cols])))
        except Exception:
            pass
    return {
        "matched_frames": len(presence_agree),
        "hand_presence_agreement": round(float(np.mean(presence_agree)), 3) if presence_agree else None,
        "handedness_agreement": round(float(np.mean(label_agree)), 3) if label_agree else None,
        "mean_landmark_distance": round(float(np.mean(diffs)), 4) if diffs else None,
        "median_landmark_distance": round(float(np.median(diffs)), 4) if diffs else None,
        "mean_abs_feature_difference": round(float(np.mean(feat_diffs)), 4) if feat_diffs else None,
        "feature_difference_by_block": {k: round(float(np.mean(v)), 4) for k, v in block_diffs.items() if v},
        "face_presence_agreement": round(float(np.mean(face_agree)), 3) if face_agree else None,
        "note": "distances are in normalized image units (1.0 = frame width/height)",
    }
