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
  sources?: Record<string, number> | null;
  active_version?: string | null;
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

export interface ExternalDataset {
  key: string;
  name: string;
  task: "isolated" | "continuous";
  source_url: string;
  license: string;
  citation: string;
  doi: string | null;
  description: string;
  version: string | null;
  download_state: string;
  download_files: Record<string, { state: string; error?: string; files_extracted?: number }>;
  import_summary: { videos: number; accepted: number; rejected: number; classes: number; groups: number; finished_at: string; rejection_reasons: string[]; extractor_version: string } | null;
  importable: boolean;
  processed_samples: number;
}

export interface UploadItem {
  file: string;
  label: string;
  signer: string;
  session: string;
  duration_s: number;
  fps: number;
  frames: number;
  width: number;
  height: number;
  ok: boolean;
  problems: string[];
}

export interface UploadBatch {
  batch_id: string;
  dataset: string;
  signer_id: string;
  session_id: string;
  label_mode: string;
  created_at: string;
  items: UploadItem[];
  problems: string[];
  videos: number;
  ready: number;
  annotations: number;
  state: string;
}

export interface Job {
  id: string;
  type: "import_dataset" | "import_upload" | "train";
  title: string;
  reason: string;
  state: "queued" | "running" | "done" | "failed" | "cancelled";
  stage: string;
  progress: number;
  error: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface ModelVersion {
  version: string;
  active: boolean;
  status: string;
  trained_at: string | null;
  model_type: string | null;
  num_samples: number | null;
  num_classes: number;
  sources: Record<string, number> | null;
  accuracy: number | null;
  macro_f1: number | null;
  headline_source: string | null;
  decision: string | null;
}

export interface Eligibility {
  eligible: boolean;
  reasons: string[];
  valid_samples: number;
  usable_classes: number;
  new_samples: number;
  new_classes: string[];
  samples_needed_per_class: Record<string, number>;
}

export interface ContinuousEval {
  gloss_error_rate: number;
  sentence_accuracy: number;
  sentences_correct: number;
  test_videos: number;
  reference_glosses: number;
  method: string;
  epochs_trained?: number;
  decode_latency_ms?: number | null;
}

export interface ContinuousStatus {
  loaded: boolean;
  error: string | null;
  version: string | null;
  selected_method: string | null;
  sentences: number | null;
  gloss_vocabulary: number | null;
  metrics: {
    version: string;
    trained_at: string;
    dataset: string;
    videos: number;
    train_videos: number;
    val_videos: number;
    test_videos: number;
    test_groups: string[];
    split: string;
    baseline: ContinuousEval;
    ctc: ContinuousEval;
    selected_method: string;
    examples: { reference: string; decoded: string; sentence: string; nearest_sentence: string; correct: boolean }[];
    limitations: string;
  } | null;
}
