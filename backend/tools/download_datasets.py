"""Download and extract registered ISL datasets (see data/datasets_registry.json).

Usage (from backend/):
    python tools/download_datasets.py --list
    python tools/download_datasets.py amrita_slr
    python tools/download_datasets.py include isl_csltr --keep-archives

* Resumable downloads (HTTP Range) into data/raw/<dataset>/<file>.part
* Retries with back-off, progress output
* Integrity check against the checksum published by the host (sha256 / md5);
  a file that fails the check is deleted and never extracted
* Safe ZIP extraction: absolute paths, '..' components and symlinks are refused
* Status written to data/raw/<dataset>/download_status.json
Only public files that the hosts serve without authentication are fetched.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import time
import urllib.error
import urllib.request
import zipfile
import ssl
from datetime import datetime, timezone
from pathlib import Path

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CONTEXT = ssl.create_default_context()

BACKEND = Path(__file__).resolve().parent.parent
REGISTRY = BACKEND / "data" / "datasets_registry.json"
RAW = BACKEND / "data" / "raw"
CHUNK = 1 << 20
UA = {"User-Agent": "KannadaSignBridge-dataset-downloader/1.0 (educational project)"}


def log(msg: str) -> None:
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def resolve_mendeley(entry: dict) -> dict:
    """Fill in file id, size and sha256 from Mendeley's public file listing."""
    url = f"https://data.mendeley.com/public-api/datasets/{entry['dataset_id']}/files?folder_id=root&version=1"
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60, context=SSL_CONTEXT) as r:
        files = json.load(r)
    for f in files:
        if f["filename"] == entry["name"]:
            cd = f["content_details"]
            return {**entry, "url": entry["url"].replace("{file_id}", f["id"]), "size": cd["size"],
                    "checksum": f"sha256:{cd['sha256_hash']}"}
    raise RuntimeError(f"{entry['name']} not found in Mendeley listing")


def file_hash(path: Path, algo: str) -> str:
    h = hashlib.new(algo)
    with path.open("rb") as fh:
        while chunk := fh.read(CHUNK * 8):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: Path, expected_size: int | None, retries: int = 8) -> None:
    part = dest.with_suffix(dest.suffix + ".part")
    for attempt in range(1, retries + 1):
        have = part.stat().st_size if part.exists() else 0
        if expected_size and have >= expected_size:
            break
        req = urllib.request.Request(url, headers={**UA, **({"Range": f"bytes={have}-"} if have else {})})
        try:
            with urllib.request.urlopen(req, timeout=120, context=SSL_CONTEXT) as r:
                if have and r.status != 206:      # server ignored Range -> restart
                    have = 0
                    part.unlink(missing_ok=True)
                total = expected_size or (have + int(r.headers.get("Content-Length", 0)))
                mode = "ab" if have else "wb"
                last_report, t0, got0 = 0.0, time.time(), have
                with part.open(mode) as fh:
                    while chunk := r.read(CHUNK):
                        fh.write(chunk)
                        have += len(chunk)
                        now = time.time()
                        if now - last_report > 15:
                            speed = (have - got0) / max(1e-6, now - t0)
                            eta = (total - have) / speed if speed and total else 0
                            log(f"  {dest.name}: {have / 1e9:.2f}/{total / 1e9:.2f} GB "
                                f"({100 * have / max(1, total):.1f}%) {speed / 1e6:.2f} MB/s, ETA {eta / 60:.0f} min")
                            last_report = now
            if not expected_size or have >= expected_size:
                break
        except urllib.error.HTTPError as exc:
            if exc.code == 416 and have > 0:
                # nothing left to send: the partial file already holds the whole file
                # (the checksum verification below decides whether it is really correct)
                log(f"  {dest.name}: server reports the file is complete ({have / 1e9:.2f} GB)")
                break
            wait = min(60, 5 * attempt)
            log(f"  attempt {attempt}/{retries} failed: {exc}; retrying in {wait}s (download resumes)")
            time.sleep(wait)
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as exc:
            wait = min(60, 5 * attempt)
            log(f"  attempt {attempt}/{retries} failed: {exc}; retrying in {wait}s (download resumes)")
            time.sleep(wait)
    else:
        raise RuntimeError(f"download of {dest.name} failed after {retries} attempts")
    part.replace(dest)


