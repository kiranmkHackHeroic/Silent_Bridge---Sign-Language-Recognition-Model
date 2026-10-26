"""Download ONLY the INCLUDE videos of classes that match the app's vocabulary, without downloading whole archives.

INCLUDE (Zenodo record 4010759, CC BY 4.0) ships each category as 1-8 large zip files (56.8 GB in total). A zip keeps
its table of contents at the end, so this tool reads that table with HTTP range requests and fetches just the
member videos it needs. Every extracted video is checked against the CRC-32 stored in the archive.

Classes are matched to app labels by the class NAME in INCLUDE's official metadata (never by file name), and the
matches are written to data/mappings/include.json so tools/import + training use INCLUDE's official train/test
split. Resumable: videos already on disk with the right size are skipped.

Usage (from backend/):  python tools/download_include_subset.py [--dry-run] [--workers 4]
"""
from __future__ import annotations

import argparse
import io
import json
import re
import struct
import sys
import threading
import time
import zipfile
import zlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "include"
OUT = RAW / "extracted"
MAPPING = ROOT / "data" / "mappings" / "include.json"
LABELS = ROOT / "data" / "labels.json"
STATUS = RAW / "subset_download_status.json"
RECORD = "https://zenodo.org/api/records/4010759"
FILE_URL = "https://zenodo.org/records/4010759/files/{key}?download=1"


def log(msg: str) -> None:
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def norm(s: str) -> str:
    return re.sub(r"[^a-z]", "", re.sub(r"^\d+\.\s*", "", s.lower()))


def http_range(session: requests.Session, url: str, start: int, end: int, retries: int = 8) -> bytes:
    """Bytes [start, end] inclusive, retried on network errors (the connection here is unreliable)."""
    for attempt in range(retries):
        try:
            r = session.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=60)
            if r.status_code == 206 and len(r.content) == end - start + 1:
                return r.content
            raise IOError(f"HTTP {r.status_code}, {len(r.content)} bytes")
        except (requests.RequestException, IOError) as exc:
            if attempt == retries - 1:
                raise
            time.sleep(min(60, 3 * 2 ** attempt))
            log(f"  retry {attempt + 1} ({exc})")
    raise AssertionError


