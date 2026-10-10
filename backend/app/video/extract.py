"""Video file -> landmark frames, using the SAME MediaPipe models as the browser.

The output of `extract_video` is a list of frame payloads in exactly the format
the browser sends over the WebSocket:
    {"t": ms, "w": width, "h": height,
     "hands": [{"handedness": "Left"|"Right", "score": s, "landmarks": [[x, y, z] * 21]}],
     "face": {"cx", "cy", "w", "h"} | None}
so recorded webcam samples, imported dataset videos and live inference all go
through the identical `app.recognition.landmarks.parse_frame` feature code.

Models: frontend/public/models/hand_landmarker.task and face_landmarker.task
(MediaPipe 0.10.21 in both Python and the browser). Frames are decoded with
OpenCV, converted BGR->RGB and downscaled so the longest side is <= 640 px
(the live webcam runs at 640x480). The face landmarker runs every 2nd frame
and its box is carried forward, as the browser does (every 3rd frame there).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path

from ..config import BACKEND_DIR

MODELS_DIR = BACKEND_DIR.parent / "frontend" / "public" / "models"
HAND_MODEL = MODELS_DIR / "hand_landmarker.task"
FACE_MODEL = MODELS_DIR / "face_landmarker.task"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"}
# v2: face-crop fallback (Phase 6). Signers filmed from a distance (INCLUDE: full body, face ~25 px at
# 640 px) were never face-detected, so their face-relative features were always empty, unlike a webcam
# user close to the camera. When the full-frame face detector finds nothing, the face is searched in an
# upper-centre crop of the ORIGINAL-resolution frame and mapped back to full-frame coordinates.
EXTRACTOR_VERSION = "mp0.10.21-tasks-640-facecrop-v2"
FACE_CROP_W, FACE_CROP_H = 0.3, 0.5          # crop size as a fraction of the frame (validated in Phase 6)


class VideoError(ValueError):
    pass


@dataclass
class VideoInfo:
    path: str
    fps: float
    frame_count: int
    width: int
    height: int
    duration_s: float
    problems: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.problems


def probe_video(path: Path, min_frames: int = 8, min_duration_s: float = 0.3,
                max_duration_s: float = 120.0) -> VideoInfo:
    """Integrity check: the file opens, reports sane metadata and its first frame decodes."""
    import cv2

    path = Path(path)
    problems: list[str] = []
    if path.suffix.lower() not in VIDEO_EXTENSIONS:
        problems.append(f"unsupported extension {path.suffix}")
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            return VideoInfo(str(path), 0, 0, 0, 0, 0, ["cannot open video (corrupt or unsupported codec)"])
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        ok, frame = cap.read()
        if not ok or frame is None:
            problems.append("first frame could not be decoded")
    finally:
        cap.release()
    if not (1 <= fps <= 240) or not math.isfinite(fps):
        problems.append(f"implausible frame rate {fps}")
        fps = fps if 1 <= fps <= 240 else 30.0
    if n and n < min_frames:
        problems.append(f"too few frames ({n} < {min_frames})")
    duration = n / fps if fps else 0.0
    if n and duration < min_duration_s:
        problems.append(f"too short ({duration:.2f}s)")
    if duration > max_duration_s:
        problems.append(f"too long ({duration:.0f}s > {max_duration_s:.0f}s)")
    if w <= 0 or h <= 0:
        problems.append("invalid resolution")
    return VideoInfo(str(path), fps, n, w, h, round(duration, 3), problems)


class LandmarkExtractor:
    """Holds MediaPipe Hand + Face landmarkers (create one per process)."""

    def __init__(self, face: bool = True, max_side: int = 640):
        import mediapipe as mp
        from mediapipe.tasks.python import BaseOptions
        from mediapipe.tasks.python import vision

        if not HAND_MODEL.exists():
            raise FileNotFoundError(f"missing {HAND_MODEL}; run setup.ps1")
        self.mp = mp
        self.max_side = max_side
        self.hands = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(HAND_MODEL)),
            running_mode=vision.RunningMode.VIDEO, num_hands=2,
            min_hand_detection_confidence=0.5, min_hand_presence_confidence=0.5, min_tracking_confidence=0.5))
        self.face = None
        if face and FACE_MODEL.exists():
            self.face = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(FACE_MODEL)),
                running_mode=vision.RunningMode.VIDEO, num_faces=1, output_face_blendshapes=False,
                min_face_detection_confidence=0.5, min_face_presence_confidence=0.5, min_tracking_confidence=0.5))
            # stateless detector for the crop fallback (a crop is not a continuous video stream)
            self.face_crop = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(FACE_MODEL)),
                running_mode=vision.RunningMode.IMAGE, num_faces=1, output_face_blendshapes=False,
                min_face_detection_confidence=0.5, min_face_presence_confidence=0.5))
        self._ts = 0

    def close(self) -> None:
        self.hands.close()
        if self.face:
            self.face.close()
            self.face_crop.close()

    def _face_in_crop(self, orig_bgr, centre_x: float | None) -> dict | None:
        """Face box (full-frame normalised coords) found in an upper-centre crop of the original frame."""
        import cv2
        H, W = orig_bgr.shape[:2]
        cw, ch = int(FACE_CROP_W * W), int(FACE_CROP_H * H)
        cx = (centre_x if centre_x is not None else 0.5) * W
        x0 = int(max(0, min(W - cw, cx - cw / 2)))
        crop = orig_bgr[0:ch, x0:x0 + cw]
        res = self.face_crop.detect(self.mp.Image(image_format=self.mp.ImageFormat.SRGB,
                                                  data=cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)))
        if not res.face_landmarks:
            return None
        xs = [x0 / W + p.x * cw / W for p in res.face_landmarks[0]]
        ys = [p.y * ch / H for p in res.face_landmarks[0]]
        r4 = lambda v: round(float(v), 4)  # noqa: E731
        return {"cx": r4((min(xs) + max(xs)) / 2), "cy": r4((min(ys) + max(ys)) / 2),
                "w": r4(max(xs) - min(xs)), "h": r4(max(ys) - min(ys))}

    def extract(self, path: Path, sample_every: int = 1, max_frames: int = 600,
                start_s: float | None = None, end_s: float | None = None) -> tuple[list[dict], dict]:
        """start_s / end_s: optional annotation timestamps; frames outside are skipped."""
        import cv2

        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            raise VideoError("cannot open video")
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
        if not (1 <= fps <= 240):
            fps = 30.0
        frames: list[dict] = []
        last_face = None
        self._crop_cx = None
        idx = 0
        stats = {"decoded": 0, "hand_frames": 0, "face_frames": 0}
        r4 = lambda v: round(float(v), 4)  # noqa: E731  (same rounding as the browser)
        try:
            while len(frames) < max_frames:
                ok, bgr = cap.read()
                if not ok or bgr is None:
                    break
                idx += 1
                if (idx - 1) % sample_every:
                    continue
                t_s = (idx - 1) / fps
                if start_s is not None and t_s < start_s:
                    continue
                if end_s is not None and t_s > end_s:
                    break
                stats["decoded"] += 1
                orig = bgr
                h, w = bgr.shape[:2]
                scale = min(1.0, self.max_side / max(h, w))
                if scale < 1.0:
                    bgr = cv2.resize(bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
                h, w = bgr.shape[:2]
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                image = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=rgb)
                # monotonically increasing timestamps across videos (MediaPipe VIDEO mode requirement)
                t_ms = (idx - 1) * 1000.0 / fps
                self._ts += max(1, int(round(1000.0 / fps * sample_every)))
                res = self.hands.detect_for_video(image, self._ts)
                hands = []
                for i, lms in enumerate(res.hand_landmarks):
                    cat = res.handedness[i][0] if i < len(res.handedness) and res.handedness[i] else None
                    hands.append({
                        "handedness": "Right" if cat is not None and cat.category_name == "Right" else "Left",
                        "score": r4(cat.score if cat is not None else 0.0),
                        "landmarks": [[r4(p.x), r4(p.y), r4(p.z)] for p in lms],
                    })
                if self.face is not None and stats["decoded"] % 2 == 1:
                    fr = self.face.detect_for_video(image, self._ts)
                    if fr.face_landmarks:
                        xs = [p.x for p in fr.face_landmarks[0]]
                        ys = [p.y for p in fr.face_landmarks[0]]
                        last_face = {"cx": r4((min(xs) + max(xs)) / 2), "cy": r4((min(ys) + max(ys)) / 2),
                                     "w": r4(max(xs) - min(xs)), "h": r4(max(ys) - min(ys))}
                    else:
                        prev_cx = last_face["cx"] if last_face else self._crop_cx
                        last_face = self._face_in_crop(orig, prev_cx)
                        if last_face:
                            stats["face_crop_frames"] = stats.get("face_crop_frames", 0) + 1
                    if last_face:
                        self._crop_cx = last_face["cx"]
                stats["hand_frames"] += bool(hands)
                stats["face_frames"] += last_face is not None
                frames.append({"t": round(t_ms, 1), "w": w, "h": h, "hands": hands, "face": last_face})
        finally:
            cap.release()
        stats["fps"] = round(fps, 3)
        return frames, stats


def mirror_frame(frame: dict) -> dict:
    """Horizontally mirrored copy of a frame payload (x -> 1-x, handedness swapped).

    Used as training augmentation so the model copes with left-handed signers and
    with videos that were saved mirrored (front-camera recordings)."""
    swap = {"Left": "Right", "Right": "Left"}
    face = frame.get("face")
    return {
        **frame,
        "hands": [{**h, "handedness": swap.get(h.get("handedness"), h.get("handedness")),
                   "landmarks": [[round(1.0 - p[0], 4), p[1], p[2] if len(p) > 2 else 0.0] for p in h["landmarks"]]}
                  for h in frame.get("hands") or []],
        "face": None if not face else {**face, "cx": round(1.0 - face["cx"], 4)},
    }
