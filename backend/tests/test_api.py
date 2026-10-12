import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.synthetic import empty_frames, sign_frames


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_model_status_and_vocabulary(client):
    st = client.get("/api/model/status").json()
    assert "loaded" in st and "defaults" in st
    vocab = client.get("/api/vocabulary").json()
    labels = {v["label"] for v in vocab["labels"]}
    assert {"namaskara", "_none"} <= labels


def test_translate_valid(client):
    r = client.post("/api/translate/kannada", json={"text": "ನಮಸ್ಕಾರ ಬೆಂಗಳೂರು"})
    assert r.status_code == 200
    body = r.json()
    assert body["supported_count"] == 1
    assert body["unsupported"] == ["ಬೆಂಗಳೂರು"]
    assert "ಸಂಜ್ಞೆ ಲಭ್ಯವಿಲ್ಲ" in body["unsupported_message"]
    assert body["items"][0]["signs"][0]["animation"]["available"] is True


@pytest.mark.parametrize("payload,status", [
    ({"text": "   "}, 400),
    ({"text": "!!!"}, 400),
    ({}, 422),
    ({"text": "ಅ" * 2001}, 422),
    ({"text": 5}, 422),
])
def test_translate_invalid(client, payload, status):
    assert client.post("/api/translate/kannada", json=payload).status_code == status


def test_animation_endpoints(client):
    assert client.get("/api/animations/namaskara").status_code == 200
    assert client.get("/api/animations/not_a_sign").status_code == 404


def test_record_rejects_unknown_label_and_empty_frames(client):
    r = client.post("/api/dataset/record", json={"label": "nope_label", "session_id": "s1", "frames": [{"t": 0}]})
    assert r.status_code == 400
    r = client.post("/api/dataset/record", json={"label": "yes", "session_id": "s1", "frames": []})
    assert r.status_code == 422


def test_vocabulary_rejects_bad_label(client):
    r = client.post("/api/vocabulary", json={"label": "Bad Label", "english": "x", "kannada": "ಹೌದು"})
    assert r.status_code == 400


def test_websocket_stream(client):
    with client.websocket_connect("/ws/recognition") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "hello"
        ws.send_json({"type": "frame", "t": "bad", "hands": []})
        assert ws.receive_json()["type"] == "error"
        ws.send_json({"type": "bogus"})
        assert ws.receive_json()["type"] == "error"
        ws.send_json({"type": "config", "settings": {"confidence_threshold": 0.7, "mode": "invalid"}})
        cfg = ws.receive_json()
        assert cfg["applied"] == ["confidence_threshold"] and cfg["settings"]["mode"] == "segment"
        states = 0
        for payload in sign_frames("circle", n=10) + empty_frames(400, 2):
            ws.send_json(payload)
            while True:
                msg = ws.receive_json()
                if msg["type"] == "state":
                    states += 1
                    break
        assert states == 12
        ws.send_json({"type": "reset"})
        assert ws.receive_json()["type"] == "reset"


def test_kannada_round_trip_through_api(client):
    for text in ["ನಮಸ್ಕಾರ", "ಧನ್ಯವಾದಗಳು", "ನೀರು", "ಸಹಾಯ ಬೇಕು", "ನಿಮ್ಮ ಹೆಸರು ಏನು?"]:
        r = client.post("/api/translate/kannada", json={"text": text})
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/json")
        body = r.json()
        assert body["input"] == text                       # exact bytes back, no mojibake
        assert body["unsupported"] == []
    body = client.post("/api/translate/kannada", json={"text": "ನಿಮ್ಮ ಹೆಸರು ಏನು?"}).json()
    assert [s["sign_id"] for s in body["items"][0]["signs"]] == ["your", "name", "what"]
    assert [s["kannada"] for s in body["items"][0]["signs"]] == ["ನಿಮ್ಮ", "ಹೆಸರು", "ಏನು"]


def test_empty_translation_error_is_bilingual(client):
    detail = client.post("/api/translate/kannada", json={"text": "?!"}).json()["detail"]
    assert "ಕನ್ನಡ" in detail and "Kannada" in detail


