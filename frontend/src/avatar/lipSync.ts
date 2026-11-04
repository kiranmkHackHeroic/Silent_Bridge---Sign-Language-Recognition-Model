/**
 * Lip mouthing & facial prosody engine for ISL/Kannada 3D Avatar.
 *
 * In Indian Sign Language, signers mouth spoken Kannada syllables synchronously
 * with manual signs. This module translates Kannada and English sign identifiers
 * into continuous phonetic viseme targets, eye blinks, and facial gestures.
 */

export type AvatarEmotion = "neutral" | "smile" | "question" | "surprised";

export interface VisemeTarget {
  mouthOpen: number;   // 0 = closed, 1 = wide open
  mouthSmile: number;  // 0 = neutral, 1 = wide smile, -0.5 = frown
  mouthPucker: number; // 0 = flat, 1 = pursed / round (O / U)
}

export interface FacePose extends VisemeTarget {
  browRaise: number;   // 0 = neutral, 1 = raised
  browFurrow: number;  // 0 = neutral, 1 = furrowed
  blink: number;       // 0 = eyes open, 1 = eyes closed
  headTilt: number;    // subtle roll in radians
  headNod: number;     // subtle pitch in radians
  emotion?: AvatarEmotion;
}

export const REST_VISEME: VisemeTarget = {
  mouthOpen: 0.04,
  mouthSmile: 0.0,
  mouthPucker: 0.0,
};

export const NEUTRAL_FACE: FacePose = {
  ...REST_VISEME,
  browRaise: 0.0,
  browFurrow: 0.0,
  blink: 0.0,
  headTilt: 0.0,
  headNod: 0.0,
  emotion: "neutral",
};

const VISEMES: Record<string, VisemeTarget> = {
  A: { mouthOpen: 0.7, mouthSmile: 0.2, mouthPucker: 0.05 },
  E: { mouthOpen: 0.38, mouthSmile: 0.65, mouthPucker: 0.0 },
  I: { mouthOpen: 0.25, mouthSmile: 0.72, mouthPucker: 0.0 },
  O: { mouthOpen: 0.52, mouthSmile: 0.05, mouthPucker: 0.78 },
  U: { mouthOpen: 0.32, mouthSmile: 0.0, mouthPucker: 0.88 },
  MBP: { mouthOpen: 0.02, mouthSmile: 0.1, mouthPucker: 0.18 }, // bilabial closure
  TDS: { mouthOpen: 0.22, mouthSmile: 0.35, mouthPucker: 0.0 }, // dental / alveolar
  KG: { mouthOpen: 0.45, mouthSmile: 0.15, mouthPucker: 0.0 },  // velar
  REST: REST_VISEME,
};

/** Known syllable profiles for high-frequency signs */
const SPECIAL_SIGNS: Record<string, VisemeTarget[]> = {
  namaskara: [VISEMES.TDS, VISEMES.A, VISEMES.MBP, VISEMES.A, VISEMES.KG, VISEMES.A],
  hello: [VISEMES.E, VISEMES.TDS, VISEMES.O],
  water: [VISEMES.U, VISEMES.A, VISEMES.TDS],
  neeru: [VISEMES.I, VISEMES.TDS, VISEMES.U],
  food: [VISEMES.MBP, VISEMES.U, VISEMES.TDS],
  oota: [VISEMES.U, VISEMES.TDS, VISEMES.A],
  drink: [VISEMES.KG, VISEMES.TDS, VISEMES.I],
  kudi: [VISEMES.KG, VISEMES.U, VISEMES.TDS, VISEMES.I],
  please: [VISEMES.MBP, VISEMES.TDS, VISEMES.I, VISEMES.TDS],
  thank: [VISEMES.TDS, VISEMES.A, VISEMES.KG],
  thank_you: [VISEMES.TDS, VISEMES.A, VISEMES.KG, VISEMES.I, VISEMES.U],
  yes: [VISEMES.I, VISEMES.E, VISEMES.TDS],
  no: [VISEMES.TDS, VISEMES.O],
  haudu: [VISEMES.A, VISEMES.U, VISEMES.TDS, VISEMES.U],
  illa: [VISEMES.I, VISEMES.TDS, VISEMES.A],
  what: [VISEMES.U, VISEMES.A, VISEMES.TDS],
  where: [VISEMES.U, VISEMES.E, VISEMES.TDS],
  how: [VISEMES.A, VISEMES.U],
  how_are_you: [VISEMES.A, VISEMES.U, VISEMES.A, VISEMES.I, VISEMES.U],
};

const QUESTION_SIGNS = new Set([
  "what",
  "where",
  "how",
  "how_are_you",
  "who",
  "why",
  "when",
  "which",
]);

