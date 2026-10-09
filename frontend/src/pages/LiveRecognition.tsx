import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraPanel } from "../components/CameraPanel";
import { Card, Chip, ConfidenceBar, Notice } from "../components/ui";
import { EXPRESSION_TEXT, ExpressionSmoother, type ExpressionEstimate } from "../expression/expressionClassifier";
import { api } from "../services/api";
import { RecognitionSocket, type ServerMessage, type SocketStatus } from "../services/recognitionSocket";
import { sessionStats } from "../services/sessionStats";
import { kannadaVoice, onVoicesChanged, speakKannada } from "../services/speech";
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
  const [stillMs, setStillMs] = useState(600);
  const [serverState, setServerState] = useState<ServerState>(EMPTY_STATE);
  const [latest, setLatest] = useState<{ token: TranscriptToken; top: Candidate[]; simulated: boolean } | null>(null);
  const [eventMsg, setEventMsg] = useState<string>("");
  const [tokens, setTokens] = useState<TranscriptToken[]>([]);
  const [manualText, setManualText] = useState<string | null>(null);
  const [expression, setExpression] = useState<ExpressionEstimate | null>(null);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [speakMsg, setSpeakMsg] = useState<string>("");
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
        setTokens((t) => [...t, token]);
        setLatest({ token, top: msg.top ?? [], simulated: Boolean(msg.simulated) });
        setEventMsg("");
        if (!msg.simulated) sessionStats.signsRecognized++;
        break;
      }
      case "uncertain": {
        const best = msg.top?.[0];
        setEventMsg(best ? `Uncertain sign — best guess ${best.kannada || best.label} (${Math.round(best.confidence * 100)}%) is below the threshold, so nothing was added.` : "Uncertain sign.");
        sessionStats.uncertainSegments++;
        break;
      }
      case "segment":
        if (msg.result === "no_model") setEventMsg(`Sign movement detected (${msg.frames} frames) but no trained model is loaded — record data and train on the Dataset & Model page.`);
        else if (msg.result === "background") setEventMsg("Movement classified as background / no sign.");
        else if (msg.result === "too_short") setEventMsg("Movement too short to classify.");
        else if (msg.result === "suppressed_duplicate") setEventMsg("Same sign detected twice in a row — duplicate suppressed.");
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

  // push settings to the backend whenever they change (and on reconnect)
  useEffect(() => {
    if (socketStatus !== "open") return;
    socketRef.current?.send({ type: "config", settings: { confidence_threshold: threshold, mode, still_ms: stillMs } });
  }, [threshold, mode, stillMs, socketStatus]);

  useEffect(() => {
    if (socketStatus === "open") socketRef.current?.send({ type: "demo", enabled: demo });
  }, [demo, socketStatus]);

  const onResult = useCallback((r: VisionResult) => {
    if (!pausedRef.current && !demoRef.current) socketRef.current?.send({ type: "frame", ...r.frame });
    if (exprEnabledRef.current) exprValueRef.current = exprRef.current.update(r.faceDetected ? r.blendshapes : null);
  }, []);

  const vision = useVision({ face: exprEnabled, overlay, onResult });

  useEffect(() => {
    if (vision.camera !== "on") return;
    sessionStats.cameraFps = vision.stats.fps;
    sessionStats.landmarkMs = vision.stats.inferenceMs;
    sessionStats.backendProcMs = serverState.proc_ms;
    sessionStats.classifierMs = serverState.latency_ms;
    sessionStats.measuredAt = new Date().toLocaleTimeString();
  }, [vision.camera, vision.stats, serverState.proc_ms, serverState.latency_ms]);

  const transcriptText = useMemo(() => tokens.map((t) => t.kannada).join(" "), [tokens]);
  const displayText = manualText ?? transcriptText;

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    socketRef.current?.send({ type: "pause", paused: next });
  };
  const resetRecognition = () => {
    socketRef.current?.send({ type: "reset", clear: false });
    setLatest(null);
    setEventMsg("Recognition buffers reset.");
    exprRef.current.reset();
  };
  const clearTranscript = () => {
    socketRef.current?.send({ type: "reset", clear: true });
    setTokens([]);
    setManualText(null);
    setLatest(null);
    setEventMsg("");
  };
  const correctToken = (index: number, label: string) => {
    setTokens((ts) => {
      if (label === "__delete__") return ts.filter((_, i) => i !== index);
      const entry = vocab.find((v) => v.label === label);
      if (!entry) return ts;
      return ts.map((t, i) => (i === index ? { ...t, label, kannada: entry.kannada, english: entry.english, source: "edited" } : t));
    });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setSpeakMsg("Clipboard access was blocked by the browser.");
    }
  };
  const speak = async () => {
    setSpeakMsg("");
    try {
      const how = await speakKannada(displayText, allowOnlineTts);
      setSpeakMsg(how === "local" ? "Speaking with the installed Kannada voice." : "Speaking via online TTS.");
    } catch (err) {
      setSpeakMsg(String((err as Error).message || err));
    }
  };

  const modelLoaded = Boolean(model?.loaded);
  const sourceChip = demo ? (
    <Chip tone="sim">SIMULATED DEMO — not camera recognition</Chip>
  ) : modelLoaded ? (
    <Chip tone="ok">Trained model · {model?.num_classes} classes</Chip>
  ) : (
    <Chip tone="warn">No trained model — recognition disabled</Chip>
  );

  const tentative = serverState.tentative;

  return (
    <div className="page-grid live-grid">
      <Card title="Camera" className="span-camera">
        <CameraPanel
          vision={vision}
          overlay={overlay}
          setOverlay={setOverlay}
          badge={vision.camera === "on" ? (
            <span className={`activity activity-${serverState.activity}`}>
              {paused ? "paused" : serverState.activity === "signing" ? "● signing" : `${serverState.hands} hand(s) · idle`}
            </span>
          ) : null}
          extraControls={
            <label className="toggle">
              <input type="checkbox" checked={exprEnabled} onChange={(e) => { setExprEnabled(e.target.checked); exprRef.current.reset(); exprValueRef.current = null; setExpression(null); }} /> Expression analysis
            </label>
          }
        />
        <div className="toolbar">
          <button className="btn" onClick={togglePause} disabled={demo}>{paused ? "Resume recognition" : "Pause recognition"}</button>
          <button className="btn" onClick={resetRecognition}>Reset</button>
          <button className="btn btn-danger-ghost" onClick={clearTranscript}>Clear translation</button>
        </div>
        <details className="settings">
          <summary>Recognition settings</summary>
          <div className="settings-grid">
            <label>
              Confidence threshold: <strong>{Math.round(threshold * 100)}%</strong>
              <input type="range" min={0.3} max={0.95} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </label>
            <label>
              Boundary mode
              <select value={mode} onChange={(e) => setMode(e.target.value as "segment" | "sliding")}>
                <option value="segment">Pause / hand-drop boundaries (recommended)</option>
                <option value="sliding">Sliding window + smoothing (experimental)</option>
              </select>
            </label>
            <label>
              Pause that ends a sign: <strong>{stillMs} ms</strong>
              <input type="range" min={300} max={1500} step={100} value={stillMs} onChange={(e) => setStillMs(Number(e.target.value))} disabled={mode !== "segment"} />
            </label>
            <label className="toggle">
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} /> Simulated demo mode (scripted words, ignores camera)
            </label>
          </div>
        </details>
      </Card>

      <Card title="Recognized sign" actions={sourceChip} className="span-result">
        <div className="status-line">
          <Chip tone={socketStatus === "open" ? "ok" : socketStatus === "connecting" ? "warn" : "bad"}>
            Backend: {socketStatus === "open" ? "connected" : socketStatus}
          </Chip>
          {serverState.proc_ms > 0 && <Chip tone="info" title="Backend processing time per frame">{serverState.proc_ms.toFixed(2)} ms backend</Chip>}
          {serverState.latency_ms !== null && <Chip tone="info" title="Classifier inference time">{serverState.latency_ms.toFixed(2)} ms classifier</Chip>}
        </div>
        {socketStatus !== "open" && (
          <Notice tone="bad">The recognition backend is not connected. Start it with <code>start-backend.ps1</code>; this page reconnects automatically.</Notice>
        )}
        {!modelLoaded && socketStatus === "open" && !demo && (
          <Notice tone="warn">No trained sign model is loaded{model?.error ? ` (${model.error})` : ""}. The camera and segmentation still run, but signs cannot be classified until you record samples and train on <strong>Dataset & Model</strong>. Use <em>Simulated demo mode</em> only to show the interface.</Notice>
        )}
        <div className="latest">
          {latest ? (
            <>
              <div className="latest-kn" lang="kn">{latest.token.kannada}</div>
              <div className="latest-en">
                {latest.token.english} <span className="muted">({latest.token.label})</span>
                {latest.simulated && <Chip tone="sim">simulated</Chip>}
              </div>
              <ConfidenceBar value={latest.simulated ? null : latest.token.confidence} threshold={threshold} />
              {latest.top.length > 1 && (
                <div className="alts">Alternatives: {latest.top.slice(1).map((c) => `${c.kannada || c.label} ${Math.round(c.confidence * 100)}%`).join(" · ")}</div>
              )}
            </>
          ) : (
            <div className="latest-empty">Perform a supported sign. Raise your hands into view, sign, then lower them or pause.</div>
          )}
        </div>
        <div className="tentative">
          {tentative && serverState.activity === "signing" ? (
            <>Currently signing… best guess <strong lang="kn">{tentative.kannada || tentative.label}</strong> ({Math.round(tentative.confidence * 100)}%, not yet added)</>
          ) : (
            <span className="muted">{eventMsg || "Waiting for a sign."}</span>
          )}
        </div>
      </Card>

      <Card
        title="Continuous transcript (Kannada)"
        className="span-transcript"
        actions={
          <>
            <button className="btn btn-small" onClick={copy} disabled={!displayText}>{copied ? "Copied" : "Copy"}</button>
            <button className="btn btn-small btn-primary" onClick={speak} disabled={!displayText}>🔊 Speak</button>
          </>
        }
      >
        <div className="tokens">
          {tokens.length === 0 && <span className="muted">Recognized signs will appear here, in order. Click a word to correct or remove it.</span>}
          {tokens.map((t, i) => (
            <label key={`${t.t}-${i}`} className={`token token-${t.source}`} title={`${t.english} · ${t.source} · ${Math.round(t.confidence * 100)}%`}>
              <span lang="kn">{t.kannada}</span>
              <select value={t.label} onChange={(e) => correctToken(i, e.target.value)} aria-label={`Correct word ${i + 1}`}>
                {vocab.map((v) => <option key={v.label} value={v.label}>{v.kannada} ({v.english})</option>)}
                <option value="__delete__">✕ remove</option>
              </select>
            </label>
          ))}
        </div>
        <label className="field-label" htmlFor="transcript-text">Editable text</label>
        <textarea id="transcript-text" lang="kn" className="kn-text" rows={3} value={displayText} onChange={(e) => setManualText(e.target.value)} placeholder="ಅನುವಾದ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ" />
        <div className="toolbar small">
          {manualText !== null && <button className="btn btn-small" onClick={() => setManualText(null)}>Discard edits (sync with transcript)</button>}
          <label className="toggle" title="Sends the text to Google via the backend's gTTS integration">
            <input type="checkbox" checked={allowOnlineTts} onChange={(e) => setAllowOnlineTts(e.target.checked)} /> Allow online TTS fallback (sends text to Google)
          </label>
          <Chip tone={hasKnVoice ? "ok" : "muted"}>{hasKnVoice ? "Kannada voice installed" : "No local Kannada voice"}</Chip>
        </div>
        {speakMsg && <div className="muted small-text">{speakMsg}</div>}
        <p className="muted small-text">
          This is continuous recognition of <strong>supported isolated signs</strong>, joined in the order performed. It is not grammatical ISL → Kannada sentence translation.
        </p>
      </Card>

      <Card title="Facial expression (estimate)" className="span-expression">
        {!exprEnabled ? (
          <span className="muted">Expression analysis is off.</span>
        ) : vision.stats.faceError ? (
          <Notice tone="warn">Face model unavailable: {vision.stats.faceError}</Notice>
        ) : (
          <>
            <div className={`expr expr-${expression?.label ?? "none"}`}>
              {expression ? EXPRESSION_TEXT[expression.label] : vision.camera === "on" ? "Analysing…" : "Start the camera"}
            </div>
            {expression && expression.label !== "no_face" && (
              <div className="expr-scores">
                {(["happy", "sad", "angry", "surprised"] as const).map((k) => (
                  <div key={k} className="expr-score">
                    <span>{k}</span>
                    <div className="mini-bar"><div style={{ width: `${Math.min(100, expression.scores[k] * 50)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <p className="muted small-text">
          A rule-based estimate of the <em>visible</em> expression from face-landmark blendshapes (heuristic intensity, not a calibrated probability). It does not reveal how someone feels. In sign languages, facial expressions are also grammar, so this estimate is shown separately and never changes a recognized sign.
        </p>
      </Card>
    </div>
  );
}
