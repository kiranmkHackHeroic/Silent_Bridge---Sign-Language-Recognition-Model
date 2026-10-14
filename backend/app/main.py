"""Kannada SignBridge backend (FastAPI).

Run from backend/:  uvicorn app.main:app --host 127.0.0.1 --port 8000
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from .animation.library import AnimationLibrary
from .animation.retarget import sample_to_animation
from .config import DATA_DIR, PROCESSED_LANDMARKS_DIR, RecognitionSettings
from .continuous.recognizer import ContinuousRecognizer
from .diagnostics import compare_extractions, save_snapshot, schema_report
from .jobs import JobQueue, training_eligibility
from .dataset.store import DatasetError, DatasetStore
from .dataset.validate import cached_validation
from .recognition.pipeline import RecognitionSession
from .recognition.predictor import SignPredictor
from .training.registry import activate, active_paths, active_version, rollback, sanity_check_versions
from .uploads import UploadError, create_batch, delete_batch, get_batch, list_batches
from .video.importer import ADAPTERS, output_root
from .translation.kannada_mapping import KannadaSignMapper, Vocabulary, is_kannada, normalize_kannada

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("signbridge")
DATASETS_REGISTRY = DATA_DIR / "datasets_registry.json"


class AppState:
    def __init__(self, start_jobs: bool = True):
        self.vocab = Vocabulary()
        self.mapper = KannadaSignMapper()
        self.animations = AnimationLibrary()
        self.dataset = DatasetStore()
        self.predictor = SignPredictor()          # follows the registry's active-model pointer
        self.predictor.load()
        self.continuous = ContinuousRecognizer()
        self.continuous.load()
        self.jobs = JobQueue(on_model_change=self._reload_models)
        if start_jobs:
            self.jobs.start()
            # warm the dataset-validation cache (about a minute for ~1000 videos) without blocking start-up
            threading.Thread(target=self._warm_validation, name="validation-warmup", daemon=True).start()

    def _warm_validation(self) -> None:
        from .training.train_model import default_stores
        try:
            cached_validation(default_stores(), set(self.vocab.entries))
        except Exception as exc:  # never fatal
            log.warning("validation warm-up failed: %s", exc)


    def _reload_models(self) -> None:
        self.predictor.load()
        self.continuous.load()


state: AppState | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global state
    state = AppState()
    log.info("model loaded=%s (%s)", state.predictor.loaded, state.predictor.error or "ok")
    yield
    state.jobs.stop()


app = FastAPI(title="Kannada SignBridge API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def S() -> AppState:
    assert state is not None
    return state


# ---------------------------------------------------------------- models
class TranslateRequest(BaseModel):
    text: str = Field(..., max_length=2000)


class GlossTranslateRequest(BaseModel):
    labels: list[str] = Field(..., max_length=60)


class VocabRequest(BaseModel):
    label: str = Field(..., min_length=1, max_length=40)
    english: str = Field("", max_length=80)
    kannada: str = Field(..., min_length=1, max_length=80)
    isl_gloss: str = Field("", max_length=40)


class RecordRequest(BaseModel):
    label: str = Field(..., min_length=1, max_length=40)
    session_id: str = Field(..., min_length=1, max_length=64)
    signer_id: str = Field("signer1", min_length=1, max_length=64)
    video: dict = Field(default_factory=dict)
    frames: list[dict] = Field(..., min_length=1, max_length=600)
    # "train": used for training; "eval": stored separately and NEVER trained on (live evaluation)
    purpose: str = Field("train", pattern="^(train|eval)$")
    conditions: dict = Field(default_factory=dict)


class SequenceRecordRequest(BaseModel):
    glosses: list[str] = Field(..., min_length=1, max_length=12)
    session_id: str = Field(..., min_length=1, max_length=64)
    signer_id: str = Field("signer1", min_length=1, max_length=64)
    conditions: dict = Field(default_factory=dict)
    frames: list[dict] = Field(..., min_length=1, max_length=2400)


class CaptureRequest(BaseModel):
    label: str
    sample_id: str | None = None


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class TrainRequest(BaseModel):
    models: list[str] | None = None
    sources: list[str] | None = None


# ---------------------------------------------------------------- routes
@app.get("/")
def root():
    return {
        "service": "Kannada SignBridge API",
        "version": "2.0.0",
        "frontend": "http://127.0.0.1:5173",
        "docs": "http://127.0.0.1:8000/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "time": time.time(), "model_loaded": S().predictor.loaded}


@app.get("/api/model/status")
def model_status():
    s = S()
    s.predictor.ensure_active()
    st = s.predictor.status()
    st["training_in_progress"] = s.jobs.active_training() is not None
    st["active_version"] = active_version()
    st["defaults"] = RecognitionSettings().to_dict()
    return st


@app.get("/api/model/metrics")
def model_metrics():
    _, _, metrics_file = active_paths()
    if not metrics_file.exists():
        return {"available": False}
    return {"available": True, **json.loads(metrics_file.read_text(encoding="utf-8"))}


@app.post("/api/model/train", status_code=202)
def model_train(req: TrainRequest | None = None):
    """Queues a training job (one at a time); progress via /api/jobs or /api/model/train/status."""
    s = S()
    running = s.jobs.active_training()
    if running:
        raise HTTPException(409, f"a training job is already {running['state']} ({running['id']})")
    config = {}
    if req and req.models:
        config["candidate_models"] = req.models
    if req and req.sources:
        config["sources"] = req.sources
    job = s.jobs.submit("train", {"config": config}, "Manual training", "started from the Dataset & Model page")
    return _train_status_view(job)


def _train_status_view(job: dict | None) -> dict:
    if job is None:
        return {"state": "idle", "stage": "", "progress": 0.0, "error": None, "metrics": None, "job_id": None}
    result = job.get("result") or {}
    error = job.get("error")
    if job["state"] == "done" and not result.get("promoted"):
        error = result.get("decision") or "candidate model was not promoted"
    if job["state"] in ("queued", "running"):
        state_ = "running"
    elif job["state"] == "done" and result.get("promoted"):
        state_ = "done"
    else:
        state_ = "error"
    metrics = None
    if state_ == "done":
        _, _, mf = active_paths()
        if mf.exists():
            metrics = json.loads(mf.read_text(encoding="utf-8"))
    return {"state": state_, "stage": "queued - waiting for the job worker" if job["state"] == "queued" else job["stage"],
            "progress": job["progress"], "error": error, "metrics": metrics, "job_id": job["id"], "result": result}


@app.get("/api/model/train/status")
def model_train_status():
    trains = [j for j in S().jobs.list() if j["type"] == "train"]
    return _train_status_view(trains[0] if trains else None)


@app.get("/api/model/registry")
def model_registry():
    return sanity_check_versions()


@app.post("/api/model/rollback")
def model_rollback():
    try:
        version = rollback()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    S().predictor.load()
    return {"active_version": version, "status": S().predictor.status()}


@app.post("/api/model/activate/{version}")
def model_activate(version: str):
    try:
        activate(version)
    except RuntimeError as exc:
        raise HTTPException(404, str(exc)) from exc
    S().predictor.load()
    if not S().predictor.loaded:
        rollback()
        S().predictor.load()
        raise HTTPException(400, "that version failed to load; the previous model was restored")
    return {"active_version": version, "status": S().predictor.status()}


@app.post("/api/model/reload")
def model_reload():
    S().predictor.load()
    return S().predictor.status()


@app.get("/api/continuous/status")
def continuous_status():
    s = S()
    st = s.continuous.status()
    st["metrics"] = s.continuous.metrics or None
    return st


@app.post("/api/continuous/train", status_code=202)
def continuous_train():
    s = S()
    if any(j["type"] == "train_continuous" and j["state"] in ("queued", "running") for j in s.jobs.list()):
        raise HTTPException(409, "continuous training already queued or running")
    return s.jobs.submit("train_continuous", {}, "Train continuous sentence model (ISL-CSLTR)")


@app.get("/api/training/eligibility")
def training_eligibility_endpoint():
    return training_eligibility()


# ---------------------------------------------------------------- jobs
@app.get("/api/jobs")
def jobs_list():
    return {"jobs": [{k: v for k, v in j.items() if k != "traceback"} for j in S().jobs.list()[:50]]}


@app.post("/api/jobs/{job_id}/cancel")
def jobs_cancel(job_id: str):
    try:
        return S().jobs.cancel(job_id)
    except KeyError as exc:
        raise HTTPException(404, "job not found") from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.post("/api/jobs/{job_id}/retry")
def jobs_retry(job_id: str):
    try:
        return S().jobs.retry(job_id)
    except KeyError as exc:
        raise HTTPException(404, "job not found") from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


# ---------------------------------------------------------------- external datasets & uploads
@app.get("/api/datasets")
def datasets():
    reg = json.loads(DATASETS_REGISTRY.read_text(encoding="utf-8"))["datasets"]
    out = []
    for key, spec in reg.items():
        status_file = DATA_DIR / "raw" / key / "download_status.json"
        dl = json.loads(status_file.read_text(encoding="utf-8")) if status_file.exists() else {"state": "not downloaded"}
        if "state" not in dl:       # download still running: derive from the files finished so far
            states = {f.get("state") for f in dl.get("files", {}).values()}
            dl["state"] = "partial" if "extracted" in states else "downloading"
        summary_file = DATA_DIR / "processed" / f"{key}_import_summary.json"
        imp = json.loads(summary_file.read_text(encoding="utf-8")) if summary_file.exists() else None
        processed_dir = output_root(key)
        out.append({"key": key, "name": spec["name"], "task": spec["task"], "source_url": spec["source_url"],
                    "license": spec["license"], "citation": spec["citation"], "doi": spec.get("doi"),
                    "description": spec["description"], "version": spec.get("version"),
                    "download_state": dl.get("state"), "download_files": dl.get("files", {}),
                    "import_summary": imp, "importable": key in ADAPTERS,
                    "processed_samples": sum(1 for _ in processed_dir.glob("*/*.json")) if processed_dir.exists() else 0})
    return {"datasets": out, "uploads": list_batches()}


@app.post("/api/datasets/{key}/import", status_code=202)
def dataset_import(key: str):
    if key not in ADAPTERS:
        raise HTTPException(404, f"no importer for dataset '{key}'")
    return S().jobs.submit("import_dataset", {"dataset": key, "workers": 2}, f"Import {key}")


def _label_context() -> dict:
    """Existing valid examples per class, trained classes and the weakest classes (Phase 6 baseline report)."""
    from .config import DEFAULT_FEATURE_CONFIG
    from .jobs import AUTO_MIN_PER_CLASS
    from .training.train_model import default_stores, known_labels_from
    try:
        summary = cached_validation(default_stores(), known_labels_from(), DEFAULT_FEATURE_CONFIG)
        counts = {c: v["valid"] for c, v in summary["per_class"].items()}
    except Exception:  # never block an upload preview on the dataset summary
        counts = {}
    priority = []
    report = DATA_DIR.parent / "reports" / "phase6_baseline.json"
    if report.exists():
        try:
            priority = [r["class"] for r in json.loads(report.read_text(encoding="utf-8"))["weakest_validation_classes"]]
        except (OSError, KeyError, json.JSONDecodeError):
            priority = []
    return {"existing_counts": counts, "trained_classes": set(S().predictor.classes), "priority": priority,
            "min_per_class": AUTO_MIN_PER_CLASS}


@app.post("/api/uploads")
async def upload_files(files: list[UploadFile] = File(...), dataset_name: str = Form("user_uploads"),
                       signer_id: str = Form("signer1"), session_id: str = Form(""),
                       label_mode: str = Form("single"), label: str = Form(""), language: str = Form("ISL"),
                       annotation_type: str = Form("isolated")):
    payload = [(f.filename or "upload", await f.read()) for f in files]
    try:
        return await run_in_threadpool(create_batch, payload, dataset_name, signer_id, session_id, label_mode,
                                       label, set(S().vocab.entries), language, annotation_type, _label_context())
    except UploadError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/uploads/{batch_id}")
def upload_get(batch_id: str):
    try:
        return get_batch(batch_id)
    except UploadError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.post("/api/uploads/{batch_id}/import", status_code=202)
def upload_import(batch_id: str):
    try:
        batch = get_batch(batch_id)
    except UploadError as exc:
        raise HTTPException(404, str(exc)) from exc
    if not batch["ready"]:
        raise HTTPException(400, "no importable videos in this batch")
    return S().jobs.submit("import_upload", {"batch_id": batch_id}, f"Import upload {batch_id} ({batch['ready']} videos)")


@app.delete("/api/uploads/{batch_id}")
def upload_delete(batch_id: str, delete_landmarks: bool = False):
    try:
        return delete_batch(batch_id, delete_landmarks)
    except UploadError as exc:
        raise HTTPException(404, str(exc)) from exc


PUBLIC_DATASETS = {"amrita_slr", "include"}   # imported public corpora; every other landmark folder is a user upload


def _upload_dirs() -> list[Path]:
    """Landmark folders of the user's own uploads (never the public datasets, which hold thousands of files)."""
    if not PROCESSED_LANDMARKS_DIR.exists():
        return []
    return [d for d in PROCESSED_LANDMARKS_DIR.iterdir() if d.is_dir() and d.name not in PUBLIC_DATASETS]


