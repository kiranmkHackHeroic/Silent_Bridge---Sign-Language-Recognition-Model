"""Activity-based sign segmentation (event-based continuous recognition).

A sign starts when hands enter the view or start moving, and ends at an inactivity
boundary: the hands are held still for `still_ms`, leave the frame for
`absent_ms`, or the segment exceeds `max_segment_ms`. Each completed segment is
classified exactly once, so a stationary hand never produces repeated words, and
performing the same sign again (new movement) produces a new segment.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass

from ..config import RecognitionSettings
from .landmarks import FrameFeatures


@dataclass
class Segment:
    frames: list[FrameFeatures]
    reason: str          # "still" | "absent" | "max" | "flush"
    start_t: float
    end_t: float


class ActivitySegmenter:
    def __init__(self, settings: RecognitionSettings):
        self.settings = settings
        self.reset()

    def reset(self) -> None:
        self.active = False
        self.frames: list[FrameFeatures] = []
        self._preroll: deque[FrameFeatures] = deque(maxlen=max(1, self.settings.preroll_frames + 1))
        self._start_count = 0
        self._still_ms = 0.0
        self._still_from = 0          # index in self.frames where the current stillness began
        self._absent_ms = 0.0
        self._start_t = 0.0
        self._last_t: float | None = None
        self._absent_streak = 3
        self.motion_ema = 0.0
        self._peak = 0.0
        self._dip_ms = 0.0
        self._dip_armed = True
        self.split_candidate = False

    def _end(self, reason: str, t: float) -> Segment:
        frames = self.frames
        self.last_trimmed = 0
        if reason == "still" and self.settings.trim_still_tail and self._still_from > 0:
            self.last_trimmed = len(frames) - (self._still_from + 1)
            frames = frames[: self._still_from + 1]          # keep the frame where the hold began
        seg = Segment(frames=frames, reason=reason, start_t=self._start_t, end_t=t)
        self.active = False
        self.frames = []
        self._start_count = 0
        self._still_ms = 0.0
        self._still_from = 0
        self._absent_ms = 0.0
        self._absent_streak = 0
        self._reset_dip()
        return seg

    def _reset_dip(self) -> None:
        self._peak = 0.0
        self._dip_ms = 0.0
        self._dip_armed = True
        self.split_candidate = False

    def split(self) -> Segment | None:
        """Close the current sign at a motion minimum and immediately start the next one.

        Called by the pipeline only after the classifier confirmed the frames so far
        form a confident sign, so continuous signing does not need pauses."""
        if not self.active or not self.frames:
            return None
        t = self.frames[-1].t
        seg = Segment(frames=self.frames, reason="dip", start_t=self._start_t, end_t=t)
        self.frames = [self.frames[-1]]
        self._start_t = t
        self._still_ms = 0.0
        self._still_from = 0
        self._reset_dip()
        self._dip_armed = False            # re-arm only after the hand speeds up again
        return seg

    def update(self, frame: FrameFeatures) -> Segment | None:
        s = self.settings
        dt = 33.3 if self._last_t is None else min(max(frame.t - self._last_t, 0.0), 250.0)
        self._last_t = frame.t
        if frame.has_hands:
            self.motion_ema = 0.5 * frame.motion + 0.5 * self.motion_ema
        else:
            self.motion_ema *= 0.5
        self._preroll.append(frame)

        if not self.active:
            if frame.has_hands:
                appeared = self._absent_streak >= 3          # hands just entered the view
                self._absent_streak = 0
                if appeared:
                    self._start_count = 2                     # start immediately
                elif self.motion_ema >= s.motion_start:
                    self._start_count += 1
                else:
                    self._start_count = 0
            else:
                self._absent_streak += 1
                self._start_count = 0
            if self._start_count >= 2:
                self.active = True
                self.frames = [f for f in self._preroll if f.has_hands]
                self._start_t = self.frames[0].t if self.frames else frame.t
                self._still_ms = 0.0
                self._still_from = 0
                self._absent_ms = 0.0
            return None

        if frame.has_hands:
            self.frames.append(frame)
            self._absent_ms = 0.0
            if self.motion_ema < s.motion_still:
                if self._still_ms == 0.0:
                    self._still_from = len(self.frames) - 1
                self._still_ms += dt
            else:
                self._still_ms = 0.0
                self._still_from = 0
            self._track_dip(frame, dt)
        else:
            self._absent_ms += dt

        if self._absent_ms >= s.absent_ms:
            return self._end("absent", frame.t)
        if self._still_ms >= s.still_ms:
            return self._end("still", frame.t)
        if frame.t - self._start_t >= s.max_segment_ms:
            return self._end("max", frame.t)
        return None

    def _track_dip(self, frame: FrameFeatures, dt: float) -> None:
        s = self.settings
        self.split_candidate = False
        if not s.dip_split:
            return
        self._peak = max(self._peak, self.motion_ema)
        if not self._dip_armed:
            if self.motion_ema > 0.6 * self._peak and self.motion_ema >= s.motion_start:
                self._dip_armed = True
            return
        long_enough = frame.t - self._start_t >= s.min_sign_ms
        if self._peak >= 2 * s.motion_start and self.motion_ema < s.dip_ratio * self._peak:
            self._dip_ms += dt
            if long_enough and self._dip_ms >= s.dip_ms:
                self.split_candidate = True
                self._dip_armed = False
        else:
            self._dip_ms = 0.0

    def flush(self) -> Segment | None:
        """Force the current segment to end (explicit boundary / pause)."""
        if not self.active:
            return None
        return self._end("flush", self._last_t or 0.0)
