"""Continuous (sentence) pipeline: gloss handling, CTC model, sentence mode. Synthetic data only."""
import joblib
import numpy as np

from app.config import RecognitionSettings
from app.continuous.model import CTCGlossRecognizer, edit_distance
from app.continuous.dataset import recording_index
from app.recognition.landmarks import parse_frame
from app.recognition.pipeline import RecognitionSession
from app.recognition.predictor import SignPredictor
from app.translation.kannada_mapping import Vocabulary
from app.video.importer import LANDMARKS, output_root
from tests.synthetic import empty_frames, sign_frames


def test_gloss_normalization_and_recording_index():
    import importlib.util
    from pathlib import Path
    spec = importlib.util.spec_from_file_location("mk", Path(__file__).resolve().parent.parent / "tools" / "make_csltr_mapping.py")
    mk = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mk)
    assert mk.normalize_gloss("DONOT ABUSE HIM") == ["DO", "NOT", "ABUSE", "HIM"]
    assert mk.normalize_gloss("I FINE. THANK YOU SIR") == ["I", "FINE", "THANK", "YOU", "SIR"]
    assert mk.normalize_gloss("CONGRATULATIIONS") == ["CONGRATULATIONS"]
    assert mk.sentence_key("which collegeschool are you from") == mk.sentence_key("which college school are you from")
    assert recording_index("free (3).MP4") == "rec3" and recording_index("free.MP4") == "rec1"


def test_sentence_samples_are_stored_apart_from_isolated_signs():
    assert output_root("isl_csltr") != LANDMARKS / "isl_csltr"
    assert "continuous" in str(output_root("isl_csltr"))
    assert output_root("amrita_slr") == LANDMARKS / "amrita_slr"


def test_edit_distance():
    assert edit_distance(["I", "HELP", "YOU"], ["I", "HELP", "YOU"]) == 0
    assert edit_distance(["I", "YOU"], ["I", "HELP", "YOU"]) == 1
    assert edit_distance([], ["A", "B"]) == 2


def _seq(pattern, rng, dim=8, per=6):
    """Concatenate per-gloss blocks: gloss k = signal on feature k."""
    parts = []
    for g in pattern:
        block = rng.normal(0, 0.1, (per, dim)).astype(np.float32)
        block[:, g] += 2.0
        parts.append(block)
    return np.concatenate(parts)


def test_ctc_learns_gloss_sequences_and_survives_reload(tmp_path):
    rng = np.random.default_rng(0)
    vocab = ["A", "B", "C"]
    sents = [[0, 1], [1, 2], [2, 0, 1], [0, 2]]
    train = [{"seq": _seq(s, rng), "gloss": [vocab[i] for i in s], "mirror": None} for s in sents for _ in range(8)]
    model = CTCGlossRecognizer(vocab, 8, hidden=24, layers=1, epochs=150, batch_size=8, seed=1).fit(train)
    test = [{"seq": _seq(s, rng), "gloss": [vocab[i] for i in s]} for s in sents]
    assert model.gloss_error_rate(test) < 0.3
    joblib.dump(model, tmp_path / "ctc.joblib")
    loaded = joblib.load(tmp_path / "ctc.joblib")
    assert loaded.decode(test[0]["seq"])[0] == model.decode(test[0]["seq"])[0]


class _StubContinuous:
    loaded = True

    def recognize(self, feats):
        return {"glosses": ["I", "HELP", "YOU"], "gloss_confidence": 0.8, "method": "ctc", "sentence_id": "s003",
                "sentence": "can i help you", "kannada": "ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಹುದೇ?", "reference_gloss": ["I", "HELP", "YOU"],
                "gloss_distance": 0, "baseline_sentence": "can i help you", "baseline_confidence": 0.5,
                "translation_status": "draft"}


def test_sentence_mode_emits_one_sentence_per_signed_sentence():
    session = RecognitionSession(SignPredictor(), Vocabulary(), RecognitionSettings(mode="sentence"),
                                 continuous=_StubContinuous())
    events = []
    stream = sign_frames("circle", n=30) + sign_frames("wave", t0=1000, n=30) + empty_frames(2000, 30)
    for p in stream:
        events += session.process(p)
    sentences = [e for e in events if e["type"] == "sentence"]
    assert len(sentences) == 1 and sentences[0]["kannada"].startswith("ನಾನು")
    assert not [e for e in events if e["type"] == "sign"]


def test_sentence_mode_without_model_reports_it():
    session = RecognitionSession(SignPredictor(), Vocabulary(), RecognitionSettings(mode="sentence"), continuous=None)
    events = []
    for p in sign_frames("circle", n=30) + empty_frames(1000, 30):
        events += session.process(p)
    assert any(e.get("result") == "no_continuous_model" for e in events)


def test_live_features_match_dataset_features():
    from app.continuous.dataset import frames_to_sequence
    from app.continuous.recognizer import features_to_sequence
    frames = sign_frames("circle", n=20)
    a = frames_to_sequence(frames)
    b = features_to_sequence([parse_frame(f) for f in frames])
    np.testing.assert_allclose(a, b)