def _uploaded_samples(label: str) -> list[Path]:
    """Landmark files extracted from the user's own uploaded videos of one sign (newest last)."""
    files = [f for d in _upload_dirs() for f in (d / label).glob("*.json")]
    return sorted(files, key=lambda p: p.stat().st_mtime)


@app.get("/api/vocabulary")
def vocabulary():
    s = S()
    trained = set(s.predictor.classes)
    uploaded: dict[str, int] = {}
    for d in _upload_dirs():
        for sub in d.iterdir():
            if sub.is_dir():
                uploaded[sub.name] = uploaded.get(sub.name, 0) + sum(1 for _ in sub.glob("*.json"))
    items = []
    for entry in s.vocab.to_list():
        items.append({**entry, "trained": entry["label"] in trained, "animation": s.animations.info(entry["label"]),
                      "uploaded_samples": uploaded.get(entry["label"], 0)})
    return {"labels": items, "kannada_entries": len(s.mapper.entries)}


@app.post("/api/vocabulary")
def vocabulary_upsert(req: VocabRequest):
    try:
        entry = S().vocab.upsert(req.label, req.english, req.kannada, req.isl_gloss)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    S().mapper.add(entry.kannada, entry.label, "added from the Dataset & Model page (unverified)")
    return entry.to_dict()


