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
from ..diagnostics import frame_diag, ood_stats, sign_trace
from .landmarks import FrameFeatures, FrameValidationError, compute_motion, parse_frame
from .sequence_features import frames_to_vector
from .predictor import ModelLoadError, Prediction, SignPredictor
from .segmenter import ActivitySegmenter, Segment
from .sequence_buffer import SequenceBuffer
from .temporal_smoothing import ProbabilitySmoother, StablePredictionGate

TENTATIVE_EVERY = 4
PARTIAL_EVERY = 15             # sentence mode: tentative gloss decode every ~0.5 s of signing


class RecognitionSession:
    def __init__(self, predictor: SignPredictor, vocab: Vocabulary, settings: RecognitionSettings | None = None,
                 continuous=None):
        self.predictor = predictor
        self.continuous = continuous          # ContinuousRecognizer for "sentence" mode (optional)
        self.vocab = vocab
        if settings is None:
            settings = RecognitionSettings()
            cal = (getattr(predictor, "meta", None) or {}).get("calibration")
            if cal and cal.get("threshold"):
                # default acceptance threshold = the one calibrated on validation data for this model
                settings.confidence_threshold = float(cal["threshold"])
        self.settings = settings
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
        if s.mode == "sentence":
            # a whole signed sentence is one segment: longer pause, no splitting at slow-downs
            from dataclasses import replace
            # still-tail trimming is set explicitly for sentences too: validated separately on ISL-CSLTR
            # (tools/eval_sentence_trim.py: held-still endings 14 -> 42 / 154 correct on test, lowered unchanged)
            seg = replace(s, still_ms=max(s.still_ms, 1500), absent_ms=700, max_segment_ms=15000, dip_split=False,
                          trim_still_tail=s.trim_sentence_still_tail)
            self.segmenter = ActivitySegmenter(seg)
        else:
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
            vector = frames_to_vector(frames, self.predictor.feature_config)
            if vector is None:
                self.last_vector = None
                return None
            pred = self.predictor.predict_vector(vector)
        except ModelLoadError:
            return None
        except AttributeError:            # predictor stubs without predict_vector (tests)
            pred = self.predictor.predict_frames(frames)
            vector = None
        self.last_vector = vector
        if pred is not None:
            self.last_latency_ms = pred.latency_ms
        return pred

    def _diagnose(self, stage: str, detail: str) -> dict:
        ood = ood_stats(self.predictor, getattr(self, "last_vector", None))
        if stage == "classification" and ood and ood.get("out_of_distribution"):
            stage = "features"
            detail += (f"; live features are outside the training distribution (mean |z| {ood['mean_abs_z']} > "
                       f"{ood['reference_p99']}, worst block: {ood['worst_block']})")
        return {"diagnosis": {"stage": stage, "detail": detail}, "ood": ood}

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
        prev_t = self._prev.t if self._prev is not None else None
        compute_motion(self._prev, frame)
        self._prev = frame
        self._diag = frame_diag(payload, frame, prev_t)
        self.frames_in += 1

        if self.settings.mode == "sliding":
            events = self._process_sliding(frame)
        elif self.settings.mode == "sentence":
            events = self._process_sentence(frame)
        else:
            events = self._process_segment(frame)

        elapsed = (time.perf_counter() - start) * 1000.0
        self.proc_ms = elapsed if self.frames_in == 1 else 0.9 * self.proc_ms + 0.1 * elapsed
        events.append(self._state(frame))
        return events

    def _state(self, frame: FrameFeatures) -> dict:
        signing = self.segmenter.active if self.settings.mode in ("segment", "sentence") else frame.has_hands
        return {
            "type": "state",
            "mode": self.settings.mode,
            "activity": "signing" if signing else "idle",
            "hands": int(frame.present[0]) + int(frame.present[1]),
            "motion": round(self.segmenter.motion_ema if self.settings.mode != "sliding" else frame.motion, 4),
            "buffer": len(self.segmenter.frames) if self.settings.mode != "sliding" else len(self.buffer),
            "tentative": self.tentative,
            "partial": getattr(self, "partial", None) if self.settings.mode == "sentence" else None,
            "proc_ms": round(self.proc_ms, 3),
            "latency_ms": None if self.last_latency_ms is None else round(self.last_latency_ms, 3),
            "model_loaded": self.predictor.loaded,
            "threshold": self.settings.confidence_threshold,
            "diag": getattr(self, "_diag", None),
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

    def _best_split(self, frames: list[FrameFeatures], whole_conf: float, depth: int = 0) -> list[list[FrameFeatures]]:
        """Split a long segment where the classifier is confident about both parts (recursive, max 3 parts)."""
        s = self.settings
        if depth >= 2 or not frames or frames[-1].t - frames[0].t < s.split_long_min_ms:
            return [frames]
        best = None
        min_frames = max(6, int(s.min_sign_ms / 33.3))
        for i in range(min_frames, len(frames) - min_frames + 1, 2):
            a, b = self._predict(frames[:i]), self._predict(frames[i:])
            if a is None or b is None or a.label == NONE_LABEL or b.label == NONE_LABEL:
                continue
            lo = min(a.confidence, b.confidence)
            if lo >= s.confidence_threshold and lo > whole_conf and (best is None or lo > best[0]):
                best = (lo, i, a.confidence, b.confidence)
        if best is None:
            return [frames]
        _, i, ca, cb = best
        return self._best_split(frames[:i], ca, depth + 1) + self._best_split(frames[i:], cb, depth + 1)

    def _finish_segment(self, seg: Segment, allow_split: bool = True) -> list[dict]:
        """Decides one completed segment and attaches the privacy-safe trace of that decision."""
        self._last_trace = None
        events = self._decide_segment(seg, allow_split)
        for ev in events:
            if self._last_trace is not None and "trace" not in ev:
                ev["trace"] = self._last_trace
        return events

    def _decide_segment(self, seg: Segment, allow_split: bool = True) -> list[dict]:
        if allow_split and self.settings.split_long and self.predictor.loaded and seg.end_t - seg.start_t >= self.settings.split_long_min_ms:
            whole = self._predict(seg.frames)
            parts = self._best_split(seg.frames, whole.confidence if whole else 0.0) if whole else [seg.frames]
            if len(parts) > 1:
                events = []
                for part in parts:
                    events += self._finish_segment(Segment(frames=part, reason=f"{seg.reason}+verified_split",
                                                           start_t=part[0].t, end_t=part[-1].t), allow_split=False)
                for ev in events:
                    ev["boundary"] = "verified_split"
                return events
        self.smoother.reset()
        self.tentative = None
        self._since_eval = 0
        split_label, self._split_label = self._split_label, None     # a real boundary resets continuation
        base = {"frames": len(seg.frames), "reason": seg.reason,
                "duration_ms": round(seg.end_t - seg.start_t, 1)}
        if not self.predictor.loaded:
            return [{"type": "segment", **base, "result": "no_model",
                     "diagnosis": {"stage": "classification", "detail": "no trained model is loaded"}}]
        hand_frames = sum(1 for f in seg.frames if f.has_hands)
        pred = self._predict(seg.frames)
        try:
            self._last_trace = sign_trace(self.predictor, seg.frames, self.last_vector if pred is not None else None,
                                          self.settings.confidence_threshold, seg.reason,
                                          getattr(self.segmenter, "last_trimmed", 0))
        except Exception as exc:  # diagnostics must never break recognition
            self._last_trace = {"error": f"trace unavailable: {exc.__class__.__name__}"}
        if pred is None:
            return [{"type": "segment", **base, "result": "too_short",
                     "diagnosis": {"stage": "segmentation", "detail": f"only {hand_frames} usable hand frame(s) in the segment"}}]
        top = self._top(pred.probabilities)
        if pred.label == NONE_LABEL:
            return [{"type": "segment", **base, "result": "background", "top": top,
                     **self._diagnose("classification", "classified as no-sign / transition (_none)")}]
        margin = (top[0]["confidence"] - top[1]["confidence"]) if len(top) > 1 else top[0]["confidence"]
        is_confident = (pred.confidence >= self.settings.confidence_threshold) or (pred.confidence >= 0.30 and margin >= 0.16)
        if not is_confident:
            return [{"type": "uncertain", **base, "top": top,
                     **self._diagnose("classification", f"best guess '{pred.label}' {pred.confidence:.2f} (margin {margin:.2f}) is below the "
                                                        f"threshold {self.settings.confidence_threshold:.2f}")}]
        if pred.label == split_label:
            return [{"type": "segment", **base, "result": "continuation", "top": top,
                     "diagnosis": {"stage": "segmentation", "detail": "rest of the previous sign (continuation)"}}]
        if not self.vocab.emittable(pred.label):
            return [{"type": "segment", **base, "result": "no_kannada", "top": top,
                     "diagnosis": {"stage": "translation", "detail": f"'{pred.label}' has no Kannada text in labels.json"}}]
        events = self._emit(pred.label, pred.confidence, seg.end_t, pred.probabilities)
        if not events:
            return [{"type": "segment", **base, "result": "suppressed_duplicate", "top": top,
                     "diagnosis": {"stage": "segmentation", "detail": "same sign twice within 600 ms (duplicate suppressed)"}}]
        for ev in events:
            ev.update(self._diagnose("ok", f"recognised with confidence {pred.confidence:.2f}"))
            ev["segment"] = base
        return events

    # ---- sentence mode (continuous model) ---------------------------------
    def _process_sentence(self, frame: FrameFeatures) -> list[dict]:
        seg = self.segmenter.update(frame)
        if seg is None:
            # incremental, TENTATIVE gloss decode while the sentence is being signed (every ~0.5 s)
            self._since_eval += 1
            if (self.segmenter.active and self.continuous is not None and self.continuous.loaded
                    and self._since_eval >= PARTIAL_EVERY and len(self.segmenter.frames) >= 15):
                self._since_eval = 0
                try:
                    self.partial = self.continuous.partial(self.segmenter.frames)
                except Exception:  # a failed partial decode must never break recognition
                    self.partial = None
            elif not self.segmenter.active:
                self.partial = None
            return []
        self.partial = None
        self._since_eval = 0
        base = {"frames": len(seg.frames), "reason": seg.reason, "duration_ms": round(seg.end_t - seg.start_t, 1)}
        if self.continuous is None or not self.continuous.loaded:
            return [{"type": "segment", **base, "result": "no_continuous_model"}]
        start = time.perf_counter()
        result = self.continuous.recognize(seg.frames)
        self.last_latency_ms = (time.perf_counter() - start) * 1000.0
        if result is None:
            return [{"type": "segment", **base, "result": "too_short"}]
        return [{"type": "sentence", **base, **result}]

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
