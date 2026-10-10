import { useCallback, useEffect, useRef, useState } from "react";
import { api, uploadFiles } from "../services/api";
import type { ContinuousStatus, Eligibility, ExternalDataset, Job, ModelVersion, UploadBatch, VocabEntry } from "../services/types";
import { Icon } from "./Icon";
import { Btn, Card, Chip, Empty, Notice, Spinner } from "./ui";

const pct = (v?: number | null) => (v === undefined || v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

function jobTone(state: Job["state"]) {
  return state === "done" ? "ok" : state === "failed" ? "bad" : state === "cancelled" ? "muted" : state === "running" ? "info" : "warn";
}

/** Polls jobs while anything is queued/running; notifies the page when a job finishes. */
export function useJobs(onFinished: () => void) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const prevActive = useRef<Set<string>>(new Set());
  const refresh = useCallback(async () => {
    try {
      const { jobs } = await api.jobs();
      setJobs(jobs);
      const active = new Set(jobs.filter((j) => j.state === "queued" || j.state === "running").map((j) => j.id));
      for (const id of prevActive.current) if (!active.has(id)) onFinished();
      prevActive.current = active;
    } catch {
      /* backend restarting */
    }
  }, [onFinished]);
  useEffect(() => {
    refresh();
    const busy = jobs.some((j) => j.state === "queued" || j.state === "running");
    const t = window.setInterval(refresh, busy ? 1500 : 6000);
    return () => window.clearInterval(t);
  }, [refresh, jobs.some((j) => j.state === "queued" || j.state === "running")]); // eslint-disable-line react-hooks/exhaustive-deps
  return { jobs, refresh };
}

