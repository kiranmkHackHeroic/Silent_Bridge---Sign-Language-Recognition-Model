"""Animation mapping (sign_id -> clip file) with captured clips taking precedence."""
from __future__ import annotations

import json
import threading
from pathlib import Path

from ..config import ANIMATION_MAPPING_FILE, ANIMATIONS_DIR
from .retarget import validate_animation


class AnimationLibrary:
    def __init__(self, mapping_file: Path = ANIMATION_MAPPING_FILE, animations_dir: Path = ANIMATIONS_DIR):
        self.mapping_file = Path(mapping_file)
        self.animations_dir = Path(animations_dir)
        self._lock = threading.Lock()
        self.mapping: dict[str, dict] = {}
        self.load()

    def _maybe_reload(self) -> None:
        """Pick up clips captured by other processes (e.g. tools/capture_dataset_clips.py)."""
        mtime = self.mapping_file.stat().st_mtime if self.mapping_file.exists() else 0.0
        if mtime != getattr(self, "_mtime", None):
            self.load()

    def load(self) -> None:
        self._exists: dict[str, bool] = {}     # clip file existence, valid until the mapping changes
        self._mtime = self.mapping_file.stat().st_mtime if self.mapping_file.exists() else 0.0
        if self.mapping_file.exists():
            data = json.loads(self.mapping_file.read_text(encoding="utf-8"))
            self.mapping = {k: v for k, v in data.get("animations", {}).items() if isinstance(v, dict)}
        else:
            self.mapping = {}

    def _save(self) -> None:
        data = json.loads(self.mapping_file.read_text(encoding="utf-8")) if self.mapping_file.exists() else {}
        data["animations"] = self.mapping
        self.mapping_file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def info(self, sign_id: str) -> dict:
        self._maybe_reload()
        entry = self.mapping.get(sign_id)
        if not entry:
            return {"available": False, "type": None, "verified": False}
        rel = entry["file"]
        if rel not in self._exists:
            self._exists[rel] = (self.animations_dir / rel).exists()
        return {"available": self._exists[rel], "type": entry.get("type"), "verified": bool(entry.get("verified")),
                "file": entry["file"], "review": entry.get("review"), "dataset_source": entry.get("dataset_source")}

    def get(self, sign_id: str) -> dict | None:
        self._maybe_reload()
        entry = self.mapping.get(sign_id)
        if not entry:
            return None
        file = (self.animations_dir / entry["file"]).resolve()
        if self.animations_dir.resolve() not in file.parents or not file.exists():
            return None
        clip = json.loads(file.read_text(encoding="utf-8"))
        if validate_animation(clip):
            return None
        clip["type"] = entry.get("type", clip.get("type"))
        clip["verified"] = bool(entry.get("verified", False))
        clip["dataset_source"] = entry.get("dataset_source")      # provenance; extraction != verified ISL
        return clip

    def save_captured(self, sign_id: str, clip: dict) -> dict:
        problems = validate_animation(clip)
        if problems:
            raise ValueError("; ".join(problems))
        rel = f"captured/{sign_id}.json"
        with self._lock:
            path = self.animations_dir / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(clip, ensure_ascii=False), encoding="utf-8")
            review = (self.mapping.get(sign_id) or {}).get("review") or {
                k: "unchecked" for k in ("handshape", "orientation", "movement", "location", "non_manual")}
            self.mapping[sign_id] = {"file": rel, "type": "captured", "verified": False, "review": review}
            self._save()
            self._mtime = self.mapping_file.stat().st_mtime
            self._exists[rel] = True
        return self.info(sign_id)

    def index(self) -> dict:
        self._maybe_reload()
        return {sid: self.info(sid) for sid in self.mapping}
