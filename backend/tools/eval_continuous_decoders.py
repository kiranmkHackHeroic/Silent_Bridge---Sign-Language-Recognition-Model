"""Compare sentence decoders of the ACTIVE continuous (ISL-CSLTR) model on identical held-out recordings.

Same trained networks, same deterministic split (app.continuous.train.split_samples):
  greedy_nearest   current: greedy CTC path -> nearest corpus sentence by gloss edit distance
  baseline         closed-set sentence classifier (logistic regression on 32-step landmarks)
  ctc_likelihood   every corpus sentence scored by its full CTC likelihood (all alignments) / #glosses
  fusion           ctc_likelihood + lambda * log P_baseline(sentence), lambda chosen on validation

The decoder is CHOSEN on the validation recording round only; all are REPORTED on the test rounds.
With --apply, a better decoder is written as a NEW continuous model version (same weights, new decoder
setting) and activated; the previous version stays on disk for rollback.

Usage (from backend/):  python tools/eval_continuous_decoders.py [--apply]
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.continuous.dataset import load_samples  # noqa: E402
from app.continuous.model import edit_distance  # noqa: E402
from app.continuous.train import CONT_DIR, nearest_sentence, resample, split_samples  # noqa: E402

LAMBDAS = [0.1, 0.25, 0.5, 1.0, 2.0, 4.0]


def train_only_baseline(train_s, n):
    """Sentence classifier fitted on the TRAINING rounds only (the deployed one also saw the validation
    round, so it cannot be used to make choices on validation)."""
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    x = [resample(s["seq"], n) for s in train_s] + [resample(s["mirror"], n) for s in train_s if s["mirror"] is not None]
    y = [s["sentence_id"] for s in train_s] + [s["sentence_id"] for s in train_s if s["mirror"] is not None]
    return Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression(C=0.5, max_iter=3000))]).fit(np.stack(x), y)


def scores_for(bundle, samples, base=None):
    table, ctc = bundle["table"], bundle["ctc"]
    base = base if base is not None else bundle["baseline"]
    cands = {sid: e["gloss"] for sid, e in table.items()}
    base_classes = [str(c) for c in base.classes_]
    rows = []
    for s in samples:
        ll = ctc.sentence_log_likelihoods(s["seq"], cands)
        pb = base.predict_proba(resample(s["seq"], bundle["resample"]).reshape(1, -1))[0]
        logpb = {sid: float("-inf") for sid in cands}
        for c, p in zip(base_classes, pb):
            logpb[c] = float(np.log(max(p, 1e-12)))
        greedy = ctc.decode(s["seq"])[0]
        rows.append({"ll": ll, "logpb": logpb, "greedy": greedy, "truth": s["sentence_id"], "gloss": s["gloss"]})
    return rows


def decide(row, method, table, normalized, lam=0.0):
    if method == "greedy_nearest":
        return nearest_sentence(row["greedy"], table, normalized)[0]
    if method == "baseline":
        return max(row["logpb"], key=row["logpb"].get)
    if method == "ctc_likelihood":
        return max(row["ll"], key=row["ll"].get)
    if method == "fusion":
        return max(row["ll"], key=lambda sid: row["ll"][sid] + lam * row["logpb"][sid])
    raise ValueError(method)


def metrics(rows, method, table, normalized, lam=0.0):
    pred = [decide(r, method, table, normalized, lam) for r in rows]
    acc = float(np.mean([p == r["truth"] for p, r in zip(pred, rows)]))
    errs = sum(edit_distance(table[p]["gloss"], r["gloss"]) for p, r in zip(pred, rows))
    ref = sum(len(r["gloss"]) for r in rows)
    return {"sentence_accuracy": round(acc, 4), "sentences_correct": int(round(acc * len(rows))),
            "gloss_error_rate_of_chosen_sentence": round(errs / max(1, ref), 4), "videos": len(rows)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    active = json.loads((CONT_DIR / "active.json").read_text(encoding="utf-8"))["version"]
    folder = CONT_DIR / active
    bundle = joblib.load(folder / "continuous_model.joblib")
    table, normalized = bundle["table"], bundle.get("normalized_matcher", False)
    samples = load_samples()
    train_s, val, test, test_groups, val_group = split_samples(samples)
    print(f"active {active}: validation round {val_group} ({len(val)} videos), test rounds {test_groups} ({len(test)} videos)")
    # choices on validation use a classifier that never saw the validation round; test uses the deployed one
    vrows = scores_for(bundle, val, train_only_baseline(train_s, bundle["resample"]))
    trows = scores_for(bundle, test)

    val_res = {m: metrics(vrows, m, table, normalized) for m in ("greedy_nearest", "baseline", "ctc_likelihood")}
    lam_acc = {lam: metrics(vrows, "fusion", table, normalized, lam)["sentence_accuracy"] for lam in LAMBDAS}
    best_lam = max(LAMBDAS, key=lambda l: (lam_acc[l], -l))
    val_res["fusion"] = {**metrics(vrows, "fusion", table, normalized, best_lam), "lambda": best_lam}
    current = bundle.get("decoder") or ("greedy_nearest" if bundle["selected"] == "ctc" else "baseline")
    order = ["greedy_nearest", "baseline", "ctc_likelihood", "fusion"]          # simpler first on ties
    chosen = max(order, key=lambda m: (val_res[m]["sentence_accuracy"], -order.index(m)))
    test_res = {m: metrics(trows, m, table, normalized, best_lam if m == "fusion" else 0.0) for m in order}
    greedy_ger = sum(edit_distance(r["greedy"], r["gloss"]) for r in trows) / max(1, sum(len(r["gloss"]) for r in trows))
    report = {"created": datetime.now(timezone.utc).isoformat(timespec="seconds"), "model_version": active,
              "validation_round": val_group, "test_rounds": test_groups, "current_decoder": current,
              "validation": val_res, "fusion_lambda_validation_accuracy": lam_acc, "chosen_on_validation": chosen,
              "test": test_res, "test_greedy_gloss_error_rate": round(greedy_ger, 4),
              "note": "decoder chosen on the validation round only (classifier for validation fitted on the training "
                      "rounds only); test reported once for every decoder with the deployed networks",
              "audit": "the original training selected the live method by comparing TEST accuracies; this tool "
                       "replaces that with a validation-only choice"}
    for m in order:
        print(f"{m:15s} val acc {val_res[m]['sentence_accuracy']:.3f} | test acc {test_res[m]['sentence_accuracy']:.3f} "
              f"GER {test_res[m]['gloss_error_rate_of_chosen_sentence']:.3f}")
    print("chosen on validation:", chosen, f"(fusion lambda {best_lam})", "| current:", current)
    Path("reports").mkdir(exist_ok=True)
    Path("reports/continuous_decoders.json").write_text(json.dumps(report, indent=1), encoding="utf-8")

    if a.apply and chosen != current and val_res[chosen]["sentence_accuracy"] > val_res[current]["sentence_accuracy"]:
        version = datetime.now(timezone.utc).strftime("c%Y%m%d-%H%M%S")
        new = CONT_DIR / version
        shutil.copytree(folder, new)
        bundle["decoder"] = chosen
        bundle["fusion_lambda"] = best_lam
        joblib.dump(bundle, new / "continuous_model.joblib")
        m = json.loads((new / "metrics.json").read_text(encoding="utf-8"))
        m.update({"version": version, "derived_from": active, "decoder": chosen, "fusion_lambda": best_lam,
                  "decoder_comparison": report, "selected_method": chosen,
                  "selected_test": test_res[chosen]})
        (new / "metrics.json").write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
        (CONT_DIR / "active.json").write_text(json.dumps({"version": version, "previous": active}), encoding="utf-8")
        print(f"activated {version} (decoder {chosen}); previous {active} kept for rollback")
    elif a.apply:
        print("no change: the current decoder is not worse on validation")


if __name__ == "__main__":
    main()
