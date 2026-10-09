import json
import unicodedata

import pytest

from app.config import KANNADA_MAPPING_FILE, LABELS_FILE, NONE_LABEL
from app.translation.kannada_mapping import (KannadaSignMapper, Vocabulary, clean_display_text, is_kannada,
                                             normalize_kannada)
from app.translation.sentence_builder import SentenceBuilder

REAL_KANNADA = ["ನಮಸ್ಕಾರ", "ಧನ್ಯವಾದಗಳು", "ನೀರು", "ಸಹಾಯ ಬೇಕು", "ನಿಮ್ಮ ಹೆಸರು ಏನು?"]


# ---------------------------------------------------------------- Unicode handling
@pytest.mark.parametrize("text", REAL_KANNADA)
def test_real_kannada_strings_survive_display_cleaning_unchanged(text):
    assert clean_display_text(text) == text
    assert unicodedata.is_normalized("NFC", clean_display_text(text))
    assert is_kannada(text)


@pytest.mark.parametrize("text", REAL_KANNADA)
def test_kannada_json_round_trip(text, tmp_path):
    f = tmp_path / "t.json"
    f.write_text(json.dumps({"t": text}, ensure_ascii=False), encoding="utf-8")
    assert json.loads(f.read_text(encoding="utf-8"))["t"] == text
    assert json.loads(json.dumps(text)) == text            # escaped form too


def test_lookup_key_keeps_vowel_signs_and_viramas():
    word = "ಧನ್ಯವಾದಗಳು"            # virama + vowel signs
    assert normalize_kannada(word) == word
    assert normalize_kannada("  ಕ್ಷಮಿಸಿ\t") == "ಕ್ಷಮಿಸಿ"
    assert normalize_kannada("ನಿಮ್ಮ ಹೆಸರು ಏನು?") == "ನಿಮ್ಮ ಹೆಸರು ಏನು"
    # every non-space character of the key is still in the Kannada block
    assert all(is_kannada(c) for c in normalize_kannada("ನಿಮ್ಮ ಹೆಸರು ಏನು?").replace(" ", ""))


def test_lookup_key_removes_punctuation_zero_width_and_extra_space():
    assert normalize_kannada("ನಮಸ್ಕಾರ!  ನೀವು?\n") == "ನಮಸ್ಕಾರ ನೀವು"
    assert normalize_kannada("ನಮ‌ಸ್ಕಾರ") == "ನಮಸ್ಕಾರ"
    assert normalize_kannada("ನಮಸ್ಕಾರ।") == "ನಮಸ್ಕಾರ"
    assert normalize_kannada("﻿ನೀರು​") == "ನೀರು"


def test_display_cleaning_keeps_joiners_and_punctuation():
    text = "ಕನ್‍ನಡ  ಪಠ್ಯ?"
    assert clean_display_text(text) == "ಕನ್‍ನಡ ಪಠ್ಯ?"
    assert clean_display_text("﻿ನೀರು​") == "ನೀರು"


def test_nfc_normalization():
    decomposed = unicodedata.normalize("NFD", "ಕೊ")
    assert normalize_kannada(decomposed) == unicodedata.normalize("NFC", "ಕೊ")
    assert clean_display_text(decomposed) == unicodedata.normalize("NFC", "ಕೊ")


def test_non_string_rejected():
    with pytest.raises(TypeError):
        normalize_kannada(None)  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        clean_display_text(5)  # type: ignore[arg-type]


# ---------------------------------------------------------------- vocabulary (sign -> Kannada)
def test_every_emittable_label_maps_to_nfc_kannada():
    vocab = Vocabulary()
    for entry in vocab.entries.values():
        if entry.label == NONE_LABEL:
            assert not vocab.emittable(entry.label)
            continue
        assert entry.kannada and is_kannada(entry.kannada), entry.label
        assert unicodedata.is_normalized("NFC", entry.kannada)
        assert entry.isl_gloss, entry.label
        assert entry.verified is False            # nothing in this prototype is expert-verified


def test_labels_file_is_utf8_without_escapes():
    raw = LABELS_FILE.read_text(encoding="utf-8")
    assert "ನಮಸ್ಕಾರ" in raw and "\\u0c" not in raw


def test_mapping_sign_ids_exist_in_vocabulary():
    labels = {item["label"] for item in json.loads(LABELS_FILE.read_text(encoding="utf-8"))["labels"]}
    mapping = json.loads(KANNADA_MAPPING_FILE.read_text(encoding="utf-8"))["entries"]
    for word, entry in mapping.items():
        assert entry["sign_ids"], word
        assert set(entry["sign_ids"]) <= labels, word
        assert entry["verified"] is False
        assert normalize_kannada(word) == word, f"mapping key not normalized: {word}"


