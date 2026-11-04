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
ort.env.wasm.numThreads = 1;

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

interface ParsedBrowserFrame {
  t: number;
  vector: number[];
  present: [boolean, boolean];
  points: Record<string, [number, number, number][]>;
  hasHands: boolean;
  motion: number;
}

export class OnnxInferenceEngine {
  private session: ort.InferenceSession | null = null;
  private classes: string[] = [];
  private isLoaded = false;
  private loadPromise: Promise<boolean> | null = null;

  // Real-time activity segmenter state (matches Python ActivitySegmenter)
  private frameBuffer: ParsedBrowserFrame[] = [];
  private preroll: ParsedBrowserFrame[] = [];
  private prevParsed: ParsedBrowserFrame | null = null;
  private isSigning = false;
  private startCount = 0;
  private absentStreak = 3;
  private stillMsAccum = 0;
  private stillFrom = 0;
  private absentMsAccum = 0;
  private startT = 0;
  private lastT: number | null = null;
  public motionEma = 0;

  // Session-level face anchor memory (survives up to 45 frames of hand-over-face occlusion)
  private faceCurrent: [number, number, number] | null = null;
  private faceMissingCount = 0;

  public threshold = 0.45;
  public motionStart = 0.008;
  public motionStill = 0.003;
  public stillMs = 650;
  public absentMs = 200;
  public maxSegmentMs = 4000;
  public prerollFrames = 3;
  public trimStillTail = true;
  public useTTA = true;

  public async load(
    modelUrl = "/models/sign_model.onnx",
    classesUrl = "/models/sign_classes.json"
  ): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const classesResp = await fetch(classesUrl);
        if (!classesResp.ok) throw new Error(`Failed to load classes from ${classesUrl}`);
        this.classes = await classesResp.json();

