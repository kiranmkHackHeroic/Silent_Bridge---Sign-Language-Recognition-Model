"""Batch import: videos (+ labels) -> validated landmark samples + manifest.

Every accepted video becomes one sample JSON in the SAME format as webcam
recordings (data/processed/landmarks/<dataset>/<label>/<sample_id>.json), so
validation, training and live inference share one preprocessing path.
Original videos and annotations are never modified or deleted here.

Usage (from backend/):
    python -m app.video.importer amrita_slr --workers 3
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from ..config import DATA_DIR
from .extract import EXTRACTOR_VERSION, VIDEO_EXTENSIONS, VideoError, probe_video

PROCESSED = DATA_DIR / "processed"
LANDMARKS = PROCESSED / "landmarks"
MANIFESTS = PROCESSED / "manifests"
MAPPINGS = DATA_DIR / "mappings"
RAW = DATA_DIR / "raw"
MIN_HAND_FRAMES = 6

ProgressFn = Callable[[int, int, str], None]


@dataclass
class ImportItem:
    path: str
    label: str
    group: str                         # signer / recording session (used to prevent leakage)
    source: str
    split: str = ""                    # official split if the dataset defines one
    transcript: str = ""
    gloss: list[str] = field(default_factory=list)
    meta: dict = field(default_factory=dict)

    @property
    def sample_id(self) -> str:
        p = Path(self.path)
        size = p.stat().st_size if p.exists() else 0
        digest = hashlib.sha1(f"{self.source}|{p.as_posix()}|{size}".encode()).hexdigest()[:14]
        return f"{re.sub(r'[^A-Za-z0-9_-]', '', self.source)[:12]}_{digest}"


# ---------------------------------------------------------------- dataset adapters
def amrita_group(file_name: str) -> str:
    """Infer the recording group (signer) from the dataset's file-naming styles.

    Each class folder holds ~21 videos = 7 signers x 3 repetitions, and every
    signer used a consistent naming style. Only used to keep a signer's
    repetitions together when splitting; the class label comes from the folder."""
    n = file_name.lower()
    for name in ("krishnaraj", "nachiketh", "manideep"):
        if n.startswith(name):
            return name
    if n.startswith("0403"):
        return "signer_0403"
    stem = Path(file_name).stem
    if re.search(r"\s-\s?\d+$", stem):
        return "signer_dash"
    if re.search(r"_\d+$", stem):
        return "signer_underscore"
    return "signer_plain"


def amrita_items() -> tuple[list[ImportItem], dict]:
    mapping = json.loads((MAPPINGS / "amrita_slr.json").read_text(encoding="utf-8"))["classes"]
    root = RAW / "amrita_slr" / "extracted" / "sign project"
    if not root.exists():
        raise FileNotFoundError(f"{root} not found - run tools/download_datasets.py amrita_slr")
    items = []
    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        cls = mapping.get(folder.name)
        if cls is None:
            continue
        for f in sorted(folder.iterdir()):
            if f.suffix.lower() in VIDEO_EXTENSIONS:
                items.append(ImportItem(path=str(f), label=cls["label"], group=amrita_group(f.name),
                                        source="amrita_slr", meta={"class_folder": folder.name}))
    return items, mapping


def include_items() -> tuple[list[ImportItem], dict]:
    """INCLUDE: classes and official train/val/test splits from the dataset's HuggingFace metadata.
    Only categories that have been downloaded are returned (the rest are reported as missing)."""
    import pandas as pd
    mapping = json.loads((MAPPINGS / "include.json").read_text(encoding="utf-8"))["classes"]
    meta = pd.concat([pd.read_parquet(RAW / "include" / f"{s}.parquet").assign(split=s) for s in ("train", "val", "test")])
    root = RAW / "include" / "extracted"
    items, missing = [], 0
    for _, r in meta.iterrows():
        cls = mapping.get(r["label"])
        if cls is None:
            continue
        path = root / Path(*str(r["video_path"]).replace("\\", "/").split("/"))
        if not path.exists():
            missing += 1
            continue
        split = "test" if r["split"] == "test" else "train"       # val is merged into development data
        items.append(ImportItem(path=str(path), label=cls["label"], group=f"include_{split}", source="include",
                                split=split, meta={"include_class": r["label"], "include_split": r["split"]}))
    return items, {"missing_videos": missing}


def csltr_items():
    from ..continuous.dataset import csltr_items as _items
    return _items()


ADAPTERS: dict[str, Callable[[], tuple[list[ImportItem], dict]]] = {
    "amrita_slr": amrita_items, "include": include_items, "isl_csltr": csltr_items}
# continuous (sentence) datasets are stored apart from isolated-sign samples
CONTINUOUS_DATASETS = {"isl_csltr"}


def output_root(dataset: str) -> Path:
    return PROCESSED / "continuous" / dataset if dataset in CONTINUOUS_DATASETS else LANDMARKS / dataset


# ---------------------------------------------------------------- worker
_EXTRACTOR = None


def _init_worker() -> None:
    global _EXTRACTOR
    import os
    os.environ.setdefault("GLOG_minloglevel", "2")
    from .extract import LandmarkExtractor
    _EXTRACTOR = LandmarkExtractor()


def process_item(item: ImportItem, out_root: Path) -> dict:
    """Probe + extract one video. Returns a manifest row (never raises)."""
    row = {"sample_id": item.sample_id, "source": item.source, "file": item.path, "label": item.label,
           "group": item.group, "split": item.split, "status": "rejected", "reasons": "", "frames": 0,
           "hand_frames": 0, "face_frames": 0, "fps": 0, "width": 0, "height": 0, "duration_s": 0,
           "extractor": EXTRACTOR_VERSION}
    out = out_root / item.label / f"{item.sample_id}.json"
    if out.exists():
        try:
            prev = json.loads(out.read_text(encoding="utf-8"))
            row.update(status="accepted", frames=prev["num_frames"], hand_frames=prev["hand_frames"],
                       face_frames=prev.get("face_frames", 0), fps=prev["video"].get("fps", 0),
                       width=prev["video"].get("w", 0), height=prev["video"].get("h", 0),
                       duration_s=prev["video"].get("duration_s", 0), reasons="already processed")
            return row
        except (OSError, KeyError, json.JSONDecodeError):
            pass
    try:
        info = probe_video(Path(item.path))
        row.update(fps=round(info.fps, 3), width=info.width, height=info.height, duration_s=info.duration_s)
        if not info.ok:
            row["reasons"] = "; ".join(info.problems)
            return row
        frames, stats = _EXTRACTOR.extract(Path(item.path), start_s=item.meta.get("start_s"),
                                           end_s=item.meta.get("end_s"))
        row.update(frames=len(frames), hand_frames=stats["hand_frames"], face_frames=stats["face_frames"])
        if stats["hand_frames"] < MIN_HAND_FRAMES:
            row["reasons"] = f"hands detected in only {stats['hand_frames']} frame(s) - no landmarks invented"
            return row
        sample = {
            "sample_id": item.sample_id, "label": item.label, "session_id": item.group, "signer_id": item.group,
            "source": item.source, "source_file": item.path, "split": item.split,
            "transcript": item.transcript, "gloss": item.gloss, "meta": item.meta,
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "extractor_version": EXTRACTOR_VERSION,
            "video": {"w": frames[0]["w"] if frames else 0, "h": frames[0]["h"] if frames else 0,
                      "fps": stats["fps"], "duration_s": info.duration_s,
                      "original_w": info.width, "original_h": info.height},
            "num_frames": len(frames), "hand_frames": stats["hand_frames"], "face_frames": stats["face_frames"],
            "frames": frames,
        }
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix(".tmp")
        tmp.write_text(json.dumps(sample, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        tmp.replace(out)
        row["status"] = "accepted"
    except (VideoError, OSError, ValueError) as exc:
        row["reasons"] = f"{exc.__class__.__name__}: {exc}"
    except Exception as exc:  # decoder / mediapipe failure on one file must not stop the batch
        row["reasons"] = f"unexpected {exc.__class__.__name__}: {exc}"
    return row


def write_manifest(dataset: str, rows: list[dict]) -> Path:
    MANIFESTS.mkdir(parents=True, exist_ok=True)
    path = MANIFESTS / f"{dataset}.csv"
    fields = list(rows[0].keys()) if rows else ["sample_id"]
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    return path


def run_import(dataset: str, items: list[ImportItem], workers: int = 2,
               progress: ProgressFn | None = None, cancel: Callable[[], bool] | None = None,
               out_root: Path | None = None) -> dict:
    out_root = Path(out_root) if out_root else LANDMARKS / dataset
    out_root.mkdir(parents=True, exist_ok=True)
    progress = progress or (lambda done, total, msg: None)
    rows: list[dict] = []
    t0 = time.time()
    total = len(items)
    with ProcessPoolExecutor(max_workers=max(1, workers), initializer=_init_worker) as pool:
        futures = {pool.submit(process_item, it, out_root): it for it in items}
        for fut in as_completed(futures):
            rows.append(fut.result())
            done = len(rows)
            if done % 10 == 0 or done == total:
                rate = done / max(1e-6, time.time() - t0)
                progress(done, total, f"{done}/{total} videos, {rate * 60:.0f}/min, "
                                      f"{sum(r['status'] == 'accepted' for r in rows)} accepted")
            if cancel and cancel():
                for f in futures:
                    f.cancel()
                break
    rows.sort(key=lambda r: (r["label"], r["file"]))
    manifest = write_manifest(dataset, rows)
    summary = {
        "dataset": dataset, "videos": total, "processed": len(rows),
        "accepted": sum(r["status"] == "accepted" for r in rows),
        "rejected": sum(r["status"] == "rejected" for r in rows),
        "classes": len({r["label"] for r in rows if r["status"] == "accepted"}),
        "groups": len({r["group"] for r in rows if r["status"] == "accepted"}),
        "extractor_version": EXTRACTOR_VERSION, "manifest": str(manifest),
        "seconds": round(time.time() - t0, 1),
        "finished_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rejection_reasons": sorted({r["reasons"] for r in rows if r["status"] == "rejected"})[:20],
    }
    (PROCESSED / f"{dataset}_import_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False),
                                                               encoding="utf-8")
    return summary


def main() -> None:
    p = argparse.ArgumentParser(description="Import a registered dataset into landmark samples")
    p.add_argument("dataset", choices=list(ADAPTERS))
    p.add_argument("--workers", type=int, default=3)
    p.add_argument("--limit", type=int, default=0, help="only the first N videos (smoke test)")
    a = p.parse_args()
    items, _ = ADAPTERS[a.dataset]()
    if a.limit:
        items = items[: a.limit]
    print(f"{a.dataset}: {len(items)} videos, {len({i.label for i in items})} classes, "
          f"{len({i.group for i in items})} groups", flush=True)
    summary = run_import(a.dataset, items, a.workers, out_root=output_root(a.dataset),
                         progress=lambda d, t, m: print(f"[{datetime.now():%H:%M:%S}] {m}", flush=True))
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
