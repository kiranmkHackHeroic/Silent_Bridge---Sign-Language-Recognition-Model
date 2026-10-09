"""Convert a recorded landmark sample into an avatar animation clip.

Animation clip format (shared with the frontend avatar player):
{
  "sign_id": str, "type": "captured" | "placeholder", "verified": bool,
  "description": str, "duration": seconds,
  "keyframes": [ {"t": seconds,
                  "right": HandPose | null, "left": HandPose | null} ]
}
HandPose = {"pos": [x, y, z]       wrist target in avatar metres (avatar faces +z,
                                   its right hand is on -x, origin at the feet),
            "dir": [x, y, z]       unit vector wrist -> middle-finger knuckle,
            "normal": [x, y, z]    unit palm normal (direction the palm faces),
            "curl": [[a, b, c] x 5] flexion (radians) of thumb, index, middle,
                                   ring, pinky joints from base to tip}
`null` means "this hand rests in the neutral pose".

Positions are estimated relative to the signer's face (which the browser sends
as a bounding box); depth is only roughly estimated from apparent hand size.
"""
from __future__ import annotations

import math

import numpy as np

from ..recognition.landmarks import SIGNER_SIDE_FOR_LABEL

AVATAR_HEAD = np.array([0.0, 1.62, 0.0])
AVATAR_FACE_WIDTH = 0.15
FINGERS = [(1, 2, 3, 4), (5, 6, 7, 8), (9, 10, 11, 12), (13, 14, 15, 16), (17, 18, 19, 20)]
DEFAULT_FACE = {"cx": 0.5, "cy": 0.3, "w": 0.18}


def _unit(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    return v / n if n > 1e-9 else v


def _angle(a: np.ndarray, b: np.ndarray) -> float:
    a, b = _unit(a), _unit(b)
    return float(math.acos(max(-1.0, min(1.0, float(np.dot(a, b))))))


def hand_pose(points_img: np.ndarray, aspect: float, face: dict, side: str) -> dict:
    """points_img: (21,3) raw MediaPipe coordinates (x,y in [0,1], z relative)."""
    # image space -> isotropic camera space -> avatar world axes (x right, y up, z towards viewer)
    p = points_img.astype(np.float64).copy()
    p[:, 0] *= aspect
    p[:, 2] *= aspect
    world = np.stack([p[:, 0], -p[:, 1], -p[:, 2]], axis=1)

    fcx = float(face.get("cx", DEFAULT_FACE["cx"])) * aspect
    fcy = float(face.get("cy", DEFAULT_FACE["cy"]))
    fw = max(float(face.get("w", DEFAULT_FACE["w"])) * aspect, 1e-3)
    scale = AVATAR_FACE_WIDTH / fw
    wrist = p[0]
    pos = AVATAR_HEAD + np.array([(wrist[0] - fcx) * scale, -(wrist[1] - fcy) * scale, 0.0])
    palm_len = float(np.linalg.norm(p[9, :2] - p[0, :2])) / fw
    pos[2] = float(np.clip(0.28 + (palm_len - 0.55) * 0.6, 0.12, 0.45))

    direction = _unit(world[9] - world[0])
    a, b = world[5] - world[0], world[17] - world[0]
    normal = np.cross(a, b) if side == "right" else np.cross(b, a)
    normal = _unit(normal - np.dot(normal, direction) * direction)

    curls = []
    for chain in FINGERS:
        joints = [0, *chain]
        bones = [world[joints[k + 1]] - world[joints[k]] for k in range(len(joints) - 1)]
        angles = [_angle(bones[k], bones[k + 1]) for k in range(len(bones) - 1)]
        curls.append([round(min(a_, 1.9), 3) for a_ in angles[:3]])
    return {"pos": [round(float(v), 4) for v in pos],
            "dir": [round(float(v), 4) for v in direction],
            "normal": [round(float(v), 4) for v in normal],
            "curl": curls}


def sample_to_animation(sample: dict, sign_id: str, max_fps: float = 15.0) -> dict:
    frames = sample.get("frames") or []
    video = sample.get("video") or {}
    if not frames:
        raise ValueError("sample has no frames")
    t0 = float(frames[0].get("t", 0.0))
    keyframes = []
    last_t = -1.0
    for frame in frames:
        t = (float(frame.get("t", t0)) - t0) / 1000.0
        if t - last_t < 1.0 / max_fps:
            continue
        w = float(frame.get("w") or video.get("w") or 640)
        h = float(frame.get("h") or video.get("h") or 480)
        face = frame.get("face") or DEFAULT_FACE
        key = {"t": round(t, 3), "right": None, "left": None}
        for hand in frame.get("hands") or []:
            side = SIGNER_SIDE_FOR_LABEL.get(hand.get("handedness"))
            lms = hand.get("landmarks")
            if side is None or not isinstance(lms, list) or len(lms) != 21 or key[side] is not None:
                continue
            pts = np.asarray(lms, dtype=np.float64)
            if pts.shape[1] == 2:
                pts = np.concatenate([pts, np.zeros((21, 1))], axis=1)
            if not np.all(np.isfinite(pts)):
                continue
            key[side] = hand_pose(pts, w / h, face, side)
        if key["right"] is None and key["left"] is None:
            continue
        keyframes.append(key)
        last_t = t
    if len(keyframes) < 2:
        raise ValueError("not enough frames with hands to build an animation")
    base = keyframes[0]["t"]
    for k in keyframes:
        k["t"] = round(k["t"] - base, 3)
    return {
        "sign_id": sign_id,
        "type": "captured",
        "verified": False,
        "description": f"Motion captured from recorded sample {sample.get('sample_id')} (webcam landmarks, "
                       "approximate retargeting). Mark verified only after checking against an ISL reference.",
        "duration": keyframes[-1]["t"],
        "keyframes": keyframes,
    }


def validate_animation(clip: dict) -> list[str]:
    """Returns a list of problems (empty if the clip is usable)."""
    problems = []
    if not isinstance(clip, dict):
        return ["clip must be an object"]
    for key in ("sign_id", "type", "keyframes"):
        if key not in clip:
            problems.append(f"missing '{key}'")
    keys = clip.get("keyframes") or []
    if len(keys) < 1:
        problems.append("no keyframes")
    last = -1.0
    for i, k in enumerate(keys):
        t = k.get("t")
        if not isinstance(t, (int, float)) or t < last:
            problems.append(f"keyframe {i}: time must be non-decreasing")
            break
        last = t
        for side in ("left", "right"):
            pose = k.get(side)
            if pose is None:
                continue
            for field, n in (("pos", 3), ("dir", 3), ("normal", 3)):
                v = pose.get(field)
                if not (isinstance(v, list) and len(v) == n and all(isinstance(x, (int, float)) for x in v)):
                    problems.append(f"keyframe {i} {side}.{field} invalid")
            curl = pose.get("curl")
            if not (isinstance(curl, list) and len(curl) == 5 and all(isinstance(c, list) and len(c) == 3 for c in curl)):
                problems.append(f"keyframe {i} {side}.curl invalid")
    return problems
