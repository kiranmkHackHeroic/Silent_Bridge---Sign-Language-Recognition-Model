"""Dataset validation, training/saving/loading, encoder consistency, schema guard and
continuous segmentation (motion-minimum splits, repeated signs).

All landmark data here is SYNTHETIC test fixture data used only to exercise code
paths; it is never used to produce the application's model.
"""
import json

import joblib
import numpy as np
import pytest

from app.config import DEFAULT_FEATURE_CONFIG, FeatureConfig, RecognitionSettings, TrainingConfig
from app.dataset.store import DatasetStore
from app.dataset.validate import validate_dataset, validate_sample
from app.recognition.landmarks import FRAME_DIM, parse_frame
from app.recognition.pipeline import RecognitionSession
from app.recognition.predictor import SignPredictor
from app.recognition.sequence_features import feature_dim
from app.training.train_model import train
from app.translation.kannada_mapping import Vocabulary
from tests.synthetic import empty_frames, frame, hand_points, sign_frames

KNOWN = {"namaskara", "water", "yes", "_none"}
CLASSES = {"circle": "namaskara", "wave": "water", "push": "yes", "rest": "_none"}


# ---------------------------------------------------------------- validation
def test_validate_sample_accepts_good_and_rejects_bad():
    good = {"sample_id": "a", "label": "yes", "session_id": "s1", "frames": sign_frames("push")}
    assert validate_sample(good, KNOWN).valid

    reasons = lambda s: validate_sample(s, KNOWN).reasons  # noqa: E731
    assert any("unknown label" in r for r in reasons({**good, "label": "zzz"}))
    assert any("session_id" in r for r in reasons({**good, "session_id": ""}))
    assert any("no frames" in r for r in reasons({**good, "frames": []}))
    assert any("no hand" in r for r in reasons({**good, "frames": empty_frames(0, 20)}))
    shuffled = list(reversed(sign_frames("push")))
    assert any("not in order" in r for r in reasons({**good, "frames": shuffled}))
    mostly_empty = sign_frames("push", n=4) + empty_frames(200, 40)
    assert not validate_sample({**good, "frames": mostly_empty}, KNOWN).valid


def test_validate_dataset_reports_and_writes_manifest(tmp_path):
    store = DatasetStore(tmp_path / "ds")
    store.save("yes", sign_frames("push"), "s1")
    store.save("namaskara", sign_frames("circle"), "s1")
    (tmp_path / "ds" / "yes" / "broken.json").write_text("{not json", encoding="utf-8")
    manifest = tmp_path / "manifest.csv"
    result = validate_dataset(store, KNOWN, manifest_file=manifest)
    summary = result["summary"]
    assert summary["valid"] == 2 and summary["rejected"] == 1
    assert "unreadable JSON" in summary["rejected_samples"][0]["reasons"][0]
    assert any("_none" in w for w in summary["warnings"])
    assert manifest.read_text(encoding="utf-8").count("\n") == 4      # header + 3 rows


# ---------------------------------------------------------------- training / saving / loading
@pytest.fixture(scope="module")
def trained(tmp_path_factory):
    root = tmp_path_factory.mktemp("train")
    store = DatasetStore(root / "dataset")
    rng = np.random.default_rng(3)
    for session in ("sessA", "sessB", "sessC"):
        for kind, label in CLASSES.items():
            for _ in range(5):
                store.save(label, sign_frames(kind, n=int(rng.integers(24, 36)), rng=rng, noise=0.003,
                                              offset=tuple(rng.normal(0, 0.02, size=2))), session)
    stages = []
    metrics = train(store, FeatureConfig(), TrainingConfig(augment_copies=1, candidate_models=["logreg", "mlp"]),
                    out_dir=root / "models", known_labels=KNOWN, progress=lambda s, f: stages.append((s, f)))
    return metrics, root, stages


def test_training_uses_held_out_session_and_compares_baseline(trained):
    metrics, _, stages = trained
    assert metrics["test"] is not None
    assert metrics["headline_source"].startswith("held-out test session")
    assert metrics["num_test"] == 20 and metrics["num_train_dev"] == 40
    assert "logreg" in metrics["test"]["models"]                   # baseline always reported on the same test set
    assert metrics["test"]["continuous_stream"]["reference_signs"] == 15   # _none excluded from reference
    assert set(metrics["candidates"]) == {"logreg", "mlp"}
    assert stages[-1] == ("Done", 1.0)
    assert [f for _, f in stages] == sorted(f for _, f in stages)  # progress is monotonic


def test_saved_model_loads_with_consistent_label_encoder(trained):
    _, root, _ = trained
    p = SignPredictor(root / "models" / "sign_model.joblib", root / "models" / "model_meta.json")
    assert p.load(), p.error
    meta = json.loads((root / "models" / "model_meta.json").read_text(encoding="utf-8"))
    assert p.classes == meta["classes"] == sorted(CLASSES.values())
    assert list(p.model.classes_) == p.classes
    assert meta["feature_config"]["schema"] == DEFAULT_FEATURE_CONFIG.schema
    assert p.model.n_features_in_ == feature_dim(DEFAULT_FEATURE_CONFIG)
    assert (root / "models" / "training_log.jsonl").exists()


def test_retraining_archives_previous_model(trained, tmp_path):
    _, root, _ = trained
    store = DatasetStore(root / "dataset")
    train(store, FeatureConfig(), TrainingConfig(augment_copies=0, candidate_models=["logreg"]),
          out_dir=root / "models", known_labels=KNOWN)
    archived = list((root / "models" / "archive").glob("*/sign_model.joblib"))
    assert archived, "previous model should be archived, not silently overwritten"