def test_dataset_validation_and_sample_endpoints(client):
    v = client.get("/api/dataset/validation").json()
    assert {"total", "valid", "rejected", "per_class", "warnings", "dataset_hash"} <= set(v)
    assert client.get("/api/dataset/samples/yes/does_not_exist").status_code == 404
    assert client.get("/api/dataset/samples/..%2Fx/abc").status_code in (400, 404)


def test_training_failure_is_reported_and_server_recovers(client, monkeypatch, tmp_path):
    import time as _t
    from app import main
    from app.jobs import JobQueue
    from app.training import registry
    from app.training.train_model import TrainingError

    def boom(**_kw):
        raise TrainingError("need at least 2 classes with 3+ valid samples each")

    queue = JobQueue(tmp_path / "jobs.json", auto_train=False)
    queue.start()
    monkeypatch.setattr(main.state, "jobs", queue)
    monkeypatch.setattr(registry, "train_and_promote", boom)
    r = client.post("/api/model/train")
    assert r.status_code == 202
    for _ in range(100):
        status = client.get("/api/model/train/status").json()
        if status["state"] != "running":
            break
        _t.sleep(0.05)
    assert status["state"] == "error" and "at least 2 classes" in status["error"]
    assert client.get("/api/health").json()["status"] == "ok"
    failed = client.get("/api/jobs").json()["jobs"][0]
    assert failed["state"] == "failed"
    retry = client.post(f"/api/jobs/{failed['id']}/retry")
    assert retry.status_code == 200 and retry.json()["reason"].startswith("retry of")
    queue.stop()


def test_registry_and_dataset_endpoints(client):
    reg = client.get("/api/model/registry").json()
    assert {"active", "versions", "history"} <= set(reg)
    ds = client.get("/api/datasets").json()
    keys = {d["key"] for d in ds["datasets"]}
    assert {"amrita_slr", "isl_csltr", "include"} <= keys
    for d in ds["datasets"]:
        assert d["license"] and d["citation"] and d["source_url"].startswith("https://")
    assert client.post("/api/datasets/not_a_dataset/import").status_code == 404
    assert client.post("/api/jobs/nope/cancel").status_code == 404
    assert client.get("/api/uploads/zzzz").status_code == 404


def test_avatar_clip_from_uploaded_video(client, tmp_path, monkeypatch):
    """'Use as avatar clip' falls back to the user's own uploaded video when there is no webcam recording."""
    import json

    from app import main
    from app.animation.library import AnimationLibrary
    from app.dataset.store import DatasetStore

    landmarks = tmp_path / "landmarks"
    (landmarks / "include" / "namaskara").mkdir(parents=True)          # public dataset: never used here
    (landmarks / "my_uploads" / "namaskara").mkdir(parents=True)
    sample = {"sample_id": "u1", "label": "namaskara", "source": "my_uploads", "source_file": "C:/videos/my_namaskara.mp4",
              "frames": sign_frames("circle", n=40)}
    (landmarks / "my_uploads" / "namaskara" / "u1.json").write_text(json.dumps(sample), encoding="utf-8")
    (landmarks / "include" / "namaskara" / "p1.json").write_text(json.dumps({**sample, "sample_id": "p1"}), encoding="utf-8")
    monkeypatch.setattr(main, "PROCESSED_LANDMARKS_DIR", landmarks)
    monkeypatch.setattr(main.S(), "dataset", DatasetStore(tmp_path / "dataset"))
    lib = AnimationLibrary(tmp_path / "mapping.json", tmp_path / "animations")
    monkeypatch.setattr(main.S(), "animations", lib)

    entry = next(v for v in client.get("/api/vocabulary").json()["labels"] if v["label"] == "namaskara")
    assert entry["uploaded_samples"] == 1
    r = client.post("/api/animations/capture", json={"label": "namaskara"})
    assert r.status_code == 200, r.text
    assert r.json()["source"] == "uploaded video 'my_namaskara.mp4'"
    assert lib.info("namaskara")["type"] == "captured"
    assert client.post("/api/animations/capture", json={"label": "no_samples_here"}).status_code == 404
    assert client.post("/api/animations/capture", json={"label": "../x"}).status_code == 400
