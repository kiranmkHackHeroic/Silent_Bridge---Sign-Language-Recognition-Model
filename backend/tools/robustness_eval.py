"""Robustness stress test: real held-out recordings under controlled camera-like perturbations.

The evaluation model is trained on development signers only; every held-out TEST recording is
perturbed at the landmark-payload level (before feature extraction, so the full live feature pipeline
runs) and classified as a whole clip. Reported per condition: accuracy (correct AND accepted at the
calibrated threshold), top-1 accuracy ignoring the threshold, coverage (share accepted) and wrong
accepted words.

These are SYNTHETIC perturbations of real recordings, a proxy for camera conditions; they are not
webcam measurements. Real webcam numbers come from tools/evaluate_live.py on evaluation-only recordings.

Usage (from backend/):  python tools/robustness_eval.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_FEATURE_CONFIG, TrainingConfig  # noqa: E402
from app.recognition.landmarks import parse_frame  # noqa: E402
from app.recognition.predictor import SignPredictor  # noqa: E402
from app.recognition.sequence_features import frames_to_vector  # noqa: E402
from app.training.registry import active_paths  # noqa: E402
from app.training.train_model import choose_test_groups, default_stores, fit_model, known_labels_from, load_valid_samples  # noqa: E402
from app.video.extract import mirror_frame  # noqa: E402


def _map_points(frame, fx):
    out = dict(frame)
    out["hands"] = [{**h, "landmarks": [fx(p) for p in h["landmarks"]]} for h in frame.get("hands") or []]
    return out


def scale_about_centre(k):
    """Signer further away (k<1) or closer (k>1): image coordinates shrink/grow about the frame centre."""
    def f(frame):
        fr = _map_points(frame, lambda p: [0.5 + (p[0] - 0.5) * k, 0.5 + (p[1] - 0.5) * k, p[2] * k if len(p) > 2 else 0.0])
        if frame.get("face"):
            fc = frame["face"]
            fr["face"] = {"cx": 0.5 + (fc["cx"] - 0.5) * k, "cy": 0.5 + (fc["cy"] - 0.5) * k, "w": fc["w"] * k, "h": fc["h"] * k}
        return fr
    return f


def shift(dx):
    def f(frame):
        fr = _map_points(frame, lambda p: [p[0] + dx, p[1], p[2] if len(p) > 2 else 0.0])
        if frame.get("face"):
            fr["face"] = {**frame["face"], "cx": frame["face"]["cx"] + dx}
        return fr
    return f


def perturb(frames, name, rng):
    if name == "original":
        return frames
    if name == "mirrored (selfie video)":
        return [mirror_frame(f) for f in frames]
    if name == "no face visible":
        return [{**f, "face": None} for f in frames]
    if name.startswith("hand dropped in"):
        p = 0.2 if "20%" in name else 0.4
        return [{**f, "hands": []} if rng.random() < p else f for f in frames]
    if name == "fast (1.5x speed)":
        idx = np.round(np.arange(0, len(frames), 1.5)).astype(int)
        return [{**frames[i], "t": frames[0]["t"] + j * 33.3} for j, i in enumerate(idx[idx < len(frames)])]
    if name == "slow (0.67x speed)":
        idx = np.floor(np.arange(0, len(frames), 0.67)).astype(int)
        return [{**frames[i], "t": frames[0]["t"] + j * 33.3} for j, i in enumerate(idx[idx < len(frames)])]
    if name == "far (0.7x size)":
        return [scale_about_centre(0.7)(f) for f in frames]
    if name == "near (1.3x size)":
        return [scale_about_centre(1.3)(f) for f in frames]
    if name == "off-centre (+0.15 width)":
        return [shift(0.15)(f) for f in frames]
    if name == "landmark jitter (sd 0.01)":
        return [_map_points(f, lambda p: [p[0] + rng.normal(0, 0.01), p[1] + rng.normal(0, 0.01), p[2] if len(p) > 2 else 0.0]) for f in frames]
    raise ValueError(name)


CONDITIONS = ["original", "mirrored (selfie video)", "no face visible", "hand dropped in 20% of frames",
              "hand dropped in 40% of frames", "fast (1.5x speed)", "slow (0.67x speed)", "far (0.7x size)",
              "near (1.3x size)", "off-centre (+0.15 width)", "landmark jitter (sd 0.01)"]


def main():
    tcfg = TrainingConfig(candidate_models=["logreg"])
    samples, _ = load_valid_samples(default_stores(tcfg.sources), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    test_groups = choose_test_groups(samples, tcfg.test_fraction, tcfg.random_seed)
    dev = [s for s in samples if s.group not in test_groups]
    test = [s for s in samples if s.group in test_groups]
    model = fit_model("logreg", dev, DEFAULT_FEATURE_CONFIG, tcfg, np.random.default_rng(42))
    pred = SignPredictor()
    pred.model, pred.classes = model, [str(c) for c in model.classes_]
    thr = float((json.loads(active_paths()[1].read_text(encoding="utf-8")).get("calibration") or {}).get("threshold", 0.45))
    out = {}
    for cond in CONDITIONS:
        rng = np.random.default_rng(3)
        right = top1 = accepted = wrong_acc = n = 0
        for s in test:
            frames = perturb(s.frames, cond, rng)
            try:
                feats = [parse_frame(f) for f in frames]
            except Exception:
                continue
            vec = frames_to_vector(feats, DEFAULT_FEATURE_CONFIG)
            n += 1
            if vec is None:
                continue
            p = pred.predict_vector(vec)
            top1 += p.label == s.label
            if p.confidence >= thr:
                accepted += 1
                right += p.label == s.label
                wrong_acc += p.label != s.label
        out[cond] = {"recordings": n, "accuracy_accepted_and_correct": round(right / n, 4), "top1_ignoring_threshold": round(top1 / n, 4),
                     "coverage": round(accepted / n, 4), "wrong_accepted": int(wrong_acc)}
        print(f"{cond:32s} acc {right / n:.3f} | top-1 {top1 / n:.3f} | coverage {accepted / n:.3f} | wrong accepted {wrong_acc}", flush=True)
    report = {"test_groups": sorted(test_groups), "threshold": thr, "conditions": out,
              "note": "synthetic perturbations of real held-out recordings (landmark level); a proxy, not webcam results"}
    Path("reports").mkdir(exist_ok=True)
    Path("reports/robustness_eval.json").write_text(json.dumps(report, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
