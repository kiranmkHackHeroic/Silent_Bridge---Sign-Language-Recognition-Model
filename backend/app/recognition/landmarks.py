"""Per-frame landmark parsing and normalization (feature schema "hands-face-v2").

The browser runs MediaPipe Hand/Face Landmarker locally and sends only landmark
coordinates (never camera frames). This module converts one frame into a
fixed-size feature vector. It is the single source of truth for normalization:
recording, training and live inference all go through `parse_frame`.

Per hand slot (73 values):
  * 60  hand shape: 20 landmarks relative to the wrist, divided by palm size
        (translation/scale invariant; rotation kept - orientation is meaningful)
  * 3   wrist position in centred image coordinates + palm size
  * 3   wrist position relative to the signer's face, in face widths, + palm
        size / face width  (location of the sign relative to the body; 0 when
        no face is visible, see the frame-level face flag)
  * 6   orientation: unit finger direction (wrist -> middle knuckle) and unit
        palm normal
  * 1   presence flag
Two slots + 1 frame-level face-present flag -> 147 values per frame.

A missing hand is encoded with presence 0 and masked values; frames with no
hands at all are flagged `has_hands=False` and are never classified as a sign.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

FEATURE_SCHEMA = "hands-face-v2"
NUM_LANDMARKS = 21
HAND_SHAPE_DIM = (NUM_LANDMARKS - 1) * 3      # 60
POS_OFFSET = HAND_SHAPE_DIM                    # image x, y, palm size
FACEREL_OFFSET = POS_OFFSET + 3                # face-relative dx, dy, size
ORIENT_OFFSET = FACEREL_OFFSET + 3             # finger dir (3) + palm normal (3)
PRESENCE_OFFSET = ORIENT_OFFSET + 6
HAND_DIM = PRESENCE_OFFSET + 1                 # 73
FACE_FLAG_INDEX = HAND_DIM * 2                 # 146
FRAME_DIM = HAND_DIM * 2 + 1                   # 147
SLOTS = ("Left", "Right")                      # MediaPipe handedness labels

# MediaPipe labels handedness assuming a mirrored (selfie) image. We send the
# un-mirrored camera image, so the label "Left" is the signer's right hand.
SIGNER_SIDE_FOR_LABEL = {"Left": "right", "Right": "left"}

_MIN_PALM = 1e-3
_MIN_FACE = 0.02


class FrameValidationError(ValueError):
    pass


@dataclass
class FrameFeatures:
    t: float                                   # timestamp in ms
    vector: np.ndarray                         # (FRAME_DIM,) float32
    present: tuple[bool, bool]                 # per slot
    points: dict[str, np.ndarray] = field(default_factory=dict)  # slot -> (21,3) aspect-corrected
    motion: float = 0.0                        # filled in by `compute_motion`
    face: bool = False

    @property
    def has_hands(self) -> bool:
        return self.present[0] or self.present[1]


def _unit(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    return v / n if n > 1e-9 else np.zeros_like(v)


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


def parse_face(raw, aspect: float) -> tuple[float, float, float] | None:
    """Face box {cx, cy, w} (normalized image coords) -> (cx*aspect, cy, w*aspect) or None."""
    if not isinstance(raw, dict):
        return None
    try:
        cx, cy, w = float(raw["cx"]), float(raw["cy"]), float(raw["w"])
    except (KeyError, TypeError, ValueError):
        return None
    if not all(math.isfinite(v) for v in (cx, cy, w)) or w < _MIN_FACE or not (-0.5 < cx < 1.5 and -0.5 < cy < 1.5):
        return None
    return cx * aspect, cy, w * aspect


def normalize_hand(points: np.ndarray, aspect: float = 1.0, slot: str = "Left",
                   face: tuple[float, float, float] | None = None) -> np.ndarray | None:
    """points: (21,3) aspect-corrected coordinates (x and z multiplied by width/height).

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
    out = np.zeros(HAND_DIM, dtype=np.float32)
    out[:HAND_SHAPE_DIM] = np.clip((points[1:] - wrist) / palm, -6.0, 6.0).reshape(-1)
    out[POS_OFFSET] = (wrist[0] - 0.5 * aspect) * 2.0
    out[POS_OFFSET + 1] = (wrist[1] - 0.5) * 2.0
    out[POS_OFFSET + 2] = palm * 5.0
    if face is not None:
        fcx, fcy, fw = face
        out[FACEREL_OFFSET] = np.clip((wrist[0] - fcx) / fw, -6, 6)
        out[FACEREL_OFFSET + 1] = np.clip((wrist[1] - fcy) / fw, -6, 6)
        out[FACEREL_OFFSET + 2] = np.clip(palm / fw, 0, 4)
    finger_dir = _unit(points[9] - wrist)
    a, b = points[5] - wrist, points[17] - wrist
    # same physical meaning (palm-facing direction) for both slots
    normal = _unit(np.cross(a, b) if slot == "Left" else np.cross(b, a))
    out[ORIENT_OFFSET:ORIENT_OFFSET + 3] = finger_dir
    out[ORIENT_OFFSET + 3:ORIENT_OFFSET + 6] = normal
    out[PRESENCE_OFFSET] = 1.0
    return out


def parse_frame(payload: dict) -> FrameFeatures:
    """Convert one browser frame payload into FrameFeatures.

    payload = {"t": ms, "w": video_width, "h": video_height,
               "hands": [{"handedness": "Left"|"Right", "score": float,
                          "landmarks": [[x, y, z] * 21]}],
               "face": {"cx", "cy", "w", "h"} | null}
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
    face = parse_face(payload.get("face"), aspect)

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
        block = normalize_hand(pts, aspect, slot, face)
        if block is None:
            continue
        vector[i * HAND_DIM:(i + 1) * HAND_DIM] = block
        present[i] = True
        points[slot] = pts
    vector[FACE_FLAG_INDEX] = 1.0 if face is not None else 0.0
    return FrameFeatures(t=t, vector=vector, present=(present[0], present[1]), points=points, face=face is not None)


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
