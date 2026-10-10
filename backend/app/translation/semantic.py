"""Intermediate semantic layer: recognised signs -> ISL gloss sequence -> English meaning -> Kannada.

Stages (kept separate in every result):
  1. gloss normalisation   model class labels -> canonical ISL glosses (labels.json); unknown labels are
                           reported, never guessed
  2. English meaning       the WHOLE gloss sequence is matched against the phrase table (longest match
                           first), because the meaning of e.g. YOU EAT depends on the sequence, not on
                           each sign; leftover signs get word-level English glosses, explicitly marked
  3. Kannada               the Kannada sentence of the matched phrase (same phrase entry as the English);
                           leftover signs fall back to Kannada gloss words, explicitly marked
  4. unknown / ambiguous   unknown labels, word-by-word leftovers and sequences with several possible
                           meanings (e.g. statement vs question, which ISL marks with the face) are flagged
                           and alternatives returned

The phrase table is data/kannada_sign_mapping.json (entries with a category): one entry holds the sign
sequence (ISL order), its English meaning and its Kannada sentence, so English and Kannada can never
drift apart. English is a semantic representation for display and lookup; no machine translation model
is used, and nothing here receives video.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..config import NONE_LABEL
from .kannada_mapping import KannadaSignMapper, Vocabulary, clean_display_text, normalize_kannada


@dataclass
class Phrase:
    key: str                 # normalised Kannada key in the mapping file
    sign_ids: tuple[str, ...]
    english: str
    kannada: str
    category: str
    verified: bool
    source: str
    notes: str


class SemanticTranslator:
    def __init__(self, vocab: Vocabulary, mapper: KannadaSignMapper, trained_classes: list[str] | None = None):
        self.vocab = vocab
        self.mapper = mapper
        self.trained = set(trained_classes or [])
        self.reload()

    def reload(self) -> None:
        self.by_signs: dict[tuple[str, ...], list[Phrase]] = {}
        for key, e in self.mapper.entries.items():
            if not e.get("category") or not e.get("english"):
                continue                       # aliases / plain words are not phrase meanings
            ph = Phrase(key, tuple(e["sign_ids"]), e["english"], e["display"], e["category"], e["verified"],
                        e["source"], e["notes"])
            self.by_signs.setdefault(ph.sign_ids, []).append(ph)
        self.max_len = max((len(k) for k in self.by_signs), default=1)

    # ---------------------------------------------------------------- stage 1
    def normalize_glosses(self, labels: list[str]) -> list[dict]:
        out = []
        for lab in labels:
            lab = (lab or "").strip()
            if not lab or lab == NONE_LABEL:
                continue
            entry = self.vocab.get(lab)
            if entry is None:
                out.append({"sign_id": lab, "gloss": lab.upper(), "known": False, "english": "", "kannada": "",
                            "recognisable": False})
                continue
            out.append({"sign_id": lab, "gloss": entry.isl_gloss or lab.upper(), "known": True,
                        "english": entry.english, "kannada": entry.kannada, "recognisable": lab in self.trained,
                        "verified": entry.verified})
        return out

    # ---------------------------------------------------------------- stages 2-4
    def translate(self, labels: list[str]) -> dict:
        """Recognised sign labels (in signing order) -> structured meaning."""
        glosses = self.normalize_glosses(labels)
        ids = [g["sign_id"] for g in glosses]
        segments, i = [], 0
        while i < len(ids):
            match = None
            for n in range(min(self.max_len, len(ids) - i), 0, -1):
                cands = self.by_signs.get(tuple(ids[i:i + n]))
                if cands:
                    match = (n, cands)
                    break
            if match:
                n, cands = match
                main = cands[0]
                segments.append({
                    "type": "phrase", "sign_ids": list(main.sign_ids), "glosses": [g["gloss"] for g in glosses[i:i + n]],
                    "english": main.english, "kannada": main.kannada, "category": main.category,
                    "verified": main.verified, "source": main.source, "notes": main.notes,
                    "ambiguous": len(cands) > 1,
                    "alternatives": [{"english": c.english, "kannada": c.kannada, "notes": c.notes} for c in cands[1:]],
                })
                i += n
            else:
                g = glosses[i]
                if g["known"]:
                    segments.append({"type": "word", "sign_ids": [g["sign_id"]], "glosses": [g["gloss"]],
                                     "english": g["english"], "kannada": g["kannada"], "verified": False,
                                     "source": "word gloss (labels.json)", "ambiguous": False, "alternatives": []})
                else:
                    segments.append({"type": "unknown", "sign_ids": [g["sign_id"]], "glosses": [g["gloss"]],
                                     "english": "", "kannada": "", "verified": False, "source": None,
                                     "ambiguous": False, "alternatives": []})
                i += 1
        phrase_signs = sum(len(s["sign_ids"]) for s in segments if s["type"] == "phrase")
        n = len(ids)
        if n == 0:
            status = "empty"
        elif any(s["type"] == "unknown" for s in segments):
            status = "unsupported"
        elif phrase_signs == n and len(segments) == 1:
            status = "phrase"
        elif phrase_signs == n:
            status = "phrases"
        elif phrase_signs > 0:
            status = "partial"
        else:
            status = "word_by_word"
        return {
            "gloss_sequence": [g["gloss"] for g in glosses],
            "sign_ids": ids,
            "english_text": self._join_english(segments),
            "kannada_text": self._join_kannada(segments),
            "segments": segments,
            "status": status,
            "phrase_coverage": round(phrase_signs / n, 3) if n else 0.0,
            "ambiguous": any(s["ambiguous"] for s in segments),
            "unknown": [s["glosses"][0] for s in segments if s["type"] == "unknown"],
            "verified": bool(segments) and all(s["verified"] for s in segments),
            "method": "phrase table (sequence-level), English meaning and Kannada from the same entry",
        }

    def direct_kannada(self, labels: list[str]) -> str:
        """Baseline: each sign's Kannada gloss word in signing order (no sequence-level meaning)."""
        return " ".join(g["kannada"] for g in self.normalize_glosses(labels) if g["kannada"])

    @staticmethod
    def _join_english(segments: list[dict]) -> str:
        parts = []
        for s in segments:
            if s["type"] == "phrase":
                parts.append(s["english"])
            elif s["type"] == "word":
                parts.append(f"[{s['english'].split('/')[0].strip().lower()}]")
            else:
                parts.append(f"[unknown sign {s['glosses'][0]}]")
        return " ".join(parts)

    @staticmethod
    def _join_kannada(segments: list[dict]) -> str:
        return clean_display_text(" ".join(s["kannada"] for s in segments if s["kannada"]))

    # ---------------------------------------------------------------- reverse: Kannada -> meaning -> signs
    def reverse(self, text: str) -> dict:
        """Kannada text -> phrase analysis -> English meaning -> ISL sign sequence (from validated mappings
        only; English word order is never used as sign order)."""
        items = self.mapper.translate(normalize_kannada(text))
        plan = []
        for it in items:
            english = it.get("english") or ""
            if it["supported"] and not english:          # alias / single word: English from the label
                english = " ".join(self.vocab.get(s).english for s in it["sign_ids"] if self.vocab.get(s))
            plan.append({"text": it["text"], "supported": it["supported"], "phrase": it["phrase"],
                         "english": english, "sign_ids": it["sign_ids"],
                         "glosses": [(self.vocab.get(s).isl_gloss if self.vocab.get(s) else s.upper()) for s in it["sign_ids"]],
                         "mapping_source": it.get("source"), "verified": it.get("verified", False)})
        return {"items": plan,
                "english_meaning": " ".join(p["english"] for p in plan if p["english"]),
                "gloss_sequence": [g for p in plan for g in p["glosses"]],
                "unsupported": [p["text"] for p in plan if not p["supported"]]}