@app.post("/api/translate/kannada")
def translate_kannada(req: TranslateRequest):
    s = S()
    normalized = normalize_kannada(req.text)
    if not normalized:
        raise HTTPException(400, "ದಯವಿಟ್ಟು ಕನ್ನಡ ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ / Please enter some Kannada text")
    items = s.mapper.translate(normalized)
    for item in items:
        signs = []
        for sign_id in item["sign_ids"]:
            entry = s.vocab.get(sign_id)
            signs.append({"sign_id": sign_id, "english": entry.english if entry else sign_id,
                          "kannada": entry.kannada if entry else "", "isl_gloss": entry.isl_gloss if entry else "",
                          "animation": s.animations.info(sign_id)})
        item["signs"] = signs
    unsupported = [i["text"] for i in items if not i["supported"]]
    meaning = _semantic().reverse(normalized)
    return {
        "english_meaning": meaning["english_meaning"],
        "gloss_sequence": meaning["gloss_sequence"],
        "meaning_items": meaning["items"],
        "input": req.text,
        "normalized": normalized,
        "contains_kannada": is_kannada(normalized),
        "items": items,
        "supported_count": sum(1 for i in items if i["supported"]),
        "sign_count": sum(len(i["signs"]) for i in items),
        "unsupported": unsupported,
        "unsupported_message": (f"ಈ ಪದಗಳಿಗೆ ಸಂಜ್ಞೆ ಲಭ್ಯವಿಲ್ಲ: {', '.join(unsupported)} / "
                                f"No sign available for: {', '.join(unsupported)}. Names and other proper nouns "
                                "need fingerspelling, which is not available.") if unsupported else None,
        "note": "Supported-vocabulary lookup (word and phrase level) producing an ISL gloss sequence; "
                "this is not full grammatical Kannada-to-ISL translation.",
    }


