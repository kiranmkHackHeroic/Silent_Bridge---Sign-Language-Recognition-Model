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
    from app.dataset.store import DatasetStore
    monkeypatch.setattr(main.state, "dataset", DatasetStore(tmp_path / "empty"))
    r = client.post("/api/model/train")
    assert r.status_code == 202
    for _ in range(100):
        status = client.get("/api/model/train/status").json()
        if status["state"] != "running":
            break
        _t.sleep(0.05)
    assert status["state"] == "error" and "at least 2 classes" in status["error"]
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.post("/api/model/train").status_code == 202     # can retry after a failure
