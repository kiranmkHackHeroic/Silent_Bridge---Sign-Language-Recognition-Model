"""Phase 11: train a CANDIDATE ISL-CSLTR sentence model on cleaned + extended data and compare it with the
production model on the SAME 154 held-out test videos. Production is never modified by this tool.

Data (ISL only): ISL-CSLTR samples minus the integrity exclusions (duplicate / conflicting-label videos), plus the
195 spreadsheet-unlisted videos (tools/import_csltr_unlisted.py).
Split: identical rounds to production: test = rec4 + rec5 (must be exactly the production test set),
validation = rec2, training = the remaining rounds. No test video is used for fitting, normalisation statistics,
early stopping, decoder settings or thresholds.

Pre-registered promotion rule (fixed before any result was seen):
  on the 154 test videos with IDENTICAL decoding (fusion lambda 1.0, acceptance posterior 0.5, as production):
  (1) sentence accuracy (no rejection) improves by >= 3 percentage points, (2) paired exact McNemar p < 0.10,
  (3) precision of shown (accepted) sentences does not drop, (4) no leakage finding, (5) all regression tests pass,
  (6) robustness: the mean accuracy gain over training seeds 42, 7 and 123 is also >= 3 points.
  Only the seed-42 candidate would be deployed. Otherwise production stays.

Usage (from backend/):  python tools/train_continuous_candidate.py [--seeds 42 7 123]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from math import comb
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.continuous.dataset import CONTINUOUS_DIR, SEQ_DIM, load_samples  # noqa: E402
from app.continuous.model import CTCGlossRecognizer, edit_distance  # noqa: E402
from app.continuous.train import CONT_DIR, RESAMPLE, resample  # noqa: E402

TEST_ROUNDS, VAL_ROUND = ("rec4", "rec5"), "rec2"
LAMBDA, ACCEPT = 1.0, 0.5            # production decoding settings, used identically for both models


def mcnemar_exact(b: int, c: int) -> float:
    n = b + c
    if n == 0:
        return 1.0
    return min(1.0, 2 * sum(comb(n, i) for i in range(min(b, c) + 1)) / 2 ** n)


def decode(bundle, seq, lam=LAMBDA):
    table = bundle["table"]
    cands = {k: e["gloss"] for k, e in table.items()}
    t0 = time.perf_counter()
    ll = bundle["ctc"].sentence_log_likelihoods(seq, cands)
    probs = bundle["baseline"].predict_proba(resample(seq, bundle["resample"]).reshape(1, -1))[0]
    lp = dict(zip([str(c) for c in bundle["baseline"].classes_], np.log(np.maximum(probs, 1e-12))))
    ids = list(ll)
    score = np.array([ll[k] + lam * lp.get(k, float("-inf")) for k in ids])
    fin = np.isfinite(score)
    post = np.zeros(len(ids))
    if fin.any():
        e = np.exp(score[fin] - score[fin].max())
        post[fin] = e / e.sum()
    best = ids[int(np.argmax(post))]
    greedy = bundle["ctc"].decode(seq)[0]
    return {"pred": best, "posterior": float(post.max()), "greedy": greedy, "ms": (time.perf_counter() - t0) * 1000}


def evaluate(bundle, test):
    rows = [{"sample_id": s["sample_id"], "group": s["group"], "truth": s["sentence_id"], "gloss": s["gloss"],
             **decode(bundle, s["seq"])} for s in test]
    table = bundle["table"]
    n = len(rows)
    correct = [r["pred"] == r["truth"] for r in rows]
    shown = [r["posterior"] >= ACCEPT for r in rows]
    ref = sum(len(r["gloss"]) for r in rows)
    per_round = {}
    for g in sorted({r["group"] for r in rows}):
        rr = [r for r in rows if r["group"] == g]
        per_round[g] = {"videos": len(rr), "sentence_accuracy": round(float(np.mean([r["pred"] == r["truth"] for r in rr])), 4),
                        "shown": int(sum(r["posterior"] >= ACCEPT for r in rr)),
                        "correct_and_shown": int(sum(r["pred"] == r["truth"] and r["posterior"] >= ACCEPT for r in rr))}
    cs = sum(c and s for c, s in zip(correct, shown))
    return rows, {
        "videos": n, "sentence_accuracy": round(float(np.mean(correct)), 4), "sentences_correct": int(sum(correct)),
        "shown": int(sum(shown)), "correct_and_shown": int(cs), "wrong_shown": int(sum(shown) - cs),
        "precision_of_shown": round(cs / max(1, sum(shown)), 4),
        "gloss_error_rate_chosen_sentence": round(sum(edit_distance(table[r["pred"]]["gloss"], r["gloss"]) for r in rows) / ref, 4),
        "gloss_error_rate_ctc_greedy": round(sum(edit_distance(r["greedy"], r["gloss"]) for r in rows) / ref, 4),
        "latency_ms_per_sentence": {"mean": round(float(np.mean([r["ms"] for r in rows])), 1),
                                    "p95": round(float(np.percentile([r["ms"] for r in rows], 95)), 1)},
        "per_round": per_round,
    }


def fit_candidate(train_s, val, vocab, seed):
    xb = np.stack([resample(s["seq"]) for s in train_s + val] + [resample(s["mirror"]) for s in train_s + val if s["mirror"] is not None])
    yb = [s["sentence_id"] for s in train_s + val] + [s["sentence_id"] for s in train_s + val if s["mirror"] is not None]
    base = Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression(C=0.5, max_iter=3000))]).fit(xb, yb)
    ctc = CTCGlossRecognizer(vocab, SEQ_DIM, seed=seed)
    ctc.fit(train_s, val)
    return base, ctc


def leakage(train_s, val, test):
    """Ids, source-file hashes and near-identical landmark sequences shared between test and training/validation."""
    def h(sid):
        f = files.get(sid)
        return hashlib.md5(Path(f).read_bytes()).hexdigest() if f and Path(f).exists() else None
    files = {}
    for f in (CONTINUOUS_DIR / "isl_csltr").glob("*/*.json"):
        d = json.loads(f.read_text(encoding="utf-8"))
        files[d["sample_id"]] = d.get("source_file")
    fit_ids = {s["sample_id"] for s in train_s + val}
    test_ids = {s["sample_id"] for s in test}
    fit_hashes = {h(s) for s in fit_ids} - {None}
    test_hash_overlap = sum(h(s) in fit_hashes for s in test_ids)
    def vec(s):
        v = resample(s["seq"], 32)
        v = v - v.mean()
        return v / (np.linalg.norm(v) + 1e-9)
    A = np.stack([vec(s) for s in test])
    B = np.stack([vec(s) for s in train_s + val])
    sim = A @ B.T
    near = int(np.sum(sim.max(1) > 0.995))
    return {"shared_sample_ids": len(fit_ids & test_ids), "test_videos_with_identical_file_in_fit": int(test_hash_overlap),
            "test_videos_with_near_identical_landmarks_in_fit(cos>0.995)": near,
            "max_test_to_fit_similarity": round(float(sim.max()), 4)}


def _listed_ids() -> set[str]:
    """Sample ids of videos from the ORIGINAL (spreadsheet-listed) ISL-CSLTR import."""
    out = set()
    for f in (CONTINUOUS_DIR / "isl_csltr").glob("*/*.json"):
        d = json.loads(f.read_text(encoding="utf-8"))
        if "provenance" not in d.get("meta", {}):
            out.add(d["sample_id"])
    return out


def balance(samples):
    c = Counter(s["sentence_id"] for s in samples)
    v = list(c.values())
    return {"sentences": len(c), "videos": len(samples), "min": min(v), "median": float(np.median(v)), "max": max(v)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, nargs="+", default=[42, 7, 123])
    a = ap.parse_args()
    t_start = time.time()
    prod_version = json.loads((CONT_DIR / "active.json").read_text(encoding="utf-8"))["version"]
    prod = joblib.load(CONT_DIR / prod_version / "continuous_model.joblib")

    all_samples = load_samples(apply_exclusions=False, include_unlisted=True)
    samples = load_samples(include_unlisted=True)               # integrity exclusions applied
    listed_ids = _listed_ids()
    # pre-registered label sanity check for the unlisted videos: a signed-sequence length far from the listed
    # videos of the same sentence (outside 1/3x .. 3x their median) suggests a mislabelled or truncated clip
    med = defaultdict(list)
    for s in samples:
        if s["sample_id"] in listed_ids:
            med[s["sentence_id"]].append(len(s["seq"]))
    label_flags = []
    for s in samples:
        if s["sample_id"] not in listed_ids and med[s["sentence_id"]]:
            ratio = len(s["seq"]) / float(np.median(med[s["sentence_id"]]))
            if not 1 / 3 <= ratio <= 3:
                label_flags.append({"sample_id": s["sample_id"], "sentence_id": s["sentence_id"], "length_ratio": round(ratio, 2)})
    flagged = {f["sample_id"] for f in label_flags}
    samples = [s for s in samples if s["sample_id"] not in flagged]
    test = [s for s in samples if s["group"] in TEST_ROUNDS]
    val = [s for s in samples if s["group"] == VAL_ROUND]
    train_s = [s for s in samples if s["group"] not in TEST_ROUNDS and s["group"] != VAL_ROUND]
    # the test set must be EXACTLY production's: the 154 original videos of rounds rec4/rec5
    orig = [s for s in all_samples if s["sample_id"] in listed_ids and s["group"] in TEST_ROUNDS]
    assert sorted(s["sample_id"] for s in test) == sorted(s["sample_id"] for s in orig) and len(test) == 154, \
        "test set differs from production's"
    # identical output vocabulary and sentence table as production. A gloss whose only video was excluded by the
    # integrity audit (NO: the single "No need to worry dont worry" video is a conflicting-label duplicate) keeps
    # its output unit but has no clean training example.
    vocab = list(prod["vocab"])
    assert {g for s in samples for g in s["gloss"]} <= set(vocab), "a training gloss is outside production's vocabulary"
    no_clean_example = sorted(set(vocab) - {g for s in train_s + val for g in s["gloss"]})

    old_train = [s for s in all_samples
                 if s["sample_id"] in listed_ids and s["group"] not in TEST_ROUNDS and s["group"] != VAL_ROUND]
    unlisted = sum(1 for s in samples if s["sample_id"] not in listed_ids)
    print(f"production {prod_version}; train {len(train_s)} (was {len(old_train)}), val {len(val)}, test {len(test)}; "
          f"unlisted videos available {unlisted}", flush=True)
    leak = leakage(train_s, val, test)
    print("leakage:", leak, flush=True)

    prod_rows, prod_m = evaluate(prod, test)
    print("production:", {k: prod_m[k] for k in ("sentence_accuracy", "shown", "correct_and_shown", "precision_of_shown")}, flush=True)
    runs = {}
    for seed in a.seeds:
        base, ctc = fit_candidate(train_s, val, vocab, seed)
        # same bundle layout and decoding metadata as production; only the two fitted models differ
        bundle = {**{k: v for k, v in prod.items() if k not in ("ctc", "baseline")}, "ctc": ctc, "baseline": base}
        assert bundle["decoder"] == "fusion" and bundle["fusion_lambda"] == LAMBDA and bundle["accept_threshold"] == ACCEPT
        rows, m = evaluate(bundle, test)
        runs[seed] = {"bundle": bundle, "rows": rows, "metrics": m, "epochs": len(ctc.history_)}
        print(f"candidate seed {seed}:", {k: m[k] for k in ("sentence_accuracy", "shown", "correct_and_shown", "precision_of_shown")},
              flush=True)

    main_seed = a.seeds[0]
    cand_rows, cand_m = runs[main_seed]["rows"], runs[main_seed]["metrics"]
    pc = {r["sample_id"]: r["pred"] == r["truth"] for r in prod_rows}
    cc = {r["sample_id"]: r["pred"] == r["truth"] for r in cand_rows}
    only_prod = sum(pc[k] and not cc[k] for k in pc)
    only_cand = sum(cc[k] and not pc[k] for k in pc)
    p = mcnemar_exact(only_prod, only_cand)
    gain = cand_m["sentence_accuracy"] - prod_m["sentence_accuracy"]
    mean_gain = float(np.mean([r["metrics"]["sentence_accuracy"] for r in runs.values()])) - prod_m["sentence_accuracy"]
    no_leak = (leak["shared_sample_ids"] == 0 and leak["test_videos_with_identical_file_in_fit"] == 0
               and leak["test_videos_with_near_identical_landmarks_in_fit(cos>0.995)"] == 0)
    gates = {"accuracy_gain_>=_3pp": gain >= 0.03, "mcnemar_p_<_0.10": p < 0.10,
             "precision_of_shown_not_lower": cand_m["precision_of_shown"] >= prod_m["precision_of_shown"],
             "no_leakage": no_leak, "mean_gain_over_seeds_>=_3pp": mean_gain >= 0.03}
    eligible = all(gates.values())

    version = datetime.now(timezone.utc).strftime("c%Y%m%d-%H%M%S") + "-candidate"
    folder = CONT_DIR / version
    folder.mkdir(parents=True)
    joblib.dump(runs[main_seed]["bundle"], folder / "continuous_model.joblib")
    failures = [{"truth": prod["table"][r["truth"]]["sentence"], "candidate": prod["table"][r["pred"]]["sentence"],
                 "posterior": round(r["posterior"], 3), "greedy_glosses": " ".join(r["greedy"]), "round": r["group"]}
                for r in cand_rows if r["pred"] != r["truth"]][:15]
    report = {
        "created": datetime.now(timezone.utc).isoformat(timespec="seconds"), "version": version, "candidate": True,
        "production_version": prod_version, "data": {
            "train_videos": len(train_s), "train_videos_before": len(old_train), "val_videos": len(val), "test_videos": len(test),
            "unlisted_added": unlisted, "excluded_by_integrity_audit": 9, "unlisted_excluded_by_length_check": label_flags,
            "train_balance_before": balance(old_train), "train_balance_after": balance(train_s),
            "glosses_without_clean_training_example": no_clean_example,
            "test_sentences_without_training_example_before": len({s["sentence_id"] for s in test} - {s["sentence_id"] for s in old_train}),
            "test_sentences_without_training_example_after": len({s["sentence_id"] for s in test} - {s["sentence_id"] for s in train_s}),
        },
        "leakage": leak, "decoding": {"fusion_lambda": LAMBDA, "accept_threshold": ACCEPT, "identical_for_both": True},
        "production": prod_m, "candidate": cand_m,
        "seeds": {str(k): {"sentence_accuracy": v["metrics"]["sentence_accuracy"], "correct_and_shown": v["metrics"]["correct_and_shown"],
                           "precision_of_shown": v["metrics"]["precision_of_shown"], "epochs": v["epochs"]} for k, v in runs.items()},
        "paired": {"only_production_right": only_prod, "only_candidate_right": only_cand, "mcnemar_exact_p": round(p, 4)},
        "accuracy_gain": round(gain, 4), "mean_gain_over_seeds": round(mean_gain, 4),
        "gates": gates, "eligible_for_promotion": eligible, "failure_examples": failures,
        "note": "ISL-CSLTR has no signer IDs: rounds are recording indices, so signer independence is not guaranteed",
        "runtime_s": round(time.time() - t_start, 1),
    }
    (folder / "metrics.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("accuracy_gain", "mean_gain_over_seeds", "paired", "gates", "eligible_for_promotion")}, indent=1))
    print("candidate saved (NOT activated):", folder)


if __name__ == "__main__":
    main()
