"""Local landmark dataset: one JSON file per recorded sample.

Layout: data/dataset/<label>/<sample_id>.json
Each sample: {"sample_id", "label", "session_id", "signer_id", "created_at",
              "video": {"w", "h"}, "frames": [ <frame payload as sent by the browser> ]}
Only landmark coordinates are stored - never images or video.
"""
from __future__ import annotations

import json
import re
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path

from ..config import DATASET_DIR

SAFE_ID = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")
MAX_FRAMES = 600


class DatasetError(ValueError):
    pass


class DatasetStore:
    def __init__(self, root: Path = DATASET_DIR):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, label: str, frames: list[dict], session_id: str, signer_id: str = "signer1",
             video: dict | None = None) -> dict:
        for name, value in (("label", label), ("session_id", session_id), ("signer_id", signer_id)):
            if not SAFE_ID.match(value or ""):
                raise DatasetError(f"invalid {name}")
        if not frames or len(frames) > MAX_FRAMES:
            raise DatasetError(f"a sample needs 1-{MAX_FRAMES} frames")
        hand_frames = sum(1 for f in frames if f.get("hands"))
        if hand_frames == 0:
            raise DatasetError("no hands were detected in this recording - sample not saved")
        sample_id = f"{session_id}_{int(time.time() * 1000)}_{secrets.token_hex(2)}"
        sample = {
            "sample_id": sample_id,
            "label": label,
            "session_id": session_id,
            "signer_id": signer_id,
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "video": video or {},
            "num_frames": len(frames),
            "hand_frames": hand_frames,
            "frames": frames,
        }
        folder = self.root / label
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{sample_id}.json").write_text(json.dumps(sample, separators=(",", ":")), encoding="utf-8")
        return {k: v for k, v in sample.items() if k != "frames"}

    def iter_samples(self):
        for folder in sorted(p for p in self.root.iterdir() if p.is_dir()):
            for file in sorted(folder.glob("*.json")):
                try:
                    yield json.loads(file.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    continue

    def load(self, label: str, sample_id: str) -> dict:
        if not SAFE_ID.match(label) or not SAFE_ID.match(sample_id):
            raise DatasetError("invalid id")
        file = self.root / label / f"{sample_id}.json"
        if not file.exists():
            raise DatasetError("sample not found")
        return json.loads(file.read_text(encoding="utf-8"))

    def latest(self, label: str) -> dict | None:
        if not SAFE_ID.match(label):
            raise DatasetError("invalid label")
        folder = self.root / label
        files = sorted(folder.glob("*.json"), key=lambda p: p.stat().st_mtime) if folder.exists() else []
        return json.loads(files[-1].read_text(encoding="utf-8")) if files else None

    def delete(self, label: str, sample_id: str) -> bool:
        if not SAFE_ID.match(label) or not SAFE_ID.match(sample_id):
            raise DatasetError("invalid id")
        file = self.root / label / f"{sample_id}.json"
        if file.exists():
            file.unlink()
            return True
        return False

    def summary(self) -> dict:
        labels: dict[str, dict] = {}
        sessions: set[str] = set()
        total = 0
        for folder in sorted(p for p in self.root.iterdir() if p.is_dir()):
            entries = []
            for file in sorted(folder.glob("*.json"), key=lambda p: p.stat().st_mtime):
                try:
                    data = json.loads(file.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    continue
                entries.append({"sample_id": data["sample_id"], "session_id": data.get("session_id"),
                                "num_frames": data.get("num_frames"), "created_at": data.get("created_at")})
                sessions.add(data.get("session_id", ""))
            if entries:
                labels[folder.name] = {"count": len(entries),
                                       "sessions": sorted({e["session_id"] for e in entries}),
                                       "samples": entries[-20:]}
                total += len(entries)
        return {"total_samples": total, "num_sessions": len(sessions), "labels": labels}
