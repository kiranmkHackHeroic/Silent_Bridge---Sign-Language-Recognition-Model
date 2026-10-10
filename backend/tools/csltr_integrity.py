"""ISL-CSLTR integrity audit: exact duplicate videos, conflicting labels, and annotated-but-unlisted videos.

Writes data/mappings/isl_csltr_integrity.json (reviewable, committed with the code):
  excluded        video files that future training/evaluation must skip
                    - duplicate with a CONFLICTING sentence label: every copy (the true label is unknown)
                    - duplicate with the SAME label: all but the first copy (no double counting / leakage)
  unlisted        videos present in Videos_Sentence_Level but missing from the corpus spreadsheet; their folder
                  matches an annotated sentence. The folder convention was validated (every listed file sits in the
                  folder named after its sentence). They are NOT imported automatically.
Files are identified by their path relative to the extracted corpus root.

Usage (from backend/):  python tools/csltr_integrity.py
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.continuous.dataset import INTEGRITY_FILE, RAW_ROOT, csltr_items, load_mapping  # noqa: E402

VIDEO_EXT = {".mp4", ".avi", ".mov"}


def key(s: str) -> str:
    return re.sub(r"[^a-z]", "", s.lower())


def main():
    items, _ = csltr_items()
    listed = {Path(i.path).resolve(): i for i in items}
    convention_ok = sum(key(Path(i.path).parent.name) == key(i.transcript) for i in items)
    mapping = load_mapping()["sentences"]
    sentence_of_key = {v["key"]: sid for sid, v in mapping.items()}
    corpus = RAW_ROOT / "ISL_CSLRT_Corpus" / "Videos_Sentence_Level"
    videos = sorted(p for p in corpus.rglob("*") if p.suffix.lower() in VIDEO_EXT)
    rel = lambda p: p.resolve().relative_to(RAW_ROOT.resolve()).as_posix()  # noqa: E731

    by_hash = defaultdict(list)
    for p in videos:
        by_hash[hashlib.md5(p.read_bytes()).hexdigest()].append(p)
    excluded, groups = [], []
    for h, ps in by_hash.items():
        if len(ps) < 2:
            continue
        labels = {key(listed[p.resolve()].transcript) if p.resolve() in listed else key(p.parent.name) for p in ps}
        conflict = len(labels) > 1
        groups.append({"md5": h, "files": [rel(p) for p in ps], "labels": sorted(labels), "conflict": conflict})
        drop = ps if conflict else ps[1:]
        for p in drop:
            excluded.append({"file": rel(p), "reason": "duplicate video with conflicting sentence labels" if conflict
                             else "exact duplicate of " + rel(ps[0]), "md5": h})
    unlisted = [{"file": rel(p), "sentence_id": sentence_of_key.get(key(p.parent.name))}
                for p in videos if p.resolve() not in listed]
    report = {
        "videos_on_disk": len(videos), "listed_in_spreadsheet": len(items), "distinct_contents": len(by_hash),
        "folder_convention_check": {"listed_files_in_matching_folder": convention_ok, "listed_files": len(items)},
        "duplicate_groups": groups, "excluded": excluded,
        "unlisted_with_annotated_sentence": [u for u in unlisted if u["sentence_id"]],
        "unlisted_without_annotation": [u for u in unlisted if not u["sentence_id"]],
        "note": "excluded files are skipped by app.continuous.dataset.load_samples; unlisted files are not imported",
    }
    INTEGRITY_FILE.write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(f"{len(videos)} videos, {len(by_hash)} distinct; {len(groups)} duplicate groups "
          f"({sum(g['conflict'] for g in groups)} with conflicting labels); excluded {len(excluded)}; "
          f"unlisted with annotation {len(report['unlisted_with_annotated_sentence'])}; "
          f"folder convention {convention_ok}/{len(items)}")
    print("wrote", INTEGRITY_FILE)


if __name__ == "__main__":
    main()
