import { useEffect, useState } from "react";
import { Icon, type IconName } from "../components/Icon";
import { ContinuousCard } from "../components/DataPipeline";
import { MetricsReport } from "../components/MetricsReport";
import { SegmentationReport } from "../components/SegmentationReport";
import { VideoPipelineTest } from "../components/VideoPipelineTest";
import { Card, Chip, Notice, Stat } from "../components/ui";
import { api } from "../services/api";
import { sessionStats } from "../services/sessionStats";
import type { ContinuousStatus, ExternalDataset, Metrics, ModelStatus, ReviewState, ValidationSummary, VocabEntry } from "../services/types";

const ARCH: { icon: IconName; title: string; text: string }[] = [
  { icon: "camera", title: "1 · Capture (browser)", text: "Webcam via getUserMedia. MediaPipe Hand and Face Landmarkers run locally (WASM/WebGL); video never leaves the browser." },
  { icon: "hand", title: "2 · Features (Python)", text: "Per hand: wrist-relative, palm-scaled shape; image and face-relative position; finger direction and palm normal; presence flags. Schema hands-face-v2, 147 values per frame." },
  { icon: "layers", title: "3 · Segmentation", text: "Motion-based segments: a sign starts on hand entry/movement and ends at a motion minimum (confidence-gated), a pause or a hand drop." },
  { icon: "database", title: "4 · Classification", text: "Segment resampled to 16 steps + velocities → scikit-learn model selected by session-grouped validation (logistic regression baseline, SVM, MLP)." },
  { icon: "text", title: "5 · Kannada output", text: "Confidence threshold, unknown/background rejection and duplicate suppression → Kannada gloss transcript with correction, punctuation, copy and speech." },
  { icon: "play", title: "6 · Kannada → Sign", text: "Normalize (NFC) → longest-match word/phrase lookup → ISL gloss sequence → animation clips on a Three.js avatar with IK arms and 15 finger joints." },
];

const REVIEW_KEYS: { key: "handshape" | "orientation" | "movement" | "location" | "non_manual"; label: string }[] = [
  { key: "handshape", label: "Handshape" },
  { key: "orientation", label: "Orientation" },
  { key: "movement", label: "Movement" },
  { key: "location", label: "Location" },
  { key: "non_manual", label: "Non-manual" },
];

function reviewChip(state: ReviewState | undefined) {
  if (state === "ok") return <Chip tone="ok">ok</Chip>;
  if (state === "wrong") return <Chip tone="bad">wrong</Chip>;
  return <Chip tone="muted">unchecked</Chip>;
}

