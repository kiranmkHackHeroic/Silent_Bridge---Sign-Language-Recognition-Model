"""Train and evaluate the isolated-sign classifier from REAL landmark samples.

Usage (from backend/):
    python -m app.training.train_model                       # train -> registry -> promote if accepted
    python -m app.training.train_model --no-save             # evaluate only
    python -m app.training.train_model --models logreg,gru --sources amrita_slr

Data sources: webcam recordings made in the app (data/dataset) plus every
imported dataset under data/processed/landmarks/<dataset> (same sample format,
same feature code as live inference). Only samples that pass validation are used.

Protocol (no leakage - splits are always by whole signer / recording group):
  1. If a dataset ships an official test split, it is used as the test set.
     Otherwise whole signer/session groups (~20% of samples) are held out as an
     independent TEST set (only groups whose classes also occur elsewhere).
  2. On the remaining development data every candidate is scored with
     out-of-fold predictions from StratifiedGroupKFold over groups.
  3. The best macro-F1 candidate is selected; the baseline (logistic regression)
     and the selected model are refit on the development data and compared on
     the same TEST samples; the TEST recordings are also replayed back-to-back
     through the live pipeline (continuous sign error rate).
  4. The selected model is refit on ALL valid data for deployment.
Augmentation (temporal crop, speed, jitter, shifts, left/right mirroring) is
applied to training folds only.
"""
from __future__ import annotations

import argparse
import json
import logging
import shutil
import time
from collections import Counter
from dataclasses import asdict, dataclass, field
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

from ..config import (DATASET_DIR, DEFAULT_FEATURE_CONFIG, LABELS_FILE, METRICS_FILE, MODEL_FILE, MODEL_META_FILE,
                      MODELS_DIR, NONE_LABEL, PROCESSED_LANDMARKS_DIR, FeatureConfig, RecognitionSettings,
                      TrainingConfig)
from ..dataset.store import DatasetStore
from ..dataset.validate import validate_dataset
from ..recognition.landmarks import FRAME_DIM, parse_frame
from ..recognition.sequence_features import augment_matrix, frames_to_matrix, matrix_to_vector
from ..video.extract import mirror_frame
from .temporal_models import TorchGRUClassifier

log = logging.getLogger(__name__)
MIN_SAMPLES_PER_CLASS = 3
TRAINING_LOG = "training_log.jsonl"
MODEL_DESCRIPTIONS = {
    "logreg": "Baseline: StandardScaler + multinomial logistic regression (class-balanced)",
    "svm_rbf": "StandardScaler + RBF-kernel SVM (class-balanced) with sigmoid probability calibration",
    "mlp": "StandardScaler + MLP (1 hidden layer, 128 ReLU units, Adam, L2, early stopping), class-balanced by oversampling",
    "gru": "Temporal model: per-frame linear embedding (96) -> bidirectional GRU (96 per direction) -> mean+max pooling "
           "+ global motion features -> linear softmax; AdamW, class-weighted loss, early stopping on a held-out "
           "split of training samples (PyTorch, CPU)",
}

ProgressFn = Callable[[str, float], None]


class TrainingError(RuntimeError):
    pass


@dataclass
class Sample:
    sample_id: str
    label: str
    group: str                  # "<source>:<session/signer>" - unit of every split
    source: str
    split: str
    created_at: str
    frames: list[dict]
    mat: np.ndarray
    mirror_mat: np.ndarray | None = None


@dataclass
class TrainResult:
    metrics: dict
    model: object
    classes: list[str]
    meta: dict
    test_samples: list[Sample] = field(default_factory=list)
    test_predictions: list[str] = field(default_factory=list)   # dev-only model on test_samples


# ---------------------------------------------------------------- data
def default_stores(sources: list[str] | None = None) -> list[tuple[str, DatasetStore]]:
    stores = [("app", DatasetStore(DATASET_DIR))]
    if PROCESSED_LANDMARKS_DIR.exists():
        for d in sorted(p for p in PROCESSED_LANDMARKS_DIR.iterdir() if p.is_dir()):
            stores.append((d.name, DatasetStore(d)))
    if sources:
        stores = [s for s in stores if s[0] in sources]
    return stores


