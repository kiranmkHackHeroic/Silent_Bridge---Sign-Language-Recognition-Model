import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const FEATURE_SCHEMA = "hands-face-v2";
export const NUM_LANDMARKS = 21;
export const HAND_SHAPE_DIM = (NUM_LANDMARKS - 1) * 3; // 60
export const POS_OFFSET = HAND_SHAPE_DIM; // 60
export const FACEREL_OFFSET = POS_OFFSET + 3; // 63
export const ORIENT_OFFSET = FACEREL_OFFSET + 3; // 66
export const PRESENCE_OFFSET = ORIENT_OFFSET + 6; // 72
export const HAND_DIM = PRESENCE_OFFSET + 1; // 73
export const FACE_FLAG_INDEX = HAND_DIM * 2; // 146
export const FRAME_DIM = HAND_DIM * 2 + 1; // 147
export const RESAMPLE_FRAMES = 24;
export const NONE_LABEL = "_none";
export const SLOTS = ["Left", "Right"] as const;
export const SIGNER_SIDE_FOR_LABEL: Record<string, string> = {
  Left: "right",
  Right: "left",
};

const MIN_PALM = 1e-3;
const MIN_FACE = 0.02;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export const FEATURE_BLOCKS: Record<string, [number, number]> = {
  hand_shape: [0, 60],
  image_position: [60, 63],
  face_relative: [FACEREL_OFFSET, FACEREL_OFFSET + 3],
  orientation: [ORIENT_OFFSET, ORIENT_OFFSET + 6],
  presence: [PRESENCE_OFFSET, PRESENCE_OFFSET + 1],
};

export interface FeatureConfig {
  version: number;
  schema: string;
  resample_frames: number;
  max_gap_fill: number;
  min_hand_frames: number;
}

export const DEFAULT_FEATURE_CONFIG: FeatureConfig = {
  version: 2,
  schema: FEATURE_SCHEMA,
  resample_frames: 24,
  max_gap_fill: 4,
  min_hand_frames: 6,
};

export function featureDim(cfg: FeatureConfig = DEFAULT_FEATURE_CONFIG): number {
  const t = cfg.resample_frames;
  return t * FRAME_DIM + (t - 1) * 6 + 2;
}

export interface FrameFeatures {
  t: number;
  vector: Float32Array;
  present: [boolean, boolean];
  points: Record<string, number[][]>;
  motion: number;
  face: boolean;
  has_hands: boolean;
}

function unit3(v: [number, number, number]): [number, number, number] {
  const n = Math.hypot(v[0], v[1], v[2]);
  return n > 1e-9 ? [v[0] / n, v[1] / n, v[2] / n] : [0, 0, 0];
}

function cross3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function parsePoints(raw: unknown): number[][] | null {
  if (!Array.isArray(raw) || raw.length !== NUM_LANDMARKS) return null;
  const pts: number[][] = [];
  for (const pt of raw) {
    if (!Array.isArray(pt) || (pt.length !== 2 && pt.length !== 3)) return null;
    const x = Number(pt[0]);
    const y = Number(pt[1]);
    const z = pt.length === 3 ? Number(pt[2]) : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    if (Math.abs(x) > 3.0 || Math.abs(y) > 3.0) return null;
    pts.push([x, y, z]);
  }
  return pts;
}

function parseFace(raw: any, aspect: number): [number, number, number] | null {
  if (!raw || typeof raw !== "object") return null;
  const cx = Number(raw.cx);
  const cy = Number(raw.cy);
  const w = Number(raw.w);
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(w)) return null;
  if (w < MIN_FACE || !(cx > -0.5 && cx < 1.5 && cy > -0.5 && cy < 1.5)) return null;
  return [cx * aspect, cy, w * aspect];
}

