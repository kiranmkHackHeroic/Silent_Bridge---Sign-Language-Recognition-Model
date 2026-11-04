/**
 * Non-Manual Grammar Detector for Indian Sign Language (ISL).
 *
 * In ISL, non-manual markers (eyebrows, head movements, and mouth shape)
 * carry fundamental grammatical roles that alter the meaning of a signed sentence:
 *
 *   1. Raised Eyebrows (browInnerUp / browOuterUp) -> Yes/No Polar Question
 *      Example: [YOU, WATER, DRINK] + raised brows = "Do you want to drink water?"
 *   2. Furrowed Eyebrows (browDown) -> Wh- Content Question
 *      Example: [YOU, GO, WHERE] + furrowed brows = "Where are you going?"
 *   3. Head Shake / Mouth Frown -> Negation / Denial
 *      Example: [I, EAT] + head shake = "I will not eat / I don't want food"
 *   4. Smile / Head Nod -> Affirmation / Agreement
 *   5. Neutral -> Declarative Statement
 */
import type { FaceBox } from "../services/types";

export type NonManualMarker =
  | "question_yn"
  | "question_wh"
  | "negation"
  | "affirmation"
  | "statement";

export interface NonManualGrammarState {
  marker: NonManualMarker;
  confidence: number;
  label: string;
  kannadaHint: string;
  browRaise: number;
  browFurrow: number;
  mouthSmile: number;
  mouthFrown: number;
  headShake: number;
}

export const NON_MANUAL_DESCRIPTIONS: Record<
  NonManualMarker,
  { label: string; kannadaHint: string; tone: "info" | "warn" | "bad" | "ok" | "muted" }
> = {
  question_yn: {
    label: "Yes/No Question (Raised Eyebrows)",
    kannadaHint: "ಪ್ರಶ್ನೆ (-ಆ / -ಇರಾ?)",
    tone: "info",
  },
  question_wh: {
    label: "Wh- Question (Furrowed Eyebrows)",
    kannadaHint: "ಪ್ರಶ್ನೆ (ಏನು/ಎಲ್ಲಿ/ಯಾಕೆ?)",
    tone: "info",
  },
  negation: {
    label: "Negation (Head Shake / Frown)",
    kannadaHint: "ನಿರಾಕರಣೆ (ಇಲ್ಲ / ಬೇಡ)",
    tone: "bad",
  },
  affirmation: {
    label: "Affirmation (Smile / Nod)",
    kannadaHint: "ದೃಢೀಕರಣ (ಹೌದು / ಆಗಲಿ)",
    tone: "ok",
  },
  statement: {
    label: "Statement (Neutral)",
    kannadaHint: "ಹೇಳಿಕೆ (ವಾಕ್ಯ)",
    tone: "muted",
  },
};

export class NonManualGrammarTracker {
  private browRaiseEma = 0;
  private browFurrowEma = 0;
  private mouthSmileEma = 0;
  private mouthFrownEma = 0;

  // Head horizontal position history for shake detection
  private headPositions: { t: number; cx: number }[] = [];
  private readonly maxHeadFrames = 45; // ~1.5 seconds at 30 fps

  // Output smoothing
  private currentMarker: NonManualMarker = "statement";
  private currentConfidence = 0;
  private markerHoldCount = 0;
  private readonly holdFramesNeeded = 3;

  constructor(private alpha = 0.3) {}

  public reset(): void {
    this.browRaiseEma = 0;
    this.browFurrowEma = 0;
    this.mouthSmileEma = 0;
    this.mouthFrownEma = 0;
    this.headPositions = [];
    this.currentMarker = "statement";
    this.currentConfidence = 0;
    this.markerHoldCount = 0;
  }

