"""Measure LIVE performance of the active model on your evaluation-only webcam recordings.

Record them on Dataset & Model with "Purpose: evaluation only" (single signs, '_none' non-sign
movements) and "Record a sign sequence" (several signs in a row). They are stored in
data/eval_recordings and data/eval_sequences and are never used for training.

Usage (from backend/):  python tools/evaluate_live.py [--threshold 0.4] [--out reports/live_eval.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import LABELS_FILE  # noqa: E402
from app.evaluation.live_eval import evaluate_live, save_report  # noqa: E402
from app.recognition.predictor import SignPredictor  # noqa: E402
from app.translation.kannada_mapping import Vocabulary  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--threshold", type=float, default=None, help="default: the model's calibrated threshold")
    ap.add_argument("--out", default=None,
                    help="report path (default: reports/live_eval_<UTC timestamp>.json; existing files are never overwritten)")
    a = ap.parse_args()
    predictor = SignPredictor()            # follows the registry's active version
    predictor.load()
    if not predictor.loaded:
        sys.exit(f"no model loaded: {predictor.error}")
    rep = evaluate_live(predictor, Vocabulary(LABELS_FILE), a.threshold)
    iso, seq = rep["isolated"], rep["sequences"]
    print(f"model {rep['model_version']}  threshold {rep['threshold']:.2f}")
    if iso.get("recordings"):
        print(f"isolated: {iso['sign_recordings']} sign recordings, {iso['none_recordings']} non-sign recordings, "
              f"{iso['not_in_model_vocabulary']} outside the model vocabulary")
        if iso.get("sign_recordings"):
            print(f"  accuracy {iso['accuracy']:.3f} (top-1 ignoring threshold {iso['top1_accuracy_ignoring_threshold']:.3f}), "
                  f"macro P/R/F1 {iso['macro_precision']:.3f}/{iso['macro_recall']:.3f}/{iso['macro_f1']:.3f}, "
                  f"rejected as uncertain {iso['rejected_as_uncertain']}")
            for c in iso["top_confusions"][:5]:
                print(f"  confusion: {c['true']} -> {c['predicted']} x{c['count']}")
            for k, vals in iso.get("accuracy_by_condition", {}).items():
                print(f"  by {k}: " + ", ".join(f"{v} {d['accuracy']:.2f} (n={d['n']})" for v, d in vals.items()))
        if iso.get("none_recordings"):
            print(f"  false detections: {iso['false_detections']}/{iso['none_recordings']} non-sign recordings produced a word")
        if iso.get("outcomes_at_threshold"):
            print(f"  at threshold: {iso['outcomes_at_threshold']}, rejection rate {iso['rejection_rate']:.3f}")
        lr = iso.get("live_replay")
        if lr:
            print(f"  live replay ({lr['completed_signs']} completed signs): causes {lr['causes']}")
            print(f"  correct by end style: {lr['correct_by_end_style']}")
            print("  causes: correct | E boundary | C suppressed | B rejected | D landmarks | A2 near miss | A not in top 3")
        if iso.get("classifier_latency_ms"):
            print(f"  classifier latency {iso['classifier_latency_ms']} ms; recordings {iso['recording_timing']}")
    else:
        print("no evaluation-only single-sign recordings yet")
    if seq.get("sequences"):
        print(f"sequences: {seq['sequences']} ({seq['reference_signs']} signs) SER {seq['sign_error_rate']:.3f} "
              f"(S {seq['substitutions']}, D {seq['deletions']}, I {seq['insertions']}), exactly right {seq['exactly_right']}")
        for p in seq["per_sequence"]:
            print(f"  {' '.join(p['glosses'])!s:40s} -> {' '.join(p['emitted'])}")
    else:
        print("no evaluation sequences yet")
    for w in rep["data"].get("metadata_warnings", []):
        print("  WARNING:", w)
    if not (iso.get("recordings") or seq.get("sequences")) and not a.out:
        print("nothing to evaluate yet: no report written")      # never leave empty reports behind
        return
    out = save_report(rep, Path(a.out) if a.out else None)
    print("wrote", out)


if __name__ == "__main__":
    main()
