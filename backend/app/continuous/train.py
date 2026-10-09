"""Train + evaluate the continuous (sentence-level) ISL-CSLTR models.

Usage (from backend/):  python -m app.continuous.train

Protocol: recordings are split by recording index (whole groups), so no video
of the test group is seen in training. Two methods are compared on the same
held-out recordings:
  * baseline  - closed-set sentence classifier (sequence resampled to 32 steps +
                logistic regression) -> its sentence's gloss sequence
  * ctc       - BiGRU + CTC gloss recognizer, early-stopped on a validation
                recording group, greedy decoding; nearest corpus sentence by
                gloss edit distance
Metrics: gloss error rate (GER = gloss edit distance / reference glosses, the
sign-language analogue of WER) and sentence accuracy (closed set of the
corpus' sentences). Both methods only know sentences/glosses that occur in the
corpus: this is NOT open-vocabulary sign language translation.
"""
from __future__ import annotations

import json
import time
from collections import Counter
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ..config import MODELS_DIR
from .dataset import SEQ_DIM, load_mapping, load_samples
from .model import CTCGlossRecognizer, edit_distance

CONT_DIR = MODELS_DIR / "continuous"
RESAMPLE = 32


def resample(seq: np.ndarray, n: int = RESAMPLE) -> np.ndarray:
    idx = np.linspace(0, len(seq) - 1, n)
    lo = np.floor(idx).astype(int)
    hi = np.minimum(lo + 1, len(seq) - 1)
    w = (idx - lo)[:, None]
    return ((1 - w) * seq[lo] + w * seq[hi]).reshape(-1)


def nearest_sentence(glosses: list[str], table: dict, normalized: bool = False) -> tuple[str, int]:
    """Closest corpus sentence by gloss edit distance. normalized=True divides by the longer
    sequence length, which removes the bias towards very short sentences."""
    def cost(kv):
        d = edit_distance(glosses, kv[1]["gloss"])
        return (d / max(len(glosses), len(kv[1]["gloss"]), 1), d) if normalized else (d, len(kv[1]["gloss"]))
    best = min(table.items(), key=cost)
    return best[0], edit_distance(glosses, best[1]["gloss"])


def split_samples(samples: list[dict]):
    """Deterministic split by recording index: ~20% test groups, one validation group."""
    groups = Counter(s["group"] for s in samples)
    rng = np.random.default_rng(42)
    order = [g for g in rng.permutation(sorted(groups))]
    test_groups, n = [], 0
    for g in order:
        if n >= 0.2 * len(samples):
            break
        test_groups.append(g)
        n += groups[g]
    rest = [g for g in order if g not in test_groups]
    # validation (early stopping + matcher choice) = the SMALLEST remaining round with >= 20 videos,
    # so most non-test recordings are available for training
    candidates = [g for g in rest if groups[g] >= 20] or rest
    val_group = min(candidates, key=lambda g: groups[g])
    test = [s for s in samples if s["group"] in test_groups]
    val = [s for s in samples if s["group"] == val_group]
    train_s = [s for s in samples if s["group"] not in test_groups and s["group"] != val_group]
    return train_s, val, test, test_groups, val_group


def evaluate(pred_glosses: list[list[str]], pred_sids: list[str], samples: list[dict]) -> dict:
    errs = sum(edit_distance(p, s["gloss"]) for p, s in zip(pred_glosses, samples))
    ref = sum(len(s["gloss"]) for s in samples)
    correct = sum(p == s["sentence_id"] for p, s in zip(pred_sids, samples))
    return {"gloss_error_rate": round(errs / max(1, ref), 4), "sentence_accuracy": round(correct / max(1, len(samples)), 4),
            "sentences_correct": int(correct), "test_videos": len(samples), "reference_glosses": int(ref)}


