"""Per-connection continuous recognition session.

Every incoming landmark frame goes through:
  parse/normalize -> motion -> (segment mode)  activity segmenter -> classify segment once
                              (sliding mode)  rolling buffer -> classify window every stride
                                              -> EMA smoothing -> stable-prediction gate
  -> sentence builder (duplicate suppression) -> outgoing events.
"""
from __future__ import annotations

import time

import numpy as np

from ..config import NONE_LABEL, RecognitionSettings
from ..translation.kannada_mapping import Vocabulary
from ..translation.sentence_builder import SentenceBuilder
from .landmarks import FrameFeatures, FrameValidationError, compute_motion, parse_frame
from .predictor import ModelLoadError, Prediction, SignPredictor
from .segmenter import ActivitySegmenter, Segment
from .sequence_buffer import SequenceBuffer
from .temporal_smoothing import ProbabilitySmoother, StablePredictionGate

TENTATIVE_EVERY = 4


class RecognitionSession:
    def __init__(self, predictor: SignPredictor, vocab: Vocabulary, settings: RecognitionSettings | None = None):
        self.predictor = predictor
        self.vocab = vocab
        self.settings = settings or RecognitionSettings()
        self.builder = SentenceBuilder(vocab)
        self.paused = False
        self.frames_in = 0
        self.invalid_frames = 0
        self.proc_ms = 0.0
        self.last_latency_ms: float | None = None
        self._prev: FrameFeatures | None = None
        self._build_components()

    # ---- lifecycle -------------------------------------------------------
    def _build_components(self) -> None:
        s = self.settings
        self.segmenter = ActivitySegmenter(s)
        self.buffer = SequenceBuffer(s.window_frames)
        self.smoother = ProbabilitySmoother(s.smoothing_alpha)
        self.gate = StablePredictionGate(s.confidence_threshold, s.stable_evals, s.release_margin,
                                         s.release_evals, s.cooldown_ms, ignore={NONE_LABEL})
        self._since_eval = 0
        self.tentative: dict | None = None
        # label emitted by the last motion-minimum split; a following split/segment end with the
        # same label is the rest of the same sign (continuation), not a new occurrence
        self._split_label: str | None = None

    def configure(self, values: dict) -> list[str]:
        applied = self.settings.update(values)
        if applied:
            self._build_components()
        return applied

    def reset(self, clear_transcript: bool = True) -> None:
        self._build_components()
        self._prev = None
        if clear_transcript:
            self.builder.clear()

    # ---- helpers ---------------------------------------------------------
    def _describe(self, label: str, confidence: float) -> dict:
        entry = self.vocab.get(label)
        return {
            "label": label,
            "kannada": entry.kannada if entry else "",
            "english": entry.english if entry else label,
            "confidence": round(float(confidence), 4),
        }

    def _top(self, probs: dict[str, float], k: int = 3) -> list[dict]:
        ranked = sorted(probs.items(), key=lambda kv: -kv[1])[:k]
        return [self._describe(lbl, p) for lbl, p in ranked]

    def _emit(self, label: str, confidence: float, t: float, probs: dict[str, float], source: str = "model") -> list[dict]:
        token = self.builder.add(label, confidence, t, source=source)
        if token is None:
            return []
        return [{"type": "sign", "token": token.to_dict(), "top": self._top(probs), "transcript": self.builder.text()}]

    def _predict(self, frames: list[FrameFeatures]) -> Prediction | None:
        try:
            pred = self.predictor.predict_frames(frames)
        except ModelLoadError:
            return None
        if pred is not None:
            self.last_latency_ms = pred.latency_ms
        return pred

    # ---- main entry ------------------------------------------------------
    def process(self, payload: dict) -> list[dict]:
        if self.paused:
            return []
        start = time.perf_counter()
        try:
            frame = parse_frame(payload)
        except FrameValidationError as exc:
            self.invalid_frames += 1
            return [{"type": "error", "message": f"invalid frame: {exc}"}]
        compute_motion(self._prev, frame)
        self._prev = frame
        self.frames_in += 1

        if self.settings.mode == "sliding":
            events = self._process_sliding(frame)
        else:
            events = self._process_segment(frame)

        elapsed = (time.perf_counter() - start) * 1000.0
        self.proc_ms = elapsed if self.frames_in == 1 else 0.9 * self.proc_ms + 0.1 * elapsed
        events.append(self._state(frame))
        return events

    def _state(self, frame: FrameFeatures) -> dict:
        signing = self.segmenter.active if self.settings.mode == "segment" else frame.has_hands
        return {
            "type": "state",
            "mode": self.settings.mode,
            "activity": "signing" if signing else "idle",
            "hands": int(frame.present[0]) + int(frame.present[1]),
            "motion": round(self.segmenter.motion_ema if self.settings.mode == "segment" else frame.motion, 4),
            "buffer": len(self.segmenter.frames) if self.settings.mode == "segment" else len(self.buffer),
            "tentative": self.tentative,
            "proc_ms": round(self.proc_ms, 3),
            "latency_ms": None if self.last_latency_ms is None else round(self.last_latency_ms, 3),
            "model_loaded": self.predictor.loaded,
        }

    # ---- segment mode ----------------------------------------------------
    def _process_segment(self, frame: FrameFeatures) -> list[dict]:
        events: list[dict] = []
        seg = self.segmenter.update(frame)
        if self.segmenter.active and self.predictor.loaded:
            self._since_eval += 1
            if self._since_eval >= TENTATIVE_EVERY:
                self._since_eval = 0
                pred = self._predict(self.segmenter.frames)
                if pred is not None:
                    smoothed = self.smoother.update(np.array([pred.probabilities[c] for c in self.predictor.classes]))
                    best = int(np.argmax(smoothed))
                    self.tentative = self._describe(self.predictor.classes[best], smoothed[best])
        if seg is not None:
            events.extend(self._finish_segment(seg))
        elif self.segmenter.split_candidate and self.predictor.loaded:
            events.extend(self._try_split())
        return events

    def _try_split(self) -> list[dict]:
        """Motion minimum inside a continuous segment: split only on a confident sign."""
        pred = self._predict(self.segmenter.frames)
        if pred is None or pred.label == NONE_LABEL or pred.confidence < self.settings.confidence_threshold:
            return []
        seg = self.segmenter.split()
        if seg is None:
            return []
        self.smoother.reset()
        self.tentative = None
        if pred.label == self._split_label:
            return []                      # continuation of the same sign (e.g. a dip inside a wave)
        self._split_label = pred.label
        events = self._emit(pred.label, pred.confidence, seg.end_t, pred.probabilities)
        for ev in events:
            ev["boundary"] = "motion_minimum"
        return events

    def _finish_segment(self, seg: Segment) -> list[dict]:
        self.smoother.reset()
        self.tentative = None
        self._since_eval = 0
        split_label, self._split_label = self._split_label, None     # a real boundary resets continuation
        base = {"frames": len(seg.frames), "reason": seg.reason,
                "duration_ms": round(seg.end_t - seg.start_t, 1)}
        if not self.predictor.loaded:
            return [{"type": "segment", **base, "result": "no_model"}]
        pred = self._predict(seg.frames)
        if pred is None:
            return [{"type": "segment", **base, "result": "too_short"}]
        if pred.label == NONE_LABEL:
            return [{"type": "segment", **base, "result": "background", "top": self._top(pred.probabilities)}]
        if pred.confidence < self.settings.confidence_threshold:
            return [{"type": "uncertain", **base, "top": self._top(pred.probabilities)}]
        if pred.label == split_label:
            return [{"type": "segment", **base, "result": "continuation", "top": self._top(pred.probabilities)}]
        events = self._emit(pred.label, pred.confidence, seg.end_t, pred.probabilities)
        if not events:
            return [{"type": "segment", **base, "result": "suppressed_duplicate", "top": self._top(pred.probabilities)}]
        return events

    # ---- sliding mode ----------------------------------------------------
    def _process_sliding(self, frame: FrameFeatures) -> list[dict]:
        self.buffer.resize(self.settings.window_frames)
        self.buffer.append(frame)
        if self.buffer.frames_since_hands >= 6:
            # hands left the frame: boundary -> the same sign may be recognized again
            self.gate.notify_boundary()
            self.smoother.reset()
            self.tentative = None
            return []
        self._since_eval += 1
        if self._since_eval < self.settings.stride_frames or not self.predictor.loaded:
            return []
        self._since_eval = 0
        if self.buffer.hand_fraction() < 0.6:
            return []
        pred = self._predict(self.buffer.frames())
        if pred is None:
            return []
        smoothed = self.smoother.update(np.array([pred.probabilities[c] for c in self.predictor.classes]))
        best = int(np.argmax(smoothed))
        label, conf = self.predictor.classes[best], float(smoothed[best])
        self.tentative = self._describe(label, conf)
        emitted = self.gate.update(label, conf, frame.t)
        if emitted is None:
            return []
        probs = {c: float(p) for c, p in zip(self.predictor.classes, smoothed)}
        return self._emit(emitted, conf, frame.t, probs)
