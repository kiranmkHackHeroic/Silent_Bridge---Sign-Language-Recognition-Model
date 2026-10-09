import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraPanel } from "../components/CameraPanel";
import { Icon } from "../components/Icon";
import { Btn, Card, Chip, ConfidenceBar, Notice, StatusDot } from "../components/ui";
import { EXPRESSION_TEXT, ExpressionSmoother, type ExpressionEstimate } from "../expression/expressionClassifier";
import { api } from "../services/api";
import { RecognitionSocket, type ServerMessage, type SocketStatus } from "../services/recognitionSocket";
import { sessionStats } from "../services/sessionStats";
import { kannadaVoice, onVoicesChanged, speakKannada } from "../services/speech";
import {
  PUNCTUATION, correctAt, exportText, fromServerToken, insertPunctuation, joinTranscript, removeAt,
  type TranscriptItem,
} from "../services/transcript";
import type { Candidate, ModelStatus, TranscriptToken, VocabEntry } from "../services/types";
import { useVision, type VisionResult } from "../services/useVision";

interface ServerState {
  activity: string;
  hands: number;
  motion: number;
  buffer: number;
  tentative: Candidate | null;
  proc_ms: number;
  latency_ms: number | null;
}

type Hero =
  | { kind: "sign"; token: TranscriptToken; top: Candidate[]; simulated: boolean; boundary?: string; at: number }
  | { kind: "uncertain"; best: Candidate | null; at: number };

const EMPTY_STATE: ServerState = { activity: "idle", hands: 0, motion: 0, buffer: 0, tentative: null, proc_ms: 0, latency_ms: null };

