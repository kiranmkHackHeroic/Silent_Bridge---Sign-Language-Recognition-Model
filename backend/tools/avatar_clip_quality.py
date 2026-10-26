"""Objective quality measures for avatar clips (no ISL judgement - that needs ISL users).

  dropouts   : a hand that is tracked, disappears for <= 0.4 s and comes back (the avatar arm drops to rest and
               jumps back up mid-sign)
  jitter     : mean frame-to-frame change of the wrist velocity (cm per frame^2): tracking noise, not signing
  idle_share : share of the clip where neither wrist moves (lead-in/out holds, rest)

Usage (from backend/):  python tools/avatar_clip_quality.py [--type captured] [--json out.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.animation.library import AnimationLibrary  # noqa: E402


def clip_stats(clip: dict) -> dict:
    keys = clip["keyframes"]
    t = np.array([k["t"] for k in keys])
    out = {"frames": len(keys), "duration": float(t[-1]) if len(t) else 0.0, "dropouts": 0}
    speeds, jit = [], []
    for side in ("right", "left"):
        present = [k.get(side) is not None for k in keys]
        i = 0
        while i < len(present):
            if not present[i] and i > 0 and present[i - 1]:
                j = i
                while j < len(present) and not present[j]:
                    j += 1
                if j < len(present) and t[j] - t[i - 1] <= 0.4:
                    out["dropouts"] += 1
                i = j
            else:
                i += 1
        pos = [np.array(k[side]["pos"]) if k.get(side) else None for k in keys]
        for a, b, c in zip(pos, pos[1:], pos[2:]):
            if a is not None and b is not None and c is not None:
                jit.append(float(np.linalg.norm((c - b) - (b - a))) * 100)
        for a, b in zip(pos, pos[1:]):
            if a is not None and b is not None:
                speeds.append(float(np.linalg.norm(b - a)))
    out["jitter_cm"] = round(float(np.mean(jit)), 3) if jit else 0.0
    out["idle_share"] = round(float(np.mean([s < 0.004 for s in speeds])), 3) if speeds else 0.0
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", default="captured")
    ap.add_argument("--json", type=Path)
    a = ap.parse_args()
    lib = AnimationLibrary()
    rows = {}
    for sign in sorted(lib.mapping):
        clip = lib.get(sign)
        if clip and clip.get("type") == a.type:
            rows[sign] = clip_stats(clip)
    n = len(rows)
    summary = {"clips": n,
               "clips_with_dropouts": sum(r["dropouts"] > 0 for r in rows.values()),
               "dropouts_total": sum(r["dropouts"] for r in rows.values()),
               "mean_jitter_cm": round(float(np.mean([r["jitter_cm"] for r in rows.values()])), 3),
               "mean_idle_share": round(float(np.mean([r["idle_share"] for r in rows.values()])), 3),
               "mean_duration_s": round(float(np.mean([r["duration"] for r in rows.values()])), 2)}
    print(json.dumps(summary, indent=1))
    if a.json:
        a.json.write_text(json.dumps({"summary": summary, "clips": rows}, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
