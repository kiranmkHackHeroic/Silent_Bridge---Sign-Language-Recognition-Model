import { useState } from "react";
import { Icon } from "./Icon";
import { Btn, Chip, Notice, StatusDot, type Tone } from "./ui";

export interface FrameDiag {
  resolution: string;
  aspect: number | null;
  dt_ms: number | null;
  hands_sent: number;
  hands_valid: number;
  hands: { mediapipe_label: string; signer_hand: string; score: number | null; palm: string; face_relative: number[] | null }[];
  face: boolean;
  feature_dim: number;
  schema_ok: boolean;
  face_flag: boolean;
}

export interface Decision {
  at: number;
  type: string;
  result?: string;
  label?: string;
  kannada?: string;
  confidence?: number;
  diagnosis?: { stage: string; detail: string };
  ood?: { mean_abs_z: number; reference_p99: number | null; out_of_distribution: boolean; worst_block: string } | null;
  frames?: number;
  reason?: string;
}

interface Props {
  diag: FrameDiag | null;
  activity: string;
  motion: number;
  buffer: number;
  procMs: number;
  latencyMs: number | null;
  threshold: number;
  thresholdSource: string;
  fps: number;
  inferenceMs: number;
  track: { width?: number; height?: number; frameRate?: number; label?: string } | null;
  source: "camera" | "file";
  camera: string;
  decisions: Decision[];
  onSnapshot: (note: string) => Promise<string>;
}

const stageTone: Record<string, Tone> = { ok: "ok", detection: "bad", features: "bad", segmentation: "warn", classification: "warn", translation: "bad" };

function Row({ tone, stage, children }: { tone: Tone; stage: string; children: React.ReactNode }) {
  return (
    <div className="diag-row">
      <span className="diag-stage"><StatusDot tone={tone} /> {stage}</span>
      <span className="diag-detail">{children}</span>
    </div>
  );
}

export function PipelineDiagnostics(p: Props) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const d = p.diag;
  const camTone: Tone = p.camera !== "on" ? "muted" : p.fps >= 15 ? "ok" : p.fps >= 8 ? "warn" : "bad";
  const detTone: Tone = !d ? "muted" : d.hands_valid > 0 ? "ok" : "warn";
  const featTone: Tone = !d ? "muted" : d.schema_ok ? "ok" : "bad";
  const last = p.decisions[0];
  return (
    <details className="disclosure">
      <summary><Icon name="flask" size={15} /> Pipeline diagnostics (where do errors come from?)</summary>
      <div className="disclosure-body">
        <div className="diag-grid">
          <Row tone={camTone} stage="1 · Camera">
            {p.camera !== "on" ? "off" : <>
              {p.source === "file" ? "video file" : p.track?.label || "webcam"} · {p.track?.width ?? "?"}×{p.track?.height ?? "?"}
              {p.track?.frameRate ? ` @ ${Math.round(p.track.frameRate)} fps requested` : ""} · processed {p.fps} FPS
              {d?.dt_ms != null && <> · frame interval {d.dt_ms} ms</>}
              <span className="muted"> · preview is mirrored, landmarks are sent un-mirrored (same as training videos)</span>
            </>}
          </Row>
          <Row tone={detTone} stage="2 · Detection">
            {!d ? "no frames yet" : <>
              {d.hands_valid}/{d.hands_sent} hand(s) valid · face {d.face ? "visible" : "not visible"} · MediaPipe {p.inferenceMs} ms/frame
              {d.hands.map((h, i) => (
                <div key={i} className="xs">
                  label <code>{h.mediapipe_label}</code> → signer&apos;s {h.signer_hand} hand (if not mirrored) · score {h.score?.toFixed(2) ?? "?"} · palm {h.palm}
                  {h.face_relative ? ` · wrist at (${h.face_relative[0]}, ${h.face_relative[1]}) face-widths from the face` : " · no face reference"}
                </div>
              ))}
            </>}
          </Row>
          <Row tone={featTone} stage="3 · Features">
            {!d ? "—" : <>
              {d.feature_dim} values/frame {d.schema_ok ? "✓ matches schema hands-face-v2 (147), all finite" : "✗ DOES NOT match the training schema"}
              {" "}· face-relative block {d.face_flag ? "filled" : "empty (no face)"}
            </>}
          </Row>
          <Row tone={p.activity === "signing" ? "info" : "muted"} stage="4 · Segmentation">
            {p.activity} · motion {p.motion.toFixed(4)} · segment {p.buffer} frames · backend {p.procMs.toFixed(2)} ms/frame
          </Row>
          <Row tone={!last ? "muted" : stageTone[last.diagnosis?.stage ?? "ok"] ?? "muted"} stage="5 · Classification">
            threshold {Math.round(p.threshold * 100)}% ({p.thresholdSource}) · classifier {p.latencyMs?.toFixed(2) ?? "—"} ms
            {last?.ood && <> · last segment mean |z| {last.ood.mean_abs_z}{last.ood.reference_p99 ? ` (training p99 ${last.ood.reference_p99})` : ""}
              {last.ood.out_of_distribution && <Chip tone="bad">out of training distribution: {last.ood.worst_block}</Chip>}</>}
          </Row>
          <Row tone={!last ? "muted" : last.diagnosis?.stage === "translation" ? "bad" : "ok"} stage="6 · Translation">
            {last?.label ? <>{last.label} → <span lang="kn">{last.kannada || "—"}</span></> : "—"}
          </Row>
        </div>
        <h3 className="small">Recent decisions</h3>
        {p.decisions.length === 0 ? <span className="muted xs">No segments yet.</span> : (
          <div className="table-wrap" style={{ maxHeight: 220, overflowY: "auto" }}>
            <table>
              <thead><tr><th>Result</th><th>Stage</th><th>Detail</th><th>OOD |z|</th></tr></thead>
              <tbody>
                {p.decisions.map((e) => (
                  <tr key={e.at}>
                    <td className="xs">{e.type === "sign" ? <Chip tone="ok">added</Chip> : <Chip tone="warn">{e.result ?? e.type}</Chip>} {e.label && <span lang="kn">{e.kannada || e.label}</span>}</td>
                    <td className="xs"><Chip tone={stageTone[e.diagnosis?.stage ?? "ok"] ?? "muted"}>{e.diagnosis?.stage ?? "—"}</Chip></td>
                    <td className="xs">{e.diagnosis?.detail}{e.frames ? ` · ${e.frames} frames` : ""}{e.reason ? ` · ended by ${e.reason}` : ""}</td>
                    <td className="xs">{e.ood ? e.ood.mean_abs_z : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="toolbar">
          <input placeholder="Note (e.g. 'signed HELLO twice, dim light')" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1 }} />
          <Btn icon="database" size="sm" onClick={async () => setSaved(await p.onSnapshot(note))}>Save diagnostics snapshot</Btn>
        </div>
        {saved && <Notice tone="info">{saved}</Notice>}
        <p className="muted xs">The snapshot stores the last ~20 s of landmark frames and decisions (no video) in <code>backend/data/diagnostics/</code> with a per-stage summary.</p>
      </div>
    </details>
  );
}
