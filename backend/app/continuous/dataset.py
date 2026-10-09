"""ISL-CSLTR sentence videos -> landmark sequences + gloss targets.

Sentence samples are stored under data/processed/continuous/isl_csltr/ (NOT with
the isolated-sign samples, so the isolated classifier never trains on them).
Each sample keeps the corpus sentence, the original gloss annotation and the
normalized gloss sequence used as the CTC target.

Recording groups: the corpus has no signer ids. File names follow
'<word> (<n>).MP4' / '<word>.MP4'; we use n (1 for no number) as the recording
index and assume equal indices across sentences come from the same recording
round. Splits keep each recording index entirely in train or test.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np

from ..config import DATA_DIR
from ..recognition.landmarks import FRAME_DIM, HAND_DIM, POS_OFFSET, parse_frame

CONTINUOUS_DIR = DATA_DIR / "processed" / "continuous"
MAPPING = DATA_DIR / "mappings" / "isl_csltr.json"
RAW_ROOT = DATA_DIR / "raw" / "isl_csltr" / "extracted"
STRIDE = 2               # use every 2nd frame (~15 fps) for the sequence model
SEQ_DIM = FRAME_DIM + 6  # frame features + wrist velocities of both hands


def load_mapping() -> dict:
    return json.loads(MAPPING.read_text(encoding="utf-8"))


def recording_index(file_name: str) -> str:
    m = re.search(r"\((\d+)\)\s*$", Path(file_name).stem)
    return f"rec{int(m.group(1)) if m else 1}"


def csltr_items():
    """Adapter for the importer: one ImportItem per sentence video listed in the corpus spreadsheet."""
    import pandas as pd

    from ..video.importer import ImportItem
    mapping = load_mapping()["sentences"]
    by_key = {v["key"]: (sid, v) for sid, v in mapping.items()}
    details = pd.read_excel(RAW_ROOT / "ISL_CSLRT_Corpus" / "corpus_csv_files" / "ISL_CSLRT_Corpus details.xlsx")
    items, skipped = [], []
    for sent, loc in zip(details["Sentences"], details["File location"]):
        if not isinstance(sent, str) or not isinstance(loc, str):
            skipped.append(f"blank row: {sent!r} {loc!r}")
            continue
        key = re.sub(r"[^a-z]", "", sent.lower())
        if key not in by_key:
            skipped.append(f"no gloss annotation for sentence {sent!r}")
            continue
        sid, entry = by_key[key]
        path = RAW_ROOT / Path(*loc.replace("\\", "/").split("/"))
        if not path.exists():
            skipped.append(f"missing file {loc}")
            continue
        items.append(ImportItem(path=str(path), label="sentence", group=recording_index(path.name),
                                source="isl_csltr", transcript=entry["sentence"], gloss=entry["gloss"],
                                meta={"sentence_id": sid, "gloss_original": entry["gloss_original"]}))
    return items, {"skipped": skipped}


def frames_to_sequence(frames: list[dict], stride: int = STRIDE) -> np.ndarray | None:
    """Landmark payloads -> (T, SEQ_DIM) array (same per-frame features as live inference)."""
    feats = [parse_frame(f) for f in frames]
    has = [f.has_hands for f in feats]
    if sum(has) < 6:
        return None
    first, last = has.index(True), len(has) - 1 - has[::-1].index(True)
    mat = np.stack([f.vector for f in feats[first:last + 1]])[::stride]
    pos = np.concatenate([mat[:, s * HAND_DIM + POS_OFFSET: s * HAND_DIM + POS_OFFSET + 3] for s in range(2)], axis=1)
    vel = np.vstack([np.zeros((1, 6), np.float32), np.diff(pos, axis=0) * 5.0])
    return np.concatenate([mat, vel], axis=1).astype(np.float32)


def load_samples() -> list[dict]:
    from ..video.extract import mirror_frame
    root = CONTINUOUS_DIR / "isl_csltr"
    out = []
    for f in sorted(root.glob("*/*.json")) if root.exists() else []:
        d = json.loads(f.read_text(encoding="utf-8"))
        seq = frames_to_sequence(d["frames"])
        if seq is None or not d.get("gloss"):
            continue
        out.append({"sample_id": d["sample_id"], "sentence_id": d["meta"]["sentence_id"], "transcript": d["transcript"],
                    "gloss": d["gloss"], "group": d["session_id"], "seq": seq,
                    "mirror": frames_to_sequence([mirror_frame(x) for x in d["frames"]])})
    return out