def load_valid_samples(stores: list[tuple[str, DatasetStore]], known_labels: set[str], fcfg: FeatureConfig,
                       mirror: bool = True):
    samples: list[Sample] = []
    summary = {"total": 0, "valid": 0, "rejected": 0, "warnings": [], "per_source": {}, "hashes": []}
    for source, store in stores:
        report = validate_dataset(store, known_labels, fcfg)
        s = report["summary"]
        summary["total"] += s["total"]
        summary["valid"] += s["valid"]
        summary["rejected"] += s["rejected"]
        summary["hashes"].append(f"{source}:{s['dataset_hash']}")
        if s["total"]:
            summary["per_source"][source] = {"valid": s["valid"], "rejected": s["rejected"],
                                             "classes": len([c for c, v in s["per_class"].items() if v["valid"]])}
            summary["warnings"] += [f"[{source}] {w}" for w in s["warnings"]
                                    if not (source != "app" and "'_none'" in w)]
        for rep in report["reports"]:
            if not rep.valid:
                continue
            data = json.loads((store.root / rep.file).read_text(encoding="utf-8"))
            frames = data["frames"]
            mat = frames_to_matrix([parse_frame(p) for p in frames])
            mmat = frames_to_matrix([parse_frame(mirror_frame(p)) for p in frames]) if mirror else None
            samples.append(Sample(rep.sample_id, rep.label, f"{source}:{rep.session_id}", source,
                                  str(data.get("split") or ""), data.get("created_at", ""), frames, mat, mmat))
    import hashlib
    summary["dataset_hash"] = hashlib.sha1("|".join(summary["hashes"]).encode()).hexdigest()[:12]
    counts = Counter(x.label for x in samples)
    if counts:
        summary["imbalance_ratio"] = round(max(counts.values()) / min(counts.values()), 2)
    else:
        summary["imbalance_ratio"] = None
    return samples, summary


# ---------------------------------------------------------------- models
def build_model(kind: str, seed: int, fcfg: FeatureConfig = DEFAULT_FEATURE_CONFIG):
    if kind == "logreg":
        # C=0.1 chosen by a development-data sweep (tools/tune_isolated.py); test data untouched
        clf = LogisticRegression(C=0.1, max_iter=3000, class_weight="balanced", random_state=seed)
    elif kind == "svm_rbf":
        clf = CalibratedClassifierCV(SVC(C=10.0, gamma="scale", class_weight="balanced", random_state=seed),
                                     method="sigmoid", cv=3, ensemble=False)
    elif kind == "mlp":
        clf = MLPClassifier(hidden_layer_sizes=(128,), alpha=1e-3, learning_rate_init=1e-3, max_iter=300,
                            early_stopping=True, validation_fraction=0.15, n_iter_no_change=15, random_state=seed)
    elif kind == "gru":
        return TorchGRUClassifier(seq_len=fcfg.resample_frames, frame_dim=FRAME_DIM, seed=seed)
    else:
        raise ValueError(f"unknown model type {kind!r}")
    return Pipeline([("scale", StandardScaler()), ("clf", clf)])


def vectorize(samples: list[Sample], fcfg: FeatureConfig, rng=None, tcfg: TrainingConfig | None = None):
    xs, ys, gs = [], [], []
    for i, s in enumerate(samples):
        variants = [s.mat]
        if rng is not None and tcfg is not None:
            if tcfg.mirror_augment and s.mirror_mat is not None:
                variants.append(s.mirror_mat)
            base = list(variants)
            for _ in range(tcfg.augment_copies):
                variants.append(augment_matrix(base[int(rng.integers(len(base)))], rng, tcfg))
        for m in variants:
            v = matrix_to_vector(m, fcfg)
            if v is not None:
                xs.append(v)
                ys.append(s.label)
                gs.append(i)
    return np.stack(xs), np.array(ys), np.array(gs)


def oversample(x, y, rng):
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


def fit_model(kind: str, samples: list[Sample], fcfg: FeatureConfig, tcfg: TrainingConfig, rng):
    x, y, g = vectorize(samples, fcfg, rng, tcfg)
    model = build_model(kind, tcfg.random_seed, fcfg)
    if kind == "mlp":
        x, y = oversample(x, y, rng)
    if kind == "gru":
        model.fit(x, y, groups=g)
    else:
        model.fit(x, y)
    return model


def predict_labels(model, samples: list[Sample], fcfg: FeatureConfig) -> np.ndarray:
    x = np.stack([matrix_to_vector(s.mat, fcfg) for s in samples])
    return np.asarray(model.predict(x)).astype(str)


