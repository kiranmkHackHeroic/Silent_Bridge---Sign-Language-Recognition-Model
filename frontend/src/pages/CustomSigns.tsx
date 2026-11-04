import { useEffect, useRef, useState } from "react";
import { Btn, Card, Chip, Empty, Notice } from "../components/ui";
import { useVision, type VisionResult } from "../services/useVision";
import { OnnxInferenceEngine } from "../services/onnxInference";
import {
  averageEmbeddings,
  deleteCustomSign,
  exportCustomSigns,
  importCustomSigns,
  loadCustomSigns,
  saveCustomSign,
  type CustomSign,
} from "../services/customSigns";
import type { LandmarkFrame } from "../services/types";

export function CustomSigns() {
  const [signs, setSigns] = useState<CustomSign[]>(loadCustomSigns);
  const [name, setName] = useState("");
  const [kannada, setKannada] = useState("");
  const [step, setStep] = useState<"idle" | "countdown" | "recording" | "done">("idle");
  const [countdown, setCountdown] = useState(3);
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const [samples, setSamples] = useState<LandmarkFrame[][]>([]);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "bad"; message: string } | null>(null);

  const onnxRef = useRef<OnnxInferenceEngine | null>(null);
  const recordingFramesRef = useRef<LandmarkFrame[]>([]);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const engine = new OnnxInferenceEngine();
    engine.load().catch(console.error);
    onnxRef.current = engine;
  }, []);

  const onResult = (r: VisionResult) => {
    if (isRecordingRef.current) {
      recordingFramesRef.current.push(r.frame);
    }
  };

  const { videoRef, canvasRef, camera, start, stop } = useVision({
    face: true,
    overlay: true,
    onResult,
  });

  const startSample = () => {
    if (!name.trim()) {
      setFeedback({ tone: "bad", message: "Please provide an English label for the sign first." });
      return;
    }
    setFeedback(null);
    setStep("countdown");
    setCountdown(3);

    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        // Start recording sample for 1.8 seconds
        setStep("recording");
        recordingFramesRef.current = [];
        isRecordingRef.current = true;

        setTimeout(() => {
          isRecordingRef.current = false;
          const captured = [...recordingFramesRef.current];
          if (captured.length < 6) {
            setFeedback({ tone: "bad", message: "Not enough hand movement captured. Please keep your hands visible and retry." });
            setStep("idle");
            return;
          }

          setSamples((prev) => [...prev, captured]);
          const nextIndex = currentSampleIndex + 1;
          setCurrentSampleIndex(nextIndex);

          if (nextIndex >= 3) {
            setStep("done");
            setFeedback({ tone: "ok", message: "All 3 samples captured! Click 'Save Custom Sign' to register it." });
          } else {
            setStep("idle");
            setFeedback({ tone: "ok", message: `Sample ${nextIndex} of 3 captured successfully. Prepare for sample ${nextIndex + 1}.` });
          }
        }, 1800);
      }
    }, 1000);
  };

  const saveSign = () => {
    if (!name.trim() || samples.length < 3 || !onnxRef.current) return;

    const vectors: Float32Array[] = [];
    for (const s of samples) {
      const v = onnxRef.current.vectorizeFrames(s);
      if (v) vectors.push(v);
    }

    if (vectors.length === 0) {
      setFeedback({ tone: "bad", message: "Could not extract landmark features from the recorded samples." });
      return;
    }

    const mean = averageEmbeddings(vectors);
    const id = `custom_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

    const newSign: CustomSign = {
      id,
      name: name.trim(),
      kannada: kannada.trim() || name.trim(),
      sampleCount: samples.length,
      createdAt: Date.now(),
      embedding: mean,
    };

    saveCustomSign(newSign);
    setSigns(loadCustomSigns());
    setName("");
    setKannada("");
    setSamples([]);
    setCurrentSampleIndex(0);
    setStep("idle");
    setFeedback({ tone: "ok", message: `Sign "${newSign.name}" (${newSign.kannada}) registered successfully! It is now recognized in live mode.` });
  };

  const resetRecording = () => {
    setSamples([]);
    setCurrentSampleIndex(0);
    setStep("idle");
    setFeedback(null);
  };

  const removeSign = (id: string) => {
    deleteCustomSign(id);
    setSigns(loadCustomSigns());
  };

  const handleExport = () => {
    const json = exportCustomSigns();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `silentbridge_custom_signs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const count = importCustomSigns(text);
      setSigns(loadCustomSigns());
      setFeedback({ tone: "ok", message: `Successfully imported ${count} custom sign(s).` });
    };
    reader.readAsText(file);
  };

  return (
    <div className="custom-signs-page">
      <div className="page-head">
        <div>
          <h2>Custom Signs & Personalization</h2>
          <p>
            Record 3 repetitions of any personal, family, or regional sign. SilentBridge stores your personalized prototype and matches it
            instantly in-browser with zero neural network retraining!
          </p>
        </div>
        <div className="actions">
          <Btn icon="copy" variant="ghost" onClick={handleExport} disabled={signs.length === 0}>
            Export JSON
          </Btn>
          <label className="btn btn-ghost">
            Import JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {feedback && (
        <div style={{ marginBottom: 16 }}>
          <Notice tone={feedback.tone}>{feedback.message}</Notice>
        </div>
      )}

      <div className="custom-grid">
        {/* Left: Studio Recorder */}
        <div className="stack">
          <Card title="Record New Sign" icon="record">
            <div className="form-grid cols-2">
              <label className="field">
                <span>Sign Name (English)</span>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Kiran, Bengaluru, Sister"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={step === "countdown" || step === "recording"}
                />
              </label>
              <label className="field">
                <span>Kannada Meaning</span>
                <input
                  type="text"
                  lang="kn"
                  className="input kn"
                  placeholder="e.g. ಕಿರಣ್, ಬೆಂಗಳೂರು, ಸಹೋದರಿ"
                  value={kannada}
                  onChange={(e) => setKannada(e.target.value)}
                  disabled={step === "countdown" || step === "recording"}
                />
              </label>
            </div>

            {/* Video Viewfinder with Futuristic HUD */}
            <div className="video-wrap">
              <video ref={videoRef} playsInline muted className="mirror" />
              <canvas ref={canvasRef} className="mirror" />

              {camera === "off" && (
                <div className="video-placeholder">
                  <p>Camera is turned off</p>
                  <Btn icon="camera" variant="primary" onClick={() => start()}>
                    Start Camera
                  </Btn>
                </div>
              )}

              <div className="video-overlay">
                <span>
                  {step === "recording" ? (
                    <span className="pill pill-rec">● REC SAMPLE {currentSampleIndex + 1}/3</span>
                  ) : (
                    <span className="pill">{camera === "on" ? "Studio HUD Ready" : "Standby"}</span>
                  )}
                </span>
                <span>
                  <span className="pill">Few-Shot Prototype</span>
                </span>
              </div>

              {step === "countdown" && (
                <div className="avatar-loading">
                  <span style={{ fontSize: 72, fontWeight: 800, color: "#38bdf8" }}>{countdown}</span>
                </div>
              )}
            </div>

            {/* Progress & Controls */}
            <div className="stack" style={{ gap: 10 }}>
              <div className="conf-head">
                <span>Sample Progress: {currentSampleIndex} / 3</span>
                <span className="muted xs">Keep hands in camera frame</span>
              </div>
              <div className="progress">
                <div style={{ width: `${(currentSampleIndex / 3) * 100}%` }} />
              </div>

              <div className="toolbar">
                {camera === "on" ? (
                  <Btn icon="cameraOff" variant="ghost" onClick={stop}>
                    Stop Camera
                  </Btn>
                ) : (
                  <Btn icon="camera" variant="ghost" onClick={() => start()}>
                    Start Camera
                  </Btn>
                )}

                {step !== "done" ? (
                  <Btn icon="record" variant="primary" onClick={startSample} disabled={camera !== "on" || step === "countdown" || step === "recording"}>
                    {step === "countdown" ? `Starting in ${countdown}...` : step === "recording" ? "Recording..." : `Record Sample ${currentSampleIndex + 1} of 3`}
                  </Btn>
                ) : (
                  <Btn icon="check" variant="primary" onClick={saveSign}>
                    Save Custom Sign
                  </Btn>
                )}

                {currentSampleIndex > 0 && (
                  <Btn icon="refresh" variant="ghost" onClick={resetRecording} disabled={step === "countdown" || step === "recording"}>
                    Reset
                  </Btn>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Registered Signs List */}
        <div className="stack">
          <Card title={`Registered Custom Signs (${signs.length})`} icon="database">
            {signs.length === 0 ? (
              <Empty icon="hand">No custom signs recorded yet. Use the studio to record your first personalized sign!</Empty>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {signs.map((s) => (
                  <div key={s.id} className="custom-sign-item">
                    <div>
                      <div className="toolbar">
                        <strong>{s.name}</strong>
                        <Chip tone="accent"><span lang="kn">{s.kannada}</span></Chip>
                      </div>
                      <div className="muted xs" style={{ marginTop: 4 }}>
                        {s.sampleCount} samples averaged · {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Btn icon="trash" variant="ghost" size="sm" onClick={() => removeSign(s.id)} title="Delete sign" aria-label={`Delete custom sign ${s.name}`} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="How Few-Shot Personalization Works" icon="info">
            <p className="small muted">
              SilentBridge extracts a <strong>3,668-dimensional normalized landmark trajectory</strong> for each recorded sample.
              The samples are averaged to compute a representative centroid embedding. When you sign in <strong>Live Recognition</strong> mode,
              the in-browser engine matches incoming signs against your custom prototypes using cosine distance before evaluating the general vocabulary!
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
