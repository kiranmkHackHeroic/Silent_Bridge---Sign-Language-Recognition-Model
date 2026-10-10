"""Check the "Latest completed sign" trace against the decision, through the RUNNING server's WebSocket.

Streams labelled dataset recordings frame by frame (hands down before and after), and for every completed
sign verifies: the trace's combined top-1 equals the event's top-1 (label and probability), the decision is
consistent with the session threshold, the model input passes the dimension check and the class mapping
is consistent. Prints one line per completed sign and exits non-zero on any inconsistency.

Usage (from backend/, server running):  python tools/verify_sign_trace.py [sample_id ...]
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import websockets

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import PROCESSED_LANDMARKS_DIR  # noqa: E402

DEFAULT = ["amrita_slr_48f729f636d0fe", "amrita_slr_4498e2c6305d86", "amrita_slr_1eb298984fe5e6", "amrita_slr_c2b0d006edc3de"]


async def main(ids):
    files = {f.stem: f for f in PROCESSED_LANDMARKS_DIR.glob("*/*/*.json")}
    issues = checked = 0
    async with websockets.connect("ws://127.0.0.1:8000/ws/recognition", max_size=2 ** 24) as ws:
        hello = json.loads(await ws.recv())
        thr = hello["settings"]["confidence_threshold"]
        print(f"model {hello['model']['model_version']}, threshold {thr}, trim_still_tail {hello['settings']['trim_still_tail']}")
        t = 0.0
        for sid in ids:
            d = json.loads(files[sid].read_text(encoding="utf-8"))
            fr, t0 = d["frames"], d["frames"][0]["t"]
            seq = [{"t": t + i * 33.3, "w": 640, "h": 480, "hands": []} for i in range(10)]
            t += 333.0
            seq += [{**f, "t": t + f["t"] - t0} for f in fr]
            t = seq[-1]["t"] + 33.3
            seq += [{"t": t + i * 33.3, "w": 640, "h": 480, "hands": []} for i in range(25)]
            t = seq[-1]["t"] + 33.3
            for f in seq:
                await ws.send(json.dumps({"type": "frame", **f}))
                while True:
                    m = json.loads(await ws.recv())
                    if m["type"] == "state":
                        break
                    if m["type"] not in ("sign", "uncertain", "segment") or not m.get("trace") or not m.get("top"):
                        continue
                    tr, top = m["trace"], m["top"][0]
                    comb = tr["combined_top3"][0]
                    ok_top = comb["label"] == top["label"] and abs(comb["p"] - top["confidence"]) < 0.002
                    ok_dec = True
                    if m["type"] == "sign":
                        ok_dec = top["confidence"] >= thr
                    elif m["type"] == "uncertain":
                        ok_dec = top["confidence"] < thr
                    ok = ok_top and ok_dec and tr["input"]["ok"] and tr.get("class_mapping_ok", True)
                    checked += 1
                    issues += not ok
                    mem = {x["model"]: x["top3"][0] for x in tr.get("members", [])}
                    print(f"{d['label']:10s} -> {m['type']:9s} {m.get('result') or '':12s} combined {[(c['label'], c['p']) for c in tr['combined_top3']]} "
                          f"| members {mem} | input {tr['input'].get('dim')} | {tr['segment']['boundary']} "
                          f"trimmed {tr['segment']['still_tail_frames_trimmed']} | {'OK' if ok else 'INCONSISTENT'}")
    print(f"checked {checked} completed signs, inconsistencies: {issues}")
    return issues


if __name__ == "__main__":
    sys.exit(1 if asyncio.run(main(sys.argv[1:] or DEFAULT)) else 0)