def metric_block(y_true, y_pred, classes) -> dict:
    report = classification_report(y_true, y_pred, labels=classes, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=classes)
    pairs = [{"true": a, "predicted": b, "count": int(cm[i, j])}
             for i, a in enumerate(classes) for j, b in enumerate(classes) if i != j and cm[i, j]]
    pairs.sort(key=lambda p: -p["count"])
    present = [c for c in classes if report[c]["support"] > 0]
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macro_f1": round(float(f1_score(y_true, y_pred, labels=present, average="macro", zero_division=0)), 4),
        "num_examples": int(len(y_true)),
        "correct": int(np.sum(np.asarray(y_true) == np.asarray(y_pred))),
        "incorrect": int(np.sum(np.asarray(y_true) != np.asarray(y_pred))),
        "per_class": {c: {k: round(float(report[c][k]), 4) for k in ("precision", "recall", "f1-score", "support")}
                      for c in classes},
        "confusion_matrix": {"labels": classes, "matrix": cm.tolist()},
        "confused_pairs": pairs[:10],
    }


# ---------------------------------------------------------------- splits
def choose_test_groups(samples: list[Sample], fraction: float, seed: int) -> set[str]:
    # datasets with an official test split use it; the others get held-out signer/session groups
    official = {s.group for s in samples if s.split == "test"}
    official_sources = {s.source for s in samples if s.split == "test"}
    rest = [s for s in samples if s.source not in official_sources]
    chosen = _hold_out_groups(rest, fraction, seed, all_samples=samples) if rest else set()
    combined = official | chosen
    if len({s.label for s in samples if s.group in combined}) < 2:
        return set()
    return combined


def _hold_out_groups(samples: list[Sample], fraction: float, seed: int, all_samples: list[Sample]) -> set[str]:
    groups = sorted({s.group for s in samples})
    if len(groups) < 3:
        return set()
    rng = np.random.default_rng(seed)
    order = [groups[i] for i in rng.permutation(len(groups))]
    target = fraction * len(samples)
    chosen: set[str] = set()
    n = 0
    for g in order:
        if n >= target:
            break
        trial = chosen | {g}
        # every test class must still be learnable from development data of ANY dataset
        dev_classes = {s.label for s in all_samples if s.group not in trial and s.split != "test"}
        test_classes = {s.label for s in samples if s.group in trial}
        if not test_classes <= dev_classes:
            continue
        if len(trial) >= len(groups) - 1:        # keep at least 2 groups for development
            break
        chosen = trial
        n = sum(1 for s in samples if s.group in chosen)
    if len({s.label for s in samples if s.group in chosen}) < 2:
        return set()
    return chosen


# ---------------------------------------------------------------- continuous evaluation
def streaming_eval(model, classes: list[str], samples: list[Sample], fcfg: FeatureConfig, threshold: float) -> dict:
    """Replay held-out recordings back-to-back (short hand-free gaps) through the live pipeline and
    compare the emitted words with the true sequence (Levenshtein alignment)."""
    from ..recognition.pipeline import RecognitionSession
    from ..recognition.predictor import SignPredictor
    from ..translation.kannada_mapping import Vocabulary

    predictor = SignPredictor(feature_config=fcfg)
    predictor.model, predictor.classes = model, classes
    session = RecognitionSession(predictor, Vocabulary(LABELS_FILE), RecognitionSettings(confidence_threshold=threshold))
    t, truth, emitted, proc = 0.0, [], [], []

    def feed(payload):
        start = time.perf_counter()
        for ev in session.process(payload):
            if ev["type"] == "sign":
                emitted.append(ev["token"]["label"])
        proc.append((time.perf_counter() - start) * 1000)

    for s in samples:
        frames = s.frames
        w, h = frames[0].get("w", 640), frames[0].get("h", 480)
        for _ in range(12):
            feed({"t": t, "w": w, "h": h, "hands": []})
            t += 33.3
        t0 = frames[0].get("t", 0)
        for f in frames:
            feed({**f, "t": t + (f.get("t", t0) - t0)})
        t += (frames[-1].get("t", t0) - t0) + 33.3
        if s.label != NONE_LABEL:
            truth.append(s.label)
    for _ in range(15):
        feed({"t": t, "w": 640, "h": 480, "hands": []})
        t += 33.3
    return {**edit_counts(truth, emitted), "mean_frame_processing_ms": round(float(np.mean(proc)), 3) if proc else None,
            "threshold": threshold}


def edit_counts(truth: list[str], emitted: list[str]) -> dict:
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
    return {"reference_signs": n, "emitted_signs": m, "substitutions": int(subs), "deletions": int(dels),
            "insertions": int(ins), "sign_error_rate": round((subs + dels + ins) / n, 4) if n else None}


