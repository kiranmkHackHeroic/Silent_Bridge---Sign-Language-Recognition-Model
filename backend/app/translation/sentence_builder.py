"""Builds the running Kannada transcript from stable sign events."""
from __future__ import annotations

from dataclasses import asdict, dataclass

from .kannada_mapping import Vocabulary


@dataclass
class TranscriptToken:
    label: str
    kannada: str
    english: str
    confidence: float
    source: str          # "model" | "simulated"
    t: float

    def to_dict(self) -> dict:
        return asdict(self)


class SentenceBuilder:
    """Accepts recognized labels and keeps a duplicate-suppressed transcript.

    Non-emittable labels (e.g. '_none', unknown, labels without Kannada text) are
    rejected. A repeat of the previous label within `min_repeat_ms` is treated as
    a double detection of the same sign and suppressed; a later repeat is a new
    occurrence of the sign and is kept.
    """

    def __init__(self, vocab: Vocabulary, min_repeat_ms: float = 600.0):
        self.vocab = vocab
        self.min_repeat_ms = min_repeat_ms
        self.tokens: list[TranscriptToken] = []

    def add(self, label: str, confidence: float, t: float, source: str = "model") -> TranscriptToken | None:
        if not self.vocab.emittable(label):
            return None
        if self.tokens:
            last = self.tokens[-1]
            if last.label == label and (t - last.t) < self.min_repeat_ms:
                return None
        entry = self.vocab.get(label)
        token = TranscriptToken(label, entry.kannada, entry.english, round(float(confidence), 4), source, t)
        self.tokens.append(token)
        return token

    def text(self) -> str:
        return " ".join(tok.kannada for tok in self.tokens)

    def clear(self) -> None:
        self.tokens.clear()
