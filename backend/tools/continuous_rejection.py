"""Sentence mode: when should the fused decoder say "uncertain" instead of a corpus sentence?

The fused decoder (CTC likelihood + lambda * log P_classifier) always picks SOME corpus sentence. Here the
fused scores are turned into a posterior over the corpus sentences (softmax) and an acceptance threshold on
the top posterior is chosen on the VALIDATION round (classifier fitted on training rounds only; max F1 of
accepted sentences, where wrong accepted sentences count against precision). The test rounds are reported
once: coverage, precision of accepted sentences, and per-sentence accuracy.

With --apply the threshold is stored in a NEW continuous version (same networks and decoder); the previous
version stays for rollback.

Usage (from backend/):  python tools/continuous_rejection.py [--apply]
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from app.continuous.dataset import load_samples  # noqa: E402
from app.continuous.train import CONT_DIR, split_samples  # noqa: E402
from eval_continuous_decoders import scores_for, train_only_baseline  # noqa: E402

THRESHOLDS = [round(float(t), 2) for t in np.arange(0.0, 0.96, 0.05)]


def posteriors(rows, lam):
    out = []
    for r in rows:
        ids = list(r["ll"])
        s = np.array([r["ll"][k] + lam * r["logpb"].get(k, -np.inf) for k in ids])
        finite = np.isfinite(s)
        p = np.zeros(len(s))
        if finite.any():
            e = np.exp(s[finite] - s[finite].max())
            p[finite] = e / e.sum()
        order = np.argsort(-p)
        out.append({"truth": r["truth"], "pred": ids[order[0]], "p": float(p[order[0]]),
                    "top3": [(ids[i], round(float(p[i]), 3)) for i in order[:3]]})
    return out


def at(rows, t):
    acc = [r for r in rows if r["p"] >= t]
    correct = sum(r["pred"] == r["truth"] for r in acc)
    prec = correct / len(acc) if acc else 0.0
    rec = correct / len(rows) if rows else 0.0
    return {"threshold": t, "accepted": len(acc), "coverage": round(len(acc) / len(rows), 4), "correct_accepted": correct,
            "wrong_accepted": len(acc) - correct, "precision": round(prec, 4), "recall": round(rec, 4),
            "f1": round(2 * prec * rec / (prec + rec), 4) if prec + rec else 0.0}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    active = json.loads((CONT_DIR / "active.json").read_text(encoding="utf-8"))["version"]
    folder = CONT_DIR / active
    bundle = joblib.load(folder / "continuous_model.joblib")
    if bundle.get("decoder") != "fusion":
        sys.exit(f"active continuous version {active} does not use the fusion decoder")
    lam = float(bundle.get("fusion_lambda", 1.0))
    train_s, val, test, test_groups, val_group = split_samples(load_samples())
    vrows = posteriors(scores_for(bundle, val, train_only_baseline(train_s, bundle["resample"])), lam)
    trows = posteriors(scores_for(bundle, test), lam)
    val_curve = [at(vrows, t) for t in THRESHOLDS]
    chosen = max(val_curve, key=lambda c: (c["f1"], -c["threshold"]))["threshold"]
    test_at = at(trows, chosen)
    test_none = at(trows, 0.0)
    per_sentence = defaultdict(lambda: [0, 0])
    table = bundle["table"]
    for r in trows:
        per_sentence[r["truth"]][0] += r["pred"] == r["truth"]
        per_sentence[r["truth"]][1] += 1
    per_sentence_out = sorted(({"sentence": table[k]["sentence"], "correct": c, "videos": n}
                               for k, (c, n) in per_sentence.items()), key=lambda d: (-d["correct"] / d["videos"], d["sentence"]))
    report = {"model_version": active, "validation_round": val_group, "test_rounds": test_groups, "fusion_lambda": lam,
              "chosen_threshold_on_validation": chosen, "validation_curve": val_curve,
              "test_without_rejection": test_none, "test_at_chosen_threshold": test_at,
              "test_sentences_always_correct": sum(1 for d in per_sentence_out if d["correct"] == d["videos"]),
              "test_sentences_never_correct": sum(1 for d in per_sentence_out if d["correct"] == 0),
              "test_distinct_sentences": len(per_sentence_out), "per_sentence_test": per_sentence_out}
    print(f"threshold chosen on validation: {chosen}")
    print("test without rejection:", test_none)
    print("test at threshold     :", test_at)
    Path("reports").mkdir(exist_ok=True)
    Path("reports/continuous_rejection.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    if a.apply and chosen > 0:
        version = datetime.now(timezone.utc).strftime("c%Y%m%d-%H%M%S")
        new = CONT_DIR / version
        shutil.copytree(folder, new)
        bundle["accept_threshold"] = chosen
        joblib.dump(bundle, new / "continuous_model.joblib")
        m = json.loads((new / "metrics.json").read_text(encoding="utf-8"))
        m.update({"version": version, "derived_from": active, "accept_threshold": chosen, "rejection": {
            k: report[k] for k in ("chosen_threshold_on_validation", "test_without_rejection", "test_at_chosen_threshold")}})
        (new / "metrics.json").write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
        (CONT_DIR / "active.json").write_text(json.dumps({"version": version, "previous": active}), encoding="utf-8")
        print(f"activated {version}; previous {active} kept for rollback")


if __name__ == "__main__":
    main()