# ---------------------------------------------------------------- training
def known_labels_from(labels_file: Path = LABELS_FILE) -> set[str]:
    data = json.loads(labels_file.read_text(encoding="utf-8"))
    return {item["label"] for item in data.get("labels", [])} | {NONE_LABEL}


def train_candidate(stores: list[tuple[str, DatasetStore]] | None = None, fcfg: FeatureConfig = DEFAULT_FEATURE_CONFIG,
                    tcfg: TrainingConfig | None = None, progress: ProgressFn | None = None,
                    known_labels: set[str] | None = None) -> TrainResult:
    tcfg = tcfg or TrainingConfig()
    stores = stores if stores is not None else default_stores(tcfg.sources)
    progress = progress or (lambda stage, frac: None)
    t0 = time.perf_counter()

    progress("Validating datasets and loading landmarks", 0.02)
    samples, validation = load_valid_samples(stores, known_labels or known_labels_from(), fcfg, tcfg.mirror_augment)
    warnings = list(validation["warnings"])
    if validation["rejected"]:
        warnings.append(f"{validation['rejected']} sample(s) rejected by validation (see the manifests)")
    counts = Counter(s.label for s in samples)
    dropped = sorted(c for c, n in counts.items() if n < MIN_SAMPLES_PER_CLASS)
    if dropped:
        warnings.append(f"excluded (fewer than {MIN_SAMPLES_PER_CLASS} valid samples): {', '.join(dropped)}")
        samples = [s for s in samples if s.label not in dropped]
        counts = Counter(s.label for s in samples)
    if len(counts) < 2:
        raise TrainingError("need at least 2 classes with 3+ valid samples each. "
                            f"Valid samples found: {sum(counts.values())}")
    classes = sorted(counts)
    rng = np.random.default_rng(tcfg.random_seed)

    test_groups = choose_test_groups(samples, tcfg.test_fraction, tcfg.random_seed)
    dev = [s for s in samples if s.group not in test_groups]
    test = [s for s in samples if s.group in test_groups]
    official = any(s.split == "test" for s in samples)

    y_dev = np.array([s.label for s in dev])
    g_dev = np.array([s.group for s in dev])
    groups_per_class = {c: len(set(g_dev[y_dev == c])) for c in sorted(set(y_dev))}
    grouped = len(set(g_dev.tolist())) >= 2
    single_group = sorted(c for c, n in groups_per_class.items() if n < 2)
    if grouped and single_group:
        # e.g. INCLUDE has no signer ids: its classes live in one group, so in group-wise CV they are
        # sometimes predicted without any training example -> pessimistic, never optimistic
        warnings.append(f"{len(single_group)} class(es) occur in a single signer/session group of the development "
                        "data; their cross-validation scores are pessimistic")
    if grouped:
        n_splits = max(2, min(tcfg.cv_folds, len(set(g_dev.tolist()))))
        folds = list(StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=tcfg.random_seed)
                     .split(np.zeros(len(y_dev)), y_dev, g_dev))
        strategy = f"StratifiedGroupKFold over signer/session groups ({n_splits} folds) on development data"
    else:
        n_splits = max(2, min(tcfg.cv_folds, min(Counter(y_dev.tolist()).values())))
        folds = list(StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=tcfg.random_seed)
                     .split(np.zeros(len(y_dev)), y_dev))
        strategy = (f"StratifiedKFold ({n_splits} folds): samples from the SAME signer/session appear in train and "
                    "validation, so these numbers are optimistic. Record each sign in 2+ sessions.")
        warnings.append("cross-validation is not signer/session-independent")

    dev_classes = sorted(set(y_dev))
    candidates: dict[str, dict] = {}
    n_steps = len(tcfg.candidate_models) * len(folds)
    step = 0
    for kind in tcfg.candidate_models:
        y_pred = np.empty(len(dev), dtype=object)
        t_kind = time.perf_counter()
        for k, (tr, te) in enumerate(folds):
            step += 1
            progress(f"Cross-validating {kind} (fold {k + 1}/{len(folds)})", 0.05 + 0.65 * step / n_steps)
            model = fit_model(kind, [dev[i] for i in tr], fcfg, tcfg, rng)
            y_pred[te] = predict_labels(model, [dev[i] for i in te], fcfg)
        candidates[kind] = metric_block(y_dev, y_pred.astype(str), dev_classes)
        candidates[kind]["fit_seconds"] = round(time.perf_counter() - t_kind, 1)
    best_kind = max(candidates, key=lambda k: (candidates[k]["macro_f1"], k == "logreg"))

    test_results = None
    test_preds: list[str] = []
    if test:
        official_sources = sorted({s.source for s in test if s.split == "test"})
        held = sorted(g.split(":", 1)[1] for g in test_groups if not any(x.group == g and x.split == "test" for x in test))
        parts = [f"official test split of {', '.join(official_sources)}"] if official else []
        if held:
            parts.append(f"held-out signer/session group(s): {', '.join(held)}")
        desc = " + ".join(parts)
        progress(f"Testing on {desc}", 0.75)
        y_test = [s.label for s in test]
        test_results = {"description": desc, "groups": sorted(test_groups), "num_examples": len(test), "models": {}}
        for kind in sorted({"logreg", best_kind}):
            model = fit_model(kind, dev, fcfg, tcfg, rng)
            preds = predict_labels(model, test, fcfg)
            test_results["models"][kind] = metric_block(y_test, preds, classes)
            if kind == best_kind:
                test_preds = [str(p) for p in preds]
                test_results["per_source"] = {
                    src: {"examples": int(sum(1 for t in test if t.source == src)),
                          "accuracy": round(float(np.mean([p == t.label for p, t in zip(preds, test) if t.source == src])), 4)}
                    for src in sorted({t.source for t in test})}
                progress("Replaying test recordings through the live pipeline", 0.85)
                test_results["continuous_stream"] = streaming_eval(
                    model, [str(c) for c in model.classes_], test, fcfg, RecognitionSettings().confidence_threshold)

    progress("Fitting final model on all valid data", 0.9)
    final = fit_model(best_kind, samples, fcfg, tcfg, rng)
    final_classes = [str(c) for c in final.classes_]
    probe = matrix_to_vector(samples[0].mat, fcfg).reshape(1, -1)
    start = time.perf_counter()
    for _ in range(30):
        final.predict_proba(probe)
    latency_ms = (time.perf_counter() - start) * 1000.0 / 30

    headline = test_results["models"][best_kind] if test_results else candidates[best_kind]
    now = datetime.now(timezone.utc)
    trained_at = now.isoformat(timespec="seconds")
    model_version = now.strftime("v%Y%m%d-%H%M%S")
    sources = Counter(s.source for s in samples)
    metrics = {
        "trained_at": trained_at, "model_version": model_version, "task": "isolated",
        "model_type": best_kind, "architecture": MODEL_DESCRIPTIONS[best_kind],
        "candidates": {k: {"accuracy": v["accuracy"], "macro_f1": v["macro_f1"], "architecture": MODEL_DESCRIPTIONS[k],
                           "fit_seconds": v["fit_seconds"]} for k, v in candidates.items()},
        "evaluation_strategy": strategy, "session_independent": grouped,
        "headline_source": (f"independent test set ({test_results['description']})" if test_results
                            else "out-of-fold cross-validation predictions"),
        "test": test_results,
        "sources": dict(sources), "per_source": validation["per_source"],
        "test_per_source": (test_results or {}).get("per_source"),
        "num_samples": len(samples), "num_train_dev": len(dev), "num_test": len(test),
        "num_sessions": len({s.group for s in samples}), "num_classes": len(classes),
        "class_counts": {c: int(counts[c]) for c in classes},
        "sessions_per_class": {c: len({s.group for s in samples if s.label == c}) for c in classes},
        "accuracy": headline["accuracy"], "macro_f1": headline["macro_f1"],
        "correct": headline["correct"], "incorrect": headline["incorrect"],
        "per_class": headline["per_class"], "confusion_matrix": headline["confusion_matrix"],
        "confused_pairs": headline["confused_pairs"],
        "imbalance_ratio": validation["imbalance_ratio"],
        "inference_latency_ms": round(latency_ms, 3),
        "training_seconds": round(time.perf_counter() - t0, 1),
        "dataset_hash": validation["dataset_hash"], "warnings": warnings,
        "note": "Isolated-sign classification on recordings of signers/sessions not used for training. Live "
                "accuracy also depends on segmentation, camera position, lighting and the signer.",
        "training_config": asdict(tcfg), "feature_config": fcfg.to_dict(),
    }
    meta = {"trained_at": trained_at, "model_version": model_version, "model_type": best_kind,
            "architecture": MODEL_DESCRIPTIONS[best_kind], "num_samples": len(samples), "classes": final_classes,
            "feature_config": fcfg.to_dict(), "dataset_hash": validation["dataset_hash"], "sources": dict(sources),
            "trained_sample_ids": sorted(s.sample_id for s in samples),
            "sklearn_version": sklearn.__version__, "training_config": asdict(tcfg)}
    progress("Done", 1.0)
    return TrainResult(metrics, final, final_classes, meta, test, test_preds)


