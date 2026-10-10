"""Attribute each labelled single-sign recording's live result to a cause (Phase 7).

The recording is replayed through the live RecognitionSession; the decided events (with their "Latest
completed sign" traces) are then classified:
  correct  exactly the expected word was added
  E        boundary: no classifiable segment, or the sign was split into several decided segments
  C        the expected sign was predicted and accepted but suppressed (duplicate / continuation)
  B        the expected sign is the top-1 but below the threshold (rejected)
  D        wrong top-1 while landmarks were degraded (face visible in < 50% of the segment, too few hand
           frames, or features flagged out-of-distribution)
  A2       wrong top-1, but the expected sign is 2nd or 3rd (near miss: model confusion)
  A        the expected sign is not in the top three (model confusion)
Order matters: boundary and suppression are checked first, landmark problems before model confusion.
"""
from __future__ import annotations

CAUSE_TEXT = {
    "correct": "correct",
    "E": "sign boundary wrong (no segment / split)",
    "C": "predicted but suppressed (duplicate / continuation)",
    "B": "correct top-1 rejected by the threshold",
    "D": "landmarks degraded (face missing, few hand frames or out-of-distribution)",
    "A2": "model confusion: correct sign 2nd/3rd",
    "A": "model confusion: correct sign not in top 3",
}
DECIDED = ("sign", "uncertain", "segment")


def _frames(e: dict) -> int:
    return int(e.get("frames") or (e.get("segment") or {}).get("frames") or 0)


def classify(label: str, events: list[dict]) -> dict:
    words = [e["token"]["label"] for e in events if e.get("type") == "sign"]
    decided = [e for e in events if e.get("type") in DECIDED and e.get("top")]
    if words == [label]:
        cause = "correct"
    elif not decided or len(decided) > 1:
        cause = "E"
    else:
        e = decided[0]
        top = [c["label"] for c in e["top"]]
        seg = (e.get("trace") or {}).get("segment") or {}
        stage = (e.get("diagnosis") or {}).get("stage")
        degraded = (seg.get("face_frame_share", 1.0) < 0.5 or stage == "features"
                    or (seg.get("hand_frames", 99) < 8))
        if top[0] == label and e.get("result") in ("suppressed_duplicate", "continuation"):
            cause = "C"
        elif top[0] == label and e.get("type") == "uncertain":
            cause = "B"
        elif top[0] == label:
            cause = "E"                    # right top-1 but no word for another segment-level reason
        elif degraded:
            cause = "D"
        elif label in top[1:3]:
            cause = "A2"
        else:
            cause = "A"
    main = max(decided, key=_frames, default=None)
    return {"cause": cause, "words": words, "decided_segments": len(decided),
            "top3": [(c["label"], round(c["confidence"], 3)) for c in (main or {}).get("top", [])],
            "boundary": ((main or {}).get("trace") or {}).get("segment", {}).get("boundary") if main else None,
            "face_frame_share": ((main or {}).get("trace") or {}).get("segment", {}).get("face_frame_share") if main else None}
