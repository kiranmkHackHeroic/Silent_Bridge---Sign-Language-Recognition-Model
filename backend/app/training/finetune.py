"""Personal fine-tuning of the active isolated-sign model on the user's own recordings.

Why: the model learned from dataset videos of other people; a user's camera, lighting and signing style differ.
How: the GRU network(s) of the active model continue training from their current weights, at a low learning rate,
on the user's TRAINING recordings (in-app webcam recordings and uploads) mixed with a stratified replay sample of the
original dataset recordings so that other signers are not forgotten.

Evaluation (never on data used for fine-tuning):
  * personal: the user's EVALUATION-ONLY recordings (data/eval_recordings) - the measure that matters;
  * retention: the original held-out test recordings. The deployed model's final fit has seen them, so this only
    detects forgetting; it is not a generalisation estimate.
Promotion: only when there are at least `min_eval` evaluation recordings of known signs, personal accuracy improves,
and retention accuracy drops by at most `max_retention_drop`. Otherwise the result is saved as an inactive version.
"""
from __future__ import annotations

import copy
import json
from collections import defaultdict
from datetime import datetime, timezone
from math import comb
from pathlib import Path

import joblib
import numpy as np

from ..config import (DATASET_DIR, METRICS_FILE, MODEL_FILE, MODEL_META_FILE, MODELS_DIR, PROCESSED_LANDMARKS_DIR,
                      FeatureConfig, TrainingConfig)
from ..dataset.store import DatasetStore
from .registry import _set_active, active_version
from .temporal_models import ProbabilityEnsemble, TorchGRUClassifier
from .train_model import append_log, load_valid_samples, predict_labels, vectorize

PUBLIC_SOURCES = ("amrita_slr", "include")
TEST_GROUPS = {"amrita_slr:nachiketh", "amrita_slr:signer_0403", "include:include_test"}


def _mcnemar(b: int, c: int) -> float:
    n = b + c
    return 1.0 if n == 0 else min(1.0, 2 * sum(comb(n, i) for i in range(min(b, c) + 1)) / 2 ** n)


def gru_members(model) -> list[TorchGRUClassifier]:
    if isinstance(model, TorchGRUClassifier):
        return [model]
    if isinstance(model, ProbabilityEnsemble):
        return [m for m in model.members if isinstance(m, TorchGRUClassifier)]
    return []


def _accuracy(model, samples, fcfg) -> tuple[float, list[bool]]:
    if not samples:
        return float("nan"), []
    pred = predict_labels(model, samples, fcfg)
    right = [p == s.label for p, s in zip(pred, samples)]
    return round(float(np.mean(right)), 4), right


