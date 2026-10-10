"""Phase 6: reproducible baseline, data-quality audit and fair model/representation comparison.

Protocol (no test-set selection):
  * same samples, same held-out TEST groups and same signer-grouped CV folds as the registry
    (choose_test_groups + StratifiedGroupKFold(3, seed 42) on development data)
  * every fit gets its own fixed seed, so results do not depend on which other models ran first
    (the registry shares one random generator across candidates, so its numbers shift slightly)
  * variants are compared by out-of-fold (validation) macro-F1 on IDENTICAL validation examples
  * the TEST set is scored only for the baseline and for the single variant selected on validation;
    a variant replaces the baseline only if it gains >= MIN_GAIN validation macro-F1

Outputs: reports/phase6_baseline.json, reports/phase6_experiments.json

Usage (from backend/):  python tools/phase6_experiments.py
"""
from __future__ import annotations

import json
import sys
import time
from collections import Counter, defaultdict
from dataclasses import replace
from pathlib import Path

import numpy as np
from sklearn.model_selection import StratifiedGroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEFAULT_FEATURE_CONFIG, TrainingConfig  # noqa: E402
from app.recognition.sequence_features import matrix_to_vector  # noqa: E402
from app.training.train_model import (choose_test_groups, default_stores, fit_model, known_labels_from,  # noqa: E402
                                      load_valid_samples, metric_block)

MIN_GAIN = 0.01


def proba(model, samples, fcfg):
    x = np.stack([matrix_to_vector(s.mat, fcfg) for s in samples])
    p = model.predict_proba(x)
    return p, [str(c) for c in model.classes_]


def aligned(p, cls, classes):
    out = np.zeros((p.shape[0], len(classes)))
    idx = {c: i for i, c in enumerate(classes)}
    for j, c in enumerate(cls):
        out[:, idx[c]] = p[:, j]
    return out


def oof(kind, dev, folds, fcfg, tcfg, classes):
    """Out-of-fold class probabilities on the development data."""
    P = np.zeros((len(dev), len(classes)))
    t0 = time.time()
    for k, (tr, te) in enumerate(folds):
        m = fit_model(kind, [dev[i] for i in tr], fcfg, tcfg, np.random.default_rng(1000 + k))
        p, cls = proba(m, [dev[i] for i in te], fcfg)
        P[te] = aligned(p, cls, classes)
    return P, round(time.time() - t0, 1)


def block(y, P, classes):
    pred = np.asarray(classes)[P.argmax(1)]
    b = metric_block(list(y), list(pred), sorted(set(y)))
    return {"accuracy": b["accuracy"], "macro_f1": b["macro_f1"],
            "per_class_recall": {c: v["recall"] for c, v in b["per_class"].items()}}


def test_eval(kinds_weights, dev, test, fcfg, tcfg, classes):
    P = np.zeros((len(test), len(classes)))
    for kind, w in kinds_weights:
        m = fit_model(kind, dev, fcfg, tcfg, np.random.default_rng(7))
        p, cls = proba(m, test, fcfg)
        P += w * aligned(p, cls, classes)
    y = [s.label for s in test]
    pred = list(np.asarray(classes)[P.argmax(1)])
    b = metric_block(y, pred, sorted(set(y) | set(pred)))
    per_source, per_group = defaultdict(list), defaultdict(list)
    for s, pr in zip(test, pred):
        per_source[s.source].append(pr == s.label)
        per_group[s.group].append(pr == s.label)
    b["per_source"] = {k: {"n": len(v), "accuracy": round(float(np.mean(v)), 4)} for k, v in per_source.items()}
    b["per_signer_group"] = {k: {"n": len(v), "accuracy": round(float(np.mean(v)), 4)} for k, v in per_group.items()}
    b["confidence"] = P.max(1)
    return b


def data_quality(samples, validation, test_groups):
    per = defaultdict(lambda: {"total": 0, "dev": 0, "test": 0, "groups": set(), "hand_rate": [], "face_rate": []})
    for s in samples:
        d = per[s.label]
        d["total"] += 1
        d["test" if s.group in test_groups else "dev"] += 1
        d["groups"].add(s.group)
        fr = s.frames
        d["hand_rate"].append(np.mean([bool(f.get("hands")) for f in fr]))
        d["face_rate"].append(np.mean([bool(f.get("face")) for f in fr]))
    out = {c: {"total": d["total"], "dev": d["dev"], "test": d["test"], "signer_groups": len(d["groups"]),
               "hand_frame_rate": round(float(np.mean(d["hand_rate"])), 3), "face_frame_rate": round(float(np.mean(d["face_rate"])), 3)}
           for c, d in sorted(per.items())}
    counts = [v["total"] for v in out.values()]
    return {"classes": out, "imbalance_ratio": round(max(counts) / min(counts), 2), "min_per_class": min(counts),
            "max_per_class": max(counts), "validation": {k: validation[k] for k in ("total", "valid", "rejected")},
            "per_source": validation.get("per_source")}


