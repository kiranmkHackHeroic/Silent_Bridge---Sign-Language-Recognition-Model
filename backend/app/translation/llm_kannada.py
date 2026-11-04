"""LLM-powered ISL gloss sequence → natural Kannada sentence translator.

Upgrades the word-by-word / phrase-table Kannada output to grammatically fluent,
natural Kannada prose using a lightweight LLM.  Supports three backends (tried in
order, first available wins):

  1. **Google Gemini API** – set env var GEMINI_API_KEY (free tier: 15 RPM).
  2. **Ollama (local)** – any model at http://localhost:11434 (e.g. gemma2:2b).
  3. **Rule-based fallback** – deterministic SOV reordering + vibhakti suffixes
     when no LLM is available (always works, no network needed).

The translator is sentence-level: it receives the full gloss sequence with per-word
English meanings and baseline Kannada, and returns one grammatically natural Kannada
sentence.  It does NOT replace the phrase table; it post-processes its output.

Thread-safe and lazy-initialised: the first call detects the available backend.
"""
from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
from dataclasses import dataclass
from typing import Any

log = logging.getLogger(__name__)

# ---------------------------------------------------------------- configuration
GEMINI_MODEL = "gemini-2.0-flash"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:2b")
REQUEST_TIMEOUT = 8          # seconds – keep the UI responsive
MAX_CACHE = 512              # LRU entries (gloss-key → Kannada)

# ---------------------------------------------------------------- system prompt
SYSTEM_PROMPT = """\
You are an expert Indian Sign Language (ISL) to Kannada translator.

You receive a sequence of ISL glosses with their English meanings and literal Kannada words,
along with any detected non-manual facial and head markers (which convey grammatical mood in ISL).
Your job is to produce ONE grammatically natural, fluent Kannada sentence that a native
Kannada speaker would actually say.

Rules:
1. Kannada follows Subject-Object-Verb (SOV) word order.
2. Add appropriate vibhakti (case suffixes): -ಗೆ (dative), -ಅನ್ನು (accusative),
   -ಇಂದ (ablative/instrumental), -ಲ್ಲಿ (locative) as needed.
3. Add copula verbs where Kannada requires them (ಇದೆ, ಆಗಿದೆ, etc.) even if ISL omits them.
4. Use polite/formal register (ನೀವು over ನೀನು, -ಿ / -ಿರಿ verb endings) unless context is clearly informal.
5. Non-manual grammatical markers:
   - 'question_yn' (raised eyebrows): translate as a Yes/No polar question (ending in -ಆ?, -ಇರಾ?, -ಬೇಕಾ?).
   - 'question_wh' (furrowed eyebrows): translate as an interrogative Wh-question (ಏನು?, ಎಲ್ಲಿ?, ಯಾಕೆ?).
   - 'negation' (head shake / frown): translate as a negative sentence (ending in ಇಲ್ಲ, ಬೇಡ, ಅಥವಾ ಆಗುವುದಿಲ್ಲ).
   - 'affirmation' (smile / head nod): translate with affirmative / polite confirmation.
6. For questions, always end with a ? mark.
7. Output ONLY the Kannada sentence. No explanations, no transliterations, no English.
8. If the glosses form a greeting or fixed expression, use the standard Kannada form.
9. Keep it concise – one sentence, natural spoken Kannada.
"""

