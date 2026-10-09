import numpy as np
import pytest

from app.config import FeatureConfig, RecognitionSettings
from app.recognition.landmarks import (FRAME_DIM, HAND_DIM, PRESENCE_OFFSET, FrameValidationError,
                                       compute_motion, parse_frame)
from app.recognition.segmenter import ActivitySegmenter
from app.recognition.sequence_buffer import SequenceBuffer
from app.recognition.sequence_features import feature_dim, fill_short_gaps, frames_to_vector
from app.recognition.temporal_smoothing import ProbabilitySmoother, StablePredictionGate
from tests.synthetic import empty_frames, frame, hand_points, sign_frames


# ---------------------------------------------------------------- landmarks
def test_frame_without_hands_is_not_a_zero_sample():
    f = parse_frame(frame(0, []))
    assert not f.has_hands
    assert f.present == (False, False)
    assert frames_to_vector([f] * 20, FeatureConfig()) is None


def test_invalid_hands_are_dropped_not_zero_filled():
    bad_count = {"handedness": "Left", "score": 1, "landmarks": [[0.5, 0.5, 0]] * 5}
    bad_nan = {"handedness": "Right", "score": 1, "landmarks": [[float("nan"), 0.5, 0]] * 21}
    f = parse_frame({"t": 0, "w": 640, "h": 480, "hands": [bad_count, bad_nan]})
    assert not f.has_hands


def test_invalid_envelope_raises():
    with pytest.raises(FrameValidationError):
        parse_frame({"t": "abc", "hands": []})
    with pytest.raises(FrameValidationError):
        parse_frame({"t": 0, "hands": "nope"})


def test_presence_flags_and_dimensions():
    f = parse_frame(frame(0, [("Right", hand_points())]))
    assert f.vector.shape == (FRAME_DIM,)
    assert f.present == (False, True)
    assert f.vector[PRESENCE_OFFSET] == 0.0
    assert f.vector[HAND_DIM + PRESENCE_OFFSET] == 1.0
    assert np.all(f.vector[:HAND_DIM] == 0.0)


def test_hand_shape_is_translation_and_scale_invariant():
    a = parse_frame(frame(0, [("Left", hand_points((0.3, 0.4), size=0.10))]))
    b = parse_frame(frame(0, [("Left", hand_points((0.6, 0.7), size=0.18))]))
    np.testing.assert_allclose(a.vector[:60], b.vector[:60], atol=1e-4)
    assert not np.allclose(a.vector[60:62], b.vector[60:62])     # position is kept separately


def test_duplicate_handedness_falls_back_to_position():
    left_pts, right_pts = hand_points((0.3, 0.5)), hand_points((0.7, 0.5))
    f = parse_frame(frame(0, [("Left", right_pts), ("Left", left_pts)]))
    assert f.present == (True, True)
    assert f.points["Left"][0, 0] < f.points["Right"][0, 0]


def test_motion_computation():
    a = parse_frame(frame(0, [("Left", hand_points((0.5, 0.5)))]))
    b = parse_frame(frame(33.3, [("Left", hand_points((0.55, 0.5)))]))
    assert compute_motion(None, a) == 0.0
    assert compute_motion(a, b) == pytest.approx(0.05 * 640 / 480, rel=1e-3)


# ---------------------------------------------------------------- sequence features
def test_feature_vector_shape():
    cfg = FeatureConfig()
    frames = [parse_frame(p) for p in sign_frames("circle")]
    vec = frames_to_vector(frames, cfg)
    assert vec.shape == (feature_dim(cfg),)
    assert np.all(np.isfinite(vec))


def test_short_sequences_are_not_classified():
    cfg = FeatureConfig(min_hand_frames=6)
    frames = [parse_frame(p) for p in sign_frames("circle", n=4)]
    assert frames_to_vector(frames, cfg) is None


def test_gap_fill_only_fills_short_gaps():
    frames = [parse_frame(p) for p in sign_frames("circle", n=12)]
    mat = np.stack([f.vector for f in frames])
    mat[3:5, :HAND_DIM] = 0           # short gap -> filled
    mat[7:12, :HAND_DIM] = 0          # trailing absence -> not bounded, stays absent
    filled = fill_short_gaps(mat, max_gap=4)
    assert np.all(filled[3:5, PRESENCE_OFFSET] == 1.0)
    assert np.all(filled[7:12, PRESENCE_OFFSET] == 0.0)


