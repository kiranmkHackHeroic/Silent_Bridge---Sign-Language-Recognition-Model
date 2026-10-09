"""Persistent local job queue for dataset imports and model training.

* Jobs are stored in data/jobs.json, so the queue survives restarts; a job that
  was 'running' when the app stopped is re-queued on start-up (imports resume,
  already-processed videos are skipped).
* One worker thread executes jobs sequentially, so two training jobs can never
  modify the model registry at the same time.
* Queued jobs can be cancelled; running imports stop after the current video;
  failed / cancelled jobs can be retried.
* After every successful import an eligibility check decides whether enough new
  valid data exists to justify retraining; if so ONE training job is queued
  (uploads are batched - a single file never triggers training by itself).
"""
from __future__ import annotations

import json
import logging
import threading
import time
import traceback
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from .config import DATA_DIR, MODELS_DIR, TrainingConfig

log = logging.getLogger("signbridge.jobs")
JOBS_FILE = DATA_DIR / "jobs.json"
AUTO_MIN_NEW_SAMPLES = 20       # new valid samples needed before an automatic retrain
AUTO_MIN_PER_CLASS = 5          # a class must have this many valid samples to count
TERMINAL = {"done", "failed", "cancelled"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def training_eligibility(models_root: Path = MODELS_DIR, stores=None, known: set[str] | None = None) -> dict:
    """Can (and should) a new model be trained? Never touches the current model."""
    from .config import DEFAULT_FEATURE_CONFIG
    from .dataset.validate import validate_dataset
    from .training.registry import active_paths
    from .training.train_model import default_stores, known_labels_from

    known = known or known_labels_from()
    per_class: Counter = Counter()
    hashes = []
    for source, store in (stores if stores is not None else default_stores()):
        s = validate_dataset(store, known, DEFAULT_FEATURE_CONFIG)["summary"]
        hashes.append(f"{source}:{s['dataset_hash']}")
        for label, c in s["per_class"].items():
            per_class[label] += c["valid"]
    import hashlib
    dataset_hash = hashlib.sha1("|".join(hashes).encode()).hexdigest()[:12]
    usable = {c: n for c, n in per_class.items() if n >= AUTO_MIN_PER_CLASS}
    total = sum(per_class.values())
    _, meta_file, _ = active_paths(models_root)
    try:
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        meta = {}
    trained_on = int(meta.get("num_samples") or 0)
    new_samples = max(0, total - trained_on)
    new_classes = sorted(set(usable) - set(meta.get("classes", [])))
    reasons, needed = [], {}
    if len(usable) < 2:
        reasons.append(f"need at least 2 classes with >= {AUTO_MIN_PER_CLASS} valid samples (have {len(usable)})")
        needed = {c: AUTO_MIN_PER_CLASS - n for c, n in per_class.items() if n < AUTO_MIN_PER_CLASS}
    if meta and meta.get("dataset_hash") == dataset_hash:
        reasons.append("the active model was trained on exactly this data")
    elif meta and new_samples < AUTO_MIN_NEW_SAMPLES and not new_classes:
        reasons.append(f"only {new_samples} new valid sample(s); {AUTO_MIN_NEW_SAMPLES} needed for automatic retraining")
    return {"eligible": not reasons, "reasons": reasons, "valid_samples": total, "usable_classes": len(usable),
            "new_samples": new_samples, "new_classes": new_classes, "samples_needed_per_class": needed,
            "dataset_hash": dataset_hash, "active_dataset_hash": meta.get("dataset_hash")}


class JobQueue:
    def __init__(self, path: Path = JOBS_FILE, on_model_change: Callable[[], None] | None = None,
                 auto_train: bool = True):
        self.path = Path(path)
        self.on_model_change = on_model_change or (lambda: None)
        self.auto_train = auto_train
        self._lock = threading.RLock()
        self._wake = threading.Event()
        self._stop = False
        self._cancel_running = False
        self.jobs: list[dict] = []
        self._load()
        self._thread: threading.Thread | None = None

    # ---------------------------------------------------------------- persistence
    def _load(self) -> None:
        try:
            self.jobs = json.loads(self.path.read_text(encoding="utf-8")).get("jobs", [])
        except (OSError, json.JSONDecodeError):
            self.jobs = []
        for j in self.jobs:
            if j["state"] == "running":       # interrupted by an app restart -> resume
                j.update(state="queued", stage="re-queued after application restart", progress=0.0)
        self._save()

    def _save(self) -> None:
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps({"jobs": self.jobs[-200:]}, ensure_ascii=False, indent=1), encoding="utf-8")
            tmp.replace(self.path)

    # ---------------------------------------------------------------- API
    def start(self) -> None:
        if self._thread is None:
            self._thread = threading.Thread(target=self._run, name="job-worker", daemon=True)
            self._thread.start()

    def stop(self) -> None:
        self._stop = True
        self._wake.set()

    def submit(self, kind: str, params: dict | None = None, title: str = "", reason: str = "") -> dict:
        job = {"id": uuid.uuid4().hex[:10], "type": kind, "title": title or kind, "params": params or {},
               "reason": reason, "state": "queued", "stage": "waiting", "progress": 0.0, "error": None,
               "result": None, "created_at": _now(), "started_at": None, "finished_at": None}
        with self._lock:
            self.jobs.append(job)
            self._save()
        self._wake.set()
        return job

    def get(self, job_id: str) -> dict | None:
        return next((j for j in self.jobs if j["id"] == job_id), None)

    def list(self) -> list[dict]:
        return list(reversed(self.jobs))

    def active_training(self) -> dict | None:
        return next((j for j in self.jobs if j["type"] == "train" and j["state"] in ("queued", "running")), None)

    def cancel(self, job_id: str) -> dict:
        with self._lock:
            job = self.get(job_id)
            if job is None:
                raise KeyError(job_id)
            if job["state"] == "queued":
                job.update(state="cancelled", stage="cancelled before start", finished_at=_now())
            elif job["state"] == "running" and job["type"] != "train":
                self._cancel_running = True
                job["stage"] = "cancelling after the current item..."
            elif job["state"] == "running":
                raise ValueError("a running training job cannot be interrupted safely; it will finish or fail on its own")
            else:
                raise ValueError(f"job is already {job['state']}")
            self._save()
            return job

    def retry(self, job_id: str) -> dict:
        job = self.get(job_id)
        if job is None:
            raise KeyError(job_id)
        if job["state"] not in ("failed", "cancelled"):
            raise ValueError("only failed or cancelled jobs can be retried")
        return self.submit(job["type"], job["params"], job["title"], f"retry of {job_id}")

    # ---------------------------------------------------------------- worker
    def _next(self) -> dict | None:
        with self._lock:
            return next((j for j in self.jobs if j["state"] == "queued"), None)

    def _run(self) -> None:
        while not self._stop:
            job = self._next()
            if job is None:
                self._wake.wait(timeout=2.0)
                self._wake.clear()
                continue
            self._cancel_running = False
            job.update(state="running", started_at=_now(), stage="starting", progress=0.0, error=None)
            self._save()
            try:
                result = self._execute(job)
                if job["state"] == "running":
                    job.update(state="cancelled" if self._cancel_running else "done", result=result, progress=1.0,
                               stage="cancelled" if self._cancel_running else "finished")
            except Exception as exc:  # report every failure; never kill the worker
                log.exception("job %s failed", job["id"])
                job.update(state="failed", error=f"{exc.__class__.__name__}: {exc}",
                           stage="failed", traceback=traceback.format_exc()[-2000:])
            finally:
                job["finished_at"] = _now()
                self._save()
            if job["state"] == "done" and job["type"].startswith("import") and self.auto_train:
                self._maybe_queue_training(job)

    def _progress(self, job: dict):
        last = [0.0]

        def cb(stage: str, frac: float) -> None:
            job["stage"], job["progress"] = stage, round(max(0.0, min(1.0, frac)), 3)
            if time.time() - last[0] > 1.0:
                last[0] = time.time()
                self._save()
        return cb

    def _execute(self, job: dict) -> dict:
        kind, params = job["type"], job["params"]
        progress = self._progress(job)
        if kind == "import_dataset":
            from .video.importer import ADAPTERS, run_import
            items, _ = ADAPTERS[params["dataset"]]()
            return run_import(params["dataset"], items, int(params.get("workers", 2)),
                              progress=lambda d, t, m: progress(m, d / max(1, t)),
                              cancel=lambda: self._cancel_running)
        if kind == "import_upload":
            from .uploads import import_batch
            return import_batch(params["batch_id"], progress=lambda d, t, m: progress(m, d / max(1, t)),
                                cancel=lambda: self._cancel_running)
        if kind == "train":
            from .training.registry import train_and_promote
            tcfg = TrainingConfig(**{k: v for k, v in params.get("config", {}).items()
                                     if k in TrainingConfig.__dataclass_fields__})
            outcome = train_and_promote(tcfg=tcfg, progress=progress)
            if outcome["promoted"]:
                self.on_model_change()
            m = outcome["metrics"]
            return {"version": outcome["version"], "promoted": outcome["promoted"], "decision": outcome["decision"],
                    "accuracy": m["accuracy"], "macro_f1": m["macro_f1"], "headline_source": m["headline_source"],
                    "model_type": m["model_type"], "num_samples": m["num_samples"], "num_classes": m["num_classes"]}
        raise ValueError(f"unknown job type {kind!r}")

    def _maybe_queue_training(self, import_job: dict) -> None:
        if self.active_training():
            return
        try:
            el = training_eligibility()
        except Exception as exc:  # eligibility must never break the queue
            log.warning("eligibility check failed: %s", exc)
            return
        import_job["result"] = {**(import_job.get("result") or {}), "training_eligibility": el}
        self._save()
        if el["eligible"]:
            self.submit("train", {}, "Automatic retraining",
                        f"after import {import_job['id']}: {el['new_samples']} new valid samples, "
                        f"{len(el['new_classes'])} new classes")
