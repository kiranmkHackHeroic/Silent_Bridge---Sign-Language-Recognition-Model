import json
import unicodedata

import pytest

from app.config import KANNADA_MAPPING_FILE, LABELS_FILE, NONE_LABEL
from app.translation.kannada_mapping import KannadaSignMapper, Vocabulary, is_kannada, normalize_kannada
from app.translation.sentence_builder import SentenceBuilder


def test_normalize_preserves_kannada_vowel_signs_and_viramas():
    word = "ಧನ್ಯವಾದಗಳು"            # contains virama and vowel signs
    assert normalize_kannada(word) == word
    assert normalize_kannada("  ಕ್ಷಮಿಸಿ\t") == "ಕ್ಷಮಿಸಿ"


def test_normalize_removes_punctuation_zero_width_and_extra_space():
    assert normalize_kannada("ನಮಸ್ಕಾರ!  ನೀವು?\n") == "ನಮಸ್ಕಾರ ನೀವು"
    assert normalize_kannada("ನಮ‌ಸ್ಕಾರ") == "ನಮಸ್ಕಾರ"
    assert normalize_kannada("ನಮಸ್ಕಾರ।") == "ನಮಸ್ಕಾರ"


def test_normalize_applies_nfc():
    decomposed = unicodedata.normalize("NFD", "ಕೊ")
    assert normalize_kannada(decomposed) == unicodedata.normalize("NFC", "ಕೊ")


def test_normalize_rejects_non_string():
    with pytest.raises(TypeError):
        normalize_kannada(None)  # type: ignore[arg-type]


def test_every_emittable_label_maps_to_kannada_unicode():
    vocab = Vocabulary()
    for entry in vocab.entries.values():
        if entry.label == NONE_LABEL:
            assert not vocab.emittable(entry.label)
            continue
        assert entry.kannada, entry.label
        assert is_kannada(entry.kannada), entry.label
        assert vocab.kannada_for(entry.label) == entry.kannada


def test_mapping_file_sign_ids_exist_in_vocabulary():
    labels = {item["label"] for item in json.loads(LABELS_FILE.read_text(encoding="utf-8"))["labels"]}
    mapping = json.loads(KANNADA_MAPPING_FILE.read_text(encoding="utf-8"))["entries"]
    for word, entry in mapping.items():
        assert entry["sign_id"] in labels, word
        assert entry["verified"] is False   # nothing in this prototype is expert-verified


def test_translate_supported_and_unsupported():
    mapper = KannadaSignMapper()
    items = mapper.translate("ನಮಸ್ಕಾರ, ನಾನು ಬೆಂಗಳೂರು ನೀರು!")
    assert [i["text"] for i in items] == ["ನಮಸ್ಕಾರ", "ನಾನು", "ಬೆಂಗಳೂರು", "ನೀರು"]
    assert [i["supported"] for i in items] == [True, True, False, True]
    assert items[0]["sign_id"] == "namaskara"
    assert items[2]["sign_id"] is None


def test_translate_longest_phrase_match(tmp_path):
    f = tmp_path / "m.json"
    f.write_text(json.dumps({"entries": {
        "ಶುಭ ದಿನ": {"sign_id": "good_day", "verified": False, "source": "test"},
        "ಶುಭ": {"sign_id": "good", "verified": False, "source": "test"},
    }}, ensure_ascii=False), encoding="utf-8")
    mapper = KannadaSignMapper(f)
    assert [i["sign_id"] for i in mapper.translate("ಶುಭ ದಿನ ಶುಭ")] == ["good_day", "good"]


def test_translate_empty_text():
    assert KannadaSignMapper().translate("  !! ") == []


def test_sentence_builder_rejects_unknown_and_background():
    builder = SentenceBuilder(Vocabulary())
    assert builder.add("_none", 0.99, 0) is None
    assert builder.add("_unknown", 0.99, 0) is None
    assert builder.add("not_a_label", 0.99, 0) is None
    assert builder.tokens == []


def test_sentence_builder_duplicate_suppression():
    builder = SentenceBuilder(Vocabulary(), min_repeat_ms=600)
    assert builder.add("namaskara", 0.9, 0) is not None
    assert builder.add("namaskara", 0.9, 200) is None          # same sign detected twice
    assert builder.add("i_me", 0.9, 400) is not None
    assert builder.add("i_me", 0.9, 2000) is not None          # performed again later
    assert builder.text() == "ನಮಸ್ಕಾರ ನಾನು ನಾನು"
    builder.clear()
    assert builder.text() == ""


def test_vocabulary_upsert_validation(tmp_path):
    f = tmp_path / "labels.json"
    f.write_text(json.dumps({"labels": [{"label": "yes", "english": "Yes", "kannada": "ಹೌದು"}]}, ensure_ascii=False),
                 encoding="utf-8")
    vocab = Vocabulary(f)
    with pytest.raises(ValueError):
        vocab.upsert("Bad Label!", "x", "ಹೌದು")
    with pytest.raises(ValueError):
        vocab.upsert("ok_label", "x", "   ")
    vocab.upsert("mane", "Home", "ಮನೆ")
    assert Vocabulary(f).kannada_for("mane") == "ಮನೆ"
