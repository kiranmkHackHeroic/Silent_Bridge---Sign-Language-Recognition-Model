import { useCallback, useEffect, useRef, useState } from "react";
import { api, type CompareResult } from "../services/api";
import { RecognitionSocket, type ServerMessage, type SocketStatus } from "../services/recognitionSocket";
import type { LandmarkFrame } from "../services/types";
import { useVision, type VisionResult } from "../services/useVision";
import { CameraPanel } from "./CameraPanel";
import { LandmarkReplay } from "./LandmarkReplay";
import { Btn, Card, Chip, Notice, StatusDot } from "./ui";

type Sample = Awaited<ReturnType<typeof api.diagnosticsSamples>>["samples"][number];

/**
 * Runs a dataset video or extracted landmark sequence through the SAME browser pipeline as the webcam (MediaPipe in the browser ->
 * WebSocket -> segmentation -> classifier), then asks the backend to compare the browser landmarks with
 * the Python (training-time) extraction of the same file. This checks that live features match the
 * training features; it is not an accuracy measurement (the model may have been trained on the video).
 */
export function VideoPipelineTest() {
  const [source, setSource] = useState("amrita_slr");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sel, setSel] = useState<string>("");
  const [overlay, setOverlay] = useState(true);
  const [status, setStatus] = useState<SocketStatus>("closed");
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<ServerMessage[]>([]);
  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState<{ frames: LandmarkFrame[] } | null>(null);
  const framesRef = useRef<LandmarkFrame[]>([]);
  const sockRef = useRef<RecognitionSocket | null>(null);

  useEffect(() => {
    setSamples([]);
    let cancelled = false;
    const load = (attempt: number) => api.diagnosticsSamples(source, 60).then((r) => {
      if (cancelled) return;
      setError(null);
      setSamples(r.samples);
      setSel(r.samples[0]?.sample_id ?? "");
    }).catch((e) => {
      if (cancelled) return;
      if (attempt < 5) window.setTimeout(() => load(attempt + 1), 2000);   // backend may still be starting
      else setError(String(e.message || e));
    });
    load(0);
    return () => { cancelled = true; };
  }, [source]);

  const onMsg = useCallback((m: ServerMessage) => {
    if (m.type === "sign" || m.type === "uncertain" || m.type === "segment") setEvents((es) => [...es, m]);
  }, []);
  useEffect(() => {
    const s = new RecognitionSocket(onMsg, setStatus);
    sockRef.current = s;
    s.connect();
    return () => s.close();
  }, [onMsg]);

  const onResult = useCallback((r: VisionResult) => {
    framesRef.current.push(r.frame);
    sockRef.current?.send({ type: "frame", ...r.frame });
  }, []);
  const vision = useVision({ face: true, overlay, onResult });
  const sample = samples.find((s) => s.sample_id === sel);

  useEffect(() => {
    if (!sample) {
      setSampleData(null);
      return;
    }
    api.sample(sample.label, sample.sample_id)
      .then((d) => setSampleData(d))
      .catch(() => setSampleData(null));
  }, [sample?.label, sample?.sample_id]);

  const finish = useCallback(async (smp: Sample) => {
    // lower the hands for ~1.3 s (empty frames) so the last segment is closed, like a signer would
    const last = framesRef.current[framesRef.current.length - 1];
    let t = (last?.t ?? performance.now()) + 33;
    for (let i = 0; i < 40; i++, t += 33) sockRef.current?.send({ type: "frame", t, w: last?.w ?? 640, h: last?.h ?? 480, hands: [], face: null });
    try {
      setCompare(await api.diagnosticsCompare({ source: smp.source, sample_id: smp.sample_id, frames: framesRef.current }));
    } catch (e) {
      setError(String((e as Error).message || e));
    }
    window.setTimeout(() => setRunning(false), 800);
  }, []);

  const streamLandmarks = async (frames: LandmarkFrame[], smp: Sample) => {
    const fps = smp.fps || 30;
    const intervalMs = Math.max(16, Math.round(1000 / fps));
    const startT = performance.now();
    for (let i = 0; i < frames.length; i++) {
      if (!sockRef.current) break;
      const fr = { ...frames[i], t: startT + (i * 1000) / fps };
      framesRef.current.push(fr);
      sockRef.current.send({ type: "frame", ...fr });
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    await finish(smp);
  };

  const run = async () => {
    if (!sample) return;
    setError(null);
    setCompare(null);
    setEvents([]);
    framesRef.current = [];
    sockRef.current?.send({ type: "reset", clear: true });
    sockRef.current?.send({ type: "config", settings: { mode: "segment" } });
    setRunning(true);

    if (sample.has_video) {
      await vision.startFile(`/api/diagnostics/video/${encodeURIComponent(sample.source)}/${encodeURIComponent(sample.sample_id)}`, () => finish(sample), sample.fps || 30);
    } else {
      const frames = sampleData?.frames ?? [];
      if (!frames.length) {
        try {
          const d = await api.sample(sample.label, sample.sample_id);
          setSampleData(d);
          await streamLandmarks(d.frames, sample);
        } catch (e) {
          setError("Could not load sample landmarks: " + String((e as Error).message || e));
          setRunning(false);
        }
      } else {
        await streamLandmarks(frames, sample);
      }
    }
  };

  const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 1000) / 10}%`);
  const words = events.filter((e) => e.type === "sign").map((e) => e.token?.label as string);

  return (
    <Card title="Video-file pipeline test" icon="flask" subtitle="Same browser pipeline as the webcam, fed from a dataset video or landmark sequence">
      <p className="small muted">
        Streams dataset video or extracted landmarks into the live recognition pipeline exactly like the webcam,
        then verifies the classification output and feature equivalence. If the video was in the training data, the recognised word is <strong>not</strong> evidence of accuracy.
      </p>
      <div className="form-grid cols-2">
        <label className="field"><span>Dataset</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} disabled={running}>
            <option value="amrita_slr">Amrita SLR</option>
            <option value="include">INCLUDE</option>
          </select>
        </label>
        <label className="field"><span>Video / Sample</span>
          <select value={sel} onChange={(e) => setSel(e.target.value)} disabled={running || !samples.length}>
            {samples.map((s) => (
              <option key={s.sample_id} value={s.sample_id}>
                {s.label} · {s.group ?? "?"} · {s.file}{s.used_to_train_active_model === false ? " (held-out)" : s.used_to_train_active_model ? " (training)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="toolbar">
        <Btn icon="play" variant="primary" onClick={run} disabled={!sample || running || status !== "open"}>
          {running ? "Streaming into live pipeline…" : "Run through live pipeline"}
        </Btn>
        <span className="status-item xs"><StatusDot tone={status === "open" ? "ok" : "bad"} /> backend {status}</span>
        {sample && <Chip tone={sample.used_to_train_active_model === false ? "ok" : "warn"}>{sample.used_to_train_active_model === false ? "held-out clip" : "training clip"}</Chip>}
        {sample && <Chip tone={sample.has_video ? "ok" : "info"}>{sample.has_video ? "MP4 video" : "landmark sequence"}</Chip>}
      </div>

      <div style={{ display: "flex", justifyContent: "center", minHeight: 280, background: "#0b1220", borderRadius: 8, padding: 12 }}>
        {sample?.has_video || vision.camera === "on" ? (
          <CameraPanel vision={vision} overlay={overlay} setOverlay={setOverlay} />
        ) : sampleData?.frames?.length ? (
          <div className="stack" style={{ alignItems: "center" }}>
            <LandmarkReplay frames={sampleData.frames} label={`${sample?.label} (${sample?.sample_id.slice(0, 14)})`} />
            <span className="muted xs">Landmark sequence replay ({sampleData.frames.length} frames @ {sample?.fps || 30} fps)</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            <span>{sample ? "Loading landmark sequence…" : "Choose a sample above"}</span>
          </div>
        )}
      </div>

      {error && <Notice tone="bad">{error}</Notice>}
      {(running || events.length > 0) && (
        <div className="small">
          True label <strong>{sample?.label}</strong> · live pipeline output: {words.length ? <strong>{words.join(", ")}</strong> : <span className="muted">no word added yet</span>}
          {events.filter((e) => e.type !== "sign").map((e, i) => <Chip key={i} tone="warn">{e.result ?? e.type}{e.top?.[0] ? `: ${e.top[0].label} ${Math.round(e.top[0].confidence * 100)}%` : ""}</Chip>)}
        </div>
      )}
      {compare && (
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><td>Frames matched by video time</td><td>{compare.matched_frames}</td></tr>
              <tr><td>Hand presence agreement</td><td>{pct(compare.hand_presence_agreement)}</td></tr>
              <tr><td>Handedness label agreement</td><td>{pct(compare.handedness_agreement)}</td></tr>
              <tr><td>Landmark distance (mean / median, image units)</td><td>{compare.mean_landmark_distance ?? "—"} / {compare.median_landmark_distance ?? "—"}</td></tr>
              <tr><td>Mean |feature difference| per value</td><td>{compare.mean_abs_feature_difference ?? "—"}</td></tr>
              <tr><td>Face detected in the same frames</td><td>{pct(compare.face_presence_agreement)}</td></tr>
              {compare.feature_difference_by_block && (
                <tr><td>Feature difference by block</td><td className="xs">{Object.entries(compare.feature_difference_by_block).map(([k, v]) => `${k} ${v}`).join(" · ")}</td></tr>
              )}
              <tr><td>Model on browser landmarks (whole clip)</td><td>{compare.prediction_from_browser_landmarks ? `${compare.prediction_from_browser_landmarks.label} ${Math.round(compare.prediction_from_browser_landmarks.confidence * 100)}%` : "—"}</td></tr>
              {compare.prediction_from_browser_landmarks?.top3 && (
                <tr><td>Top 3 browser / Python</td><td className="xs">
                  {compare.prediction_from_browser_landmarks.top3.map((c) => `${c.label} ${Math.round(c.p * 100)}%`).join(", ")}
                  {" / "}{compare.prediction_from_python_landmarks?.top3?.map((c) => `${c.label} ${Math.round(c.p * 100)}%`).join(", ")}
                </td></tr>
              )}
              {compare.probability_difference != null && (
                <tr><td>Probability difference (total variation, 0 = identical)</td><td>{compare.probability_difference}</td></tr>
              )}
              <tr><td>Model on Python landmarks (whole clip)</td><td>{compare.prediction_from_python_landmarks ? `${compare.prediction_from_python_landmarks.label} ${Math.round(compare.prediction_from_python_landmarks.confidence * 100)}%` : "—"}</td></tr>
            </tbody>
          </table>
          <p className="muted xs">{compare.note}</p>
        </div>
      )}
    </Card>
  );
}
