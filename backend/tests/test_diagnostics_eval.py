"""Diagnostics, threshold calibration, OOD statistics and live evaluation.

All landmark data here is SYNTHETIC test fixture data (geometric shapes), used only to exercise
code paths; it is never used to produce the application's model or its reported results.
"""
import json

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import diagnostics
from app.config import FeatureConfig, TrainingConfig
from app.dataset.store import DatasetStore
from app.evaluation import live_eval
from app.recognition.landmarks import FRAME_DIM, parse_frame
from app.recognition.pipeline import RecognitionSession
from app.recognition.predictor import SignPredictor
from app.recognition.sequence_features import frames_to_vector
from app.training.train_model import calibrate_threshold, train
from app.translation.kannada_mapping import Vocabulary
from tests.synthetic import empty_frames, frame, hand_points, sign_frames

KNOWN = {"namaskara", "water", "yes", "_none"}
CLASSES = {"circle": "namaskara", "wave": "water", "push": "yes", "rest": "_none"}
FACE = {"cx": 0.5, "cy": 0.3, "w": 0.2, "h": 0.25}


@pytest.fixture(scope="module")
def model(tmp_path_factory):
    root = tmp_path_factory.mktemp("diag")
    store = DatasetStore(root / "dataset")
    rng = np.random.default_rng(5)
    for session in ("sessA", "sessB", "sessC"):
        for kind, label in CLASSES.items():
            for _ in range(5):
                store.save(label, sign_frames(kind, n=int(rng.integers(24, 36)), rng=rng, noise=0.003), session)
    train(store, FeatureConfig(), TrainingConfig(augment_copies=1, candidate_models=["logreg"]),
          out_dir=root / "models", known_labels=KNOWN)
    p = SignPredictor(root / "models" / "sign_model.joblib", root / "models" / "model_meta.json")
    assert p.load(), p.error
    return p


# ---------------------------------------------------------------- calibration
def test_calibration_maximises_f1_of_accepted_words():
    y_true = ["a"] * 50 + ["b"] * 50
    # confident predictions are right, unconfident ones are wrong
    y_pred = ["a"] * 40 + ["b"] * 10 + ["b"] * 40 + ["a"] * 10
    conf = [0.9] * 40 + [0.3] * 10 + [0.8] * 40 + [0.2] * 10
    cal = calibrate_threshold(y_true, y_pred, conf)
    assert 0.3 < cal["threshold"] <= 0.8
    assert cal["precision_at_threshold"] == 1.0 and cal["recall_at_threshold"] == 0.8
    assert cal["objective"] == "f1" and {"threshold", "precision", "recall", "f1"} <= set(cal["curve"][0])


def test_calibration_counts_none_predicted_as_sign_as_wrong():
    cal = calibrate_threshold(["_none"] * 10 + ["a"] * 10, ["a"] * 10 + ["a"] * 10, [0.5] * 10 + [0.9] * 10)
    assert cal["threshold"] > 0.5            # rejecting the _none false alarms improves F1


def test_trained_model_stores_calibration_and_ood_reference(model):
    cal = model.meta.get("calibration")
    assert cal and 0.05 <= cal["threshold"] <= 0.95 and cal["samples"] > 0
    assert model.meta.get("ood_reference", {}).get("mean_abs_z_p99")
    session = RecognitionSession(model, Vocabulary())
    assert session.settings.confidence_threshold == pytest.approx(cal["threshold"])
    assert model.status()["calibration"]["threshold"] == cal["threshold"]
    assert "curve" not in model.status()["calibration"]


# ---------------------------------------------------------------- per-frame diagnostics
def test_frame_diag_reports_schema_handedness_and_face():
    payload = frame(100.0, [("Left", hand_points((0.4, 0.6)))], face=FACE)
    d = diagnostics.frame_diag(payload, parse_frame(payload), 66.7)
    assert d["feature_dim"] == FRAME_DIM == 147 and d["schema_ok"] and d["face_flag"] and d["face"]
    assert d["hands_valid"] == 1 and d["hands"][0]["mediapipe_label"] == "Left"
    assert d["hands"][0]["signer_hand"] == "right"          # unmirrored image: MediaPipe 'Left' = signer's right
    assert d["hands"][0]["face_relative"] is not None and d["dt_ms"] == pytest.approx(33.3)
    assert d["resolution"] == "640x480"
    no_face = frame(0, [("Right", hand_points())])
    d2 = diagnostics.frame_diag(no_face, parse_frame(no_face), None)
    assert not d2["face_flag"] and d2["hands"][0]["face_relative"] is None and d2["dt_ms"] is None
    empty = frame(0, [])
    assert diagnostics.frame_diag(empty, parse_frame(empty), None)["hands_valid"] == 0