export function AboutTesting() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [continuous, setContinuous] = useState<ContinuousStatus | null>(null);
  const [datasets, setDatasets] = useState<ExternalDataset[]>([]);

  useEffect(() => {
    api.validation().then(setValidation).catch(() => undefined);
    Promise.all([api.metrics(), api.modelStatus(), api.vocabulary()])
      .then(([m, s, v]) => {
        setMetrics(m);
        setStatus(s);
        setVocab(v.labels);
      })
      .catch((err) => setError(String(err.message || err)));
    api.continuousStatus().then(setContinuous).catch(() => undefined);
    api.datasets().then((d) => setDatasets(d.datasets)).catch(() => undefined);
  }, []);

  const signs = vocab.filter((v) => v.label !== "_none");
  const live = sessionStats;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>About &amp; Testing</h2>
          <p>How the system works, how it was trained and evaluated, what has actually been measured, and what is still a placeholder.</p>
        </div>
      </div>
      {error && <div style={{ marginBottom: 16 }}><Notice tone="bad">{error}</Notice></div>}
      <div className="stack">
        <Card title="Architecture" icon="layers">
          <div className="arch">
            {ARCH.map((a) => (
              <div key={a.title} className="arch-step">
                <h3><Icon name={a.icon} size={15} /> {a.title}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="two-col">
          <Card title="Training methodology" icon="database">
            <ul className="list">
              <li><strong>Data:</strong> public ISL video datasets (see the citations below) converted to landmarks with the same MediaPipe models as the live webcam, plus your own recordings. Synthetic data is used only inside automated tests, never for the application's models.</li>
              <li><strong>Validation:</strong> every sample is checked (label, frame order, parseable landmarks, enough hand frames, session id). Rejected samples are excluded and listed.</li>
              <li><strong>Augmentation</strong> (training folds only): temporal crop, speed change, landmark jitter, small position/scale shifts.</li>
              <li><strong>Candidates:</strong> logistic regression (baseline), RBF-SVM, 1-hidden-layer MLP with early stopping. Class-balanced, fixed random seed.</li>
              <li><strong>Selection:</strong> best macro-F1 on out-of-fold predictions; the final model is refit on all valid data and saved with its feature schema, class encoder and metadata. The previous model is archived.</li>
            </ul>
          </Card>
          <Card title="Evaluation protocol" icon="flask">
            <ul className="list">
              <li>Splits are always by <strong>whole recording session</strong>, never by frames, so no clip appears in both training and testing.</li>
              <li>With 3+ sessions, the most recent session is an <strong>independent test set</strong>. Baseline and selected model are compared on the same test recordings.</li>
              <li>The test recordings are also replayed back-to-back through the live pipeline to measure a <strong>continuous sign error rate</strong> (substitutions, misses, extra words).</li>
              <li>Reported: accuracy, per-class precision/recall/F1, macro-F1, confusion matrix, confused pairs and latency. When a figure has not been measured, the app shows “Not evaluated”.</li>
            </ul>
          </Card>
        </div>

        <Card title="Measured results" icon="flask" subtitle={status?.loaded ? `Model ${status.model_version}` : "No model trained yet"}>
          <MetricsReport metrics={metrics} />
          <h3 className="small">Live measurements in this browser session</h3>
          {live.measuredAt ? (
            <div className="stats">
              <Stat label="Camera" value={`${live.cameraFps} FPS`} />
              <Stat label="Landmarks" value={`${live.landmarkMs} ms/frame`} />
              <Stat label="Backend" value={`${live.backendProcMs?.toFixed(2)} ms/frame`} />
              <Stat label="Classifier" value={live.classifierMs === null ? "not measured" : `${live.classifierMs.toFixed(2)} ms`} />
              <Stat label="Signs added" value={live.signsRecognized} />
              <Stat label="Uncertain" value={live.uncertainSegments} />
            </div>
          ) : (
            <p className="muted small">Not measured yet. Run the camera on Live Recognition first.</p>
          )}
        </Card>

        <ContinuousCard status={continuous} showTrain={false} />

        <SegmentationReport />

        <VideoPipelineTest />

        <Card title="Datasets and citations" icon="database">
          <ul className="list">
            {datasets.map((d) => (
              <li key={d.key}>
                <strong>{d.name}</strong>: {d.license}, {d.task} recognition. Status: {d.download_state}
                {d.import_summary ? `, ${d.import_summary.accepted} videos imported` : ""}.
                <div className="xs muted">{d.citation}</div>
              </li>
            ))}
            <li><strong>Your own webcam recordings</strong> made on the Dataset &amp; Model page ({validation?.valid ?? 0} valid samples).</li>
          </ul>
        </Card>

        <Card title="Supported vocabulary" icon="text" subtitle="Sign → Kannada mappings. Wording got an AI-assisted check (hover * for remarks); native-speaker and ISL review are still pending">
          <div className="vocab-grid">
            {signs.map((v) => (
              <div key={v.label} className="vocab-item">
                <span className="kn" lang="kn">{v.kannada}</span>
                <span className="en">{v.isl_gloss} · {v.english}</span>
                <span>
                  {v.trained ? <Chip tone="ok">recognisable</Chip> : <Chip tone="muted">not trained</Chip>}
                  {v.kannada_review && <Chip tone={v.kannada_review.status === "changed" ? "warn" : "muted"} title={`${v.kannada_review.note || "no remarks"} · ${v.kannada_review.by}`}>wording {v.kannada_review.status === "changed" ? "corrected" : "checked"}{v.kannada_review.note ? " *" : ""}</Chip>}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Avatar animations: verification status" icon="hand" subtitle="A smooth animation is not necessarily a correct sign. Each clip needs an ISL reviewer.">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sign</th><th>Clip</th>{REVIEW_KEYS.map((k) => <th key={k.key}>{k.label}</th>)}<th>Verified</th></tr></thead>
              <tbody>
                {signs.map((v) => {
                  const a = v.animation;
                  return (
                    <tr key={v.label}>
                      <td><span lang="kn" className="kn">{v.kannada}</span> <span className="muted xs">{v.isl_gloss}</span></td>
                      <td>{a?.available ? <Chip tone={a.type === "captured" ? "info" : "sim"}>{a.type}</Chip> : <Chip tone="warn">none</Chip>}</td>
                      {REVIEW_KEYS.map((k) => <td key={k.key}>{reviewChip(a?.review?.[k.key])}</td>)}
                      <td>{a?.verified ? <Chip tone="ok">yes</Chip> : <Chip tone="bad">no</Chip>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted xs">Checklist stored in <code>backend/data/animation_mapping.json</code>. Set each item to <code>ok</code>/<code>wrong</code> after review against a named reference; set <code>verified: true</code> only when all items are ok.</p>
        </Card>

        <div className="two-col">
          <Card title="What is real and what is a placeholder" icon="info">
            <div className="table-wrap">
              <table>
                <tbody>
                  <tr><td>Hand / face landmarks</td><td><Chip tone="ok">real</Chip> MediaPipe pretrained, on-device</td></tr>
                  <tr><td>Sign classifier</td><td>{status?.loaded ? <Chip tone="ok">trained on your data</Chip> : <Chip tone="warn">not trained yet</Chip>}</td></tr>
                  <tr><td>Continuous recognition</td><td><Chip tone="ok">real</Chip> supported isolated signs, segmented in a stream</td></tr>
                  <tr><td>Simulated demo mode</td><td><Chip tone="sim">simulated</Chip> scripted, clearly labelled</td></tr>
                  <tr><td>Kannada text</td><td><Chip tone="info">gloss</Chip> supported vocabulary, not grammatical translation</td></tr>
                  <tr><td>Facial expression</td><td><Chip tone="info">heuristic</Chip> blendshape rules, not emotion</td></tr>
                  <tr><td>Avatar clips</td><td><Chip tone="sim">placeholder</Chip> or <Chip tone="info">captured</Chip>; none verified ISL</td></tr>
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Known limitations" icon="alert">
            <ul className="list">
              <li>Recognises only recorded and trained signs. Other gestures should come out as uncertain or background.</li>
              <li>Accuracy depends on the amount and variety of recordings; a single-signer model may not generalise to other signers.</li>
              <li>Fluent co-articulated signing without any slowing between signs may merge into one segment.</li>
              <li>Hand + face landmarks only (no full body pose); depth is approximate.</li>
              <li>Output is a Kannada gloss in signing order, not grammatical ISL → Kannada translation.</li>
              <li>Kannada morphology is not analysed: inflected forms work only if listed in the dictionary.</li>
              <li>The procedural avatar is a prototype. Placeholder clips are not ISL.</li>
            </ul>
          </Card>
        </div>

        <div className="two-col">
          <Card title="Demonstration script (≈ 5 min)" icon="play">
            <ol className="list">
              <li><strong>About (30 s):</strong> architecture and privacy (video stays on the laptop).</li>
              <li><strong>Live Recognition (2 min):</strong> start camera, show overlay and FPS. Sign 3–4 trained words; show the stable transcript, that a held sign is not repeated, an “uncertain” rejection, a correction via the word menu, then “?” + Copy + Speak.</li>
              <li><strong>Expression (20 s):</strong> smile / raise eyebrows; explain it is separate from sign meaning.</li>
              <li><strong>Kannada → Sign (1 min):</strong> <span lang="kn">ನಿಮ್ಮ ಹೆಸರು ಏನು?</span> (phrase → YOUR NAME WHAT), then <span lang="kn">ನಮಸ್ಕಾರ ಬೆಂಗಳೂರು</span> to show the unsupported-word warning.</li>
              <li><strong>Dataset &amp; Model (1 min):</strong> per-class counts, validation, training progress, comparison table and confusion matrix.</li>
            </ol>
          </Card>
          <Card title="Manual webcam test checklist" icon="check">
            <ul className="list list-plain">
              {[
                "Start camera → permission prompt → mirrored preview, FPS > 15",
                "Deny permission → clear permission message",
                "Unplug webcam → “camera disconnected” message",
                "Stop backend → “not connected”; reconnects when restarted",
                "No hands → waiting, nothing added",
                "Hold one sign still for 5 s → added once",
                "Same sign twice with a pause → added twice",
                "Two different signs with only a brief slow-down → both added",
                "Random movement → uncertain / background, nothing added",
                "Pause → no new words; Resume → continues",
                "Cover face → expression “No face detected”",
                "Kannada → Sign with an unknown word → bilingual warning, word skipped",
              ].map((t) => <li key={t}>☐ {t}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
