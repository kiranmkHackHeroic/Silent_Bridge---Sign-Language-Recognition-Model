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


def reference_face(frames: list[dict]) -> dict:
    """One robust face reference per recording: median of all detected face boxes."""
    boxes = [f["face"] for f in frames if isinstance(f.get("face"), dict) and f["face"].get("w")]
    if not boxes:
        return dict(DEFAULT_FACE)
    return {k: float(np.median([b[k] for b in boxes])) for k in ("cx", "cy", "w")}


def side_for_labels(frames: list[dict]) -> dict[str, str]:
    """Map MediaPipe handedness labels to avatar arms BY IMAGE POSITION for this recording.

    The label whose hand is on average further left in the image drives the avatar's
    right arm (the avatar faces the viewer like the signer faces the camera). This stays
    consistent for mirrored front-camera videos, where MediaPipe's labels are swapped."""
    xs: dict[str, list[float]] = {}
    for f in frames:
        for h in f.get("hands") or []:
            lms = h.get("landmarks")
            if isinstance(lms, list) and len(lms) == 21:
                xs.setdefault(h.get("handedness"), []).append(float(lms[0][0]))
    means = {k: float(np.mean(v)) for k, v in xs.items() if k}
    if len(means) == 2:
        left_most = min(means, key=means.get)
        return {left_most: "right", (set(means) - {left_most}).pop(): "left"}
    if len(means) == 1:
        (label,) = means
        return {label: "right" if means[label] <= 0.5 else "left"}
    return dict(SIGNER_SIDE_FOR_LABEL)


MAX_GAP_S = 0.4          # tracking dropouts up to this long are interpolated, not shown as the arm dropping to rest
MIN_PRESENCE = 0.15      # a hand seen in fewer frames than this share is detector noise, not a signing hand
SMOOTH_SIGMA = 1.5       # Gaussian smoothing over time (in frames) of the tracked poses
IDLE_SPEED = 0.004       # wrist speed (m per frame) below which a hand counts as still
TRIM_MARGIN_S = 0.12     # motion kept before the first / after the last moving frame


def _blend_pose(a: dict, b: dict, w: float) -> dict:
    d = _unit((1 - w) * np.array(a["dir"]) + w * np.array(b["dir"]))
    n = (1 - w) * np.array(a["normal"]) + w * np.array(b["normal"])
    n = _unit(n - np.dot(n, d) * d)
    return {"pos": [round(float((1 - w) * x + w * y), 4) for x, y in zip(a["pos"], b["pos"])],
            "dir": [round(float(v), 4) for v in d], "normal": [round(float(v), 4) for v in n],
            "curl": [[round(float((1 - w) * x + w * y), 3) for x, y in zip(fa, fb)] for fa, fb in zip(a["curl"], b["curl"])]}


def clean_track(times: list[float], poses: list[dict | None]) -> list[dict | None]:
    """One hand's per-frame poses -> gaps filled, noise-only tracks removed, temporally smoothed."""
    n = len(poses)
    present = [p is not None for p in poses]
    if sum(present) < max(2, MIN_PRESENCE * n):
        return [None] * n
    out = list(poses)
    i = 0
    while i < n:                                  # interpolate short dropouts between two tracked frames
        if out[i] is None and i > 0 and out[i - 1] is not None:
            j = i
            while j < n and out[j] is None:
                j += 1
            if j < n and times[j] - times[i - 1] <= MAX_GAP_S:
                for k in range(i, j):
                    out[k] = _blend_pose(out[i - 1], out[j], (times[k] - times[i - 1]) / max(1e-6, times[j] - times[i - 1]))
            i = j
        else:
            i += 1
    radius = int(3 * SMOOTH_SIGMA)
    weights = np.exp(-0.5 * (np.arange(-radius, radius + 1) / SMOOTH_SIGMA) ** 2)
    smoothed: list[dict | None] = []
    for i, p in enumerate(out):                   # smooth within continuous runs only
        if p is None:
            smoothed.append(None)
            continue
        acc = {"pos": np.zeros(3), "dir": np.zeros(3), "normal": np.zeros(3), "curl": np.zeros((5, 3))}
        total = 0.0
        for off, wgt in zip(range(-radius, radius + 1), weights):
            j = i + off
            if 0 <= j < n and out[j] is not None:
                q = out[j]
                for key in ("pos", "dir", "normal"):
                    acc[key] += wgt * np.array(q[key])
                acc["curl"] += wgt * np.array(q["curl"])
                total += wgt
        d = _unit(acc["dir"] / total)
        nrm = acc["normal"] / total
        nrm = _unit(nrm - np.dot(nrm, d) * d)
        smoothed.append({"pos": [round(float(v), 4) for v in acc["pos"] / total], "dir": [round(float(v), 4) for v in d],
                         "normal": [round(float(v), 4) for v in nrm],
                         "curl": [[round(float(c), 3) for c in row] for row in acc["curl"] / total]})
    return smoothed