def _semantic():
    from .translation.semantic import SemanticTranslator
    s = S()
    return SemanticTranslator(s.vocab, s.mapper, s.predictor.classes)


@app.post("/api/translate/glosses")
def translate_glosses(req: GlossTranslateRequest):
    """Recognised sign labels (signing order) -> ISL gloss sequence -> English meaning -> Kannada, plus the
    word-by-word baseline. Used by the Live page whenever the transcript changes or is corrected."""
    if any(len(lab) > 40 for lab in req.labels):
        raise HTTPException(422, "label too long")
    t = _semantic()
    out = t.translate(req.labels)
    out["direct_kannada"] = t.direct_kannada(req.labels)
    return out


@app.get("/api/phrases")
def phrases():
    s = S()
    out = []
    for ph in s.mapper.phrases():
        missing = [sid for sid in ph["sign_ids"] if not s.animations.info(sid)["available"]]
        untrained = [sid for sid in ph["sign_ids"] if sid not in s.predictor.classes]
        out.append({**ph, "missing_animations": missing, "unrecognisable_signs": untrained})
    return {"phrases": out}


REFERENCE_CITATIONS = {
    "amrita_slr": "Amrita SLR – Real Time ISL Dataset (Mendeley Data, doi:10.17632/dtg9s785v8.1, CC BY 4.0)",
    "include": "INCLUDE (Sridhar et al., ACM MM 2020, doi:10.1145/3394171.3413528, CC BY 4.0)",
}