function normalizeHand(
  points: number[][],
  aspect: number,
  slot: "Left" | "Right",
  face: [number, number, number] | null
): Float32Array | null {
  const wrist = points[0];
  const d9 = Math.hypot(points[9][0] - wrist[0], points[9][1] - wrist[1]);
  const d5 = Math.hypot(points[5][0] - wrist[0], points[5][1] - wrist[1]);
  const d17 = Math.hypot(points[17][0] - wrist[0], points[17][1] - wrist[1]);
  const palm = (d9 + d5 + d17) / 3.0;
  if (!Number.isFinite(palm) || palm < MIN_PALM) return null;

  const out = new Float32Array(HAND_DIM);
  for (let i = 1; i < NUM_LANDMARKS; i++) {
    const base = (i - 1) * 3;
    out[base] = Math.max(-6, Math.min(6, (points[i][0] - wrist[0]) / palm));
    out[base + 1] = Math.max(-6, Math.min(6, (points[i][1] - wrist[1]) / palm));
    out[base + 2] = Math.max(-6, Math.min(6, (points[i][2] - wrist[2]) / palm));
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

  const fingerDir = unit3([
    points[9][0] - wrist[0],
    points[9][1] - wrist[1],
    points[9][2] - wrist[2],
  ]);
  const a: [number, number, number] = [
    points[5][0] - wrist[0],
    points[5][1] - wrist[1],
    points[5][2] - wrist[2],
  ];
  const b: [number, number, number] = [
    points[17][0] - wrist[0],
    points[17][1] - wrist[1],
    points[17][2] - wrist[2],
  ];
  const normal = unit3(slot === "Left" ? cross3(a, b) : cross3(b, a));
  out[ORIENT_OFFSET] = fingerDir[0];
  out[ORIENT_OFFSET + 1] = fingerDir[1];
  out[ORIENT_OFFSET + 2] = fingerDir[2];
  out[ORIENT_OFFSET + 3] = normal[0];
  out[ORIENT_OFFSET + 4] = normal[1];
  out[ORIENT_OFFSET + 5] = normal[2];
  out[PRESENCE_OFFSET] = 1.0;
  return out;
}

function assignSlots(
  parsed: Array<{ label: "Left" | "Right" | null; score: number; pts: number[][] }>,
  aspect: number
): Partial<Record<"Left" | "Right", number[][]>> {
  const best = [...parsed].sort((a, b) => b.score - a.score).slice(0, 2);
  if (best.length === 0) return {};
  if (best.length === 1) {
    let label = best[0].label;
    if (!label) label = best[0].pts[0][0] < 0.5 * aspect ? "Left" : "Right";
    return { [label]: best[0].pts };
  }
  const [a, b] = best;
  if (a.label && b.label && a.label !== b.label) {
    return { [a.label]: a.pts, [b.label]: b.pts };
  }
  const [first, second] = a.pts[0][0] <= b.pts[0][0] ? [a.pts, b.pts] : [b.pts, a.pts];
  return { Left: first, Right: second };
}

export class FaceTracker {
  private current: [number, number, number] | null = null;
  private missingCount = 0;
  private readonly alpha: number;
  private readonly maxMissing: number;

  constructor(alpha = 0.35, maxMissing = 45) {
    this.alpha = alpha;
    this.maxMissing = maxMissing;
  }

  update(rawFace: [number, number, number] | null): [number, number, number] | null {
    if (rawFace !== null) {
      this.missingCount = 0;
      if (this.current === null) {
        this.current = [rawFace[0], rawFace[1], rawFace[2]];
      } else {
        const a = this.alpha;
        this.current = [
          a * rawFace[0] + (1 - a) * this.current[0],
          a * rawFace[1] + (1 - a) * this.current[1],
          a * rawFace[2] + (1 - a) * this.current[2],
        ];
      }
      return this.current;
    }
    this.missingCount += 1;
    if (this.current !== null && this.missingCount <= this.maxMissing) {
      return this.current;
    }
    this.current = null;
    return null;
  }

  reset(): void {
    this.current = null;
    this.missingCount = 0;
  }
}

export function parseFrame(payload: any, faceTracker?: FaceTracker): FrameFeatures {
  if (!payload || typeof payload !== "object") {
    throw new Error("frame must be an object");
  }
  const t = Number(payload.t ?? 0);
  const w = Number(payload.w || 640);
  const h = Number(payload.h || 480);
  if (!Number.isFinite(t) || !(w > 0) || !(h > 0)) {
    throw new Error("bad frame header values");
  }
  const aspect = w / h;
  const rawHands = payload.hands ?? [];
  if (!Array.isArray(rawHands)) {
    throw new Error("hands must be a list");
  }
  const rawFace = parseFace(payload.face, aspect);
  const face = faceTracker ? faceTracker.update(rawFace) : rawFace;
  const parsed: Array<{ label: "Left" | "Right" | null; score: number; pts: number[][] }> = [];

  for (const hand of rawHands.slice(0, 4)) {
    if (!hand || typeof hand !== "object") continue;
    const pts = parsePoints(hand.landmarks);
    if (!pts) continue;
    const scaled = pts.map(([x, y, z]) => [x * aspect, y, z * aspect]);
    const label = hand.handedness === "Left" || hand.handedness === "Right" ? hand.handedness : null;
    const score = Number.isFinite(Number(hand.score)) ? Number(hand.score) : 1.0;
    parsed.push({ label, score, pts: scaled });
  }

  const slots = assignSlots(parsed, aspect);
  const vector = new Float32Array(FRAME_DIM);
  const present: [boolean, boolean] = [false, false];
  const points: Record<string, number[][]> = {};

  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    const pts = slots[slot];
    if (!pts) continue;
    const block = normalizeHand(pts, aspect, slot, face);
    if (!block) continue;
    vector.set(block, i * HAND_DIM);
    present[i] = true;
    points[slot] = pts;
  }
  vector[FACE_FLAG_INDEX] = face ? 1.0 : 0.0;
  return {
    t,
    vector,
    present,
    points,
    motion: 0,
    face: Boolean(face),
    has_hands: present[0] || present[1],
  };
}

