"""Central configuration: paths, feature settings and recognition thresholds.

Runtime-adjustable recognition settings (threshold, segmentation mode, ...) live
in RecognitionSettings; the browser can override them per WebSocket session.
Feature settings (FeatureConfig) are frozen into every trained model, and a model
trained with different feature settings is refused at load time.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
MODELS_DIR = BACKEND_DIR / "models"

LABELS_FILE = DATA_DIR / "labels.json"
KANNADA_MAPPING_FILE = DATA_DIR / "kannada_sign_mapping.json"
ANIMATION_MAPPING_FILE = DATA_DIR / "animation_mapping.json"
ANIMATIONS_DIR = DATA_DIR / "animations"
DATASET_DIR = DATA_DIR / "dataset"                 # webcam recordings made in the app
PROCESSED_LANDMARKS_DIR = DATA_DIR / "processed" / "landmarks"   # imported datasets / uploads

MODEL_FILE = MODELS_DIR / "sign_model.joblib"
MODEL_META_FILE = MODELS_DIR / "model_meta.json"
METRICS_FILE = MODELS_DIR / "metrics.json"

NONE_LABEL = "_none"
UNKNOWN_LABEL = "_unknown"

FEATURE_VERSION = 2
FEATURE_SCHEMA = "hands-face-v2"   # must match app.recognition.landmarks.FEATURE_SCHEMA


@dataclass(frozen=True)
class FeatureConfig:
    """Settings that define the model input. Must be identical at train and inference time."""

    version: int = FEATURE_VERSION
    schema: str = FEATURE_SCHEMA
    resample_frames: int = 16          # every sequence is resampled to this many frames
    max_gap_fill: int = 4              # missing-hand gaps up to this many frames are filled
    min_hand_frames: int = 6           # sequences with fewer hand frames are not classified

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RecognitionSettings:
    """Continuous-recognition behaviour. Adjustable from the UI."""

    mode: str = "segment"              # "segment" (isolated signs), "sliding" (experimental) or "sentence" (continuous model)
    confidence_threshold: float = 0.60
    # segment mode
    motion_start: float = 0.008        # motion (per 30 fps frame) needed to start a sign
    motion_still: float = 0.003        # motion below this counts as "still"
    still_ms: int = 800                # stillness that ends a sign (inactivity boundary)
    absent_ms: int = 200               # hands missing this long ends a sign
    max_segment_ms: int = 4000         # forced boundary for very long segments
    preroll_frames: int = 3
    # motion-minimum splitting inside a continuous segment (no pause / hand drop needed).
    # OFF by default: on real ISL videos (Amrita SLR dev signers) it split single signs at their
    # internal holds and roughly halved the share of videos yielding exactly the right word.
    dip_split: bool = False
    dip_ratio: float = 0.35            # speed below this fraction of the segment's peak = a dip
    dip_ms: int = 100                  # dip must last this long
    min_sign_ms: int = 350             # a split never produces a sign shorter than this
    # sliding mode
    window_frames: int = 30
    stride_frames: int = 3
    smoothing_alpha: float = 0.4       # EMA weight of the newest prediction
    stable_evals: int = 3              # consecutive evaluations that must agree
    release_margin: float = 0.2        # lock released when prob < threshold - margin
    release_evals: int = 4
    cooldown_ms: int = 700             # minimum gap between any two emitted signs

    def update(self, values: dict) -> list[str]:
        """Apply known keys with type coercion; returns the list of applied keys."""
        applied = []
        for key, value in values.items():
            if not hasattr(self, key):
                continue
            current = getattr(self, key)
            try:
                if isinstance(current, bool):
                    value = bool(value)
                elif isinstance(current, int):
                    value = int(value)
                elif isinstance(current, float):
                    value = float(value)
                else:
                    value = str(value)
            except (TypeError, ValueError):
                continue
            if key == "mode" and value not in ("segment", "sliding", "sentence"):
                continue
            if key == "confidence_threshold":
                value = min(max(value, 0.05), 0.99)
            setattr(self, key, value)
            applied.append(key)
        return applied

    def to_dict(self) -> dict:
        return asdict(self)


DEFAULT_FEATURE_CONFIG = FeatureConfig()


@dataclass
class TrainingConfig:
    augment_copies: int = 3
    crop_fraction: float = 0.15        # random trim of up to 15% at each end
    noise_std: float = 0.015           # landmark jitter in normalized hand units
    position_jitter: float = 0.04
    mirror_augment: bool = True        # add left/right mirrored copies (left-handed signers, mirrored videos)
    random_seed: int = 42
    cv_folds: int = 3
    test_fraction: float = 0.2         # share of signer groups held out when no official test split exists
    candidate_models: list[str] = field(default_factory=lambda: ["logreg", "svm_rbf", "mlp", "gru"])
    sources: list[str] | None = None   # None = all sources (app recordings + every imported dataset)
    # promotion / acceptance criteria for a newly trained candidate
    min_test_macro_f1: float = 0.40
    max_regression: float = 0.02       # candidate may not be worse than the active model by more than this
