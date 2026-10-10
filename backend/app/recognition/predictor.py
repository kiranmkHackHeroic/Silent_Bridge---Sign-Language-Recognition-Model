"""Loads the trained sign classifier and runs inference on frame sequences.

The model bundle stores the feature configuration it was trained with; a bundle
whose configuration or input size does not match the current code is refused,
so inference can never silently use different preprocessing than training.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np

from ..config import DEFAULT_FEATURE_CONFIG, MODEL_FILE, MODEL_META_FILE, FeatureConfig
from .landmarks import FrameFeatures
from .sequence_features import feature_dim, frames_to_vector

log = logging.getLogger(__name__)


class ModelLoadError(RuntimeError):
    pass


@dataclass
class Prediction:
    label: str
    confidence: float
    probabilities: dict[str, float]
    latency_ms: float


class SignPredictor:
    def __init__(self, model_file: Path | None = None, meta_file: Path | None = None,
                 feature_config: FeatureConfig = DEFAULT_FEATURE_CONFIG):
        # None = follow the registry's active-model pointer (resolved on every load/reload)
        self._explicit = model_file is not None
        self.model_file = Path(model_file) if model_file else MODEL_FILE
        self.meta_file = Path(meta_file) if meta_file else MODEL_META_FILE
        self.feature_config = feature_config
        self.model = None
        self.classes: list[str] = []
        self.meta: dict = {}
        self.error: str | None = None
        self._lock = threading.Lock()

    @property
    def loaded(self) -> bool:
        return self.model is not None

    def ensure_active(self) -> bool:
        """Reload if the registry's active model changed since loading (e.g. promoted by train-model.ps1 while
        the server was running). Returns True when a reload happened. No-op for explicitly chosen files."""
        if self._explicit:
            return False
        from ..training.registry import active_paths
        model_file, _, _ = active_paths()
        if Path(model_file) == Path(self.model_file) and self.loaded:
            return False
        log.info("Active model changed in the registry (%s): reloading", model_file)
        self.load()
        return True

    def load(self, required: bool = False) -> bool:
        """Load the model bundle. Returns False (and records `error`) on failure."""
        with self._lock:
            self.model, self.classes, self.meta, self.error = None, [], {}, None
            if not self._explicit:
                from ..training.registry import active_paths
                self.model_file, self.meta_file, _ = active_paths()
            try:
                bundle = self._read_bundle()
                self.model = bundle["pipeline"]
                self.classes = list(bundle["classes"])
                self.meta = {k: v for k, v in bundle.items() if k != "pipeline"}
                log.info("Loaded sign model with %d classes", len(self.classes))
                return True
            except ModelLoadError as exc:
                self.error = str(exc)
                log.warning("Sign model not loaded: %s", exc)
                if required:
                    raise
                return False

    def _read_bundle(self) -> dict:
        if not self.model_file.exists():
            raise ModelLoadError(f"no trained model at {self.model_file.name} - record data and train first")
        try:
            bundle = joblib.load(self.model_file)
        except Exception as exc:  # corrupt / incompatible pickle
            raise ModelLoadError(f"could not read model file: {exc}") from exc
        if not isinstance(bundle, dict) or "pipeline" not in bundle or "classes" not in bundle:
            raise ModelLoadError("model file has an unexpected format")
        if bundle.get("feature_config") != self.feature_config.to_dict():
            raise ModelLoadError("model was trained with a different feature configuration - retrain it")
        expected = feature_dim(self.feature_config)
        n_in = getattr(bundle["pipeline"], "n_features_in_", None)
        if n_in is not None and n_in != expected:
            raise ModelLoadError(f"model expects {n_in} features but the pipeline produces {expected}")
        model_classes = [str(c) for c in getattr(bundle["pipeline"], "classes_", [])]
        if model_classes and model_classes != list(bundle["classes"]):
            raise ModelLoadError("class mapping in model file is inconsistent")
        if len(bundle["classes"]) < 2:
            raise ModelLoadError("model must have at least two classes")
        return bundle

    def status(self) -> dict:
        meta = {}
        if self.meta_file.exists():
            try:
                meta = json.loads(self.meta_file.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                meta = {}
        return {
            "loaded": self.loaded,
            "error": self.error,
            "classes": self.classes,
            "num_classes": len(self.classes),
            "trained_at": self.meta.get("trained_at") or meta.get("trained_at"),
            "model_type": self.meta.get("model_type") or meta.get("model_type"),
            "num_samples": self.meta.get("num_samples") or meta.get("num_samples"),
            "model_version": self.meta.get("model_version") or meta.get("model_version"),
            "architecture": self.meta.get("architecture") or meta.get("architecture"),
            "dataset_hash": self.meta.get("dataset_hash") or meta.get("dataset_hash"),
            "sources": self.meta.get("sources") or meta.get("sources"),
            "calibration": {k: v for k, v in ((self.meta.get("calibration") or meta.get("calibration")) or {}).items()
                            if k != "curve"} or None,
            "feature_config": self.feature_config.to_dict(),
        }

    def predict_vector(self, vector: np.ndarray) -> Prediction:
        if self.model is None:
            raise ModelLoadError(self.error or "model not loaded")
        start = time.perf_counter()
        probs = self.model.predict_proba(vector.reshape(1, -1))[0]
        latency = (time.perf_counter() - start) * 1000.0
        best = int(np.argmax(probs))
        return Prediction(
            label=self.classes[best],
            confidence=float(probs[best]),
            probabilities={c: float(p) for c, p in zip(self.classes, probs)},
            latency_ms=latency,
        )

    def predict_frames(self, frames: list[FrameFeatures]) -> Prediction | None:
        """Returns None when the sequence has too little hand data to classify."""
        vector = frames_to_vector(frames, self.feature_config)
        if vector is None:
            return None
        return self.predict_vector(vector)
