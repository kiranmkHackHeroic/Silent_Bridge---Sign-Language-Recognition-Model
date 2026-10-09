"""User uploads: videos / ZIP archives + annotations -> preview -> import job.

Files are stored under data/raw/user_uploads/<batch_id>/ (local only, never sent
anywhere). A batch is previewed before anything is imported; importing runs as a
background job and writes landmark samples to
data/processed/landmarks/<dataset_name>/ in the same format as webcam recordings.

How labels are assigned (never guessed from a file name):
  * label_mode="single"     - one label given in the form applies to every video
  * label_mode="annotation" - a CSV/JSON annotation file lists each video:
        file,label[,signer,session,transcript,gloss,start,end]
    (JSON: a list of objects with the same keys). 'file' is the path inside the
    upload / ZIP; start/end (seconds) trim the video.
  * label_mode="folders"    - explicitly chosen convention: in a ZIP, the first
    folder name below the root is the label (e.g. help/clip1.mp4)
"""
from __future__ import annotations

import csv
import io
import json
import re
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from .config import DATA_DIR
from .translation.kannada_mapping import LABEL_RE
from .video.extract import VIDEO_EXTENSIONS, probe_video

UPLOADS = DATA_DIR / "raw" / "user_uploads"
SAFE = re.compile(r"[^A-Za-z0-9_-]")
MAX_FILE_BYTES = 2 * 1024 ** 3
ANNOTATION_EXT = {".csv", ".json"}


class UploadError(ValueError):
    pass


def _safe_name(name: str) -> str:
    base = Path(name.replace("\\", "/")).name
    stem, suffix = Path(base).stem, Path(base).suffix.lower()
    stem = re.sub(r"[^\w\- .()]", "_", stem, flags=re.UNICODE).strip() or "file"
    return f"{stem[:80]}{suffix}"


