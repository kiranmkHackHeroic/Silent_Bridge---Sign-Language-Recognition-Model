"""Is the validation-selected ensemble really better on the held-out test set, beyond seed noise?

The ensemble was SELECTED on validation (tools/phase6_experiments.py). This only REPORTS: baseline
(logreg) vs ensemble (logreg + GRU, as built by the app) on the identical held-out test videos for several
training seeds, plus a paired McNemar test on the pooled predictions (same videos, same seed per pair).

Usage (from backend/):  python tools/phase6_seed_check.py [--seeds 7 11 23]
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from math import comb
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_FEATURE_CONFIG, TrainingConfig  # noqa: E402
from app.training.train_model import (choose_test_groups, default_stores, fit_model, known_labels_from,  # noqa: E402
                                      load_valid_samples, metric_block, predict_labels)


def mcnemar_exact(b: int, c: int) -> float:
    """Two-sided exact McNemar p-value (b = only A right, c = only B right)."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    return min(1.0, 2 * sum(comb(n, i) for i in range(k + 1)) / 2 ** n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, nargs="+", default=[7, 11, 23])
    a = ap.parse_args()
    tcfg = TrainingConfig()
    samples, _ = load_valid_samples(default_stores(tcfg.sources), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    counts = Counter(s.label for s in samples)
    samples = [s for s in samples if counts[s.label] >= 3]
    tg = choose_test_groups(samples, tcfg.test_fraction, tcfg.random_seed)
    dev = [s for s in samples if s.group not in tg]
    test = [s for s in samples if s.group in tg]
    y = [s.label for s in test]
    labels = sorted(set(y))
    runs, only_base, only_ens = [], 0, 0
    for seed in a.seeds:
        res = {"seed": seed}
        preds = {}
        for kind in ("logreg", "ensemble"):
            m = fit_model(kind, dev, DEFAULT_FEATURE_CONFIG, tcfg, np.random.default_rng(seed))
            preds[kind] = predict_labels(m, test, DEFAULT_FEATURE_CONFIG)
            b = metric_block(y, preds[kind], labels)
            res[kind] = {"accuracy": b["accuracy"], "macro_f1": b["macro_f1"]}
        rb = np.array(preds["logreg"]) == np.array(y)
        re_ = np.array(preds["ensemble"]) == np.array(y)
        only_base += int(np.sum(rb & ~re_))
        only_ens += int(np.sum(re_ & ~rb))
        runs.append(res)
        print(f"seed {seed}: logreg {res['logreg']} | ensemble {res['ensemble']}", flush=True)

    def stat(kind, key):
        v = [r[kind][key] for r in runs]
        return {"mean": round(float(np.mean(v)), 4), "sd": round(float(np.std(v, ddof=1)), 4) if len(v) > 1 else 0.0}

    report = {"test_videos": len(test), "test_groups": sorted(tg), "runs": runs,
              "summary": {k: {"accuracy": stat(k, "accuracy"), "macro_f1": stat(k, "macro_f1")} for k in ("logreg", "ensemble")},
              "paired": {"videos_only_baseline_right": only_base, "videos_only_ensemble_right": only_ens,
                         "mcnemar_exact_p": mcnemar_exact(only_base, only_ens),
                         "note": "pooled over seeds; each seed pairs both models trained with the same seed"}}
    print(json.dumps(report["summary"], indent=1), json.dumps(report["paired"], indent=1))
    Path("reports").mkdir(exist_ok=True)
    Path("reports/phase6_seed_check.json").write_text(json.dumps(report, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
