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

export function useVision({ face, overlay, onResult }: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelsRef = useRef<VisionModels | null>(null);
  const rafRef = useRef<number | null>(null);
  const optsRef = useRef({ face, overlay, onResult });
  optsRef.current = { face, overlay, onResult };

  const [camera, setCamera] = useState<CameraState>("off");
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [stats, setStats] = useState({ fps: 0, inferenceMs: 0, delegate: "" as string, faceError: null as string | null });

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
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setCamera("off");
  }, []);

  const loop = useCallback(() => {
    let lastVideoTime = -1;
    let frameCount = 0;
    let fpsWindowStart = performance.now();
    let infAvg = 0;
    let faceToggle = 0;
    let lastFace: { box: FaceBox | null; blend: Record<string, number> | null; detected: boolean } = {
      box: null, blend: null, detected: false,
    };

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      const models = modelsRef.current;
      if (!video || !models || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const now = performance.now();
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      const start = performance.now();

      let handsOut: HandPayload[] = [];
      try {
        const res = models.hands.detectForVideo(video, now);
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
            const fr = models.face.detectForVideo(video, now);
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
        frame: { t: Math.round(now * 10) / 10, w, h, hands: handsOut, face: lastFace.box },
        blendshapes: lastFace.blend,
        faceDetected: lastFace.detected,
      });
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async (requestedDevice?: string) => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("error");
      setError("This browser does not support camera access (getUserMedia). Use a recent Chrome or Edge on http://localhost.");
      return;
    }
    stop();
    setCamera("starting");
    if (!modelsRef.current) {
      setModelState("loading");
      try {
        modelsRef.current = await loadVisionModels();
        setModelState("ready");
        setStats((s) => ({ ...s, delegate: modelsRef.current!.delegate, faceError: modelsRef.current!.faceError }));
      } catch (err) {
        setModelState("error");
        setCamera("error");
        setError(`Could not load the MediaPipe hand model: ${String((err as Error)?.message || err)}. Check that frontend/public/models/hand_landmarker.task exists.`);
        return;
      }
    }
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
      const settingsId = track.getSettings().deviceId;
      if (settingsId) setDeviceId(settingsId);
      refreshDevices();
      loop();
    } catch (err) {
      stop();
      setCamera("error");
      setError(cameraErrorMessage(err));
    }
  }, [deviceId, loop, refreshDevices, stop]);

  const switchCamera = useCallback((id: string) => {
    setDeviceId(id);
    if (streamRef.current) start(id);
  }, [start]);

  useEffect(() => {
    refreshDevices();
    return () => stop();
  }, [refreshDevices, stop]);

  return { videoRef, canvasRef, camera, modelState, error, devices, deviceId, stats, start, stop, switchCamera };
}
