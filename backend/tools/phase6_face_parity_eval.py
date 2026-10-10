"""Does the INCLUDE "no face" extraction artefact matter, and does the face-crop extractor (v2) fix it?

v1 landmarks (data/processed_backup/*_mp0.10.21-tasks-640-v1): INCLUDE faces never detected (signer far away).
v2 landmarks (data/processed/landmarks, extractor ...-facecrop-v2): face found via an upper-centre crop.

A webcam user sits close to the camera, so the face IS visible live; v2 test features are therefore the
live-like condition. Same videos, same held-out test groups, same seeds:
  train v1 -> test v1   (what the old reports measured: the face-absence shortcut is present in train AND test)
  train v1 -> test v2   (old model when the face is visible, as at a webcam)
  train v2 -> test v2   (new extraction)
Also the out-of-fold VALIDATION macro-F1 of v2 (identical StratifiedGroupKFold folds), which is used to decide
whether v2 may replace v1 (it must not lose more than 0.01 validation macro-F1).

Usage (from backend/):  python tools/phase6_face_parity_eval.py [--kinds logreg ensemble]
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from sklearn.model_selection import StratifiedGroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DATA_DIR, DEFAULT_FEATURE_CONFIG, TrainingConfig  # noqa: E402
from app.dataset.store import DatasetStore  # noqa: E402
from app.training.train_model import (choose_test_groups, default_stores, fit_model, known_labels_from,  # noqa: E402
                                      load_valid_samples, metric_block, predict_labels)

BACKUP = DATA_DIR / "processed_backup"


def load(stores):
    s, _ = load_valid_samples(stores, known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    return {x.sample_id: x for x in s}


def scores(model, samples):
    y = [s.label for s in samples]
    p = predict_labels(model, samples, DEFAULT_FEATURE_CONFIG)
    b = metric_block(y, list(p), sorted(set(y)))
    src = {}
    for name in sorted({s.source for s in samples}):
        idx = [i for i, s in enumerate(samples) if s.source == name]
        src[name] = round(float(np.mean([p[i] == y[i] for i in idx])), 4)
    return {"accuracy": b["accuracy"], "macro_f1": b["macro_f1"], "per_source": src}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kinds", nargs="+", default=["logreg", "ensemble"])
    a = ap.parse_args()
    tcfg = TrainingConfig()
    v1 = load([(src, DatasetStore(BACKUP / f"{src}_mp0.10.21-tasks-640-v1")) for src in ("amrita_slr", "include")])
    v2 = load([st for st in default_stores() if st[0] in ("amrita_slr", "include")])
    common = sorted(set(v1) & set(v2))
    counts = Counter(v2[i].label for i in common)
    common = [i for i in common if counts[v2[i].label] >= 3]
    tg = choose_test_groups([v2[i] for i in common], tcfg.test_fraction, tcfg.random_seed)
    dev_ids = [i for i in common if v2[i].group not in tg]
    test_ids = [i for i in common if v2[i].group in tg]
    face = {ver: {src: round(float(np.mean([np.mean([bool(f.get("face")) for f in d[i].frames]) for i in common if d[i].source == src])), 3)
                  for src in ("amrita_slr", "include")} for ver, d in (("v1", v1), ("v2", v2))}
    print(f"{len(dev_ids)} dev / {len(test_ids)} test videos present in both extractions; face frame rate {face}", flush=True)
    out = {"face_frame_rate": face, "test_groups": sorted(tg), "dev": len(dev_ids), "test": len(test_ids), "results": {}}
    for kind in a.kinds:
        r = {}
        m1 = fit_model(kind, [v1[i] for i in dev_ids], DEFAULT_FEATURE_CONFIG, tcfg, np.random.default_rng(7))
        r["train_v1_test_v1"] = scores(m1, [v1[i] for i in test_ids])
        r["train_v1_test_v2_live_like"] = scores(m1, [v2[i] for i in test_ids])
        m2 = fit_model(kind, [v2[i] for i in dev_ids], DEFAULT_FEATURE_CONFIG, tcfg, np.random.default_rng(7))
        r["train_v2_test_v2"] = scores(m2, [v2[i] for i in test_ids])
        # validation (selection evidence): identical out-of-fold folds for v1 and v2
        y = np.array([v2[i].label for i in dev_ids])
        folds = list(StratifiedGroupKFold(n_splits=3, shuffle=True, random_state=42)
                     .split(np.zeros(len(y)), y, np.array([v2[i].group for i in dev_ids])))
        for ver, d in (("v1", v1), ("v2", v2)):
            pred = np.empty(len(dev_ids), dtype=object)
            for k, (tr, te) in enumerate(folds):
                mk = fit_model(kind, [d[dev_ids[j]] for j in tr], DEFAULT_FEATURE_CONFIG, tcfg, np.random.default_rng(1000 + k))
                pred[te] = predict_labels(mk, [d[dev_ids[j]] for j in te], DEFAULT_FEATURE_CONFIG)
            r[f"validation_{ver}"] = {k2: v for k2, v in metric_block(list(y), list(pred.astype(str)), sorted(set(y))).items()
                                       if k2 in ("accuracy", "macro_f1")}
        out["results"][kind] = r
        print(kind, json.dumps(r, indent=1), flush=True)
    Path("reports").mkdir(exist_ok=True)
    Path("reports/phase6_face_parity.json").write_text(json.dumps(out, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
