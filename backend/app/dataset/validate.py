"""Dataset validation and manifest generation.

Every recorded sample is checked before it can be used for training:
  * label is a known vocabulary label
  * frames list is present, ordered (non-decreasing timestamps) and not too long
  * frames parse with the live parser (same code as inference)
  * enough frames contain a hand, and enough usable frames remain after cleaning
  * session / signer ids are present (needed for leakage-free evaluation)
Rejected samples are reported with reasons and are never deleted automatically.
The result is also written to data/dataset_manifest.csv for reproducibility.
"""
from __future__ import annotations

import csv
import hashlib
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

from ..config import DATA_DIR, DEFAULT_FEATURE_CONFIG, FeatureConfig
from ..recognition.landmarks import FrameValidationError, parse_frame
from ..recognition.sequence_features import clean_sequence, frames_to_matrix
from .store import MAX_FRAMES, DatasetStore

MANIFEST_FILE = DATA_DIR / "dataset_manifest.csv"
MIN_HAND_FRACTION = 0.25
RECOMMENDED_PER_CLASS = 10
RECOMMENDED_SESSIONS = 2


@dataclass
class SampleReport:
    sample_id: str
    label: str
    session_id: str
    signer_id: str
    num_frames: int
    hand_frames: int
    face_frames: int
    duration_ms: float
    valid: bool
    reasons: list[str] = field(default_factory=list)
    file: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def validate_sample(sample: dict, known_labels: set[str], fcfg: FeatureConfig = DEFAULT_FEATURE_CONFIG,
                    file: str = "") -> SampleReport:
    reasons: list[str] = []
    label = str(sample.get("label", ""))
    frames = sample.get("frames")
    rep = SampleReport(sample_id=str(sample.get("sample_id", Path(file).stem)), label=label,
                       session_id=str(sample.get("session_id") or ""), signer_id=str(sample.get("signer_id") or ""),
                       num_frames=0, hand_frames=0, face_frames=0, duration_ms=0.0, valid=False, file=file)
    if label not in known_labels:
        reasons.append(f"unknown label '{label}'")
    if not rep.session_id:
        reasons.append("missing session_id")
    if not isinstance(frames, list) or not frames:
        reasons.append("no frames")
        rep.reasons = reasons
        return rep
    rep.num_frames = len(frames)
    if len(frames) > MAX_FRAMES:
        reasons.append(f"too many frames ({len(frames)} > {MAX_FRAMES})")
    parsed = []
    bad = 0
    last_t = None
    out_of_order = False
    for payload in frames:
        try:
            f = parse_frame(payload)
        except FrameValidationError:
            bad += 1
            continue
        if last_t is not None and f.t < last_t:
            out_of_order = True
        last_t = f.t
        parsed.append(f)
    if bad:
        reasons.append(f"{bad} unparseable frame(s)")
    if out_of_order:
        reasons.append("timestamps are not in order")
    rep.hand_frames = sum(1 for f in parsed if f.has_hands)
    rep.face_frames = sum(1 for f in parsed if f.face)
    if parsed:
        rep.duration_ms = round(parsed[-1].t - parsed[0].t, 1)
    if rep.hand_frames == 0:
        reasons.append("no hand detected in any frame")
    elif rep.hand_frames / max(1, len(parsed)) < MIN_HAND_FRACTION:
        reasons.append(f"hands visible in only {rep.hand_frames}/{len(parsed)} frames")
    if parsed and clean_sequence(frames_to_matrix(parsed), fcfg) is None:
        reasons.append(f"fewer than {fcfg.min_hand_frames} usable hand frames")
    rep.reasons = reasons
    rep.valid = not reasons
    return rep


def validate_dataset(store: DatasetStore, known_labels: set[str], fcfg: FeatureConfig = DEFAULT_FEATURE_CONFIG,
                     write_manifest: bool = True, manifest_file: Path | None = None) -> dict:
    reports: list[SampleReport] = []
    for folder in sorted(p for p in store.root.iterdir() if p.is_dir()):
        for file in sorted(folder.glob("*.json")):
            rel = f"{folder.name}/{file.name}"
            try:
                sample = json.loads(file.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError, UnicodeDecodeError) as exc:
                reports.append(SampleReport(file.stem, folder.name, "", "", 0, 0, 0, 0.0, False,
                                            [f"unreadable JSON: {exc.__class__.__name__}"], rel))
                continue
            rep = validate_sample(sample, known_labels, fcfg, rel)
            if rep.label != folder.name and rep.label in known_labels:
                rep.reasons.append(f"stored in folder '{folder.name}' but labelled '{rep.label}'")
                rep.valid = False
            reports.append(rep)

    per_class: dict[str, dict] = {}
    for r in reports:
        c = per_class.setdefault(r.label, {"valid": 0, "rejected": 0, "sessions": set(), "signers": set()})
        if r.valid:
            c["valid"] += 1
            c["sessions"].add(r.session_id)
            c["signers"].add(r.signer_id)
        else:
            c["rejected"] += 1
    warnings = []
    for label, c in sorted(per_class.items()):
        if c["valid"] < RECOMMENDED_PER_CLASS:
            warnings.append(f"'{label}': only {c['valid']} valid sample(s) (recommend >= {RECOMMENDED_PER_CLASS})")
        if c["valid"] and len(c["sessions"]) < RECOMMENDED_SESSIONS:
            warnings.append(f"'{label}': recorded in {len(c['sessions'])} session(s) (recommend >= {RECOMMENDED_SESSIONS})")
    if reports and "_none" not in per_class:
        warnings.append("no '_none' (background / non-sign) samples: the model cannot learn to reject non-signs")
    counts = [c["valid"] for c in per_class.values() if c["valid"]]
    imbalance = round(max(counts) / min(counts), 2) if counts else None
    if imbalance and imbalance > 3:
        warnings.append(f"class imbalance: largest/smallest valid class = {imbalance}x")

    digest = hashlib.sha1("|".join(sorted(r.file for r in reports if r.valid)).encode()).hexdigest()[:12]
    summary = {
        "total": len(reports),
        "valid": sum(r.valid for r in reports),
        "rejected": sum(not r.valid for r in reports),
        "per_class": {k: {"valid": v["valid"], "rejected": v["rejected"], "sessions": sorted(v["sessions"]),
                          "signers": sorted(v["signers"])} for k, v in sorted(per_class.items())},
        "imbalance_ratio": imbalance,
        "warnings": warnings,
        "dataset_hash": digest,
        "rejected_samples": [r.to_dict() for r in reports if not r.valid],
        "feature_schema": fcfg.schema,
    }
    if write_manifest:
        # the manifest lives next to the dataset it describes (data/dataset -> data/dataset_manifest.csv),
        # so validating a temporary dataset can never overwrite the project's manifest
        manifest_file = Path(manifest_file) if manifest_file else store.root.parent / f"{store.root.name}_manifest.csv"
        manifest_file.parent.mkdir(parents=True, exist_ok=True)
        with manifest_file.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            writer.writerow(["sample_id", "label", "session_id", "signer_id", "num_frames", "hand_frames",
                             "face_frames", "duration_ms", "status", "reasons", "file"])
            for r in reports:
                writer.writerow([r.sample_id, r.label, r.session_id, r.signer_id, r.num_frames, r.hand_frames,
                                 r.face_frames, r.duration_ms, "valid" if r.valid else "rejected",
                                 "; ".join(r.reasons), r.file])
    return {"summary": summary, "reports": reports}
