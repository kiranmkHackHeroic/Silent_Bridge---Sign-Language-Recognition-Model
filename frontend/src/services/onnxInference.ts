/**
 * Client-Side In-Browser ONNX Inference Engine for SilentBridge.
 *
 * Runs the active BiGRU Ensemble directly in the browser via WebAssembly/WebGPU
 * (using onnxruntime-web), eliminating all network round-trips to the backend.
 *
 * Features:
 *  - Feature schema: exact client-side implementation of 'hands-face-v2' (147 floats/frame)
 *  - Inactivity motion segmentation & 24-frame resampling
 *  - Velocity (138) + 2D path length (2) concatenation -> 3668 input floats
 *  - 144 class probability output with calibrated confidence thresholding
 */
import * as ort from "onnxruntime-web";
import type { Candidate, LandmarkFrame } from "./types";
import { matchCustomSign } from "./customSigns";

// Configure ONNX Runtime to load local WASM binaries from /onnx-wasm/
ort.env.wasm.wasmPaths = "/onnx-wasm/";

const NUM_LANDMARKS = 21;
const HAND_SHAPE_DIM = (NUM_LANDMARKS - 1) * 3; // 60
const POS_OFFSET = HAND_SHAPE_DIM;              // 60
const FACEREL_OFFSET = POS_OFFSET + 3;          // 63
const ORIENT_OFFSET = FACEREL_OFFSET + 3;       // 66
const PRESENCE_OFFSET = ORIENT_OFFSET + 6;      // 72
const HAND_DIM = PRESENCE_OFFSET + 1;           // 73
const FACE_FLAG_INDEX = HAND_DIM * 2;           // 146
const FRAME_DIM = HAND_DIM * 2 + 1;             // 147
const RESAMPLE_FRAMES = 24;

const MIN_PALM = 1e-3;
const MIN_FACE = 0.02;

export interface OnnxPrediction {
  label: string;
  confidence: number;
  top: Candidate[];
  latency_ms: number;
}

export class OnnxInferenceEngine {
  private session: ort.InferenceSession | null = null;
  private classes: string[] = [];
  private isLoaded = false;
  private isLoading = false;

  // Real-time segmentation buffer
  private frameBuffer: number[][] = []; // ring of 147-dim frame vectors
  private frameTimes: number[] = [];
  private isSigning = false;
  private stillStartMs = 0;

  public threshold = 0.45;
  public motionStart = 0.008;
  public motionStill = 0.003;
  public stillMs = 650;