def train(progress=None) -> dict:
    progress = progress or (lambda s, f: print(f"[{datetime.now():%H:%M:%S}] {s}", flush=True))
    t0 = time.time()
    mapping = load_mapping()
    table = mapping["sentences"]
    progress("Loading sentence landmark sequences", 0.0)
    samples = load_samples()
    if len(samples) < 20:
        raise RuntimeError(f"only {len(samples)} usable sentence videos - import ISL-CSLTR first")
    train_s, val, test, test_groups, val_group = split_samples(samples)
    train_sentences = {s["sentence_id"] for s in train_s}
    unseen_test = sum(1 for s in test if s["sentence_id"] not in train_sentences)

    # ---- baseline: closed-set sentence classifier
    progress("Training baseline sentence classifier", 0.05)
    xb = np.stack([resample(s["seq"]) for s in train_s + val] + [resample(s["mirror"]) for s in train_s + val if s["mirror"] is not None])
    yb = [s["sentence_id"] for s in train_s + val] + [s["sentence_id"] for s in train_s + val if s["mirror"] is not None]
    base = Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression(C=0.5, max_iter=3000))]).fit(xb, yb)
    b_sids = list(base.predict(np.stack([resample(s["seq"]) for s in test])))
    baseline = evaluate([table[sid]["gloss"] for sid in b_sids], b_sids, test)

    # ---- CTC
    vocab = sorted({g for s in samples for g in s["gloss"]})
    ctc = CTCGlossRecognizer(vocab, SEQ_DIM)
    ctc.fit(train_s, val, progress=lambda m, f: progress(m, 0.1 + 0.8 * f))
    # choose the sentence matcher on the VALIDATION recordings (never on test)
    val_decoded = [ctc.decode(s["seq"])[0] for s in val]
    matcher_acc = {norm: float(np.mean([nearest_sentence(g, table, norm)[0] == s["sentence_id"]
                                        for g, s in zip(val_decoded, val)])) for norm in (False, True)}
    normalized = matcher_acc[True] > matcher_acc[False]
    decoded = [ctc.decode(s["seq"])[0] for s in test]
    c_sids = [nearest_sentence(g, table, normalized)[0] for g in decoded]
    ctc_metrics = evaluate(decoded, c_sids, test)
    lat = []
    for s in test[:20]:
        t = time.perf_counter()
        ctc.decode(s["seq"])
        lat.append((time.perf_counter() - t) * 1000)

    examples = [{"reference": " ".join(s["gloss"]), "decoded": " ".join(d), "sentence": s["transcript"],
                 "nearest_sentence": table[sid]["sentence"], "correct": sid == s["sentence_id"]}
                for s, d, sid in list(zip(test, decoded, c_sids))[:12]]
    now = datetime.now(timezone.utc)
    version = now.strftime("c%Y%m%d-%H%M%S")
    selected = "ctc" if ctc_metrics["sentence_accuracy"] >= baseline["sentence_accuracy"] else "baseline"
    metrics = {
        "version": version, "trained_at": now.isoformat(timespec="seconds"), "task": "continuous",
        "dataset": "ISL-CSLTR (Elakkiya & Natarajan 2021, CC BY 4.0)",
        "videos": len(samples), "train_videos": len(train_s), "val_videos": len(val), "test_videos": len(test),
        "sentences": len({s["sentence_id"] for s in samples}), "gloss_vocabulary": len(vocab),
        "test_groups": test_groups, "val_group": val_group, "test_videos_with_unseen_sentence": unseen_test,
        "split": "by recording index (whole recording rounds held out); signer identity is not annotated",
        "baseline": {**baseline, "method": "closed-set sentence classifier: 32-step resampled landmarks + logistic regression"},
        "matcher": {"normalized_edit_distance": normalized,
                    "validation_sentence_accuracy": {"raw": round(matcher_acc[False], 4), "normalized": round(matcher_acc[True], 4)}},
        "ctc": {**ctc_metrics, "method": "BiGRU (2x128, bidirectional) + CTC, greedy decoding; nearest corpus sentence "
                                         f"({'length-normalized' if normalized else 'raw'} gloss edit distance, chosen on validation)",
                "epochs_trained": len(ctc.history_), "decode_latency_ms": round(float(np.mean(lat)), 2) if lat else None},
        "selected_method": selected,
        "examples": examples, "training_seconds": round(time.time() - t0, 1),
        "limitations": "Closed domain: only the corpus' ~100 sentences / 168 glosses. 116 glosses occur in a single "
                       "sentence, so generalisation to new sentences is not expected. Recording groups are inferred "
                       "from file names (no signer ids). Kannada sentences are draft translations.",
    }
    folder = CONT_DIR / version
    folder.mkdir(parents=True, exist_ok=True)
    joblib.dump({"ctc": ctc, "baseline": base, "table": table, "vocab": vocab, "selected": selected,
                 "normalized_matcher": normalized,
                 "resample": RESAMPLE, "seq_dim": SEQ_DIM}, folder / "continuous_model.joblib")
    (folder / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=1), encoding="utf-8")
    (folder / "history.json").write_text(json.dumps(ctc.history_), encoding="utf-8")
    (CONT_DIR / "active.json").write_text(json.dumps({"version": version}), encoding="utf-8")
    progress("Done", 1.0)
    return metrics