FEW_SHOT_EXAMPLES = [
    # greetings
    {"glosses": "HELLO", "english": "Hello", "baseline_kannada": "ನಮಸ್ಕಾರ",
     "output": "ನಮಸ್ಕಾರ"},
    {"glosses": "GOOD MORNING", "english": "Good morning", "baseline_kannada": "ಶುಭ ಬೆಳಿಗ್ಗೆ",
     "output": "ಶುಭ ಬೆಳಿಗ್ಗೆ"},
    # SOV reordering
    {"glosses": "I HOSPITAL GO", "english": "I go to hospital", "baseline_kannada": "ನಾನು ಆಸ್ಪತ್ರೆ ಹೋಗು",
     "output": "ನಾನು ಆಸ್ಪತ್ರೆಗೆ ಹೋಗುತ್ತೇನೆ"},
    {"glosses": "YOU NAME WHAT", "english": "What is your name?", "baseline_kannada": "ನೀವು ಹೆಸರು ಏನು",
     "output": "ನಿಮ್ಮ ಹೆಸರು ಏನು?"},
    # copula insertion
    {"glosses": "HE DOCTOR", "english": "He is a doctor", "baseline_kannada": "ಅವನು ವೈದ್ಯ",
     "output": "ಅವನು ವೈದ್ಯನಾಗಿದ್ದಾನೆ"},
    # case markers
    {"glosses": "MOTHER MEDICINE GIVE", "english": "Mother gives medicine",
     "baseline_kannada": "ತಾಯಿ ಔಷಧಿ ಕೊಡು",
     "output": "ತಾಯಿ ಔಷಧಿಯನ್ನು ಕೊಡುತ್ತಾರೆ"},
    # negation
    {"glosses": "I SCHOOL GO NO", "english": "I don't go to school",
     "baseline_kannada": "ನಾನು ಶಾಲೆ ಹೋಗು ಇಲ್ಲ",
     "output": "ನಾನು ಶಾಲೆಗೆ ಹೋಗುವುದಿಲ್ಲ"},
    # question
    {"glosses": "HOW-ARE-YOU", "english": "How are you?", "baseline_kannada": "ನೀವು ಹೇಗಿದ್ದೀರಿ",
     "output": "ನೀವು ಹೇಗಿದ್ದೀರಿ?"},
    # family + possessives
    {"glosses": "MY FATHER GOOD MAN", "english": "My father is a good man",
     "baseline_kannada": "ನನ್ನ ತಂದೆ ಒಳ್ಳೆಯ ಮನುಷ್ಯ",
     "output": "ನನ್ನ ತಂದೆ ಒಳ್ಳೆಯ ಮನುಷ್ಯನಾಗಿದ್ದಾರೆ"},
]


@dataclass
class LLMTranslation:
    """Result of the LLM Kannada translation."""
    kannada: str                    # the natural Kannada sentence
    method: str                     # "gemini" | "ollama" | "rules" | "passthrough"
    latency_ms: float               # wall-clock time for this call
    cached: bool = False            # True if served from LRU cache
    error: str | None = None        # non-None if the LLM call failed (fallback used)


