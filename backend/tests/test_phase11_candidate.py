"""Phase 11: extractor version selection for re-imports, and the candidate tool's paired test."""
import sys
from pathlib import Path

from app.continuous.dataset import recording_index
from app.video.extract import EXTRACTOR_VERSION, EXTRACTOR_VERSION_V1, LandmarkExtractor

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
from train_continuous_candidate import mcnemar_exact  # noqa: E402


def test_extractor_version_follows_face_crop_flag():
    ex = LandmarkExtractor(face_crop=False)
    try:
        assert ex.version == EXTRACTOR_VERSION_V1 and not ex.face_crop_enabled
    finally:
        ex.close()
    ex = LandmarkExtractor()
    try:
        assert ex.version == EXTRACTOR_VERSION and ex.face_crop_enabled
    finally:
        ex.close()


def test_recording_round_from_file_name():
    assert recording_index("MVI_6496.MP4") == "rec1"
    assert recording_index("something (4).MP4") == "rec4"


def test_mcnemar_exact():
    assert mcnemar_exact(0, 0) == 1.0
    assert abs(mcnemar_exact(19, 8) - 0.0522) < 1e-3       # value reported in PHASE11_REPORT.md
    assert mcnemar_exact(5, 5) == 1.0


def test_unlisted_videos_are_opt_in(tmp_path, monkeypatch):
    import json

    from app.continuous import dataset as cds
    from tests.synthetic import sign_frames

    cont = tmp_path / "continuous" / "isl_csltr" / "sentence"
    cont.mkdir(parents=True)
    frames = sign_frames("circle", n=40)
    for name, meta in (("listed", {"sentence_id": "s1"}),
                       ("unlisted", {"sentence_id": "s1", "provenance": "unlisted in corpus spreadsheet"})):
        (cont / f"{name}.json").write_text(json.dumps({
            "sample_id": name, "meta": meta, "transcript": "i go", "gloss": ["I", "GO"],
            "session_id": "rec1", "frames": frames, "source_file": ""}), encoding="utf-8")
    monkeypatch.setattr(cds, "CONTINUOUS_DIR", tmp_path / "continuous")
    monkeypatch.setattr(cds, "INTEGRITY_FILE", tmp_path / "missing.json")
    assert [s["sample_id"] for s in cds.load_samples()] == ["listed"]
    assert sorted(s["sample_id"] for s in cds.load_samples(include_unlisted=True)) == ["listed", "unlisted"]