  public update(
    blendshapes: Record<string, number> | null,
    face: FaceBox | null,
    timestampMs: number = Date.now()
  ): NonManualGrammarState {
    if (!blendshapes || !face) {
      return {
        marker: this.currentMarker,
        confidence: this.currentConfidence,
        label: NON_MANUAL_DESCRIPTIONS[this.currentMarker].label,
        kannadaHint: NON_MANUAL_DESCRIPTIONS[this.currentMarker].kannadaHint,
        browRaise: this.browRaiseEma,
        browFurrow: this.browFurrowEma,
        mouthSmile: this.mouthSmileEma,
        mouthFrown: this.mouthFrownEma,
        headShake: 0,
      };
    }

    // 1. Extract raw blendshape intensities
    const rawRaise =
      (blendshapes.browInnerUp ?? 0) * 0.5 +
      (((blendshapes.browOuterUpLeft ?? 0) + (blendshapes.browOuterUpRight ?? 0)) / 2) * 0.5;
    const rawFurrow =
      ((blendshapes.browDownLeft ?? 0) + (blendshapes.browDownRight ?? 0)) / 2;
    const rawSmile =
      ((blendshapes.mouthSmileLeft ?? 0) + (blendshapes.mouthSmileRight ?? 0)) / 2;
    const rawFrown =
      ((blendshapes.mouthFrownLeft ?? 0) + (blendshapes.mouthFrownRight ?? 0)) / 2 +
      ((blendshapes.mouthPressLeft ?? 0) + (blendshapes.mouthPressRight ?? 0)) * 0.25;

    // 2. Exponential smoothing
    this.browRaiseEma = this.browRaiseEma * (1 - this.alpha) + rawRaise * this.alpha;
    this.browFurrowEma = this.browFurrowEma * (1 - this.alpha) + rawFurrow * this.alpha;
    this.mouthSmileEma = this.mouthSmileEma * (1 - this.alpha) + rawSmile * this.alpha;
    this.mouthFrownEma = this.mouthFrownEma * (1 - this.alpha) + rawFrown * this.alpha;

    // 3. Track head horizontal oscillation (Head Shake)
    this.headPositions.push({ t: timestampMs, cx: face.cx });
    if (this.headPositions.length > this.maxHeadFrames) {
      this.headPositions.shift();
    }
    const headShake = this.computeHeadShake();

    // 4. Grammar classification heuristics
    let detected: NonManualMarker = "statement";
    let conf = 0;

    if (this.browRaiseEma >= 0.32 && this.browRaiseEma > this.browFurrowEma + 0.1) {
      detected = "question_yn";
      conf = Math.min(1.0, (this.browRaiseEma - 0.25) / 0.35);
    } else if (this.browFurrowEma >= 0.28 && this.browFurrowEma > this.browRaiseEma) {
      detected = "question_wh";
      conf = Math.min(1.0, (this.browFurrowEma - 0.2) / 0.3);
    } else if (headShake >= 0.012 || this.mouthFrownEma >= 0.32) {
      detected = "negation";
      conf = Math.min(
        1.0,
        Math.max((headShake - 0.008) / 0.02, (this.mouthFrownEma - 0.25) / 0.35)
      );
    } else if (this.mouthSmileEma >= 0.38) {
      detected = "affirmation";
      conf = Math.min(1.0, (this.mouthSmileEma - 0.3) / 0.4);
    }

    // 5. Stabilize to prevent rapid flickering
    if (detected === this.currentMarker) {
      this.markerHoldCount = 0;
      this.currentConfidence = conf;
    } else {
      this.markerHoldCount++;
      if (this.markerHoldCount >= this.holdFramesNeeded || conf > 0.7) {
        this.currentMarker = detected;
        this.currentConfidence = conf;
        this.markerHoldCount = 0;
      }
    }

    const desc = NON_MANUAL_DESCRIPTIONS[this.currentMarker];
    return {
      marker: this.currentMarker,
      confidence: Math.round(this.currentConfidence * 100) / 100,
      label: desc.label,
      kannadaHint: desc.kannadaHint,
      browRaise: Math.round(this.browRaiseEma * 100) / 100,
      browFurrow: Math.round(this.browFurrowEma * 100) / 100,
      mouthSmile: Math.round(this.mouthSmileEma * 100) / 100,
      mouthFrown: Math.round(this.mouthFrownEma * 100) / 100,
      headShake: Math.round(headShake * 1000) / 1000,
    };
  }

  private computeHeadShake(): number {
    if (this.headPositions.length < 8) return 0;
    // Compute peak-to-peak horizontal motion variance
    const cxs = this.headPositions.map((p) => p.cx);
    const mean = cxs.reduce((a, b) => a + b, 0) / cxs.length;
    let reversals = 0;
    let prevDiff = 0;

    for (let i = 1; i < cxs.length; i++) {
      const diff = cxs[i] - cxs[i - 1];
      if (Math.abs(diff) > 0.003) {
        if (prevDiff !== 0 && ((diff > 0 && prevDiff < 0) || (diff < 0 && prevDiff > 0))) {
          reversals++;
        }
        prevDiff = diff;
      }
    }

    const variance =
      cxs.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / cxs.length;
    const stdDev = Math.sqrt(variance);

    // High reversals with moderate standard deviation indicates horizontal head shaking
    if (reversals >= 3) {
      return stdDev * 1.5;
    }
    return stdDev * 0.5;
  }
}

