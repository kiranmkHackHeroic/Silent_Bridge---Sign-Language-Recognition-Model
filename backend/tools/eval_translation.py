"""Direct gloss->Kannada baseline vs the English-intermediate (phrase-level) pipeline, on identical
held-out recordings.

For every phrase in the phrase table whose signs the model knows, sign streams are built from REAL
held-out test recordings (signers/sessions never used to train the evaluation model; a short hands-down
pause between signs) and fed frame by frame through the live RecognitionSession. The recognised labels
are then translated by:
  direct    each sign's Kannada gloss word, in signing order (no sequence-level meaning)
  semantic  gloss sequence -> English meaning -> Kannada sentence (app.translation.semantic)
and scored against the phrase's Kannada reference (any reading counts for ambiguous sequences):
exact match (punctuation-insensitive) and chrF (character n-gram F-score, n=1..6, beta=2).

"oracle" rows use the TRUE sign labels (perfect recognition) to separate translation from recognition.
CAVEAT: the references are the phrase table's own Kannada sentences (AI-assisted drafts, not yet
reviewed by a native speaker), so the oracle semantic score is 100% by construction; the comparison
shows what sequence-level translation adds over word-by-word glossing, not absolute Kannada quality.

Usage (from backend/):  python tools/eval_translation.py [--trials 4]
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from app.config import DEFAULT_FEATURE_CONFIG, LABELS_FILE, NONE_LABEL, TrainingConfig  # noqa: E402
from app.recognition.predictor import SignPredictor  # noqa: E402
from app.training.registry import active_paths  # noqa: E402
from app.training.train_model import (choose_test_groups, default_stores, edit_counts, fit_model,  # noqa: E402
                                      known_labels_from, load_valid_samples)
from app.translation.kannada_mapping import KannadaSignMapper, Vocabulary, normalize_kannada  # noqa: E402
from app.translation.semantic import SemanticTranslator  # noqa: E402
from eval_segmentation import run_stream  # noqa: E402


def chrf(hyp: str, ref: str, n_max: int = 6, beta: float = 2.0) -> float:
    hyp, ref = normalize_kannada(hyp).replace(" ", ""), normalize_kannada(ref).replace(" ", "")
    ps, rs = [], []
    for n in range(1, n_max + 1):
        h = Counter(hyp[i:i + n] for i in range(len(hyp) - n + 1))
        r = Counter(ref[i:i + n] for i in range(len(ref) - n + 1))
        if not h or not r:
            continue
        overlap = sum((h & r).values())
        ps.append(overlap / sum(h.values()))
        rs.append(overlap / sum(r.values()))
    if not ps:
        return 0.0
    p, r = float(np.mean(ps)), float(np.mean(rs))
    return 0.0 if p + r == 0 else (1 + beta ** 2) * p * r / (beta ** 2 * p + r)


def score(hyp: str, refs: list[str]) -> tuple[bool, float]:
    exact = any(normalize_kannada(hyp) == normalize_kannada(r) for r in refs)
    return exact, max(chrf(hyp, r) for r in refs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=4)
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    tcfg = TrainingConfig(candidate_models=["logreg"])
    vocab, mapper = Vocabulary(LABELS_FILE), KannadaSignMapper()
    samples, _ = load_valid_samples(default_stores(tcfg.sources), known_labels_from(), DEFAULT_FEATURE_CONFIG, True)
    test_groups = choose_test_groups(samples, tcfg.test_fraction, tcfg.random_seed)
    dev = [s for s in samples if s.group not in test_groups]
    test = [s for s in samples if s.group in test_groups]
    rng = np.random.default_rng(a.seed)
    model = fit_model("logreg", dev, DEFAULT_FEATURE_CONFIG, tcfg, rng)
    pred = SignPredictor()
    pred.model, pred.classes = model, [str(c) for c in model.classes_]
    threshold = float((json.loads(active_paths()[1].read_text(encoding="utf-8")).get("calibration") or {}).get("threshold", 0.45))
    tr = SemanticTranslator(vocab, mapper, pred.classes)

    by_label: dict[str, list] = {}
    for s in test:
        by_label.setdefault(s.label, []).append(s)
    phrases = []
    for signs, cands in tr.by_signs.items():
        if all(sid in pred.classes and sid in by_label for sid in signs):
            phrases.append((signs, [c.kannada for c in cands], cands[0]))

    from app.config import RecognitionSettings
    rows = []
    for signs, refs, main_ph in phrases:
        for _ in range(a.trials):
            stream = [by_label[sid][int(rng.integers(len(by_label[sid])))] for sid in signs]
            truth, emitted, _ = run_stream(pred, vocab, RecognitionSettings(confidence_threshold=threshold), stream, "pause")
            row = {"signs": list(signs), "english": main_ph.english, "references": refs, "recognised": emitted,
                   "signs_correct": emitted == list(signs)}
            for name, labels in (("recognised", emitted), ("oracle", list(signs))):
                d, sem = tr.direct_kannada(labels), tr.translate(labels)
                row[f"{name}_direct"], row[f"{name}_semantic"] = d, sem["kannada_text"]
                row[f"{name}_direct_score"], row[f"{name}_semantic_score"] = score(d, refs), score(sem["kannada_text"], refs)
                row[f"{name}_english"] = sem["english_text"]
            rows.append(row)

    def summary(key):
        ex = [r[key][0] for r in rows]
        cf = [r[key][1] for r in rows]
        return {"exact_match": round(float(np.mean(ex)), 4), "chrF": round(float(np.mean(cf)), 4)}

    rec = edit_counts([x for r in rows for x in r["signs"]], [x for r in rows for x in r["recognised"]]) if rows else {}
    report = {
        "phrases_evaluated": len(phrases), "streams": len(rows), "threshold": threshold,
        "test_groups": sorted(test_groups),
        "streams_recognised_exactly": int(sum(r["signs_correct"] for r in rows)),
        "recognition_pooled": rec,
        "recognised": {"direct": summary("recognised_direct_score"), "semantic_english_intermediate": summary("recognised_semantic_score")},
        "oracle_perfect_recognition": {"direct": summary("oracle_direct_score"), "semantic_english_intermediate": summary("oracle_semantic_score")},
        "caveat": __doc__.split("CAVEAT:")[1].split("Usage")[0].strip(),
        "examples": [{k: r[k] for k in ("english", "signs", "recognised", "recognised_direct", "recognised_semantic", "recognised_english")}
                     for r in rows[:: max(1, len(rows) // 12)]],
    }
    Path("reports").mkdir(exist_ok=True)
    Path("reports/translation_eval.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("phrases_evaluated", "streams", "streams_recognised_exactly", "recognised",
                                             "oracle_perfect_recognition")}, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
