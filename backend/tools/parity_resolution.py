"""Feature-parity check: does extraction RESOLUTION change the landmarks / features / prediction?

Training landmarks were extracted at max side 640 px (EXTRACTOR_VERSION ...-640-...). The live webcam runs at
640x480, but the browser's video-file test fed MediaPipe the ORIGINAL video resolution. This re-extracts the
same dataset videos at 640 px and at full resolution in Python (same MediaPipe version) and compares hand and
face detection agreement, feature difference and the active model's prediction.

Usage (from backend/):  python tools/parity_resolution.py [--n 16]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.diagnostics import compare_extractions  # noqa: E402
from app.recognition.landmarks import parse_frame  # noqa: E402
from app.recognition.predictor import SignPredictor  # noqa: E402
from app.video.extract import LandmarkExtractor  # noqa: E402
from app.video.importer import output_root  # noqa: E402

AUDITED = ["amrita_slr_48f729f636d0fe", "amrita_slr_c2b0d006edc3de", "amrita_slr_697232964757a5", "amrita_slr_2df702167961ca"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=16, help="extra random Amrita videos besides the audited ones")
    a = ap.parse_args()
    root = output_root("amrita_slr")
    files = {f.stem: f for f in root.glob("*/*.json")}
    rng = np.random.default_rng(5)
    others = [k for k in sorted(files) if k not in AUDITED]
    ids = AUDITED + [others[i] for i in rng.choice(len(others), size=min(a.n, len(others)), replace=False)]
    low, full = LandmarkExtractor(max_side=640), LandmarkExtractor(max_side=100000)
    pred = SignPredictor()
    assert pred.load(), pred.error
    rows = []
    for sid in ids:
        d = json.loads(files[sid].read_text(encoding="utf-8"))
        src = Path(d["source_file"])
        if not src.exists():
            continue
        f640, _ = low.extract(src)
        ffull, info = full.extract(src)
        for f in ffull:
            f["media_t"] = f["t"] / 1000.0
        cmp = compare_extractions(ffull, f640, info.get("fps", 30.0))
        p640 = pred.predict_frames([parse_frame(f) for f in f640])
        pfull = pred.predict_frames([parse_frame(f) for f in ffull])
        rows.append({"sample_id": sid, "label": d["label"], "full_resolution": f"{d['video'].get('original_w')}x{d['video'].get('original_h')}",
                     "face_rate_640": round(float(np.mean([bool(f["face"]) for f in f640])), 3),
                     "face_rate_full": round(float(np.mean([bool(f["face"]) for f in ffull])), 3),
                     "hand_presence_agreement": cmp["hand_presence_agreement"], "face_presence_agreement": cmp.get("face_presence_agreement"),
                     "feature_difference_by_block": cmp.get("feature_difference_by_block"),
                     "pred_640": p640.label if p640 else None, "pred_full": pfull.label if pfull else None})
        r = rows[-1]
        print(f"{sid} {r['label']:12s} face 640 {r['face_rate_640']:.2f} full {r['face_rate_full']:.2f} | face agree "
              f"{r['face_presence_agreement']} | pred 640 {r['pred_640']} full {r['pred_full']}", flush=True)
    summary = {
        "videos": len(rows),
        "same_prediction": sum(r["pred_640"] == r["pred_full"] for r in rows),
        "mean_face_presence_agreement": round(float(np.mean([r["face_presence_agreement"] for r in rows if r["face_presence_agreement"] is not None])), 3),
        "mean_hand_presence_agreement": round(float(np.mean([r["hand_presence_agreement"] for r in rows if r["hand_presence_agreement"] is not None])), 3),
        "mean_face_rate_640": round(float(np.mean([r["face_rate_640"] for r in rows])), 3),
        "mean_face_rate_full": round(float(np.mean([r["face_rate_full"] for r in rows])), 3),
    }
    print(json.dumps(summary, indent=1))
    Path("reports").mkdir(exist_ok=True)
    Path("reports/parity_resolution.json").write_text(json.dumps({"summary": summary, "videos": rows,
                                                                    "note": __doc__.strip().split("Usage")[0].strip()}, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
