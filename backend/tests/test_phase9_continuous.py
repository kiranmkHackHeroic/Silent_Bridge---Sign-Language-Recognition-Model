"""Phase 9: ISL-CSLTR integrity exclusions and incremental (tentative) sentence-mode predictions.

Synthetic geometric fixtures and stand-in recognizers only; no dataset or real model is required.
"""
import json

import numpy as np

from app.config import RecognitionSettings
from app.continuous import dataset as cds
from app.recognition.pipeline import RecognitionSession
from app.translation.kannada_mapping import Vocabulary
from tests.synthetic import empty_frames, sign_frames


class _StubPredictor:
    loaded = True
    classes = ["yes"]
    meta = {}

    def predict_frames(self, frames):
        return None


class _StubContinuous:
    """Stands in for ContinuousRecognizer: a partial decode grows with the number of frames."""
    loaded = True

    def __init__(self):
        self.partial_calls = 0

    def partial(self, feats):
        self.partial_calls += 1
        return {"glosses": ["I", "GO"][: 1 + (len(feats) > 40)], "gloss_confidence": 0.5, "tentative": True}

    def recognize(self, feats):
        return {"accepted": True, "posterior": 0.9, "sentence_id": "s1", "sentence": "i go", "kannada": "ನಾನು ಹೋಗುತ್ತೇನೆ",
                "glosses": ["I", "GO"], "gloss_confidence": 0.8, "method": "fusion", "candidates": []}


def test_sentence_mode_streams_tentative_partials_and_final_sentence():
    cont = _StubContinuous()
    sess = RecognitionSession(_StubPredictor(), Vocabulary(), RecognitionSettings(mode="sentence"), continuous=cont)
    rng = np.random.default_rng(0)
    stream = empty_frames(0, 10) + sign_frames("circle", t0=400, n=60, rng=rng) + empty_frames(400 + 60 * 33.3, 40)
    partials, sentences = [], []
    for f in stream:
        for e in sess.process(f):
            if e["type"] == "state" and e.get("partial"):
                partials.append(e["partial"]["glosses"])
            if e["type"] == "sentence":
                sentences.append(e)
    assert cont.partial_calls >= 2 and partials, "partial glosses must be streamed while signing"
    assert partials[0] == ["I"] and ["I", "GO"] in partials       # grows incrementally
    assert len(sentences) == 1 and sentences[0]["sentence"] == "i go"
    last_state = [e for e in sess.process(empty_frames(9000, 1)[0]) if e["type"] == "state"][-1]
    assert last_state["partial"] is None                          # cleared once the sentence is decided


def test_isolated_mode_never_reports_sentence_partials():
    sess = RecognitionSession(_StubPredictor(), Vocabulary(), RecognitionSettings(mode="segment"), continuous=_StubContinuous())
    states = [e for f in sign_frames("circle", n=40) for e in sess.process(f) if e["type"] == "state"]
    assert all(s["partial"] is None for s in states)


def test_integrity_exclusions_are_skipped_by_the_loader(tmp_path, monkeypatch):
    raw = tmp_path / "raw"
    cont = tmp_path / "continuous" / "isl_csltr" / "sentence"
    cont.mkdir(parents=True)
    frames = sign_frames("circle", n=40)
    for name in ("keep", "dup"):
        src = raw / "ISL_CSLRT_Corpus" / "Videos_Sentence_Level" / "i go" / f"{name}.mp4"
        src.parent.mkdir(parents=True, exist_ok=True)
        src.write_bytes(b"x")
        (cont / f"{name}.json").write_text(json.dumps({
            "sample_id": name, "meta": {"sentence_id": "s1"}, "transcript": "i go", "gloss": ["I", "GO"],
            "session_id": "rec1", "frames": frames, "source_file": str(src)}), encoding="utf-8")
    integrity = tmp_path / "integrity.json"
    integrity.write_text(json.dumps({"excluded": [{"file": "ISL_CSLRT_Corpus/Videos_Sentence_Level/i go/dup.mp4",
                                                   "reason": "exact duplicate"}]}), encoding="utf-8")
    monkeypatch.setattr(cds, "RAW_ROOT", raw)
    monkeypatch.setattr(cds, "CONTINUOUS_DIR", tmp_path / "continuous")
    monkeypatch.setattr(cds, "INTEGRITY_FILE", integrity)
    assert [s["sample_id"] for s in cds.load_samples()] == ["keep"]
    assert sorted(s["sample_id"] for s in cds.load_samples(apply_exclusions=False)) == ["dup", "keep"]
