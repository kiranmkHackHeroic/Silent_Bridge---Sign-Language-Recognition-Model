"""Per-frame landmark parsing and normalization.

The browser runs MediaPipe Hand Landmarker locally and sends only raw landmark
coordinates (never camera frames). This module converts one frame into a
fixed-size feature vector. It is the single source of truth for normalization:
recording, training and live inference all go through `parse_frame`.

Per hand (64 values):
  * 60  hand-shape values: 20 landmarks relative to the wrist, divided by palm size
        (translation- and scale-invariant; rotation is kept because hand
        orientation is meaningful in sign language)
  * 3   wrist position (centred image coordinates) and palm size
  * 1   presence flag
Two hand slots -> 128 values per frame. A missing hand is encoded with an explicit
presence flag of 0 (its values are masked to 0); frames with no hands at all are
flagged `has_hands=False` and are never classified as a sign.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

NUM_LANDMARKS = 21
HAND_SHAPE_DIM = (NUM_LANDMARKS - 1) * 3      # 60
HAND_DIM = HAND_SHAPE_DIM + 3 + 1              # 64
FRAME_DIM = HAND_DIM * 2                       # 128
SLOTS = ("Left", "Right")                      # MediaPipe handedness labels

# Indices inside one hand block
POS_OFFSET = HAND_SHAPE_DIM                    # x, y, size
PRESENCE_OFFSET = HAND_SHAPE_DIM + 3

# MediaPipe labels handedness assuming a mirrored (selfie) image. We send the
# un-mirrored camera image, so the label "Left" is the signer's right hand. This
# only matters for avatar retargeting; recognition just needs consistency.
SIGNER_SIDE_FOR_LABEL = {"Left": "right", "Right": "left"}

_MIN_PALM = 1e-3


class FrameValidationError(ValueError):
    pass


@dataclass
class FrameFeatures:
    t: float                                   # timestamp in ms
    vector: np.ndarray                         # (FRAME_DIM,) float32
    present: tuple[bool, bool]                 # per slot
    points: dict[str, np.ndarray] = field(default_factory=dict)  # slot -> (21,3) aspect-corrected
    motion: float = 0.0                        # filled in by `compute_motion`

    @property
    def has_hands(self) -> bool:
        return self.present[0] or self.present[1]


def _parse_points(raw) -> np.ndarray | None:
    if not isinstance(raw, (list, tuple)) or len(raw) != NUM_LANDMARKS:
        return None
    try:
        pts = np.asarray(raw, dtype=np.float64)
    except (TypeError, ValueError):
        return None
    if pts.shape == (NUM_LANDMARKS, 2):
        pts = np.concatenate([pts, np.zeros((NUM_LANDMARKS, 1))], axis=1)
    if pts.shape != (NUM_LANDMARKS, 3) or not np.all(np.isfinite(pts)):
        return None
    if np.any(np.abs(pts[:, :2]) > 3.0):       # far outside the image: corrupt data
        return None
    return pts


def normalize_hand(points: np.ndarray, aspect: float = 1.0) -> np.ndarray | None:
    """points: (21,3) aspect-corrected coordinates (x multiplied by width/height).

    Returns a (HAND_DIM,) block, or None if the hand is degenerate.
    """
    wrist = points[0]
    palm = np.mean([
        np.linalg.norm(points[9, :2] - wrist[:2]),
        np.linalg.norm(points[5, :2] - wrist[:2]),
        np.linalg.norm(points[17, :2] - wrist[:2]),
    ])
    if not math.isfinite(palm) or palm < _MIN_PALM:
        return None
    shape = np.clip((points[1:] - wrist) / palm, -6.0, 6.0).reshape(-1)
    out = np.empty(HAND_DIM, dtype=np.float32)
    out[:HAND_SHAPE_DIM] = shape
    out[POS_OFFSET] = (wrist[0] - 0.5 * aspect) * 2.0
    out[POS_OFFSET + 1] = (wrist[1] - 0.5) * 2.0
    out[POS_OFFSET + 2] = palm * 5.0
    out[PRESENCE_OFFSET] = 1.0
    return out




def parse_frame(payload: dict) -> FrameFeatures:
    """Convert one browser frame payload into FrameFeatures.

    payload = {"t": ms, "w": video_width, "h": video_height,
               "hands": [{"handedness": "Left"|"Right", "score": float,
                          "landmarks": [[x, y, z] * 21]}]}
    Invalid hands are dropped (not zero-filled); an invalid envelope raises.
    """
    if not isinstance(payload, dict):
        raise FrameValidationError("frame must be an object")
    try:
        t = float(payload.get("t", 0.0))
        w = float(payload.get("w", 640) or 640)
        h = float(payload.get("h", 480) or 480)
    except (TypeError, ValueError) as exc:
        raise FrameValidationError(f"bad frame header: {exc}") from exc
    if not (math.isfinite(t) and w > 0 and h > 0):
        raise FrameValidationError("bad frame header values")
    aspect = w / h
    hands = payload.get("hands") or []
    if not isinstance(hands, list):
        raise FrameValidationError("hands must be a list")

    parsed: list[tuple[str | None, float, np.ndarray]] = []
    for hand in hands[:4]:
        if not isinstance(hand, dict):
            continue
        pts = _parse_points(hand.get("landmarks"))
        if pts is None:
            continue
        pts = pts.copy()
        pts[:, 0] *= aspect
        pts[:, 2] *= aspect
        label = hand.get("handedness")
        label = label if label in SLOTS else None
        try:
            score = float(hand.get("score", 1.0))
        except (TypeError, ValueError):
            score = 0.0
        parsed.append((label, score, pts))

    slots = assign_slots(parsed, aspect)
    vector = np.zeros(FRAME_DIM, dtype=np.float32)
    present = [False, False]
    points: dict[str, np.ndarray] = {}
    for i, slot in enumerate(SLOTS):
        pts = slots.get(slot)
        if pts is None:
            continue
        block = normalize_hand(pts, aspect)
        if block is None:
            continue
        vector[i * HAND_DIM:(i + 1) * HAND_DIM] = block
        present[i] = True
        points[slot] = pts
    return FrameFeatures(t=t, vector=vector, present=(present[0], present[1]), points=points)


def assign_slots(parsed: list[tuple[str | None, float, np.ndarray]], aspect: float = 1.0) -> dict[str, np.ndarray]:
    """Place up to two hands into the Left/Right slots.

    Uses MediaPipe handedness when unambiguous; if both hands carry the same
    label (or none), falls back to horizontal position (label 'Left' = signer's
    right hand = smaller x in the un-mirrored image).
    """
    best = sorted(parsed, key=lambda p: -p[1])[:2]
    if not best:
        return {}
    if len(best) == 1:
        label, _, pts = best[0]
        if label is None:
            label = "Left" if pts[0, 0] < 0.5 * aspect else "Right"
        return {label: pts}
    (la, _, pa), (lb, _, pb) = best
    if la is not None and lb is not None and la != lb:
        return {la: pa, lb: pb}
    first, second = (pa, pb) if pa[0, 0] <= pb[0, 0] else (pb, pa)
    return {"Left": first, "Right": second}


def compute_motion(prev: FrameFeatures | None, cur: FrameFeatures) -> float:
    """Mean landmark displacement (aspect-corrected image units) per 30 fps frame."""
    if prev is None or not cur.has_hands:
        cur.motion = 0.0
        return 0.0
    dt = cur.t - prev.t
    if not math.isfinite(dt) or dt <= 0:
        dt = 33.3
    dt = min(dt, 250.0)
    values = []
    for slot, pts in cur.points.items():
        prev_pts = prev.points.get(slot)
        if prev_pts is None:
            continue
        values.append(float(np.mean(np.linalg.norm(pts[:, :2] - prev_pts[:, :2], axis=1))))
    motion = (max(values) * (33.3 / dt)) if values else 0.0
    cur.motion = motion
    return motion
