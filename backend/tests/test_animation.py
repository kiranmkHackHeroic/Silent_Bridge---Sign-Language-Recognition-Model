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
    clips = [lib.get(i["sign_id"]) for i in items]
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