const SMILE_SIGNS = new Set([
  "namaskara",
  "hello",
  "welcome",
  "good",
  "good_morning",
  "good_afternoon",
  "good_evening",
  "good_night",
  "happy",
  "pleased",
  "thank",
  "thank_you",
  "friend",
  "family",
  "alright",
  "yes",
  "you_are_perfect",
  "healthy",
]);

const FURROW_SIGNS = new Set([
  "angry",
  "bad",
  "sick",
  "sorry",
  "emergency",
  "help",
  "no",
  "stop",
  "patient",
]);

const lerp = (a: number, b: number, w: number) => a + (b - a) * w;

export function lerpViseme(a: VisemeTarget, b: VisemeTarget, w: number): VisemeTarget {
  const t = Math.min(1, Math.max(0, w));
  return {
    mouthOpen: lerp(a.mouthOpen, b.mouthOpen, t),
    mouthSmile: lerp(a.mouthSmile, b.mouthSmile, t),
    mouthPucker: lerp(a.mouthPucker, b.mouthPucker, t),
  };
}

/**
 * Convert any Kannada or English sign label into a sequence of timed visemes.
 */
export function wordToVisemes(word: string): VisemeTarget[] {
  const clean = word.toLowerCase().trim().replace(/[^a-z_\u0C80-\u0CFF]/g, "");
  if (!clean) return [VISEMES.REST, VISEMES.A, VISEMES.REST];

  if (SPECIAL_SIGNS[clean]) {
    return SPECIAL_SIGNS[clean];
  }

  const stripped = clean.replace(/_/g, "");
  if (SPECIAL_SIGNS[stripped]) {
    return SPECIAL_SIGNS[stripped];
  }

  const targets: VisemeTarget[] = [];
  targets.push(VISEMES.REST);

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    const code = ch.charCodeAt(0);

    // Kannada unicode range: 0x0C80 - 0x0CFF
    if (code >= 0x0c80 && code <= 0x0cff) {
      if ("\u0C85\u0C86\u0C90\u0C94\u0CBE\u0CC6\u0CC7".includes(ch)) {
        targets.push(VISEMES.A);
      } else if ("\u0C87\u0C88\u0C8E\u0C8F\u0CBF\u0CC0".includes(ch)) {
        targets.push(VISEMES.I);
      } else if ("\u0C89\u0C8A\u0C92\u0C93\u0CC1\u0CC2\u0CCA\u0CCB".includes(ch)) {
        targets.push(VISEMES.O);
      } else if ("\u0CAE\u0CAC\u0CAD\u0CAA\u0CAB".includes(ch)) {
        targets.push(VISEMES.MBP);
      } else if ("\u0C95\u0C96\u0C97\u0C98\u0CB9".includes(ch)) {
        targets.push(VISEMES.KG);
      } else {
        targets.push(VISEMES.TDS);
      }
      continue;
    }

    // English characters
    if ("a".includes(ch)) {
      targets.push(VISEMES.A);
    } else if ("ei".includes(ch)) {
      targets.push(VISEMES.I);
    } else if ("ou".includes(ch)) {
      targets.push(VISEMES.O);
    } else if ("mbp".includes(ch)) {
      targets.push(VISEMES.MBP);
    } else if ("kg".includes(ch)) {
      targets.push(VISEMES.KG);
    } else if ("tdsznlr".includes(ch)) {
      targets.push(VISEMES.TDS);
    }
  }

  if (targets.length <= 1) {
    targets.push(VISEMES.A, VISEMES.TDS);
  }
  targets.push(VISEMES.REST);

  // Collapse consecutive duplicates to avoid frozen mouth
  const collapsed: VisemeTarget[] = [];
  for (const t of targets) {
    if (
      collapsed.length === 0 ||
      collapsed[collapsed.length - 1].mouthOpen !== t.mouthOpen ||
      collapsed[collapsed.length - 1].mouthPucker !== t.mouthPucker
    ) {
      collapsed.push(t);
    }
  }

  return collapsed.length >= 2 ? collapsed : [VISEMES.REST, VISEMES.A, VISEMES.REST];
}

/**
 * Samples the viseme at progress (0..1) within a sign clip.
 */
export function sampleLipSync(word: string, progress: number): VisemeTarget {
  const p = Math.min(1, Math.max(0, progress));
  const visemes = wordToVisemes(word);
  const n = visemes.length - 1;
  const scaled = p * n;
  const idx = Math.min(n - 1, Math.floor(scaled));
  const frac = scaled - idx;

  // Smooth sinusoidal blending between syllable visemes
  const w = 0.5 - 0.5 * Math.cos(frac * Math.PI);
  return lerpViseme(visemes[idx], visemes[idx + 1], w);
}