def verify(path: Path, checksum: str) -> bool:
    if not checksum or ":" not in checksum or not checksum.split(":", 1)[1]:
        log(f"  no published checksum for {path.name}; size check only")
        return True
    algo, expected = checksum.split(":", 1)
    log(f"  verifying {algo} of {path.name} ...")
    actual = file_hash(path, algo)
    if actual.lower() != expected.lower():
        log(f"  CHECKSUM MISMATCH for {path.name}: expected {expected}, got {actual}")
        return False
    log("  checksum OK")
    return True


def safe_extract(archive: Path, target: Path) -> int:
    target = target.resolve()
    n = 0
    with zipfile.ZipFile(archive) as zf:
        for info in zf.infolist():
            name = info.filename.replace("\\", "/")
            if name.startswith("/") or ":" in name.split("/")[0] or ".." in name.split("/"):
                raise RuntimeError(f"unsafe path in archive: {info.filename}")
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise RuntimeError(f"symlink in archive refused: {info.filename}")
            out = (target / name).resolve()
            if target not in out.parents and out != target:
                raise RuntimeError(f"path escapes target: {info.filename}")
            if info.is_dir():
                out.mkdir(parents=True, exist_ok=True)
                continue
            out.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, out.open("wb") as dst:
                shutil.copyfileobj(src, dst, CHUNK)
            n += 1
    return n


def write_status(ds_dir: Path, status: dict) -> None:
    (ds_dir / "download_status.json").write_text(json.dumps(status, indent=2, ensure_ascii=False), encoding="utf-8")


def fetch_dataset(key: str, spec: dict, keep_archives: bool) -> dict:
    import threading
    from concurrent.futures import ThreadPoolExecutor
    ds_dir = RAW / key
    ds_dir.mkdir(parents=True, exist_ok=True)
    status_file = ds_dir / "download_status.json"
    status = json.loads(status_file.read_text(encoding="utf-8")) if status_file.exists() else {"files": {}}
    status.update(dataset=key, source_url=spec["source_url"], license=spec["license"])
    status_lock = threading.Lock()

    def process_entry(raw_entry: dict):
        entry = dict(raw_entry)
        if entry.get("resolve") == "mendeley":
            entry = resolve_mendeley(entry)
        with status_lock:
            fstat = status["files"].get(entry["name"], {})
        if fstat.get("state") == "extracted":
            log(f"{key}/{entry['name']}: already extracted, skipping")
            return
        dest = ds_dir / entry["name"]
        try:
            if not dest.exists():
                log(f"{key}: downloading {entry['name']} ({entry.get('size', 0) / 1e9:.2f} GB)")
                download(entry["url"], dest, entry.get("size"))
            if not verify(dest, entry.get("checksum", "")):
                dest.unlink(missing_ok=True)
                raise RuntimeError("checksum mismatch - file deleted, rerun to download again")
            log(f"{key}: extracting {entry['name']} ...")
            n = safe_extract(dest, ds_dir / "extracted")
            fstat = {"state": "extracted", "files_extracted": n, "checksum": entry.get("checksum"),
                     "finished_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
            if not keep_archives:
                dest.unlink(missing_ok=True)       # avoid keeping two copies of large data
                fstat["archive_deleted"] = True
            log(f"{key}: {entry['name']} -> {n} files extracted")
        except Exception as exc:  # report and continue with the next file
            fstat = {"state": "failed", "error": str(exc),
                     "at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
            log(f"{key}: FAILED {entry['name']}: {exc}")
        with status_lock:
            status["files"][entry["name"]] = fstat
            write_status(ds_dir, status)

    workers = min(4, len(spec["files"]))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        list(executor.map(process_entry, spec["files"]))

    states = {f.get("state") for f in status["files"].values()}
    status["state"] = "extracted" if states == {"extracted"} else ("partial" if "extracted" in states else "failed")
    write_status(ds_dir, status)
    return status


def main() -> None:
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))["datasets"]
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("datasets", nargs="*", choices=list(reg) + [[]], help="dataset keys")
    p.add_argument("--list", action="store_true")
    p.add_argument("--keep-archives", action="store_true", help="keep .zip files after extraction")
    a = p.parse_args()
    if a.list or not a.datasets:
        for k, v in reg.items():
            size = sum(f.get("size", 0) for f in v["files"]) / 1e9
            print(f"{k:12s} {v['task']:10s} {size:6.2f} GB  {v['license']:10s} {v['name']}")
        return
    ok = True
    for key in a.datasets:
        st = fetch_dataset(key, reg[key], a.keep_archives)
        log(f"{key}: {st['state']}")
        ok &= st["state"] == "extracted"
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
