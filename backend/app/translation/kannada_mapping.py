"""Vocabulary (sign label -> Kannada) and Kannada text -> sign-sequence lookup.

Two different normalizations are used on purpose:
  * clean_display_text(): for text that is SHOWN or STORED (NFC, tidy spaces).
    It keeps ZWJ/ZWNJ because they can change how Kannada conjuncts render.
  * normalize_kannada(): for MATCHING lookup keys only (also drops zero-width
    joiners and punctuation so "ನಮಸ್ಕಾರ!" and "ನಮಸ್ಕಾರ" match).
No ASCII conversion or character filtering is ever applied to Kannada letters,
vowel signs (matras) or viramas.

This is lexical / phrase lookup of supported signs, not grammatical
Kannada-to-ISL translation.
"""
from __future__ import annotations

import json
import re
import threading
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path

from ..config import KANNADA_MAPPING_FILE, LABELS_FILE, NONE_LABEL

_ZERO_WIDTH_ALL = dict.fromkeys(map(ord, "​‌‍﻿⁠"), None)
_ZERO_WIDTH_INVISIBLE = dict.fromkeys(map(ord, "​﻿⁠"), None)   # keeps ZWNJ/ZWJ
LABEL_RE = re.compile(r"^[a-z0-9_]{1,40}$")
KANNADA_BLOCK = (0x0C80, 0x0CFF)


def clean_display_text(text: str) -> str:
    """NFC + collapse whitespace; keeps punctuation and ZWJ/ZWNJ (safe for display/storage)."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    text = unicodedata.normalize("NFC", text).translate(_ZERO_WIDTH_INVISIBLE)
    return " ".join(text.split())


def normalize_kannada(text: str) -> str:
    """Lookup key: NFC, zero-width characters and punctuation removed, spaces collapsed.

    Kannada vowel signs and viramas (Unicode categories Mn/Mc) are preserved;
    only punctuation (P*), symbols (S*) and separators (Z*) become spaces.
    """
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    text = unicodedata.normalize("NFC", text).translate(_ZERO_WIDTH_ALL)
    cleaned = []
    for ch in text:
        cat = unicodedata.category(ch)
        if cat[0] in "PSZ" or ch in "\t\r\n":
            cleaned.append(" ")
        else:
            cleaned.append(ch)
    return " ".join("".join(cleaned).split())


def is_kannada(text: str) -> bool:
    return any(KANNADA_BLOCK[0] <= ord(c) <= KANNADA_BLOCK[1] for c in text)


@dataclass
class VocabEntry:
    label: str
    english: str
    kannada: str
    emit: bool = True
    isl_gloss: str = ""
    verified: bool = False
    notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


class Vocabulary:
    def __init__(self, labels_file: Path = LABELS_FILE):
        self.labels_file = Path(labels_file)
        self._lock = threading.Lock()
        self.entries: dict[str, VocabEntry] = {}
        self.load()

    def load(self) -> None:
        data = json.loads(self.labels_file.read_text(encoding="utf-8"))
        entries = {}
        for item in data.get("labels", []):
            label = item["label"]
            if not LABEL_RE.match(label):
                raise ValueError(f"invalid label id: {label!r}")
            entries[label] = VocabEntry(
                label=label,
                english=item.get("english", label),
                kannada=clean_display_text(item.get("kannada", "")),
                emit=bool(item.get("emit", label != NONE_LABEL)),
                isl_gloss=item.get("isl_gloss", label.upper()),
                verified=bool(item.get("verified", False)),
                notes=item.get("notes", ""),
            )
        if NONE_LABEL not in entries:
            entries[NONE_LABEL] = VocabEntry(NONE_LABEL, "(no sign)", "", emit=False)
        self.entries = entries

    def save(self) -> None:
        data = json.loads(self.labels_file.read_text(encoding="utf-8"))
        data["labels"] = [
            {k: v for k, v in e.to_dict().items() if not (k == "emit" and v)} for e in self.entries.values()
        ]
        self.labels_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def upsert(self, label: str, english: str, kannada: str, isl_gloss: str = "") -> VocabEntry:
        if not LABEL_RE.match(label) or label == NONE_LABEL:
            raise ValueError("label must be 1-40 chars of a-z, 0-9 or _ and not '_none'")
        kannada = clean_display_text(kannada)
        if not kannada or not is_kannada(kannada):
            raise ValueError("Kannada text (in Kannada script) is required")
        with self._lock:
            entry = VocabEntry(label, english.strip() or label, kannada,
                               isl_gloss=(isl_gloss.strip() or label.upper()), verified=False,
                               notes="added from the Dataset & Model page")
            self.entries[label] = entry
            self.save()
        return entry

    def get(self, label: str) -> VocabEntry | None:
        return self.entries.get(label)

    def kannada_for(self, label: str) -> str | None:
        entry = self.entries.get(label)
        return entry.kannada if entry and entry.kannada else None

    def emittable(self, label: str) -> bool:
        entry = self.entries.get(label)
        return bool(entry and entry.emit and entry.kannada)

    def to_list(self) -> list[dict]:
        return [e.to_dict() for e in self.entries.values()]


class KannadaSignMapper:
    """Kannada word/phrase -> ordered sign IDs, with longest-match phrase support."""

    def __init__(self, mapping_file: Path = KANNADA_MAPPING_FILE):
        self.mapping_file = Path(mapping_file)
        self.load()

    def load(self) -> None:
        data = json.loads(self.mapping_file.read_text(encoding="utf-8"))
        entries = data.get("entries", data)
        self.entries: dict[str, dict] = {}
        for key, value in entries.items():
            if key.startswith("_") or not isinstance(value, dict):
                continue
            sign_ids = value.get("sign_ids") or ([value["sign_id"]] if value.get("sign_id") else [])
            norm = normalize_kannada(key)
            if norm and sign_ids:
                self.entries[norm] = {
                    "sign_ids": list(sign_ids),
                    "verified": bool(value.get("verified", False)),
                    "source": value.get("source", "unspecified"),
                    "notes": value.get("notes", ""),
                }
        self.max_words = max((len(k.split()) for k in self.entries), default=1)

    def add(self, word: str, sign_id: str, source: str) -> bool:
        """Adds an unverified word -> sign entry (no-op if the word already exists)."""
        norm = normalize_kannada(word)
        if not norm or norm in self.entries:
            return False
        data = json.loads(self.mapping_file.read_text(encoding="utf-8"))
        data.setdefault("entries", {})[norm] = {"sign_ids": [sign_id], "verified": False, "source": source, "notes": ""}
        self.mapping_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        self.load()
        return True

    def translate(self, text: str) -> list[dict]:
        """Ordered items: {"text", "supported", "phrase", "sign_ids", "verified", "source", "notes"}."""
        tokens = normalize_kannada(text).split()
        items: list[dict] = []
        i = 0
        while i < len(tokens):
            match = None
            for n in range(min(self.max_words, len(tokens) - i), 0, -1):
                phrase = " ".join(tokens[i:i + n])
                if phrase in self.entries:
                    match = (phrase, n)
                    break
            if match:
                phrase, n = match
                entry = self.entries[phrase]
                items.append({"text": phrase, "supported": True, "phrase": n > 1, **entry})
                i += n
            else:
                items.append({"text": tokens[i], "supported": False, "phrase": False, "sign_ids": [],
                              "verified": False, "source": None, "notes": ""})
                i += 1
        return items
