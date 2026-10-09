"""Train and evaluate the sign classifier from recorded (real) landmark samples.

Usage (from backend/):
    python -m app.training.train_model                 # train, evaluate, save
    python -m app.training.train_model --no-save       # evaluate only
    python -m app.training.train_model --seed 7 --augment 4 --models logreg,mlp

Protocol (no data leakage - every split is by complete recording session):
  1. Validate the dataset (app.dataset.validate); only valid samples are used.
  2. If there are >= 3 sessions, the most recent session is held out as an
     independent TEST set (only if its classes also occur in other sessions).
  3. On the remaining development data, every candidate model is scored with
     out-of-fold predictions from StratifiedGroupKFold over sessions (falls back
     to StratifiedKFold - flagged as optimistic - when sessions are insufficient).
  4. The candidate with the best macro-F1 is selected. With a TEST session, the
     baseline (logistic regression) and the selected model are both refit on the
     development data and compared on the same TEST samples, and a continuous
     stream of TEST recordings is replayed through the live recognition pipeline.
  5. The selected model is refit on all valid data and saved with its feature
     configuration, label encoder (class order), metadata and a training log.
Augmentation is applied to training folds only.
"""
from __future__ import annotations

import argparse
import json
import logging
import shutil
import time
from collections import Counter
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import joblib
import numpy as np
import sklearn
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from ..config import (DEFAULT_FEATURE_CONFIG, LABELS_FILE, METRICS_FILE, MODEL_FILE, MODEL_META_FILE, MODELS_DIR,
                      NONE_LABEL, FeatureConfig, RecognitionSettings, TrainingConfig)
from ..dataset.store import DatasetStore
from ..dataset.validate import validate_dataset
from ..recognition.landmarks import parse_frame
from ..recognition.sequence_features import augment_matrix, frames_to_matrix, matrix_to_vector

log = logging.getLogger(__name__)
MIN_SAMPLES_PER_CLASS = 3
TRAINING_LOG = "training_log.jsonl"
MODEL_DESCRIPTIONS = {
    "logreg": "Baseline: StandardScaler + multinomial logistic regression (class-balanced)",
    "svm_rbf": "StandardScaler + RBF-kernel SVM (class-balanced) with sigmoid probability calibration",
    "mlp": "StandardScaler + MLP neural network (1 hidden layer of 128 ReLU units, Adam, L2, early stopping), "
           "class-balanced by oversampling",
}

ProgressFn = Callable[[str, float], None]


class TrainingError(RuntimeError):
    pass


# ---------------------------------------------------------------- data
def load_valid_samples(store: DatasetStore, known_labels: set[str], fcfg: FeatureConfig):
    report = validate_dataset(store, known_labels, fcfg)
    samples = []
    for rep in report["reports"]:
        if not rep.valid:
            continue
        data = json.loads((store.root / rep.file).read_text(encoding="utf-8"))
        frames = [parse_frame(p) for p in data["frames"]]
        samples.append({"mat": frames_to_matrix(frames), "label": rep.label, "session": rep.session_id,
                        "signer": rep.signer_id, "created_at": data.get("created_at", ""), "frames": data["frames"],
                        "sample_id": rep.sample_id})
    return samples, report["summary"]


def build_model(kind: str, seed: int) -> Pipeline:
    if kind == "logreg":
        clf = LogisticRegression(C=0.5, max_iter=4000, class_weight="balanced", random_state=seed)
    elif kind == "svm_rbf":
        clf = CalibratedClassifierCV(SVC(C=10.0, gamma="scale", class_weight="balanced", random_state=seed),
                                     method="sigmoid", cv=3, ensemble=False)
    elif kind == "mlp":
        clf = MLPClassifier(hidden_layer_sizes=(128,), alpha=1e-3, learning_rate_init=1e-3, max_iter=400,
                            early_stopping=True, validation_fraction=0.15, n_iter_no_change=20, random_state=seed)
    else:
        raise ValueError(f"unknown model type {kind!r}")
    return Pipeline([("scale", StandardScaler()), ("clf", clf)])


