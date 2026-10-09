"""End-to-end check of SENTENCE mode over the live WebSocket (no camera).

Streams ISL-CSLTR sentence videos from a held-out recording round (the
continuous model is trained only on the other rounds, so these are unseen)
frame by frame to /ws/recognition in sentence mode and prints the decoded result.

Usage (from backend/, server running):  python tools/replay_sentences.py --group rec4 --n 6
"""
import argparse
import asyncio
import json
import random
import sys
from pathlib import Path

import websockets

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.continuous.dataset import CONTINUOUS_DIR  # noqa: E402


async def main(group: str, n: int, seed: int):
    files = [f for f in (CONTINUOUS_DIR / "isl_csltr").glob("*/*.json")
             if json.loads(f.read_text(encoding="utf-8"))["session_id"] == group]
    random.Random(seed).shuffle(files)
    async with websockets.connect("ws://127.0.0.1:8000/ws/recognition", max_size=2**24) as ws:
        hello = json.loads(await ws.recv())
        print("sentence model:", hello["continuous"]["version"], hello["continuous"]["selected_method"])
        await ws.send(json.dumps({"type": "config", "settings": {"mode": "sentence"}}))
        print("mode:", json.loads(await ws.recv())["settings"]["mode"])
        t, correct = 0.0, 0

        async def send(payload, out):
            await ws.send(json.dumps({"type": "frame", **payload}))
            while True:
                msg = json.loads(await ws.recv())
                if msg["type"] == "sentence":
                    out.append(msg)
                if msg["type"] == "state":
                    return

        for f in files[:n]:
            d = json.loads(f.read_text(encoding="utf-8"))
            got: list = []
            w, h = d["frames"][0]["w"], d["frames"][0]["h"]
            t0 = d["frames"][0]["t"]
            for fr in d["frames"]:
                await send({**fr, "t": t + fr["t"] - t0}, got)
            t += d["frames"][-1]["t"] - t0 + 33.3
            for _ in range(40):                       # hands down for ~1.3 s ends the sentence
                await send({"t": t, "w": w, "h": h, "hands": [], "face": None}, got)
                t += 33.3
            r = got[0] if got else None
            ok = bool(r and r["sentence"] == d["transcript"])
            correct += ok
            print(f"signed: {d['transcript']!r:40s} -> {r['sentence'] if r else None!r:40s} "
                  f"{'OK ' if ok else 'ERR'} glosses={' '.join(r['glosses']) if r else ''} | {r['kannada'] if r else ''}")
        print(f"{correct}/{min(n, len(files))} sentences correct (unseen recording round {group})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--group", default="rec4")
    ap.add_argument("--n", type=int, default=6)
    ap.add_argument("--seed", type=int, default=3)
    a = ap.parse_args()
    asyncio.run(main(a.group, a.n, a.seed))
