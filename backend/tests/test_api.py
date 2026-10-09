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
    assert body["items"][0]["animation"]["available"] is True


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
