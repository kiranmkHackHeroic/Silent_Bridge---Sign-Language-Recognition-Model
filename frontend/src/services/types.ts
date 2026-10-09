export type Vec3 = [number, number, number];

export interface HandPayload {
  handedness: "Left" | "Right";
  score: number;
  landmarks: number[][];
}

export interface FaceBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/** One processed camera frame: only landmark coordinates, never pixels. */
export interface LandmarkFrame {
  t: number;
  w: number;
  h: number;
  hands: HandPayload[];
  face: FaceBox | null;
}

export interface VocabEntry {
  label: string;
  english: string;
  kannada: string;
  emit: boolean;
  trained?: boolean;
  animation?: AnimationInfo;
}

export interface AnimationInfo {
  available: boolean;
  type: "captured" | "placeholder" | null;
  verified: boolean;
  file?: string;
}

export interface ModelStatus {
  loaded: boolean;
  error: string | null;
  classes: string[];
  num_classes: number;
  trained_at: string | null;
  model_type: string | null;
  num_samples: number | null;
  training_in_progress?: boolean;
  defaults?: RecognitionSettings;
}

export interface RecognitionSettings {
  mode: "segment" | "sliding";
  confidence_threshold: number;
  still_ms: number;
  absent_ms: number;
  window_frames: number;
  [key: string]: number | string;
}

export interface Candidate {
  label: string;
  kannada: string;
  english: string;
  confidence: number;
}

export interface TranscriptToken {
  label: string;
  kannada: string;
  english: string;
  confidence: number;
  source: "model" | "simulated" | "edited";
  t: number;
}

export interface Metrics {
  available: boolean;
  trained_at?: string;
  model_type?: string;
  evaluation_strategy?: string;
  session_independent?: boolean;
  num_samples?: number;
  num_sessions?: number;
  accuracy?: number;
  macro_f1?: number;
  correct?: number;
  incorrect?: number;
  per_class?: Record<string, { precision: number; recall: number; "f1-score": number; support: number }>;
  confusion_matrix?: { labels: string[]; matrix: number[][] };
  inference_latency_ms?: number;
  candidates?: Record<string, { accuracy: number; macro_f1: number }>;
  class_counts?: Record<string, number>;
  warnings?: string[];
  note?: string;
}

export interface DatasetSummary {
  total_samples: number;
  num_sessions: number;
  labels: Record<string, { count: number; sessions: string[]; samples: { sample_id: string; session_id: string; num_frames: number; created_at: string }[] }>;
}

export interface HandPose {
  pos: Vec3;
  dir: Vec3;
  normal: Vec3;
  curl: number[][];
}

export interface Keyframe {
  t: number;
  right: HandPose | null;
  left: HandPose | null;
}

export interface AnimationClip {
  sign_id: string;
  type: "captured" | "placeholder";
  verified: boolean;
  description: string;
  duration: number;
  keyframes: Keyframe[];
}

export interface TranslationItem {
  text: string;
  supported: boolean;
  sign_id: string | null;
  verified: boolean;
  source: string | null;
  english: string | null;
  animation: AnimationInfo;
}

export interface TranslationResult {
  input: string;
  normalized: string;
  contains_kannada: boolean;
  items: TranslationItem[];
  supported_count: number;
  unsupported: string[];
  note: string;
}