def test_ood_stats_flag_unusual_segments(model):
    normal = frames_to_vector([parse_frame(f) for f in sign_frames("circle", rng=np.random.default_rng(1))], model.feature_config)
    ood_ok = diagnostics.ood_stats(model, normal)
    weird = normal + 25.0
    ood_bad = diagnostics.ood_stats(model, weird)
    assert ood_bad["mean_abs_z"] > ood_ok["mean_abs_z"] and ood_bad["out_of_distribution"]
    assert set(ood_ok["per_block_mean_abs_z"]) >= {"hand_shape", "face_relative", "orientation", "motion"}


def test_pipeline_events_name_the_responsible_stage(model):
    session = RecognitionSession(model, Vocabulary())
    events = []
    t = 0.0
    for f in empty_frames(0, 10) + sign_frames("circle", t0=400, rng=np.random.default_rng(2)) + empty_frames(1500, 20):
        events += session.process(f)
    decided = [e for e in events if e["type"] in ("sign", "uncertain", "segment")]
    assert decided, "the segment must be decided"
    for e in decided:
        assert e["diagnosis"]["stage"] in {"ok", "segmentation", "classification", "features", "translation"}
    state = [e for e in events if e["type"] == "state"][-1]
    assert "diag" in state and "threshold" in state


def test_analyze_frames_and_compare_extractions():
    frames = sign_frames("wave", n=30)
    for i, f in enumerate(frames):
        f["media_t"] = i / 30.0
    summary = diagnostics.analyze_frames(frames)
    assert summary["frames"] == 30 and summary["detection"]["frames_with_hands"] == 1.0
    assert summary["features"]["frame_dim_ok"] and summary["camera"]["mean_fps"] == pytest.approx(30, rel=0.05)
    python = [{**f, "t": i * 1000 / 30.0} for i, f in enumerate(sign_frames("wave", n=30))]
    cmp = diagnostics.compare_extractions(frames, python, 30.0)
    assert cmp["matched_frames"] == 30 and cmp["hand_presence_agreement"] == 1.0
    assert cmp["handedness_agreement"] == 1.0 and cmp["mean_landmark_distance"] == pytest.approx(0, abs=1e-6)


# ---------------------------------------------------------------- live evaluation
@pytest.fixture
def eval_dirs(tmp_path, monkeypatch):
    monkeypatch.setattr(live_eval, "EVAL_DATASET_DIR", tmp_path / "eval_recordings")
    monkeypatch.setattr(live_eval, "EVAL_SEQUENCE_DIR", tmp_path / "eval_sequences")
    return tmp_path


def test_live_evaluation_reports_metrics_false_detections_and_sequences(model, eval_dirs):
    rng = np.random.default_rng(11)
    store = live_eval.eval_store()
    for kind, label in CLASSES.items():
        for _ in range(3):
            store.save(label, sign_frames(kind, n=30, rng=rng, noise=0.003), "evalS", extra={"purpose": "eval",
                       "conditions": {"speed": "slow" if kind == "circle" else "normal"}})
    seq_frames, t = [], 0.0
    for kind in ("circle", "wave", "circle"):                 # a repeated sign inside a sequence
        seq_frames += empty_frames(t, 15)
        t += 500
        seq_frames += sign_frames(kind, t0=t, rng=rng)
        t += 1000
    seq_frames += empty_frames(t, 20)
    live_eval.save_sequence(["namaskara", "water", "namaskara"], seq_frames, "evalS", "signer1", {"speed": "normal"})
    rep = live_eval.evaluate_live(model, Vocabulary())
    iso, seq = rep["isolated"], rep["sequences"]
    assert iso["sign_recordings"] == 9 and iso["none_recordings"] == 3
    assert 0 <= iso["accuracy"] <= 1 and 0 <= iso["macro_f1"] <= 1
    assert "false_detections" in iso and "speed" in iso["accuracy_by_condition"]
    assert seq["sequences"] == 1 and seq["reference_signs"] == 3 and seq["sign_error_rate"] is not None
    assert rep["data"]["sequence_signs"] == 3


def test_sequence_validation(eval_dirs):
    from app.dataset.store import DatasetError
    with pytest.raises(DatasetError):
        live_eval.save_sequence([], sign_frames("circle"), "s1", "signer1")
    with pytest.raises(DatasetError):
        live_eval.save_sequence(["namaskara"], empty_frames(0, 10), "s1", "signer1")
    assert live_eval.clean_conditions({"speed": "fast", "evil": "x", "lighting": "DROP TABLE"}) == {"speed": "fast"}


# ---------------------------------------------------------------- API
@pytest.fixture(scope="module")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


