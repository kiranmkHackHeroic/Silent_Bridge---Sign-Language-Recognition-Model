from __future__ import annotations

import pytest

from app.translation.kannada_mapping import KannadaSignMapper, Vocabulary
from app.translation.llm_kannada import LLMKannadaTranslator, get_llm_translator
from app.translation.semantic import SemanticTranslator


def test_llm_translator_rule_based_fallback():
    t = LLMKannadaTranslator()
    t._backend = "rules"
    t._detected = True

    # Test dative case insertion for location + verb
    res = t.translate(["I", "HOSPITAL", "GO"], ["I", "Hospital", "Go"], "ನಾನು ಆಸ್ಪತ್ರೆ ಹೋಗು")
    assert res.method == "rules"
    assert "ಆಸ್ಪತ್ರೆಗೆ" in res.kannada

    # Test question marker from lexical gloss
    res_q = t.translate(["YOU", "NAME", "WHAT"], ["You", "Name", "What"], "ನೀವು ಹೆಸರು ಏನು")
    assert res_q.kannada.endswith("?")

    # Test caching
    res_cached = t.translate(["I", "HOSPITAL", "GO"], ["I", "Hospital", "Go"], "ನಾನು ಆಸ್ಪತ್ರೆ ಹೋಗು")
    assert res_cached.cached is True
    assert res_cached.kannada == res.kannada


def test_non_manual_question_marker():
    t = LLMKannadaTranslator()
    t._backend = "rules"
    t._detected = True

    # Raised eyebrows (question_yn) turns a statement into a question
    res = t.translate(
        ["YOU", "WATER", "DRINK"],
        ["You", "Water", "Drink"],
        "ನೀವು ನೀರು ಕುಡಿ",
        non_manual={"marker": "question_yn", "confidence": 0.85, "label": "Yes/No Question (Raised Eyebrows)"}
    )
    assert res.kannada.endswith("?")


def test_non_manual_negation_marker():
    t = LLMKannadaTranslator()
    t._backend = "rules"
    t._detected = True

    # Head shake / frown (negation) adds negative modifier
    res = t.translate(
        ["I", "EAT"],
        ["I", "Eat"],
        "ನಾನು ಊಟ",
        non_manual={"marker": "negation", "confidence": 0.9, "label": "Negation (Head Shake / Frown)"}
    )
    assert "ಇಲ್ಲ" in res.kannada or "ಬೇಡ" in res.kannada


def test_clean_output():
    t = LLMKannadaTranslator()
    assert t._clean_output('```\n"ನಮಸ್ಕಾರ"\n```') == "ನಮಸ್ಕಾರ"
    assert t._clean_output("Natural Kannada: ನೀವು ಹೇಗಿದ್ದೀರಿ?") == "ನೀವು ಹೇಗಿದ್ದೀರಿ?"


def test_semantic_translator_integration():
    v = Vocabulary()
    m = KannadaSignMapper()
    st = SemanticTranslator(v, m)

    res = st.translate(["namaskara"])
    assert "natural_kannada" in res
    assert "llm_method" in res
    assert res["natural_kannada"] != ""
    assert res["llm_method"] in ("rules", "gemini", "ollama")

    # With non-manual marker
    res_nm = st.translate(["water"], non_manual={"marker": "question_yn", "confidence": 0.8})
    assert res_nm["natural_kannada"].endswith("?")
    assert res_nm["non_manual"]["marker"] == "question_yn"
