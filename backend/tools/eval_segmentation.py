"""Continuous-segmentation evaluation on REAL recordings with KNOWN sign boundaries.

ISL-CSLTR has no temporal gloss boundaries, so boundaries are made exact by concatenating
isolated recordings (Amrita SLR + INCLUDE) into streams of several signs. Each stream is fed frame
by frame through the live RecognitionSession, exactly as the browser does, and the emitted words
are aligned with the true sequence (substitutions / deletions / insertions -> sign error rate).

Three stream conditions:
  pause         400 ms with no hands between recordings (signer lowers the hands briefly)
  back_to_back  recordings joined directly; each keeps its own lead-in/out (no button, no extra pause)
  trimmed       each recording cut to its first..last hand frame and joined with NO gap: the signer
                never lowers the hands (synthetic stress test: the transition is a jump, not real motion)

Fairness:
  * the evaluation model is trained on development signer groups only (never on the evaluated videos)
  * segmentation variants are CHOSEN on validation folds made of development groups (leave-one-group-out)
  * the chosen variant is then REPORTED on the held-out test groups (same test groups as the registry)
  * "classification only" (each recording classified whole = perfect segmentation) separates
    segmentation losses from classifier errors

Usage (from backend/):  python tools/eval_segmentation.py [--folds 3] [--out reports/segmentation_eval.json]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_FEATURE_CONFIG, LABELS_FILE, NONE_LABEL, RecognitionSettings, TrainingConfig  # noqa: E402
from app.recognition.pipeline import RecognitionSession  # noqa: E402
from app.recognition.predictor import SignPredictor  # noqa: E402
from app.recognition.sequence_features import matrix_to_vector  # noqa: E402
from app.training.train_model import (calibrate_threshold, choose_test_groups, default_stores, edit_counts,  # noqa: E402
                                      fit_model, known_labels_from, load_valid_samples)
from app.translation.kannada_mapping import Vocabulary  # noqa: E402

VARIANTS = {
    "current: still 800 ms, absent 200 ms": {},
    "absent 400 ms": {"absent_ms": 400},
    "absent 600 ms": {"absent_ms": 600},
    "still 600 ms + absent 400 ms": {"still_ms": 600, "absent_ms": 400},
    "still 500 ms + absent 400 ms": {"still_ms": 500, "absent_ms": 400},
    "dip split + absent 400 ms": {"dip_split": True, "absent_ms": 400},
    "sliding window + stability gate": {"mode": "sliding"},
    "verified split of long segments": {"split_long": True},
}
CONDITIONS = ["pause", "back_to_back", "trimmed"]
STREAM_LEN = 5


def make_streams(samples, rng, length=STREAM_LEN):
    """Streams of `length` recordings of the SAME group (one signer signing several words)."""
    by_group: dict[str, list] = {}
    for s in samples:
        by_group.setdefault(s.group, []).append(s)
    streams = []
    for g in sorted(by_group):
        items = [by_group[g][i] for i in rng.permutation(len(by_group[g]))]
        for i in range(0, len(items), length):
            if len(items[i:i + length]) >= 2:
                streams.append(items[i:i + length])
    return streams


def _frames_for(s, condition):
    frames = s.frames
    if condition == "trimmed":
        idx = [i for i, f in enumerate(frames) if f.get("hands")]
        if idx:
            frames = frames[idx[0]:idx[-1] + 1]
    return frames


def run_stream(predictor, vocab, settings, stream, condition):
    session = RecognitionSession(predictor, vocab, settings)
    emitted, t = [], 0.0
    stages: dict[str, int] = {}

    def feed(p):
        for ev in session.process(p):
            if ev["type"] == "sign":
                emitted.append(ev["token"]["label"])
            stage = (ev.get("diagnosis") or {}).get("stage")
            if stage and ev["type"] != "sign":
                stages[stage] = stages.get(stage, 0) + 1

    w, h = stream[0].frames[0].get("w", 640), stream[0].frames[0].get("h", 480)
    for _ in range(10):
        feed({"t": t, "w": w, "h": h, "hands": []})
        t += 33.3
    for s in stream:
        frames = _frames_for(s, condition)
        t0 = frames[0].get("t", 0)
        for f in frames:
            feed({**f, "t": t + (f.get("t", t0) - t0)})
        t += (frames[-1].get("t", t0) - t0) + 33.3
        if condition == "pause":
            for _ in range(12):
                feed({"t": t, "w": w, "h": h, "hands": []})
                t += 33.3
    for _ in range(40):                                  # hands down at the end
        feed({"t": t, "w": w, "h": h, "hands": []})
        t += 33.3
    truth = [s.label for s in stream if s.label != NONE_LABEL]
    return truth, emitted, stages


def evaluate(predictor, vocab, streams, variant: dict, threshold: float) -> dict:
    out = {}
    for cond in CONDITIONS:
        settings = RecognitionSettings(confidence_threshold=threshold)
        settings.update(variant)
        tot = {"reference_signs": 0, "emitted_signs": 0, "substitutions": 0, "deletions": 0, "insertions": 0}
        exact, stages = 0, {}
        for st in streams:
            truth, emitted, stg = run_stream(predictor, vocab, settings, st, cond)
            c = edit_counts(truth, emitted)
            for k in tot:
                tot[k] += c[k]
            exact += truth == emitted
            for k, v in stg.items():
                stages[k] = stages.get(k, 0) + v
        n = tot["reference_signs"]
        out[cond] = {**tot, "sign_error_rate": round((tot["substitutions"] + tot["deletions"] + tot["insertions"]) / n, 4) if n else None,
                     "streams": len(streams), "streams_exactly_right": exact, "rejected_segments_by_stage": stages}
    out["mean_ser"] = round(float(np.mean([out[c]["sign_error_rate"] for c in CONDITIONS])), 4)
    return out


def classification_only(model, classes, samples, threshold):
    """Each recording classified as a whole (= perfect segmentation): the classifier's own accuracy."""
    pred = SignPredictor()
    pred.model, pred.classes = model, classes
    right = accepted = 0
    for s in samples:
        v = matrix_to_vector(s.mat, DEFAULT_FEATURE_CONFIG)
        if v is None:
            continue
        p = pred.predict_vector(v)
        if p.confidence >= threshold:
            accepted += 1
            right += p.label == s.label
    n = len(samples)
    return {"recordings": n, "accuracy_top1_accepted_and_correct": round(right / n, 4), "accepted": accepted}