def main():
    t_start = time.time()
    base_t = TrainingConfig(candidate_models=["logreg"])
    samples, validation = load_valid_samples(default_stores(base_t.sources), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    counts = Counter(s.label for s in samples)
    samples = [s for s in samples if counts[s.label] >= 3]
    test_groups = choose_test_groups(samples, base_t.test_fraction, base_t.random_seed)
    dev = [s for s in samples if s.group not in test_groups]
    test = [s for s in samples if s.group in test_groups]
    y_dev = np.array([s.label for s in dev])
    folds = list(StratifiedGroupKFold(n_splits=3, shuffle=True, random_state=42)
                 .split(np.zeros(len(dev)), y_dev, np.array([s.group for s in dev])))
    classes = sorted(set(s.label for s in samples))
    print(f"{len(dev)} dev / {len(test)} test; test groups {sorted(test_groups)}", flush=True)

    quality = data_quality(samples, validation, test_groups)

    # ---- validation comparison on identical out-of-fold examples
    variants = {}
    probs = {}
    for T in (12, 16, 24, 32):
        fcfg = replace(DEFAULT_FEATURE_CONFIG, resample_frames=T)
        P, secs = oof("logreg", dev, folds, fcfg, base_t, classes)
        probs[f"logreg_T{T}"] = P
        variants[f"logreg_T{T}"] = {**block(y_dev, P, classes), "fit_seconds": secs, "kind": "logreg", "resample_frames": T}
        print(f"logreg T={T}: val macro-F1 {variants[f'logreg_T{T}']['macro_f1']} acc {variants[f'logreg_T{T}']['accuracy']} ({secs}s)", flush=True)
    P, secs = oof("gru", dev, folds, DEFAULT_FEATURE_CONFIG, base_t, classes)
    probs["gru_T16"] = P
    variants["gru_T16"] = {**block(y_dev, P, classes), "fit_seconds": secs, "kind": "gru", "resample_frames": 16}
    print(f"gru T=16: val macro-F1 {variants['gru_T16']['macro_f1']} ({secs}s)", flush=True)
    for w in (0.3, 0.5, 0.7):
        Pe = w * probs["logreg_T16"] + (1 - w) * probs["gru_T16"]
        variants[f"ensemble_logreg{w}_gru{round(1 - w, 1)}"] = {**block(y_dev, Pe, classes), "kind": "ensemble",
                                                               "weights": {"logreg": w, "gru": round(1 - w, 1)}, "resample_frames": 16}
        print(f"ensemble w_logreg={w}: val macro-F1 {variants[f'ensemble_logreg{w}_gru{round(1 - w, 1)}']['macro_f1']}", flush=True)

    baseline = "logreg_T16"
    best = max(variants, key=lambda k: (variants[k]["macro_f1"], k == baseline))
    gain = variants[best]["macro_f1"] - variants[baseline]["macro_f1"]
    selected = best if gain >= MIN_GAIN else baseline
    print(f"selected on validation: {selected} (gain {gain:+.4f}, required {MIN_GAIN})", flush=True)

    # ---- test: baseline and the selected variant only
    def spec(name):
        v = variants[name]
        fcfg = replace(DEFAULT_FEATURE_CONFIG, resample_frames=v["resample_frames"])
        if v["kind"] == "ensemble":
            return [("logreg", v["weights"]["logreg"]), ("gru", v["weights"]["gru"])], fcfg
        return [(v["kind"], 1.0)], fcfg

    tests = {}
    for name in dict.fromkeys([baseline, selected]):
        kw, fcfg = spec(name)
        r = test_eval(kw, dev, test, fcfg, base_t, classes)
        r.pop("confidence")
        tests[name] = r
        print(f"TEST {name}: acc {r['accuracy']} macro-F1 {r['macro_f1']}", flush=True)

    # validation recall of the known confused / weakest classes
    rec = variants[baseline]["per_class_recall"]
    weakest = sorted(rec, key=rec.get)[:15]
    Path("reports").mkdir(exist_ok=True)
    Path("reports/phase6_baseline.json").write_text(json.dumps({
        "protocol": __doc__.strip().split("Outputs")[0].strip(),
        "dev_samples": len(dev), "test_samples": len(test), "test_groups": sorted(test_groups),
        "baseline_validation": variants[baseline], "baseline_test": tests[baseline],
        "weakest_validation_classes": [{"class": c, "val_recall": rec[c], **quality["classes"][c]} for c in weakest],
        "data_quality": quality}, indent=1), encoding="utf-8")
    Path("reports/phase6_experiments.json").write_text(json.dumps({
        "variants_validation": {k: {kk: vv for kk, vv in v.items() if kk != "per_class_recall"} for k, v in variants.items()},
        "selected_on_validation": selected, "min_gain": MIN_GAIN, "gain": round(gain, 4),
        "test_reported_for": list(tests), "test": {k: {kk: vv for kk, vv in v.items() if kk not in ("per_class", "confusion_matrix")}
                                                   for k, v in tests.items()},
        "runtime_s": round(time.time() - t_start, 1)}, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