@app.get("/api/reference/{label}")
def sign_reference(label: str, limit: int = 3):
    """Real ISL dataset recordings of one sign: how the trained model expects it to be signed. Best hand
    coverage first, at most one recording per signer group (different people). Videos are streamed by
    /api/diagnostics/video; on a computer without the original dataset videos only the avatar clip remains."""
    import csv
    from .video.importer import output_root
    s = S()
    entry = s.vocab.get(label)
    if entry is None or label == "_none":
        raise HTTPException(404, f"unknown sign '{label}'")
    found, total = [], 0
    for source in REFERENCE_CITATIONS:
        root = output_root(source)
        manifest = root.parent / f"{root.name}_manifest.csv"
        if not manifest.exists():
            continue
        with manifest.open(encoding="utf-8") as fh:
            rows = [r for r in csv.DictReader(fh) if r.get("label") == label and r.get("status") == "valid"]
        total += len(rows)
        for r in rows:
            frames = max(1, int(float(r.get("num_frames") or 0) or 1))
            found.append((float(r.get("hand_frames") or 0) / frames, source, r))
    found.sort(key=lambda x: -x[0])
    samples, groups = [], set()
    for _, source, r in found:
        if len(samples) >= max(1, min(limit, 6)):
            break
        group = f"{source}:{r.get('session_id')}"
        if group in groups:
            continue
        try:
            d = json.loads((output_root(source) / r["file"]).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError, KeyError):
            continue
        src = Path(d.get("source_file", ""))
        if not src.exists():
            continue
        groups.add(group)
        samples.append({"source": source, "sample_id": d["sample_id"], "signer_group": r.get("session_id"),
                        "file": src.name, "duration_s": round(float(r.get("duration_ms") or 0) / 1000, 1),
                        "video_url": f"/api/diagnostics/video/{source}/{d['sample_id']}",
                        "citation": REFERENCE_CITATIONS[source]})
    return {"label": label, "english": entry.english, "kannada": entry.kannada, "isl_gloss": entry.isl_gloss,
            "trained": label in set(s.predictor.classes), "dataset_recordings": total, "samples": samples,
            "animation": s.animations.info(label)}


@app.get("/api/animations")
def animations_index():
    return S().animations.index()


@app.get("/api/animations/{sign_id}")
def animation_get(sign_id: str):
    clip = S().animations.get(sign_id)
    if clip is None:
        raise HTTPException(404, f"no animation available for '{sign_id}'")
    return clip


@app.post("/api/animations/capture")
def animation_capture(req: CaptureRequest):
    s = S()
    origin = "webcam recording"
    try:
        if req.sample_id:
            sample = s.dataset.load(req.label, req.sample_id)
        else:
            # the newest of: in-app webcam recordings and the user's own uploaded videos of this sign
            sample = s.dataset.latest(req.label)          # also validates the label before it is used in a path
            recorded = list((s.dataset.root / req.label).glob("*.json"))
            uploads = _uploaded_samples(req.label)
            rec_time = max((p.stat().st_mtime for p in recorded), default=0.0)
            if uploads and uploads[-1].stat().st_mtime > rec_time:
                sample = json.loads(uploads[-1].read_text(encoding="utf-8"))
                origin = f"uploaded video '{Path(sample.get('source_file', '')).name}'"
    except DatasetError as exc:
        raise HTTPException(400, str(exc)) from exc
    if sample is None:
        raise HTTPException(404, f"no recorded or uploaded samples for '{req.label}'")
    try:
        clip = sample_to_animation(sample, req.label)
        info = s.animations.save_captured(req.label, clip)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ok": True, "sign_id": req.label, "animation": info, "keyframes": len(clip["keyframes"]), "source": origin}


@app.post("/api/dataset/record")
def dataset_record(req: RecordRequest):
    s = S()
    if s.vocab.get(req.label) is None:
        raise HTTPException(400, f"unknown label '{req.label}' - add it to the vocabulary first")
    from .evaluation.live_eval import clean_conditions, eval_store
    store = eval_store() if req.purpose == "eval" else s.dataset
    try:
        res = {**store.save(req.label, req.frames, req.session_id, req.signer_id, req.video,
                            extra={"purpose": req.purpose, "conditions": clean_conditions(req.conditions)}),
               "stored_in": "evaluation set (never used for training)" if req.purpose == "eval" else "training data"}
        _DATASET_SUMMARY_CACHE["data"] = None
        return res
    except DatasetError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/evaluation/sequence")