export function computeMotion(prev: FrameFeatures | null, cur: FrameFeatures): number {
  if (!prev || !cur.has_hands) {
    cur.motion = 0;
    return 0;
  }
  let dt = cur.t - prev.t;
  if (!Number.isFinite(dt) || dt <= 0) dt = 33.3;
  dt = Math.min(dt, 250.0);

  const values: number[] = [];
  for (const slot of SLOTS) {
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

export function framesToMatrix(frames: FrameFeatures[]): Float32Array[] {
  return frames.map((f) => new Float32Array(f.vector));
}

function renormalizeSlotOrientation(row: Float32Array, slot: number): void {
  const base = slot * HAND_DIM + ORIENT_OFFSET;
  for (const offset of [0, 3]) {
    const x = row[base + offset];
    const y = row[base + offset + 1];
    const z = row[base + offset + 2];
    const n = Math.hypot(x, y, z);
    if (n > 1e-9) {
      row[base + offset] = x / n;
      row[base + offset + 1] = y / n;
      row[base + offset + 2] = z / n;
    }
  }
}

/**
 * Corrects isolated 1-2 frame handedness flips during single-hand signs where
 * MediaPipe briefly mislabels the active hand as the opposite hand slot.
 */
export function stabilizeSingleHandSlots(matrix: Float32Array[]): void {
  if (matrix.length < 5) return;
  let only0 = 0;
  let only1 = 0;
  let both = 0;
  for (const row of matrix) {
    const p0 = row[PRESENCE_OFFSET] > 0.5;
    const p1 = row[HAND_DIM + PRESENCE_OFFSET] > 0.5;
    if (p0 && p1) both++;
    else if (p0) only0++;
    else if (p1) only1++;
  }
  const active = only0 + only1 + both;
  if (active < 5 || both / active > 0.15) return;

  const domSlot = only0 >= only1 ? 0 : 1;
  const altSlot = 1 - domSlot;
  const domCount = domSlot === 0 ? only0 : only1;
  const altCount = domSlot === 0 ? only1 : only0;
  if (domCount / active < 0.72 || altCount === 0 || altCount > 3) return;

  const domBase = domSlot * HAND_DIM;
  const altBase = altSlot * HAND_DIM;

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    const domPres = row[domBase + PRESENCE_OFFSET] > 0.5;
    const altPres = row[altBase + PRESENCE_OFFSET] > 0.5;
    if (!domPres && altPres) {
      // Find nearest frame with dominant slot present to verify spatial continuity
      let refRow: Float32Array | null = null;
      for (let d = 1; d <= 3; d++) {
        if (i - d >= 0 && matrix[i - d][domBase + PRESENCE_OFFSET] > 0.5) {
          refRow = matrix[i - d];
          break;
        }
        if (i + d < matrix.length && matrix[i + d][domBase + PRESENCE_OFFSET] > 0.5) {
          refRow = matrix[i + d];
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
          // Flip palm normal sign because Left vs Right cross product is inverted
          row[domBase + ORIENT_OFFSET + 3] = -row[domBase + ORIENT_OFFSET + 3];
          row[domBase + ORIENT_OFFSET + 4] = -row[domBase + ORIENT_OFFSET + 4];
          row[domBase + ORIENT_OFFSET + 5] = -row[domBase + ORIENT_OFFSET + 5];
        }
      }
    }
  }
}

/**
 * When a hand passes over the face during face-anchored signs (eat, drink, water,
 * mother, father, speak), MediaPipe Face Landmarker can drop out for several frames.
 * Reconstructs the signer's face anchor from valid frames in the same segment and
 * imputes the missing face-relative wrist coordinates.
 */
export function imputeFaceRelative(matrix: Float32Array[]): void {
  const fcxList: number[] = [];
  const fcyList: number[] = [];
  const fwList: number[] = [];

  for (const row of matrix) {
    if (row[FACE_FLAG_INDEX] <= 0.5) continue;
    for (let slot = 0; slot < 2; slot++) {
      const base = slot * HAND_DIM;
      if (row[base + PRESENCE_OFFSET] <= 0.5) continue;
      const palm = row[base + POS_OFFSET + 2] / 5.0;
      const ratio = row[base + FACEREL_OFFSET + 2];
      if (ratio > 0.05 && ratio < 3.95 && palm > 1e-3) {
        const fw = palm / ratio;
        const wxNorm = row[base + POS_OFFSET] / 2.0; // wrist[0] - 0.5 * aspect
        const wyNorm = row[base + POS_OFFSET + 1] / 2.0; // wrist[1] - 0.5
        const fcxNorm = wxNorm - row[base + FACEREL_OFFSET] * fw;
        const fcyNorm = wyNorm - row[base + FACEREL_OFFSET + 1] * fw;
        if (Number.isFinite(fw) && Number.isFinite(fcxNorm) && Number.isFinite(fcyNorm)) {
          fcxList.push(fcxNorm);
          fcyList.push(fcyNorm);
          fwList.push(fw);
          break;
        }
      }
    }
  }

  if (fwList.length === 0) return;
  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const fcxNorm = median(fcxList);
  const fcyNorm = median(fcyList);
  const fw = Math.max(0.02, median(fwList));

  for (const row of matrix) {
    if (row[FACE_FLAG_INDEX] > 0.5) continue;
    let filled = false;
    for (let slot = 0; slot < 2; slot++) {
      const base = slot * HAND_DIM;
      if (row[base + PRESENCE_OFFSET] <= 0.5) continue;
      const wxNorm = row[base + POS_OFFSET] / 2.0;
      const wyNorm = row[base + POS_OFFSET + 1] / 2.0;
      const palm = row[base + POS_OFFSET + 2] / 5.0;
      row[base + FACEREL_OFFSET] = clamp((wxNorm - fcxNorm) / fw, -6.0, 6.0);
      row[base + FACEREL_OFFSET + 1] = clamp((wyNorm - fcyNorm) / fw, -6.0, 6.0);
      row[base + FACEREL_OFFSET + 2] = clamp(palm / fw, 0.0, 4.0);
      filled = true;
    }
    if (filled) {
      row[FACE_FLAG_INDEX] = 1.0;
    }
  }
}

export function cleanSequence(
  matrix: Float32Array[],
  cfg: FeatureConfig = DEFAULT_FEATURE_CONFIG
): Float32Array[] | null {
  if (matrix.length === 0) return null;
  const handPresent = (row: Float32Array) =>
    row[PRESENCE_OFFSET] > 0.5 || row[HAND_DIM + PRESENCE_OFFSET] > 0.5;

  let first = -1;
  let last = -1;
  let totalHands = 0;
  for (let i = 0; i < matrix.length; i++) {
    if (handPresent(matrix[i])) {
      if (first === -1) first = i;
      last = i;
      totalHands++;
    }
  }
  if (totalHands < cfg.min_hand_frames || first === -1) return null;

  const trimmed = matrix.slice(first, last + 1).map((r) => new Float32Array(r));
  stabilizeSingleHandSlots(trimmed);

  // Fill missing-hand gaps up to max_gap_fill per hand slot
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
      if (i > 0 && j < trimmed.length && gap <= cfg.max_gap_fill) {
        const left = trimmed[i - 1];
        const right = trimmed[j];
        for (let k = 0; k < gap; k++) {
          const alpha = (k + 1) / (gap + 1);
          const dst = trimmed[i + k];
          for (let c = s * HAND_DIM; c < (s + 1) * HAND_DIM; c++) {
            dst[c] = (1 - alpha) * left[c] + alpha * right[c];
          }
          dst[pIdx] = 1.0;
          renormalizeSlotOrientation(dst, s);
        }
      }
      i = j;
    }
  }

  imputeFaceRelative(trimmed);

  // Strip interior frames that still have no hand at all (matches Python sequence_features.py)
  const kept = trimmed.filter(handPresent);
  if (kept.length < cfg.min_hand_frames) return null;
  return kept;
}

