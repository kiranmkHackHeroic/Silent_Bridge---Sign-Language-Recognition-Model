"""Exports the active trained PyTorch BiGRU ensemble to ONNX for in-browser inference.

Usage:
    PYTHONPATH=backend python backend/tools/export_to_onnx.py
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import onnx
import torch
import torch.nn as nn

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
log = logging.getLogger("export_to_onnx")

ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_MODELS_DIR = ROOT / "frontend" / "public" / "models"
MODELS_DIR = BACKEND_DIR / "models"


class FusedEnsemble(nn.Module):
    """Fuses all ensemble members into a single unified computation graph."""

    def __init__(self, ensemble):
        super().__init__()
        self.nets = nn.ModuleList([m.net for m in ensemble.members])
        for net in self.nets:
            net.eval()
        self.mus = nn.ParameterList(
            [nn.Parameter(torch.tensor(m.mu_, dtype=torch.float32), requires_grad=False) for m in ensemble.members]
        )
        self.sds = nn.ParameterList(
            [nn.Parameter(torch.tensor(m.sd_, dtype=torch.float32), requires_grad=False) for m in ensemble.members]
        )
        self.w = ensemble.weights if ensemble.weights is not None else [1.0 / len(self.nets)] * len(self.nets)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        T, F = 24, 147
        outputs = []
        for i, net in enumerate(self.nets):
            xn = (x - self.mus[i]) / self.sds[i]
            seq = xn[:, : T * F].reshape(-1, T, F)
            extra = xn[:, T * F:]
            logits = net(seq, extra)
            probs = torch.softmax(logits, dim=-1)
            outputs.append(probs * self.w[i])
        return torch.stack(outputs, dim=0).sum(dim=0)


def export_model(model_path: Path | None = None) -> tuple[Path, Path]:
    if model_path is None:
        active_json = MODELS_DIR / "active.json"
        if active_json.exists():
            v = json.loads(active_json.read_text())["version"]
            model_path = MODELS_DIR / "registry" / v / "sign_model.joblib"
        else:
            model_path = MODELS_DIR / "sign_model.joblib"

    log.info("Loading PyTorch model from %s", model_path)
    bundle = joblib.load(model_path)
    ensemble = bundle["pipeline"]
    classes = bundle["classes"]
    feature_config = bundle.get("feature_config", {})
    calibration = bundle.get("calibration", {})

    log.info("Creating FusedEnsemble with %d members for %d classes...", len(ensemble.members), len(classes))
    fused = FusedEnsemble(ensemble)
    fused.eval()

    FRONTEND_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    onnx_out = FRONTEND_MODELS_DIR / "sign_model.onnx"
    classes_out = FRONTEND_MODELS_DIR / "sign_classes.json"
    meta_out = FRONTEND_MODELS_DIR / "sign_model_meta.json"

    dummy_input = torch.randn(1, 3668, dtype=torch.float32)

    log.info("Exporting ONNX graph to %s...", onnx_out)
    torch.onnx.export(
        fused,
        dummy_input,
        str(onnx_out),
        input_names=["features"],
        output_names=["probabilities"],
        dynamic_axes={"features": {0: "batch"}, "probabilities": {0: "batch"}},
        opset_version=14,
        dynamo=False,
    )

    # Validate ONNX structure
    onnx_model = onnx.load(str(onnx_out))
    onnx.checker.check_model(onnx_model)
    log.info("Validated ONNX model (size: %.2f MB)", onnx_out.stat().st_size / (1024 * 1024))

    # Save classes
    classes_list = list(classes)
    classes_out.write_text(json.dumps(classes_list, indent=2), encoding="utf-8")
    log.info("Saved %d class labels to %s", len(classes_list), classes_out)

    # Save metadata
    meta = {
        "model_version": bundle.get("model_version", "v_onnx"),
        "trained_at": bundle.get("trained_at", ""),
        "architecture": bundle.get("architecture", "BiGRU Ensemble"),
        "num_classes": len(classes_list),
        "input_dim": 3668,
        "seq_len": 24,
        "frame_dim": 147,
        "threshold": calibration.get("threshold", 0.45),
        "classes": classes_list,
    }
    meta_out.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    log.info("Saved metadata to %s", meta_out)

    return onnx_out, classes_out


if __name__ == "__main__":
    export_model()