def _batch_dir(batch_id: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{12}", batch_id or ""):
        raise UploadError("invalid batch id")
    d = UPLOADS / batch_id
    if not d.exists():
        raise UploadError("upload batch not found")
    return d


def _safe_unzip(archive: Path, target: Path) -> list[str]:
    out: list[str] = []
    target = target.resolve()
    with zipfile.ZipFile(archive) as zf:
        for info in zf.infolist():
            name = info.filename.replace("\\", "/")
            if name.startswith("/") or ".." in name.split("/") or ":" in name.split("/")[0]:
                raise UploadError(f"unsafe path in ZIP: {info.filename}")
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise UploadError(f"symlink in ZIP refused: {info.filename}")
            if info.is_dir() or name.startswith("__MACOSX/"):
                continue
            dest = (target / name).resolve()
            if target not in dest.parents:
                raise UploadError(f"path escapes upload folder: {info.filename}")
            if info.file_size > MAX_FILE_BYTES:
                raise UploadError(f"file too large in ZIP: {info.filename}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, dest.open("wb") as dst:
                shutil.copyfileobj(src, dst, 1 << 20)
            out.append(dest.relative_to(target).as_posix())
    return out


def parse_annotations(path: Path) -> list[dict]:
    """CSV or JSON annotation file -> list of {file, label, signer, session, transcript, gloss, start, end}."""
    text = path.read_text(encoding="utf-8-sig")
    if path.suffix.lower() == ".json":
        data = json.loads(text)
        rows = data.get("items", data) if isinstance(data, dict) else data
        if not isinstance(rows, list):
            raise UploadError("JSON annotations must be a list of objects")
    else:
        rows = list(csv.DictReader(io.StringIO(text)))
    out = []
    for i, r in enumerate(rows):
        if not isinstance(r, dict):
            raise UploadError(f"annotation row {i + 1} is not an object")
        r = {str(k).strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in r.items() if k}
        if not r.get("file"):
            raise UploadError(f"annotation row {i + 1}: missing 'file'")
        item = {"file": str(r["file"]).replace("\\", "/"), "label": str(r.get("label") or "").strip(),
                "signer": str(r.get("signer") or ""), "session": str(r.get("session") or ""),
                "transcript": str(r.get("transcript") or ""),
                "gloss": r["gloss"] if isinstance(r.get("gloss"), list) else str(r.get("gloss") or "").split()}
        for key in ("start", "end"):
            val = r.get(key)
            if val not in (None, ""):
                try:
                    item[key] = float(val)
                except (TypeError, ValueError) as exc:
                    raise UploadError(f"annotation row {i + 1}: '{key}' must be seconds") from exc
        out.append(item)
    return out


def create_batch(files: list[tuple[str, bytes]], dataset_name: str, signer_id: str, session_id: str,
                 label_mode: str, label: str, known_labels: set[str], language: str = "ISL",
                 annotation_type: str = "isolated") -> dict:
    if label_mode not in ("single", "annotation", "folders"):
        raise UploadError("label_mode must be single, annotation or folders")
    dataset = SAFE.sub("_", dataset_name.strip() or "user_uploads")[:40] or "user_uploads"
    signer = SAFE.sub("_", signer_id.strip() or "signer1")[:40]
    session = SAFE.sub("_", session_id.strip() or datetime.now().strftime("up%Y%m%d_%H%M"))[:40]
    batch_id = uuid.uuid4().hex[:12]
    root = UPLOADS / batch_id
    files_dir = root / "files"
    files_dir.mkdir(parents=True)
    stored: list[str] = []
    annotations: list[dict] = []
    try:
        for name, content in files:
            if len(content) > MAX_FILE_BYTES:
                raise UploadError(f"{name}: larger than 2 GB")
            safe = _safe_name(name)
            dest = files_dir / safe
            dest.write_bytes(content)
            ext = dest.suffix.lower()
            if ext == ".zip":
                extracted = _safe_unzip(dest, files_dir / dest.stem)
                stored += [f"{dest.stem}/{s}" for s in extracted]
                dest.unlink()
            else:
                stored.append(safe)
        for rel in stored:
            if Path(rel).suffix.lower() in ANNOTATION_EXT:
                annotations += parse_annotations(files_dir / rel)
    except Exception:
        shutil.rmtree(root, ignore_errors=True)
        raise
    videos = sorted(r for r in stored if Path(r).suffix.lower() in VIDEO_EXTENSIONS)
    ann_by_file = {}
    for a in annotations:
        ann_by_file[a["file"]] = a
        ann_by_file.setdefault(Path(a["file"]).name, a)

    items, problems = [], []
    for rel in videos:
        ann = ann_by_file.get(rel) or ann_by_file.get(Path(rel).name)
        if label_mode == "single":
            lab = label.strip()
        elif label_mode == "annotation":
            lab = ann["label"] if ann else ""
        else:  # folders: explicit convention - first folder under the ZIP root
            parts = rel.split("/")
            lab = parts[-2] if len(parts) >= 2 else ""
        lab = lab.strip().lower().replace(" ", "_")
        info = probe_video(files_dir / rel)
        issue = []
        if not lab:
            issue.append("no label (not in annotation file)" if label_mode == "annotation" else "no label")
        elif not LABEL_RE.match(lab) or lab not in known_labels:
            issue.append(f"label '{lab}' is not in the vocabulary - add it on the Dataset & Model page first")
        issue += info.problems
        items.append({"file": rel, "label": lab, "signer": (ann or {}).get("signer") or signer,
                      "session": (ann or {}).get("session") or session, "transcript": (ann or {}).get("transcript", ""),
                      "gloss": (ann or {}).get("gloss", []), "start_s": (ann or {}).get("start"),
                      "end_s": (ann or {}).get("end"), "fps": round(info.fps, 2), "frames": info.frame_count,
                      "duration_s": info.duration_s, "width": info.width, "height": info.height,
                      "ok": not issue, "problems": issue})
    if not videos:
        problems.append("no video files found (supported: " + ", ".join(sorted(VIDEO_EXTENSIONS)) + ")")
    if label_mode == "annotation" and not annotations:
        problems.append("label mode is 'annotation' but no CSV/JSON annotation file was uploaded")
    batch = {"batch_id": batch_id, "dataset": dataset, "signer_id": signer, "session_id": session,
             "label_mode": label_mode, "language": language, "annotation_type": annotation_type,
             "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "items": items,
             "problems": problems, "videos": len(videos), "ready": sum(i["ok"] for i in items),
             "annotations": len(annotations), "state": "previewed"}
    (root / "batch.json").write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
    return batch


def get_batch(batch_id: str) -> dict:
    return json.loads((_batch_dir(batch_id) / "batch.json").read_text(encoding="utf-8"))


def list_batches() -> list[dict]:
    if not UPLOADS.exists():
        return []
    out = []
    for d in sorted(UPLOADS.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            b = json.loads((d / "batch.json").read_text(encoding="utf-8"))
            out.append({k: b[k] for k in ("batch_id", "dataset", "created_at", "videos", "ready", "state", "label_mode")})
        except (OSError, json.JSONDecodeError, KeyError):
            continue
    return out


def delete_batch(batch_id: str, delete_landmarks: bool = False) -> dict:
    """Privacy control: removes the uploaded videos (and optionally their extracted landmarks)."""
    d = _batch_dir(batch_id)
    batch = get_batch(batch_id)
    removed = 0
    if delete_landmarks:
        from .video.importer import LANDMARKS
        for sid in batch.get("sample_ids", []):
            for f in (LANDMARKS / batch["dataset"]).glob(f"*/{sid}.json"):
                f.unlink()
                removed += 1
    shutil.rmtree(d)
    return {"deleted_batch": batch_id, "deleted_landmark_samples": removed}


def import_batch(batch_id: str, progress=None, cancel: Callable[[], bool] | None = None) -> dict:
    from .video.importer import ImportItem, run_import

    d = _batch_dir(batch_id)
    batch = get_batch(batch_id)
    ready = [i for i in batch["items"] if i["ok"]]
    if not ready:
        raise UploadError("no importable videos in this batch (fix the problems shown in the preview)")
    items = [ImportItem(path=str(d / "files" / i["file"]), label=i["label"], group=f"{i['signer']}_{i['session']}",
                        source=batch["dataset"], transcript=i.get("transcript", ""), gloss=i.get("gloss", []),
                        meta={"upload_batch": batch_id, "start_s": i.get("start_s"), "end_s": i.get("end_s")})
             for i in ready]
    summary = run_import(batch["dataset"], items, workers=2, progress=progress, cancel=cancel)
    batch.update(state="imported", import_summary=summary, sample_ids=[it.sample_id for it in items])
    (d / "batch.json").write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
    return summary