  public async load(
    modelUrl = "/models/sign_model.onnx",
    classesUrl = "/models/sign_classes.json"
  ): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.isLoading) return false;
    this.isLoading = true;

    try {
      // 1. Fetch class labels
      const classesResp = await fetch(classesUrl);
      if (!classesResp.ok) throw new Error(`Failed to load classes from ${classesUrl}`);
      this.classes = await classesResp.json();

      // 2. Initialize ONNX session
      this.session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (err) {
      this.isLoading = false;
      console.error("[OnnxInferenceEngine] Failed to load ONNX model:", err);
      return false;
    }
  }

  public get ready(): boolean {
    return this.isLoaded && this.session !== null;
  }

  public get classCount(): number {
    return this.classes.length;
  }

  public reset(): void {
    this.frameBuffer = [];
    this.frameTimes = [];
    this.isSigning = false;
    this.stillStartMs = 0;
  }

  /**
   * Processes a live landmark frame. When a sign segment finishes,
   * it returns the ONNX prediction; otherwise returns null.
   */
  public async processFrame(frame: LandmarkFrame): Promise<OnnxPrediction | null> {
    if (!this.ready) return null;

    const vec = this.parseFrame(frame);
    const motion = this.computeMotion(vec);
    const t = frame.t;

    const hasHand = vec[PRESENCE_OFFSET] > 0.5 || vec[HAND_DIM + PRESENCE_OFFSET] > 0.5;

    let emittedPrediction: OnnxPrediction | null = null;

    if (!this.isSigning) {
      if (hasHand && motion >= this.motionStart) {
        this.isSigning = true;
        this.frameBuffer = [vec];
        this.frameTimes = [t];
        this.stillStartMs = 0;
      }
    } else {
      this.frameBuffer.push(vec);
      this.frameTimes.push(t);

      // Check stillness boundary
      if (motion <= this.motionStill) {
        if (this.stillStartMs === 0) this.stillStartMs = t;
        else if (t - this.stillStartMs >= this.stillMs) {
          // Inactivity boundary met: classify segment
          emittedPrediction = await this.classifyBuffer();
          this.reset();
        }
      } else {
        this.stillStartMs = 0;
      }

      // Max duration boundary (4000 ms)
      if (this.frameTimes.length > 0 && t - this.frameTimes[0] > 4000) {
        emittedPrediction = await this.classifyBuffer();
        this.reset();
      }

      // Hands dropped boundary
      if (!hasHand) {
        if (this.frameBuffer.length >= 6) {
          emittedPrediction = await this.classifyBuffer();
        }
        this.reset();
      }
    }

    return emittedPrediction;
  }

  /**
   * Run vectorization and ONNX inference on the current frame buffer.
   */
  public async classifyBuffer(): Promise<OnnxPrediction | null> {
    if (!this.session || this.frameBuffer.length < 6) return null;

    const t0 = performance.now();
    const vec3668 = this.matrixToVector(this.frameBuffer);
    if (!vec3668) return null;

    // Check registered personalized custom signs first (Few-Shot Matching)
    const customMatch = matchCustomSign(vec3668, 0.82);
    if (customMatch) {
      const latency = Math.round((performance.now() - t0) * 10) / 10;
      return {
        label: customMatch.sign.name,
        confidence: Math.round(customMatch.similarity * 1000) / 1000,
        top: [
          {
            label: customMatch.sign.name,
            english: customMatch.sign.name,
            kannada: customMatch.sign.kannada,
            confidence: Math.round(customMatch.similarity * 1000) / 1000,
          },
        ],
        latency_ms: latency,
      };
    }

    try {
      const tensor = new ort.Tensor("float32", vec3668, [1, 3668]);
      const results = await this.session.run({ features: tensor });
      const probsTensor = results.probabilities || Object.values(results)[0];
      const probs = probsTensor.data as Float32Array;

      // Rank top candidates
      const ranked: Candidate[] = [];
      for (let i = 0; i < probs.length; i++) {
        const p = probs[i];
        if (p > 0.005) {
          ranked.push({
            label: this.classes[i] || `class_${i}`,
            kannada: "",
            english: "",
            confidence: p,
          });
        }
      }
      ranked.sort((a, b) => b.confidence - a.confidence);
      const top3 = ranked.slice(0, 3);
      const best = top3[0];
      const latency = Math.round((performance.now() - t0) * 10) / 10;

      if (!best || best.confidence < this.threshold) {
        return null; // below confidence threshold
      }

      return {
        label: best.label,
        confidence: Math.round(best.confidence * 1000) / 1000,
        top: top3,
        latency_ms: latency,
      };
    } catch (e) {
      console.error("[OnnxInferenceEngine] Inference error:", e);
      return null;
    }
  }

  /**
   * Helper to vectorize an array of landmark frames for few-shot custom sign recording.
   */
  public vectorizeFrames(frames: LandmarkFrame[]): Float32Array | null {
    const mat: number[][] = [];
    for (const f of frames) {
      mat.push(this.parseFrame(f));
    }
    return this.matrixToVector(mat);
  }

  // ---------------------------------------------------------------- feature extraction
  private parseFrame(payload: LandmarkFrame): number[] {
    const w = payload.w || 640;
    const h = payload.h || 480;
    const aspect = w / h;
    const out = new Array<number>(FRAME_DIM).fill(0);

    let faceAnchor: [number, number, number] | null = null;
    if (payload.face && payload.face.w >= MIN_FACE) {
      faceAnchor = [payload.face.cx * aspect, payload.face.cy, payload.face.w * aspect];
      out[FACE_FLAG_INDEX] = 1.0;
    }

    const hands = payload.hands || [];
    for (const hand of hands.slice(0, 2)) {
      if (!hand.landmarks || hand.landmarks.length !== NUM_LANDMARKS) continue;
      const pts = hand.landmarks.map(([x, y, z]) => [x * aspect, y, (z ?? 0) * aspect] as [number, number, number]);
      const slotIndex = hand.handedness === "Left" ? 0 : 1;
      const block = this.normalizeHand(pts, aspect, hand.handedness || "Left", faceAnchor);
      if (block) {
        for (let j = 0; j < HAND_DIM; j++) {
          out[slotIndex * HAND_DIM + j] = block[j];
        }
      }
    }

    return out;
  }

  private normalizeHand(
    points: [number, number, number][],
    aspect: number,
    slot: string,
    face: [number, number, number] | null
  ): number[] | null {
    const wrist = points[0];
    const palm =
      (Math.hypot(points[9][0] - wrist[0], points[9][1] - wrist[1]) +
        Math.hypot(points[5][0] - wrist[0], points[5][1] - wrist[1]) +
        Math.hypot(points[17][0] - wrist[0], points[17][1] - wrist[1])) /
      3.0;

    if (!Number.isFinite(palm) || palm < MIN_PALM) return null;

    const out = new Array<number>(HAND_DIM).fill(0);

    // Hand shape: points[1:] - wrist / palm
    for (let i = 1; i < NUM_LANDMARKS; i++) {
      const idx = (i - 1) * 3;
      out[idx] = Math.max(-6, Math.min(6, (points[i][0] - wrist[0]) / palm));
      out[idx + 1] = Math.max(-6, Math.min(6, (points[i][1] - wrist[1]) / palm));
      out[idx + 2] = Math.max(-6, Math.min(6, (points[i][2] - wrist[2]) / palm));
    }

    // Pos offset
    out[POS_OFFSET] = (wrist[0] - 0.5 * aspect) * 2.0;
    out[POS_OFFSET + 1] = (wrist[1] - 0.5) * 2.0;
    out[POS_OFFSET + 2] = palm * 5.0;

    // Face relative
    if (face) {
      const [fcx, fcy, fw] = face;
      out[FACEREL_OFFSET] = Math.max(-6, Math.min(6, (wrist[0] - fcx) / fw));
      out[FACEREL_OFFSET + 1] = Math.max(-6, Math.min(6, (wrist[1] - fcy) / fw));
      out[FACEREL_OFFSET + 2] = Math.max(0, Math.min(4, palm / fw));
    }

    // Finger dir (point 9 - wrist)
    const fd = this.unit([points[9][0] - wrist[0], points[9][1] - wrist[1], points[9][2] - wrist[2]]);
    out[ORIENT_OFFSET] = fd[0];
    out[ORIENT_OFFSET + 1] = fd[1];
    out[ORIENT_OFFSET + 2] = fd[2];

    // Palm normal (cross product)
    const a = [points[5][0] - wrist[0], points[5][1] - wrist[1], points[5][2] - wrist[2]];
    const b = [points[17][0] - wrist[0], points[17][1] - wrist[1], points[17][2] - wrist[2]];
    const normal =
      slot === "Left"
        ? this.unit(this.cross(a, b))
        : this.unit(this.cross(b, a));

    out[ORIENT_OFFSET + 3] = normal[0];
    out[ORIENT_OFFSET + 4] = normal[1];
    out[ORIENT_OFFSET + 5] = normal[2];
    out[PRESENCE_OFFSET] = 1.0;

    return out;
  }

  private matrixToVector(mat: number[][]): Float32Array | null {
    if (mat.length < 6) return null;

    // Resample to RESAMPLE_FRAMES (24)
    const seq = this.resample(mat, RESAMPLE_FRAMES);

    // Extract pos columns for left and right hand:
    // Left pos: POS_OFFSET .. POS_OFFSET + 2 (60, 61, 62)
    // Right pos: HAND_DIM + POS_OFFSET .. HAND_DIM + POS_OFFSET + 2 (133, 134, 135)
    const posCols = [60, 61, 62, 133, 134, 135];
    const vel: number[] = [];
    for (let r = 1; r < RESAMPLE_FRAMES; r++) {
      for (const col of posCols) {
        vel.push((seq[r][col] - seq[r - 1][col]) * 5.0);
      }
    } // 23 * 6 = 138

    // 2D Path lengths for left and right
    const path: number[] = [0, 0];
    for (let slot = 0; slot < 2; slot++) {
      const cx = slot === 0 ? 60 : 133;
      const cy = slot === 0 ? 61 : 134;
      let d = 0;
      for (let r = 1; r < RESAMPLE_FRAMES; r++) {
        d += Math.hypot(seq[r][cx] - seq[r - 1][cx], seq[r][cy] - seq[r - 1][cy]);
      }
      path[slot] = d;
    } // 2

    // Flatten: 24 * 147 (3528) + vel (138) + path (2) = 3668
    const out = new Float32Array(3668);
    let ptr = 0;
    for (let r = 0; r < RESAMPLE_FRAMES; r++) {
      for (let c = 0; c < FRAME_DIM; c++) {
        out[ptr++] = seq[r][c];
      }
    }
    for (const v of vel) out[ptr++] = v;
    for (const p of path) out[ptr++] = p;

    return out;
  }

  private resample(mat: number[][], targetLen: number): number[][] {
    const srcLen = mat.length;
    if (srcLen === targetLen) return mat.map((row) => [...row]);
    const out: number[][] = [];

    for (let i = 0; i < targetLen; i++) {
      const t = (i / (targetLen - 1)) * (srcLen - 1);
      const low = Math.floor(t);
      const high = Math.min(srcLen - 1, Math.ceil(t));
      const frac = t - low;
      const row = new Array<number>(FRAME_DIM);

      for (let j = 0; j < FRAME_DIM; j++) {
        row[j] = mat[low][j] + (mat[high][j] - mat[low][j]) * frac;
      }
      // Presence stays binary-ish
      for (let slot = 0; slot < 2; slot++) {
        const pCol = slot * HAND_DIM + PRESENCE_OFFSET;
        if (row[pCol] < 0.5) {
          for (let k = slot * HAND_DIM; k < (slot + 1) * HAND_DIM; k++) row[k] = 0;
        } else {
          row[pCol] = 1.0;
        }
      }
      out.push(row);
    }
    return out;
  }

  private computeMotion(vec: number[]): number {
    const p0 = vec[PRESENCE_OFFSET] > 0.5;
    const p1 = vec[HAND_DIM + PRESENCE_OFFSET] > 0.5;
    if (!p0 && !p1) return 0;
    const s0 = p0 ? vec[POS_OFFSET + 2] / 5.0 : 0;
    const s1 = p1 ? vec[HAND_DIM + POS_OFFSET + 2] / 5.0 : 0;
    return (s0 + s1) * 0.05;
  }

  private unit(v: number[]): number[] {
    const n = Math.hypot(v[0], v[1], v[2] || 0);
    return n > 1e-9 ? [v[0] / n, v[1] / n, (v[2] || 0) / n] : [0, 0, 0];
  }

  private cross(a: number[], b: number[]): number[] {
    return [
      a[1] * (b[2] || 0) - (a[2] || 0) * b[1],
      (a[2] || 0) * b[0] - a[0] * (b[2] || 0),
      a[0] * b[1] - a[1] * b[0],
    ];
  }
}

export const onnxEngine = new OnnxInferenceEngine();
