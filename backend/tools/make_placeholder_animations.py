"""Generates PLACEHOLDER avatar clips for the default vocabulary.

These are simple illustrative motions written by hand for the prototype. They are
NOT verified Indian Sign Language and are labelled as placeholders everywhere in
the UI. Replace them with clips captured from verified demonstrations
(Dataset & Model page -> "Use latest sample as avatar clip").

Run from backend/:  python tools/make_placeholder_animations.py
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import ANIMATION_MAPPING_FILE, ANIMATIONS_DIR  # noqa: E402
from app.animation.retarget import validate_animation  # noqa: E402

FLAT = [[0.3, 0.1, 0.05], [0.05, 0.05, 0.05], [0.05, 0.05, 0.05], [0.05, 0.05, 0.05], [0.05, 0.05, 0.05]]
FIST = [[0.7, 0.6, 0.5], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0]]
POINT = [[0.7, 0.6, 0.5], [0.0, 0.0, 0.0], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0]]
THUMB_UP = [[0.1, 0.0, 0.0], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0]]
BUNCH = [[0.6, 0.4, 0.3], [0.7, 0.6, 0.4], [0.7, 0.6, 0.4], [0.7, 0.6, 0.4], [0.7, 0.6, 0.4]]
TWO = [[0.7, 0.6, 0.5], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [1.5, 1.6, 1.0], [1.5, 1.6, 1.0]]

UP, FWD, BACK = [0, 1, 0], [0, 0, 1], [0, 0, -1]


def pose(pos, direction, normal, curl):
    return {"pos": [round(v, 4) for v in pos], "dir": direction, "normal": normal, "curl": curl}


def key(t, right=None, left=None):
    return {"t": round(t, 3), "right": right, "left": left}


def clip(sign_id, description, keyframes):
    return {"sign_id": sign_id, "type": "placeholder", "verified": False,
            "description": "PLACEHOLDER motion, not verified ISL. " + description,
            "duration": keyframes[-1]["t"], "keyframes": keyframes}


def circle(center, radius, n, t0, dur, make):
    out = []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        out.append(make(t0 + dur * i / n, [center[0] + radius * math.cos(a), center[1] + radius * math.sin(a), center[2]]))
    return out


def build():
    clips = {}
    r = lambda y: [-0.03, y, 0.22]  # noqa: E731
    l = lambda y: [0.03, y, 0.22]  # noqa: E731
    clips["namaskara"] = clip("namaskara", "Palms pressed together in front of the chest.", [
        key(0.0, pose(r(1.25), UP, [1, 0, 0], FLAT), pose(l(1.25), UP, [-1, 0, 0], FLAT)),
        key(0.6, pose(r(1.22), UP, [1, 0, 0], FLAT), pose(l(1.22), UP, [-1, 0, 0], FLAT)),
        key(1.1, pose(r(1.24), UP, [1, 0, 0], FLAT), pose(l(1.24), UP, [-1, 0, 0], FLAT)),
    ])
    clips["thank_you"] = clip("thank_you", "Flat hand moves from the chin forward and down.", [
        key(0.0, pose([-0.03, 1.52, 0.16], UP, BACK, FLAT)),
        key(0.6, pose([-0.06, 1.33, 0.38], [0, 0.4, 0.9], UP, FLAT)),
        key(0.9, pose([-0.06, 1.32, 0.39], [0, 0.4, 0.9], UP, FLAT)),
    ])
    clips["yes"] = clip("yes", "Fist nods up and down.", [
        key(t, pose([-0.14, 1.28, 0.32], UP if i % 2 == 0 else [0, 0.5, 0.85], FWD, FIST))
        for i, t in enumerate([0.0, 0.25, 0.5, 0.75, 1.0])
    ])
    clips["no"] = clip("no", "Raised index finger wags side to side.", [
        key(t, pose([x, 1.36, 0.32], UP, FWD, POINT))
        for t, x in [(0.0, -0.15), (0.2, -0.20), (0.4, -0.11), (0.6, -0.20), (0.8, -0.15)]
    ])
    clips["water"] = clip("water", "Two fingers tap near the mouth.", [
        key(t, pose([-0.02, 1.53, z], UP, BACK, TWO))
        for t, z in [(0.0, 0.22), (0.25, 0.17), (0.5, 0.22), (0.75, 0.17), (1.0, 0.22)]
    ])
    clips["food"] = clip("food", "Bunched fingertips move to the mouth twice.", [
        key(t, pose(p, [0, 0.3, -0.95], [1, 0, 0], BUNCH))
        for t, p in [(0.0, [-0.04, 1.44, 0.30]), (0.3, [-0.02, 1.53, 0.17]), (0.6, [-0.04, 1.44, 0.30]),
                     (0.9, [-0.02, 1.53, 0.17]), (1.2, [-0.04, 1.46, 0.28])]
    ])
    clips["help"] = clip("help", "Fist resting on the other flat palm, both lifted.", [
        key(t, pose([-0.01, y + 0.06, 0.32], UP, [1, 0, 0], THUMB_UP), pose([0.02, y, 0.32], FWD, UP, FLAT))
        for t, y in [(0.0, 1.14), (0.8, 1.26), (1.0, 1.26)]
    ])
    clips["please"] = clip("please", "Flat hand circles on the chest.",
                           circle([-0.04, 1.27, 0.16], 0.04, 8, 0.0, 1.2, lambda t, p: key(t, pose(p, UP, BACK, FLAT))))
    clips["sorry"] = clip("sorry", "Fist circles on the chest.",
                          circle([-0.04, 1.27, 0.17], 0.04, 8, 0.0, 1.2, lambda t, p: key(t, pose(p, UP, BACK, FIST))))
    clips["good"] = clip("good", "Thumb-up fist pushed slightly forward.", [
        key(0.0, pose([-0.12, 1.30, 0.28], FWD, [1, 0, 0], THUMB_UP)),
        key(0.5, pose([-0.12, 1.32, 0.38], FWD, [1, 0, 0], THUMB_UP)),
        key(0.9, pose([-0.12, 1.32, 0.38], FWD, [1, 0, 0], THUMB_UP)),
    ])
    clips["i_me"] = clip("i_me", "Index finger points to the signer's own chest.", [
        key(0.0, pose([-0.06, 1.28, 0.32], [0.1, 0, -1], [1, 0, 0], POINT)),
        key(0.4, pose([-0.06, 1.27, 0.24], [0.1, 0, -1], [1, 0, 0], POINT)),
        key(0.8, pose([-0.06, 1.27, 0.24], [0.1, 0, -1], [1, 0, 0], POINT)),
    ])
    clips["you"] = clip("you", "Index finger points forward towards the viewer.", [
        key(0.0, pose([-0.10, 1.30, 0.28], FWD, [1, 0, 0], POINT)),
        key(0.4, pose([-0.10, 1.31, 0.42], FWD, [1, 0, 0], POINT)),
        key(0.8, pose([-0.10, 1.31, 0.42], FWD, [1, 0, 0], POINT)),
    ])
    return clips


def main():
    out_dir = ANIMATIONS_DIR / "placeholder"
    out_dir.mkdir(parents=True, exist_ok=True)
    existing = {}
    if ANIMATION_MAPPING_FILE.exists():
        existing = json.loads(ANIMATION_MAPPING_FILE.read_text(encoding="utf-8")).get("animations", {})
    mapping = dict(existing)
    for sign_id, c in build().items():
        problems = validate_animation(c)
        assert not problems, (sign_id, problems)
        (out_dir / f"{sign_id}.json").write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding="utf-8")
        if mapping.get(sign_id, {}).get("type") != "captured":   # never overwrite a captured clip
            mapping[sign_id] = {"file": f"placeholder/{sign_id}.json", "type": "placeholder", "verified": False}
    data = {"_comment": "sign_id -> animation clip. type: 'captured' (retargeted from a recorded webcam sample) "
                        "or 'placeholder' (hand-written illustrative motion, NOT verified ISL). Set verified=true "
                        "only after an ISL-proficient reviewer confirms the clip.",
            "animations": mapping}
    ANIMATION_MAPPING_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(mapping)} animation entries")


if __name__ == "__main__":
    main()
