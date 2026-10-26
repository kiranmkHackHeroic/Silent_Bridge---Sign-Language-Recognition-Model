import json

import numpy as np

from app.animation.library import AnimationLibrary
from app.animation.retarget import sample_to_animation, validate_animation
from app.config import ANIMATION_MAPPING_FILE
from app.translation.kannada_mapping import KannadaSignMapper
from tests.synthetic import sign_frames


def test_every_mapped_clip_is_valid_and_labelled_unverified():
    lib = AnimationLibrary()
    assert lib.mapping, "animation_mapping.json should list clips"
    for sign_id in lib.mapping:
        clip = lib.get(sign_id)
        assert clip is not None, sign_id
        assert validate_animation(clip) == []
        assert clip["verified"] is False
        assert clip["type"] in ("placeholder", "captured")


def test_kannada_text_to_animation_lookup():
    lib, mapper = AnimationLibrary(), KannadaSignMapper()
    items = mapper.translate("ನಮಸ್ಕಾರ ಧನ್ಯವಾದಗಳು")
    clips = [lib.get(sid) for i in items for sid in i["sign_ids"]]
    assert [c["sign_id"] for c in clips] == ["namaskara", "thank_you"]


def test_unsupported_animation_returns_none(tmp_path):
    lib = AnimationLibrary()
    assert lib.get("definitely_not_a_sign") is None
    assert lib.info("definitely_not_a_sign")["available"] is False
    mapping = tmp_path / "map.json"
    mapping.write_text(json.dumps({"animations": {"x": {"file": "../../secret.json", "type": "captured"},
                                                  "y": {"file": "missing.json", "type": "placeholder"}}}),
                       encoding="utf-8")
    lib2 = AnimationLibrary(mapping, tmp_path / "anims")
    assert lib2.get("x") is None        # path traversal refused
    assert lib2.get("y") is None        # missing file


def test_validate_animation_detects_problems():
    assert validate_animation({}) != []
    bad = {"sign_id": "a", "type": "placeholder", "keyframes": [{"t": 1, "right": {"pos": [0, 0]}}, {"t": 0}]}
    assert validate_animation(bad) != []


def test_retarget_recorded_sample(tmp_path):
    rng = np.random.default_rng(0)
    frames = sign_frames("circle", n=30, rng=rng)
    for f in frames:
        f["face"] = {"cx": 0.5, "cy": 0.3, "w": 0.2, "h": 0.25}
    clip = sample_to_animation({"sample_id": "s", "frames": frames, "video": {"w": 640, "h": 480}}, "namaskara")
    assert validate_animation(clip) == []
    assert clip["type"] == "captured" and clip["verified"] is False
    key = clip["keyframes"][0]
    assert key["right"] is not None          # MediaPipe 'Left' label = signer's right hand
    assert abs(np.linalg.norm(key["right"]["dir"]) - 1) < 1e-3
    lib = AnimationLibrary(tmp_path / "map.json", tmp_path / "anims")
    info = lib.save_captured("namaskara", clip)
    assert info["available"] and info["type"] == "captured"
    assert lib.get("namaskara")["keyframes"]


def test_mapping_file_is_the_real_one():
    assert ANIMATION_MAPPING_FILE.exists()


def test_retarget_assigns_arms_by_position_for_mirrored_videos():
    from app.animation.retarget import reference_face, side_for_labels
    from tests.synthetic import frame, hand_points
    face = {"cx": 0.5, "cy": 0.3, "w": 0.2, "h": 0.25}
    # mirrored front-camera style: the hand on the image LEFT carries MediaPipe label "Right"
    frames = [frame(i * 33.3, [("Right", hand_points((0.3, 0.5 - 0.01 * i))), ("Left", hand_points((0.75, 0.6)))],
                    face=face if i % 2 else None) for i in range(20)]
    assert side_for_labels(frames) == {"Right": "right", "Left": "left"}
    assert reference_face(frames)["cx"] == 0.5
    clip = sample_to_animation({"sample_id": "m", "frames": frames, "video": {"w": 640, "h": 480}}, "x")
    first = clip["keyframes"][0]
    assert first["right"]["pos"][0] < 0 < first["left"]["pos"][0]      # no crossed arms



def test_retarget_fills_tracking_dropouts_smooths_and_drops_noise_tracks():
    """A hand lost for 2 frames mid-sign must not make the avatar arm drop to rest; tracking noise is smoothed;
    a 'hand' seen in only 2 of 40 frames (detector noise) is not animated."""
    import math

    from tests.synthetic import frame, hand_points
    rng = np.random.default_rng(0)
    frames = []
    for i in range(40):
        x = 0.4 + 0.2 * math.sin(i / 39 * math.pi)                         # smooth sign movement
        hands = [("Left", hand_points(wrist=(x, 0.5), rng=rng, noise=0.004))]
        if i in (17, 18):
            hands = []                                                        # tracking dropout
        if i in (5, 30):
            hands.append(("Right", hand_points(wrist=(0.8, 0.7))))           # spurious second hand
        frames.append(frame(i * 1000 / 30, hands, face={"cx": 0.5, "cy": 0.25, "w": 0.18, "h": 0.22}))
    clip = sample_to_animation({"sample_id": "d", "frames": frames, "video": {"w": 640, "h": 480}}, "x")
    assert not validate_animation(clip)
    sides = {s for k in clip["keyframes"] for s in ("right", "left") if k[s] is not None}
    assert len(sides) == 1                                                    # noise-only hand removed
    (side,) = sides
    assert all(k[side] is not None for k in clip["keyframes"])               # no drop to rest mid-sign
    xs = np.array([k[side]["pos"][0] for k in clip["keyframes"]])
    accel = np.abs(np.diff(xs, 2)).mean()
    assert accel < 0.01                                                       # smooth motion, not frame jitter
