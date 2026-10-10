"""Intermediate language layer: gloss sequence -> English meaning -> Kannada, and the reverse.

Uses the project's real vocabulary and phrase table (data files), no landmark data.
"""
import json
import shutil
import unicodedata

import pytest
from fastapi.testclient import TestClient

from app.config import KANNADA_MAPPING_FILE, LABELS_FILE
from app.translation.kannada_mapping import KannadaSignMapper, Vocabulary, is_kannada, normalize_kannada
from app.translation.semantic import SemanticTranslator

TRAINED = ["namaskara", "how_are_you", "i_me", "good", "you", "name", "eat", "she", "mother", "tomorrow", "work",
           "help", "teacher", "student", "cat", "thank_you"]


@pytest.fixture(scope="module")
def tr():
    return SemanticTranslator(Vocabulary(LABELS_FILE), KannadaSignMapper(KANNADA_MAPPING_FILE), TRAINED)


def test_phrase_table_integrity():
    vocab = Vocabulary(LABELS_FILE)
    data = json.loads(KANNADA_MAPPING_FILE.read_text(encoding="utf-8"))["entries"]
    phrases = {k: v for k, v in data.items() if v.get("category")}
    assert len(phrases) >= 60
    for key, e in phrases.items():
        assert key == normalize_kannada(key), key                      # keys are lookup-normalised
        assert e["sign_ids"] and all(vocab.get(s) for s in e["sign_ids"]), key   # no invented glosses
        assert e["english"].strip() and is_kannada(e["display"]), key
        assert unicodedata.normalize("NFC", e["display"]) == e["display"], key
        assert e["verified"] is False, key                              # nothing is claimed as reviewed


def test_phase5_phrases_use_only_recognisable_signs():
    from app.training.registry import active_paths
    classes = set(json.loads(active_paths()[1].read_text(encoding="utf-8"))["classes"])
    data = json.loads(KANNADA_MAPPING_FILE.read_text(encoding="utf-8"))["entries"]
    phase5 = [e for e in data.values() if str(e.get("source", "")).startswith("phase-5")]
    assert len(phase5) >= 35
    assert all(set(e["sign_ids"]) <= classes for e in phase5)


def test_sequence_level_meaning_not_word_by_word(tr):
    r = tr.translate(["she", "i_me", "mother"])
    assert r["gloss_sequence"] == ["SHE", "I/ME", "MOTHER"]
    assert r["english_text"] == "She is my mother." and r["kannada_text"] == "ಅವಳು ನನ್ನ ತಾಯಿ"
    assert r["status"] == "phrase" and r["verified"] is False
    assert tr.direct_kannada(["she", "i_me", "mother"]) == "ಅವಳು ನಾನು ತಾಯಿ"      # the baseline differs


def test_longest_match_and_several_phrases(tr):
    r = tr.translate(["namaskara", "how_are_you", "i_me", "good"])
    assert [s["type"] for s in r["segments"]] == ["phrase", "phrase"]
    assert r["english_text"] == "Hello, how are you? I am fine."
    assert r["status"] == "phrases"
    r2 = tr.translate(["tomorrow", "i_me", "work"])
    assert r2["english_text"] == "I will work tomorrow." and len(r2["segments"]) == 1


def test_ambiguous_sequence_offers_alternatives(tr):
    r = tr.translate(["you", "eat"])
    seg = r["segments"][0]
    assert r["ambiguous"] and seg["english"] == "Did you eat?"
    assert [a["english"] for a in seg["alternatives"]] == ["Please eat."]
    assert "facial expression" in seg["notes"]


def test_word_by_word_and_unknown_signs_are_flagged(tr):
    r = tr.translate(["i_me", "cat"])
    assert r["status"] == "word_by_word" and r["english_text"] == "[i] [cat]"
    assert r["kannada_text"] == "ನಾನು ಬೆಕ್ಕು"
    u = tr.translate(["cat", "not_a_sign"])
    assert u["status"] == "unsupported" and u["unknown"] == ["NOT_A_SIGN"]
    assert "unknown sign NOT_A_SIGN" in u["english_text"] and "NOT_A_SIGN" not in u["kannada_text"]
    assert tr.translate([])["status"] == "empty"
    assert tr.translate(["_none", "_none"])["status"] == "empty"            # non-sign class never translated


def test_reverse_uses_isl_mapping_not_english_word_order(tr):
    r = tr.reverse("ನಾಳೆ ನಾನು ಕೆಲಸ ಮಾಡುತ್ತೇನೆ ಬೆಂಗಳೂರು")
    assert r["gloss_sequence"] == ["TOMORROW", "I/ME", "WORK"]             # time first (ISL), not "I WORK TOMORROW"
    assert r["english_meaning"] == "I will work tomorrow."
    assert r["unsupported"] == ["ಬೆಂಗಳೂರು"]
    assert r["items"][0]["mapping_source"].startswith("phase-5") and r["items"][0]["verified"] is False


def test_unicode_survives_api_round_trip():
    from app.main import app
    with TestClient(app) as c:
        r = c.post("/api/translate/glosses", json={"labels": ["you", "name"]})
        assert r.status_code == 200
        assert "charset=utf-8" in r.headers["content-type"] or r.headers["content-type"] == "application/json"
        body = json.loads(r.content.decode("utf-8"))
        assert body["kannada_text"] == "ನಿಮ್ಮ ಹೆಸರೇನು?" and body["direct_kannada"] == "ನೀವು ಹೆಸರು"
        k = c.post("/api/translate/kannada", json={"text": "ನಿಮ್ಮ ಹೆಸರೇನು?"}).json()
        assert k["gloss_sequence"] == ["YOU", "NAME"] and k["english_meaning"] == "What is your name?"
        assert c.post("/api/translate/glosses", json={"labels": ["x" * 41]}).status_code == 422


def test_dictionary_changes_do_not_trigger_retraining(tmp_path):
    """Phrase/translation edits touch only the mapping file; training eligibility depends on landmark data."""
    from app.dataset.store import DatasetStore
    from app.jobs import training_eligibility
    from tests.synthetic import sign_frames
    store = DatasetStore(tmp_path / "ds")
    for i in range(6):
        store.save("yes", sign_frames("push"), f"s{i % 2}")
        store.save("namaskara", sign_frames("circle"), f"s{i % 2}")
    known = {"yes", "namaskara", "_none"}
    before = training_eligibility(tmp_path / "models", [("app", store)], known)
    mapping = tmp_path / "mapping.json"
    shutil.copy(KANNADA_MAPPING_FILE, mapping)
    KannadaSignMapper(mapping).add("ಹೊಸ ಪದ", "yes", "test")
    after = training_eligibility(tmp_path / "models", [("app", store)], known)
    assert before == after
