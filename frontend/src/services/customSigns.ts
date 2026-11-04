/**
 * Few-Shot Custom Sign Recording & In-Browser Personalization.
 *
 * Allows users to register custom, personalized, or regional signs by recording
 * 3-5 repetitions through their webcam. Stored locally in browser localStorage
 * with cosine-distance prototype matching directly inside the ONNX inference pipeline.
 */

export interface CustomSign {
  id: string;
  name: string;        // English name
  kannada: string;     // Kannada translation / meaning
  sampleCount: number; // Number of recorded samples averaged
  createdAt: number;   // Timestamp
  embedding: number[]; // 3668-dim mean normalized feature vector
}

export interface MatchResult {
  sign: CustomSign;
  similarity: number;  // 0..1 cosine similarity
}

const STORAGE_KEY = "silentbridge_custom_signs";

/**
 * Loads all registered custom signs from localStorage.
 */
export function loadCustomSigns(): CustomSign[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load custom signs from storage:", err);
    return [];
  }
}

/**
 * Saves a new custom sign or updates an existing one.
 */
export function saveCustomSign(sign: CustomSign): void {
  const current = loadCustomSigns().filter((s) => s.id !== sign.id);
  current.push(sign);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.error("Failed to save custom sign:", err);
  }
}

/**
 * Deletes a custom sign by ID.
 */
export function deleteCustomSign(id: string): void {
  const filtered = loadCustomSigns().filter((s) => s.id !== id);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (err) {
    console.error("Failed to delete custom sign:", err);
  }
}

/**
 * Computes cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 1e-9 ? Math.max(0, Math.min(1, dot / denom)) : 0;
}

/**
 * Computes block-balanced cosine similarity on 3668-D sign feature vectors so
 * hand shape (42%), face-relative location (18%), palm/finger orientation (16%),
 * velocity/path trajectory (18%), and image position (6%) are balanced instead
 * of being dominated by the 60-dim hand shape coordinates.
 */
export function blockBalancedCosineSimilarity(
  a: Float32Array | number[],
  b: Float32Array | number[],
): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const RESAMPLE_FRAMES = 24;
  const FRAME_DIM = 147;
  const HAND_DIM = 73;
  const HAND_SHAPE_DIM = 60;
  const POS_OFFSET = 60;
  const FACEREL_OFFSET = 63;
  const ORIENT_OFFSET = 66;
  const PRESENCE_OFFSET = 72;
  const frameTotal = RESAMPLE_FRAMES * FRAME_DIM;

  if (a.length < frameTotal) {
    return cosineSimilarity(a, b);
  }

  const dot = [0, 0, 0, 0, 0];
  const na = [0, 0, 0, 0, 0];
  const nb = [0, 0, 0, 0, 0];
  const accum = (blk: number, va: number, vb: number) => {
    dot[blk] += va * vb;
    na[blk] += va * va;
    nb[blk] += vb * vb;
  };

  for (let t = 0; t < RESAMPLE_FRAMES; t++) {
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
      continue;
    }
  }
  const blockSim = activeWeight > 0 ? weightedSim / activeWeight : 0;
  const globalSim = cosineSimilarity(a, b);
  return 0.65 * blockSim + 0.35 * globalSim;
}

/**
 * Matches a 3668-dimensional feature vector against all registered custom signs.
 * Returns the best match if above threshold (default 0.82).
 */
export function matchCustomSign(
  features: Float32Array | number[],
  threshold = 0.82,
): MatchResult | null {
  const signs = loadCustomSigns();
  if (signs.length === 0) return null;

  let bestSign: CustomSign | null = null;
  let maxSim = -1;

  for (const s of signs) {
    const sim = blockBalancedCosineSimilarity(features, s.embedding);
    if (sim > maxSim) {
      maxSim = sim;
      bestSign = s;
    }
  }

  if (bestSign && maxSim >= threshold) {
    return { sign: bestSign, similarity: maxSim };
  }
  return null;
}

/**
 * Computes an outlier-resistant prototype centroid across multiple feature sample vectors.
 * When >= 3 samples are provided, down-weights any outlier repetition that diverges from the group consensus.
 */
export function averageEmbeddings(samples: (Float32Array | number[])[]): number[] {
  if (samples.length === 0) return [];
  const dim = samples[0].length;
  const mean = new Array<number>(dim).fill(0);
  for (const s of samples) {
    for (let i = 0; i < dim; i++) {
      mean[i] += s[i];
    }
  }
  const count = samples.length;
  for (let i = 0; i < dim; i++) {
    mean[i] /= count;
  }
  if (count < 3) return mean;

  // Compute consensus weights based on similarity to initial mean
  const weights = samples.map((s) => Math.pow(Math.max(0.1, cosineSimilarity(s, mean)), 2));
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 1e-9) return mean;

  const refined = new Array<number>(dim).fill(0);
  for (let k = 0; k < count; k++) {
    const w = weights[k] / wSum;
    const s = samples[k];
    for (let i = 0; i < dim; i++) {
      refined[i] += w * s[i];
    }
  }
  return refined;
}

/**
 * Exports all custom signs as a JSON string for backup/sharing.
 */
export function exportCustomSigns(): string {
  return JSON.stringify(loadCustomSigns(), null, 2);
}

/**
 * Imports custom signs from a JSON string. Returns count of imported signs.
 */
export function importCustomSigns(jsonStr: string): number {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return 0;
    const current = loadCustomSigns();
    const map = new Map(current.map((s) => [s.id, s]));
    for (const item of parsed) {
      if (item.id && item.name && Array.isArray(item.embedding)) {
        map.set(item.id, item);
      }
    }
    const merged = Array.from(map.values());
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged.length - current.length;
  } catch (err) {
    console.error("Import error:", err);
    return 0;
  }
}
