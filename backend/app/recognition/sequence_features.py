"""Sequence -> fixed-length model input. Shared by training and live inference.

A sign spans many frames, so the classifier never sees a single frame: it sees a
whole segment (or sliding window) of frames that is
  1. trimmed of leading/trailing frames without hands,
  2. gap-filled for short per-hand dropouts (longer gaps stay explicitly absent),
  3. stripped of interior frames that still have no hand at all,
  4. linearly resampled to `resample_frames` time steps,
  5. extended with velocity (frame-to-frame wrist movement) and path-length features.
"""
from __future__ import annotations

import numpy as np

from ..config import FeatureConfig, TrainingConfig
from .landmarks import FACE_FLAG_INDEX, FACEREL_OFFSET, FRAME_DIM, HAND_DIM, HAND_SHAPE_DIM, POS_OFFSET, PRESENCE_OFFSET, FrameFeatures


def feature_dim(cfg: FeatureConfig) -> int:
    t = cfg.resample_frames
    return t * FRAME_DIM + (t - 1) * 6 + 2


def frames_to_matrix(frames: list[FrameFeatures]) -> np.ndarray:
    if not frames:
        return np.zeros((0, FRAME_DIM), dtype=np.float32)
    return np.stack([f.vector for f in frames]).astype(np.float32)


def _presence(mat: np.ndarray, slot: int) -> np.ndarray:
    return mat[:, slot * HAND_DIM + PRESENCE_OFFSET] > 0.5


def fill_short_gaps(mat: np.ndarray, max_gap: int) -> np.ndarray:
    """Linearly interpolate a hand across short absences bounded by detections."""
    mat = mat.copy()
    for slot in range(2):
        pres = _presence(mat, slot)
        idx = np.flatnonzero(pres)
        if len(idx) < 2:
            continue
        lo, hi = slot * HAND_DIM, (slot + 1) * HAND_DIM
        for a, b in zip(idx[:-1], idx[1:]):
            gap = b - a - 1
            if 0 < gap <= max_gap:
                for k in range(1, gap + 1):
                    w = k / (gap + 1)
                    mat[a + k, lo:hi] = (1 - w) * mat[a, lo:hi] + w * mat[b, lo:hi]
    return mat


def clean_sequence(mat: np.ndarray, cfg: FeatureConfig) -> np.ndarray | None:
    """Trim, gap-fill and drop hand-less frames. Returns None if too little hand data."""
    if mat.ndim != 2 or mat.shape[1] != FRAME_DIM or len(mat) == 0:
        return None
    any_hand = _presence(mat, 0) | _presence(mat, 1)
    idx = np.flatnonzero(any_hand)
    if len(idx) == 0:
        return None
    mat = mat[idx[0]: idx[-1] + 1]
    mat = fill_short_gaps(mat, cfg.max_gap_fill)
    keep = _presence(mat, 0) | _presence(mat, 1)
    mat = mat[keep]
    if len(mat) < cfg.min_hand_frames:
        return None
    return mat


def resample(mat: np.ndarray, length: int) -> np.ndarray:
    n = len(mat)
    if n == length:
        return mat.copy()
    if n == 1:
        return np.repeat(mat, length, axis=0)
    src = np.linspace(0.0, 1.0, n)
    dst = np.linspace(0.0, 1.0, length)
    out = np.empty((length, mat.shape[1]), dtype=np.float32)
    for j in range(mat.shape[1]):
        out[:, j] = np.interp(dst, src, mat[:, j])
    # presence stays binary-ish: a resampled frame counts as present if >= 0.5
    for slot in range(2):
        col = slot * HAND_DIM + PRESENCE_OFFSET
        absent = out[:, col] < 0.5
        out[absent, slot * HAND_DIM:(slot + 1) * HAND_DIM] = 0.0
        out[~absent, col] = 1.0
    return out


def matrix_to_vector(mat: np.ndarray, cfg: FeatureConfig) -> np.ndarray | None:
    cleaned = clean_sequence(mat, cfg)
    if cleaned is None:
        return None
    seq = resample(cleaned, cfg.resample_frames)
    pos_cols = []
    for slot in range(2):
        base = slot * HAND_DIM + POS_OFFSET
        pos_cols.extend([base, base + 1, base + 2])
    pos = seq[:, pos_cols]
    vel = np.diff(pos, axis=0) * 5.0
    path = []
    for slot in range(2):
        p = pos[:, slot * 3: slot * 3 + 2]
        path.append(float(np.sum(np.linalg.norm(np.diff(p, axis=0), axis=1))))
    vec = np.concatenate([seq.reshape(-1), vel.reshape(-1), np.asarray(path, dtype=np.float32)])
    return vec.astype(np.float32)


def frames_to_vector(frames: list[FrameFeatures], cfg: FeatureConfig) -> np.ndarray | None:
    return matrix_to_vector(frames_to_matrix(frames), cfg)


def augment_matrix(mat: np.ndarray, rng: np.random.Generator, tcfg: TrainingConfig) -> np.ndarray:
    """Training-only augmentation on a raw (N, FRAME_DIM) sequence."""
    n = len(mat)
    out = mat.copy()
    if n >= 8:
        max_crop = int(n * tcfg.crop_fraction)
        a = int(rng.integers(0, max_crop + 1))
        b = n - int(rng.integers(0, max_crop + 1))
        if b - a >= 6:
            out = out[a:b]
    speed = rng.uniform(0.8, 1.25)
    new_len = max(6, int(round(len(out) / speed)))
    if new_len != len(out):
        out = resample(out, new_len)
    shift = rng.normal(0, tcfg.position_jitter, size=2)
    face_shift = rng.normal(0, tcfg.position_jitter * 3, size=2)
    scale = rng.uniform(0.9, 1.1)
    for slot in range(2):
        lo = slot * HAND_DIM
        pres = out[:, lo + PRESENCE_OFFSET] > 0.5
        if not np.any(pres):
            continue
        noise = rng.normal(0, tcfg.noise_std, size=(int(pres.sum()), HAND_SHAPE_DIM))
        out[pres, lo:lo + HAND_SHAPE_DIM] += noise.astype(np.float32)
        out[pres, lo + POS_OFFSET] += shift[0]
        out[pres, lo + POS_OFFSET + 1] += shift[1]
        out[pres, lo + POS_OFFSET + 2] *= scale
        # face-relative location: small jitter in face widths (keeps "near chin" vs "near chest" apart)
        out[pres, lo + FACEREL_OFFSET] += face_shift[0]
        out[pres, lo + FACEREL_OFFSET + 1] += face_shift[1]
        out[pres, lo + FACEREL_OFFSET + 2] *= scale
    p_drop = getattr(tcfg, "face_dropout", 0.0)
    if p_drop > 0 and rng.random() < p_drop and len(out) >= 2:
        # same encoding as a frame without a detected face: face-relative values 0, face flag 0
        span = int(rng.integers(max(1, len(out) // 4), len(out) + 1))
        a = int(rng.integers(0, len(out) - span + 1))
        for slot in range(2):
            lo = slot * HAND_DIM + FACEREL_OFFSET
            out[a:a + span, lo:lo + 3] = 0.0
        out[a:a + span, FACE_FLAG_INDEX] = 0.0
    return out
