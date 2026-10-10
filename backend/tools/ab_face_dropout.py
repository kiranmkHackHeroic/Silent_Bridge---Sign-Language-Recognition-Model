"""A/B: face-dropout augmentation on vs off (same data, same seed, logistic regression).

The DECISION uses the signer-grouped cross-validation macro-F1 on development data only; the
held-out test numbers are printed for the report, not used to decide.

Usage (from backend/):  python tools/ab_face_dropout.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import TrainingConfig  # noqa: E402
from app.training.train_model import train_candidate  # noqa: E402


def main():
    out = {}
    for p in (0.0, 0.3):
        tcfg = TrainingConfig(candidate_models=["logreg"], face_dropout=p, sources=["amrita_slr"])  # stable data
        r = train_candidate(tcfg=tcfg)
        m = r.metrics
        cv = m["candidates"]["logreg"]
        out[p] = {"cv_macro_f1": cv.get("macro_f1"), "cv_accuracy": cv.get("accuracy"),
                  "test_accuracy": m["accuracy"], "test_macro_f1": m["macro_f1"],
                  "test_per_source": m.get("test_per_source")}
        print(f"face_dropout={p}: CV macro-F1 {cv.get('macro_f1')} | test acc {m['accuracy']} macro-F1 {m['macro_f1']}", flush=True)
    better = out[0.3]["cv_macro_f1"] > out[0.0]["cv_macro_f1"]
    out["decision"] = ("keep face dropout 0.3" if better else "disable face dropout") + " (decided on development CV only)"
    Path("reports").mkdir(exist_ok=True)
    Path("reports/ab_face_dropout.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(out["decision"])


if __name__ == "__main__":
    main()