export function ExternalDatasetsCard({ datasets, onImport }: { datasets: ExternalDataset[]; onImport: (key: string) => void }) {
  return (
    <Card title="Indian Sign Language datasets" icon="database" className="span-all"
      subtitle="Public ISL datasets used for training. Downloaded with tools\download_datasets.py; license and citation shown for each">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Dataset</th><th>Task</th><th>License</th><th>Download</th><th>Imported samples</th><th>Import report</th><th></th></tr></thead>
          <tbody>
            {datasets.map((d) => (
              <tr key={d.key}>
                <td>
                  <strong>{d.name}</strong>
                  <div className="muted xs">{d.description}</div>
                  <details><summary className="xs muted">Citation</summary><div className="xs">{d.citation}</div><a className="xs" href={d.source_url} target="_blank" rel="noreferrer">{d.source_url}</a></details>
                </td>
                <td><Chip tone={d.task === "continuous" ? "info" : "accent"}>{d.task}</Chip></td>
                <td>{d.license}</td>
                <td>
                  {d.download_state === "extracted" ? <Chip tone="ok" icon="check">downloaded</Chip>
                    : d.download_state === "partial" ? <Chip tone="warn">partial</Chip>
                    : d.download_state === "failed" ? <Chip tone="bad">failed</Chip>
                    : <Chip tone="muted">not downloaded</Chip>}
                </td>
                <td>{d.processed_samples || "—"}</td>
                <td className="xs">
                  {d.import_summary ? (
                    <>{d.import_summary.accepted} accepted / {d.import_summary.rejected} rejected · {d.import_summary.classes} classes · {d.import_summary.groups} signer groups
                      {d.import_summary.rejection_reasons.length > 0 && <details><summary className="muted">rejection reasons</summary><ul className="list">{d.import_summary.rejection_reasons.slice(0, 6).map((r) => <li key={r}>{r}</li>)}</ul></details>}
                    </>
                  ) : d.task === "continuous" ? <span className="muted">used by the continuous sentence pipeline</span> : <span className="muted">not imported</span>}
                </td>
                <td className="row-actions">
                  {d.importable && d.download_state === "extracted" && (
                    <Btn size="sm" icon="refresh" onClick={() => onImport(d.key)} title="Extract landmarks from any videos not processed yet">Import</Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted xs">Not downloaded? Run <code>.\download-datasets.ps1</code> (see README). Only publicly downloadable files are fetched; checksums are verified before extraction.</p>
    </Card>
  );
}

export function UploadCard({ vocab, onQueued }: { vocab: VocabEntry[]; onQueued: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [datasetName, setDatasetName] = useState("my_uploads");
  const [signer, setSigner] = useState("signer1");
  const [session, setSession] = useState("");
  const [mode, setMode] = useState<"single" | "annotation" | "folders">("single");
  const [label, setLabel] = useState("");
  const [annotationType, setAnnotationType] = useState("isolated");
  const [progress, setProgress] = useState<number | null>(null);
  const [batch, setBatch] = useState<UploadBatch | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "info" | "warn"; text: string } | null>(null);

  const addFiles = (list: FileList | null) => list && setFiles((f) => [...f, ...Array.from(list)]);

  const upload = async () => {
    setMsg(null);
    setBatch(null);
    const form = new FormData();
    files.forEach((f) => form.append("files", f, f.name));
    form.append("dataset_name", datasetName);
    form.append("signer_id", signer);
    form.append("session_id", session);
    form.append("label_mode", mode);
    form.append("label", label);
    form.append("annotation_type", annotationType);
    setProgress(0);
    try {
      const b = await uploadFiles(form, setProgress);
      setBatch(b);
      setFiles([]);
    } catch (err) {
      setMsg({ tone: "bad", text: String((err as Error).message || err) });
    } finally {
      setProgress(null);
    }
  };

  const importBatch = async () => {
    if (!batch) return;
    try {
      await api.importUpload(batch.batch_id);
      setMsg({ tone: "ok", text: `Import of ${batch.ready} video(s) queued. Landmarks are extracted in the background; training is queued automatically once enough new valid data exists.` });
      setBatch(null);
      onQueued();
    } catch (err) {
      setMsg({ tone: "bad", text: String((err as Error).message || err) });
    }
  };

  const discard = async () => {
    if (!batch) return;
    await api.deleteUpload(batch.batch_id).catch(() => undefined);
    setBatch(null);
    setMsg({ tone: "info", text: "Upload deleted from this computer." });
  };

  return (
    <Card title="Upload sign videos" icon="plus" subtitle="MP4 / MOV / AVI / WebM, or a ZIP, plus optional CSV/JSON annotations. Files stay on this computer.">
      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
      >
        <Icon name="database" size={22} />
        <div><strong>Drag &amp; drop</strong> videos, a ZIP or an annotation file here</div>
        <label className="btn btn-default btn-sm">Choose files<input type="file" multiple hidden accept=".mp4,.mov,.avi,.webm,.mkv,.m4v,.zip,.csv,.json" onChange={(e) => addFiles(e.target.files)} /></label>
        {files.length > 0 && <div className="xs">{files.length} file(s): {files.slice(0, 4).map((f) => f.name).join(", ")}{files.length > 4 ? "…" : ""} · {(files.reduce((a, f) => a + f.size, 0) / 1e6).toFixed(1)} MB <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])}>clear</button></div>}
      </div>
      <div className="form-grid cols-2">
        <label className="field">Dataset name<input value={datasetName} onChange={(e) => setDatasetName(e.target.value.replace(/[^A-Za-z0-9_-]/g, "_"))} /></label>
        <label className="field">Annotation type
          <select value={annotationType} onChange={(e) => setAnnotationType(e.target.value)}>
            <option value="isolated">Isolated signs (one sign per video)</option>
            <option value="continuous">Continuous sentence (stored for the sentence pipeline)</option>
          </select>
        </label>
        <label className="field">Signer ID<input value={signer} onChange={(e) => setSigner(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} /></label>
        <label className="field">Session ID<input placeholder="auto" value={session} onChange={(e) => setSession(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} /></label>
        <label className="field">How are videos labelled?
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="single">One sign for every video in this upload</option>
            <option value="annotation">Annotation file (CSV/JSON: file,label,…)</option>
            <option value="folders">ZIP folders are the labels (help/clip1.mp4)</option>
          </select>
          <span className="hint">{mode === "annotation" ? "Columns: file,label[,signer,session,transcript,gloss,start,end]" : mode === "folders" ? "Only use this when your ZIP really is organised by sign." : "Labels are never guessed from file names."}</span>
        </label>
        {mode === "single" && (
          <label className="field">Sign label
            <select value={label} onChange={(e) => setLabel(e.target.value)}>
              <option value="">— choose —</option>
              {vocab.filter((v) => v.label !== "_none").map((v) => <option key={v.label} value={v.label}>{v.kannada} · {v.english} ({v.label})</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="toolbar">
        <Btn icon="plus" variant="primary" onClick={upload} disabled={!files.length || progress !== null || (mode === "single" && !label)}>Upload &amp; preview</Btn>
        {progress !== null && <><Spinner /><span className="small">{Math.round(progress * 100)}% uploaded</span></>}
      </div>
      {progress !== null && <div className="progress"><div style={{ width: `${progress * 100}%` }} /></div>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {batch && (
        <div className="stack">
          <Notice tone={batch.ready ? "info" : "warn"} title={`Preview: ${batch.ready} of ${batch.videos} video(s) ready to import`}>
            Dataset <code>{batch.dataset}</code>, signer <code>{batch.signer_id}</code>, session <code>{batch.session_id}</code>{batch.annotations ? `, ${batch.annotations} annotation rows` : ""}.
            {batch.problems.map((p) => <div key={p}>⚠ {p}</div>)}
          </Notice>
          <div className="table-wrap" style={{ maxHeight: 260, overflowY: "auto" }}>
            <table>
              <thead><tr><th>File</th><th>Label</th><th>Duration</th><th>Resolution</th><th>Status</th></tr></thead>
              <tbody>
                {batch.items.map((i) => (
                  <tr key={i.file}>
                    <td className="xs"><code>{i.file}</code></td>
                    <td>{i.label || "—"}</td>
                    <td>{i.duration_s ? `${i.duration_s.toFixed(1)} s @ ${i.fps}` : "—"}</td>
                    <td className="xs">{i.width}×{i.height}</td>
                    <td>{i.ok ? <Chip tone="ok">ready</Chip> : <span className="xs" style={{ color: "var(--bad)" }}>{i.problems.join("; ")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="toolbar">
            <Btn icon="play" variant="primary" onClick={importBatch} disabled={!batch.ready}>Import {batch.ready} video(s)</Btn>
            <Btn icon="trash" variant="danger" onClick={discard}>Delete upload</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

export function JobsCard({ jobs, refresh }: { jobs: Job[]; refresh: () => void }) {
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      window.alert(String((err as Error).message || err));
    }
    refresh();
  };
  return (
    <Card title="Background jobs" icon="layers" subtitle="Imports and training run one at a time; jobs resume after a restart">
      {jobs.length === 0 ? <Empty icon="layers">No jobs yet.</Empty> : (
        <div className="stack">
          {jobs.slice(0, 8).map((j) => (
            <div key={j.id} className="job">
              <div className="toolbar">
                <Chip tone={jobTone(j.state)}>{j.state}</Chip>
                <strong className="small">{j.title}</strong>
                <span className="muted xs">{fmtTime(j.created_at)}</span>
                <span className="grow" />
                {j.state === "queued" && <Btn size="sm" variant="ghost" icon="x" onClick={() => act(() => api.cancelJob(j.id))}>Cancel</Btn>}
                {j.state === "running" && j.type !== "train" && <Btn size="sm" variant="ghost" icon="stop" onClick={() => act(() => api.cancelJob(j.id))}>Stop</Btn>}
                {(j.state === "failed" || j.state === "cancelled") && <Btn size="sm" variant="ghost" icon="replay" onClick={() => act(() => api.retryJob(j.id))}>Retry</Btn>}
              </div>
              {j.reason && <div className="muted xs">{j.reason}</div>}
              {(j.state === "running" || j.state === "queued") && (
                <>
                  <div className="xs">{j.stage}</div>
                  <div className="progress"><div style={{ width: `${j.progress * 100}%` }} /></div>
                </>
              )}
              {j.state === "failed" && <div className="xs" style={{ color: "var(--bad)" }}>{j.error}</div>}
              {j.state === "done" && j.result && <JobResult job={j} />}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function JobResult({ job }: { job: Job }) {
  const r = job.result as Record<string, unknown>;
  if (job.type === "train") {
    return (
      <div className="xs">
        {r.promoted ? <Chip tone="ok">promoted</Chip> : <Chip tone="warn">not promoted</Chip>}{" "}
        <code>{String(r.version)}</code> · {String(r.model_type)} · accuracy {pct(r.accuracy as number)} · macro-F1 {(r.macro_f1 as number)?.toFixed(3)} · {String(r.num_classes)} classes / {String(r.num_samples)} samples
        <div className="muted">{String(r.decision)}</div>
      </div>
    );
  }
  const el = r.training_eligibility as Eligibility | undefined;
  return (
    <div className="xs">
      {String(r.accepted)} accepted, {String(r.rejected)} rejected of {String(r.videos)} videos ({String(r.classes)} classes)
      {el && <div className="muted">{el.eligible ? "Enough new data: retraining was queued automatically." : `No automatic retraining: ${el.reasons.join("; ")}`}</div>}
    </div>
  );
}

export function RegistryCard({ versions, eligibility, onChange }: { versions: ModelVersion[]; eligibility: Eligibility | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      window.alert(String((err as Error).message || err));
    } finally {
      setBusy(false);
      onChange();
    }
  };
  return (
    <Card title="Model versions" icon="layers" subtitle="A new model only becomes active if it passes the acceptance checks; you can restore the previous one">
      {eligibility && (
        <Notice tone={eligibility.eligible ? "info" : "muted"} title={eligibility.eligible ? "New data available: retraining is possible" : "Automatic retraining is waiting"}>
          {eligibility.valid_samples} valid samples, {eligibility.usable_classes} usable classes, {eligibility.new_samples} new since the active model.
          {!eligibility.eligible && <> {eligibility.reasons.join("; ")}.</>}
        </Notice>
      )}
      {versions.length === 0 ? <Empty icon="layers">No trained model versions yet.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Version</th><th>Status</th><th>Model</th><th>Data</th><th>Macro-F1</th><th>Decision</th><th></th></tr></thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.version} className={v.active ? "selected" : ""}>
                  <td><code>{v.version}</code><div className="muted xs">{fmtTime(v.trained_at)}</div></td>
                  <td><Chip tone={v.active ? "ok" : v.status === "rejected" ? "warn" : "muted"}>{v.status}</Chip></td>
                  <td>{v.model_type}</td>
                  <td className="xs">{v.num_classes} classes · {v.num_samples} samples<div className="muted">{v.sources ? Object.entries(v.sources).map(([k, n]) => `${k}: ${n}`).join(", ") : ""}</div></td>
                  <td>{v.macro_f1?.toFixed(3) ?? "—"}<div className="muted xs">{v.headline_source}</div></td>
                  <td className="xs" style={{ maxWidth: 260 }}>{v.decision}</td>
                  <td className="row-actions">{!v.active && <Btn size="sm" variant="ghost" disabled={busy} onClick={() => act(() => api.activate(v.version))}>Activate</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="toolbar">
        <Btn icon="replay" size="sm" disabled={busy || versions.length < 2} onClick={() => window.confirm("Restore the previously active model?") && act(() => api.rollback())}>Restore previous model</Btn>
      </div>
    </Card>
  );
}

const DECODER_TEXT: Record<string, string> = {
  greedy_nearest: "CTC greedy path → nearest sentence",
  baseline: "Sentence classifier",
  ctc_likelihood: "CTC full likelihood of each sentence",
  fusion: "CTC likelihood + sentence classifier",
};

export function ContinuousCard({ status, onTrain, showTrain = true }: { status: ContinuousStatus | null; onTrain?: () => void; showTrain?: boolean }) {
  const m = status?.metrics;
  return (
    <Card title="Continuous sentence model (ISL-CSLTR)" icon="layers"
      subtitle="Video -> landmark sequence -> BiGRU + CTC -> gloss sequence -> closest corpus sentence -> Kannada"
      actions={status?.loaded ? <Chip tone="ok">{status.version}</Chip> : <Chip tone="warn">not trained</Chip>}>
      {!m ? (
        <Empty icon="flask"><strong>Not evaluated.</strong> {status?.error ?? "Import the ISL-CSLTR videos, then train the sentence model."}</Empty>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Method (same held-out recordings)</th><th>Gloss error rate (lower is better)</th><th>Sentence accuracy</th><th></th></tr></thead>
              <tbody>
                {(["baseline", "ctc"] as const).map((k) => (
                  <tr key={k} className={m.selected_method === k ? "selected" : ""}>
                    <td><strong>{k === "ctc" ? "BiGRU + CTC" : "Sentence classifier (baseline)"}</strong><div className="muted xs">{m[k].method}</div></td>
                    <td>{pct(m[k].gloss_error_rate)}</td>
                    <td>{pct(m[k].sentence_accuracy)} <span className="muted xs">({m[k].sentences_correct}/{m[k].test_videos})</span></td>
                    <td>{m.selected_method === k && <Chip tone="ok">used live</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {m.decoder_comparison && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Sentence decoder (same networks)</th><th>Validation accuracy (used to choose)</th><th>Test sentence accuracy</th><th>Test GER of chosen sentence</th><th></th></tr></thead>
                <tbody>
                  {Object.entries(m.decoder_comparison.test).map(([k, t]) => (
                    <tr key={k} className={m.decoder === k ? "selected" : ""}>
                      <td><strong>{DECODER_TEXT[k] ?? k}</strong></td>
                      <td>{pct(m.decoder_comparison!.validation[k]?.sentence_accuracy)}</td>
                      <td>{pct(t.sentence_accuracy)} <span className="muted xs">({t.sentences_correct}/{t.videos})</span></td>
                      <td>{pct(t.gloss_error_rate_of_chosen_sentence)}</td>
                      <td>{m.decoder === k && <Chip tone="ok">used live</Chip>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted xs">Chosen on validation round {m.decoder_comparison.validation_round} only; the validation classifier was fitted on training rounds only. {m.decoder_comparison.audit}</p>
            </div>
          )}
          <Notice tone="info" title={`${m.videos} sentence videos: train ${m.train_videos} / validation ${m.val_videos} / test ${m.test_videos}`}>
            Split: {m.split}. Test recording groups: {m.test_groups.join(", ")}. {m.limitations}
          </Notice>
          <details className="disclosure">
            <summary><Icon name="eye" size={15} /> Example decodes on test videos</summary>
            <div className="disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Sentence</th><th>Reference gloss</th><th>Decoded gloss</th><th>Matched sentence</th></tr></thead>
                  <tbody>
                    {m.examples.map((e, i) => (
                      <tr key={i}><td className="xs">{e.sentence}</td><td className="xs"><code>{e.reference}</code></td><td className="xs"><code>{e.decoded || "-"}</code></td><td className="xs">{e.correct ? <Chip tone="ok">correct</Chip> : <Chip tone="bad">wrong</Chip>} {e.nearest_sentence}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </>
      )}
      {showTrain && onTrain && <div className="toolbar"><Btn icon="play" onClick={onTrain}>Train sentence model</Btn><span className="muted xs">Runs as a background job.</span></div>}
    </Card>
  );
}