def vectorize(mats, labels, fcfg: FeatureConfig, rng=None, tcfg: TrainingConfig | None = None):
    xs, ys = [], []
    for mat, label in zip(mats, labels):
        variants = [mat]
        if rng is not None and tcfg is not None:
            variants += [augment_matrix(mat, rng, tcfg) for _ in range(tcfg.augment_copies)]
        for m in variants:
            v = matrix_to_vector(m, fcfg)
            if v is not None:
                xs.append(v)
                ys.append(label)
    return np.stack(xs), np.array(ys)


def oversample(x: np.ndarray, y: np.ndarray, rng: np.random.Generator):
    counts = Counter(y.tolist())
    target = max(counts.values())
    idx = []
    for c in counts:
        ci = np.flatnonzero(y == c)
        idx.extend(ci.tolist())
        if len(ci) < target:
            idx.extend(rng.choice(ci, size=target - len(ci), replace=True).tolist())
    idx = np.array(idx)
    return x[idx], y[idx]


def fit_model(kind, mats, labels, fcfg, tcfg, rng) -> Pipeline:
    x, y = vectorize(mats, labels, fcfg, rng, tcfg)
    if kind == "mlp":
        x, y = oversample(x, y, rng)
    model = build_model(kind, tcfg.random_seed)
    model.fit(x, y)
    return model


def predict_labels(model: Pipeline, mats, fcfg) -> np.ndarray:
    x = np.stack([matrix_to_vector(m, fcfg) for m in mats])
    return model.predict(x).astype(str)


def metric_block(y_true, y_pred, classes) -> dict:
    report = classification_report(y_true, y_pred, labels=classes, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=classes)
    pairs = []
    for i, a in enumerate(classes):
        for j, b in enumerate(classes):
            if i != j and cm[i, j]:
                pairs.append({"true": a, "predicted": b, "count": int(cm[i, j])})
    pairs.sort(key=lambda p: -p["count"])
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macro_f1": round(float(f1_score(y_true, y_pred, labels=classes, average="macro", zero_division=0)), 4),
        "num_examples": int(len(y_true)),
        "correct": int(np.sum(np.asarray(y_true) == np.asarray(y_pred))),
        "incorrect": int(np.sum(np.asarray(y_true) != np.asarray(y_pred))),
        "per_class": {c: {k: round(float(report[c][k]), 4) for k in ("precision", "recall", "f1-score", "support")}
                      for c in classes},
        "confusion_matrix": {"labels": classes, "matrix": cm.tolist()},
        "confused_pairs": pairs[:8],
    }


# ---------------------------------------------------------------- continuous evaluation
def streaming_eval(model: Pipeline, classes: list[str], samples: list[dict], fcfg: FeatureConfig,
                   threshold: float) -> dict:
    """Replay held-out recordings back-to-back (with short hand-free gaps) through the live
    RecognitionSession and compare the emitted words with the true sequence (edit distance)."""
    from ..recognition.pipeline import RecognitionSession
    from ..recognition.predictor import SignPredictor
    from ..translation.kannada_mapping import Vocabulary

    predictor = SignPredictor(feature_config=fcfg)
    predictor.model, predictor.classes = model, classes
    session = RecognitionSession(predictor, Vocabulary(LABELS_FILE), RecognitionSettings(confidence_threshold=threshold))
    t = 0.0
    truth: list[str] = []
    emitted: list[str] = []
    proc = []

    def feed(payload):
        start = time.perf_counter()
        for ev in session.process(payload):
            if ev["type"] == "sign":
                emitted.append(ev["token"]["label"])
        proc.append((time.perf_counter() - start) * 1000)

    for s in samples:
        frames = s["frames"]
        w, h = frames[0].get("w", 640), frames[0].get("h", 480)
        for _ in range(12):
            feed({"t": t, "w": w, "h": h, "hands": []})
            t += 33.3
        t0 = frames[0].get("t", 0)
        for f in frames:
            feed({**f, "t": t + (f.get("t", t0) - t0)})
        t += (frames[-1].get("t", t0) - t0) + 33.3
        if s["label"] != NONE_LABEL:
            truth.append(s["label"])
    for _ in range(15):
        feed({"t": t, "w": 640, "h": 480, "hands": []})
        t += 33.3

    # Levenshtein alignment between true and emitted sign sequences
    n, m = len(truth), len(emitted)
    d = np.zeros((n + 1, m + 1), dtype=int)
    d[:, 0] = np.arange(n + 1)
    d[0, :] = np.arange(m + 1)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (truth[i - 1] != emitted[j - 1]))
    i, j, subs, dels, ins = n, m, 0, 0, 0
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i, j] == d[i - 1, j - 1] + (truth[i - 1] != emitted[j - 1]):
            subs += truth[i - 1] != emitted[j - 1]
            i, j = i - 1, j - 1
        elif i > 0 and d[i, j] == d[i - 1, j] + 1:
            dels += 1
            i -= 1
        else:
            ins += 1
            j -= 1
    return {
        "reference_signs": n, "emitted_signs": m,
        "substitutions": int(subs), "deletions": int(dels), "insertions": int(ins),
        "sign_error_rate": round((subs + dels + ins) / n, 4) if n else None,
        "mean_frame_processing_ms": round(float(np.mean(proc)), 3) if proc else None,
        "threshold": threshold,
    }