class RangeFile(io.RawIOBase):
    """Read-only, seekable view of a remote file, so zipfile can read the central directory lazily."""

    def __init__(self, session: requests.Session, url: str, size: int):
        self.s, self.url, self.size, self.pos = session, url, size, 0
        self.cache: dict[int, bytes] = {}

    def seekable(self) -> bool:
        return True

    def readable(self) -> bool:
        return True

    def tell(self) -> int:
        return self.pos

    def seek(self, offset: int, whence: int = 0) -> int:
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos

    def read(self, n: int = -1) -> bytes:
        if n < 0:
            n = self.size - self.pos
        n = max(0, min(n, self.size - self.pos))
        if not n:
            return b""
        block = 1 << 20
        out = bytearray()
        while len(out) < n:
            b0 = (self.pos // block) * block
            if b0 not in self.cache:
                self.cache[b0] = http_range(self.s, self.url, b0, min(self.size, b0 + block) - 1)
            chunk = self.cache[b0][self.pos - b0:self.pos - b0 + n - len(out)]
            out += chunk
            self.pos += len(chunk)
        return bytes(out)


def fetch_member(url: str, info: zipfile.ZipInfo, dest: Path) -> int:
    """Download one archive member by byte range, decompress, verify CRC-32, write atomically."""
    s = requests.Session()
    head = http_range(s, url, info.header_offset, info.header_offset + 29)
    name_len, extra_len = struct.unpack("<HH", head[26:30])
    start = info.header_offset + 30 + name_len + extra_len
    data = http_range(s, url, start, start + info.compress_size - 1) if info.compress_size else b""
    if info.compress_type == zipfile.ZIP_DEFLATED:
        data = zlib.decompress(data, -15)
    elif info.compress_type != zipfile.ZIP_STORED:
        raise IOError(f"unsupported compression {info.compress_type}")
    if len(data) != info.file_size or (zlib.crc32(data) & 0xFFFFFFFF) != info.CRC:
        raise IOError("size/CRC-32 mismatch")
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    tmp.write_bytes(data)
    tmp.replace(dest)
    return len(data)


def matched_classes(meta: pd.DataFrame) -> dict[str, dict]:
    """INCLUDE class -> app vocabulary entry, for classes not yet in the INCLUDE mapping."""
    labels = json.loads(LABELS.read_text(encoding="utf-8"))["labels"]
    by_name: dict[str, dict] = {}
    for e in labels:
        if e["label"] == "_none":
            continue
        for key in (e["label"], e["english"].split("/")[0]):
            by_name.setdefault(norm(key), e)
    known = json.loads(MAPPING.read_text(encoding="utf-8"))["classes"]
    out = {}
    for cls in sorted(meta["label"].unique()):
        e = by_name.get(norm(cls))
        if e and cls not in known:
            out[cls] = {"label": e["label"], "english": e["english"], "kannada": e.get("kannada", ""),
                        "isl_gloss": e.get("isl_gloss", e["label"].upper()), "existing": True}
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="list what would be downloaded, change nothing")
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()

    meta = pd.concat([pd.read_parquet(RAW / f"{s}.parquet").assign(split=s) for s in ("train", "val", "test")])
    new = matched_classes(meta)
    mapping = json.loads(MAPPING.read_text(encoding="utf-8"))
    wanted_classes = set(mapping["classes"]) | set(new)
    want = meta[meta["label"].isin(wanted_classes)]
    # key: "<class folder>/<file name>" -> metadata path (where the importer expects the video)
    targets = {"/".join(p.replace("\\", "/").split("/")[-2:]): p.replace("\\", "/") for p in want["video_path"]}
    missing = {k: p for k, p in targets.items() if not (OUT / p).exists()}
    cats = sorted({p.split("/")[0] for p in missing.values()})
    log(f"{len(new)} new INCLUDE classes match the vocabulary: " + ", ".join(f"{c} -> {v['label']}" for c, v in new.items()))
    log(f"{len(missing)} of {len(targets)} needed videos are not on disk yet; categories: {', '.join(cats) or '-'}")
    if not missing:
        log("nothing to download")
    record = None
    for attempt in range(6):
        try:
            record = requests.get(RECORD, timeout=60).json()
            break
        except (requests.RequestException, ValueError) as exc:
            log(f"Zenodo record not reachable ({exc}); retrying")
            time.sleep(10 * (attempt + 1))
    if record is None:
        sys.exit("Zenodo is not reachable")
    files = [f for f in record["files"] if f["key"].split("_")[0] in {c.split("_")[0] for c in cats}
             and any(f["key"].startswith(c + "_") for c in cats)]

    status = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {"archives": {}}
    plan = []
    s = requests.Session()
    for f in sorted(files, key=lambda f: f["key"]):
        url = FILE_URL.format(key=f["key"])
        zf = zipfile.ZipFile(RangeFile(s, url, int(f["size"])))
        hits = []
        for info in zf.infolist():
            if info.is_dir():
                continue
            key = "/".join(info.filename.replace("\\", "/").split("/")[-2:])
            if key in missing:
                hits.append((info, OUT / missing[key]))
        plan.append((f["key"], url, hits))
        log(f"{f['key']}: {len(hits)} needed videos, {sum(i.compress_size for i, _ in hits) / 1e9:.2f} GB")
    total = sum(i.compress_size for _, _, h in plan for i, _ in h)
    found = sum(len(h) for _, _, h in plan)
    log(f"plan: {found} videos, {total / 1e9:.2f} GB (instead of {sum(int(f['size']) for f in files) / 1e9:.1f} GB of whole archives)")
    if a.dry_run:
        return

    if new:
        mapping["classes"].update(new)
        MAPPING.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        log(f"added {len(new)} classes to {MAPPING.name}")
    lock = threading.Lock()
    done_bytes, done_n, failed = 0, 0, []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=max(1, a.workers)) as pool:
        futs = {pool.submit(fetch_member, url, info, dest): (key, info, dest) for key, url, hits in plan for info, dest in hits}
        for fut in as_completed(futs):
            key, info, dest = futs[fut]
            try:
                fut.result()
                with lock:
                    done_n += 1
                    done_bytes += info.compress_size
            except Exception as exc:  # noqa: BLE001 - report and continue; rerun the tool to resume
                failed.append({"archive": key, "member": info.filename, "error": str(exc)})
                log(f"FAILED {info.filename}: {exc}")
            if done_n % 20 == 0 or done_n + len(failed) == found:
                rate = done_bytes / max(1e-6, time.time() - t0) / 1e6
                log(f"{done_n}/{found} videos, {done_bytes / 1e9:.2f} / {total / 1e9:.2f} GB, {rate:.1f} MB/s")
    for key, _, hits in plan:
        status["archives"][key] = {"state": "partial-extracted", "members_needed": len(hits),
                                   "finished_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    status["failed"] = failed
    STATUS.write_text(json.dumps(status, indent=1), encoding="utf-8")
    log(f"done: {done_n} videos verified (CRC-32), {len(failed)} failed" + (" - rerun to retry them" if failed else ""))


if __name__ == "__main__":
    main()
