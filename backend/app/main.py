"""Kannada SignBridge backend (FastAPI).

Run from backend/:  uvicorn app.main:app --host 127.0.0.1 --port 8000
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .animation.library import AnimationLibrary
from .animation.retarget import sample_to_animation
from .config import DATA_DIR, PROCESSED_LANDMARKS_DIR, RecognitionSettings
from .jobs import JobQueue, training_eligibility
from .dataset.store import DatasetError, DatasetStore
from .dataset.validate import validate_dataset
from .recognition.pipeline import RecognitionSession
from .recognition.predictor import SignPredictor
from .training.registry import activate, active_paths, active_version, rollback, sanity_check_versions
from .uploads import UploadError, create_batch, delete_batch, get_batch, list_batches
from .video.importer import ADAPTERS
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
        self.jobs = JobQueue(on_model_change=self.predictor.load)
        if start_jobs:
            self.jobs.start()


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


class CaptureRequest(BaseModel):
    label: str
    sample_id: str | None = None


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class TrainRequest(BaseModel):
    models: list[str] | None = None
    sources: list[str] | None = None


# ---------------------------------------------------------------- routes
@app.get("/api/health")
def health():
    return {"status": "ok", "time": time.time(), "model_loaded": S().predictor.loaded}


@app.get("/api/model/status")
def model_status():
    s = S()
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
        summary_file = DATA_DIR / "processed" / f"{key}_import_summary.json"
        imp = json.loads(summary_file.read_text(encoding="utf-8")) if summary_file.exists() else None
        processed_dir = PROCESSED_LANDMARKS_DIR / key
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


@app.post("/api/uploads")
async def upload_files(files: list[UploadFile] = File(...), dataset_name: str = Form("user_uploads"),
                       signer_id: str = Form("signer1"), session_id: str = Form(""),
                       label_mode: str = Form("single"), label: str = Form(""), language: str = Form("ISL"),
                       annotation_type: str = Form("isolated")):
    payload = [(f.filename or "upload", await f.read()) for f in files]
    try:
        return await run_in_threadpool(create_batch, payload, dataset_name, signer_id, session_id, label_mode,
                                       label, set(S().vocab.entries), language, annotation_type)
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


@app.get("/api/vocabulary")
def vocabulary():
    s = S()
    trained = set(s.predictor.classes)
    items = []
    for entry in s.vocab.to_list():
        items.append({**entry, "trained": entry["label"] in trained, "animation": s.animations.info(entry["label"])})
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
    return {
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


@app.get("/api/phrases")
def phrases():
    s = S()
    out = []
    for ph in s.mapper.phrases():
        missing = [sid for sid in ph["sign_ids"] if not s.animations.info(sid)["available"]]
        untrained = [sid for sid in ph["sign_ids"] if sid not in s.predictor.classes]
        out.append({**ph, "missing_animations": missing, "unrecognisable_signs": untrained})
    return {"phrases": out}


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
    try:
        sample = s.dataset.load(req.label, req.sample_id) if req.sample_id else s.dataset.latest(req.label)
    except DatasetError as exc:
        raise HTTPException(400, str(exc)) from exc
    if sample is None:
        raise HTTPException(404, f"no recorded samples for '{req.label}'")
    try:
        clip = sample_to_animation(sample, req.label)
        info = s.animations.save_captured(req.label, clip)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ok": True, "sign_id": req.label, "animation": info, "keyframes": len(clip["keyframes"])}


@app.post("/api/dataset/record")
def dataset_record(req: RecordRequest):
    s = S()
    if s.vocab.get(req.label) is None:
        raise HTTPException(400, f"unknown label '{req.label}' - add it to the vocabulary first")
    try:
        return s.dataset.save(req.label, req.frames, req.session_id, req.signer_id, req.video)
    except DatasetError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/dataset/summary")
def dataset_summary():
    return S().dataset.summary()


@app.get("/api/dataset/validation")
def dataset_validation():
    """Validates every recorded sample (and rewrites data/dataset_manifest.csv)."""
    s = S()
    result = validate_dataset(s.dataset, set(s.vocab.entries))
    summary = result["summary"]
    summary["model_dataset_hash"] = s.predictor.meta.get("dataset_hash")
    summary["model_is_current"] = bool(s.predictor.loaded and summary["model_dataset_hash"] == summary["dataset_hash"])
    return summary


@app.get("/api/dataset/samples/{label}/{sample_id}")
def dataset_sample(label: str, sample_id: str):
    try:
        return S().dataset.load(label, sample_id)
    except DatasetError as exc:
        raise HTTPException(404 if "not found" in str(exc) else 400, str(exc)) from exc


@app.delete("/api/dataset/samples/{label}/{sample_id}")
def dataset_delete(label: str, sample_id: str):
    try:
        deleted = S().dataset.delete(label, sample_id)
    except DatasetError as exc:
        raise HTTPException(400, str(exc)) from exc
    if not deleted:
        raise HTTPException(404, "sample not found")
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
    session = RecognitionSession(s.predictor, s.vocab)
    demo_task: asyncio.Task | None = None
    await ws.send_json({"type": "hello", "model": s.predictor.status(), "settings": session.settings.to_dict()})
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
