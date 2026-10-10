"""Video import, uploads, temporal model, model registry and job queue.

Videos here are generated on the fly (blank frames - no hands) and landmark data
is the synthetic test fixture: they exercise the code paths only.
"""
import io
import json
import time
import zipfile

import joblib
import numpy as np
import pytest

from app.config import FeatureConfig, TrainingConfig
from app.dataset.store import DatasetStore
from app.jobs import JobQueue, training_eligibility
from app.recognition.landmarks import FRAME_DIM, parse_frame
from app.training import registry
from app.training.temporal_models import TorchGRUClassifier
from app.uploads import UploadError, _safe_unzip, create_batch, parse_annotations
from app.video.extract import mirror_frame, probe_video
from tests.synthetic import frame, hand_points, sign_frames

KNOWN = {"namaskara", "water", "yes", "_none", "help"}
CLASSES = {"circle": "namaskara", "wave": "water", "push": "yes", "rest": "_none"}


def make_video(path, n=24, w=320, h=240):
    import cv2
    out = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 25.0, (w, h))
    for i in range(n):
        out.write(np.full((h, w, 3), 40 + i, dtype=np.uint8))
    out.release()
    return path


# ---------------------------------------------------------------- video
def test_probe_detects_valid_and_corrupt_videos(tmp_path):
    good = probe_video(make_video(tmp_path / "ok.mp4"))
    assert good.ok and good.frame_count == 24 and abs(good.fps - 25) < 1
    bad = tmp_path / "bad.mp4"
    bad.write_bytes(b"not a video at all")
    assert not probe_video(bad).ok
    short = probe_video(make_video(tmp_path / "short.mp4", n=3))
    assert not short.ok and any("too few frames" in p for p in short.problems)
    assert not probe_video(tmp_path / "x.txt").ok


def test_extractor_records_missing_hands_instead_of_inventing_them(tmp_path):
    from app.video.extract import LandmarkExtractor
    ex = LandmarkExtractor()
    try:
        frames, stats = ex.extract(make_video(tmp_path / "blank.mp4"))
    finally:
        ex.close()
    assert len(frames) == 24 and stats["hand_frames"] == 0
    assert all(f["hands"] == [] for f in frames)
    times = [f["t"] for f in frames]
    assert times == sorted(times)
    parsed = parse_frame(frames[0])            # same payload format as the browser
    assert parsed.vector.shape == (FRAME_DIM,) and not parsed.has_hands


def test_importer_rejects_video_without_hands(tmp_path, monkeypatch):
    from app.video import importer
    monkeypatch.setattr(importer, "LANDMARKS", tmp_path / "landmarks")
    monkeypatch.setattr(importer, "MANIFESTS", tmp_path / "manifests")
    monkeypatch.setattr(importer, "PROCESSED", tmp_path)
    item = importer.ImportItem(path=str(make_video(tmp_path / "v.mp4")), label="help", group="g1", source="unit")
    summary = importer.run_import("unit", [item], workers=1)
    assert summary["accepted"] == 0 and summary["rejected"] == 1
    assert "no landmarks invented" in summary["rejection_reasons"][0]
    assert (tmp_path / "manifests" / "unit.csv").exists()


def test_mirror_frame_swaps_hands_and_x():
    f = frame(0, [("Left", hand_points((0.3, 0.5)))], face={"cx": 0.4, "cy": 0.3, "w": 0.2, "h": 0.25})
    m = mirror_frame(f)
    assert m["hands"][0]["handedness"] == "Right"
    assert m["hands"][0]["landmarks"][0][0] == pytest.approx(1 - f["hands"][0]["landmarks"][0][0], abs=1e-4)
    assert m["face"]["cx"] == pytest.approx(0.6)
    assert mirror_frame(m)["hands"][0]["handedness"] == "Left"