def _active_span(times: list[float], tracks: dict[str, list[dict | None]]) -> tuple[int, int]:
    """First/last frame where a hand moves (plus a small margin): drops motionless lead-in and tail holds."""
    n = len(times)
    moving = [False] * n
    for poses in tracks.values():
        for i in range(1, n):
            a, b = poses[i - 1], poses[i]
            if a is not None and b is not None and np.linalg.norm(np.array(b["pos"]) - np.array(a["pos"])) > IDLE_SPEED:
                moving[i] = True
    idx = [i for i, m in enumerate(moving) if m]
    if not idx:
        return 0, n - 1
    start, end = idx[0], idx[-1]
    while start > 0 and times[idx[0]] - times[start - 1] <= TRIM_MARGIN_S:
        start -= 1
    while end < n - 1 and times[end + 1] - times[idx[-1]] <= TRIM_MARGIN_S:
        end += 1
    return start, end


def sample_to_animation(sample: dict, sign_id: str, max_fps: float = 15.0) -> dict:
    frames = sample.get("frames") or []
    video = sample.get("video") or {}
    if not frames:
        raise ValueError("sample has no frames")
    face = reference_face(frames)
    sides = side_for_labels(frames)
    t0 = float(frames[0].get("t", 0.0))
    times: list[float] = []
    tracks: dict[str, list[dict | None]] = {"right": [], "left": []}
    for frame in frames:                          # every frame first: cleaning needs the full temporal resolution
        t = (float(frame.get("t", t0)) - t0) / 1000.0
        w = float(frame.get("w") or video.get("w") or 640)
        h = float(frame.get("h") or video.get("h") or 480)
        key = {"t": round(t, 3), "right": None, "left": None}
        for hand in frame.get("hands") or []:
            side = sides.get(hand.get("handedness"))
            lms = hand.get("landmarks")
            if side is None or not isinstance(lms, list) or len(lms) != 21 or key[side] is not None:
                continue
            pts = np.asarray(lms, dtype=np.float64)
            if pts.shape[1] == 2:
                pts = np.concatenate([pts, np.zeros((21, 1))], axis=1)
            if not np.all(np.isfinite(pts)):
                continue
            key[side] = hand_pose(pts, w / h, face, side)
        times.append(t)
        tracks["right"].append(key["right"])
        tracks["left"].append(key["left"])
    tracks = {side: clean_track(times, poses) for side, poses in tracks.items()}
    start, end = _active_span(times, tracks)
    keyframes = []
    last_t = -1.0
    for i in range(start, end + 1):              # then thin out to max_fps
        if times[i] - last_t < 1.0 / max_fps and i != end:
            continue
        if tracks["right"][i] is None and tracks["left"][i] is None:
            continue
        keyframes.append({"t": round(times[i], 3), "right": tracks["right"][i], "left": tracks["left"][i]})
        last_t = times[i]
    if len(keyframes) < 2:
        raise ValueError("not enough frames with hands to build an animation")
    base = keyframes[0]["t"]
    for k in keyframes:
        k["t"] = round(k["t"] - base, 3)
    return {
        "sign_id": sign_id,
        "type": "captured",
        "verified": False,
        "description": f"Motion captured from recorded sample {sample.get('sample_id')} (landmarks, approximate "
                       "retargeting). Mark verified only after checking against an ISL reference.",
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