# ---------------------------------------------------------------- Kannada -> sign
def test_translate_supported_and_unsupported():
    items = KannadaSignMapper().translate("ನಮಸ್ಕಾರ, ನಾನು ಬೆಂಗಳೂರು ನೀರು!")
    assert [i["text"] for i in items] == ["ನಮಸ್ಕಾರ", "ನಾನು", "ಬೆಂಗಳೂರು", "ನೀರು"]
    assert [i["supported"] for i in items] == [True, True, False, True]
    assert items[0]["sign_ids"] == ["namaskara"]
    assert items[2]["sign_ids"] == []


def test_phrase_mappings_for_real_sentences():
    mapper = KannadaSignMapper()
    help_items = mapper.translate("ಸಹಾಯ ಬೇಕು")
    assert len(help_items) == 1 and help_items[0]["phrase"] and help_items[0]["sign_ids"] == ["help", "need"]
    name_items = mapper.translate("ನಿಮ್ಮ ಹೆಸರು ಏನು?")
    assert name_items[0]["sign_ids"] == ["your", "name", "what"]


def test_translate_longest_phrase_match(tmp_path):
    f = tmp_path / "m.json"
    f.write_text(json.dumps({"entries": {
        "ಶುಭ ದಿನ": {"sign_ids": ["good_day"], "verified": False, "source": "test"},
        "ಶುಭ": {"sign_id": "good", "verified": False, "source": "legacy single-id schema"},
    }}, ensure_ascii=False), encoding="utf-8")
    mapper = KannadaSignMapper(f)
    assert [i["sign_ids"] for i in mapper.translate("ಶುಭ ದಿನ ಶುಭ")] == [["good_day"], ["good"]]


def test_translate_empty_text():
    assert KannadaSignMapper().translate("  !! ") == []


def test_mapper_add_writes_utf8(tmp_path):
    f = tmp_path / "m.json"
    f.write_text(json.dumps({"entries": {}}), encoding="utf-8")
    mapper = KannadaSignMapper(f)
    assert mapper.add("ಮನೆ", "home", "test")
    assert not mapper.add("ಮನೆ", "home", "test")          # no duplicate
    assert "ಮನೆ" in f.read_text(encoding="utf-8")
    assert mapper.translate("ಮನೆ")[0]["sign_ids"] == ["home"]


# ---------------------------------------------------------------- transcript builder
def test_sentence_builder_rejects_unknown_and_background():
    builder = SentenceBuilder(Vocabulary())
    assert builder.add("_none", 0.99, 0) is None
    assert builder.add("_unknown", 0.99, 0) is None
    assert builder.add("not_a_label", 0.99, 0) is None
    assert builder.tokens == []


def test_sentence_builder_duplicate_suppression_and_repeats():
    builder = SentenceBuilder(Vocabulary(), min_repeat_ms=600)
    assert builder.add("namaskara", 0.9, 0) is not None
    assert builder.add("namaskara", 0.9, 200) is None          # same sign detected twice
    assert builder.add("i_me", 0.9, 400) is not None
    assert builder.add("i_me", 0.9, 2000) is not None          # performed again later
    assert builder.text() == "ನಮಸ್ಕಾರ ನಾನು ನಾನು"
    builder.clear()
    assert builder.text() == ""


def test_sentence_builder_produces_real_sentence():
    builder = SentenceBuilder(Vocabulary())
    for k, label in enumerate(["your", "name", "what"]):
        builder.add(label, 0.9, k * 1000)
    assert builder.text() == "ನಿಮ್ಮ ಹೆಸರು ಏನು"


def test_vocabulary_upsert_validation(tmp_path):
    f = tmp_path / "labels.json"
    f.write_text(json.dumps({"labels": [{"label": "yes", "english": "Yes", "kannada": "ಹೌದು"}]}, ensure_ascii=False),
                 encoding="utf-8")
    vocab = Vocabulary(f)
    with pytest.raises(ValueError):
        vocab.upsert("Bad Label!", "x", "ಹೌದು")
    with pytest.raises(ValueError):
        vocab.upsert("ok_label", "x", "   ")
    with pytest.raises(ValueError):
        vocab.upsert("ok_label", "x", "mane")              # must be Kannada script
    vocab.upsert("mane", "Home", "ಮನೆ", "HOME")
    reloaded = Vocabulary(f)
    assert reloaded.kannada_for("mane") == "ಮನೆ"
    assert reloaded.get("mane").isl_gloss == "HOME"
    assert "ಮನೆ" in f.read_text(encoding="utf-8")
