"""Prediction smoothing and stable-prediction gating for sliding-window mode."""
from __future__ import annotations

import numpy as np


class ProbabilitySmoother:
    """Exponential moving average over class-probability vectors."""

    def __init__(self, alpha: float = 0.4):
        if not 0.0 < alpha <= 1.0:
            raise ValueError("alpha must be in (0, 1]")
        self.alpha = alpha
        self.value: np.ndarray | None = None

    def update(self, probs: np.ndarray) -> np.ndarray:
        probs = np.asarray(probs, dtype=np.float64)
        if self.value is None or self.value.shape != probs.shape:
            self.value = probs.copy()
        else:
            self.value = self.alpha * probs + (1.0 - self.alpha) * self.value
        return self.value

    def reset(self) -> None:
        self.value = None


class StablePredictionGate:
    """Emits a label once when it has been stable and confident; then locks it.

    * A label is emitted after `stable_evals` consecutive evaluations agree with
      probability >= threshold.
    * The emitted label is locked so a held/stationary sign is not repeated.
    * The lock is released after a boundary (hands removed), or when the locked
      label's probability stays below threshold - release_margin for
      `release_evals` evaluations, so the same sign can be recognized again when
      it is performed again.
    * `cooldown_ms` enforces a minimum gap between any two emissions.
    """

    def __init__(self, threshold: float = 0.6, stable_evals: int = 3, release_margin: float = 0.2,
                 release_evals: int = 4, cooldown_ms: float = 700, ignore: set[str] | None = None):
        self.threshold = threshold
        self.stable_evals = max(1, stable_evals)
        self.release_margin = release_margin
        self.release_evals = max(1, release_evals)
        self.cooldown_ms = cooldown_ms
        self.ignore = ignore or set()
        self.reset()

    def reset(self) -> None:
        self.candidate: str | None = None
        self.count = 0
        self.locked: str | None = None
        self._below = 0
        self._last_emit_t = float("-inf")

    def notify_boundary(self) -> None:
        self.locked = None
        self.candidate = None
        self.count = 0
        self._below = 0

    def update(self, label: str, prob: float, t: float) -> str | None:
        if self.locked is not None:
            if label == self.locked and prob >= self.threshold - self.release_margin:
                self._below = 0
            else:
                self._below += 1
                if self._below >= self.release_evals:
                    self.locked = None
                    self._below = 0

        if prob < self.threshold or label in self.ignore:
            self.candidate = None
            self.count = 0
            return None
        if label == self.candidate:
            self.count += 1
        else:
            self.candidate = label
            self.count = 1
        if (self.count >= self.stable_evals and label != self.locked
                and t - self._last_emit_t >= self.cooldown_ms):
            self.locked = label
            self._last_emit_t = t
            self.count = 0
            self._below = 0
            return label
        return None
