import { useCallback, useEffect, useRef, useState } from "react";
import { CameraPanel } from "../components/CameraPanel";
import { Card, Chip, Notice, Spinner } from "../components/ui";
import { api } from "../services/api";
import type { DatasetSummary, LandmarkFrame, Metrics, ModelStatus, VocabEntry } from "../services/types";
import { useVision, type VisionResult } from "../services/useVision";

type Phase = "idle" | "ready" | "recording" | "saving";

const newSessionId = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `s${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DatasetModel() {
  const [overlay, setOverlay] = useState(true);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [label, setLabel] = useState("namaskara");
  const [signer, setSigner] = useState("signer1");
  const [sessionId, setSessionId] = useState(newSessionId);
  const [duration, setDuration] = useState(2.0);
  const [count, setCount] = useState(10);
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [recMsg, setRecMsg] = useState<{ tone: "ok" | "bad" | "info"; text: string } | null>(null);
  const [handsNow, setHandsNow] = useState(0);
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [captureMsg, setCaptureMsg] = useState<string>("");
  const [newVocab, setNewVocab] = useState({ label: "", english: "", kannada: "" });
  const [vocabMsg, setVocabMsg] = useState("");

  const recordingRef = useRef(false);
  const framesRef = useRef<LandmarkFrame[]>([]);
  const abortRef = useRef(false);
  const handsRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [v, s, d, m] = await Promise.all([api.vocabulary(), api.modelStatus(), api.datasetSummary(), api.metrics()]);
      setVocab(v.labels);
      setStatus(s);
      setSummary(d);
      setMetrics(m);
      setBackendError(null);
    } catch (err) {
      setBackendError(String((err as Error).message || err));
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = window.setInterval(() => setHandsNow(handsRef.current), 200);
    return () => {
      window.clearInterval(t);
      abortRef.current = true;
    };
  }, [refresh]);

  const onResult = useCallback((r: VisionResult) => {
    handsRef.current = r.frame.hands.length;
    if (recordingRef.current) framesRef.current.push(r.frame);
  }, []);
  const vision = useVision({ face: true, overlay, onResult });

  const recordBatch = async () => {
    if (vision.camera !== "on") {
      setRecMsg({ tone: "bad", text: "Start the camera first." });
      return;
    }
    abortRef.current = false;
    setRecMsg(null);
    setProgress({ done: 0, total: count });
    let saved = 0;
    for (let i = 0; i < count && !abortRef.current; i++) {
      setPhase("ready");
      for (let c = 3; c > 0 && !abortRef.current; c--) {
        setCountdown(c);
        await sleep(i === 0 ? 700 : 450);
      }
      if (abortRef.current) break;
      framesRef.current = [];
      recordingRef.current = true;
      setPhase("recording");
      await sleep(duration * 1000);
      recordingRef.current = false;
      setPhase("saving");
      const frames = framesRef.current;
      const video = { w: frames[0]?.w ?? 640, h: frames[0]?.h ?? 480 };
      try {
        await api.record({ label, session_id: sessionId, signer_id: signer, video, frames });
        saved++;
        setProgress({ done: saved, total: count });
      } catch (err) {
        setRecMsg({ tone: "bad", text: `Sample ${i + 1} not saved: ${String((err as Error).message || err)}` });
      }
    }
    setPhase("idle");
    setCountdown(0);
    setRecMsg((m) => (m && m.tone === "bad" ? m : { tone: "ok", text: `Saved ${saved} sample(s) of “${label}” in session ${sessionId}.` }));
    refresh();
  };

  const trainModel = async () => {
    setTraining(true);
    setTrainMsg(null);
    try {
      const res = await api.train();
      setTrainMsg({ tone: "ok", text: `Model trained (${res.metrics.model_type}). Out-of-fold accuracy ${(res.metrics.accuracy! * 100).toFixed(1)}%, macro-F1 ${res.metrics.macro_f1!.toFixed(3)} on ${res.metrics.num_samples} samples. See About & Testing for the full report.` });
    } catch (err) {
      setTrainMsg({ tone: "bad", text: String((err as Error).message || err) });
    } finally {
      setTraining(false);
      refresh();
    }
  };

  const deleteLast = async (lbl: string) => {
    const samples = summary?.labels[lbl]?.samples ?? [];
    const last = samples[samples.length - 1];
    if (!last) return;
    if (!window.confirm(`Delete the most recent sample of “${lbl}” (${last.sample_id})? This cannot be undone.`)) return;
    try {
      await api.deleteSample(lbl, last.sample_id);
    } catch (err) {
      setRecMsg({ tone: "bad", text: String((err as Error).message || err) });
    }
    refresh();
  };

  const capture = async (lbl: string) => {
    setCaptureMsg("");
    try {
      const res = await api.captureAnimation(lbl);
      setCaptureMsg(`Avatar clip for “${lbl}” captured from your latest recording (${res.keyframes} keyframes). Marked unverified.`);
      refresh();
    } catch (err) {
      setCaptureMsg(`Could not capture “${lbl}”: ${String((err as Error).message || err)}`);
    }
  };

  const addVocab = async () => {
    setVocabMsg("");
    try {
      await api.upsertVocabulary(newVocab.label.trim(), newVocab.english.trim(), newVocab.kannada.trim());
      setVocabMsg(`Added “${newVocab.label}”. Record samples for it, then retrain.`);
      setNewVocab({ label: "", english: "", kannada: "" });
      refresh();
    } catch (err) {
      setVocabMsg(String((err as Error).message || err));
    }
  };

  const busy = phase !== "idle";
  const counts = summary?.labels ?? {};

  return (
    <div className="page-grid dataset-grid">
      {backendError && <Notice tone="bad">{backendError}</Notice>}

      <Card title="Model status" className="span-full" actions={<button className="btn btn-small" onClick={refresh}>Refresh</button>}>
        {status ? (
          <div className="kv-grid">
            <div><span>Sign model</span>{status.loaded ? <Chip tone="ok">loaded</Chip> : <Chip tone="warn">not trained</Chip>}</div>
            <div><span>Classes</span><strong>{status.num_classes}</strong></div>
            <div><span>Classifier</span><strong>{status.model_type ?? "—"}</strong></div>
            <div><span>Trained at</span><strong>{status.trained_at ? new Date(status.trained_at).toLocaleString() : "—"}</strong></div>
            <div><span>Training samples</span><strong>{status.num_samples ?? "—"}</strong></div>
            <div><span>Dataset</span><strong>{summary ? `${summary.total_samples} samples · ${summary.num_sessions} session(s)` : "—"}</strong></div>
          </div>
        ) : <Spinner />}
        {status?.error && !status.loaded && <p className="muted small-text">{status.error}</p>}
        <div className="toolbar">
          <button className="btn btn-primary" onClick={trainModel} disabled={training || busy}>
            {training ? <><Spinner /> Training…</> : "Train model on recorded data"}
          </button>
          <span className="muted small-text">Needs ≥ 2 classes with ≥ 3 samples each. Takes seconds on a laptop CPU.</span>
        </div>
        {trainMsg && <Notice tone={trainMsg.tone}>{trainMsg.text}</Notice>}
        {metrics?.available && metrics.warnings && metrics.warnings.length > 0 && (
          <Notice tone="warn">{metrics.warnings.join(" · ")}</Notice>
        )}
      </Card>

      <Card title="Record training samples" className="span-camera">
        <CameraPanel
          vision={vision}
          overlay={overlay}
          setOverlay={setOverlay}
          badge={
            phase === "ready" ? <span className="rec-badge ready">Get ready… {countdown}</span>
            : phase === "recording" ? <span className="rec-badge rec">● REC {progress.done + 1}/{progress.total}</span>
            : phase === "saving" ? <span className="rec-badge">saving…</span>
            : vision.camera === "on" ? <span className="rec-badge">{handsNow} hand(s) visible</span> : null
          }
        />
      </Card>

      <Card title="Recording settings" className="span-side">
        <div className="form-grid">
          <label>Sign label
            <select value={label} onChange={(e) => setLabel(e.target.value)} disabled={busy}>
              {vocab.map((v) => (
                <option key={v.label} value={v.label}>{v.label === "_none" ? "_none — background / no sign" : `${v.kannada} — ${v.english} (${v.label})`}</option>
              ))}
            </select>
          </label>
          <label>Signer ID<input value={signer} onChange={(e) => setSigner(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} disabled={busy} /></label>
          <label>Session ID
            <div className="row">
              <input value={sessionId} onChange={(e) => setSessionId(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} disabled={busy} />
              <button className="btn btn-small" onClick={() => setSessionId(newSessionId())} disabled={busy}>New</button>
            </div>
          </label>
          <label>Seconds per sample: <strong>{duration.toFixed(1)}</strong>
            <input type="range" min={1} max={4} step={0.5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} disabled={busy} />
          </label>
          <label>Samples in this batch: <strong>{count}</strong>
            <input type="range" min={1} max={20} step={1} value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={busy} />
          </label>
        </div>
        <div className="toolbar">
          {!busy ? (
            <button className="btn btn-primary" onClick={recordBatch} disabled={vision.camera !== "on"}>● Record {count} sample(s)</button>
          ) : (
            <button className="btn btn-danger-ghost" onClick={() => { abortRef.current = true; }}>Stop after this sample</button>
          )}
        </div>
        {busy && <div className="progress"><div style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>}
        {recMsg && <Notice tone={recMsg.tone}>{recMsg.text}</Notice>}
        <details className="settings" open>
          <summary>How to record good data</summary>
          <ol className="howto">
            <li>Learn each sign from a verified ISL source (e.g. the ISLRTC dictionary) before recording.</li>
            <li>For every sample: start with hands <strong>down / out of view</strong>, perform the sign once during the red REC window, then lower your hands.</li>
            <li>Record <strong>10–20 samples per sign</strong>, and record <strong>“_none”</strong> too (raising/lowering hands, scratching face, resting) so the model can reject non-signs.</li>
            <li>Record each sign in <strong>at least two sessions</strong> (press “New” between them, ideally with different lighting/clothes or a second signer). Evaluation is then session-independent.</li>
            <li>Only landmark coordinates are saved (backend/data/dataset), never video.</li>
          </ol>
        </details>
      </Card>

      <Card title="Vocabulary & dataset" className="span-full">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Label</th><th>Kannada</th><th>English</th><th>Samples</th><th>Sessions</th><th>In model</th><th>Avatar clip</th><th></th></tr>
            </thead>
            <tbody>
              {vocab.map((v) => {
                const c = counts[v.label];
                return (
                  <tr key={v.label}>
                    <td><code>{v.label}</code></td>
                    <td lang="kn" className="kn-cell">{v.kannada || "—"}</td>
                    <td>{v.english}</td>
                    <td>{c?.count ?? 0}</td>
                    <td>{c?.sessions.length ?? 0}</td>
                    <td>{v.trained ? <Chip tone="ok">yes</Chip> : <Chip tone="muted">no</Chip>}</td>
                    <td>
                      {v.label === "_none" ? "—" : v.animation?.available ? (
                        <Chip tone={v.animation.type === "captured" ? "ok" : "sim"}>{v.animation.type}{v.animation.verified ? " ✓" : ""}</Chip>
                      ) : <Chip tone="warn">none</Chip>}
                    </td>
                    <td className="row-actions">
                      {c?.count ? <button className="btn btn-small btn-ghost" onClick={() => deleteLast(v.label)}>Delete last</button> : null}
                      {c?.count && v.label !== "_none" ? <button className="btn btn-small btn-ghost" onClick={() => capture(v.label)} title="Retarget your latest recording of this sign onto the avatar">Use as avatar clip</button> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {captureMsg && <Notice tone="info">{captureMsg}</Notice>}
        <details className="settings">
          <summary>Add a vocabulary entry</summary>
          <div className="row wrap">
            <input placeholder="label id (e.g. mane)" value={newVocab.label} onChange={(e) => setNewVocab({ ...newVocab, label: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
            <input placeholder="English (e.g. Home)" value={newVocab.english} onChange={(e) => setNewVocab({ ...newVocab, english: e.target.value })} />
            <input placeholder="ಕನ್ನಡ (e.g. ಮನೆ)" lang="kn" value={newVocab.kannada} onChange={(e) => setNewVocab({ ...newVocab, kannada: e.target.value })} />
            <button className="btn" onClick={addVocab} disabled={!newVocab.label || !newVocab.kannada}>Add</button>
          </div>
          <p className="muted small-text">The Kannada word is also added (unverified) to <code>backend/data/kannada_sign_mapping.json</code> for Kannada → Sign; edit that file to add aliases or phrases.</p>
          {vocabMsg && <p className="small-text">{vocabMsg}</p>}
        </details>
      </Card>
    </div>
  );
}
