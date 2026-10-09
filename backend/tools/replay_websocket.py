"""End-to-end check of the LIVE path without a camera.

Streams the landmark frames of dataset videos frame by frame to
ws://127.0.0.1:8000/ws/recognition, exactly like the browser does, and prints
the events that come back.

NOTE: the deployed model is refit on ALL valid data after evaluation, so these
videos were part of its training data. This checks the mechanics of the live
path (segmentation, classification, duplicate suppression, Kannada output) -
it is NOT an accuracy measurement. Unseen-signer accuracy is the held-out test
result reported in metrics.json.

Usage (from backend/, server running):  python tools/replay_websocket.py --group nachiketh --n 12
"""
import argparse
import asyncio
import json
import random
import sys
from pathlib import Path

import websockets

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import PROCESSED_LANDMARKS_DIR  # noqa: E402


async def main(group: str, n: int, seed: int):
    files = [f for f in (PROCESSED_LANDMARKS_DIR / "amrita_slr").glob("*/*.json")
             if json.loads(f.read_text(encoding="utf-8"))["session_id"] == group]
    random.Random(seed).shuffle(files)
    files = files[:n]
    truth, got = [], []
    async with websockets.connect("ws://127.0.0.1:8000/ws/recognition", max_size=2**24) as ws:
        hello = json.loads(await ws.recv())
        print("model:", hello["model"]["model_version"], hello["model"]["num_classes"], "classes")
        t = 0.0

        async def send(payload):
            await ws.send(json.dumps({"type": "frame", **payload}))
            while True:
                msg = json.loads(await ws.recv())
                if msg["type"] == "sign":
                    got.append(msg["token"]["label"])
                    print(f"   -> SIGN {msg['token']['label']:16s} {msg['token']['kannada']}  ({msg['token']['confidence']:.2f})")
                elif msg["type"] in ("uncertain", "segment"):
                    print(f"   -> {msg['type']} {msg.get('result', '')} best={msg.get('top', [{}])[0].get('label') if msg.get('top') else None}")
                if msg["type"] == "state":
                    return

        for f in files:
            d = json.loads(f.read_text(encoding="utf-8"))
            truth.append(d["label"])
            print(f"video of '{d['label']}' ({len(d['frames'])} frames)")
            w, h = d["frames"][0]["w"], d["frames"][0]["h"]
            for _ in range(15):
                await send({"t": t, "w": w, "h": h, "hands": [], "face": None})
                t += 33.3
            t0 = d["frames"][0]["t"]
            for fr in d["frames"]:
                await send({**fr, "t": t + fr["t"] - t0})
            t += d["frames"][-1]["t"] - t0 + 33.3
        for _ in range(20):
            await send({"t": t, "w": 640, "h": 480, "hands": [], "face": None})
            t += 33.3
    correct = sum(1 for a, b in zip(truth, got) if a == b)
    print(json.dumps({"videos": len(truth), "signs_added": len(got), "truth": truth, "emitted": got}, ensure_ascii=False))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--group", default="nachiketh")
    ap.add_argument("--n", type=int, default=12)
    ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()
    asyncio.run(main(a.group, a.n, a.seed))