# ---------------------------------------------------------------- buffer
def test_sequence_buffer_boundaries():
    buf = SequenceBuffer(5)
    frames = [parse_frame(p) for p in sign_frames("circle", n=8)]
    for f in frames:
        buf.append(f)
    assert len(buf) == 5 and buf.is_full()
    assert buf.frames()[0].t == frames[3].t
    assert buf.last().t == frames[-1].t
    for f in [parse_frame(p) for p in empty_frames(1000, 3)]:
        buf.append(f)
    assert buf.frames_since_hands == 3
    assert buf.hand_fraction() == pytest.approx(2 / 5)
    buf.resize(3)
    assert len(buf) == 3
    buf.clear()
    assert len(buf) == 0
    with pytest.raises(ValueError):
        SequenceBuffer(0)


# ---------------------------------------------------------------- smoothing / gating
def test_probability_smoother():
    sm = ProbabilitySmoother(alpha=0.5)
    np.testing.assert_allclose(sm.update(np.array([1.0, 0.0])), [1.0, 0.0])
    np.testing.assert_allclose(sm.update(np.array([0.0, 1.0])), [0.5, 0.5])
    np.testing.assert_allclose(sm.update(np.array([0.0, 1.0])), [0.25, 0.75])
    sm.reset()
    assert sm.value is None
    with pytest.raises(ValueError):
        ProbabilitySmoother(0)


def test_gate_requires_stability_and_threshold():
    gate = StablePredictionGate(threshold=0.6, stable_evals=3, cooldown_ms=0)
    assert gate.update("a", 0.9, 0) is None
    assert gate.update("a", 0.5, 1) is None            # below threshold resets
    assert gate.update("a", 0.9, 2) is None
    assert gate.update("a", 0.9, 3) is None
    assert gate.update("a", 0.9, 4) == "a"


def test_gate_stationary_sign_is_not_repeated():
    gate = StablePredictionGate(threshold=0.6, stable_evals=2, cooldown_ms=0)
    emitted = [gate.update("a", 0.95, t) for t in range(50)]
    assert emitted.count("a") == 1


def test_gate_rearms_after_boundary_and_after_release():
    gate = StablePredictionGate(threshold=0.6, stable_evals=2, release_evals=2, cooldown_ms=0)
    assert [gate.update("a", 0.9, t) for t in range(3)].count("a") == 1
    gate.notify_boundary()
    assert [gate.update("a", 0.9, t) for t in range(10, 13)].count("a") == 1
    # transition: probability drops for a while -> lock released -> repeat allowed
    for t in range(20, 24):
        gate.update("b", 0.3, t)
    assert [gate.update("a", 0.9, t) for t in range(30, 33)].count("a") == 1


def test_gate_ignores_background_and_respects_cooldown():
    gate = StablePredictionGate(threshold=0.5, stable_evals=1, cooldown_ms=1000, ignore={"_none"})
    assert gate.update("_none", 0.99, 0) is None
    assert gate.update("a", 0.9, 0) == "a"
    assert gate.update("b", 0.9, 500) is None           # within cooldown
    assert gate.update("b", 0.9, 1500) == "b"


# ---------------------------------------------------------------- segmenter
def _feed(seg, payloads, prev=None):
    out = []
    for p in payloads:
        f = parse_frame(p)
        compute_motion(prev, f)
        prev = f
        s = seg.update(f)
        if s:
            out.append(s)
    return out, prev


def test_segmenter_hand_drop_boundary():
    seg = ActivitySegmenter(RecognitionSettings())
    segs, _ = _feed(seg, sign_frames("circle", n=30) + empty_frames(1000, 10))
    assert len(segs) == 1 and segs[0].reason == "absent"
    assert len(segs[0].frames) >= 25


def test_segmenter_stationary_hand_emits_once():
    seg = ActivitySegmenter(RecognitionSettings(still_ms=300))
    moving = sign_frames("wave", n=20)
    still_pts = hand_points((0.6, 0.5), shape="point")
    still = [frame(moving[-1]["t"] + (i + 1) * 33.3, [("Left", still_pts)]) for i in range(120)]
    segs, _ = _feed(seg, moving + still)
    assert len(segs) == 1 and segs[0].reason == "still"


def test_segmenter_two_signs_with_pause():
    seg = ActivitySegmenter(RecognitionSettings())
    a = sign_frames("circle", t0=0, n=30)
    gap = empty_frames(1100, 12)
    b = sign_frames("circle", t0=1600, n=30)
    segs, _ = _feed(seg, a + gap + b + empty_frames(2700, 12))
    assert len(segs) == 2
