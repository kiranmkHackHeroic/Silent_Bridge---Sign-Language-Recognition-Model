"""Rolling buffer of recent frames used by sliding-window recognition."""
from __future__ import annotations

from collections import deque

from .landmarks import FrameFeatures


class SequenceBuffer:
    def __init__(self, maxlen: int):
        if maxlen < 1:
            raise ValueError("maxlen must be >= 1")
        self._frames: deque[FrameFeatures] = deque(maxlen=maxlen)
        self.frames_since_hands = 0     # consecutive most-recent frames without hands

    @property
    def maxlen(self) -> int:
        return self._frames.maxlen or 0

    def resize(self, maxlen: int) -> None:
        if maxlen != self.maxlen:
            self._frames = deque(list(self._frames)[-maxlen:], maxlen=max(1, maxlen))

    def append(self, frame: FrameFeatures) -> None:
        self._frames.append(frame)
        self.frames_since_hands = 0 if frame.has_hands else self.frames_since_hands + 1

    def clear(self) -> None:
        self._frames.clear()
        self.frames_since_hands = 0

    def frames(self) -> list[FrameFeatures]:
        return list(self._frames)

    def last(self) -> FrameFeatures | None:
        return self._frames[-1] if self._frames else None

    def hand_fraction(self) -> float:
        if not self._frames:
            return 0.0
        return sum(1 for f in self._frames if f.has_hands) / len(self._frames)

    def is_full(self) -> bool:
        return len(self._frames) == self.maxlen

    def __len__(self) -> int:
        return len(self._frames)
