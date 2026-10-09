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

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .animation.library import AnimationLibrary
from .animation.retarget import sample_to_animation
from .config import METRICS_FILE, RecognitionSettings
from .dataset.store import DatasetError, DatasetStore
from .recognition.pipeline import RecognitionSession
from .recognition.predictor import SignPredictor
from .training.train_model import TrainingError, train
from .translation.kannada_mapping import KannadaSignMapper, Vocabulary, is_kannada, normalize_kannada

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("signbridge")


class AppState:
    def __init__(self):
        self.vocab = Vocabulary()
        self.mapper = KannadaSignMapper()
        self.animations = AnimationLibrary()
        self.dataset = DatasetStore()
        self.predictor = SignPredictor()
        self.predictor.load()
        self.training = False


state: AppState | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global state
    state = AppState()
    log.info("model loaded=%s (%s)", state.predictor.loaded, state.predictor.error or "ok")
    yield


app = FastAPI(title="Kannada SignBridge API", version="1.0.0", lifespan=lifespan)
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


# ---------------------------------------------------------------- routes
@app.get("/api/health")
def health():
    return {"status": "ok", "time": time.time(), "model_loaded": S().predictor.loaded}


@app.get("/api/model/status")
def model_status():
    st = S().predictor.status()
    st["training_in_progress"] = S().training
    st["defaults"] = RecognitionSettings().to_dict()
    return st


@app.get("/api/model/metrics")
def model_metrics():
    if not METRICS_FILE.exists():
        return {"available": False}
    return {"available": True, **json.loads(METRICS_FILE.read_text(encoding="utf-8"))}


@app.post("/api/model/train")
async def model_train():
    s = S()
    if s.training:
        raise HTTPException(409, "training already in progress")
    s.training = True
    try:
        metrics = await run_in_threadpool(train, s.dataset)
    except TrainingError as exc:
        raise HTTPException(400, str(exc)) from exc
    finally:
        s.training = False
    s.predictor.load()
    if not s.predictor.loaded:
        raise HTTPException(500, f"model trained but failed to load: {s.predictor.error}")
    return {"ok": True, "metrics": metrics, "status": s.predictor.status()}


@app.post("/api/model/reload")
def model_reload():
    S().predictor.load()
    return S().predictor.status()


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
        entry = S().vocab.upsert(req.label, req.english, req.kannada)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    S().mapper.add(entry.kannada, entry.label, "added from the Dataset & Model page (unverified)")
    return entry.to_dict()


@app.post("/api/translate/kannada")
def translate_kannada(req: TranslateRequest):
    s = S()
    normalized = normalize_kannada(req.text)
    if not normalized:
        raise HTTPException(400, "please enter some Kannada text")
    items = s.mapper.translate(normalized)
    for item in items:
        sign_id = item.get("sign_id")
        entry = s.vocab.get(sign_id) if sign_id else None
        item["english"] = entry.english if entry else None
        item["animation"] = s.animations.info(sign_id) if sign_id else {"available": False, "type": None}
    return {
        "input": req.text,
        "normalized": normalized,
        "contains_kannada": is_kannada(normalized),
        "items": items,
        "supported_count": sum(1 for i in items if i["supported"]),
        "unsupported": [i["text"] for i in items if not i["supported"]],
        "note": "Word/phrase lookup of supported signs only; this is not grammatical Kannada-to-ISL translation.",
    }


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
