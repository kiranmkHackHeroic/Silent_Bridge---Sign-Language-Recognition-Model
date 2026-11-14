import type { ReactNode } from "react";
import type { useVision } from "../services/useVision";
import { Icon } from "./Icon";
import { Btn, Notice, Spinner, StatusDot } from "./ui";

type Vision = ReturnType<typeof useVision>;

interface Props {
  vision: Vision;
  overlay: boolean;
  setOverlay: (v: boolean) => void;
  /** Extra buttons placed after Start/Stop camera */
  controls?: ReactNode;
  /** Extra switches placed after the overlay switch */
  switches?: ReactNode;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
}

export function CameraPanel({ vision, overlay, setOverlay, controls, switches, topLeft, topRight, bottomLeft, bottomRight }: Props) {
  const { videoRef, canvasRef, camera, modelState, error, devices, deviceId, stats, start, stop, switchCamera } = vision;
  const camTone = camera === "on" ? "ok" : camera === "error" ? "bad" : camera === "starting" ? "warn" : "muted";
  const lmTone = modelState === "ready" ? "ok" : modelState === "error" ? "bad" : modelState === "loading" ? "warn" : "muted";
  return (
    <div className="stack">
      <div className="video-wrap">
        <video ref={videoRef} playsInline muted className="mirror" aria-label="Live camera preview (mirrored)" />
        <canvas ref={canvasRef} className="mirror" aria-hidden />
        {camera !== "on" && (
          <div className="video-placeholder">
            {camera === "starting" || modelState === "loading" ? (
              <Spinner label={modelState === "loading" ? "Loading hand & face landmark models…" : "Starting camera…"} />
            ) : (
              <>
                <Icon name="cameraOff" size={36} />
                <div>
                  <strong>Camera is off</strong>
                  <div className="small">Video stays on this computer. Only landmark coordinates are processed.</div>
                </div>
              </>
            )}
          </div>
        )}
        {camera === "on" && (topLeft || topRight) && (
          <div className="video-overlay">
            <span>{topLeft}</span>
            <span>{topRight}</span>
          </div>
        )}
        {camera === "on" && (bottomLeft || bottomRight) && (
          <div className="video-hud-bottom">
            <span>{bottomLeft}</span>
            <span>{bottomRight}</span>
          </div>
        )}
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
      <div className="camera-controls-bar">
        <div className="toolbar" style={{ width: "100%" }}>
          {camera === "on" ? (
            <Btn icon="cameraOff" size="sm" variant="danger" onClick={stop}>Stop camera</Btn>
          ) : (
            <Btn icon="camera" size="sm" variant="primary" onClick={() => start()} disabled={camera === "starting"}>
              {camera === "starting" ? "Starting…" : "Start camera"}
            </Btn>
          )}
          {controls}
          <span className="grow" />
          <label className="switch">
            <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> Landmark overlay
          </label>
          {switches}
          {devices.length > 1 && (
            <select value={deviceId} onChange={(e) => switchCamera(e.target.value)} aria-label="Select camera">
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
              ))}
            </select>
          )}
        </div>
        <div className="meta-line">
          <span className="meta-item"><StatusDot tone={camTone} /> Camera: <strong>{camera}</strong></span>
          <span className="meta-sep" aria-hidden="true">·</span>
          <span className="meta-item"><StatusDot tone={lmTone} /> Landmarks: <strong>{modelState}</strong>{stats.delegate ? ` (${stats.delegate})` : ""}</span>
          {camera === "on" && (
            <>
              <span className="meta-sep" aria-hidden="true">·</span>
              <span className="meta-item tabular">{Number.isFinite(stats.fps) ? stats.fps : "—"} FPS</span>
              <span className="meta-sep" aria-hidden="true">·</span>
              <span className="meta-item tabular" title="MediaPipe landmark inference per frame">{stats.inferenceMs} ms/frame</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
