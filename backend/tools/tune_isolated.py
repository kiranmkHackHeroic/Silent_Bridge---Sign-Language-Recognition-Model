"""Hyper-parameter sweep for the isolated classifier using DEVELOPMENT data only.

The held-out test groups chosen by the training protocol are excluded before any
tuning, so the final test numbers remain an unbiased estimate.
Usage (from backend/):  python tools/tune_isolated.py
"""
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_FEATURE_CONFIG, TrainingConfig  # noqa: E402
from app.training.train_model import (choose_test_groups, default_stores, known_labels_from,  # noqa: E402
                                      load_valid_samples, vectorize)


def main():
    tcfg = TrainingConfig(augment_copies=2)
    samples, _ = load_valid_samples(default_stores(), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    test_groups = choose_test_groups(samples, tcfg.test_fraction, tcfg.random_seed)
    dev = [s for s in samples if s.group not in test_groups]
    y = np.array([s.label for s in dev])
    g = np.array([s.group for s in dev])
    folds = list(StratifiedGroupKFold(n_splits=2, shuffle=True, random_state=42).split(np.zeros(len(y)), y, g))
    results = {}
    for C in (0.02, 0.1, 0.5, 2.0):
        preds = np.empty(len(dev), dtype=object)
        for tr, te in folds:
            rng = np.random.default_rng(42)
            x_tr, y_tr, _ = vectorize([dev[i] for i in tr], DEFAULT_FEATURE_CONFIG, rng, tcfg)
            x_te, _, _ = vectorize([dev[i] for i in te], DEFAULT_FEATURE_CONFIG)
            m = Pipeline([("s", StandardScaler()), ("c", LogisticRegression(C=C, max_iter=3000, class_weight="balanced"))])
            m.fit(x_tr, y_tr)
            preds[te] = m.predict(x_te)
        results[C] = round(float(f1_score(y, preds.astype(str), average="macro")), 4)
        print(f"C={C}: dev macro-F1 {results[C]}", flush=True)
    print(json.dumps({"dev_samples": len(dev), "excluded_test_samples": len(samples) - len(dev), "macro_f1_by_C": results}))


if __name__ == "__main__":
    main()