/**
 * Zero-phase 3-tap symmetric temporal filter [0.20, 0.60, 0.20] across active hand
 * frames to suppress high-frequency MediaPipe landmark jitter while preserving sign speed.
 */
export function smoothSequenceMatrix(matrix: Float32Array[]): Float32Array[] {
  const n = matrix.length;
  if (n < 3) return matrix.map((r) => new Float32Array(r));
  const out = matrix.map((r) => new Float32Array(r));
  for (let slot = 0; slot < 2; slot++) {
    const base = slot * HAND_DIM;
    const pIdx = base + PRESENCE_OFFSET;
    for (let t = 1; t < n - 1; t++) {
      if (matrix[t - 1][pIdx] > 0.5 && matrix[t][pIdx] > 0.5 && matrix[t + 1][pIdx] > 0.5) {
        const prev = matrix[t - 1];
        const cur = matrix[t];
        const next = matrix[t + 1];
        const dst = out[t];
        for (let c = base; c < pIdx; c++) {
          dst[c] = 0.2 * prev[c] + 0.6 * cur[c] + 0.2 * next[c];
        }
        renormalizeSlotOrientation(dst, slot);
      }
    }
  }
  return out;
}

/**
 * Trims low-energy idle preparation/retraction frames at the very start/end of a
 * long segment so the 24 resampled steps focus on the core lexical sign stroke.
 */
export function trimIdleEnds(
  matrix: Float32Array[],
  cfg: FeatureConfig = DEFAULT_FEATURE_CONFIG
): Float32Array[] {
  const n = matrix.length;
  const minKeep = Math.max(8, cfg.min_hand_frames);
  if (n <= minKeep + 2) return matrix;

  const energies = new Float32Array(n);
  let peak = 0;
  for (let t = 1; t < n; t++) {
    let e = 0;
    for (let slot = 0; slot < 2; slot++) {
      const base = slot * HAND_DIM;
      if (matrix[t][base + PRESENCE_OFFSET] > 0.5 && matrix[t - 1][base + PRESENCE_OFFSET] > 0.5) {
        const dx = matrix[t][base + POS_OFFSET] - matrix[t - 1][base + POS_OFFSET];
        const dy = matrix[t][base + POS_OFFSET + 1] - matrix[t - 1][base + POS_OFFSET + 1];
        let shapeDiff = 0;
        for (let c = 0; c < HAND_SHAPE_DIM; c += 3) {
          shapeDiff += Math.abs(matrix[t][base + c] - matrix[t - 1][base + c]);
        }
        e = Math.max(e, Math.hypot(dx, dy) + (shapeDiff / 20) * 0.08);
      }
    }
    energies[t] = e;
    if (e > peak) peak = e;
  }
  energies[0] = energies[1];
  if (peak < 0.008) return matrix; // Static sign (held pose): do not trim

  const cutoff = peak * 0.14;
  let start = 0;
  while (start < n - minKeep && energies[start] < cutoff) start++;
  let end = n - 1;
  while (end > start + minKeep - 1 && energies[end] < cutoff) end--;

  start = Math.max(0, start - 2);
  end = Math.min(n - 1, end + 2);
  if (end - start + 1 < minKeep) return matrix;
  return matrix.slice(start, end + 1);
}

