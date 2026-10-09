"""Evaluation report + error analysis for the saved model.

Usage (from backend/):  python -m app.training.evaluate_model

Prints:
  * dataset validation summary (valid / rejected samples and reasons, imbalance)
  * the stored held-out / cross-validation metrics of the saved model
  * error analysis: most-confused sign pairs, weak classes, classes with few samples
  * preprocessing-compatibility check: the saved model's feature config and input
    size versus the current code, and a dataset-hash check (was the model trained
    on the current data?)
  * measured per-frame latency of the live pipeline (parse + segment + classify)

It never invents numbers: metrics that do not exist are reported as "not evaluated".
"""
from __future__ import annotations

import json
import time

import numpy as np

from ..config import DEFAULT_FEATURE_CONFIG, METRICS_FILE, MODEL_META_FILE
from ..dataset.store import DatasetStore
from ..dataset.validate import validate_dataset
from ..recognition.pipeline import RecognitionSession
from ..recognition.predictor import SignPredictor
from ..recognition.sequence_features import feature_dim
from ..translation.kannada_mapping import Vocabulary
from .train_model import known_labels_from


def error_analysis(metrics: dict) -> list[str]:
    notes = []
    for p in metrics.get("confused_pairs", [])[:5]:
        notes.append(f"'{p['true']}' was predicted as '{p['predicted']}' {p['count']} time(s): check whether the two "
                     "signs share a handshape, location or movement; record more varied examples of both.")
    for cls, r in (metrics.get("per_class") or {}).items():
        if r["recall"] < 0.7:
            notes.append(f"'{cls}' has low recall ({r['recall']:.2f}) on {int(r['support'])} held-out example(s).")
    for cls, n in (metrics.get("class_counts") or {}).items():
        if n < 10:
            notes.append(f"'{cls}' has only {n} training samples.")
    if (metrics.get("imbalance_ratio") or 1) > 3:
        notes.append(f"Class imbalance ratio {metrics['imbalance_ratio']} - balance the dataset.")
    if not metrics.get("session_independent"):
        notes.append("Evaluation was not session-independent; numbers are optimistic.")
    return notes


def pipeline_latency(predictor: SignPredictor, store: DatasetStore, max_samples: int = 20) -> float | None:
    session = RecognitionSession(predictor, Vocabulary())
    times = []
    t = 0.0
    for i, sample in enumerate(store.iter_samples()):
        if i >= max_samples:
            break
        for f in sample.get("frames", []):
            payload = {**f, "t": t}
            t += 33.3
            start = time.perf_counter()
            session.process(payload)
            times.append((time.perf_counter() - start) * 1000)
    return round(float(np.mean(times)), 3) if times else None


def main() -> None:
    store = DatasetStore()
    validation = validate_dataset(store, known_labels_from(), DEFAULT_FEATURE_CONFIG)["summary"]
    print("== Dataset validation ==")
    print(json.dumps({k: validation[k] for k in ("total", "valid", "rejected", "imbalance_ratio", "per_class",
                                                 "warnings")}, indent=2, ensure_ascii=False))
    for r in validation["rejected_samples"]:
        print(f"  rejected {r['file']}: {'; '.join(r['reasons'])}")

    predictor = SignPredictor()
    predictor.load()
    print("\n== Model ==")
    if not predictor.loaded:
        print(f"Not evaluated: {predictor.error}")
        return
    meta = json.loads(MODEL_META_FILE.read_text(encoding="utf-8")) if MODEL_META_FILE.exists() else {}
    print(f"version {meta.get('model_version')} | {meta.get('architecture')} | classes {predictor.classes}")
    print(f"input size {feature_dim(DEFAULT_FEATURE_CONFIG)} | feature schema {DEFAULT_FEATURE_CONFIG.schema} "
          "| preprocessing compatible: yes (the loader refuses mismatches)")
    if meta.get("dataset_hash") and meta["dataset_hash"] != validation["dataset_hash"]:
        print("WARNING: the dataset changed since this model was trained - retrain to include the new samples.")

    if not METRICS_FILE.exists():
        print("Metrics: not evaluated")
        return
    metrics = json.loads(METRICS_FILE.read_text(encoding="utf-8"))
    print("\n== Evaluation (as measured at training time) ==")
    print(f"source: {metrics['headline_source']}\nprotocol: {metrics['evaluation_strategy']}")
    print(f"accuracy {metrics['accuracy']:.3f} | macro-F1 {metrics['macro_f1']:.3f} | "
          f"{metrics['correct']} correct / {metrics['incorrect']} incorrect")
    print("candidates (cross-validation):", json.dumps(metrics.get("candidates"), indent=1))
    if metrics.get("test"):
        print("held-out test comparison:", json.dumps({k: {"accuracy": v["accuracy"], "macro_f1": v["macro_f1"]}
                                                       for k, v in metrics["test"]["models"].items()}))
        print("continuous stream:", json.dumps(metrics["test"].get("continuous_stream")))
    print("\n== Error analysis ==")
    for note in error_analysis(metrics) or ["No obvious problems found in the stored metrics."]:
        print(" -", note)
    print("\n== Live pipeline latency ==")
    lat = pipeline_latency(predictor, store)
    print(f"mean backend processing per frame: {lat} ms" if lat is not None else "not measured (no samples)")


if __name__ == "__main__":
    main()