def fold_threshold(kind, train_s, tcfg, rng):
    """Calibrate the threshold like the registry does: out-of-fold predictions on the training groups."""
    groups = sorted({s.group for s in train_s})
    folds = [groups[i::3] for i in range(3)]
    y_true, y_pred, conf = [], [], []
    for fg in folds:
        tr = [s for s in train_s if s.group not in fg]
        va = [s for s in train_s if s.group in fg and matrix_to_vector(s.mat, DEFAULT_FEATURE_CONFIG) is not None]
        if not tr or not va:
            continue
        m = fit_model(kind, tr, DEFAULT_FEATURE_CONFIG, tcfg, rng)
        x = np.stack([matrix_to_vector(s.mat, DEFAULT_FEATURE_CONFIG) for s in va])
        pr = m.predict_proba(x)
        cls = [str(c) for c in m.classes_]
        y_true += [s.label for s in va]
        y_pred += [cls[i] for i in pr.argmax(1)]
        conf += list(pr.max(1))
    return calibrate_threshold(y_true, y_pred, conf)["threshold"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--folds", type=int, default=3, help="development groups used as validation folds")
    ap.add_argument("--out", default="reports/segmentation_eval.json")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--only", default="", help="';'-separated variant names to evaluate (default: all)")
    a = ap.parse_args()
    if a.only:
        for name in list(VARIANTS):
            if name not in a.only.split(";"):
                del VARIANTS[name]
    t_start = time.time()
    tcfg = TrainingConfig(candidate_models=["logreg"])
    vocab = Vocabulary(LABELS_FILE)
    samples, _ = load_valid_samples(default_stores(tcfg.sources), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    test_groups = choose_test_groups(samples, tcfg.test_fraction, tcfg.random_seed)
    dev = [s for s in samples if s.group not in test_groups]
    test = [s for s in samples if s.group in test_groups]
    rng = np.random.default_rng(a.seed)
    print(f"{len(dev)} development / {len(test)} test recordings; test groups: {sorted(test_groups)}", flush=True)

    # ---- validation: leave-one-dev-group-out (largest groups first) ----
    sizes = {}
    for s in dev:
        sizes[s.group] = sizes.get(s.group, 0) + 1
    val_groups = sorted(sizes, key=lambda g: -sizes[g])[: a.folds]
    val_results = {name: [] for name in VARIANTS}
    for vg in val_groups:
        tr = [s for s in dev if s.group != vg]
        va = [s for s in dev if s.group == vg]
        model = fit_model("logreg", tr, DEFAULT_FEATURE_CONFIG, tcfg, rng)
        thr = fold_threshold("logreg", tr, tcfg, rng)
        pred = SignPredictor()
        pred.model, pred.classes = model, [str(c) for c in model.classes_]
        streams = make_streams(va, np.random.default_rng(a.seed))
        for name, var in VARIANTS.items():
            r = evaluate(pred, vocab, streams, var, thr)
            val_results[name].append(r)
            print(f"[val {vg}] thr={thr:.2f} {name:38s} SER pause {r['pause']['sign_error_rate']:.3f} "
                  f"back-to-back {r['back_to_back']['sign_error_rate']:.3f} trimmed {r['trimmed']['sign_error_rate']:.3f}", flush=True)
    val_summary = {name: round(float(np.mean([r["mean_ser"] for r in rs])), 4) for name, rs in val_results.items()}
    chosen = min(val_summary, key=val_summary.get)
    print("validation mean SER:", json.dumps(val_summary, indent=1), "\nchosen:", chosen, flush=True)

    # ---- test: model trained on all development groups ----
    model = fit_model("logreg", dev, DEFAULT_FEATURE_CONFIG, tcfg, rng)
    thr = fold_threshold("logreg", dev, tcfg, rng)
    pred = SignPredictor()
    pred.model, pred.classes = model, [str(c) for c in model.classes_]
    streams = make_streams(test, np.random.default_rng(a.seed))
    test_results = {}
    for name, var in VARIANTS.items():
        test_results[name] = evaluate(pred, vocab, streams, var, thr)
        r = test_results[name]
        print(f"[test] {name:38s} SER pause {r['pause']['sign_error_rate']:.3f} back-to-back "
              f"{r['back_to_back']['sign_error_rate']:.3f} trimmed {r['trimmed']['sign_error_rate']:.3f}", flush=True)
    report = {
        "created": time.strftime("%Y-%m-%d %H:%M:%S"),
        "method": __doc__.strip().splitlines()[0],
        "conditions": CONDITIONS, "stream_length": STREAM_LEN, "variants": VARIANTS,
        "validation_groups": val_groups, "validation_mean_ser": val_summary, "chosen_on_validation": chosen,
        "test_groups": sorted(test_groups), "test_threshold": thr, "test_streams": len(streams),
        "test_classification_only": classification_only(model, pred.classes, test, thr),
        "test": test_results, "runtime_s": round(time.time() - t_start, 1),
    }
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    print("classification only (perfect segmentation):", report["test_classification_only"])
    print("wrote", out)


if __name__ == "__main__":
    main()
