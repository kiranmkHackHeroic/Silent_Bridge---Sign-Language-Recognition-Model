import type { ReactNode } from "react";
import type { useVision } from "../services/useVision";
import { Chip, Spinner } from "./ui";

type Vision = ReturnType<typeof useVision>;

interface Props {
  vision: Vision;
  overlay: boolean;
  setOverlay: (v: boolean) => void;
  extraControls?: ReactNode;
  badge?: ReactNode;
}

export function CameraPanel({ vision, overlay, setOverlay, extraControls, badge }: Props) {
  const { videoRef, canvasRef, camera, modelState, error, devices, deviceId, stats, start, stop, switchCamera } = vision;
  return (
    <div className="camera-panel">
      <div className="video-wrap">
        <video ref={videoRef} playsInline muted className="mirror" />
        <canvas ref={canvasRef} className="mirror overlay-canvas" />
        {camera !== "on" && (
          <div className="overlay-msg">
            {camera === "starting" || modelState === "loading" ? (
              <>
                <Spinner /> {modelState === "loading" ? "Loading hand & face models…" : "Starting camera…"}
              </>
            ) : (
              <div>Camera is off. Press <strong>Start camera</strong>.<br />Video stays on this computer; only landmark coordinates are processed.</div>
            )}
          </div>
        )}
        {badge && <div className="video-badge">{badge}</div>}
      </div>
      {error && <div className="notice notice-bad" role="alert">{error}</div>}
      <div className="toolbar">
        {camera === "on" ? (
          <button className="btn" onClick={stop}>Stop camera</button>
        ) : (
          <button className="btn btn-primary" onClick={() => start()} disabled={camera === "starting"}>
            Start camera
          </button>
        )}
        {devices.length > 1 && (
          <select value={deviceId} onChange={(e) => switchCamera(e.target.value)} aria-label="Camera">
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
            ))}
          </select>
        )}
        <label className="toggle">
          <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> Landmark overlay
        </label>
        {extraControls}
      </div>
      <div className="stat-row">
        <Chip tone={camera === "on" ? "ok" : camera === "error" ? "bad" : "muted"}>Camera: {camera}</Chip>
        <Chip tone={modelState === "ready" ? "ok" : modelState === "error" ? "bad" : "muted"}>
          Landmarks: {modelState}{stats.delegate ? ` (${stats.delegate})` : ""}
        </Chip>
        <Chip tone="info">{stats.fps} FPS</Chip>
        <Chip tone="info" title="MediaPipe hand (+face) landmark inference time per frame">{stats.inferenceMs} ms / frame</Chip>
      </div>
    </div>
  );
}