# ---------------------------------------------------------------- main training
def known_labels_from(labels_file: Path = LABELS_FILE) -> set[str]:
    data = json.loads(labels_file.read_text(encoding="utf-8"))
    return {item["label"] for item in data.get("labels", [])} | {NONE_LABEL}


def train(store: DatasetStore | None = None, fcfg: FeatureConfig = DEFAULT_FEATURE_CONFIG,
          tcfg: TrainingConfig | None = None, save: bool = True, out_dir: Path | None = None,
          progress: ProgressFn | None = None, known_labels: set[str] | None = None) -> dict:
    store = store or DatasetStore()
    tcfg = tcfg or TrainingConfig()
    progress = progress or (lambda stage, frac: None)
    t0 = time.perf_counter()

    progress("Validating dataset", 0.02)
    samples, validation = load_valid_samples(store, known_labels or known_labels_from(), fcfg)
    warnings = list(validation["warnings"])
    if validation["rejected"]:
        warnings.append(f"{validation['rejected']} sample(s) rejected by validation (see dataset_manifest.csv)")
    counts = Counter(s["label"] for s in samples)
    dropped = sorted(c for c, n in counts.items() if n < MIN_SAMPLES_PER_CLASS)
    if dropped:
        warnings.append(f"excluded (fewer than {MIN_SAMPLES_PER_CLASS} valid samples): {', '.join(dropped)}")
        samples = [s for s in samples if s["label"] not in dropped]
        counts = Counter(s["label"] for s in samples)
    if len(counts) < 2:
        raise TrainingError("need at least 2 classes with 3+ valid samples each (record '_none' as one of them). "
                            f"Valid samples found: {sum(counts.values())}")
    classes = sorted(counts)
    rng = np.random.default_rng(tcfg.random_seed)

    # ---- optional independent TEST session (the most recently recorded one)
    sessions = sorted({s["session"] for s in samples},
                      key=lambda sid: max(x["created_at"] for x in samples if x["session"] == sid))
    test_session = None
    if len(sessions) >= 3:
        cand = sessions[-1]
        dev_cls = {s["label"] for s in samples if s["session"] != cand}
        test_cls = {s["label"] for s in samples if s["session"] == cand}
        if len(test_cls) >= 2 and test_cls <= dev_cls and dev_cls == set(classes):
            test_session = cand
    dev = [s for s in samples if s["session"] != test_session]
    test = [s for s in samples if s["session"] == test_session]

    # ---- cross-validation on development data
    y_dev = np.array([s["label"] for s in dev])
    g_dev = np.array([s["session"] for s in dev])
    sess_per_class = {c: len(set(g_dev[y_dev == c])) for c in sorted(set(y_dev))}
    grouped = all(n >= 2 for n in sess_per_class.values())
    if grouped:
        n_splits = max(2, min(5, len(set(g_dev.tolist())), min(sess_per_class.values())))
        folds = list(StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=tcfg.random_seed)
                     .split(np.zeros(len(y_dev)), y_dev, g_dev))
        strategy = f"StratifiedGroupKFold over recording sessions ({n_splits} folds) on development data"
    else:
        n_splits = max(2, min(5, min(Counter(y_dev.tolist()).values())))
        folds = list(StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=tcfg.random_seed)
                     .split(np.zeros(len(y_dev)), y_dev))
        strategy = (f"StratifiedKFold ({n_splits} folds): samples from the SAME session appear in train and "
                    "validation, so these numbers are optimistic. Record each sign in 2+ sessions.")
        warnings.append("cross-validation is not session-independent")

    dev_classes = sorted(set(y_dev))
    candidates = {}
    total_steps = len(tcfg.candidate_models) * len(folds) + 3
    step = 0
    for kind in tcfg.candidate_models:
        y_pred = np.empty(len(dev), dtype=object)
        for k, (tr, te) in enumerate(folds):
            step += 1
            progress(f"Cross-validating {kind} (fold {k + 1}/{len(folds)})", 0.05 + 0.75 * step / total_steps)
            model = fit_model(kind, [dev[i]["mat"] for i in tr], y_dev[tr], fcfg, tcfg, rng)
            y_pred[te] = predict_labels(model, [dev[i]["mat"] for i in te], fcfg)
        candidates[kind] = metric_block(y_dev, y_pred.astype(str), dev_classes)
    best_kind = max(candidates, key=lambda k: (candidates[k]["macro_f1"], k == "logreg"))

    # ---- independent test session: baseline vs selected on the same held-out samples
    test_results = None
    if test_session:
        progress(f"Testing on held-out session {test_session}", 0.85)
        mats_dev, labels_dev = [s["mat"] for s in dev], [s["label"] for s in dev]
        y_test = [s["label"] for s in test]
        test_results = {"session": test_session, "num_examples": len(test), "models": {}}
        for kind in sorted({"logreg", best_kind}):
            model = fit_model(kind, mats_dev, labels_dev, fcfg, tcfg, rng)
            test_results["models"][kind] = metric_block(
                y_test, predict_labels(model, [s["mat"] for s in test], fcfg), classes)
            if kind == best_kind:
                test_results["continuous_stream"] = streaming_eval(
                    model, [str(c) for c in model.classes_], test, fcfg, RecognitionSettings().confidence_threshold)

    # ---- final model on all valid data
    progress("Fitting final model on all valid data", 0.92)
    final = fit_model(best_kind, [s["mat"] for s in samples], [s["label"] for s in samples], fcfg, tcfg, rng)
    final_classes = [str(c) for c in final.classes_]
    probe = matrix_to_vector(samples[0]["mat"], fcfg).reshape(1, -1)
    start = time.perf_counter()
    for _ in range(50):
        final.predict_proba(probe)
    latency_ms = (time.perf_counter() - start) * 1000.0 / 50

    headline = test_results["models"][best_kind] if test_results else candidates[best_kind]
    now = datetime.now(timezone.utc)
    trained_at = now.isoformat(timespec="seconds")
    model_version = now.strftime("v%Y%m%d-%H%M%S")
    metrics = {
        "trained_at": trained_at,
        "model_version": model_version,
        "model_type": best_kind,
        "architecture": MODEL_DESCRIPTIONS[best_kind],
        "candidates": {k: {"accuracy": v["accuracy"], "macro_f1": v["macro_f1"], "architecture": MODEL_DESCRIPTIONS[k]}
                       for k, v in candidates.items()},
        "evaluation_strategy": strategy,
        "session_independent": grouped,
        "headline_source": (f"held-out test session '{test_session}'" if test_results
                            else "out-of-fold cross-validation predictions"),
        "test": test_results,
        "num_samples": len(samples),
        "num_train_dev": len(dev),
        "num_test": len(test),
        "num_sessions": len(sessions),
        "class_counts": {c: int(counts[c]) for c in classes},
        "sessions_per_class": {c: len({s["session"] for s in samples if s["label"] == c}) for c in classes},
        "accuracy": headline["accuracy"],
        "macro_f1": headline["macro_f1"],
        "correct": headline["correct"],
        "incorrect": headline["incorrect"],
        "per_class": headline["per_class"],
        "confusion_matrix": headline["confusion_matrix"],
        "confused_pairs": headline["confused_pairs"],
        "imbalance_ratio": validation["imbalance_ratio"],
        "inference_latency_ms": round(latency_ms, 3),
        "training_seconds": round(time.perf_counter() - t0, 2),
        "dataset_hash": validation["dataset_hash"],
        "warnings": warnings,
        "note": "Isolated-sign classification metrics on recordings not used for training (per the protocol "
                "above). Live accuracy also depends on segmentation, lighting and the signer.",
        "training_config": asdict(tcfg),
        "feature_config": fcfg.to_dict(),
    }
    meta = {"trained_at": trained_at, "model_version": model_version, "model_type": best_kind,
            "architecture": MODEL_DESCRIPTIONS[best_kind], "num_samples": len(samples), "classes": final_classes,
            "feature_config": fcfg.to_dict(), "dataset_hash": validation["dataset_hash"],
            "sklearn_version": sklearn.__version__, "training_config": asdict(tcfg)}
    if save:
        progress("Saving model", 0.97)
        out = Path(out_dir) if out_dir else MODELS_DIR
        out.mkdir(parents=True, exist_ok=True)
        if (out / MODEL_FILE.name).exists():
            # keep the previous model instead of silently overwriting it
            try:
                old_meta = json.loads((out / MODEL_META_FILE.name).read_text(encoding="utf-8"))
                archive = out / "archive" / old_meta.get("model_version", "previous")
            except (OSError, json.JSONDecodeError):
                archive = out / "archive" / "previous"
            archive.mkdir(parents=True, exist_ok=True)
            for name in (MODEL_FILE.name, MODEL_META_FILE.name, METRICS_FILE.name):
                if (out / name).exists():
                    shutil.copy2(out / name, archive / name)
        joblib.dump({"pipeline": final, "classes": final_classes, "feature_config": fcfg.to_dict(),
                     **{k: v for k, v in meta.items() if k not in ("classes", "feature_config")}},
                    out / MODEL_FILE.name)
        (out / MODEL_META_FILE.name).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        (out / METRICS_FILE.name).write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
        with (out / TRAINING_LOG).open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({k: metrics[k] for k in ("trained_at", "model_version", "model_type", "num_samples",
                                                         "num_test", "accuracy", "macro_f1", "headline_source",
                                                         "evaluation_strategy", "dataset_hash", "candidates")},
                                ensure_ascii=False) + "\n")
    progress("Done", 1.0)
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Kannada SignBridge sign classifier on recorded data")
    parser.add_argument("--no-save", action="store_true", help="evaluate only, do not overwrite the model")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--augment", type=int, default=6, help="augmented copies per training sample")
    parser.add_argument("--models", default="logreg,svm_rbf,mlp", help="comma-separated candidates")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    tcfg = TrainingConfig(augment_copies=args.augment, random_seed=args.seed,
                          candidate_models=[m.strip() for m in args.models.split(",") if m.strip()])
    try:
        metrics = train(tcfg=tcfg, save=not args.no_save,
                        progress=lambda stage, frac: print(f"[{frac * 100:5.1f}%] {stage}", flush=True))
    except TrainingError as exc:
        raise SystemExit(f"Training not possible: {exc}")
    print(json.dumps({k: metrics[k] for k in ("model_version", "model_type", "architecture", "headline_source",
                                              "evaluation_strategy", "num_samples", "num_test", "accuracy",
                                              "macro_f1", "candidates", "confused_pairs", "warnings")},
                     indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