def test_diagnostics_api(client, tmp_path, monkeypatch):
    schema = client.get("/api/diagnostics/schema").json()
    assert schema["frame_dim"] == 147 and schema["schema"] == "hands-face-v2"
    monkeypatch.setattr(diagnostics, "DIAG_DIR", tmp_path / "diag")
    r = client.post("/api/diagnostics/snapshot", json={"frames": sign_frames("push"), "events": [
        {"type": "uncertain", "diagnosis": {"stage": "classification", "detail": "x"}}], "note": "test"})
    assert r.status_code == 200 and r.json()["event_stages"] == {"classification": 1}
    assert list((tmp_path / "diag").glob("diag_*.json"))
    assert client.get("/api/diagnostics/video/amrita_slr/..%2F..%2Fsecret").status_code in (400, 404)


def test_eval_recordings_are_stored_apart_from_training_data(client, eval_dirs):
    body = {"label": "yes", "session_id": "evalS1", "frames": sign_frames("push"), "purpose": "eval",
            "conditions": {"distance": "far"}}
    r = client.post("/api/dataset/record", json=body)
    assert r.status_code == 200, r.text
    assert "never used for training" in r.json()["stored_in"]
    saved = list((eval_dirs / "eval_recordings" / "yes").glob("*.json"))
    assert len(saved) == 1
    doc = json.loads(saved[0].read_text(encoding="utf-8"))
    assert doc["purpose"] == "eval" and doc["conditions"] == {"distance": "far"}
    assert client.post("/api/dataset/record", json={**body, "purpose": "bogus"}).status_code == 422
    bad = client.post("/api/evaluation/sequence", json={"glosses": ["not_a_sign"], "session_id": "s", "frames": sign_frames("push")})
    assert bad.status_code == 400
    ok = client.post("/api/evaluation/sequence", json={"glosses": ["yes", "yes"], "session_id": "s", "frames": sign_frames("push")})
    assert ok.status_code == 200
    data = client.get("/api/evaluation/data").json()
    assert data["isolated"] == 1 and data["sequences"] == 1


def test_verified_split_separates_signs_performed_without_a_pause(model):
    from app.config import RecognitionSettings
    rng = np.random.default_rng(4)

    def run(split):
        cfg = RecognitionSettings(confidence_threshold=0.3, split_long=split)
        session = RecognitionSession(model, Vocabulary(), cfg)
        stream = empty_frames(0, 10) + sign_frames("circle", t0=333, n=36, rng=rng) + \
            sign_frames("push", t0=333 + 36 * 33.33, n=36, rng=rng) + empty_frames(333 + 72 * 33.33, 30)
        return [e["token"]["label"] for f in stream for e in session.process(f) if e["type"] == "sign"]

    merged, split = run(False), run(True)
    assert len(merged) <= 1                       # without a pause the two signs merge into one segment
    assert split == ["namaskara", "yes"]          # the classifier-verified split recovers both, in order


def test_face_dropout_augmentation_blanks_face_features_like_a_missing_face():
    from app.recognition.landmarks import FACE_FLAG_INDEX, FACEREL_OFFSET
    from app.recognition.sequence_features import augment_matrix, frames_to_matrix
    frames = [parse_frame({**f, "face": FACE}) for f in sign_frames("circle", n=30)]
    mat = frames_to_matrix(frames)
    assert mat[:, FACE_FLAG_INDEX].all()
    tcfg = TrainingConfig(face_dropout=1.0)
    out = augment_matrix(mat, np.random.default_rng(0), tcfg)
    blank = out[:, FACE_FLAG_INDEX] == 0
    assert blank.any() and np.all(out[blank, FACEREL_OFFSET:FACEREL_OFFSET + 3] == 0)
    kept = augment_matrix(mat, np.random.default_rng(0), TrainingConfig(face_dropout=0.0))
    assert kept[:, FACE_FLAG_INDEX].all()


def test_threshold_analysis_reports_false_detections_and_chooses_on_other_sessions():
    rows = []
    for sess in ("s1", "s2", "s3"):
        rows += [{"label": "yes", "pred": "yes", "conf": 0.9, "session": sess},
                 {"label": "yes", "pred": "water", "conf": 0.3, "session": sess},
                 {"label": "_none", "pred": "water", "conf": 0.35, "session": sess},
                 {"label": "_none", "pred": "_none", "conf": 0.8, "session": sess}]
    res = live_eval.threshold_analysis(rows, 0.45)
    low = [c for c in res["curve"] if c["threshold"] == 0.1][0]
    assert low["false_detections"] == 3 and low["wrong_words"] == 3      # a low threshold accepts junk
    assert res["at_model_threshold"]["false_detections"] == 0 and res["at_model_threshold"]["missed_signs"] == 3
    sel = res["selection"]
    assert sel["possible"] and len(sel["per_held_out_session"]) == 3
    assert all(0.35 < h["chosen_threshold"] <= 0.9 for h in sel["per_held_out_session"])
    assert sel["held_out_totals"]["false_detections"] == 0
    single = live_eval.threshold_analysis([dict(r, session="s1") for r in rows], 0.45)
    assert not single["selection"]["possible"]
