"""Train and evaluate the sign classifier from recorded landmark samples.

Usage (from backend/):  python -m app.training.train_model

* Features: app.recognition.sequence_features (identical to live inference).
* Evaluation: out-of-fold predictions. If every class was recorded in at least
  two sessions, folds are grouped by recording session (StratifiedGroupKFold),
  so no recording ever appears in both train and validation. Otherwise a
  stratified split is used and the report is flagged as optimistic.
* Augmentation is applied to training folds only, never to validation samples.
* The final model is refit on all data and saved with its feature config.
"""
from __future__ import annotations

import argparse
import json
import logging
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from ..config import (DEFAULT_FEATURE_CONFIG, METRICS_FILE, MODEL_FILE, MODEL_META_FILE, MODELS_DIR,
                      FeatureConfig, TrainingConfig)
from ..dataset.store import DatasetStore
from ..recognition.landmarks import FrameValidationError, parse_frame
from ..recognition.sequence_features import augment_matrix, frames_to_matrix, matrix_to_vector

log = logging.getLogger(__name__)
MIN_SAMPLES_PER_CLASS = 3


class TrainingError(RuntimeError):
    pass


def load_dataset(store: DatasetStore, fcfg: FeatureConfig):
    mats, labels, groups, skipped = [], [], [], 0
    for sample in store.iter_samples():
        frames = []
        for payload in sample.get("frames", []):
            try:
                frames.append(parse_frame(payload))
            except FrameValidationError:
                continue
        mat = frames_to_matrix(frames)
        if matrix_to_vector(mat, fcfg) is None:
            skipped += 1
            continue
        mats.append(mat)
        labels.append(sample["label"])
        groups.append(sample.get("session_id", "unknown"))
    return mats, np.array(labels), np.array(groups), skipped


def build_model(kind: str, seed: int) -> Pipeline:
    if kind == "logreg":
        clf = LogisticRegression(C=0.5, max_iter=3000, random_state=seed)
    elif kind == "svm_rbf":
        clf = CalibratedClassifierCV(SVC(C=10.0, gamma="scale", random_state=seed), method="sigmoid",
                                     cv=3, ensemble=False)
    else:
        raise ValueError(kind)
    return Pipeline([("scale", StandardScaler()), ("clf", clf)])


def vectorize(mats, fcfg: FeatureConfig, rng=None, tcfg: TrainingConfig | None = None, labels=None):
    xs, ys = [], []
    for i, mat in enumerate(mats):
        variants = [mat]
        if rng is not None and tcfg is not None:
            variants += [augment_matrix(mat, rng, tcfg) for _ in range(tcfg.augment_copies)]
        for m in variants:
            v = matrix_to_vector(m, fcfg)
            if v is not None:
                xs.append(v)
                if labels is not None:
                    ys.append(labels[i])
    return np.stack(xs), np.array(ys)


