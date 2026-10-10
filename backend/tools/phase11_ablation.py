"""Phase 11 DIAGNOSTIC ablation (not used for any promotion decision; the pre-registered gate in
train_continuous_candidate.py decides). Explains the candidate result by retraining with the production recipe on:
  original : the 492 spreadsheet-listed videos exactly as production was trained (no exclusions, no unlisted videos)
  cleaned  : listed videos minus the 9 integrity exclusions (no unlisted videos)
  extended_listedval : cleaned + unlisted videos in TRAINING rounds only; validation = listed rec2 only
and reports test accuracy on the same 154 videos with identical decoding. Nothing is saved as a model.

Usage (from backend/):  python tools/phase11_ablation.py --runs original:42 original:7 original:123 cleaned:42
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import train_continuous_candidate as t  # noqa: E402
from app.continuous.dataset import load_samples  # noqa: E402
from app.continuous.train import CONT_DIR  # noqa: E402

REPORT = Path(__file__).resolve().parent.parent / "reports" / "phase11_ablation.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", nargs="+", default=["original:42", "original:7", "original:123", "cleaned:42"])
    ap.add_argument("--report", type=Path, default=REPORT, help="separate file per parallel process")
    a = ap.parse_args()
    report = a.report
    prod_version = json.loads((CONT_DIR / "active.json").read_text(encoding="utf-8"))["version"]
    prod = joblib.load(CONT_DIR / prod_version / "continuous_model.joblib")
    listed = t._listed_ids()
    cleaned_all = load_samples(include_unlisted=True)
    flagged = {f["sample_id"] for p in CONT_DIR.glob("*-candidate/metrics.json")
               for f in json.loads(p.read_text(encoding="utf-8"))["data"]["unlisted_excluded_by_length_check"]}
    data = {"original": [s for s in load_samples(apply_exclusions=False) if s["sample_id"] in listed],
            "cleaned": [s for s in cleaned_all if s["sample_id"] in listed],
            "extended_listedval": [s for s in cleaned_all if s["sample_id"] not in flagged
                                   and (s["sample_id"] in listed or s["group"] != t.VAL_ROUND)]}
    out = json.loads(report.read_text(encoding="utf-8")) if report.exists() else {}
    for run in a.runs:
        name, seed = run.split(":")
        samples = data[name]
        test = [s for s in samples if s["group"] in t.TEST_ROUNDS]
        val = [s for s in samples if s["group"] == t.VAL_ROUND]
        train_s = [s for s in samples if s["group"] not in t.TEST_ROUNDS and s["group"] != t.VAL_ROUND]
        assert len(test) == 154
        base, ctc = t.fit_candidate(train_s, val, list(prod["vocab"]), int(seed))
        bundle = {**{k: v for k, v in prod.items() if k not in ("ctc", "baseline")}, "ctc": ctc, "baseline": base}
        _, m = t.evaluate(bundle, test)
        out[run] = {"train": len(train_s), "val": len(val), "epochs": len(ctc.history_),
                    **{k: m[k] for k in ("sentence_accuracy", "sentences_correct", "shown", "correct_and_shown",
                                         "precision_of_shown", "gloss_error_rate_chosen_sentence", "gloss_error_rate_ctc_greedy",
                                         "per_round")}}
        print(run, json.dumps(out[run]), flush=True)
        report.write_text(json.dumps({"production_version": prod_version, "diagnostic_only": True, **out}, indent=1),
                          encoding="utf-8")


if __name__ == "__main__":
    main()
