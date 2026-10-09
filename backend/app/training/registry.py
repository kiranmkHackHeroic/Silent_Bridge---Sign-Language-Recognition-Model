"""Versioned local model registry with an active-model pointer, promotion and rollback.

Layout:
  models/registry/<version>/sign_model.joblib  model + label encoder (class list) + feature schema
  models/registry/<version>/model_meta.json    training config, dataset hash, sources, versions
  models/registry/<version>/metrics.json       validation + independent test metrics
  models/registry/<version>/status.json        candidate | active | rejected | retired, decision log
  models/active.json                           {"version": ..., "history": [older active versions]}

A freshly trained candidate is promoted ONLY if
  * its macro-F1 (independent test set, else cross-validation) >= min_test_macro_f1,
  * it is not worse than the currently active model by more than max_regression
    when BOTH are evaluated on the candidate's held-out test samples (the active
    model may have seen those samples, so this comparison is conservative), and
  * a smoke test passes: the bundle reloads from disk through the production
    loader and reproduces the in-memory predictions, and a stream of frames runs
    through the live pipeline without errors.
Otherwise the previous model stays active and the candidate is kept as 'rejected'.
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from ..config import METRICS_FILE, MODEL_FILE, MODEL_META_FILE, MODELS_DIR, TrainingConfig
from .train_model import ProgressFn, TrainResult, append_log, metric_block, predict_labels, save_bundle, train_candidate

REGISTRY_DIR = MODELS_DIR / "registry"
ACTIVE_FILE = MODELS_DIR / "active.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _read(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def _write(path: Path, data) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def active_version(root: Path = MODELS_DIR) -> str | None:
    data = _read(root / ACTIVE_FILE.name, {}) or {}
    v = data.get("version")
    return v if v and (root / "registry" / v / MODEL_FILE.name).exists() else None


def active_paths(root: Path = MODELS_DIR) -> tuple[Path, Path, Path]:
    """Files of the active model; falls back to the legacy flat layout in models/."""
    v = active_version(root)
    base = root / "registry" / v if v else root
    return base / MODEL_FILE.name, base / MODEL_META_FILE.name, base / METRICS_FILE.name


def list_versions(root: Path = MODELS_DIR) -> list[dict]:
    reg = root / "registry"
    active = active_version(root)
    out = []
    if reg.exists():
        for d in sorted((p for p in reg.iterdir() if p.is_dir()), reverse=True):
            meta = _read(d / MODEL_META_FILE.name, {}) or {}
            metrics = _read(d / METRICS_FILE.name, {}) or {}
            status = _read(d / "status.json", {}) or {}
            out.append({"version": d.name, "active": d.name == active, "status": "active" if d.name == active
                        else status.get("state", "unknown"), "trained_at": meta.get("trained_at"),
                        "model_type": meta.get("model_type"), "num_samples": meta.get("num_samples"),
                        "num_classes": len(meta.get("classes", [])), "sources": meta.get("sources"),
                        "dataset_hash": meta.get("dataset_hash"), "accuracy": metrics.get("accuracy"),
                        "macro_f1": metrics.get("macro_f1"), "headline_source": metrics.get("headline_source"),
                        "decision": status.get("decision")})
    return out


def _set_active(version: str, root: Path) -> None:
    data = _read(root / ACTIVE_FILE.name, {}) or {}
    history = list(data.get("history", []))
    if data.get("version") and data["version"] != version:
        history.append(data["version"])
    _write(root / ACTIVE_FILE.name, {"version": version, "history": history[-20:], "updated_at": _now()})


def rollback(root: Path = MODELS_DIR) -> str:
    """Re-activate the most recent previous version that still exists."""
    data = _read(root / ACTIVE_FILE.name, {}) or {}
    history = list(data.get("history", []))
    current = data.get("version")
    while history:
        prev = history.pop()
        if (root / "registry" / prev / MODEL_FILE.name).exists():
            _write(root / ACTIVE_FILE.name, {"version": prev, "history": history, "updated_at": _now(),
                                             "rolled_back_from": current})
            if current:
                st = _read(root / "registry" / current / "status.json", {}) or {}
                st.update(state="retired", retired_at=_now(), decision=(st.get("decision") or "") + " | rolled back")
                _write(root / "registry" / current / "status.json", st)
            return prev
    raise RuntimeError("no previous model version to roll back to")


def activate(version: str, root: Path = MODELS_DIR) -> None:
    if not (root / "registry" / version / MODEL_FILE.name).exists():
        raise RuntimeError(f"model version {version} not found")
    _set_active(version, root)


def _smoke_test(result: TrainResult, folder: Path) -> tuple[bool, str]:
    from ..recognition.pipeline import RecognitionSession
    from ..recognition.predictor import SignPredictor
    from ..translation.kannada_mapping import Vocabulary

    p = SignPredictor(folder / MODEL_FILE.name, folder / MODEL_META_FILE.name)
    if not p.load():
        return False, f"reload failed: {p.error}"
    probe = result.test_samples[:5]
    if probe:
        fcfg = p.feature_config
        mem = predict_labels(result.model, probe, fcfg)
        disk = predict_labels(p.model, probe, fcfg)
        if list(mem) != list(disk):
            return False, "reloaded model predicts differently from the trained model"
        session = RecognitionSession(p, Vocabulary())
        t = 0.0
        for f in probe[0].frames[:60]:
            for ev in session.process({**f, "t": t}):
                if ev["type"] == "error":
                    return False, f"live pipeline error: {ev['message']}"
            t += 33.3
    return True, "reload + prediction + live-pipeline smoke test passed"


def train_and_promote(tcfg: TrainingConfig | None = None, progress: ProgressFn | None = None,
                      stores=None, known_labels: set[str] | None = None, root: Path = MODELS_DIR) -> dict:
    tcfg = tcfg or TrainingConfig()
    progress = progress or (lambda s, f: None)
    result = train_candidate(stores, tcfg=tcfg, progress=lambda s, f: progress(s, 0.9 * f),
                             known_labels=known_labels)
    version = result.meta["model_version"]
    folder = root / "registry" / version
    save_bundle(result, folder)
    progress("Comparing with the active model and running smoke tests", 0.93)

    m = result.metrics
    cand_score = m["macro_f1"]
    reasons = []
    comparison = None
    prev = active_version(root)
    if prev and result.test_samples:
        from ..recognition.predictor import SignPredictor
        pf = root / "registry" / prev
        old = SignPredictor(pf / MODEL_FILE.name, pf / MODEL_META_FILE.name)
        if old.load():
            y_true = [s.label for s in result.test_samples]
            classes = sorted(set(y_true) | set(old.classes))
            old_block = metric_block(y_true, predict_labels(old.model, result.test_samples, old.feature_config), classes)
            comparison = {"previous_version": prev, "previous_macro_f1_on_same_test": old_block["macro_f1"],
                          "previous_accuracy_on_same_test": old_block["accuracy"], "candidate_macro_f1": cand_score,
                          "note": "previous model may have been trained on these test samples (conservative)"}
            if cand_score < old_block["macro_f1"] - tcfg.max_regression:
                reasons.append(f"worse than active {prev} on the same test set "
                               f"({cand_score:.3f} < {old_block['macro_f1']:.3f} - {tcfg.max_regression})")
        else:
            comparison = {"previous_version": prev, "note": f"active model could not be loaded ({old.error})"}
    if cand_score < tcfg.min_test_macro_f1:
        reasons.append(f"macro-F1 {cand_score:.3f} below the acceptance threshold {tcfg.min_test_macro_f1}")
    ok, smoke = _smoke_test(result, folder)
    if not ok:
        reasons.append(f"smoke test failed: {smoke}")
    promoted = not reasons
    decision = ("promoted: " + smoke) if promoted else ("rejected: " + "; ".join(reasons))
    _write(folder / "status.json", {"state": "active" if promoted else "rejected", "decision": decision,
                                    "comparison": comparison, "decided_at": _now()})
    m["promotion"] = {"promoted": promoted, "decision": decision, "comparison": comparison}
    _write(folder / METRICS_FILE.name, m)
    if promoted:
        _set_active(version, root)
    append_log(root, m, {"promoted": promoted, "decision": decision})
    progress("Done", 1.0)
    return {"version": version, "promoted": promoted, "decision": decision, "comparison": comparison,
            "metrics": m}


def delete_version(version: str, root: Path = MODELS_DIR) -> None:
    if version == active_version(root):
        raise RuntimeError("cannot delete the active model")
    folder = root / "registry" / version
    if folder.exists() and (folder / MODEL_META_FILE.name).exists():
        shutil.rmtree(folder)


def sanity_check_versions(root: Path = MODELS_DIR) -> dict:
    """Used by /api/model/registry: counts and the active pointer."""
    versions = list_versions(root)
    return {"active": active_version(root), "versions": versions,
            "counts": {s: sum(v["status"] == s for v in versions) for s in {"active", "rejected", "retired", "candidate"}},
            "history": (_read(root / ACTIVE_FILE.name, {}) or {}).get("history", [])}