def test_incompatible_feature_schema_is_refused(trained, tmp_path):
    _, root, _ = trained
    bundle = joblib.load(root / "models" / "sign_model.joblib")
    bundle["feature_config"] = {**bundle["feature_config"], "schema": "hands-v1", "version": 1}
    joblib.dump(bundle, tmp_path / "old.joblib")
    p = SignPredictor(tmp_path / "old.joblib", tmp_path / "meta.json")
    assert not p.load() and "different feature configuration" in p.error


class _UnsurePredictor(SignPredictor):
    """Stub classifier that is never confident (an untrained / unknown gesture)."""

    def __init__(self):
        super().__init__()
        self.model, self.classes = object(), ["namaskara", "water", "_none"]

    def predict_frames(self, frames):
        from app.recognition.predictor import Prediction
        return Prediction("namaskara", 0.41, {"namaskara": 0.41, "water": 0.35, "_none": 0.24}, 0.1)


def test_unknown_gesture_is_reported_as_uncertain_and_not_added():
    session = RecognitionSession(_UnsurePredictor(), Vocabulary(), RecognitionSettings(confidence_threshold=0.6))
    events = []
    for payload in sign_frames("circle", n=30) + empty_frames(1100, 12):
        events += session.process(payload)
    assert not [e for e in events if e["type"] == "sign"]
    uncertain = [e for e in events if e["type"] == "uncertain"]
    assert uncertain and uncertain[0]["top"][0]["label"] == "namaskara"
    assert session.builder.text() == ""


# ---------------------------------------------------------------- continuous segmentation
def _stream(session, payloads):
    events = []
    for p in payloads:
        events += session.process(p)
    return [e for e in events if e["type"] == "sign"]


def test_motion_minimum_splits_signs_without_pause_or_hand_drop(trained):
    _, root, _ = trained
    p = SignPredictor(root / "models" / "sign_model.joblib", root / "models" / "model_meta.json")
    p.load()
    session = RecognitionSession(p, Vocabulary(), RecognitionSettings(confidence_threshold=0.5))
    a = sign_frames("circle", t0=0, n=30)
    last = a[-1]["hands"][0]["landmarks"]
    hold = [frame(a[-1]["t"] + (i + 1) * 33.3, [("Left", np.array(last))]) for i in range(6)]   # 200 ms dip
    b = sign_frames("wave", t0=hold[-1]["t"] + 33.3, n=30)
    signs = _stream(session, a + hold + b + empty_frames(b[-1]["t"] + 33.3, 12))
    labels = [s["token"]["label"] for s in signs]
    assert labels == ["namaskara", "water"]
    assert signs[0].get("boundary") == "motion_minimum"


def test_dip_split_can_be_disabled(trained):
    _, root, _ = trained
    p = SignPredictor(root / "models" / "sign_model.joblib", root / "models" / "model_meta.json")
    p.load()
    session = RecognitionSession(p, Vocabulary(), RecognitionSettings(confidence_threshold=0.5, dip_split=False))
    a = sign_frames("circle", t0=0, n=30)
    last = a[-1]["hands"][0]["landmarks"]
    hold = [frame(a[-1]["t"] + (i + 1) * 33.3, [("Left", np.array(last))]) for i in range(6)]
    b = sign_frames("wave", t0=hold[-1]["t"] + 33.3, n=30)
    signs = _stream(session, a + hold + b + empty_frames(b[-1]["t"] + 33.3, 12))
    assert len(signs) <= 1          # without dip splitting the two signs merge into one segment


def test_same_sign_twice_is_added_twice(trained):
    _, root, _ = trained
    p = SignPredictor(root / "models" / "sign_model.joblib", root / "models" / "model_meta.json")
    p.load()
    session = RecognitionSession(p, Vocabulary(), RecognitionSettings(confidence_threshold=0.5))
    stream = (empty_frames(0, 8) + sign_frames("push", t0=300, n=30) + empty_frames(1300, 12)
              + sign_frames("push", t0=1800, n=30) + empty_frames(2800, 12))
    assert [s["token"]["label"] for s in _stream(session, stream)] == ["yes", "yes"]


def test_hands_disappearing_mid_sign_is_handled():
    p = SignPredictor()     # no model needed for segmentation
    session = RecognitionSession(p, Vocabulary())
    stream = sign_frames("circle", n=15) + empty_frames(500, 2) + sign_frames("circle", t0=570, n=15)
    for payload in stream:
        events = session.process(payload)
        assert all(e["type"] != "error" for e in events)
    assert session.segmenter.active        # a 2-frame dropout does not end the sign


def test_frame_dimension_matches_schema():
    f = parse_frame(frame(0, [("Left", hand_points())], face={"cx": 0.5, "cy": 0.3, "w": 0.2, "h": 0.25}))
    assert f.vector.shape == (FRAME_DIM,) and f.face
    assert parse_frame(frame(0, [("Left", hand_points())], face={"cx": "x"})).face is False


def test_validating_a_temporary_dataset_never_touches_the_project_manifest(tmp_path):
    from app.dataset.validate import MANIFEST_FILE
    before = MANIFEST_FILE.read_bytes() if MANIFEST_FILE.exists() else None
    store = DatasetStore(tmp_path / "ds")
    store.save("yes", sign_frames("push"), "s1")
    validate_dataset(store, KNOWN)
    assert (tmp_path / "dataset_manifest.csv").exists()
    after = MANIFEST_FILE.read_bytes() if MANIFEST_FILE.exists() else None
    assert before == after