# ---------------------------------------------------------------- uploads
def test_annotation_parsing_csv_and_json(tmp_path):
    c = tmp_path / "a.csv"
    c.write_text("file,label,signer,start,end,gloss\nclips/a.mp4,help,s1,0.5,2.0,HELP\n", encoding="utf-8")
    rows = parse_annotations(c)
    assert rows[0]["file"] == "clips/a.mp4" and rows[0]["start"] == 0.5 and rows[0]["gloss"] == ["HELP"]
    j = tmp_path / "a.json"
    j.write_text(json.dumps([{"file": "b.mp4", "label": "yes", "transcript": "ನಮಸ್ಕಾರ"}], ensure_ascii=False), encoding="utf-8")
    assert parse_annotations(j)[0]["transcript"] == "ನಮಸ್ಕಾರ"
    bad = tmp_path / "b.csv"
    bad.write_text("label\nhelp\n", encoding="utf-8")
    with pytest.raises(UploadError):
        parse_annotations(bad)


def test_zip_with_path_traversal_is_refused(tmp_path):
    z = tmp_path / "evil.zip"
    with zipfile.ZipFile(z, "w") as zf:
        zf.writestr("../../escape.txt", "x")
    with pytest.raises(UploadError):
        _safe_unzip(z, tmp_path / "out")
    assert not (tmp_path / "escape.txt").exists()


def test_upload_batch_preview_label_rules(tmp_path, monkeypatch):
    from app import uploads
    monkeypatch.setattr(uploads, "UPLOADS", tmp_path / "uploads")
    video = make_video(tmp_path / "clip.mp4").read_bytes()
    batch = create_batch([("clip.mp4", video)], "my set", "me", "s1", "single", "help", KNOWN)
    assert batch["ready"] == 1 and batch["items"][0]["label"] == "help" and batch["dataset"] == "my_set"
    unknown = create_batch([("clip.mp4", video)], "x", "me", "s1", "single", "dancing", KNOWN)
    assert unknown["ready"] == 0 and "not in the vocabulary" in unknown["items"][0]["problems"][0]
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("set/help/one.mp4", video)
        zf.writestr("set/yes/two.mp4", video)
    folders = create_batch([("set.zip", buf.getvalue())], "z", "me", "s1", "folders", "", KNOWN)
    assert sorted(i["label"] for i in folders["items"]) == ["help", "yes"]
    # annotation mode without an annotation file must not guess labels from file names
    no_ann = create_batch([("help.mp4", video)], "a", "me", "s1", "annotation", "", KNOWN)
    assert no_ann["ready"] == 0 and no_ann["problems"]


# ---------------------------------------------------------------- temporal model
def test_gru_learns_and_survives_save_load(tmp_path):
    rng = np.random.default_rng(0)
    T, F, extra = 16, FRAME_DIM, 92
    X = rng.normal(0, 1, size=(80, T * F + extra)).astype(np.float32)
    y = np.array(["a"] * 40 + ["b"] * 40)
    X[:40, : T * F : F] += 3.0                     # class "a" has a strong per-frame signal
    model = TorchGRUClassifier(seq_len=T, frame_dim=F, epochs=150, patience=60, hidden=16, seed=1).fit(X, y)
    assert (model.predict(X) == y).mean() > 0.9
    joblib.dump(model, tmp_path / "gru.joblib")
    loaded = joblib.load(tmp_path / "gru.joblib")
    np.testing.assert_allclose(loaded.predict_proba(X[:5]), model.predict_proba(X[:5]), atol=1e-6)
    assert list(loaded.classes_) == ["a", "b"] and loaded.n_features_in_ == X.shape[1]


# ---------------------------------------------------------------- registry
def _synthetic_store(path, sessions=("sA", "sB", "sC")):
    store = DatasetStore(path)
    rng = np.random.default_rng(3)
    for s in sessions:
        for kind, label in CLASSES.items():
            for _ in range(4):
                store.save(label, sign_frames(kind, n=int(rng.integers(24, 34)), rng=rng, noise=0.003), s)
    return store