class LLMKannadaTranslator:
    """Lazy-initialised, cached, thread-safe LLM Kannada translator."""

    def __init__(self):
        self._lock = threading.Lock()
        self._backend: str | None = None        # detected backend name
        self._cache: dict[str, str] = {}         # gloss_key → Kannada
        self._cache_order: list[str] = []
        self._detected = False

    # ---------------------------------------------------------------- detection
    def _detect_backend(self) -> None:
        """Probe available LLM backends (once)."""
        if self._detected:
            return
        with self._lock:
            if self._detected:
                return
            # 1. Gemini API key?
            if os.getenv("GEMINI_API_KEY"):
                self._backend = "gemini"
                log.info("LLM Kannada translator: using Google Gemini API (%s)", GEMINI_MODEL)
            else:
                # 2. Ollama running locally?
                try:
                    import urllib.request
                    req = urllib.request.Request(f"{OLLAMA_URL}/api/tags", method="GET")
                    with urllib.request.urlopen(req, timeout=2) as resp:
                        if resp.status == 200:
                            self._backend = "ollama"
                            log.info("LLM Kannada translator: using Ollama at %s (%s)", OLLAMA_URL, OLLAMA_MODEL)
                except Exception:
                    pass
            if self._backend is None:
                self._backend = "rules"
                log.info("LLM Kannada translator: no LLM available, using rule-based fallback")
            self._detected = True

    @property
    def backend(self) -> str:
        self._detect_backend()
        return self._backend or "rules"

    def status(self) -> dict:
        """Status dict for the /api/health or /api/model/status endpoint."""
        return {
            "backend": self.backend,
            "cache_size": len(self._cache),
            "available": True,
        }

    # ---------------------------------------------------------------- public API
    def translate(self, glosses: list[str], english_meanings: list[str],
                  baseline_kannada: str, non_manual: dict | None = None) -> LLMTranslation:
        """Translate a gloss sequence to natural Kannada.

        Args:
            glosses: ISL gloss tokens in signing order, e.g. ["I", "HOSPITAL", "GO"]
            english_meanings: per-word English meanings, same length as glosses
            baseline_kannada: the word-by-word / phrase-table Kannada baseline
            non_manual: optional dict with facial/head markers (e.g. {"marker": "question_yn", "confidence": 0.8})
        """
        self._detect_backend()

        if not glosses:
            return LLMTranslation(kannada="", method="passthrough", latency_ms=0)

        # Check cache (including non-manual marker in key)
        marker = non_manual.get("marker", "statement") if isinstance(non_manual, dict) else "statement"
        cache_key = "|".join(glosses) + "::" + marker
        cached = self._cache.get(cache_key)
        if cached is not None:
            return LLMTranslation(kannada=cached, method=self._backend or "rules",
                                  latency_ms=0, cached=True)

        t0 = time.monotonic()
        result: LLMTranslation

        if self._backend == "gemini":
            result = self._call_gemini(glosses, english_meanings, baseline_kannada, non_manual)
        elif self._backend == "ollama":
            result = self._call_ollama(glosses, english_meanings, baseline_kannada, non_manual)
        else:
            result = self._rule_based(glosses, english_meanings, baseline_kannada, non_manual)

        result.latency_ms = round((time.monotonic() - t0) * 1000, 1)

        # Cache the result
        if result.kannada and not result.error:
            self._cache_put(cache_key, result.kannada)

        return result

    # ---------------------------------------------------------------- Gemini API
    def _call_gemini(self, glosses: list[str], english: list[str],
                     baseline: str, non_manual: dict | None = None) -> LLMTranslation:
        try:
            import urllib.request
            api_key = os.getenv("GEMINI_API_KEY", "")
            url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
                   f"{GEMINI_MODEL}:generateContent?key={api_key}")

            prompt = self._build_prompt(glosses, english, baseline, non_manual)
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 128,
                },
            }
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, method="POST",
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                body = json.loads(resp.read().decode("utf-8"))

            text = body["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Clean up: remove any quotes, backticks, or trailing punctuation the LLM may add
            text = self._clean_output(text)
            return LLMTranslation(kannada=text or baseline, method="gemini", latency_ms=0)

        except Exception as e:
            log.warning("Gemini API call failed: %s – falling back to rules", e)
            fb = self._rule_based(glosses, english, baseline, non_manual)
            fb.error = str(e)
            return fb

    # ---------------------------------------------------------------- Ollama (local)
    def _call_ollama(self, glosses: list[str], english: list[str],
                     baseline: str, non_manual: dict | None = None) -> LLMTranslation:
        try:
            import urllib.request
            prompt = self._build_prompt(glosses, english, baseline, non_manual)
            payload = {
                "model": OLLAMA_MODEL,
                "system": SYSTEM_PROMPT,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 128},
            }
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(f"{OLLAMA_URL}/api/generate", data=data,
                                         method="POST",
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                body = json.loads(resp.read().decode("utf-8"))

            text = self._clean_output(body.get("response", "").strip())
            return LLMTranslation(kannada=text or baseline, method="ollama", latency_ms=0)

        except Exception as e:
            log.warning("Ollama call failed: %s – falling back to rules", e)
            fb = self._rule_based(glosses, english, baseline, non_manual)
            fb.error = str(e)
            return fb

    # ---------------------------------------------------------------- rule-based fallback
    def _rule_based(self, glosses: list[str], english: list[str],
                    baseline: str, non_manual: dict | None = None) -> LLMTranslation:
        """Deterministic ISL-to-Kannada grammar rules (no network needed).

        Applies:
        1. SOV word-order adjustment (verb to end)
        2. Vibhakti (case suffix) insertion
        3. Copula insertion for predicate nominals
        4. Question marker for interrogative glosses & non-manual eyebrow markers
        5. Negation marker for negative glosses & non-manual head shake
        """
        if not baseline.strip():
            return LLMTranslation(kannada="", method="rules", latency_ms=0)

        words = baseline.split()
        gloss_upper = [g.upper() for g in glosses]

        marker = non_manual.get("marker", "statement") if isinstance(non_manual, dict) else "statement"

        # Detect question (from lexical glosses OR non-manual facial marker)
        is_question = any(g in ("WHAT", "WHERE", "WHEN", "WHY", "HOW", "WHO",
                                "HOW-ARE-YOU", "HOW_ARE_YOU") for g in gloss_upper)
        if marker in ("question_yn", "question_wh"):
            is_question = True

        # Detect negation (from lexical glosses OR non-manual head shake)
        has_negation = False
        if gloss_upper and gloss_upper[-1] in ("NO", "NOT"):
            has_negation = True
        if marker == "negation":
            has_negation = True

        # Predicate nominal pattern: [SUBJECT] [NOUN] (e.g., "HE DOCTOR" → "He is a doctor")
        # If no verb gloss and exactly 2 content words, insert copula
        verb_glosses = {"GO", "COME", "EAT", "DRINK", "SIT", "STAND", "SLEEP", "WRITE",
                        "STUDY", "WORK", "GIVE", "HELP", "STOP", "TRAIN"}
        has_verb = any(g in verb_glosses for g in gloss_upper)

        result = " ".join(words)

        # Rule 1: Add -ಗೆ (dative/directional) after location words when followed by movement verbs
        location_glosses = {"HOSPITAL", "SCHOOL", "HOME", "OFFICE", "TEMPLE", "MARKET",
                            "SHOP", "RESTAURANT", "RAILWAY_STATION", "CITY"}
        location_suffixes = {"ಆಸ್ಪತ್ರೆ": "ಆಸ್ಪತ್ರೆಗೆ", "ಶಾಲೆ": "ಶಾಲೆಗೆ", "ಮನೆ": "ಮನೆಗೆ",
                             "ಕಚೇರಿ": "ಕಚೇರಿಗೆ", "ದೇವಸ್ಥಾನ": "ದೇವಸ್ಥಾನಕ್ಕೆ",
                             "ಮಾರುಕಟ್ಟೆ": "ಮಾರುಕಟ್ಟೆಗೆ", "ಅಂಗಡಿ": "ಅಂಗಡಿಗೆ",
                             "ಉಪಾಹಾರ ಗೃಹ": "ಉಪಾಹಾರ ಗೃಹಕ್ಕೆ",
                             "ರೈಲ್ವೆ ನಿಲ್ದಾಣ": "ರೈಲ್ವೆ ನಿಲ್ದಾಣಕ್ಕೆ",
                             "ನಗರ": "ನಗರಕ್ಕೆ"}
        if has_verb:
            for kan_word, kan_with_suffix in location_suffixes.items():
                if kan_word in result and not kan_with_suffix in result:
                    result = result.replace(kan_word, kan_with_suffix, 1)

        # Rule 2: Insert copula for predicate nominals (no verb: "X Y" → "X Y+ಆಗಿದ್ದಾರೆ/ಆಗಿದೆ")
        if not has_verb and not is_question and not has_negation and len(words) >= 2:
            # Add copula ಆಗಿದೆ at end if not already present
            copula_words = {"ಆಗಿದೆ", "ಆಗಿದ್ದಾರೆ", "ಆಗಿದ್ದಾನೆ", "ಆಗಿದ್ದಾಳೆ", "ಇದೆ", "ಇದ್ದಾರೆ"}
            if not any(c in result for c in copula_words):
                # Check if subject is a person (he/she/they → ಆಗಿದ್ದಾರೆ, else ಆಗಿದೆ)
                person_glosses = {"HE", "SHE", "THEY", "FATHER", "MOTHER", "BROTHER",
                                  "SISTER", "DOCTOR", "TEACHER", "STUDENT", "FRIEND",
                                  "HUSBAND", "WIFE", "SON", "DAUGHTER", "BOY", "GIRL",
                                  "MAN", "WOMAN", "CHILD", "BABY", "GRANDFATHER",
                                  "GRANDMOTHER", "PATIENT"}
                if any(g in person_glosses for g in gloss_upper[:2]):
                    result = result + " ಆಗಿದ್ದಾರೆ"
                else:
                    result = result + " ಆಗಿದೆ"

        # Rule 3: Negation fusion (ಹೋಗು ಇಲ್ಲ → ಹೋಗುವುದಿಲ್ಲ)
        if has_negation:
            # Remove standalone ಇಲ್ಲ if it was in the middle, add at end
            result = result.replace(" ಇಲ್ಲ ", " ").rstrip()
            if not result.endswith("ಇಲ್ಲ") and not result.endswith("ಬೇಡ"):
                result = result + " ಇಲ್ಲ"

        # Rule 4: Question marker
        if is_question:
            if marker == "question_yn":
                # In Kannada, Yes/No question adds -ಆ? (e.g. ಬೇಕಾ?, ಹೋಗುತ್ತೀರಾ?)
                if not result.endswith("?") and not result.endswith("ಆ"):
                    result = result.rstrip(".") + "ವೇ?" if result.endswith("ಇಲ್ಲ") else result.rstrip(".") + "ಆ?"
                elif not result.endswith("?"):
                    result = result.rstrip(".") + "?"
            elif not result.endswith("?"):
                result = result.rstrip(".") + "?"

        return LLMTranslation(kannada=result.strip(), method="rules", latency_ms=0)

    # ---------------------------------------------------------------- helpers
    def _build_prompt(self, glosses: list[str], english: list[str],
                      baseline: str, non_manual: dict | None = None) -> str:
        """Build the few-shot prompt for the LLM."""
        lines = ["Translate the following ISL gloss sequence to natural Kannada.\n"]

        # Few-shot examples
        for ex in FEW_SHOT_EXAMPLES:
            lines.append(f"Glosses: {ex['glosses']}")
            lines.append(f"English: {ex['english']}")
            lines.append(f"Baseline Kannada: {ex['baseline_kannada']}")
            lines.append(f"Natural Kannada: {ex['output']}\n")

        # The actual request
        gloss_str = " ".join(glosses)
        english_str = " ".join(english)
        lines.append(f"Glosses: {gloss_str}")
        lines.append(f"English: {english_str}")
        lines.append(f"Baseline Kannada: {baseline}")
        if non_manual and non_manual.get("marker") and non_manual.get("marker") != "statement":
            lines.append(f"Non-manual marker: {non_manual.get('label', non_manual['marker'])} ({non_manual['marker']})")
        lines.append("Natural Kannada:")

        return "\n".join(lines)

    @staticmethod
    def _clean_output(text: str) -> str:
        """Strip LLM artefacts: quotes, backticks, prefixes like 'Natural Kannada:'."""
        text = text.strip()
        # Remove markdown code fences
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        # Remove quotes
        text = text.strip("\"'`""''")
        # Remove a repeated "Natural Kannada:" prefix
        text = re.sub(r"^(?:Natural\s*Kannada\s*:\s*)", "", text, flags=re.IGNORECASE)
        # Take only the first line if multi-line
        text = text.split("\n")[0].strip()
        return text

    def _cache_put(self, key: str, value: str) -> None:
        with self._lock:
            if key in self._cache:
                return
            if len(self._cache_order) >= MAX_CACHE:
                evict = self._cache_order.pop(0)
                self._cache.pop(evict, None)
            self._cache[key] = value
            self._cache_order.append(key)


# Module-level singleton (lazy)
_translator: LLMKannadaTranslator | None = None
_translator_lock = threading.Lock()


def get_llm_translator() -> LLMKannadaTranslator:
    """Return the module-level singleton LLM translator."""
    global _translator
    if _translator is None:
        with _translator_lock:
            if _translator is None:
                _translator = LLMKannadaTranslator()
    return _translator

