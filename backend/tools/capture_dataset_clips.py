"""Create avatar clips from REAL dataset recordings (instead of hand-written placeholders).

For every vocabulary sign that has imported dataset samples, the recording with
the best hand + face coverage is retargeted onto the avatar
(app.animation.retarget.sample_to_animation) and saved as a 'captured' clip whose
description cites the dataset and recording. Clips stay verified=false: the
retargeting is approximate (depth from apparent hand size, no elbow tracking) and
must be reviewed against the original video before being called correct ISL.

Usage (from backend/):  python tools/capture_dataset_clips.py [--overwrite-captured] [--only-missing]
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.animation.library import AnimationLibrary  # noqa: E402
from app.animation.retarget import sample_to_animation, validate_animation  # noqa: E402
from app.config import PROCESSED_LANDMARKS_DIR  # noqa: E402

CITATIONS = {"amrita_slr": "Amrita SLR (Mendeley Data, doi:10.17632/dtg9s785v8.1, CC BY 4.0)",
             "include": "INCLUDE (Sridhar et al. 2020, doi:10.1145/3394171.3413528, CC BY 4.0)"}


def score(sample: dict) -> float:
    n = max(1, sample["num_frames"])
    return sample["hand_frames"] / n + 0.5 * sample.get("face_frames", 0) / n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--overwrite-captured", action="store_true", help="replace clips captured from your own recordings")
    ap.add_argument("--only-missing", action="store_true", help="only signs that have no captured clip yet")
    a = ap.parse_args()
    lib = AnimationLibrary()
    best: dict[str, tuple[float, Path]] = {}
    for f in PROCESSED_LANDMARKS_DIR.glob("*/*/*.json"):
        d = json.loads(f.read_text(encoding="utf-8"))
        sc = score(d)
        if d["label"] not in best or sc > best[d["label"]][0]:
            best[d["label"]] = (sc, f)
    made, skipped = 0, []
    for label, (_, f) in sorted(best.items()):
        current = lib.mapping.get(label, {})
        if a.only_missing and current.get("type") == "captured" and lib.info(label)["available"]:
            continue
        if current.get("type") == "captured" and not current.get("dataset_source") and not a.overwrite_captured:
            skipped.append(f"{label}: keeps your own captured clip")
            continue
        sample = json.loads(f.read_text(encoding="utf-8"))
        try:
            clip = sample_to_animation(sample, label)
        except ValueError as exc:
            skipped.append(f"{label}: {exc}")
            continue
        src = sample.get("source", "dataset")
        clip["description"] = (f"Retargeted from a real {CITATIONS.get(src, src)} recording "
                               f"(signer group '{sample['session_id']}', file '{Path(sample['source_file']).name}'). "
                               "Approximate retargeting - verify against the original video.")
        if validate_animation(clip):
            skipped.append(f"{label}: invalid clip")
            continue
        lib.save_captured(label, clip)
        lib.mapping[label]["dataset_source"] = {"dataset": src, "sample_id": sample["sample_id"],
                                                "signer_group": sample["session_id"],
                                                "file": Path(sample["source_file"]).name}
        lib._save()
        made += 1
    print(f"captured {made} clips from dataset recordings; skipped {len(skipped)}")
    for s in skipped[:20]:
        print("  -", s)


if __name__ == "__main__":
    main()