def save_bundle(result: TrainResult, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": result.model, "classes": result.classes, "feature_config": result.meta["feature_config"],
                 **{k: v for k, v in result.meta.items() if k not in ("classes", "feature_config")}},
                out / MODEL_FILE.name)
    (out / MODEL_META_FILE.name).write_text(json.dumps(result.meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / METRICS_FILE.name).write_text(json.dumps(result.metrics, ensure_ascii=False, indent=2), encoding="utf-8")


def append_log(out: Path, metrics: dict, extra: dict | None = None) -> None:
    with (out / TRAINING_LOG).open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({**{k: metrics.get(k) for k in ("trained_at", "model_version", "model_type", "num_samples",
                                                            "num_test", "accuracy", "macro_f1", "headline_source",
                                                            "evaluation_strategy", "dataset_hash", "candidates")},
                             **(extra or {})}, ensure_ascii=False) + "\n")


def train(store: DatasetStore | None = None, fcfg: FeatureConfig = DEFAULT_FEATURE_CONFIG,
          tcfg: TrainingConfig | None = None, save: bool = True, out_dir: Path | None = None,
          progress: ProgressFn | None = None, known_labels: set[str] | None = None,
          stores: list[tuple[str, DatasetStore]] | None = None) -> dict:
    """Train and (optionally) save directly into `out_dir` (flat layout, archives the previous model).

    The application uses app.training.registry.train_and_promote instead, which keeps
    versions and only activates a candidate that passes the acceptance criteria."""
    if stores is None and store is not None:
        stores = [("app", store)]
    result = train_candidate(stores, fcfg, tcfg, progress, known_labels)
    if save:
        out = Path(out_dir) if out_dir else MODELS_DIR
        if (out / MODEL_FILE.name).exists():
            try:
                old = json.loads((out / MODEL_META_FILE.name).read_text(encoding="utf-8")).get("model_version", "previous")
            except (OSError, json.JSONDecodeError):
                old = "previous"
            archive = out / "archive" / old
            archive.mkdir(parents=True, exist_ok=True)
            for name in (MODEL_FILE.name, MODEL_META_FILE.name, METRICS_FILE.name):
                if (out / name).exists():
                    shutil.copy2(out / name, archive / name)
        save_bundle(result, out)
        append_log(out, result.metrics)
    return result.metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Kannada SignBridge sign classifier on real data")
    parser.add_argument("--no-save", action="store_true", help="evaluate only, do not create a model version")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--augment", type=int, default=3, help="augmented copies per training sample")
    parser.add_argument("--models", default="logreg,svm_rbf,mlp,gru", help="comma-separated candidates")
    parser.add_argument("--sources", default="", help="comma-separated data sources (default: all)")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    tcfg = TrainingConfig(augment_copies=args.augment, random_seed=args.seed,
                          candidate_models=[m.strip() for m in args.models.split(",") if m.strip()],
                          sources=[s.strip() for s in args.sources.split(",") if s.strip()] or None)
    show = lambda stage, frac: print(f"[{datetime.now():%H:%M:%S}] [{frac * 100:5.1f}%] {stage}", flush=True)  # noqa: E731
    try:
        if args.no_save:
            metrics = train_candidate(None, tcfg=tcfg, progress=show).metrics
        else:
            from .registry import train_and_promote
            outcome = train_and_promote(tcfg=tcfg, progress=show)
            metrics = outcome["metrics"]
            print(json.dumps({k: outcome[k] for k in ("version", "promoted", "decision")}, indent=2, ensure_ascii=False))
    except TrainingError as exc:
        raise SystemExit(f"Training not possible: {exc}")
    print(json.dumps({k: metrics[k] for k in ("model_version", "model_type", "headline_source", "evaluation_strategy",
                                              "num_samples", "num_classes", "num_test", "accuracy", "macro_f1",
                                              "candidates", "warnings")}, indent=2, ensure_ascii=False))
    if metrics.get("test") and metrics["test"].get("continuous_stream"):
        print("continuous stream:", json.dumps(metrics["test"]["continuous_stream"]))


if __name__ == "__main__":
    main()
