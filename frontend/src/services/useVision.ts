import { useCallback, useEffect, useRef, useState } from "react";
import { HAND_CONNECTIONS, loadVisionModels, type VisionModels } from "./vision";
import type { FaceBox, HandPayload, LandmarkFrame } from "./types";

export type CameraState = "off" | "starting" | "on" | "error";
export type ModelState = "idle" | "loading" | "ready" | "error";

export interface VisionResult {
  frame: LandmarkFrame;
  blendshapes: Record<string, number> | null;
  faceDetected: boolean;
}

interface Options {
  /** Run the face landmarker (expression + face box). */
  face: boolean;
  overlay: boolean;
  onResult: (r: VisionResult) => void;
}

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was denied. Allow camera access in the browser's address bar and try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found. Connect a webcam and press Start camera.";
    case "NotReadableError":
      return "The camera is in use by another application (Zoom, Teams, another tab?). Close it and retry.";
    default:
      return `Could not start the camera: ${String((err as Error)?.message || err)}`;
  }
}

const r4 = (v: number) => Math.round(v * 10000) / 10000;
/** Python extracts training landmarks at max side 640 px (EXTRACTOR_VERSION ...-640-...). */
const TRAINING_MAX_SIDE = 640;

export function useVision({ face, overlay, onResult }: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelsRef = useRef<VisionModels | null>(null);
  const rafRef = useRef<number | null>(null);
  const tsRef = useRef(0);          // MediaPipe needs strictly increasing timestamps across runs
  const fileRunRef = useRef(0);     // incremented to abort a running video-file run
  const optsRef = useRef({ face, overlay, onResult });
  optsRef.current = { face, overlay, onResult };

  const [camera, setCamera] = useState<CameraState>("off");
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [stats, setStats] = useState({ fps: 0, inferenceMs: 0, delegate: "" as string, faceError: null as string | null });
  const [source, setSource] = useState<"camera" | "file">("camera");
  const [trackInfo, setTrackInfo] = useState<{ width?: number; height?: number; frameRate?: number; label?: string } | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
    } catch {
      setDevices([]);
    }
  }, []);

  const stopLoop = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const stop = useCallback(() => {
    stopLoop();
    fileRunRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.onended = null;
      videoRef.current.srcObject = null;
      if (videoRef.current.getAttribute("src")) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setCamera("off");
  }, []);

  /** Per-frame processor: detection -> overlay -> onResult. `frameT` (ms) overrides the frame time
   *  (video-file mode uses the video's own clock so segmentation sees real signing speed). */
  const makeProcessor = useCallback(() => {
    let frameCount = 0;
    let fpsWindowStart = performance.now();
    let infAvg = 0;
    let faceToggle = 0;
    let lastFace: { box: FaceBox | null; blend: Record<string, number> | null; detected: boolean } = {
      box: null, blend: null, detected: false,
    };

    // `input`: optional pre-scaled copy of the frame (video-file mode downscales to the training extraction size)
    return (frameT?: number, input?: HTMLCanvasElement) => {
      const video = videoRef.current;
      const models = modelsRef.current;
      if (!video || !models || video.readyState < 2) return;
      const now = Math.max(performance.now(), tsRef.current + 1);
      tsRef.current = now;
      const w = input?.width || video.videoWidth || 640;
      const h = input?.height || video.videoHeight || 480;
      const src = input ?? video;
      const start = performance.now();

      let handsOut: HandPayload[] = [];
      try {
        const res = models.hands.detectForVideo(src, now);
        // 0.10.x exposes `handedness`; older builds used `handednesses`
        const handedness = (res as unknown as { handedness?: { categoryName: string; score: number }[][]; handednesses?: { categoryName: string; score: number }[][] });
        const cats = handedness.handedness ?? handedness.handednesses ?? [];
        handsOut = res.landmarks.map((lms, i) => ({
          handedness: (cats[i]?.[0]?.categoryName === "Right" ? "Right" : "Left") as "Left" | "Right",
          score: r4(cats[i]?.[0]?.score ?? 0),
          landmarks: lms.map((p) => [r4(p.x), r4(p.y), r4(p.z)]),
        }));
      } catch (err) {
        console.warn("hand detection failed", err);
      }

      const { face: wantFace, overlay: drawOverlay, onResult: cb } = optsRef.current;
      if (wantFace && models.face) {
        faceToggle = (faceToggle + 1) % 3; // face every 3rd frame keeps hands fast
        if (faceToggle === 0) {
          try {
            const fr = models.face.detectForVideo(src, now);
            const lm = fr.faceLandmarks?.[0];
            if (lm && lm.length) {
              let minX = 1, minY = 1, maxX = 0, maxY = 0;
              for (const p of lm) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
              }
              const blend: Record<string, number> = {};
              for (const c of fr.faceBlendshapes?.[0]?.categories ?? []) blend[c.categoryName] = c.score;
              lastFace = {
                box: { cx: r4((minX + maxX) / 2), cy: r4((minY + maxY) / 2), w: r4(maxX - minX), h: r4(maxY - minY) },
                blend: Object.keys(blend).length ? blend : null,
                detected: true,
              };
            } else {
              lastFace = { box: null, blend: null, detected: false };
            }
          } catch (err) {
            console.warn("face detection failed", err);
          }
        }
      } else {
        lastFace = { box: null, blend: null, detected: false };
      }

      const inf = performance.now() - start;
      infAvg = infAvg === 0 ? inf : infAvg * 0.9 + inf * 0.1;
      frameCount++;
      if (now - fpsWindowStart >= 1000) {
        setStats((s) => ({ ...s, fps: Math.round((frameCount * 1000) / (now - fpsWindowStart)), inferenceMs: Math.round(infAvg * 10) / 10 }));
        frameCount = 0;
        fpsWindowStart = now;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          if (drawOverlay) {
            for (const hand of handsOut) {
              ctx.strokeStyle = hand.handedness === "Left" ? "#2dd4bf" : "#f59e0b";
              ctx.lineWidth = 3;
              for (const [a, b] of HAND_CONNECTIONS) {
                ctx.beginPath();
                ctx.moveTo(hand.landmarks[a][0] * w, hand.landmarks[a][1] * h);
                ctx.lineTo(hand.landmarks[b][0] * w, hand.landmarks[b][1] * h);
                ctx.stroke();
              }
              ctx.fillStyle = "#ffffff";
              for (const p of hand.landmarks) {
                ctx.beginPath();
                ctx.arc(p[0] * w, p[1] * h, 3, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            if (lastFace.box) {
              const b = lastFace.box;
              ctx.strokeStyle = "rgba(167,139,250,0.9)";
              ctx.lineWidth = 2;
              ctx.strokeRect((b.cx - b.w / 2) * w, (b.cy - b.h / 2) * h, b.w * w, b.h * h);
            }
          }
        }
      }

      cb({
        // media_t: position in the video (seconds) - used to align browser and Python extractions of a file
        frame: { t: Math.round((frameT ?? now) * 10) / 10, w, h, hands: handsOut, face: lastFace.box, media_t: Math.round(video.currentTime * 1000) / 1000 },
        blendshapes: lastFace.blend,
        faceDetected: lastFace.detected,
      });
    };
  }, []);

  const loop = useCallback(() => {
    const process = makeProcessor();
    let lastVideoTime = -1;
    let scaled: HTMLCanvasElement | null = null;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      // cameras often ignore the 640x480 request; downscale larger frames to the training extraction size
      const side = Math.max(video.videoWidth, video.videoHeight);
      if (side > TRAINING_MAX_SIDE) {
        const k = TRAINING_MAX_SIDE / side;
        const w = Math.round(video.videoWidth * k);
        const h = Math.round(video.videoHeight * k);
        if (!scaled || scaled.width !== w || scaled.height !== h) {
          scaled = document.createElement("canvas");
          scaled.width = w;
          scaled.height = h;
        }
        scaled.getContext("2d")!.drawImage(video, 0, 0, w, h);
        process(undefined, scaled);
      } else {
        process();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [makeProcessor]);

  const ensureModels = useCallback(async (): Promise<boolean> => {
    if (modelsRef.current) return true;
    setModelState("loading");
    try {
      modelsRef.current = await loadVisionModels();
      setModelState("ready");
      setStats((s) => ({ ...s, delegate: modelsRef.current!.delegate, faceError: modelsRef.current!.faceError }));
      return true;
    } catch (err) {
      setModelState("error");
      setCamera("error");
      setError(`Could not load the MediaPipe hand model: ${String((err as Error)?.message || err)}. Check that frontend/public/models/hand_landmarker.task exists.`);
      return false;
    }
  }, []);

  /** Run the SAME per-frame pipeline on a video file. Frames are stepped deterministically at `fps`
   *  (seek to the middle of each frame), so the result does not depend on rendering or CPU speed, and
   *  frame times follow the video clock (like a webcam at that frame rate). */
  const startFile = useCallback(async (url: string, onEnded?: () => void, fps = 30) => {
    setError(null);
    stop();
    setCamera("starting");
    if (!(await ensureModels())) return;
    const run = ++fileRunRef.current;
    const video = videoRef.current!;
    video.srcObject = null;
    video.muted = true;
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("the browser cannot decode this video format"));
        video.src = url;
        video.load();
      });
      video.pause();
      setSource("file");
      setTrackInfo({ width: video.videoWidth, height: video.videoHeight, frameRate: fps, label: "video file (stepped frame by frame)" });
      setCamera("on");
      const process = makeProcessor();
      // same size as the Python training extraction (max side 640 px): face detection under hand occlusion
      // is resolution-sensitive (tools/parity_resolution.py), so a full-resolution file would not be comparable
      const scale = Math.min(1, TRAINING_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
      const scaled = document.createElement("canvas");
      scaled.width = Math.round(video.videoWidth * scale);
      scaled.height = Math.round(video.videoHeight * scale);
      const sctx = scaled.getContext("2d")!;
      const base = Math.max(performance.now(), tsRef.current + 1);
      const seek = (t: number) => new Promise<void>((resolve) => {
        if (Math.abs(video.currentTime - t) < 1e-4) return resolve();
        video.onseeked = () => resolve();
        video.currentTime = t;
      });
      const n = Math.floor(video.duration * fps);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / fps;
        await seek(t);
        if (fileRunRef.current !== run) return;          // stopped meanwhile
        sctx.drawImage(video, 0, 0, scaled.width, scaled.height);
        process(base + (i / fps) * 1000, scaled);
      }
      if (fileRunRef.current !== run) return;
      setCamera("off");
      onEnded?.();
    } catch (err) {
      stop();
      setCamera("error");
      setError(`Could not process the video file: ${String((err as Error)?.message || err)}`);
    }
  }, [ensureModels, makeProcessor, stop]);

  const start = useCallback(async (requestedDevice?: string) => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("error");
      setError("This browser does not support camera access (getUserMedia). Use a recent Chrome or Edge on http://localhost.");
      return;
    }
    stop();
    setCamera("starting");
    if (!(await ensureModels())) return;
    const id = requestedDevice ?? deviceId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(id ? { deviceId: { exact: id } } : { facingMode: "user" }),
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      track.addEventListener("ended", () => {
        stop();
        setCamera("error");
        setError("The camera was disconnected. Reconnect it and press Start camera.");
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setCamera("on");
      setSource("camera");
      const ts = track.getSettings();
      setTrackInfo({ width: ts.width, height: ts.height, frameRate: ts.frameRate, label: track.label });
      const settingsId = ts.deviceId;
      if (settingsId) setDeviceId(settingsId);
      refreshDevices();
      loop();
    } catch (err) {
      stop();
      setCamera("error");
      setError(cameraErrorMessage(err));
    }
  }, [deviceId, ensureModels, loop, refreshDevices, stop]);

  const switchCamera = useCallback((id: string) => {
    setDeviceId(id);
    if (streamRef.current) start(id);
  }, [start]);

  useEffect(() => {
    refreshDevices();
    return () => stop();
  }, [refreshDevices, stop]);

  return { videoRef, canvasRef, camera, modelState, error, devices, deviceId, stats, start, startFile, stop, switchCamera, source, trackInfo };
}
