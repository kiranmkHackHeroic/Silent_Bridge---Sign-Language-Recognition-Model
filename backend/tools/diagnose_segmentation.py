"""Diagnose continuous-segmentation errors on REAL held-out dataset videos.

Trains a quick baseline on the development signer groups only, then replays
each held-out video (with hand-free gaps) through RecognitionSession and reports
per-video emissions and which boundary type produced extra words.

Usage (from backend/):  python tools/diagnose_segmentation.py [--settings '{"dip_split": false}']
Tuning must be judged on DEVELOPMENT groups (--on dev); report final numbers on test.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_FEATURE_CONFIG, RecognitionSettings, TrainingConfig  # noqa: E402
from app.recognition.pipeline import RecognitionSession  # noqa: E402
from app.recognition.predictor import SignPredictor  # noqa: E402
from app.training.train_model import (choose_test_groups, default_stores, fit_model, known_labels_from,  # noqa: E402
                                      load_valid_samples)
from app.translation.kannada_mapping import Vocabulary  # noqa: E402


def replay(model, classes, samples, settings: RecognitionSettings):
    p = SignPredictor()
    p.model, p.classes = model, classes
    session = RecognitionSession(p, Vocabulary(), settings)
    per_video, reasons, durations = [], Counter(), []
    t = 0.0
    for s in samples:
        emitted = []
        frames = s.frames
        for _ in range(12):
            for ev in session.process({"t": t, "w": frames[0]["w"], "h": frames[0]["h"], "hands": []}):
                if ev["type"] == "sign":
                    emitted.append((ev["token"]["label"], ev.get("boundary", "segment_end")))
            t += 33.3
        t0 = frames[0]["t"]
        for f in frames:
            for ev in session.process({**f, "t": t + f["t"] - t0}):
                if ev["type"] == "sign":
                    emitted.append((ev["token"]["label"], ev.get("boundary", "segment_end")))
                if ev["type"] in ("segment", "uncertain"):
                    reasons[f"{ev['type']}:{ev.get('result', '')}:{ev.get('reason')}"] += 1
                    durations.append(ev.get("duration_ms", 0))
        t += frames[-1]["t"] - t0 + 33.3
        per_video.append((s.label, emitted))
    for _ in range(15):
        session.process({"t": t, "w": 640, "h": 480, "hands": []})
        t += 33.3
    return per_video, reasons


def summarize(per_video):
    n = len(per_video)
    exact = sum(1 for lab, em in per_video if [e[0] for e in em] == [lab])
    counts = Counter(len(em) for _, em in per_video)
    extra_by = Counter(b for lab, em in per_video for i, (_, b) in enumerate(em) if len(em) > 1)
    correct_any = sum(1 for lab, em in per_video if lab in [e[0] for e in em])
    return {"videos": n, "exactly_one_correct_word": exact, "contains_correct_word": correct_any,
            "emissions_per_video": dict(sorted(counts.items())), "boundary_types_in_multi_emission_videos": dict(extra_by)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--settings", default="{}")
    ap.add_argument("--on", choices=["dev", "test"], default="dev")
    a = ap.parse_args()
    tcfg = TrainingConfig(augment_copies=0, candidate_models=["logreg"], sources=["amrita_slr"])
    samples, _ = load_valid_samples(default_stores(tcfg.sources), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    test_groups = choose_test_groups(samples, 0.2, 42)
    dev = [s for s in samples if s.group not in test_groups]
    test = [s for s in samples if s.group in test_groups]
    if a.on == "dev":       # tune on dev: hold out one dev group, train on the others
        groups = sorted({s.group for s in dev})
        val_group = groups[0]
        train_s = [s for s in dev if s.group != val_group]
        eval_s = [s for s in dev if s.group == val_group]
    else:
        train_s, eval_s = dev, test
    rng = np.random.default_rng(0)
    model = fit_model("logreg", train_s, DEFAULT_FEATURE_CONFIG, tcfg, rng)
    settings = RecognitionSettings()
    settings.update(json.loads(a.settings))
    per_video, reasons = replay(model, [str(c) for c in model.classes_], eval_s, settings)
    print(json.dumps({"on": a.on, "settings": json.loads(a.settings), **summarize(per_video),
                      "non_sign_segments": dict(reasons.most_common(8))}, indent=1))


if __name__ == "__main__":
    main()