export function resampleSequence(matrix: Float32Array[], targetLen: number): Float32Array[] {
  const n = matrix.length;
  if (n === targetLen) return matrix.map((r) => new Float32Array(r));
  if (n === 1) return Array.from({ length: targetLen }, () => new Float32Array(matrix[0]));

  const out: Float32Array[] = [];
  for (let t = 0; t < targetLen; t++) {
    const pos = (t * (n - 1)) / (targetLen - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(n - 1, lo + 1);
    const w = pos - lo;
    const row = new Float32Array(FRAME_DIM);
    const a = matrix[lo];
    const b = matrix[hi];
    for (let c = 0; c < FRAME_DIM; c++) {
      row[c] = (1 - w) * a[c] + w * b[c];
    }
    // Match Python sequence_features.py: zero entire hand slot when interpolated presence < 0.5
    for (let slot = 0; slot < 2; slot++) {
      const col = slot * HAND_DIM + PRESENCE_OFFSET;
      if (row[col] < 0.5) {
        row.fill(0, slot * HAND_DIM, (slot + 1) * HAND_DIM);
      } else {
        row[col] = 1.0;
      }
    }
    out.push(row);
  }
  return out;
}

export function matrixToVector(
  cleaned: Float32Array[],
  cfg: FeatureConfig = DEFAULT_FEATURE_CONFIG
): Float32Array {
  const seq = resampleSequence(cleaned, cfg.resample_frames);
  const T = cfg.resample_frames;
  const out = new Float32Array(featureDim(cfg));

  for (let t = 0; t < T; t++) {
    out.set(seq[t], t * FRAME_DIM);
  }

  const posCols = [
    POS_OFFSET,
    POS_OFFSET + 1,
    POS_OFFSET + 2,
    HAND_DIM + POS_OFFSET,
    HAND_DIM + POS_OFFSET + 1,
    HAND_DIM + POS_OFFSET + 2,
  ];
  let velOffset = T * FRAME_DIM;
  for (let t = 1; t < T; t++) {
    const prev = seq[t - 1];
    const cur = seq[t];
    for (let c = 0; c < 6; c++) {
      const col = posCols[c];
      out[velOffset++] = (cur[col] - prev[col]) * 5.0;
    }
  }

  for (let slot = 0; slot < 2; slot++) {
    const base = slot * HAND_DIM + POS_OFFSET;
    let pathSum = 0;
    for (let t = 1; t < T; t++) {
      const dx = seq[t][base] - seq[t - 1][base];
      const dy = seq[t][base + 1] - seq[t - 1][base + 1];
      pathSum += Math.hypot(dx, dy);
    }
    out[velOffset++] = pathSum;
  }

  return out;
}

export function framesToVector(
  frames: FrameFeatures[],
  cfg: FeatureConfig = DEFAULT_FEATURE_CONFIG
): Float32Array | null {
  const cleaned = cleanSequence(framesToMatrix(frames), cfg);
  if (!cleaned) return null;
  return matrixToVector(cleaned, cfg);
}

export interface TTAView {
  view: "full" | "denoised" | "core";
  weight: number;
  vector: Float32Array;
}

/**
 * Generates up to 3 complementary temporal views of a sign sequence for Test-Time
 * Augmentation (TTA) ensemble classification:
 *  1. "full" (0.50): Standard cleaned + face-imputed sequence
 *  2. "denoised" (0.30): Temporally smoothed + idle-end trimmed sequence
 *  3. "core" (0.20): Tighter 84% central stroke crop (when sequence has >= 10 frames)
 */
export function framesToVectorsTTA(
  frames: FrameFeatures[],
  cfg: FeatureConfig = DEFAULT_FEATURE_CONFIG
): TTAView[] | null {
  const cleaned = cleanSequence(framesToMatrix(frames), cfg);
  if (!cleaned) return null;

  const fullVec = matrixToVector(cleaned, cfg);
  const smoothed = smoothSequenceMatrix(cleaned);
  const trimmed = trimIdleEnds(smoothed, cfg);
  const denoisedVec = matrixToVector(trimmed, cfg);

  const views: TTAView[] = [
    { view: "full", weight: 0.5, vector: fullVec },
    { view: "denoised", weight: 0.3, vector: denoisedVec },
  ];

  if (smoothed.length >= 10) {
    const margin = Math.max(1, Math.floor(smoothed.length * 0.08));
    const coreSlice = smoothed.slice(margin, smoothed.length - margin);
    if (coreSlice.length >= cfg.min_hand_frames) {
      views.push({
        view: "core",
        weight: 0.2,
        vector: matrixToVector(coreSlice, cfg),
      });
    }
  }

  // Normalize weights to sum to 1.0
  const wSum = views.reduce((acc, v) => acc + v.weight, 0);
  for (const v of views) v.weight /= wSum;
  return views;
}

/**
 * Computes block-balanced cosine similarity between two 3668-D sign feature vectors
 * so that hand shape (40%), face-relative location (20%), palm/finger orientation (15%),
 * velocity + path trajectory (20%), and image position (5%) all contribute proportionally.
 */
export function blockBalancedCosineSimilarity(
  a: Float32Array | number[],
  b: Float32Array | number[],
  resampleFrames = RESAMPLE_FRAMES
): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const frameTotal = resampleFrames * FRAME_DIM;
  if (a.length < frameTotal) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const d = Math.sqrt(na) * Math.sqrt(nb);
    return d > 1e-9 ? Math.max(0, Math.min(1, dot / d)) : 0;
  }

  // Accumulate dot, normA, normB for each of the 5 semantic feature blocks:
  // 0: hand_shape, 1: image_pos, 2: face_rel, 3: orientation, 4: velocity+path
  const dot = [0, 0, 0, 0, 0];
  const na = [0, 0, 0, 0, 0];
  const nb = [0, 0, 0, 0, 0];

  const accum = (blk: number, va: number, vb: number) => {
    dot[blk] += va * vb;
    na[blk] += va * va;
    nb[blk] += vb * vb;
  };

  for (let t = 0; t < resampleFrames; t++) {
    const fBase = t * FRAME_DIM;
    for (let slot = 0; slot < 2; slot++) {
      const sBase = fBase + slot * HAND_DIM;
      for (let i = 0; i < HAND_SHAPE_DIM; i++) accum(0, a[sBase + i], b[sBase + i]);
      for (let i = POS_OFFSET; i < FACEREL_OFFSET; i++) accum(1, a[sBase + i], b[sBase + i]);
      for (let i = FACEREL_OFFSET; i < ORIENT_OFFSET; i++) accum(2, a[sBase + i], b[sBase + i]);
      for (let i = ORIENT_OFFSET; i < PRESENCE_OFFSET; i++) accum(3, a[sBase + i], b[sBase + i]);
    }
  }
  for (let i = frameTotal; i < a.length; i++) {
    accum(4, a[i], b[i]);
  }

  const weights = [0.42, 0.06, 0.18, 0.16, 0.18];
  let weightedSim = 0;
  let activeWeight = 0;
  for (let blk = 0; blk < 5; blk++) {
    const denom = Math.sqrt(na[blk]) * Math.sqrt(nb[blk]);
    if (denom > 1e-7) {
      const sim = Math.max(0, Math.min(1, dot[blk] / denom));
      weightedSim += weights[blk] * sim;
      activeWeight += weights[blk];
    } else if (na[blk] <= 1e-7 && nb[blk] <= 1e-7 && blk === 2) {
      // Neither vector had face features: skip face block without penalty
      continue;
    }
  }
  return activeWeight > 0 ? weightedSim / activeWeight : 0;
}