def train(store: DatasetStore | None = None, fcfg: FeatureConfig = DEFAULT_FEATURE_CONFIG,
          tcfg: TrainingConfig | None = None, save: bool = True, out_dir: Path | None = None) -> dict:
    store = store or DatasetStore()
    tcfg = tcfg or TrainingConfig()
    t0 = time.perf_counter()
    mats, y, groups, skipped = load_dataset(store, fcfg)
    counts = Counter(y.tolist())
    warnings = []
    if skipped:
        warnings.append(f"{skipped} sample(s) skipped because they contained too few hand frames")
    dropped = sorted(c for c, n in counts.items() if n < MIN_SAMPLES_PER_CLASS)
    if dropped:
        warnings.append(f"classes with fewer than {MIN_SAMPLES_PER_CLASS} samples were excluded: {', '.join(dropped)}")
        keep = np.array([lbl not in dropped for lbl in y])
        mats = [m for m, k in zip(mats, keep) if k]
        y, groups = y[keep], groups[keep]
        counts = Counter(y.tolist())
    if len(counts) < 2:
        raise TrainingError("need at least 2 classes with 3+ samples each (record '_none' as one of them)")

    classes = sorted(counts)
    sessions_per_class = {c: len(set(groups[y == c])) for c in classes}
    grouped = all(n >= 2 for n in sessions_per_class.values())
    if grouped:
        n_splits = max(2, min(5, len(set(groups.tolist())), min(sessions_per_class.values())))
        splitter = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=tcfg.random_seed)
        folds = list(splitter.split(np.zeros(len(y)), y, groups))
        strategy = f"StratifiedGroupKFold by recording session ({n_splits} folds)"
    else:
        n_splits = max(2, min(5, min(counts.values())))
        splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=tcfg.random_seed)
        folds = list(splitter.split(np.zeros(len(y)), y))
        strategy = (f"StratifiedKFold ({n_splits} folds) - samples from the SAME session appear in train and "
                    "validation, so these numbers are optimistic. Record each sign in 2+ sessions for a fair estimate.")
        warnings.append("evaluation is not session-independent (see strategy)")

    rng = np.random.default_rng(tcfg.random_seed)
    results = {}
    for kind in tcfg.candidate_models:
        y_pred = np.empty(len(y), dtype=object)
        for train_idx, test_idx in folds:
            x_tr, y_tr = vectorize([mats[i] for i in train_idx], fcfg, rng, tcfg, y[train_idx])
            x_te, _ = vectorize([mats[i] for i in test_idx], fcfg)
            model = build_model(kind, tcfg.random_seed)
            model.fit(x_tr, y_tr)
            y_pred[test_idx] = model.predict(x_te)
        y_pred = y_pred.astype(str)
        results[kind] = {
            "accuracy": float(accuracy_score(y, y_pred)),
            "macro_f1": float(f1_score(y, y_pred, average="macro", zero_division=0)),
            "y_pred": y_pred,
        }
    best_kind = max(results, key=lambda k: (results[k]["macro_f1"], k == "logreg"))
    best = results[best_kind]

    x_all, y_all = vectorize(mats, fcfg, rng, tcfg, y)
    final = build_model(best_kind, tcfg.random_seed)
    final.fit(x_all, y_all)
    final_classes = [str(c) for c in final.classes_]

    probe = matrix_to_vector(mats[0], fcfg).reshape(1, -1)
    start = time.perf_counter()
    for _ in range(50):
        final.predict_proba(probe)
    latency_ms = (time.perf_counter() - start) * 1000.0 / 50

    report = classification_report(y, best["y_pred"], labels=classes, output_dict=True, zero_division=0)
    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model_type": best_kind,
        "candidates": {k: {"accuracy": round(v["accuracy"], 4), "macro_f1": round(v["macro_f1"], 4)}
                       for k, v in results.items()},
        "evaluation_strategy": strategy,
        "session_independent": grouped,
        "num_samples": int(len(y)),
        "num_sessions": int(len(set(groups.tolist()))),
        "class_counts": {c: int(counts[c]) for c in classes},
        "sessions_per_class": sessions_per_class,
        "accuracy": round(best["accuracy"], 4),
        "macro_f1": round(best["macro_f1"], 4),
        "correct": int(np.sum(best["y_pred"] == y)),
        "incorrect": int(np.sum(best["y_pred"] != y)),
        "per_class": {c: {k: round(float(report[c][k]), 4) for k in ("precision", "recall", "f1-score", "support")}
                      for c in classes},
        "confusion_matrix": {"labels": classes,
                             "matrix": confusion_matrix(y, best["y_pred"], labels=classes).tolist()},
        "inference_latency_ms": round(latency_ms, 3),
        "training_seconds": round(time.perf_counter() - t0, 2),
        "warnings": warnings,
        "note": "Evaluated on isolated recorded samples (out-of-fold). Live continuous accuracy also depends "
                "on segmentation and is not captured by these numbers.",
    }
    meta = {"trained_at": metrics["trained_at"], "model_type": best_kind, "num_samples": metrics["num_samples"],
            "classes": final_classes, "feature_config": fcfg.to_dict()}
    if save:
        out = Path(out_dir) if out_dir else MODELS_DIR
        out.mkdir(parents=True, exist_ok=True)
        joblib.dump({"pipeline": final, "classes": final_classes, "feature_config": fcfg.to_dict(),
                     **{k: v for k, v in meta.items() if k not in ("classes", "feature_config")}},
                    out / MODEL_FILE.name)
        (out / MODEL_META_FILE.name).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        (out / METRICS_FILE.name).write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Kannada SignBridge sign classifier")
    parser.add_argument("--no-save", action="store_true", help="evaluate only, do not overwrite the model")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    metrics = train(save=not args.no_save)
    print(json.dumps({k: metrics[k] for k in ("model_type", "evaluation_strategy", "num_samples", "accuracy",
                                              "macro_f1", "correct", "incorrect", "inference_latency_ms",
                                              "warnings")}, indent=2, ensure_ascii=False))
    print("per-class:", json.dumps(metrics["per_class"], indent=1))


if __name__ == "__main__":
    main()