def evaluation_record_sequence(req: SequenceRecordRequest):
    """A recording of several consecutive signs (no button presses between them) + the signs performed."""
    from .evaluation.live_eval import save_sequence
    s = S()
    unknown = [g for g in req.glosses if s.vocab.get(g) is None or g == "_none"]
    if unknown:
        raise HTTPException(400, f"unknown sign label(s): {', '.join(unknown)}")
    try:
        return save_sequence(req.glosses, req.frames, req.session_id, req.signer_id, req.conditions)
    except DatasetError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/evaluation/data")
def evaluation_data():
    from .evaluation.live_eval import eval_data_summary, list_sequences
    return {**eval_data_summary(),
            "sequence_list": [{k: v for k, v in d.items() if k != "frames"} for d in list_sequences()]}


@app.delete("/api/evaluation/sequence/{seq_id}")
def evaluation_delete_sequence(seq_id: str):
    from .evaluation.live_eval import delete_sequence
    try:
        return {"deleted": delete_sequence(seq_id)}
    except DatasetError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/reports/segmentation")
def report_segmentation():
    """Results of tools/eval_segmentation.py (continuous segmentation on held-out recordings)."""
    out = {}
    for name in ("segmentation_eval", "segmentation_eval_verified_split"):
        f = DATA_DIR.parent / "reports" / f"{name}.json"
        if f.exists():
            d = json.loads(f.read_text(encoding="utf-8"))
            d.pop("method", None)
            out[name] = d
    return out


@app.post("/api/evaluation/live")
async def evaluation_live():
    """Accuracy / precision / recall / macro-F1 / false detections / sequence errors of the ACTIVE model
    on the evaluation-only recordings."""
    from .evaluation.live_eval import evaluate_live, save_report
    s = S()
    s.predictor.ensure_active()                          # evaluate the registry's CURRENT active model
    rep = await run_in_threadpool(evaluate_live, s.predictor, s.vocab)
    has_data = rep.get("isolated", {}).get("recordings") or rep.get("sequences", {}).get("sequences")
    if "error" not in rep and has_data:
        rep["saved_to"] = str(save_report(rep))          # unique file per run, never overwritten
    return rep


_DATASET_SUMMARY_CACHE: dict = {"ts": 0.0, "data": None}


@app.get("/api/dataset/summary")
def dataset_summary():
    import time
    now = time.time()
    if _DATASET_SUMMARY_CACHE["data"] is not None and (now - _DATASET_SUMMARY_CACHE["ts"]) < 15.0:
        return _DATASET_SUMMARY_CACHE["data"]

    from .training.train_model import default_stores
    total = 0
    sessions = set()
    labels: dict[str, dict] = {}
    for source, store in default_stores():
        s = store.summary()
        total += s["total_samples"]
        for sess in s.get("labels", {}).values():
            for sid in sess.get("sessions", []):
                sessions.add(f"{source}:{sid}" if sid else source)
        for lbl, data in s.get("labels", {}).items():
            if lbl not in labels:
                labels[lbl] = {"count": 0, "sessions": [], "samples": []}
            labels[lbl]["count"] += data["count"]
            labels[lbl]["sessions"].extend([f"{source}:{x}" if x else source for x in data["sessions"]])
            labels[lbl]["samples"].extend([{**e, "source": source} for e in data["samples"]])
            labels[lbl]["samples"] = labels[lbl]["samples"][-20:]

    res = {"total_samples": total, "num_sessions": len(sessions), "labels": labels}
    _DATASET_SUMMARY_CACHE["ts"] = now
    _DATASET_SUMMARY_CACHE["data"] = res
    return res


@app.get("/api/dataset/validation")
def dataset_validation():
    """Validates every sample of every data source (cached until files change)."""
    from .training.train_model import default_stores
    s = S()
    summary = cached_validation(default_stores(), set(s.vocab.entries))
    summary["model_dataset_hash"] = s.predictor.meta.get("dataset_hash")
    summary["model_is_current"] = bool(s.predictor.loaded and summary["model_dataset_hash"] == summary["dataset_hash"])
    return summary


@app.get("/api/dataset/samples/{label}/{sample_id}")
def dataset_sample(label: str, sample_id: str):
    from .training.train_model import default_stores
    for _, store in default_stores():
        try:
            return store.load(label, sample_id)
        except DatasetError:
            continue
    raise HTTPException(404, "sample not found")


