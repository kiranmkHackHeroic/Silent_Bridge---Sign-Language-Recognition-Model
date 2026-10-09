import { useEffect, useState } from "react";
import { Card, Chip, Notice } from "../components/ui";
import { api } from "../services/api";
import { sessionStats } from "../services/sessionStats";
import type { DatasetSummary, Metrics, ModelStatus, VocabEntry } from "../services/types";

const pct = (v?: number) => (v === undefined ? "—" : `${(v * 100).toFixed(1)}%`);

export function AboutTesting() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.metrics(), api.modelStatus(), api.vocabulary(), api.datasetSummary()])
      .then(([m, s, v, d]) => {
        setMetrics(m);
        setStatus(s);
        setVocab(v.labels);
        setSummary(d);
      })
      .catch((err) => setError(String(err.message || err)));
  }, []);

  const cm = metrics?.confusion_matrix;
  const live = sessionStats;

  return (
    <div className="page-grid about-grid">
      {error && <Notice tone="bad">{error}</Notice>}

      <Card title="Architecture" className="span-full">
        <div className="arch">
          <div className="arch-col">
            <h3>Browser (React + TypeScript)</h3>
            <div className="arch-box">Webcam (getUserMedia) — video never leaves the browser</div>
            <div className="arch-arrow">↓</div>
            <div className="arch-box">MediaPipe Hand Landmarker (WASM/WebGL) → 21 landmarks × 2 hands</div>
            <div className="arch-box">MediaPipe Face Landmarker → blendshapes → rule-based expression estimate</div>
            <div className="arch-arrow">↓ landmark JSON over local WebSocket</div>
            <div className="arch-box">Three.js procedural avatar · IK arms · 15 finger joints</div>
          </div>
          <div className="arch-col">
            <h3>Backend (Python FastAPI)</h3>
            <div className="arch-box">Normalization: wrist-relative, palm-scaled hand shape + position + presence flags</div>
            <div className="arch-arrow">↓</div>
            <div className="arch-box">Activity segmenter (pause / hand-drop boundaries) or rolling window + EMA smoothing + stability gate</div>
            <div className="arch-arrow">↓</div>
            <div className="arch-box">Sequence features (resample to 16 steps + velocities) → scikit-learn classifier</div>
            <div className="arch-arrow">↓</div>
            <div className="arch-box">Confidence threshold · unknown handling · duplicate suppression → Kannada transcript</div>
            <div className="arch-box">Kannada text → normalize → longest-match lookup → sign IDs → animation clips</div>
          </div>
        </div>
      </Card>

      <Card title="What is real, what is a placeholder" className="span-full">
        <table>
          <thead><tr><th>Feature</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Webcam, hand & face landmarks</td><td><Chip tone="ok">real</Chip> Google MediaPipe pretrained landmark models, running locally</td></tr>
            <tr><td>Sign classifier</td><td>{status?.loaded ? <Chip tone="ok">trained on your recordings</Chip> : <Chip tone="warn">not trained yet</Chip>} No pretrained ISL model ships with the app; it learns only the signs you record.</td></tr>
            <tr><td>Continuous recognition</td><td><Chip tone="ok">real</Chip> Event-based segmentation of supported isolated signs; not unrestricted sentence translation.</td></tr>
            <tr><td>Simulated demo mode</td><td><Chip tone="sim">simulated</Chip> Scripted words, clearly labelled, for showing the UI without a model.</td></tr>
            <tr><td>Kannada mapping</td><td><Chip tone="info">lexical</Chip> One Kannada word/phrase ↔ one sign label. All entries marked <em>unverified</em> until checked by an ISL expert.</td></tr>
            <tr><td>Facial expression</td><td><Chip tone="info">heuristic</Chip> Transparent blendshape rules; no trained emotion model; not calibrated.</td></tr>
            <tr><td>Avatar clips</td><td><Chip tone="sim">placeholder</Chip> hand-written illustrative motions, or <Chip tone="ok">captured</Chip> retargeted from your own recordings. None verified as correct ISL.</td></tr>
            <tr><td>Kannada speech output</td><td>Installed Kannada system voice if present; optional online gTTS fallback (off by default).</td></tr>
          </tbody>
        </table>
      </Card>

      <Card title="Evaluation results" className="span-full">
        {!metrics ? null : !metrics.available ? (
          <Notice tone="warn">Not measured: no model has been trained yet. Record samples and train on the Dataset & Model page; results appear here automatically.</Notice>
        ) : (
          <>
            <div className="kv-grid">
              <div><span>Classifier</span><strong>{metrics.model_type}</strong></div>
              <div><span>Samples</span><strong>{metrics.num_samples} ({metrics.num_sessions} sessions)</strong></div>
              <div><span>Out-of-fold accuracy</span><strong>{pct(metrics.accuracy)}</strong></div>
              <div><span>Macro F1</span><strong>{metrics.macro_f1?.toFixed(3)}</strong></div>
              <div><span>Correct / incorrect</span><strong>{metrics.correct} / {metrics.incorrect}</strong></div>
              <div><span>Classifier latency</span><strong>{metrics.inference_latency_ms} ms</strong></div>
            </div>
            <Notice tone={metrics.session_independent ? "info" : "warn"}>Method: {metrics.evaluation_strategy}</Notice>
            {metrics.warnings?.map((w) => <Notice key={w} tone="warn">{w}</Notice>)}
            <p className="muted small-text">{metrics.note} Trained {metrics.trained_at && new Date(metrics.trained_at).toLocaleString()}.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
                <tbody>
                  {Object.entries(metrics.per_class ?? {}).map(([c, r]) => (
                    <tr key={c}><td><code>{c}</code></td><td>{pct(r.precision)}</td><td>{pct(r.recall)}</td><td>{r["f1-score"].toFixed(3)}</td><td>{r.support}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cm && (
              <>
                <h3 className="subhead">Confusion matrix (rows = true, columns = predicted)</h3>
                <div className="table-wrap">
                  <table className="cm">
                    <thead><tr><th></th>{cm.labels.map((l) => <th key={l}>{l}</th>)}</tr></thead>
                    <tbody>
                      {cm.matrix.map((row, i) => {
                        const total = row.reduce((a, b) => a + b, 0) || 1;
                        return (
                          <tr key={cm.labels[i]}>
                            <th>{cm.labels[i]}</th>
                            {row.map((v, j) => (
                              <td key={j} className={i === j ? "cm-diag" : v ? "cm-off" : ""} style={{ ["--a" as string]: v / total }}>{v}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
        <h3 className="subhead">Live measurements (this browser session)</h3>
        {live.measuredAt ? (
          <div className="kv-grid">
            <div><span>Camera frame rate</span><strong>{live.cameraFps} FPS</strong></div>
            <div><span>Landmark inference</span><strong>{live.landmarkMs} ms / frame</strong></div>
            <div><span>Backend processing</span><strong>{live.backendProcMs?.toFixed(2)} ms / frame</strong></div>
            <div><span>Classifier call</span><strong>{live.classifierMs === null ? "not measured" : `${live.classifierMs.toFixed(2)} ms`}</strong></div>
            <div><span>Signs added</span><strong>{live.signsRecognized}</strong></div>
            <div><span>Uncertain segments</span><strong>{live.uncertainSegments}</strong></div>
          </div>
        ) : (
          <p className="muted">Not measured yet — run the camera on Live Recognition first.</p>
        )}
      </Card>

      <Card title="Supported vocabulary & dataset source" className="span-half">
        <ul className="vocab-list">
          {vocab.filter((v) => v.label !== "_none").map((v) => (
            <li key={v.label}><span lang="kn">{v.kannada}</span> <span className="muted">{v.english}</span> {v.trained ? <Chip tone="ok">recognizable</Chip> : <Chip tone="muted">not trained</Chip>}</li>
          ))}
        </ul>
        <p className="small-text">
          Dataset: landmark sequences recorded locally with this application ({summary?.total_samples ?? 0} samples in {summary?.num_sessions ?? 0} session(s)), stored in <code>backend/data/dataset/</code>. No external sign-language dataset is bundled.
        </p>
      </Card>

      <Card title="Limitations" className="span-half">
        <ul className="limits">
          <li>Recognizes only the signs you have recorded and trained; anything else should come out as uncertain or background.</li>
          <li>Accuracy depends on the amount and variety of your recordings; a model trained on one signer may not generalize to others.</li>
          <li>Signs are separated by pauses or lowering the hands; fluent co-articulated signing is not segmented reliably.</li>
          <li>Recognition uses hand landmarks only (no body pose); location relative to the body is approximated from image position.</li>
          <li>Kannada output is the ordered list of recognized words, not grammatical sentence translation.</li>
          <li>Expression labels are heuristic estimates of visible facial movement, not emotions.</li>
          <li>The avatar is a simple procedural prototype; its clips are not verified ISL.</li>
        </ul>
      </Card>

      <Card title="Demonstration script (≈ 5 minutes)" className="span-half">
        <ol className="howto">
          <li><strong>Intro (30 s):</strong> open About → explain the architecture and that video stays on the laptop.</li>
          <li><strong>Live Recognition (2 min):</strong> start camera, toggle the landmark overlay, show FPS. Perform 3–4 trained signs with a pause between them; point out the stable Kannada transcript, confidence bar and that holding still does not repeat words. Perform an untrained gesture to show “uncertain”. Correct one word via its dropdown, then Copy / Speak.</li>
          <li><strong>Expressions (30 s):</strong> smile / raise eyebrows; explain the estimate is separate from the sign meaning.</li>
          <li><strong>Kannada → Sign (1 min):</strong> type <span lang="kn">ನಮಸ್ಕಾರ ನಾನು ನೀರು ದಯವಿಟ್ಟು ಬೆಂಗಳೂರು</span>; show the sequence, the unsupported-word warning, pause/replay and per-sign replay; point out captured vs placeholder badges.</li>
          <li><strong>Dataset & Model (1 min):</strong> show the per-class sample counts, retrain, and walk through the evaluation table and confusion matrix here.</li>
        </ol>
      </Card>

      <Card title="Manual webcam test checklist" className="span-half">
        <ul className="checklist">
          <li>☐ Start camera → permission prompt → live mirrored preview, FPS &gt; 15.</li>
          <li>☐ Deny permission → clear “permission denied” message.</li>
          <li>☐ Unplug webcam while running → “camera disconnected” message.</li>
          <li>☐ Stop the backend → “backend not connected”, reconnects when restarted.</li>
          <li>☐ No hands in view → activity “idle”, no words added.</li>
          <li>☐ Hold one sign still for 5 s → added once only.</li>
          <li>☐ Same sign twice with a pause between → added twice.</li>
          <li>☐ Random non-sign movement → “uncertain” or “background”, nothing added.</li>
          <li>☐ Raise threshold to 90% → fewer, more confident words.</li>
          <li>☐ Pause recognition → no new words; Resume → continues.</li>
          <li>☐ Cover face / turn away → expression shows “No face detected”.</li>
          <li>☐ Kannada → Sign with an unknown word → warning, word skipped.</li>
        </ul>
      </Card>
    </div>
  );
}