def test_registry_promotes_rejects_and_rolls_back(tmp_path):
    stores = [("app", _synthetic_store(tmp_path / "ds"))]
    root = tmp_path / "models"
    fast = dict(augment_copies=0, candidate_models=["logreg"])
    first = registry.train_and_promote(TrainingConfig(**fast), stores=stores, known_labels=KNOWN, root=root)
    assert first["promoted"] and registry.active_version(root) == first["version"]
    time.sleep(1.1)                                   # versions are timestamped per second
    strict = registry.train_and_promote(TrainingConfig(**fast, min_test_macro_f1=1.01), stores=stores,
                                        known_labels=KNOWN, root=root)
    assert not strict["promoted"] and "below the acceptance threshold" in strict["decision"]
    assert strict["comparison"]["previous_version"] == first["version"]
    # the first model's final fit saw every sample, yet a fair comparison is still made: both
    # development-only models were scored on the identical held-out test set
    assert strict["comparison"]["fair_test_samples"] > 0 and "previous_macro_f1" in strict["comparison"]
    assert registry.active_version(root) == first["version"]        # previous model stays active
    statuses = {v["version"]: v["status"] for v in registry.list_versions(root)}
    assert statuses[strict["version"]] == "rejected"
    time.sleep(1.1)
    third = registry.train_and_promote(TrainingConfig(**fast), stores=stores, known_labels=KNOWN, root=root)
    assert third["promoted"]
    assert registry.rollback(root) == first["version"]
    assert registry.active_version(root) == first["version"]
    model_file, _, _ = registry.active_paths(root)
    assert first["version"] in str(model_file)


# ---------------------------------------------------------------- jobs
def test_job_queue_recovers_running_jobs_and_supports_cancel_retry(tmp_path):
    path = tmp_path / "jobs.json"
    path.write_text(json.dumps({"jobs": [{"id": "abc", "type": "train", "title": "t", "params": {}, "reason": "",
                                          "state": "running", "stage": "x", "progress": 0.5, "error": None,
                                          "result": None, "created_at": "", "started_at": "", "finished_at": None}]}),
                    encoding="utf-8")
    q = JobQueue(path, auto_train=False)              # not started: inspect state only
    assert q.get("abc")["state"] == "queued"            # interrupted job resumes after restart
    assert q.cancel("abc")["state"] == "cancelled"
    with pytest.raises(ValueError):
        q.cancel("abc")
    retry = q.retry("abc")
    assert retry["state"] == "queued" and retry["type"] == "train"
    assert q.active_training()["id"] == retry["id"]
    assert json.loads(path.read_text(encoding="utf-8"))["jobs"][-1]["id"] == retry["id"]


def test_job_failure_is_recorded_and_worker_survives(tmp_path):
    q = JobQueue(tmp_path / "jobs.json", auto_train=False)
    q.start()
    bad = q.submit("import_dataset", {"dataset": "does_not_exist"})
    unknown = q.submit("mystery")
    for _ in range(100):
        if q.get(unknown["id"])["state"] in ("done", "failed"):
            break
        time.sleep(0.05)
    q.stop()
    assert q.get(bad["id"])["state"] == "failed" and q.get(unknown["id"])["state"] == "failed"
    assert "unknown job type" in q.get(unknown["id"])["error"]


def test_training_eligibility_rules(tmp_path):
    empty = training_eligibility(tmp_path / "models", stores=[("app", DatasetStore(tmp_path / "e"))], known=KNOWN)
    assert not empty["eligible"] and "at least 2 classes" in empty["reasons"][0]
    full = training_eligibility(tmp_path / "models", stores=[("app", _synthetic_store(tmp_path / "ds"))], known=KNOWN)
    assert full["eligible"] and full["usable_classes"] == 4 and full["new_samples"] == 48
