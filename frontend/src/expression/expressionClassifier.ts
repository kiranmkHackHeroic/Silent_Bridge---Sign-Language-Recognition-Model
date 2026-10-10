/**
 * Transparent, rule-based VISIBLE facial-expression estimate from MediaPipe Face
 * Landmarker blendshapes. No trained emotion model is used.
 *
 * Each expression score is a weighted sum of named blendshape activations,
 * divided by an activation level; the result is a heuristic intensity, NOT a
 * calibrated probability and NOT a statement about the person's feelings. In
 * sign languages facial expressions also carry grammatical meaning, so this
 * output is shown separately and never changes a recognized sign.
 */

export type ExpressionLabel = "neutral" | "happy" | "sad" | "angry" | "surprised" | "uncertain" | "no_face";

export const EXPRESSION_TEXT: Record<ExpressionLabel, string> = {
  neutral: "Neutral-looking",
  happy: "Smiling / happy-looking",
  sad: "Sad-looking",
  angry: "Angry-looking (frown)",
  surprised: "Surprised-looking",
  uncertain: "Uncertain / unclassified",
  no_face: "No face detected",
};

type Scored = Exclude<ExpressionLabel, "neutral" | "uncertain" | "no_face">;

const RULES: Record<Scored, { weights: Record<string, number>; activation: number }> = {
  happy: { weights: { mouthSmileLeft: 0.5, mouthSmileRight: 0.5 }, activation: 0.4 },
  surprised: {
    weights: { browInnerUp: 0.35, eyeWideLeft: 0.15, eyeWideRight: 0.15, jawOpen: 0.35 },
    activation: 0.35,
  },
  angry: {
    weights: { browDownLeft: 0.35, browDownRight: 0.35, noseSneerLeft: 0.1, noseSneerRight: 0.1, mouthPressLeft: 0.05, mouthPressRight: 0.05 },
    activation: 0.3,
  },
  sad: {
    weights: { mouthFrownLeft: 0.35, mouthFrownRight: 0.35, browInnerUp: 0.2, mouthLowerDownLeft: 0.05, mouthLowerDownRight: 0.05 },
    activation: 0.22,
  },
};

export interface ExpressionEstimate {
  label: ExpressionLabel;
  intensity: number; // heuristic, 0..1+
  scores: Record<Scored, number>;
}

export function rawScores(blend: Record<string, number>): Record<Scored, number> {
  const out = {} as Record<Scored, number>;
  for (const [label, rule] of Object.entries(RULES) as [Scored, (typeof RULES)[Scored]][]) {
    let s = 0;
    for (const [name, w] of Object.entries(rule.weights)) s += w * (blend[name] ?? 0);
    out[label] = s / rule.activation;
  }
  // a broad smile also raises cheeks/eyes; don't let it read as sad
  out.sad *= Math.max(0, 1 - (blend.mouthSmileLeft ?? 0) - (blend.mouthSmileRight ?? 0));
  // surprise (open jaw + raised brows) shouldn't count as sad brows
  out.sad *= Math.max(0, 1 - (blend.jawOpen ?? 0));
  return out;
}

export function classify(scores: Record<Scored, number>, margin = 0.15): ExpressionEstimate {
  const ranked = (Object.entries(scores) as [Scored, number][]).sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  if (top[1] < 1) return { label: "neutral", intensity: top[1], scores };
  if (top[1] - second[1] < margin) return { label: "uncertain", intensity: top[1], scores };
  return { label: top[0], intensity: top[1], scores };
}

/** Exponential smoothing over time + face-missing handling. */
export class ExpressionSmoother {
  private value: Record<Scored, number> | null = null;
  private missingFrames = 0;
  private shown: ExpressionLabel | null = null;
  private pending: ExpressionLabel | null = null;
  private pendingCount = 0;

  /** alpha: score EMA weight; missingLimit: frames without a face before "no face";
   *  holdFrames: a new label must persist this many updates before it is shown (no flicker). */
  constructor(private alpha = 0.25, private missingLimit = 15, private holdFrames = 3) {}

  private stabilise(e: ExpressionEstimate): ExpressionEstimate {
    if (this.shown === null || e.label === this.shown) {
      this.shown = e.label;
      this.pending = null;
      this.pendingCount = 0;
      return e;
    }
    if (e.label === this.pending) this.pendingCount++;
    else {
      this.pending = e.label;
      this.pendingCount = 1;
    }
    if (this.pendingCount >= this.holdFrames) {
      this.shown = e.label;
      this.pending = null;
      this.pendingCount = 0;
      return e;
    }
    return { ...e, label: this.shown };   // keep the shown label; scores stay current
  }

  update(blend: Record<string, number> | null): ExpressionEstimate {
    if (!blend) {
      this.missingFrames++;
      if (this.missingFrames >= this.missingLimit || !this.value) {
        this.value = null;
        this.shown = null;
        return { label: "no_face", intensity: 0, scores: { happy: 0, sad: 0, angry: 0, surprised: 0 } };
      }
      return this.stabilise(classify(this.value));
    }
    this.missingFrames = 0;
    const raw = rawScores(blend);
    if (!this.value) this.value = raw;
    else for (const k of Object.keys(raw) as Scored[]) this.value[k] = this.alpha * raw[k] + (1 - this.alpha) * this.value[k];
    return this.stabilise(classify(this.value));
  }

  reset() {
    this.value = null;
    this.missingFrames = 0;
    this.shown = null;
    this.pending = null;
    this.pendingCount = 0;
  }
}