def finetune(epochs: int = 12, lr: float = 3e-4, user_weight: int = 3, replay_per_class: int = 6,
             min_eval: int = 20, max_retention_drop: float = 0.02, promote: bool = True, seed: int = 42,
             root: Path = MODELS_DIR, user_stores=None, eval_stores=None, public_stores=None, progress=None) -> dict:
    progress = progress or (lambda s, f: None)
    base_version = active_version(root)
    if not base_version:
        raise RuntimeError("no active model to fine-tune")
    base_dir = root / "registry" / base_version
    bundle = joblib.load(base_dir / MODEL_FILE.name)
    base = bundle["pipeline"]
    members = gru_members(base)
    if not members:
        raise RuntimeError(f"the active model ({type(base).__name__}) has no GRU network to fine-tune")
    classes = set(map(str, bundle["classes"]))
    fcfg = FeatureConfig(**bundle["feature_config"])

    progress("Loading your recordings", 0.05)
    from ..evaluation.live_eval import eval_store
    user_stores = user_stores if user_stores is not None else [
        ("app", DatasetStore(DATASET_DIR))] + [(d.name, DatasetStore(d)) for d in sorted(PROCESSED_LANDMARKS_DIR.iterdir())
                                               if d.is_dir() and d.name not in PUBLIC_SOURCES]
    from ..translation.kannada_mapping import Vocabulary
    user_all, _ = load_valid_samples(user_stores, set(Vocabulary().entries), fcfg)
    user = [s for s in user_all if s.label in classes]
    unknown = sorted({s.label for s in user_all} - classes)          # e.g. a newly added sign: needs a full retrain
    evals, _ = load_valid_samples(eval_stores if eval_stores is not None else [("eval", eval_store())], classes, fcfg)
    evals = [s for s in evals if s.label in classes]
    if not user:
        raise RuntimeError("no training recordings of known signs yet: record signs with 'Purpose: Training data' "
                           "on Dataset & Model (about 10 per sign), then fine-tune")

    progress("Loading the original data for replay", 0.15)
    public, _ = load_valid_samples(public_stores if public_stores is not None else
                                   [(s, DatasetStore(PROCESSED_LANDMARKS_DIR / s)) for s in PUBLIC_SOURCES], classes, fcfg)
    rng = np.random.default_rng(seed)
    by_class = defaultdict(list)
    for s in public:
        if s.group not in TEST_GROUPS:
            by_class[s.label].append(s)
    replay = []
    for label, items in sorted(by_class.items()):
        pick = rng.permutation(len(items))[:replay_per_class]
        replay += [items[i] for i in pick]
    retention = [s for s in public if s.group in TEST_GROUPS]

    progress("Measuring the current model", 0.25)
    before_eval, right_before = _accuracy(base, evals, fcfg)
    before_ret, _ = _accuracy(base, retention, fcfg)

    progress("Fine-tuning", 0.35)
    model = copy.deepcopy(base)
    tcfg = TrainingConfig(augment_copies=2, random_seed=seed)
    X, y, _ = vectorize(user * max(1, user_weight) + replay, fcfg, rng, tcfg)
    runs = [m.fine_tune(X, y, epochs=epochs, lr=lr, seed=seed + i) for i, m in enumerate(gru_members(model))]

    progress("Measuring the fine-tuned model", 0.8)
    after_eval, right_after = _accuracy(model, evals, fcfg)
    after_ret, _ = _accuracy(model, retention, fcfg)
    only_after = sum(a and not b for a, b in zip(right_after, right_before))
    only_before = sum(b and not a for a, b in zip(right_after, right_before))

    reasons = []
    if len(evals) < min_eval:
        reasons.append(f"only {len(evals)} evaluation-only recordings of known signs (need {min_eval}) - personal "
                       "accuracy cannot be measured, so the model is not activated")
    elif not after_eval > before_eval:
        reasons.append(f"personal accuracy did not improve ({after_eval:.3f} vs {before_eval:.3f})")
    if retention and after_ret < before_ret - max_retention_drop:
        reasons.append(f"forgets the original data ({after_ret:.3f} vs {before_ret:.3f} on the original test recordings)")
    promoted = promote and not reasons

    now = datetime.now(timezone.utc)
    version = now.strftime("v%Y%m%d-%H%M%S") + "-ft"
    folder = root / "registry" / version
    folder.mkdir(parents=True)
    meta = json.loads((base_dir / MODEL_META_FILE.name).read_text(encoding="utf-8"))
    report = {
        "finetuned_from": base_version, "created": now.isoformat(timespec="seconds"),
        "user_training_recordings": len(user), "user_signs": sorted({s.label for s in user}),
        "skipped_signs_not_in_model": unknown,
        "replay_recordings": len(replay), "evaluation_recordings": len(evals),
        "settings": {"epochs": epochs, "lr": lr, "user_weight": user_weight, "replay_per_class": replay_per_class},
        "personal_accuracy": {"before": before_eval, "after": after_eval, "only_after_right": only_after,
                              "only_before_right": only_before, "mcnemar_p": round(_mcnemar(only_before, only_after), 4)},
        "retention_accuracy": {"before": before_ret, "after": after_ret, "recordings": len(retention),
                               "note": "original test recordings, seen by the deployed model's final fit: forgetting check only"},
        "members": runs, "promoted": promoted,
        "decision": "promoted: personal accuracy improved without forgetting" if promoted else "not activated: " + "; ".join(reasons or ["--no-promote"]),
    }
    meta.update(model_version=version, trained_at=now.isoformat(timespec="seconds"), finetune=report,
                trained_sample_ids=sorted(set(meta.get("trained_sample_ids") or []) | {s.sample_id for s in user}))
    joblib.dump({**{k: v for k, v in bundle.items() if k != "pipeline"}, "pipeline": model, "model_version": version,
                 "finetune": report}, folder / MODEL_FILE.name)
    (folder / MODEL_META_FILE.name).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    metrics = json.loads((base_dir / METRICS_FILE.name).read_text(encoding="utf-8"))
    metrics.update(model_version=version, finetune=report,
                   note=(metrics.get("note") or "") + f" | fine-tuned from {base_version}: held-out test metrics are "
                        "those of the base model; personal accuracy is in 'finetune'")
    (folder / METRICS_FILE.name).write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    (folder / "status.json").write_text(json.dumps({"state": "active" if promoted else "inactive",
                                                    "decision": report["decision"], "decided_at": report["created"]},
                                                   indent=2), encoding="utf-8")
    if promoted:
        _set_active(version, root)
    append_log(root, metrics, {"promoted": promoted, "decision": report["decision"]})
    progress("Done", 1.0)
    return {"version": version, **report}