export interface RecognitionSettings {
  mode: "segment" | "sliding" | "sentence";
  confidence_threshold: number;
  motion_start: number;
  motion_still: number;
  still_ms: number;
  trim_still_tail: boolean;
  trim_sentence_still_tail: boolean;
  absent_ms: number;
  max_segment_ms: number;
  preroll_frames: number;
  dip_split: boolean;
  dip_ratio: number;
  dip_ms: number;
  min_sign_ms: number;
  split_long: boolean;
  split_long_min_ms: number;
  window_frames: number;
  stride_frames: number;
  smoothing_alpha: number;
  stable_evals: number;
  release_margin: number;
  release_evals: number;
  cooldown_ms: number;
}

export function defaultRecognitionSettings(threshold = 0.55): RecognitionSettings {
  return {
    mode: "segment",
    confidence_threshold: threshold,
    motion_start: 0.008,
    motion_still: 0.003,
    still_ms: 650,
    trim_still_tail: true,
    trim_sentence_still_tail: true,
    absent_ms: 200,
    max_segment_ms: 4000,
    preroll_frames: 3,
    dip_split: false,
    dip_ratio: 0.35,
    dip_ms: 100,
    min_sign_ms: 350,
    split_long: false,
    split_long_min_ms: 1500,
    window_frames: 30,
    stride_frames: 3,
    smoothing_alpha: 0.4,
    stable_evals: 3,
    release_margin: 0.2,
    release_evals: 4,
    cooldown_ms: 700,
  };
}

export function updateSettings(target: RecognitionSettings, values: Record<string, any>): string[] {
  const applied: string[] = [];
  for (const [k, v] of Object.entries(values || {})) {
    if (!(k in target)) continue;
    const cur = (target as any)[k];
    if (typeof cur === "boolean") {
      (target as any)[k] = Boolean(v);
      applied.push(k);
    } else if (typeof cur === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      if (k === "confidence_threshold") {
        (target as any)[k] = Math.min(0.99, Math.max(0.05, n));
      } else {
        (target as any)[k] = n;
      }
      applied.push(k);
    } else if (k === "mode") {
      if (v === "segment" || v === "sliding" || v === "sentence") {
        target.mode = v;
        applied.push(k);
      }
    }
  }
  return applied;
}

export interface Segment {
  frames: FrameFeatures[];
  reason: string;
  start_t: number;
  end_t: number;
}

export class ActivitySegmenter {
  public settings: RecognitionSettings;
  public active = false;
  public frames: FrameFeatures[] = [];
  public motion_ema = 0;
  public last_trimmed = 0;
  public split_candidate = false;
  private preroll: FrameFeatures[] = [];
  private startCount = 0;
  private stillMs = 0;
  private stillFrom = 0;
  private absentMs = 0;
  private startT = 0;
  private lastT: number | null = null;
  private absentStreak = 3;
  private peak = 0;
  private dipMs = 0;
  private dipArmed = true;

  constructor(settings: RecognitionSettings) {
    this.settings = settings;
    this.reset();
  }

  reset(): void {
    this.active = false;
    this.frames = [];
    this.preroll = [];
    this.startCount = 0;
    this.stillMs = 0;
    this.stillFrom = 0;
    this.absentMs = 0;
    this.startT = 0;
    this.lastT = null;
    this.absentStreak = 3;
    this.motion_ema = 0;
    this.last_trimmed = 0;
    this.resetDip();
  }

  private resetDip(): void {
    this.peak = 0;
    this.dipMs = 0;
    this.dipArmed = true;
    this.split_candidate = false;
  }

  split(): Segment | null {
    if (!this.active || this.frames.length === 0) return null;
    const t = this.frames[this.frames.length - 1].t;
    const seg: Segment = { frames: this.frames, reason: "dip", start_t: this.startT, end_t: t };
    this.frames = [this.frames[this.frames.length - 1]];
    this.startT = t;
    this.stillMs = 0;
    this.stillFrom = 0;
    this.resetDip();
    this.dipArmed = false;
    return seg;
  }

