"""Import the ISL-CSLTR sentence videos that the corpus spreadsheet does not list (Phase 11).

Source of truth: data/mappings/isl_csltr_integrity.json (tools/csltr_integrity.py). Each video's sentence is
taken from its folder name, a convention validated on all 492 spreadsheet-listed files (492/492 match), and its
gloss sequence from the dataset's OWN gloss file (data/mappings/isl_csltr.json). Nothing is inferred from English.

Preprocessing is identical to the existing ISL-CSLTR samples: extractor v1 (no face-crop fallback), run in
multi-video worker batches like the original import. Writes into the same continuous store, with its own
manifest/summary name (isl_csltr_unlisted) so the original ISL-CSLTR manifest is not overwritten.

Usage (from backend/):  python tools/import_csltr_unlisted.py [--workers 3] [--limit N]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.continuous.dataset import INTEGRITY_FILE, RAW_ROOT, load_mapping, recording_index  # noqa: E402
from app.video.importer import ImportItem, output_root, run_import  # noqa: E402


def items_from_integrity() -> list[ImportItem]:
    rep = json.loads(INTEGRITY_FILE.read_text(encoding="utf-8"))
    sentences = load_mapping()["sentences"]
    excluded = {e["file"] for e in rep["excluded"]}
    out = []
    for u in rep["unlisted_with_annotated_sentence"]:
        if u["file"] in excluded:
            continue
        entry = sentences[u["sentence_id"]]
        path = RAW_ROOT / Path(*u["file"].split("/"))
        assert re.sub(r"[^a-z]", "", path.parent.name.lower()) == entry["key"], u["file"]   # label check
        out.append(ImportItem(path=str(path), label="sentence", group=recording_index(path.name), source="isl_csltr",
                              transcript=entry["sentence"], gloss=entry["gloss"],
                              meta={"sentence_id": u["sentence_id"], "gloss_original": entry["gloss_original"],
                                    "provenance": "unlisted in corpus spreadsheet; sentence from folder name "
                                                  "(convention validated 492/492)"}))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    items = items_from_integrity()
    if a.limit:
        items = items[: a.limit]
    groups = sorted({i.group for i in items})
    print(f"{len(items)} unlisted videos, recording rounds {groups}", flush=True)
    assert not {"rec4", "rec5"} & set(groups), "unlisted videos must not belong to the test rounds"
    summary = run_import("isl_csltr_unlisted", items, a.workers, out_root=output_root("isl_csltr"), face_crop=False,
                         progress=lambda d, t, m: print(m, flush=True))
    print(json.dumps({k: v for k, v in summary.items() if k != "rejection_reasons"}, indent=1))
    print("rejections:", summary["rejection_reasons"])


if __name__ == "__main__":
    main()
