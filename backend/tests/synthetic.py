"""Synthetic MediaPipe-like hand landmarks for tests (no camera required).

These are geometric test fixtures, not sign-language data.
"""
from __future__ import annotations

import math

import numpy as np

# finger base offsets (relative to wrist, in palm units) and directions for an open hand
_BASES = {1: (0.35, -0.25), 5: (0.25, -0.9), 9: (0.0, -1.0), 13: (-0.22, -0.92), 17: (-0.42, -0.8)}


def hand_points(wrist=(0.5, 0.6), size=0.12, shape="open", rotation=0.0, rng=None, noise=0.0):
    pts = np.zeros((21, 3))
    pts[0] = [0, 0, 0]
    for base, (bx, by) in _BASES.items():
        pts[base] = [bx, by, 0]
        if shape == "fist" or (shape == "point" and base != 5):
            dirs = [(0.0, 0.35), (0.0, 0.2), (0.0, 0.1)] if base != 1 else [(0.15, -0.1), (0.1, 0.0), (0.05, 0.05)]
        else:
            ang = math.atan2(by, bx)
            dirs = [(0.35 * math.cos(ang), 0.35 * math.sin(ang))] * 3
        prev = np.array([bx, by])
        for k, (dx, dy) in enumerate(dirs):
            prev = prev + np.array([dx, dy])
            pts[base + k + 1] = [prev[0], prev[1], 0.0]
    c, s = math.cos(rotation), math.sin(rotation)
    rot = np.array([[c, -s], [s, c]])
    pts[:, :2] = pts[:, :2] @ rot.T
    pts *= size
    pts[:, 0] += wrist[0]
    pts[:, 1] += wrist[1]
    if rng is not None and noise > 0:
        pts += rng.normal(0, noise, size=pts.shape)
    return pts


def frame(t, hands, w=640, h=480, face=None):
    return {
        "type": "frame", "t": t, "w": w, "h": h, "face": face,
        "hands": [{"handedness": label, "score": 0.95, "landmarks": pts.round(5).tolist()} for label, pts in hands],
    }


def sign_frames(kind: str, t0=0.0, n=30, fps=30.0, rng=None, noise=0.002, offset=(0.0, 0.0)):
    """Synthetic 'signs': distinct motions + hand shapes."""
    frames = []
    for i in range(n):
        p = i / max(1, n - 1)
        t = t0 + i * 1000.0 / fps
        ox, oy = offset
        if kind == "circle":
            wrist = (0.45 + ox + 0.12 * math.cos(2 * math.pi * p), 0.55 + oy + 0.12 * math.sin(2 * math.pi * p))
            pts = hand_points(wrist, shape="open", rng=rng, noise=noise)
        elif kind == "wave":
            wrist = (0.4 + ox + 0.2 * p, 0.5 + oy + 0.03 * math.sin(6 * math.pi * p))
            pts = hand_points(wrist, shape="point", rotation=0.3 * math.sin(4 * math.pi * p), rng=rng, noise=noise)
        elif kind == "push":
            wrist = (0.5 + ox, 0.7 + oy - 0.25 * p)
            pts = hand_points(wrist, size=0.10 + 0.06 * p, shape="fist", rng=rng, noise=noise)
        elif kind == "rest":
            wrist = (0.5 + ox + 0.01 * math.sin(p * 3), 0.85 + oy)
            pts = hand_points(wrist, shape="open", rotation=0.5, rng=rng, noise=noise)
        else:
            raise ValueError(kind)
        frames.append(frame(t, [("Left", pts)]))
    return frames


def empty_frames(t0, n, fps=30.0):
    return [frame(t0 + i * 1000.0 / fps, []) for i in range(n)]
