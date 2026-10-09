"""Model loading errors + an end-to-end streaming test on SYNTHETIC landmark data.

The synthetic test proves the pipeline mechanics (train -> load -> continuous
segmentation -> classification -> transcript). It says nothing about accuracy on
real signers.
"""
import json

import joblib
import numpy as np
import pytest

from app.config import FeatureConfig, TrainingConfig
from app.dataset.store import DatasetError, DatasetStore
from app.recognition.pipeline import RecognitionSession
from app.recognition.predictor import ModelLoadError, SignPredictor
from app.training.train_model import TrainingError, train
from app.translation.kannada_mapping import Vocabulary
from tests.synthetic import empty_frames, sign_frames

CLASSES = {"circle": "namaskara", "wave": "water", "push": "yes", "rest": "_none"}


# ---------------------------------------------------------------- loading errors
def test_missing_model_file(tmp_path):
    p = SignPredictor(tmp_path / "missing.joblib", tmp_path / "meta.json")
    assert p.load() is False
    assert "no trained model" in p.error
    with pytest.raises(ModelLoadError):
        p.load(required=True)
    with pytest.raises(ModelLoadError):
        p.predict_vector(np.zeros(10))


def test_corrupt_model_file(tmp_path):
    f = tmp_path / "m.joblib"
    f.write_bytes(b"not a pickle")
    p = SignPredictor(f, tmp_path / "meta.json")
    assert p.load() is False and "could not read" in p.error


def test_wrong_format_and_feature_config(tmp_path):
    f = tmp_path / "m.joblib"
    joblib.dump({"hello": 1}, f)
    p = SignPredictor(f, tmp_path / "meta.json")
    assert p.load() is False and "unexpected format" in p.error
    joblib.dump({"pipeline": object(), "classes": ["a", "b"], "feature_config": {"version": 999}}, f)
    assert p.load() is False and "different feature configuration" in p.error


def test_untrained_session_reports_segments_without_inventing_signs(tmp_path):
    p = SignPredictor(tmp_path / "none.joblib", tmp_path / "meta.json")
    p.load()
    session = RecognitionSession(p, Vocabulary())
    events = []
    for payload in sign_frames("circle", n=30) + empty_frames(1000, 10):
        events += session.process(payload)
    assert not [e for e in events if e["type"] == "sign"]
    segs = [e for e in events if e["type"] == "segment"]
    assert segs and segs[0]["result"] == "no_model"


# ---------------------------------------------------------------- dataset store
def test_dataset_store_validation(tmp_path):
    store = DatasetStore(tmp_path)
    with pytest.raises(DatasetError):
        store.save("bad label", [{"hands": [{}]}], "s1")
    with pytest.raises(DatasetError):
        store.save("yes", [{"t": 0, "hands": []}], "s1")        # no hands at all -> refused
    with pytest.raises(DatasetError):
        store.save("yes", [], "s1")
    with pytest.raises(DatasetError):
        store.load("../etc", "x")


def test_training_refuses_single_class(tmp_path):
    store = DatasetStore(tmp_path / "ds")
    rng = np.random.default_rng(0)
    for _ in range(4):
        store.save("yes", sign_frames("push", rng=rng), "s1")
    with pytest.raises(TrainingError):
        train(store, save=False)


# ---------------------------------------------------------------- end to end
@pytest.fixture(scope="module")
def trained(tmp_path_factory):
    root = tmp_path_factory.mktemp("e2e")
    store = DatasetStore(root / "dataset")
    rng = np.random.default_rng(1)
    for session in ("sessA", "sessB"):
        for kind, label in CLASSES.items():
            for _ in range(6):
                off = tuple(rng.normal(0, 0.02, size=2))
                n = int(rng.integers(24, 36))
                store.save(label, sign_frames(kind, n=n, rng=rng, noise=0.003, offset=off), session)
    metrics = train(store, FeatureConfig(), TrainingConfig(augment_copies=2, candidate_models=["logreg", "mlp"]), save=True, out_dir=root / "models")
    predictor = SignPredictor(root / "models" / "sign_model.joblib", root / "models" / "model_meta.json")
    assert predictor.load(), predictor.error
    return metrics, predictor, root


def test_training_metrics_are_session_grouped(trained):
    metrics, predictor, root = trained
    assert metrics["session_independent"] is True
    assert "signer/session groups" in metrics["evaluation_strategy"]
    assert set(metrics["per_class"]) == set(CLASSES.values())
    assert metrics["num_samples"] == 48
    assert metrics["correct"] + metrics["incorrect"] == 48
    saved = json.loads((root / "models" / "metrics.json").read_text(encoding="utf-8"))
    assert saved["accuracy"] == metrics["accuracy"]
    assert sorted(predictor.classes) == sorted(CLASSES.values())


def test_continuous_stream_produces_transcript(trained):
    _, predictor, _ = trained
    session = RecognitionSession(predictor, Vocabulary())
    session.configure({"confidence_threshold": 0.5})
    rng = np.random.default_rng(7)
    stream, t = [], 0.0
    for kind in ("circle", "wave", "push", "circle"):
        stream += empty_frames(t, 10)
        t += 10 * 33.3
        stream += sign_frames(kind, t0=t, n=30, rng=rng, noise=0.003)
        t += 30 * 33.3
    stream += empty_frames(t, 12)
    events = []
    for payload in stream:
        events += session.process(payload)
    signs = [e["token"]["label"] for e in events if e["type"] == "sign"]
    assert signs == ["namaskara", "water", "yes", "namaskara"]
    assert session.builder.text() == "ನಮಸ್ಕಾರ ನೀರು ಹೌದು ನಮಸ್ಕಾರ"
    assert all(e["type"] != "error" for e in events)


def test_sliding_mode_stream(trained):
    _, predictor, _ = trained
    session = RecognitionSession(predictor, Vocabulary())
    session.configure({"mode": "sliding", "confidence_threshold": 0.5, "window_frames": 30})
    rng = np.random.default_rng(3)
    stream = empty_frames(0, 10) + sign_frames("circle", t0=333, n=45, rng=rng) + empty_frames(1900, 12)
    events = []
    for payload in stream:
        events += session.process(payload)
    signs = [e["token"]["label"] for e in events if e["type"] == "sign"]
    assert signs.count("namaskara") == 1        # emitted once, not once per frame


def test_paused_session_ignores_frames(trained):
    _, predictor, _ = trained
    session = RecognitionSession(predictor, Vocabulary())
    session.paused = True
    assert session.process(sign_frames("circle", n=1)[0]) == []