  private end(reason: string, t: number): Segment {
    let frames = this.frames;
    this.last_trimmed = 0;
    if (reason === "still" && this.settings.trim_still_tail && this.stillFrom > 0) {
      this.last_trimmed = frames.length - (this.stillFrom + 1);
      frames = frames.slice(0, this.stillFrom + 1);
    }
    const seg: Segment = { frames, reason, start_t: this.startT, end_t: t };
    this.active = false;
    this.frames = [];
    this.startCount = 0;
    this.stillMs = 0;
    this.stillFrom = 0;
    this.absentMs = 0;
    this.absentStreak = 0;
    this.resetDip();
    return seg;
  }

  private trackDip(frame: FrameFeatures, dt: number): void {
    const s = this.settings;
    this.split_candidate = false;
    if (!s.dip_split) return;
    this.peak = Math.max(this.peak, this.motion_ema);
    if (!this.dipArmed) {
      if (this.motion_ema > 0.6 * this.peak && this.motion_ema >= s.motion_start) {
        this.dipArmed = true;
      }
      return;
    }
    const longEnough = frame.t - this.startT >= s.min_sign_ms;
    if (this.peak >= 2 * s.motion_start && this.motion_ema < s.dip_ratio * this.peak) {
      this.dipMs += dt;
      if (longEnough && this.dipMs >= s.dip_ms) {
        this.split_candidate = true;
        this.dipArmed = false;
      }
    } else {
      this.dipMs = 0;
    }
  }

  update(frame: FrameFeatures): Segment | null {
    const s = this.settings;
    const dt = this.lastT === null ? 33.3 : Math.min(Math.max(frame.t - this.lastT, 0), 250);
    this.lastT = frame.t;

    if (frame.has_hands) {
      this.motion_ema = 0.5 * frame.motion + 0.5 * this.motion_ema;
    } else {
      this.motion_ema *= 0.5;
    }

    const maxPreroll = Math.max(1, s.preroll_frames + 1);
    this.preroll.push(frame);
    if (this.preroll.length > maxPreroll) this.preroll.shift();

    if (!this.active) {
      if (frame.has_hands) {
        const appeared = this.absentStreak >= 3;
        this.absentStreak = 0;
        if (appeared) {
          this.startCount = 2;
        } else if (this.motion_ema >= s.motion_start) {
          this.startCount += 1;
        } else {
          this.startCount = 0;
        }
      } else {
        this.absentStreak += 1;
        this.startCount = 0;
      }

      if (this.startCount >= 2) {
        this.active = true;
        this.frames = this.preroll.filter((f) => f.has_hands);
        this.startT = this.frames.length > 0 ? this.frames[0].t : frame.t;
        this.stillMs = 0;
        this.stillFrom = 0;
        this.absentMs = 0;
      }
      return null;
    }

    if (frame.has_hands) {
      this.frames.push(frame);
      this.absentMs = 0;
      if (this.motion_ema < s.motion_still) {
        if (this.stillMs === 0) {
          this.stillFrom = this.frames.length - 1;
        }
        this.stillMs += dt;
      } else {
        this.stillMs = 0;
        this.stillFrom = 0;
      }
      this.trackDip(frame, dt);
    } else {
      this.absentMs += dt;
    }

    if (this.absentMs >= s.absent_ms) return this.end("absent", frame.t);
    if (this.stillMs >= s.still_ms) return this.end("still", frame.t);
    if (frame.t - this.startT >= s.max_segment_ms) return this.end("max", frame.t);
    return null;
  }

  flush(): Segment | null {
    if (!this.active) return null;
    return this.end("flush", this.lastT ?? 0);
  }
}

export function palmFacing(normalImg: Float32Array | number[]): string {
  const z = Number(normalImg[2] ?? 0);
  if (Math.hypot(normalImg[0] ?? 0, normalImg[1] ?? 0, z) < 1e-6) return "unknown";
  return z < -0.5 ? "towards camera" : z > 0.5 ? "away from camera" : "sideways";
}

export function frameDiag(payload: any, frame: FrameFeatures, prevT: number | null): Record<string, any> {
  const v = frame.vector;
  const hands: Array<Record<string, any>> = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    if (!frame.present[i]) continue;
    const blk = v.subarray(i * HAND_DIM, (i + 1) * HAND_DIM);
    const rawHand = (payload.hands ?? []).find((h: any) => h?.handedness === slot);
    hands.push({
      mediapipe_label: slot,
      signer_hand: SIGNER_SIDE_FOR_LABEL[slot],
      score: rawHand?.score ?? null,
      palm: palmFacing(blk.subarray(ORIENT_OFFSET + 3, ORIENT_OFFSET + 6)),
      face_relative: frame.face
        ? [Math.round(blk[FACEREL_OFFSET] * 100) / 100, Math.round(blk[FACEREL_OFFSET + 1] * 100) / 100]
        : null,
    });
  }
  const w = Number(payload.w || 0);
  const h = Number(payload.h || 0);
  let allFinite = true;
  for (let i = 0; i < v.length; i++) {
    if (!Number.isFinite(v[i])) {
      allFinite = false;
      break;
    }
  }
  return {
    resolution: `${Math.round(w)}x${Math.round(h)}`,
    aspect: h ? Math.round((w / h) * 1000) / 1000 : null,
    dt_ms: prevT === null ? null : Math.round((frame.t - prevT) * 10) / 10,
    hands_sent: (payload.hands ?? []).length,
    hands_valid: hands.length,
    hands,
    face: frame.face,
    feature_dim: v.length,
    schema_ok: v.length === FRAME_DIM && allFinite,
    face_flag: v[FACE_FLAG_INDEX] > 0.5,
  };
}