@app.delete("/api/dataset/samples/{label}/{sample_id}")
def dataset_delete(label: str, sample_id: str):
    try:
        deleted = S().dataset.delete(label, sample_id)
    except DatasetError as exc:
        raise HTTPException(400, str(exc)) from exc
    if not deleted:
        raise HTTPException(404, "sample not found")
    _DATASET_SUMMARY_CACHE["data"] = None
    return {"ok": True}


@app.post("/api/tts")
def tts(req: TTSRequest):
    """Optional ONLINE Kannada TTS via gTTS (sends the text to Google). Used only when enabled in the UI."""
    try:
        from gtts import gTTS  # type: ignore
    except ImportError as exc:
        raise HTTPException(501, "gTTS is not installed (pip install gTTS)") from exc
    try:
        buf = io.BytesIO()
        gTTS(text=req.text, lang="kn").write_to_fp(buf)
    except Exception as exc:  # network errors etc.
        raise HTTPException(502, f"online TTS failed: {exc}") from exc
    buf.seek(0)
    return StreamingResponse(buf, media_type="audio/mpeg")


# ---------------------------------------------------------------- diagnostics
class SnapshotRequest(BaseModel):
    frames: list[dict] = Field(default_factory=list, max_length=3000)
    events: list[dict] = Field(default_factory=list, max_length=1000)
    note: str = Field("", max_length=500)


class CompareRequest(BaseModel):
    source: str = Field(..., max_length=40)
    sample_id: str = Field(..., max_length=80)
    frames: list[dict] = Field(..., min_length=1, max_length=3000)


def _processed_sample(source: str, sample_id: str) -> tuple[dict, Path]:
    import re
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", source) or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", sample_id):
        raise HTTPException(400, "invalid id")
    from .video.importer import output_root
    root = output_root(source)
    hits = list(root.glob(f"*/{sample_id}.json"))
    if not hits:
        raise HTTPException(404, "sample not found")
    return json.loads(hits[0].read_text(encoding="utf-8")), hits[0]


@app.get("/api/diagnostics/schema")
def diagnostics_schema():
    s = S()
    return {**schema_report(s.predictor.feature_config), "model_calibration": (s.predictor.meta or {}).get("calibration"),
            "model_ood_reference": (s.predictor.meta or {}).get("ood_reference"),
            "model_version": s.predictor.meta.get("model_version")}


@app.post("/api/diagnostics/snapshot")
def diagnostics_snapshot(req: SnapshotRequest):
    """Saves the last seconds of live frames + events to data/diagnostics/ and returns a per-stage summary."""
    return save_snapshot(req.frames, req.events, req.note)


@app.get("/api/diagnostics/dataset-samples")
def diagnostics_dataset_samples(source: str = "amrita_slr", limit: int = 60):
    """Imported dataset recordings whose original video is available (for the video-file pipeline test).
    Videos NOT used to train the active model are listed first."""
    import csv
    import random
    from .video.importer import output_root
    root = output_root(source)
    manifest = root.parent / f"{root.name}_manifest.csv"
    if not manifest.exists():
        return {"samples": []}
    _, meta_file, _ = active_paths()
    try:
        trained = set(json.loads(meta_file.read_text(encoding="utf-8")).get("trained_sample_ids") or [])
    except (OSError, json.JSONDecodeError):
        trained = set()
    with manifest.open(encoding="utf-8") as fh:
        rows = [r for r in csv.DictReader(fh) if r.get("status") == "valid"]
    random.Random(7).shuffle(rows)
    rows.sort(key=lambda r: r["sample_id"] in trained)          # held-out first (stable sort keeps the shuffle)
    out = []
    for r in rows:
        if len(out) >= max(1, min(limit, 200)):
            break
        f = root / r["file"]
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        src = Path(d.get("source_file", ""))
        if not src.exists():
            continue
        out.append({"source": source, "sample_id": d["sample_id"], "label": d["label"], "group": d.get("session_id"),
                    "file": src.name, "frames": d.get("num_frames"), "fps": (d.get("video") or {}).get("fps"),
                    "used_to_train_active_model": (d["sample_id"] in trained) if trained else None})
    return {"samples": out}


