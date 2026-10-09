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
  isl_gloss: string;
  verified: boolean;
  notes: string;
  trained?: boolean;
  animation?: AnimationInfo;
}

export type ReviewState = "unchecked" | "ok" | "wrong";
export interface AnimationReview {
  handshape: ReviewState;
  orientation: ReviewState;
  movement: ReviewState;
  location: ReviewState;
  non_manual: ReviewState;
  reviewer?: string | null;
  reference?: string | null;
}

export interface AnimationInfo {
  available: boolean;
  type: "captured" | "placeholder" | null;
  verified: boolean;
  file?: string;
  review?: AnimationReview | null;
}

export interface ModelStatus {
  loaded: boolean;
  error: string | null;
  classes: string[];
  num_classes: number;
  trained_at: string | null;
  model_type: string | null;
  num_samples: number | null;
  model_version?: string | null;
  architecture?: string | null;
  dataset_hash?: string | null;
  training_in_progress?: boolean;
  defaults?: RecognitionSettings;
}

export interface TrainJob {
  state: "idle" | "running" | "done" | "error";
  stage: string;
  progress: number;
  error: string | null;
  metrics: Metrics | null;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  rejected: number;
  per_class: Record<string, { valid: number; rejected: number; sessions: string[]; signers: string[] }>;
  imbalance_ratio: number | null;
  warnings: string[];
  dataset_hash: string;
  rejected_samples: { sample_id: string; label: string; file: string; reasons: string[] }[];
  model_dataset_hash: string | null;
  model_is_current: boolean;
}

export interface RecordedSample {
  sample_id: string;
  label: string;
  session_id: string;
  frames: LandmarkFrame[];
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

export interface MetricBlock {
  accuracy: number;
  macro_f1: number;
  num_examples: number;
  correct: number;
  incorrect: number;
  per_class: Record<string, { precision: number; recall: number; "f1-score": number; support: number }>;
  confusion_matrix: { labels: string[]; matrix: number[][] };
  confused_pairs: { true: string; predicted: string; count: number }[];
}

export interface StreamResult {
  reference_signs: number;
  emitted_signs: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  sign_error_rate: number | null;
  mean_frame_processing_ms: number | null;
  threshold: number;
}

export interface Metrics extends Partial<MetricBlock> {
  available: boolean;
  trained_at?: string;
  model_version?: string;
  model_type?: string;
  architecture?: string;
  evaluation_strategy?: string;
  session_independent?: boolean;
  headline_source?: string;
  test?: { session: string; num_examples: number; models: Record<string, MetricBlock>; continuous_stream?: StreamResult } | null;
  num_samples?: number;
  num_train_dev?: number;
  num_test?: number;
  num_sessions?: number;
  inference_latency_ms?: number;
  training_seconds?: number;
  candidates?: Record<string, { accuracy: number; macro_f1: number; architecture: string }>;
  class_counts?: Record<string, number>;
  imbalance_ratio?: number | null;
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

export interface TranslationSign {
  sign_id: string;
  english: string;
  kannada: string;
  isl_gloss: string;
  animation: AnimationInfo;
}

export interface TranslationItem {
  text: string;
  supported: boolean;
  phrase: boolean;
  sign_ids: string[];
  signs: TranslationSign[];
  verified: boolean;
  source: string | null;
  notes: string;
}

export interface TranslationResult {
  input: string;
  normalized: string;
  contains_kannada: boolean;
  items: TranslationItem[];
  supported_count: number;
  sign_count: number;
  unsupported: string[];
  unsupported_message: string | null;
  note: string;
}