export function schemaReport(cfg: FeatureConfig = DEFAULT_FEATURE_CONFIG): Record<string, any> {
  return {
    schema: FEATURE_SCHEMA,
    frame_dim: FRAME_DIM,
    hand_block_dim: HAND_DIM,
    model_input_dim: featureDim(cfg),
    resample_frames: cfg.resample_frames,
    blocks: Object.fromEntries(Object.entries(FEATURE_BLOCKS).map(([k, v]) => [k, [...v]])),
  };
}

export function editCounts(reference: string[], hypothesis: string[]): {
  reference_signs: number;
  emitted_signs: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  sign_error_rate: number | null;
} {
  const n = reference.length;
  const m = hypothesis.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const back: Array<Array<[number, number, string]>> = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => [0, 0, "ok"] as [number, number, string])
  );

  for (let i = 1; i <= n; i++) {
    dp[i][0] = i;
    back[i][0] = [i - 1, 0, "del"];
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j;
    back[0][j] = [0, j - 1, "ins"];
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (reference[i - 1] === hypothesis[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
        back[i][j] = [i - 1, j - 1, "ok"];
      } else {
        const sub = dp[i - 1][j - 1] + 1;
        const del = dp[i - 1][j] + 1;
        const ins = dp[i][j - 1] + 1;
        if (sub <= del && sub <= ins) {
          dp[i][j] = sub;
          back[i][j] = [i - 1, j - 1, "sub"];
        } else if (del <= ins) {
          dp[i][j] = del;
          back[i][j] = [i - 1, j, "del"];
        } else {
          dp[i][j] = ins;
          back[i][j] = [i, j - 1, "ins"];
        }
      }
    }
  }
  let subCount = 0;
  let delCount = 0;
  let insCount = 0;
  let ci = n;
  let cj = m;
  while (ci > 0 || cj > 0) {
    const [pi, pj, op] = back[ci][cj];
    if (op === "sub") subCount++;
    else if (op === "del") delCount++;
    else if (op === "ins") insCount++;
    ci = pi;
    cj = pj;
  }
  const ser = n > 0 ? Math.round(((subCount + delCount + insCount) / n) * 10000) / 10000 : null;
  return {
    reference_signs: n,
    emitted_signs: m,
    substitutions: subCount,
    deletions: delCount,
    insertions: insCount,
    sign_error_rate: ser,
  };
}

export class ProbabilitySmoother {
  private value: Record<string, number> | null = null;
  constructor(public alpha = 0.4) {}

  update(probs: Record<string, number>): Record<string, number> {
    if (!this.value) {
      this.value = { ...probs };
      return this.value;
    }
    const a = this.alpha;
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(probs)) {
      const prev = this.value[k] ?? v;
      next[k] = a * v + (1 - a) * prev;
    }
    this.value = next;
    return next;
  }

  reset(): void {
    this.value = null;
  }
}

export class StablePredictionGate {
  public candidate: string | null = null;
  public count = 0;
  public locked: string | null = null;
  private below = 0;
  private lastEmitT = Number.NEGATIVE_INFINITY;

  constructor(
    public threshold = 0.6,
    public stableEvals = 3,
    public releaseMargin = 0.2,
    public releaseEvals = 4,
    public cooldownMs = 700,
    public ignore: Set<string> = new Set([NONE_LABEL])
  ) {}

  reset(): void {
    this.candidate = null;
    this.count = 0;
    this.locked = null;
    this.below = 0;
    this.lastEmitT = Number.NEGATIVE_INFINITY;
  }

  notifyBoundary(): void {
    this.locked = null;
    this.candidate = null;
    this.count = 0;
    this.below = 0;
  }

  update(label: string, prob: number, t: number): string | null {
    if (this.locked !== null) {
      if (label === this.locked && prob >= this.threshold - this.releaseMargin) {
        this.below = 0;
      } else {
        this.below += 1;
        if (this.below >= this.releaseEvals) {
          this.locked = null;
          this.below = 0;
        }
      }
    }
    if (prob < this.threshold || this.ignore.has(label)) {
      this.candidate = null;
      this.count = 0;
      return null;
    }
    if (label === this.candidate) {
      this.count += 1;
    } else {
      this.candidate = label;
      this.count = 1;
    }
    if (this.count >= this.stableEvals && label !== this.locked && t - this.lastEmitT >= this.cooldownMs) {
      this.locked = label;
      this.lastEmitT = t;
      this.count = 0;
      this.below = 0;
      return label;
    }
    return null;
  }
}

export class SequenceBuffer {
  private buf: FrameFeatures[] = [];
  public framesSinceHands = 0;

  constructor(public maxLen = 28) {}

  resize(maxLen: number): void {
    this.maxLen = Math.max(4, maxLen);
    while (this.buf.length > this.maxLen) this.buf.shift();
  }

  append(frame: FrameFeatures): void {
    this.buf.push(frame);
    while (this.buf.length > this.maxLen) this.buf.shift();
    if (frame.has_hands) {
      this.framesSinceHands = 0;
    } else {
      this.framesSinceHands += 1;
    }
  }

  get length(): number {
    return this.buf.length;
  }

  frames(): FrameFeatures[] {
    return [...this.buf];
  }

  handFraction(): number {
    if (this.buf.length === 0) return 0;
    let c = 0;
    for (const f of this.buf) if (f.has_hands) c++;
    return c / this.buf.length;
  }

  clear(): void {
    this.buf = [];
    this.framesSinceHands = 0;
  }
}

