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

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        {/* Left: Studio Recorder */}
        <div className="stack">
          <Card title="Record New Sign" icon="record">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Sign Name (English)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Kiran, Bengaluru, Sister"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={step === "countdown" || step === "recording"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Kannada Meaning</label>
                <input
                  type="text"
                  lang="kn"
                  className="input"
                  placeholder="e.g. ಕಿರಣ್, ಬೆಂಗಳೂರು, ಸಹೋದರಿ"
                  value={kannada}
                  onChange={(e) => setKannada(e.target.value)}
                  disabled={step === "countdown" || step === "recording"}
                />
              </div>
            </div>

            {/* Video Viewfinder */}
            <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#0f172a", borderRadius: 8, overflow: "hidden" }}>
              <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />

              {camera === "off" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}>
                  <p style={{ color: "#fff", marginBottom: 12 }}>Camera is turned off</p>
                  <Btn icon="camera" variant="primary" onClick={() => start()}>
                    Start Camera
                  </Btn>
                </div>
              )}

              {step === "countdown" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
                  <span style={{ fontSize: 72, fontWeight: 800, color: "#38bdf8" }}>{countdown}</span>
                </div>
              )}

              {step === "recording" && (
                <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 8, background: "rgba(239, 68, 68, 0.9)", color: "#fff", padding: "4px 12px", borderRadius: 20 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", animation: "pulse 1s infinite" }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>RECORDING SIGN SAMPLE {currentSampleIndex + 1}/3...</span>
                </div>
              )}
            </div>

            {/* Progress & Controls */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Sample Progress: {currentSampleIndex} / 3</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Keep hands in camera frame</span>
              </div>
              <div style={{ height: 8, width: "100%", background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(currentSampleIndex / 3) * 100}%`, background: "var(--accent)", transition: "width 0.3s ease" }} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {signs.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--card-bg, #1e293b)",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 15 }}>{s.name}</strong>
                        <Chip tone="accent">{s.kannada}</Chip>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                        {s.sampleCount} samples averaged · {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Btn icon="trash" variant="ghost" size="sm" onClick={() => removeSign(s.id)} title="Delete sign" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="How Few-Shot Personalization Works" icon="info">
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
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
