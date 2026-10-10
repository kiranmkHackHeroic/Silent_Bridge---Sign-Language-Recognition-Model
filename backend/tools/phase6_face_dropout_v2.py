"""Face-dropout augmentation on the face-crop (v2) extraction, decided on VALIDATION only.

With v2, training videos almost always have a detected face, so the model may rely on it; live, the face is
lost when the hands cover it. For each dropout rate, out-of-fold predictions on identical signer-grouped folds:
  normal      validation videos as extracted
  face hidden the same validation videos with the face removed from every frame
Decision rule (fixed before running): adopt the rate with the best face-hidden macro-F1 among those whose
normal macro-F1 is within 0.01 of no dropout. Logistic regression is used as a fast proxy.

Usage (from backend/):  python tools/phase6_face_dropout_v2.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from dataclasses import replace
from pathlib import Path

import numpy as np
from sklearn.model_selection import StratifiedGroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_FEATURE_CONFIG, TrainingConfig  # noqa: E402
from app.recognition.landmarks import parse_frame  # noqa: E402
from app.recognition.sequence_features import frames_to_matrix  # noqa: E402
from app.training.train_model import (choose_test_groups, default_stores, fit_model, known_labels_from,  # noqa: E402
                                      load_valid_samples, metric_block, predict_labels)

RATES = [0.0, 0.3, 0.5]


def faceless(s):
    return replace(s, mat=frames_to_matrix([parse_frame({**f, "face": None}) for f in s.frames]))


def main():
    tcfg = TrainingConfig()
    samples, _ = load_valid_samples(default_stores(tcfg.sources), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    counts = Counter(s.label for s in samples)
    samples = [s for s in samples if counts[s.label] >= 3]
    tg = choose_test_groups(samples, tcfg.test_fraction, tcfg.random_seed)
    dev = [s for s in samples if s.group not in tg]          # the test set is not used at all
    y = np.array([s.label for s in dev])
    folds = list(StratifiedGroupKFold(n_splits=3, shuffle=True, random_state=42)
                 .split(np.zeros(len(y)), y, np.array([s.group for s in dev])))
    dev_nf = [faceless(s) for s in dev]
    res = {}
    for rate in RATES:
        cfg = replace(tcfg, face_dropout=rate)
        p_norm = np.empty(len(dev), dtype=object)
        p_nf = np.empty(len(dev), dtype=object)
        for k, (tr, te) in enumerate(folds):
            m = fit_model("logreg", [dev[i] for i in tr], DEFAULT_FEATURE_CONFIG, cfg, np.random.default_rng(1000 + k))
            p_norm[te] = predict_labels(m, [dev[i] for i in te], DEFAULT_FEATURE_CONFIG)
            p_nf[te] = predict_labels(m, [dev_nf[i] for i in te], DEFAULT_FEATURE_CONFIG)
        labels = sorted(set(y))
        a = metric_block(list(y), list(p_norm.astype(str)), labels)
        b = metric_block(list(y), list(p_nf.astype(str)), labels)
        res[rate] = {"normal": {"accuracy": a["accuracy"], "macro_f1": a["macro_f1"]},
                     "face_hidden": {"accuracy": b["accuracy"], "macro_f1": b["macro_f1"]}}
        print(f"face_dropout {rate}: normal macro-F1 {a['macro_f1']} | face hidden {b['macro_f1']}", flush=True)
    base = res[0.0]["normal"]["macro_f1"]
    ok = [r for r in RATES if res[r]["normal"]["macro_f1"] >= base - 0.01]
    chosen = max(ok, key=lambda r: (res[r]["face_hidden"]["macro_f1"], -r))
    print("chosen:", chosen)
    Path("reports").mkdir(exist_ok=True)
    Path("reports/phase6_face_dropout_v2.json").write_text(json.dumps({
        "rule": "best face-hidden validation macro-F1 among rates within 0.01 normal macro-F1 of no dropout",
        "results": {str(k): v for k, v in res.items()}, "chosen": chosen, "proxy_model": "logreg"}, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
