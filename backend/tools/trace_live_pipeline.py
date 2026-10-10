"""Reproduce live recognition on LABELLED recordings and attribute every error to a pipeline stage.

Each recording is fed frame by frame through the real RecognitionSession (segment mode, the active model's
calibrated threshold) in two realistic signing styles:
  lowered  hands drop after the sign (as in the training videos)
  hold     the signer holds the final position still -> the segment ends at the 800 ms "still" boundary
For every recording: the whole-clip prediction (perfect segmentation, before thresholding), every live
decision (top-3, threshold, rejection reason) and the emitted words. Outcomes:
  correct | rejected (top-1 right but below threshold) | misclassified (model's top-1 wrong) |
  split (more than one word) | no_word (segmentation produced no classifiable segment)

Fairness: the decision about a fix is taken on a VALIDATION signer (model trained on the other development
signers); the held-out TEST groups are reported once with a model trained on all development data.
Models are the active type (logreg + GRU ensemble) trained without the evaluated recordings.

Usage (from backend/):  python tools/trace_live_pipeline.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_FEATURE_CONFIG, LABELS_FILE, RecognitionSettings, TrainingConfig  # noqa: E402
from app.recognition.pipeline import RecognitionSession  # noqa: E402
from app.recognition.predictor import SignPredictor  # noqa: E402
from app.recognition.sequence_features import matrix_to_vector  # noqa: E402
from app.training.registry import active_paths  # noqa: E402
from app.training.train_model import (choose_test_groups, default_stores, fit_model, known_labels_from,  # noqa: E402
                                      load_valid_samples, metric_block)
from app.translation.kannada_mapping import Vocabulary  # noqa: E402
from app.evaluation.error_causes import classify  # noqa: E402
from app.evaluation.live_eval import save_report  # noqa: E402

DT = 33.3


def stream(s, style, rng):
    w, h = s.frames[0].get("w", 640), s.frames[0].get("h", 480)
    out, t = [], 0.0
    for _ in range(10):
        out.append({"t": t, "w": w, "h": h, "hands": []}); t += DT
    frames = s.frames
    if style == "hold":
        idx = [i for i, f in enumerate(frames) if f.get("hands")]
        frames = frames[: idx[-1] + 1]
    t0 = frames[0].get("t", 0)
    for f in frames:
        out.append({**f, "t": t + f.get("t", t0) - t0})
    t = out[-1]["t"] + DT
    if style == "hold":                       # final pose held still for 1.2 s (sub-pixel jitter)
        last = frames[-1]
        for _ in range(36):
            hands = [{**hd, "landmarks": [[p[0] + rng.normal(0, 3e-4), p[1] + rng.normal(0, 3e-4), p[2] if len(p) > 2 else 0.0]
                                          for p in hd["landmarks"]]} for hd in last["hands"]]
            out.append({**last, "t": t, "hands": hands}); t += DT
    for _ in range(20):
        out.append({"t": t, "w": w, "h": h, "hands": []}); t += DT
    return out


def run(pred, vocab, samples, style, trim, thr):
    rows = []
    rng = np.random.default_rng(0)
    for s in samples:
        cfg = RecognitionSettings(confidence_threshold=thr, trim_still_tail=trim)
        sess = RecognitionSession(pred, vocab, cfg)
        events = []
        for f in stream(s, style, rng):
            events += [e for e in sess.process(f) if e["type"] in ("sign", "uncertain", "segment")]
        words = [e["token"]["label"] for e in events if e["type"] == "sign"]
        decided = [e for e in events if e.get("top")]
        main = max(decided, key=lambda e: e.get("frames") or (e.get("segment") or {}).get("frames", 0), default=None)
        top1 = main["top"][0]["label"] if main else None
        if words == [s.label]:
            outcome = "correct"
        elif len(words) > 1 or len(decided) > 1:
            outcome = "split"
        elif main is None:
            outcome = "no_word"
        elif top1 == s.label:
            outcome = "rejected"
        else:
            outcome = "misclassified"
        cause = classify(s.label, events)["cause"]
        rows.append({"sample_id": s.sample_id, "label": s.label, "words": words, "outcome": outcome, "cause": cause,
                     "live_top3": [(c["label"], round(c["confidence"], 3)) for c in main["top"]] if main else [],
                     "boundary": (main.get("reason") or (main.get("segment") or {}).get("reason")) if main else None,
                     "decisions": [{"type": e["type"], "result": e.get("result"), "stage": (e.get("diagnosis") or {}).get("stage")}
                                   for e in events]})
    return rows


def whole_clip(pred, samples, thr):
    y, top1, acc = [], [], []
    for s in samples:
        v = matrix_to_vector(s.mat, DEFAULT_FEATURE_CONFIG)
        p = pred.predict_vector(v)
        y.append(s.label); top1.append(p.label); acc.append(p.label == s.label and p.confidence >= thr)
    b = metric_block(y, top1, sorted(set(y)))
    return {"top1_before_threshold": b["accuracy"], "correct_after_threshold": round(float(np.mean(acc)), 4),
            "macro_f1": b["macro_f1"], "per_class_recall": {c: v["recall"] for c, v in b["per_class"].items()},
            "confused_pairs": b["confused_pairs"], "confusion_matrix": b["confusion_matrix"]}


def summarise(rows):
    c = Counter(r["outcome"] for r in rows)
    causes = Counter(r["cause"] for r in rows)
    return ({k: c.get(k, 0) for k in ("correct", "rejected", "misclassified", "split", "no_word")} | {"n": len(rows)}
            | {"causes": dict(sorted(causes.items()))})


def main():
    tcfg = TrainingConfig()
    thr = float(json.loads(active_paths()[1].read_text(encoding="utf-8"))["calibration"]["threshold"])
    samples, _ = load_valid_samples(default_stores(tcfg.sources), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    cnt = Counter(s.label for s in samples)
    samples = [s for s in samples if cnt[s.label] >= 3]
    tg = choose_test_groups(samples, tcfg.test_fraction, tcfg.random_seed)
    dev = [s for s in samples if s.group not in tg]
    test = [s for s in samples if s.group in tg]
    sizes = Counter(s.group for s in dev if s.source == "amrita_slr")
    val_group = sizes.most_common(1)[0][0]
    vocab = Vocabulary(LABELS_FILE)
    report = {"threshold": thr, "validation_group": val_group, "test_groups": sorted(tg)}

    for name, train_s, eval_s in (("validation", [s for s in dev if s.group != val_group], [s for s in dev if s.group == val_group]),
                                  ("test", dev, test)):
        model = fit_model("ensemble", train_s, DEFAULT_FEATURE_CONFIG, tcfg, np.random.default_rng(7))
        pred = SignPredictor()
        pred.model, pred.classes = model, [str(c) for c in model.classes_]
        part = {"recordings": len(eval_s), "whole_clip": whole_clip(pred, eval_s, thr), "live": {}}
        for style in ("lowered", "hold"):
            for trim in (False, True):
                rows = run(pred, vocab, eval_s, style, trim, thr)
                key = f"{style}{'_trim' if trim else ''}"
                part["live"][key] = {"summary": summarise(rows), "examples": [r for r in rows if r["outcome"] != "correct"][:15]}
                print(f"[{name}] {key:13s} {part['live'][key]['summary']}", flush=True)
        wc = part["whole_clip"]
        print(f"[{name}] whole clip: top-1 {wc['top1_before_threshold']} | correct after threshold {wc['correct_after_threshold']}", flush=True)
        report[name] = part
        if name == "validation":
            base, fixed = part["live"]["hold"]["summary"], part["live"]["hold_trim"]["summary"]
            low, low_fix = part["live"]["lowered"]["summary"], part["live"]["lowered_trim"]["summary"]
            adopt = fixed["correct"] > base["correct"] and low_fix["correct"] >= low["correct"] - max(1, 0.02 * low["n"])
            report["trim_still_tail_decision_on_validation"] = adopt
            print("adopt trim_still_tail (decided on validation):", adopt, flush=True)
    print("wrote", save_report(report, prefix="trace_live_pipeline"))   # unique name, earlier reports kept


if __name__ == "__main__":
    main()