/**
 * Natural spontaneous eye blinking.
 * Blinks every ~3.6s with a 150ms duration.
 */
export function computeBlink(time: number): number {
  const period = 3.6;
  const duration = 0.15;
  const cycle = ((time % period) + period) % period;
  if (cycle > duration) return 0.0;
  const w = cycle / duration;
  // Fast close (40%), gentle open (60%)
  if (w < 0.4) {
    return Math.sin((w / 0.4) * (Math.PI / 2));
  } else {
    return Math.cos(((w - 0.4) / 0.6) * (Math.PI / 2));
  }
}

/**
 * Applies an explicit emotion / ISL non-manual grammar preset on top of a base FacePose.
 */
export function applyEmotionPreset(base: FacePose, emotion: AvatarEmotion): FacePose {
  if (emotion === "smile") {
    return {
      ...base,
      mouthSmile: Math.max(base.mouthSmile, 0.78),
      mouthOpen: Math.max(base.mouthOpen, 0.12),
      mouthPucker: base.mouthPucker * 0.4,
      browRaise: Math.max(base.browRaise, 0.32),
      browFurrow: 0,
      emotion: "smile",
    };
  }
  if (emotion === "question" || emotion === "surprised") {
    return {
      ...base,
      mouthOpen: Math.max(base.mouthOpen, 0.42),
      mouthPucker: Math.max(base.mouthPucker, 0.68),
      mouthSmile: Math.min(base.mouthSmile, 0.05),
      browRaise: Math.max(base.browRaise, 0.85),
      browFurrow: 0.12,
      headTilt: base.headTilt + 0.08,
      emotion,
    };
  }
  return {
    ...base,
    emotion: "neutral",
  };
}

/**
 * Compute the complete face pose (mouth, brows, eyes, head tilt/nod) at time t.
 * Incorporates ISL non-manual grammar markers (question brow raises, wh-furrows, affirmative smiles).
 */
export function computeFacePose(
  signId: string | undefined,
  clipProgress: number, // 0..1 if in clip, -1 if in transition/idle
  time: number,
  isInterSign: boolean = false,
): FacePose {
  const blink = computeBlink(time);

  // If in transition between signs or idle, relax mouth
  if (!signId || clipProgress < 0 || clipProgress > 1) {
    const relaxFactor = isInterSign ? 0.3 : 0.0;
    return {
      mouthOpen: REST_VISEME.mouthOpen * (1 + relaxFactor),
      mouthSmile: 0.14,
      mouthPucker: 0.0,
      browRaise: 0.0,
      browFurrow: 0.0,
      blink,
      headTilt: Math.sin(time * 0.7) * 0.015,
      headNod: Math.sin(time * 1.1) * 0.01,
      emotion: "neutral",
    };
  }

  const key = signId.toLowerCase().trim();
  const viseme = sampleLipSync(key, clipProgress);
  const envelope = Math.sin(Math.min(1, Math.max(0, clipProgress)) * Math.PI);

  const isQuestion = QUESTION_SIGNS.has(key);
  const isSmile = SMILE_SIGNS.has(key);
  const isFurrow = FURROW_SIGNS.has(key);

  // Expressive prosody: brow raise on peak vowel opening + ISL grammar markers
  let browRaise = Math.max(0, (viseme.mouthOpen - 0.3) * 0.6);
  let browFurrow = 0.0;
  let emotion: AvatarEmotion = "neutral";
  let mouthSmile = viseme.mouthSmile;
  let mouthPucker = viseme.mouthPucker;

  if (isQuestion) {
    browRaise = Math.max(browRaise, 0.75 * envelope);
    browFurrow = key === "what" || key === "where" || key === "how" ? 0.28 * envelope : 0.0;
    mouthPucker = Math.max(mouthPucker, 0.45 * envelope);
    emotion = "question";
  } else if (isSmile) {
    browRaise = Math.max(browRaise, 0.28 * envelope);
    mouthSmile = Math.max(mouthSmile, 0.68 * envelope);
    emotion = "smile";
  } else if (isFurrow) {
    browFurrow = 0.62 * envelope;
    mouthSmile = Math.min(mouthSmile, -0.15 * envelope);
  }

  // Head nod/tilt accents on the syllable beats & grammar markers
  const headNod = Math.sin(clipProgress * Math.PI * 4) * 0.02 + (isQuestion ? -0.03 * envelope : 0);
  const headTilt = Math.sin(clipProgress * Math.PI * 2) * 0.025 + (isQuestion ? 0.07 * envelope : 0);

  return {
    mouthOpen: viseme.mouthOpen,
    mouthSmile,
    mouthPucker,
    browRaise,
    browFurrow,
    blink,
    headTilt,
    headNod,
    emotion,
  };
}