def main():
    m = train()
    print(json.dumps({k: m[k] for k in ("version", "videos", "test_videos", "sentences", "gloss_vocabulary",
                                        "baseline", "ctc", "selected_method", "test_groups")}, indent=1, ensure_ascii=False))
    for e in m["examples"][:6]:
        print(e)


if __name__ == "__main__":
    main()


def reevaluate(version: str | None = None) -> dict:
    """Re-score a saved model on its deterministic test split (no retraining); the sentence matcher
    is (re)chosen on the validation recordings only."""
    folder = CONT_DIR / (version or json.loads((CONT_DIR / "active.json").read_text(encoding="utf-8"))["version"])
    bundle = joblib.load(folder / "continuous_model.joblib")
    metrics = json.loads((folder / "metrics.json").read_text(encoding="utf-8"))
    table, ctc = bundle["table"], bundle["ctc"]
    samples = load_samples()
    _, val, test, _, _ = split_samples(samples)
    val_decoded = [ctc.decode(s["seq"])[0] for s in val]
    matcher_acc = {norm: float(np.mean([nearest_sentence(g, table, norm)[0] == s["sentence_id"]
                                        for g, s in zip(val_decoded, val)])) for norm in (False, True)}
    normalized = matcher_acc[True] > matcher_acc[False]
    decoded = [ctc.decode(s["seq"])[0] for s in test]
    c_sids = [nearest_sentence(g, table, normalized)[0] for g in decoded]
    ctc_metrics = evaluate(decoded, c_sids, test)
    metrics["matcher"] = {"normalized_edit_distance": normalized, "validation_sentence_accuracy":
                          {"raw": round(matcher_acc[False], 4), "normalized": round(matcher_acc[True], 4)}}
    metrics["ctc"].update(ctc_metrics)
    metrics["ctc"]["method"] = ("BiGRU (2x128, bidirectional) + CTC, greedy decoding; nearest corpus sentence "
                                f"({'length-normalized' if normalized else 'raw'} gloss edit distance, chosen on validation)")
    metrics["selected_method"] = "ctc" if ctc_metrics["sentence_accuracy"] >= metrics["baseline"]["sentence_accuracy"] else "baseline"
    metrics["examples"] = [{"reference": " ".join(s["gloss"]), "decoded": " ".join(d), "sentence": s["transcript"],
                            "nearest_sentence": table[sid]["sentence"], "correct": sid == s["sentence_id"]}
                           for s, d, sid in list(zip(test, decoded, c_sids))[:12]]
    bundle["normalized_matcher"] = normalized
    bundle["selected"] = metrics["selected_method"]
    joblib.dump(bundle, folder / "continuous_model.joblib")
    (folder / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=1), encoding="utf-8")
    return metrics