        this.session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        });

        this.isLoaded = true;
        return true;
      } catch (err) {
        console.error("[OnnxInferenceEngine] Failed to load ONNX model:", err);
        return false;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  public get ready(): boolean {
    return this.isLoaded && this.session !== null;
  }

  public get classCount(): number {
    return this.classes.length;
  }

  public get active(): boolean {
    return this.isSigning;
  }

  public get bufferLength(): number {
    return this.frameBuffer.length;
  }

  public reset(): void {
    this.frameBuffer = [];
    this.preroll = [];
    this.prevParsed = null;
    this.isSigning = false;
    this.startCount = 0;
    this.absentStreak = 3;
    this.stillMsAccum = 0;
    this.stillFrom = 0;
    this.absentMsAccum = 0;
    this.startT = 0;
    this.lastT = null;
    this.motionEma = 0;
  }

  private endSegment(reason: "still" | "absent" | "max"): ParsedBrowserFrame[] {
    let frames = this.frameBuffer;
    if (reason === "still" && this.trimStillTail && this.stillFrom > 0) {
      frames = frames.slice(0, this.stillFrom + 1);
    }
    this.isSigning = false;
    this.frameBuffer = [];
    this.startCount = 0;
    this.stillMsAccum = 0;
    this.stillFrom = 0;
    this.absentMsAccum = 0;
    this.absentStreak = 0;
    return frames;
  }

  /**
   * Processes a live landmark frame. When a sign segment finishes,
   * it returns the ONNX prediction; otherwise returns null.
   */
  public async processFrame(frame: LandmarkFrame): Promise<OnnxPrediction | null> {
    if (!this.ready) return null;

    const parsed = this.parseFrame(frame, true);
    this.computeRealMotion(this.prevParsed, parsed);
    this.prevParsed = parsed;

    const dt =
      this.lastT === null
        ? 33.3
        : Math.min(Math.max(parsed.t - this.lastT, 0.0), 250.0);
    this.lastT = parsed.t;

    if (parsed.hasHands) {
      this.motionEma = 0.5 * parsed.motion + 0.5 * this.motionEma;
    } else {
      this.motionEma *= 0.5;
    }

    this.preroll.push(parsed);
    const maxPre = Math.max(1, this.prerollFrames + 1);
    while (this.preroll.length > maxPre) {
      this.preroll.shift();
    }

    if (!this.isSigning) {
      if (parsed.hasHands) {
        const appeared = this.absentStreak >= 3;
        this.absentStreak = 0;
        if (appeared) {
          this.startCount = 2;
        } else if (this.motionEma >= this.motionStart) {
          this.startCount += 1;
        } else {
          this.startCount = 0;
        }
      } else {
        this.absentStreak += 1;
        this.startCount = 0;
      }

      if (this.startCount >= 2) {
        this.isSigning = true;
        this.frameBuffer = this.preroll.filter((f) => f.hasHands);
        this.startT = this.frameBuffer.length > 0 ? this.frameBuffer[0].t : parsed.t;
        this.stillMsAccum = 0;
        this.stillFrom = 0;
        this.absentMsAccum = 0;
      }
      return null;
    }

    if (parsed.hasHands) {
      this.frameBuffer.push(parsed);
      this.absentMsAccum = 0;
      if (this.motionEma < this.motionStill) {
        if (this.stillMsAccum === 0) {
          this.stillFrom = this.frameBuffer.length - 1;
        }
        this.stillMsAccum += dt;
      } else {
        this.stillMsAccum = 0;
        this.stillFrom = 0;
      }
    } else {
      this.absentMsAccum += dt;
    }

    let completedFrames: ParsedBrowserFrame[] | null = null;
    if (this.absentMsAccum >= this.absentMs) {
      completedFrames = this.endSegment("absent");
    } else if (this.stillMsAccum >= this.stillMs) {
      completedFrames = this.endSegment("still");
    } else if (parsed.t - this.startT >= this.maxSegmentMs) {
      completedFrames = this.endSegment("max");
    }

    if (completedFrames && completedFrames.length >= 6) {
      return await this.classifySegmentFrames(completedFrames);
    }
    return null;
  }

  /**
   * Run vectorization and ONNX inference on the current or completed frame buffer.
   */
  public async classifyBuffer(): Promise<OnnxPrediction | null> {
    if (!this.session || this.frameBuffer.length < 6) return null;
    return this.classifySegmentFrames(this.frameBuffer);
  }

  private async classifySegmentFrames(frames: ParsedBrowserFrame[]): Promise<OnnxPrediction | null> {
    if (!this.session || frames.length < 6) return null;

    const t0 = performance.now();
    const rawMat = frames.map((f) => f.vector);
    const cleaned = this.cleanSequence(rawMat);
    if (!cleaned) return null;

    const fullVec = this.matrixToVector(cleaned);
    if (!fullVec) return null;

    // 1. Check registered personalized custom signs first (Block-Balanced Few-Shot Matching)
    const customMatch = matchCustomSign(fullVec, 0.82);
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
      // 2. Build Multi-View Test-Time Augmentation (TTA) ensemble inputs
      const views: Array<{ vec: Float32Array; weight: number }> = [];
      if (this.useTTA) {
        const smoothed = this.smoothSequenceMatrix(cleaned);
        const trimmed = this.trimIdleEnds(smoothed);
        const denoisedVec = this.matrixToVector(trimmed);
        views.push({ vec: fullVec, weight: 0.5 });
        if (denoisedVec) {
          views.push({ vec: denoisedVec, weight: 0.3 });
        }
        if (smoothed.length >= 10) {
          const margin = Math.max(1, Math.floor(smoothed.length * 0.08));
          const coreSlice = smoothed.slice(margin, smoothed.length - margin);
          if (coreSlice.length >= 6) {
            const coreVec = this.matrixToVector(coreSlice);
            if (coreVec) views.push({ vec: coreVec, weight: 0.2 });
          }
        }
        const wSum = views.reduce((acc, v) => acc + v.weight, 0);
        for (const v of views) v.weight /= wSum;
      } else {
        views.push({ vec: fullVec, weight: 1.0 });
      }

      const ensembleProbs = new Float32Array(this.classes.length);
      for (const v of views) {
        const tensor = new ort.Tensor("float32", v.vec, [1, 3668]);
        const results = await this.session.run({ features: tensor });
        const probsTensor = results.probabilities || Object.values(results)[0];
        const probs = probsTensor.data as Float32Array;
        for (let i = 0; i < probs.length && i < ensembleProbs.length; i++) {
          ensembleProbs[i] += v.weight * probs[i];
        }
      }

      const ranked: Candidate[] = [];
      for (let i = 0; i < ensembleProbs.length; i++) {
        const p = ensembleProbs[i];
        if (p > 0.002) {
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

      if (!best || best.label === "_none") {
        return null;
      }

      const margin = top3.length > 1 ? top3[0].confidence - top3[1].confidence : top3[0].confidence;
      const isConfident =
        best.confidence >= this.threshold ||
        (best.confidence >= 0.30 && margin >= 0.16);

      if (!isConfident) {
        return null;
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
    const rawMat: number[][] = [];
    for (const f of frames) {
      rawMat.push(this.parseFrame(f, false).vector);
    }
    const cleaned = this.cleanSequence(rawMat);
    if (!cleaned) return null;
    const smoothed = this.smoothSequenceMatrix(cleaned);
    return this.matrixToVector(this.trimIdleEnds(smoothed));
  }

  // ---------------------------------------------------------------- feature extraction
  private updateFaceAnchor(rawFace: [number, number, number] | null): [number, number, number] | null {
    if (rawFace !== null) {
      this.faceMissingCount = 0;
      if (this.faceCurrent === null) {
        this.faceCurrent = [rawFace[0], rawFace[1], rawFace[2]];
      } else {
        const a = 0.35;
        this.faceCurrent = [
          a * rawFace[0] + (1 - a) * this.faceCurrent[0],
          a * rawFace[1] + (1 - a) * this.faceCurrent[1],
          a * rawFace[2] + (1 - a) * this.faceCurrent[2],
        ];
      }
      return this.faceCurrent;
    }
    this.faceMissingCount += 1;
    if (this.faceCurrent !== null && this.faceMissingCount <= 45) {
      return this.faceCurrent;
    }
    this.faceCurrent = null;
    return null;
  }

  private parseFrame(payload: LandmarkFrame, useSessionFace = true): ParsedBrowserFrame {
    const w = payload.w || 640;
    const h = payload.h || 480;
    const aspect = w / h;
    const out = new Array<number>(FRAME_DIM).fill(0);

    let rawFace: [number, number, number] | null = null;
    if (
      payload.face &&
      Number.isFinite(payload.face.cx) &&
      Number.isFinite(payload.face.cy) &&
      Number.isFinite(payload.face.w) &&
      payload.face.w >= MIN_FACE
    ) {
      // Exact parity with Python parse_face: (cx * aspect, cy, w * aspect)
      rawFace = [payload.face.cx * aspect, payload.face.cy, payload.face.w * aspect];
    }
    const faceAnchor = useSessionFace ? this.updateFaceAnchor(rawFace) : rawFace;

    const rawHands = payload.hands || [];
    const parsedHands: Array<{
      label: "Left" | "Right" | null;
      score: number;
      pts: [number, number, number][];
    }> = [];

    for (const hand of rawHands.slice(0, 4)) {
      if (!hand || !hand.landmarks || hand.landmarks.length !== NUM_LANDMARKS) continue;
      let valid = true;
      const pts: [number, number, number][] = [];
      for (const p of hand.landmarks) {
        const x = Number(p[0]);
        const y = Number(p[1]);
        const z = Number(p[2] ?? 0);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || Math.abs(x) > 3 || Math.abs(y) > 3) {
          valid = false;
          break;
        }
        pts.push([x * aspect, y, z * aspect]);
      }
      if (!valid) continue;
      const label = hand.handedness === "Left" || hand.handedness === "Right" ? hand.handedness : null;
      const score = Number.isFinite(Number(hand.score)) ? Number(hand.score) : 1.0;
      parsedHands.push({ label, score, pts });
    }

    // Sort by score and assign unambiguous Left/Right slots (matches Python assign_slots)
    const best = [...parsedHands].sort((a, b) => b.score - a.score).slice(0, 2);
    const slots: Record<string, [number, number, number][]> = {};
    if (best.length === 1) {
      const only = best[0];
      const lbl = only.label ?? (only.pts[0][0] < 0.5 * aspect ? "Left" : "Right");
      slots[lbl] = only.pts;
    } else if (best.length === 2) {
      const [a, b] = best;
      if (a.label && b.label && a.label !== b.label) {
        slots[a.label] = a.pts;
        slots[b.label] = b.pts;
      } else {
        const [first, second] = a.pts[0][0] <= b.pts[0][0] ? [a.pts, b.pts] : [b.pts, a.pts];
        slots.Left = first;
        slots.Right = second;
      }
    }

    const present: [boolean, boolean] = [false, false];
    const points: Record<string, [number, number, number][]> = {};
    const slotNames: Array<"Left" | "Right"> = ["Left", "Right"];
    for (let i = 0; i < 2; i++) {
      const slot = slotNames[i];
      const pts = slots[slot];
      if (!pts) continue;
      const block = this.normalizeHand(pts, aspect, slot, faceAnchor);
      if (!block) continue;
      for (let j = 0; j < HAND_DIM; j++) {
        out[i * HAND_DIM + j] = block[j];
      }
      present[i] = true;
      points[slot] = pts;
    }

    out[FACE_FLAG_INDEX] = faceAnchor ? 1.0 : 0.0;
    return {
      t: Number(payload.t ?? 0),
      vector: out,
      present,
      points,
      hasHands: present[0] || present[1],
      motion: 0,
    };
  }

  private computeRealMotion(prev: ParsedBrowserFrame | null, cur: ParsedBrowserFrame): number {
    if (!prev || !cur.hasHands) {
      cur.motion = 0;
      return 0;
    }
    let dt = cur.t - prev.t;
    if (!Number.isFinite(dt) || dt <= 0) dt = 33.3;
    dt = Math.min(dt, 250.0);

    const values: number[] = [];
    for (const slot of ["Left", "Right"]) {
      const pts = cur.points[slot];
      const prevPts = prev.points[slot];
      if (!pts || !prevPts) continue;
      let sum = 0;
      for (let i = 0; i < NUM_LANDMARKS; i++) {
        sum += Math.hypot(pts[i][0] - prevPts[i][0], pts[i][1] - prevPts[i][1]);
      }
      values.push(sum / NUM_LANDMARKS);
    }
    const motion = values.length > 0 ? Math.max(...values) * (33.3 / dt) : 0;
    cur.motion = motion;
    return motion;
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

    for (let i = 1; i < NUM_LANDMARKS; i++) {
      const idx = (i - 1) * 3;
      out[idx] = Math.max(-6, Math.min(6, (points[i][0] - wrist[0]) / palm));
      out[idx + 1] = Math.max(-6, Math.min(6, (points[i][1] - wrist[1]) / palm));
      out[idx + 2] = Math.max(-6, Math.min(6, (points[i][2] - wrist[2]) / palm));
    }

    out[POS_OFFSET] = (wrist[0] - 0.5 * aspect) * 2.0;
    out[POS_OFFSET + 1] = (wrist[1] - 0.5) * 2.0;
    out[POS_OFFSET + 2] = palm * 5.0;

    if (face) {
      const [fcx, fcy, fw] = face;
      out[FACEREL_OFFSET] = Math.max(-6, Math.min(6, (wrist[0] - fcx) / fw));
      out[FACEREL_OFFSET + 1] = Math.max(-6, Math.min(6, (wrist[1] - fcy) / fw));
      out[FACEREL_OFFSET + 2] = Math.max(0, Math.min(4, palm / fw));
    }

    const fd = this.unit([points[9][0] - wrist[0], points[9][1] - wrist[1], points[9][2] - wrist[2]]);
    out[ORIENT_OFFSET] = fd[0];
    out[ORIENT_OFFSET + 1] = fd[1];
    out[ORIENT_OFFSET + 2] = fd[2];

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

  private renormalizeOrientation(row: number[], slot: number): void {
    const base = slot * HAND_DIM + ORIENT_OFFSET;
    for (const off of [0, 3]) {
      const x = row[base + off];
      const y = row[base + off + 1];
      const z = row[base + off + 2];
      const n = Math.hypot(x, y, z);
      if (n > 1e-9) {
        row[base + off] = x / n;
        row[base + off + 1] = y / n;
        row[base + off + 2] = z / n;
      }
    }
  }

  private cleanSequence(mat: number[][]): number[][] | null {
    if (mat.length === 0) return null;
    const handPresent = (row: number[]) =>
      row[PRESENCE_OFFSET] > 0.5 || row[HAND_DIM + PRESENCE_OFFSET] > 0.5;

    let first = -1;
    let last = -1;
    let totalHands = 0;
    for (let i = 0; i < mat.length; i++) {
      if (handPresent(mat[i])) {
        if (first === -1) first = i;
        last = i;
        totalHands++;
      }
    }
    if (totalHands < 6 || first === -1) return null;

    const trimmed = mat.slice(first, last + 1).map((r) => [...r]);

    // 1. Stabilize single-hand slot flips
    if (trimmed.length >= 5) {
      let only0 = 0, only1 = 0, both = 0;
      for (const r of trimmed) {
        const p0 = r[PRESENCE_OFFSET] > 0.5;
        const p1 = r[HAND_DIM + PRESENCE_OFFSET] > 0.5;
        if (p0 && p1) both++;
        else if (p0) only0++;
        else if (p1) only1++;
      }
      const active = only0 + only1 + both;
      if (active >= 5 && both / active <= 0.15) {
        const domSlot = only0 >= only1 ? 0 : 1;
        const altSlot = 1 - domSlot;
        const domCount = domSlot === 0 ? only0 : only1;
        const altCount = domSlot === 0 ? only1 : only0;
        if (domCount / active >= 0.72 && altCount > 0 && altCount <= 3) {
          const domBase = domSlot * HAND_DIM;
          const altBase = altSlot * HAND_DIM;
          for (let i = 0; i < trimmed.length; i++) {
            const row = trimmed[i];
            if (row[domBase + PRESENCE_OFFSET] <= 0.5 && row[altBase + PRESENCE_OFFSET] > 0.5) {
              let refRow: number[] | null = null;
              for (let d = 1; d <= 3; d++) {
                if (i - d >= 0 && trimmed[i - d][domBase + PRESENCE_OFFSET] > 0.5) {
                  refRow = trimmed[i - d];
                  break;
                }
                if (i + d < trimmed.length && trimmed[i + d][domBase + PRESENCE_OFFSET] > 0.5) {
                  refRow = trimmed[i + d];
                  break;
                }
              }
              if (refRow) {
                const dx = row[altBase + POS_OFFSET] - refRow[domBase + POS_OFFSET];
                const dy = row[altBase + POS_OFFSET + 1] - refRow[domBase + POS_OFFSET + 1];
                if (Math.hypot(dx, dy) < 0.45) {
                  for (let c = 0; c < HAND_DIM; c++) {
                    row[domBase + c] = row[altBase + c];
                    row[altBase + c] = 0;
                  }
                  row[domBase + ORIENT_OFFSET + 3] = -row[domBase + ORIENT_OFFSET + 3];
                  row[domBase + ORIENT_OFFSET + 4] = -row[domBase + ORIENT_OFFSET + 4];
                  row[domBase + ORIENT_OFFSET + 5] = -row[domBase + ORIENT_OFFSET + 5];
                }
              }
            }
          }
        }
      }
    }

    // 2. Fill short per-slot gaps up to max_gap_fill = 4
    for (let s = 0; s < 2; s++) {
      const pIdx = s * HAND_DIM + PRESENCE_OFFSET;
      let i = 0;
      while (i < trimmed.length) {
        if (trimmed[i][pIdx] > 0.5) {
          i++;
          continue;
        }
        let j = i;
        while (j < trimmed.length && trimmed[j][pIdx] <= 0.5) j++;
        const gap = j - i;
        if (i > 0 && j < trimmed.length && gap <= 4) {
          const left = trimmed[i - 1];
          const right = trimmed[j];
          for (let k = 0; k < gap; k++) {
            const alpha = (k + 1) / (gap + 1);
            const dst = trimmed[i + k];
            for (let c = s * HAND_DIM; c < (s + 1) * HAND_DIM; c++) {
              dst[c] = (1 - alpha) * left[c] + alpha * right[c];
            }
            dst[pIdx] = 1.0;
            this.renormalizeOrientation(dst, s);
          }
        }
        i = j;
      }
    }

    // 3. Impute face-relative coordinates if face dropped out during hand occlusion
    const fcxList: number[] = [];
    const fcyList: number[] = [];
    const fwList: number[] = [];
    for (const row of trimmed) {
      if (row[FACE_FLAG_INDEX] <= 0.5) continue;
      for (let slot = 0; slot < 2; slot++) {
        const base = slot * HAND_DIM;
        if (row[base + PRESENCE_OFFSET] <= 0.5) continue;
        const palm = row[base + POS_OFFSET + 2] / 5.0;
        const ratio = row[base + FACEREL_OFFSET + 2];
        if (ratio > 0.05 && ratio < 3.95 && palm > 1e-3) {
          const fw = palm / ratio;
          const wxNorm = row[base + POS_OFFSET] / 2.0;
          const wyNorm = row[base + POS_OFFSET + 1] / 2.0;
          fcxList.push(wxNorm - row[base + FACEREL_OFFSET] * fw);
          fcyList.push(wyNorm - row[base + FACEREL_OFFSET + 1] * fw);
          fwList.push(fw);
          break;
        }
      }
    }
    if (fwList.length > 0) {
      const median = (arr: number[]) => {
        const s = [...arr].sort((a, b) => a - b);
        return s[Math.floor(s.length / 2)];
      };
      const fcxNorm = median(fcxList);
      const fcyNorm = median(fcyList);
      const fw = Math.max(0.02, median(fwList));
      for (const row of trimmed) {
        if (row[FACE_FLAG_INDEX] > 0.5) continue;
        let filled = false;
        for (let slot = 0; slot < 2; slot++) {
          const base = slot * HAND_DIM;
          if (row[base + PRESENCE_OFFSET] <= 0.5) continue;
          const wxNorm = row[base + POS_OFFSET] / 2.0;
          const wyNorm = row[base + POS_OFFSET + 1] / 2.0;
          const palm = row[base + POS_OFFSET + 2] / 5.0;
          row[base + FACEREL_OFFSET] = Math.max(-6, Math.min(6, (wxNorm - fcxNorm) / fw));
          row[base + FACEREL_OFFSET + 1] = Math.max(-6, Math.min(6, (wyNorm - fcyNorm) / fw));
          row[base + FACEREL_OFFSET + 2] = Math.max(0, Math.min(4, palm / fw));
          filled = true;
        }
        if (filled) row[FACE_FLAG_INDEX] = 1.0;
      }
    }

    // 4. Strip interior handless frames
    const kept = trimmed.filter(handPresent);
    if (kept.length < 6) return null;
    return kept;
  }

  private smoothSequenceMatrix(mat: number[][]): number[][] {
    const n = mat.length;
    if (n < 3) return mat.map((r) => [...r]);
    const out = mat.map((r) => [...r]);
    for (let slot = 0; slot < 2; slot++) {
      const base = slot * HAND_DIM;
      const pIdx = base + PRESENCE_OFFSET;
      for (let t = 1; t < n - 1; t++) {
        if (mat[t - 1][pIdx] > 0.5 && mat[t][pIdx] > 0.5 && mat[t + 1][pIdx] > 0.5) {
          for (let c = base; c < pIdx; c++) {
            out[t][c] = 0.2 * mat[t - 1][c] + 0.6 * mat[t][c] + 0.2 * mat[t + 1][c];
          }
          this.renormalizeOrientation(out[t], slot);
        }
      }
    }
    return out;
  }

  private trimIdleEnds(mat: number[][]): number[][] {
    const n = mat.length;
    const minKeep = 8;
    if (n <= minKeep + 2) return mat;

    const energies = new Float32Array(n);
    let peak = 0;
    for (let t = 1; t < n; t++) {
      let e = 0;
      for (let slot = 0; slot < 2; slot++) {
        const base = slot * HAND_DIM;
        if (mat[t][base + PRESENCE_OFFSET] > 0.5 && mat[t - 1][base + PRESENCE_OFFSET] > 0.5) {
          const dx = mat[t][base + POS_OFFSET] - mat[t - 1][base + POS_OFFSET];
          const dy = mat[t][base + POS_OFFSET + 1] - mat[t - 1][base + POS_OFFSET + 1];
          let shapeDiff = 0;
          for (let c = 0; c < HAND_SHAPE_DIM; c += 3) {
            shapeDiff += Math.abs(mat[t][base + c] - mat[t - 1][base + c]);
          }
          e = Math.max(e, Math.hypot(dx, dy) + (shapeDiff / 20) * 0.08);
        }
      }
      energies[t] = e;
      if (e > peak) peak = e;
    }
    energies[0] = energies[1];
    if (peak < 0.008) return mat;

    const cutoff = peak * 0.14;
    let start = 0;
    while (start < n - minKeep && energies[start] < cutoff) start++;
    let end = n - 1;
    while (end > start + minKeep - 1 && energies[end] < cutoff) end--;

    start = Math.max(0, start - 2);
    end = Math.min(n - 1, end + 2);
    if (end - start + 1 < minKeep) return mat;
    return mat.slice(start, end + 1);
  }

  private matrixToVector(mat: number[][]): Float32Array | null {
    if (mat.length < 6) return null;

    const seq = this.resample(mat, RESAMPLE_FRAMES);

    const posCols = [60, 61, 62, 133, 134, 135];
    const vel: number[] = [];
    for (let r = 1; r < RESAMPLE_FRAMES; r++) {
      for (const col of posCols) {
        vel.push((seq[r][col] - seq[r - 1][col]) * 5.0);
      }
    }

    const path: number[] = [0, 0];
    for (let slot = 0; slot < 2; slot++) {
      const cx = slot === 0 ? 60 : 133;
      const cy = slot === 0 ? 61 : 134;
      let d = 0;
      for (let r = 1; r < RESAMPLE_FRAMES; r++) {
        d += Math.hypot(seq[r][cx] - seq[r - 1][cx], seq[r][cy] - seq[r - 1][cy]);
      }
      path[slot] = d;
    }

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
    if (srcLen === 1) return Array.from({ length: targetLen }, () => [...mat[0]]);
    const out: number[][] = [];

    for (let i = 0; i < targetLen; i++) {
      const t = (i / (targetLen - 1)) * (srcLen - 1);
      const low = Math.floor(t);
      const high = Math.min(srcLen - 1, low + 1);
      const frac = t - low;
      const row = new Array<number>(FRAME_DIM);

      for (let j = 0; j < FRAME_DIM; j++) {
        row[j] = mat[low][j] + (mat[high][j] - mat[low][j]) * frac;
      }
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