@app.get("/api/diagnostics/video/{source}/{sample_id}")
def diagnostics_video(source: str, sample_id: str):
    d, _ = _processed_sample(source, sample_id)
    src = Path(d.get("source_file", "")).resolve()
    raw = (DATA_DIR / "raw").resolve()
    if raw not in src.parents or not src.exists():
        raise HTTPException(404, "original video not available")
    media = {".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".avi": "video/x-msvideo"}
    return FileResponse(src, media_type=media.get(src.suffix.lower(), "application/octet-stream"))


@app.post("/api/diagnostics/compare")
def diagnostics_compare(req: CompareRequest):
    """Browser (live path) vs Python (training path) extraction of the same video, plus what the model
    predicts from each. Proves (or disproves) that live features match the training features."""
    from .recognition.landmarks import parse_frame
    d, _ = _processed_sample(req.source, req.sample_id)
    result = compare_extractions(req.frames, d["frames"], float(d.get("video", {}).get("fps") or 30))
    s = S()
    preds, probs = {}, {}
    for name, frames in (("browser", req.frames), ("python", d["frames"])):
        feats = []
        for f in frames:
            try:
                feats.append(parse_frame(f))
            except Exception:
                continue
        p = s.predictor.predict_frames(feats) if s.predictor.loaded else None
        preds[name] = None if p is None else {"label": p.label, "confidence": round(p.confidence, 3),
                                              "top3": [{"label": k, "p": round(v, 3)} for k, v in
                                                       sorted(p.probabilities.items(), key=lambda kv: -kv[1])[:3]]}
        probs[name] = None if p is None else p.probabilities
    if probs["browser"] and probs["python"]:
        # total variation distance between the two probability vectors (0 = identical, 1 = disjoint)
        result["probability_difference"] = round(0.5 * sum(abs(probs["browser"][c] - probs["python"][c])
                                                           for c in probs["python"]), 4)
    result["true_label"] = d["label"]
    result["prediction_from_browser_landmarks"] = preds["browser"]
    result["prediction_from_python_landmarks"] = preds["python"]
    result["note"] += ("; the active model may have been trained on this recording, so the predictions show "
                       "pipeline consistency, not generalisation accuracy")
    return result


# ---------------------------------------------------------------- websocket
DEMO_SCRIPT = ["namaskara", "i_me", "water", "please", "thank_you"]


async def _demo_loop(ws: WebSocket, session: RecognitionSession):
    """SIMULATED events for demonstrating the UI without a trained model."""
    i = 0
    while True:
        await asyncio.sleep(2.2)
        label = DEMO_SCRIPT[i % len(DEMO_SCRIPT)]
        i += 1
        token = session.builder.add(label, 1.0, time.time() * 1000, source="simulated")
        if token:
            await ws.send_json({"type": "sign", "token": token.to_dict(), "top": [], "simulated": True,
                                "transcript": session.builder.text()})


@app.websocket("/ws/recognition")
async def ws_recognition(ws: WebSocket):
    await ws.accept()
    s = S()
    s.predictor.ensure_active()                          # new live sessions use the registry's active model
    session = RecognitionSession(s.predictor, s.vocab, continuous=s.continuous)
    demo_task: asyncio.Task | None = None
    await ws.send_json({"type": "hello", "model": s.predictor.status(), "continuous": s.continuous.status(),
                        "settings": session.settings.to_dict()})
    try:
        while True:
            try:
                msg = await ws.receive_json()
            except (ValueError, json.JSONDecodeError):
                await ws.send_json({"type": "error", "message": "messages must be JSON"})
                continue
            if not isinstance(msg, dict):
                continue
            kind = msg.get("type")
            if kind == "frame":
                for event in session.process(msg):
                    await ws.send_json(event)
            elif kind == "config":
                applied = session.configure(msg.get("settings") or {})
                await ws.send_json({"type": "config", "applied": applied, "settings": session.settings.to_dict()})
            elif kind == "pause":
                session.paused = bool(msg.get("paused", True))
                if session.paused:
                    session.reset(clear_transcript=False)
                await ws.send_json({"type": "paused", "paused": session.paused})
            elif kind == "reset":
                session.reset(clear_transcript=bool(msg.get("clear", True)))
                await ws.send_json({"type": "reset"})
            elif kind == "demo":
                if demo_task:
                    demo_task.cancel()
                    demo_task = None
                if msg.get("enabled"):
                    demo_task = asyncio.create_task(_demo_loop(ws, session))
                await ws.send_json({"type": "demo", "enabled": demo_task is not None})
            elif kind == "model_reload":
                await ws.send_json({"type": "hello", "model": s.predictor.status(), "settings": session.settings.to_dict()})
            else:
                await ws.send_json({"type": "error", "message": f"unknown message type: {kind!r}"})
    except WebSocketDisconnect:
        pass
    finally:
        if demo_task:
            demo_task.cancel()
