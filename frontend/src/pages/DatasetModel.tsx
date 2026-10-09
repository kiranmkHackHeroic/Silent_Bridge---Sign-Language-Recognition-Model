import { useCallback, useEffect, useRef, useState } from "react";
import { CameraPanel } from "../components/CameraPanel";
import { ContinuousCard, ExternalDatasetsCard, JobsCard, RegistryCard, UploadCard, useJobs } from "../components/DataPipeline";
import { Icon } from "../components/Icon";
import { LandmarkReplay, quickCheck } from "../components/LandmarkReplay";
import { MetricsReport } from "../components/MetricsReport";
import { Btn, Card, Chip, Empty, Notice, Spinner, Stat } from "../components/ui";
import { api } from "../services/api";
import type {
  ContinuousStatus, DatasetSummary, Eligibility, ExternalDataset, LandmarkFrame, Metrics, ModelStatus, ModelVersion, RecordedSample,
  TrainJob, ValidationSummary, VocabEntry,
} from "../services/types";
import { useVision, type VisionResult } from "../services/useVision";

type Phase = "idle" | "ready" | "recording" | "review" | "saving";
const RECOMMENDED = 10;

const newSessionId = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `s${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DatasetModel() {
  const [overlay, setOverlay] = useState(true);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [externals, setExternals] = useState<ExternalDataset[]>([]);
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [continuous, setContinuous] = useState<ContinuousStatus | null>(null);

  const [label, setLabel] = useState("namaskara");
  const [signer, setSigner] = useState("signer1");
  const [sessionId, setSessionId] = useState(newSessionId);
  const [duration, setDuration] = useState(2.0);
  const [count, setCount] = useState(10);
  const [reviewEach, setReviewEach] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [recMsg, setRecMsg] = useState<{ tone: "ok" | "bad" | "info" | "warn"; text: string } | null>(null);
  const [handsNow, setHandsNow] = useState(0);
  const [pending, setPending] = useState<LandmarkFrame[] | null>(null);
  const [lastSaved, setLastSaved] = useState<LandmarkFrame[] | null>(null);
  const [job, setJob] = useState<TrainJob | null>(null);
  const [browse, setBrowse] = useState<string | null>(null);
  const [viewing, setViewing] = useState<RecordedSample | null>(null);
  const [captureMsg, setCaptureMsg] = useState("");
  const [newVocab, setNewVocab] = useState({ label: "", english: "", kannada: "", gloss: "" });
  const [vocabMsg, setVocabMsg] = useState("");

  const recordingRef = useRef(false);
  const framesRef = useRef<LandmarkFrame[]>([]);
  const abortRef = useRef(false);
  const handsRef = useRef(0);
  const decisionRef = useRef<((keep: boolean) => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [v, s, d, val, m] = await Promise.all([api.vocabulary(), api.modelStatus(), api.datasetSummary(), api.validation(), api.metrics()]);
      setVocab(v.labels);
      setStatus(s);
      setSummary(d);
      setValidation(val);
      setMetrics(m);
      setBackendError(null);
      // slower, optional panels: never block the main status
      api.datasets().then((d) => setExternals(d.datasets)).catch(() => undefined);
      api.registry().then((r) => setVersions(r.versions)).catch(() => undefined);
      api.eligibility().then(setEligibility).catch(() => undefined);
      api.continuousStatus().then(setContinuous).catch(() => undefined);
    } catch (err) {
      setBackendError(String((err as Error).message || err));
    }
  }, []);
  const { jobs, refresh: refreshJobs } = useJobs(refresh);

  useEffect(() => {
    refresh();
    api.trainStatus().then((j) => j.state === "running" && setJob(j)).catch(() => undefined);
    const t = window.setInterval(() => setHandsNow(handsRef.current), 200);
    return () => {
      window.clearInterval(t);
      abortRef.current = true;
      decisionRef.current?.(false);
    };
  }, [refresh]);

  // poll training progress while a job runs
  useEffect(() => {
    if (job?.state !== "running") return;
    const t = window.setInterval(async () => {
      try {
        const j = await api.trainStatus();
        setJob(j);
        if (j.state !== "running") refresh();
      } catch {
        /* backend hiccup: keep polling */
      }
    }, 400);
    return () => window.clearInterval(t);
  }, [job?.state, refresh]);

  const onResult = useCallback((r: VisionResult) => {
    handsRef.current = r.frame.hands.length;
    if (recordingRef.current) framesRef.current.push(r.frame);
  }, []);
  const vision = useVision({ face: true, overlay, onResult });

  const save = async (frames: LandmarkFrame[]) => {
    const video = { w: frames[0]?.w ?? 640, h: frames[0]?.h ?? 480 };
    await api.record({ label, session_id: sessionId, signer_id: signer, video, frames });
  };

  const recordBatch = async () => {
    if (vision.camera !== "on") return setRecMsg({ tone: "bad", text: "Start the camera first." });
    abortRef.current = false;
    setRecMsg(null);
    setProgress({ done: 0, total: count });
    let saved = 0;
    let skipped = 0;
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
      const frames = framesRef.current;
      const check = quickCheck(frames);
      if (reviewEach || !check.ok) {
        setPending(frames);
        setPhase("review");
        const keep = await new Promise<boolean>((resolve) => { decisionRef.current = resolve; });
        decisionRef.current = null;
        setPending(null);
        if (!keep) {
          skipped++;
          continue;
        }
      }
      setPhase("saving");
      try {
        await save(frames);
        saved++;
        setLastSaved(frames);
        setProgress({ done: saved, total: count });
      } catch (err) {
        skipped++;
        setRecMsg({ tone: "bad", text: `Sample ${i + 1} not saved: ${String((err as Error).message || err)}` });
      }
    }
    setPhase("idle");
    setCountdown(0);
    setRecMsg((m) => (m?.tone === "bad" ? m : { tone: "ok", text: `Saved ${saved} sample(s) of “${label}” in session ${sessionId}${skipped ? `; ${skipped} discarded` : ""}.` }));
    refresh();
  };

  const importExternal = async (key: string) => {
    try {
      await api.importDataset(key);
      refreshJobs();
    } catch (err) {
      setBackendError(String((err as Error).message || err));
    }
  };

  const trainModel = async () => {
    try {
      setJob(await api.startTraining());
      refreshJobs();
    } catch (err) {
      setJob({ state: "error", stage: "", progress: 0, error: String((err as Error).message || err), metrics: null });
    }
  };

  const openSample = async (lbl: string, id: string) => {
    try {
      setViewing(await api.sample(lbl, id));
    } catch (err) {
      setRecMsg({ tone: "bad", text: String((err as Error).message || err) });
    }
  };

  const deleteSample = async (lbl: string, id: string) => {
    if (!window.confirm(`Delete sample ${id} of “${lbl}”? This cannot be undone.`)) return;
    try {
      await api.deleteSample(lbl, id);
      if (viewing?.sample_id === id) setViewing(null);
    } catch (err) {
      setRecMsg({ tone: "bad", text: String((err as Error).message || err) });
    }
    refresh();
  };

  const capture = async (lbl: string) => {
    setCaptureMsg("");
    try {
      const res = await api.captureAnimation(lbl);
      setCaptureMsg(`Avatar clip for “${lbl}” captured from your latest recording (${res.keyframes} keyframes). Marked unverified until reviewed.`);
      refresh();
    } catch (err) {
      setCaptureMsg(`Could not capture “${lbl}”: ${String((err as Error).message || err)}`);
    }
  };

  const addVocab = async () => {
    setVocabMsg("");
    try {
      await api.upsertVocabulary(newVocab.label.trim(), newVocab.english.trim(), newVocab.kannada.trim(), newVocab.gloss.trim());
      setVocabMsg(`Added “${newVocab.label}” to labels.json and the Kannada→sign dictionary (unverified). Record samples for it, then retrain.`);
      setNewVocab({ label: "", english: "", kannada: "", gloss: "" });
      refresh();
    } catch (err) {
      setVocabMsg(String((err as Error).message || err));
    }
  };

  const busy = phase !== "idle";
  const perClass = validation?.per_class ?? {};
  const selectedEntry = vocab.find((v) => v.label === label);
  const training = job?.state === "running";
  const browseSamples = browse ? summary?.labels[browse]?.samples ?? [] : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Dataset &amp; Model</h2>
          <p>Record real landmark examples of each supported sign, check the dataset, train the classifier and inspect measured results. Only landmark coordinates are stored, never video.</p>
        </div>
        <Btn icon="refresh" size="sm" onClick={refresh}>Refresh</Btn>
      </div>
      {backendError && <div style={{ marginBottom: 16 }}><Notice tone="bad">{backendError}</Notice></div>}

      <div className="dataset-layout">
        <Card title="Model status" icon="layers" className="span-all"
          actions={status?.loaded ? <Chip tone="ok" icon="check">Loaded</Chip> : <Chip tone="warn" icon="alert">Not trained</Chip>}>
          <div className="stats">
            <Stat label="Version" value={status?.model_version ?? "—"} />
            <Stat label="Classifier" value={status?.model_type ?? "—"} hint={status?.architecture ?? ""} />
            <Stat label="Classes" value={status?.num_classes ?? 0} />
            <Stat label="Trained on" value={status?.num_samples ? `${status.num_samples} samples` : "—"} />
            <Stat label="Valid samples" value={validation ? `${validation.valid} / ${validation.total}` : "—"} />
            <Stat label="Feature schema" value="hands-face-v2" hint="Landmark preprocessing version stored with the model" />
          </div>
          {status && !status.loaded && <p className="muted small">{status.error}</p>}
          {status?.loaded && validation && !validation.model_is_current && (
            <Notice tone="warn">The dataset has changed since this model was trained. Retrain to include the new samples.</Notice>
          )}
          <div className="toolbar">
            <Btn icon="play" variant="primary" onClick={trainModel} disabled={training || busy}>
              {training ? "Training…" : status?.loaded ? "Retrain model" : "Train model"}
            </Btn>
            <span className="muted small">Uses valid samples from your recordings and every imported dataset. Compares a logistic-regression baseline, an SVM, an MLP and a GRU temporal model; the new version is activated only if it passes the acceptance checks.</span>
          </div>
          {job && job.state !== "idle" && (
            <div className="stack" aria-live="polite">
              {job.state === "running" && (
                <>
                  <div className="toolbar"><Spinner /> <span className="small">{job.stage}</span><span className="grow" /><span className="small muted">{Math.round(job.progress * 100)}%</span></div>
                  <div className="progress lg"><div style={{ width: `${job.progress * 100}%` }} /></div>
                </>
              )}
              {job.state === "error" && <Notice tone="bad" title="No new model was activated">{job.error}</Notice>}
              {job.state === "done" && job.metrics && (
                <Notice tone="ok" title="Training completed: the new model passed the checks and is now active">
                  {job.metrics.model_type}: accuracy {(job.metrics.accuracy! * 100).toFixed(1)}%, macro-F1 {job.metrics.macro_f1!.toFixed(3)} on {job.metrics.headline_source}.
                </Notice>
              )}
            </div>
          )}
        </Card>

        <ExternalDatasetsCard datasets={externals} onImport={importExternal} />

        <UploadCard vocab={vocab} onQueued={refreshJobs} />
        <JobsCard jobs={jobs} refresh={refreshJobs} />

        <div className="span-all"><ContinuousCard status={continuous} onTrain={() => api.trainContinuous().then(refreshJobs).catch((e) => setBackendError(String(e.message || e)))} /></div>

        <div className="span-all"><RegistryCard versions={versions} eligibility={eligibility} onChange={() => { refresh(); refreshJobs(); }} /></div>

        <Card title="Record samples" icon="camera"
          actions={phase === "recording" ? <Chip tone="bad">● Recording {progress.done + 1}/{progress.total}</Chip> : null}>
          {pending ? (
            <div className="stack">
              <LandmarkReplay frames={pending} label={selectedEntry?.english} />
              {(() => {
                const c = quickCheck(pending);
                return <Notice tone={c.ok ? "info" : "warn"} title={c.ok ? "Review this sample" : "This sample looks incomplete"}>{c.message} Keep it only if the sign is correct and complete.</Notice>;
              })()}
              <div className="review-actions">
                <Btn icon="check" variant="primary" onClick={() => decisionRef.current?.(true)}>Keep</Btn>
                <Btn icon="trash" variant="danger" onClick={() => decisionRef.current?.(false)}>Discard</Btn>
              </div>
            </div>
          ) : (
            <CameraPanel
              vision={vision}
              overlay={overlay}
              setOverlay={setOverlay}
              topLeft={
                phase === "ready" ? <span className="pill pill-ready">Get ready… {countdown}</span>
                : phase === "recording" ? <span className="pill pill-rec">● REC {progress.done + 1}/{progress.total}</span>
                : phase === "saving" ? <span className="pill">Saving…</span>
                : <span className="pill">{handsNow} hand(s) visible</span>
              }
              topRight={selectedEntry ? <span className="pill" lang="kn">{selectedEntry.kannada || "_none"}</span> : undefined}
            />
          )}
          {busy && <div className="progress"><div style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>}
        </Card>

        <div className="stack">
          <Card title="Recording settings" icon="settings">
            <div className="form-grid">
              <label className="field">Sign
                <select value={label} onChange={(e) => setLabel(e.target.value)} disabled={busy}>
                  {vocab.map((v) => (
                    <option key={v.label} value={v.label}>
                      {v.label === "_none" ? "_none · background / not a sign" : `${v.kannada} · ${v.english} (${v.isl_gloss})`}
                    </option>
                  ))}
                </select>
                {label === "_none" ? (
                  <span className="hint">Record raising/lowering hands, resting, scratching your face or random movement, so the model learns to reject non-signs.</span>
                ) : selectedEntry && <span className="hint">{(perClass[label]?.valid ?? 0)} valid sample(s) in {(perClass[label]?.sessions.length ?? 0)} session(s) so far.</span>}
              </label>
              <div className="form-grid cols-2">
                <label className="field">Signer ID<input value={signer} onChange={(e) => setSigner(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} disabled={busy} /></label>
                <label className="field">Session ID
                  <span className="field-row">
                    <input value={sessionId} onChange={(e) => setSessionId(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} disabled={busy} />
                    <Btn size="sm" onClick={() => setSessionId(newSessionId())} disabled={busy} title="Start a new recording session">New</Btn>
                  </span>
                </label>
                <label className="field">Seconds per sample: {duration.toFixed(1)}
                  <input type="range" min={1} max={4} step={0.5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} disabled={busy} />
                </label>
                <label className="field">Samples in batch: {count}
                  <input type="range" min={1} max={20} step={1} value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={busy} />
                </label>
              </div>
              <label className="switch">
                <input type="checkbox" checked={reviewEach} onChange={(e) => setReviewEach(e.target.checked)} disabled={busy} />
                Review each sample before saving (incomplete samples are always shown for review)
              </label>
            </div>
            <div className="toolbar">
              {!busy ? (
                <Btn icon="record" variant="primary" onClick={recordBatch} disabled={vision.camera !== "on"}>Record {count} sample(s)</Btn>
              ) : (
                <Btn icon="stop" variant="danger" onClick={() => { abortRef.current = true; decisionRef.current?.(false); }}>Stop after this sample</Btn>
              )}
              {vision.camera !== "on" && !busy && <span className="muted small">Start the camera first.</span>}
            </div>
            {recMsg && <Notice tone={recMsg.tone}>{recMsg.text}</Notice>}
            {lastSaved && !busy && (
              <details className="disclosure">
                <summary><Icon name="eye" size={15} /> Replay the last saved sample</summary>
                <div className="disclosure-body"><LandmarkReplay frames={lastSaved} label="last saved" /></div>
              </details>
            )}
          </Card>

          <Card title="How to record good data" icon="info">
            <ol className="list">
              <li>Learn each sign from a verified ISL source (e.g. the ISLRTC dictionary) before recording.</li>
              <li>Each sample: start with hands <strong>down or out of view</strong>, sign once during the red REC window, then lower your hands.</li>
              <li>Aim for <strong>{RECOMMENDED}–20 samples per sign</strong>, plus the <strong>_none</strong> class.</li>
              <li>Record each sign in <strong>3 sessions</strong> (press New between them; vary lighting, clothing or signer). With 3+ sessions the latest one becomes an independent test set.</li>
            </ol>
          </Card>
        </div>

        <Card title="Dataset validation" icon="check" className="span-all"
          actions={validation && <Chip tone={validation.rejected ? "warn" : validation.valid ? "ok" : "muted"}>{validation.valid} valid · {validation.rejected} rejected</Chip>}>
          {!validation || validation.total === 0 ? (
            <Empty icon="database">No samples recorded yet. A reliable model cannot be trained until real examples are recorded.</Empty>
          ) : (
            <>
              {validation.warnings.map((w) => <Notice key={w} tone="warn">{w}</Notice>)}
              {validation.rejected_samples.length > 0 && (
                <details className="disclosure" open>
                  <summary><Icon name="alert" size={15} /> Rejected samples ({validation.rejected_samples.length}): excluded from training</summary>
                  <div className="disclosure-body">
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Sample</th><th>Label</th><th>Reason</th><th></th></tr></thead>
                        <tbody>
                          {validation.rejected_samples.map((r) => (
                            <tr key={r.file}>
                              <td><code>{r.sample_id}</code></td>
                              <td>{r.label}</td>
                              <td>{r.reasons.join("; ")}</td>
                              <td className="row-actions"><Btn size="sm" variant="danger" icon="trash" onClick={() => deleteSample(r.label, r.sample_id)}>Delete</Btn></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              )}
              <p className="muted xs">Manifest written to <code>backend/data/dataset_manifest.csv</code> · dataset hash <code>{validation.dataset_hash}</code></p>
            </>
          )}
        </Card>

        <Card title="Vocabulary and samples per class" icon="database" className="span-all">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Sign</th><th>Kannada</th><th>ISL gloss</th><th>Valid</th><th>Sessions</th><th>Status</th><th>In model</th><th>Avatar clip</th><th></th></tr>
              </thead>
              <tbody>
                {vocab.map((v) => {
                  const c = perClass[v.label];
                  const valid = c?.valid ?? 0;
                  const sessions = c?.sessions.length ?? 0;
                  return (
                    <tr key={v.label} className={browse === v.label ? "selected" : ""}>
                      <td><code>{v.label}</code><div className="muted xs">{v.english}</div></td>
                      <td className="kn" lang="kn">{v.kannada || "—"}</td>
                      <td>{v.isl_gloss || "—"}</td>
                      <td>{valid}{c?.rejected ? <span className="muted xs"> (+{c.rejected} rejected)</span> : null}</td>
                      <td>{sessions}</td>
                      <td>
                        {valid === 0 ? <Chip tone="muted">no data</Chip>
                          : valid < 3 ? <Chip tone="bad">too few</Chip>
                          : valid < RECOMMENDED || sessions < 2 ? <Chip tone="warn">{valid < RECOMMENDED ? "few samples" : "1 session"}</Chip>
                          : <Chip tone="ok">ok</Chip>}
                      </td>
                      <td>{v.trained ? <Chip tone="ok">yes</Chip> : <Chip tone="muted">no</Chip>}</td>
                      <td>
                        {v.label === "_none" ? "—" : v.animation?.available ? (
                          <Chip tone={v.animation.type === "captured" ? "info" : "sim"}>{v.animation.type}{v.animation.verified ? " ✓" : ""}</Chip>
                        ) : <Chip tone="warn">none</Chip>}
                      </td>
                      <td className="row-actions">
                        {(summary?.labels[v.label]?.count ?? 0) > 0 && (
                          <Btn size="sm" variant="ghost" icon="eye" onClick={() => { setBrowse(browse === v.label ? null : v.label); setViewing(null); }}>Samples</Btn>
                        )}
                        {valid > 0 && v.label !== "_none" && (
                          <Btn size="sm" variant="ghost" icon="hand" onClick={() => capture(v.label)} title="Retarget your latest recording of this sign onto the avatar">Use as avatar clip</Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {captureMsg && <Notice tone="info">{captureMsg}</Notice>}
          {browse && (
            <div className="two-col">
              <div className="stack">
                <h3 className="small">Samples of <code>{browse}</code> (latest {browseSamples.length})</h3>
                <div className="sample-list">
                  {browseSamples.slice().reverse().map((s) => (
                    <div key={s.sample_id} className="sample-row">
                      <code>{s.sample_id}</code>
                      <span className="muted xs">{s.num_frames} frames</span>
                      <span className="grow" style={{ flex: 1 }} />
                      <Btn size="sm" variant="ghost" icon="play" onClick={() => openSample(browse, s.sample_id)}>Replay</Btn>
                      <Btn size="sm" variant="danger" icon="trash" onClick={() => deleteSample(browse, s.sample_id)} aria-label={`Delete ${s.sample_id}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div>{viewing ? <LandmarkReplay frames={viewing.frames} label={viewing.sample_id} /> : <Empty icon="eye">Choose a sample to replay its landmarks.</Empty>}</div>
            </div>
          )}
          <details className="disclosure">
            <summary><Icon name="plus" size={15} /> Add a new sign to the vocabulary</summary>
            <div className="disclosure-body">
              <div className="form-grid cols-2">
                <label className="field">Label ID<input placeholder="e.g. mane" value={newVocab.label} onChange={(e) => setNewVocab({ ...newVocab, label: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} /></label>
                <label className="field">Kannada text<input lang="kn" className="kn" placeholder="ಮನೆ" value={newVocab.kannada} onChange={(e) => setNewVocab({ ...newVocab, kannada: e.target.value })} /></label>
                <label className="field">English gloss<input placeholder="Home" value={newVocab.english} onChange={(e) => setNewVocab({ ...newVocab, english: e.target.value })} /></label>
                <label className="field">ISL gloss<input placeholder="HOME" value={newVocab.gloss} onChange={(e) => setNewVocab({ ...newVocab, gloss: e.target.value.toUpperCase() })} /></label>
              </div>
              <div className="toolbar">
                <Btn icon="plus" onClick={addVocab} disabled={!newVocab.label || !newVocab.kannada}>Add sign</Btn>
                <span className="muted xs">Saved to labels.json and kannada_sign_mapping.json (marked unverified).</span>
              </div>
              {vocabMsg && <p className="small">{vocabMsg}</p>}
            </div>
          </details>
        </Card>

        <Card title="Evaluation results" icon="flask" className="span-all" subtitle="Measured at training time on recordings the model did not train on">
          <MetricsReport metrics={metrics} />
        </Card>
      </div>
    </>
  );
}