export function LiveRecognition() {
  const [overlay, setOverlay] = useState(true);
  const [exprEnabled, setExprEnabled] = useState(true);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("closed");
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [paused, setPaused] = useState(false);
  const [demo, setDemo] = useState(false);
  const [threshold, setThreshold] = useState(0.6);
  const [mode, setMode] = useState<"segment" | "sliding">("segment");
  const [dipSplit, setDipSplit] = useState(false);
  const [stillMs, setStillMs] = useState(800);
  const [serverState, setServerState] = useState<ServerState>(EMPTY_STATE);
  const [hero, setHero] = useState<Hero | null>(null);
  const [eventMsg, setEventMsg] = useState("");
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [manualText, setManualText] = useState<string | null>(null);
  const [expression, setExpression] = useState<ExpressionEstimate | null>(null);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [speakMsg, setSpeakMsg] = useState<{ tone: "info" | "warn"; text: string } | null>(null);
  const [allowOnlineTts, setAllowOnlineTts] = useState(false);
  const [hasKnVoice, setHasKnVoice] = useState(false);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<RecognitionSocket | null>(null);
  const stateRef = useRef<ServerState>(EMPTY_STATE);
  const exprRef = useRef(new ExpressionSmoother());
  const exprValueRef = useRef<ExpressionEstimate | null>(null);
  const pausedRef = useRef(paused);
  const demoRef = useRef(demo);
  const exprEnabledRef = useRef(exprEnabled);
  pausedRef.current = paused;
  demoRef.current = demo;
  exprEnabledRef.current = exprEnabled;

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "hello":
        setModel(msg.model);
        break;
      case "state":
        stateRef.current = msg as unknown as ServerState;
        break;
      case "sign": {
        const token = msg.token as TranscriptToken;
        setItems((t) => [...t, fromServerToken(token)]);
        setHero({ kind: "sign", token, top: msg.top ?? [], simulated: Boolean(msg.simulated), boundary: msg.boundary, at: Date.now() });
        setEventMsg(msg.boundary === "motion_minimum" ? "Sign boundary found at a pause in hand movement." : "");
        if (!msg.simulated) sessionStats.signsRecognized++;
        break;
      }
      case "uncertain":
        setHero({ kind: "uncertain", best: msg.top?.[0] ?? null, at: Date.now() });
        setEventMsg("Not confident enough. Nothing was added. Try the sign again more clearly.");
        sessionStats.uncertainSegments++;
        break;
      case "segment":
        if (msg.result === "no_model") setEventMsg(`Movement detected (${msg.frames} frames) but no trained model is loaded.`);
        else if (msg.result === "background") setEventMsg("Movement recognised as background / not a sign.");
        else if (msg.result === "too_short") setEventMsg("Movement too short to classify.");
        else if (msg.result === "suppressed_duplicate") setEventMsg("Same sign detected twice in a row; the duplicate was suppressed.");
        else if (msg.result === "continuation") setEventMsg("Continuation of the previous sign; not added again.");
        break;
      case "error":
        setEventMsg(`Backend: ${msg.message}`);
        break;
    }
  }, []);

  useEffect(() => {
    const sock = new RecognitionSocket(handleMessage, setSocketStatus);
    socketRef.current = sock;
    sock.connect();
    api.vocabulary().then((v) => setVocab(v.labels.filter((l) => l.emit && l.kannada))).catch(() => undefined);
    const timer = window.setInterval(() => {
      setServerState({ ...stateRef.current });
      if (exprValueRef.current) setExpression(exprValueRef.current);
    }, 120);
    const updateVoice = () => setHasKnVoice(Boolean(kannadaVoice()));
    updateVoice();
    const off = onVoicesChanged(updateVoice);
    return () => {
      window.clearInterval(timer);
      off();
      sock.close();
    };
  }, [handleMessage]);

  useEffect(() => {
    if (socketStatus !== "open") return;
    socketRef.current?.send({ type: "config", settings: { confidence_threshold: threshold, mode, still_ms: stillMs, dip_split: dipSplit } });
  }, [threshold, mode, stillMs, dipSplit, socketStatus]);

  useEffect(() => {
    if (socketStatus === "open") socketRef.current?.send({ type: "demo", enabled: demo });
  }, [demo, socketStatus]);

  const onResult = useCallback((r: VisionResult) => {
    if (!pausedRef.current && !demoRef.current) socketRef.current?.send({ type: "frame", ...r.frame });
    if (exprEnabledRef.current) exprValueRef.current = exprRef.current.update(r.faceDetected ? r.blendshapes : null);
  }, []);

  // The face landmarker always runs: its face box gives the "location relative to the face" features.
  const vision = useVision({ face: true, overlay, onResult });

  useEffect(() => {
    if (vision.camera !== "on") return;
    sessionStats.cameraFps = vision.stats.fps;
    sessionStats.landmarkMs = vision.stats.inferenceMs;
    sessionStats.backendProcMs = serverState.proc_ms;
    sessionStats.classifierMs = serverState.latency_ms;
    sessionStats.measuredAt = new Date().toLocaleTimeString();
  }, [vision.camera, vision.stats, serverState.proc_ms, serverState.latency_ms]);

  const transcriptText = useMemo(() => joinTranscript(items), [items]);
  const displayText = manualText ?? transcriptText;

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    socketRef.current?.send({ type: "pause", paused: next });
  };
  const resetRecognition = () => {
    socketRef.current?.send({ type: "reset", clear: false });
    setHero(null);
    setEventMsg("Recognition buffers reset.");
    exprRef.current.reset();
  };
  const clearTranscript = () => {
    socketRef.current?.send({ type: "reset", clear: true });
    setItems([]);
    setManualText(null);
    setHero(null);
    setEventMsg("");
  };
  const correct = (index: number, label: string) => {
    if (label === "__delete__") return setItems((ts) => removeAt(ts, index));
    const entry = vocab.find((v) => v.label === label);
    if (entry) setItems((ts) => correctAt(ts, index, entry));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText(displayText));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setSpeakMsg({ tone: "warn", text: "The browser blocked clipboard access. Select the text and press Ctrl+C." });
    }
  };
  const speak = async () => {
    setSpeakMsg(null);
    try {
      const how = await speakKannada(exportText(displayText), allowOnlineTts);
      setSpeakMsg({ tone: "info", text: how === "local" ? "Speaking with the installed Kannada voice." : "Speaking via online TTS (text sent to Google)." });
    } catch (err) {
      setSpeakMsg({ tone: "warn", text: String((err as Error).message || err) });
    }
  };

  const modelLoaded = Boolean(model?.loaded);
  const tentative = serverState.activity === "signing" ? serverState.tentative : null;
  const sourceChip = demo ? (
    <Chip tone="sim" icon="info">Simulated demo</Chip>
  ) : modelLoaded ? (
    <Chip tone="ok" icon="check">Trained model · {model?.num_classes} classes</Chip>
  ) : (
    <Chip tone="warn" icon="alert">No trained model</Chip>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Live Recognition</h2>
          <p>Sign continuously in front of the camera. Each completed sign from the trained vocabulary is added once to the Kannada transcript.</p>
        </div>
        <div className="status-row">
          <span className="status-item"><StatusDot tone={socketStatus === "open" ? "ok" : socketStatus === "connecting" ? "warn" : "bad"} /> Backend {socketStatus === "open" ? "connected" : socketStatus}</span>
          {sourceChip}
        </div>
      </div>

      {socketStatus !== "open" && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="bad" title="Recognition backend not connected">Start it with <code>start-backend.ps1</code>. This page reconnects automatically.</Notice>
        </div>
      )}

      <div className="live-layout">
        <div className="stack">
          <Card title="Camera" icon="camera">
            <CameraPanel
              vision={vision}
              overlay={overlay}
              setOverlay={setOverlay}
              topLeft={
                paused ? <span className="pill"><Icon name="pause" size={12} /> Paused</span>
                : serverState.activity === "signing" ? <span className="pill pill-live"><StatusDot tone="ok" /> Signing</span>
                : <span className="pill">{serverState.hands} hand(s) · waiting</span>
              }
              topRight={demo ? <span className="pill">Simulated demo</span> : undefined}
              controls={
                <Btn icon={paused ? "play" : "pause"} onClick={togglePause} disabled={demo}>
                  {paused ? "Resume" : "Pause"}
                </Btn>
              }
              switches={
                <label className="switch">
                  <input type="checkbox" checked={exprEnabled} onChange={(e) => {
                    setExprEnabled(e.target.checked);
                    exprRef.current.reset();
                    exprValueRef.current = null;
                    setExpression(null);
                  }} /> Expression analysis
                </label>
              }
            />
            <details className="disclosure">
              <summary><Icon name="settings" size={15} /> Recognition settings</summary>
              <div className="disclosure-body">
                <div className="form-grid cols-2">
                  <label className="field">
                    <span>Confidence threshold: {Math.round(threshold * 100)}%</span>
                    <input type="range" min={0.3} max={0.95} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
                    <span className="hint">Signs below this are reported as uncertain and not added.</span>
                  </label>
                  <label className="field">
                    <span>Pause that ends a sign: {stillMs} ms</span>
                    <input type="range" min={300} max={1500} step={100} value={stillMs} onChange={(e) => setStillMs(Number(e.target.value))} disabled={mode !== "segment"} />
                    <span className="hint">Fallback boundary. Lowering your hands also ends a sign.</span>
                  </label>
                  <label className="field">
                    <span>Segmentation</span>
                    <select value={mode} onChange={(e) => setMode(e.target.value as "segment" | "sliding")}>
                      <option value="segment">Motion-based segments (recommended)</option>
                      <option value="sliding">Sliding window + smoothing (experimental)</option>
                    </select>
                  </label>
                  <div className="field">
                    <span>Options</span>
                    <label className="switch">
                      <input type="checkbox" checked={dipSplit} onChange={(e) => setDipSplit(e.target.checked)} disabled={mode !== "segment"} />
                      Experimental: split signs at brief slow-downs (off: real ISL signs contain internal holds)
                    </label>
                    <label className="switch">
                      <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
                      Simulated demo (scripted words, ignores camera)
                    </label>
                  </div>
                </div>
              </div>
            </details>
            <div className="toolbar">
              <Btn icon="refresh" size="sm" variant="ghost" onClick={resetRecognition}>Reset recognition</Btn>
              <span className="grow" />
              {serverState.proc_ms > 0 && <span className="muted xs">backend {serverState.proc_ms.toFixed(2)} ms/frame</span>}
              {serverState.latency_ms !== null && <span className="muted xs">· classifier {serverState.latency_ms.toFixed(2)} ms</span>}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="Current sign" icon="hand" actions={sourceChip}>
            {!modelLoaded && socketStatus === "open" && !demo && (
              <Notice tone="warn" title="No trained sign model">
                The camera and sign segmentation work, but signs cannot be classified until you record samples and train on <strong>Dataset &amp; Model</strong>.
              </Notice>
            )}
            <div className={`result-hero ${hero ? "fresh" : ""}`} key={hero?.at ?? 0}>
              {hero?.kind === "sign" ? (
                <>
                  <div className="result-source">
                    {hero.simulated ? <Chip tone="sim">Simulated</Chip> : hero.token.source === "model" ? <Chip tone="ok">Recognised</Chip> : null}
                  </div>
                  <div className="result-kn" lang="kn">{hero.token.kannada}</div>
                  <div className="result-meta">
                    <span>{hero.token.english}</span>
                    <span className="muted">· {hero.token.label}</span>
                  </div>
                  {!hero.simulated && <ConfidenceBar value={hero.token.confidence} threshold={threshold} label="Model confidence (not a calibrated accuracy)" />}
                  {hero.top.length > 1 && (
                    <div className="alts">Next best: {hero.top.slice(1).map((c) => `${c.kannada || c.label} ${Math.round(c.confidence * 100)}%`).join(" · ")}</div>
                  )}
                </>
              ) : hero?.kind === "uncertain" ? (
                <>
                  <div className="result-source"><Chip tone="warn" icon="alert">Uncertain · not added</Chip></div>
                  <div className="result-kn muted" lang="kn">{hero.best?.kannada || "?"}</div>
                  <div className="result-meta">Best guess {hero.best ? `${hero.best.english} (${Math.round(hero.best.confidence * 100)}%)` : "none"}, below the {Math.round(threshold * 100)}% threshold</div>
                </>
              ) : (
                <div className="result-empty">
                  <Icon name="hand" size={30} />
                  <div>{demo ? "Simulated words will appear here." : "Raise your hands into view and perform a supported sign."}</div>
                </div>
              )}
            </div>
            <div className="live-status">
              {tentative ? (
                <><StatusDot tone="ok" /> Signing… current guess <strong lang="kn">{tentative.kannada || tentative.label}</strong> <span className="muted">({Math.round(tentative.confidence * 100)}%, not yet added)</span></>
              ) : (
                <span className="muted">{eventMsg || (paused ? "Recognition paused." : "Waiting for a sign.")}</span>
              )}
            </div>
            {model?.loaded && <div className="muted xs">Model {model.model_version ?? ""} · {model.model_type} · classes: {model.classes.filter((c) => c !== "_none").join(", ")}</div>}
          </Card>

          <Card
            title="Kannada transcript"
            icon="text"
            subtitle="Kannada gloss of the supported signs, in the order signed"
            actions={
              <>
                <Btn icon={copied ? "check" : "copy"} size="sm" onClick={copy} disabled={!displayText}>{copied ? "Copied" : "Copy"}</Btn>
                <Btn icon="volume" size="sm" variant="primary" onClick={speak} disabled={!displayText}>Speak</Btn>
              </>
            }
          >
            <div className="transcript-box" aria-label="Recognised words">
              {items.length === 0 && <span className="muted small">Recognised signs appear here. Click a word to correct or remove it.</span>}
              {items.map((t, i) => t.kind === "punct" ? (
                <span key={t.id} className="token token-punct" title="Punctuation">
                  {t.kannada}
                  <button className="btn btn-ghost btn-sm" style={{ minHeight: 0, padding: 0 }} onClick={() => setItems((ts) => removeAt(ts, i))} aria-label="Remove punctuation"><Icon name="x" size={12} /></button>
                </span>
              ) : (
                <label key={t.id} className={`token token-${t.source}`} title={`${t.english} · ${t.source}${t.confidence !== null ? ` · ${Math.round(t.confidence * 100)}%` : ""} (click to correct)`}>
                  <span lang="kn">{t.kannada}</span>
                  <select value={t.label} onChange={(e) => correct(i, e.target.value)} aria-label={`Correct word ${i + 1}: ${t.kannada}`}>
                    {vocab.map((v) => <option key={v.label} value={v.label}>{v.kannada} ({v.english})</option>)}
                    <option value="__delete__">✕ Remove this word</option>
                  </select>
                </label>
              ))}
            </div>
            <div className="toolbar">
              <span className="muted xs">Insert:</span>
              {PUNCTUATION.map((p) => (
                <Btn key={p.mark} size="sm" onClick={() => setItems((ts) => insertPunctuation(ts, p.mark))} disabled={!items.length} title={p.name} aria-label={`Insert ${p.name}`}>{p.mark}</Btn>
              ))}
              <span className="grow" />
              <Btn icon="trash" size="sm" variant="danger" onClick={clearTranscript} disabled={!items.length && !manualText}>Clear</Btn>
            </div>
            <label className="field">
              <span>Editable text {manualText !== null && <Chip tone="warn">edited by hand</Chip>}</span>
              <textarea lang="kn" className="kn-input" rows={2} value={displayText} onChange={(e) => setManualText(e.target.value)} placeholder="ಅನುವಾದ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ" />
            </label>
            <div className="toolbar">
              {manualText !== null && <Btn size="sm" variant="ghost" icon="replay" onClick={() => setManualText(null)}>Sync with transcript</Btn>}
              <label className="switch xs" title="Uses the backend's gTTS integration, which sends the text to Google">
                <input type="checkbox" checked={allowOnlineTts} onChange={(e) => setAllowOnlineTts(e.target.checked)} /> Online TTS fallback
              </label>
              <span className="grow" />
              <Chip tone={hasKnVoice ? "ok" : "muted"}>{hasKnVoice ? "Kannada voice installed" : "No local Kannada voice"}</Chip>
            </div>
            {speakMsg && <Notice tone={speakMsg.tone}>{speakMsg.text}</Notice>}
          </Card>

          <Card title="Facial expression" icon="face" subtitle="Visible-expression estimate, shown separately from the sign">
            {!exprEnabled ? (
              <span className="muted small">Expression analysis is off.</span>
            ) : vision.stats.faceError ? (
              <Notice tone="warn">Face model unavailable: {vision.stats.faceError}</Notice>
            ) : (
              <>
                <div className="expr-row">
                  <span className="expr-label">{expression ? EXPRESSION_TEXT[expression.label] : vision.camera === "on" ? "Analysing…" : "Start the camera"}</span>
                  {expression && expression.label !== "no_face" && <Chip tone="muted">heuristic</Chip>}
                </div>
                {expression && expression.label !== "no_face" && (
                  <div className="expr-bars">
                    {(["happy", "sad", "angry", "surprised"] as const).map((k) => (
                      <FragmentBar key={k} label={k} value={expression.scores[k]} />
                    ))}
                  </div>
                )}
              </>
            )}
            <p className="muted xs">
              A rule-based estimate from face-landmark blendshapes (heuristic intensity, not a calibrated probability). It does not tell you how someone feels. In sign languages, facial expressions are also grammar, so this never changes a recognized sign.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function FragmentBar({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span>{label}</span>
      <div className="mini-bar"><div style={{ width: `${Math.min(100, value * 50)}%` }} /></div>
    </>
  );
}
