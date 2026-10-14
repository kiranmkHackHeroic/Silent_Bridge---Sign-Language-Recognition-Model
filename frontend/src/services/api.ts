import type {
  AnimationClip, ContinuousStatus, DatasetSummary, Eligibility, ExternalDataset, Job, LandmarkFrame, Metrics, ModelStatus, ModelVersion,
  RecordedSample, SignReference, TrainJob, TranslationResult, UploadBatch, ValidationSummary, VocabEntry,
} from "./types";

export interface CompareResult {
  matched_frames: number;
  hand_presence_agreement: number | null;
  handedness_agreement: number | null;
  mean_landmark_distance: number | null;
  median_landmark_distance: number | null;
  mean_abs_feature_difference: number | null;
  feature_difference_by_block?: Record<string, number>;
  face_presence_agreement?: number | null;
  true_label: string;
  prediction_from_browser_landmarks: { label: string; confidence: number; top3?: { label: string; p: number }[] } | null;
  prediction_from_python_landmarks: { label: string; confidence: number; top3?: { label: string; p: number }[] } | null;
  probability_difference?: number;
  note: string;
}

export interface ThresholdPoint {
  threshold: number; correct: number; wrong_words: number; missed_signs: number; false_detections: number;
  coverage: number; precision: number; recall: number; f1: number; false_detection_rate: number | null;
}

/** localStorage key for a threshold chosen on the user's own webcam evaluation recordings. */
export const WEBCAM_THRESHOLD_KEY = "signbridge.webcamThreshold";

export interface LiveEvalReport {
  model_version: string | null;
  threshold: number;
  note: string;
  saved_to?: string;
  isolated: {
    recordings: number; not_in_model_vocabulary: number; sign_recordings: number; none_recordings: number;
    accuracy?: number; top1_accuracy_ignoring_threshold?: number; rejected_as_uncertain?: number;
    macro_precision?: number; macro_recall?: number; macro_f1?: number;
    false_detections?: number; false_detection_rate?: number;
    top_confusions?: { true: string; predicted: string; count: number }[];
    rejection_rate?: number;
    outcomes_at_threshold?: { correct: number; wrong: number; rejected_or_missed: number; false_detections: number };
    classifier_latency_ms?: { mean: number; p95: number } | null;
    recording_timing?: { mean_fps: number | null; dropped_frames: number; frames: number };
    live_replay?: {
      recordings: number; completed_signs: number; causes: Record<string, number>;
      correct_by_end_style: Record<string, { correct: number; n: number }>;
      frame_processing_ms: { mean: number; p95: number } | null;
    };
    accuracy_by_condition?: Record<string, Record<string, { accuracy: number; n: number }>>;
    thresholds?: {
      curve: ThresholdPoint[];
      at_model_threshold: ThresholdPoint;
      selection: { possible: boolean; reason?: string; recommended_threshold?: number;
        held_out_totals?: { correct: number; wrong_words: number; missed_signs: number; false_detections: number };
        per_held_out_session?: (Omit<ThresholdPoint, "threshold"> & { session: string; chosen_threshold: number })[] };
    };
  };
  sequences: {
    sequences: number; reference_signs: number; substitutions: number; deletions: number; insertions: number;
    sign_error_rate: number | null; exactly_right: number;
    per_sequence: { sequence_id: string; glosses: string[]; emitted: string[]; sign_error_rate: number | null }[];
  };
}

export interface GlossSegment {
  type: "phrase" | "word" | "unknown";
  sign_ids: string[];
  glosses: string[];
  english: string;
  kannada: string;
  category?: string;
  verified: boolean;
  source: string | null;
  notes?: string;
  ambiguous: boolean;
  alternatives: { english: string; kannada: string; notes: string }[];
}

export interface GlossTranslation {
  gloss_sequence: string[];
  sign_ids: string[];
  english_text: string;
  kannada_text: string;
  direct_kannada: string;
  segments: GlossSegment[];
  status: "phrase" | "phrases" | "partial" | "word_by_word" | "unsupported" | "empty";
  phrase_coverage: number;
  ambiguous: boolean;
  unknown: string[];
  verified: boolean;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json; charset=utf-8", ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError("Backend not reachable. Is the FastAPI server running on port 8000? (start-backend.ps1)", 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch {
      /* not JSON */
    }
    throw new ApiError(detail || `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; model_loaded: boolean }>("/api/health"),
  modelStatus: () => request<ModelStatus>("/api/model/status"),
  metrics: () => request<Metrics>("/api/model/metrics"),
  startTraining: (body: { models?: string[]; sources?: string[] } = {}) =>
    request<TrainJob>("/api/model/train", { method: "POST", body: JSON.stringify(body) }),
  trainStatus: () => request<TrainJob>("/api/model/train/status"),
  vocabulary: () => request<{ labels: VocabEntry[] }>("/api/vocabulary"),
  upsertVocabulary: (label: string, english: string, kannada: string, isl_gloss = "") =>
    request<VocabEntry>("/api/vocabulary", { method: "POST", body: JSON.stringify({ label, english, kannada, isl_gloss }) }),
  translate: (text: string) =>
    request<TranslationResult>("/api/translate/kannada", { method: "POST", body: JSON.stringify({ text }) }),
  reference: (label: string) => request<SignReference>(`/api/reference/${encodeURIComponent(label)}`),
  animation: (signId: string) => request<AnimationClip>(`/api/animations/${encodeURIComponent(signId)}`),
  captureAnimation: (label: string) =>
    request<{ ok: boolean; keyframes: number; source: string }>("/api/animations/capture", { method: "POST", body: JSON.stringify({ label }) }),
  record: (body: { label: string; session_id: string; signer_id: string; video: { w: number; h: number }; frames: LandmarkFrame[]; purpose?: "train" | "eval"; conditions?: Record<string, string> }) =>
    request<{ sample_id: string; hand_frames: number; num_frames: number; stored_in: string }>("/api/dataset/record", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  datasetSummary: () => request<DatasetSummary>("/api/dataset/summary"),
  validation: () => request<ValidationSummary>("/api/dataset/validation"),
  sample: (label: string, sampleId: string) =>
    request<RecordedSample>(`/api/dataset/samples/${encodeURIComponent(label)}/${encodeURIComponent(sampleId)}`),
  deleteSample: (label: string, sampleId: string) =>
    request<{ ok: boolean }>(`/api/dataset/samples/${encodeURIComponent(label)}/${encodeURIComponent(sampleId)}`, {
      method: "DELETE",
    }),
  datasets: () => request<{ datasets: ExternalDataset[]; uploads: { batch_id: string; dataset: string; created_at: string; videos: number; ready: number; state: string }[] }>("/api/datasets"),
  importDataset: (key: string) => request<Job>(`/api/datasets/${encodeURIComponent(key)}/import`, { method: "POST" }),
  jobs: () => request<{ jobs: Job[] }>("/api/jobs"),
  cancelJob: (id: string) => request<Job>(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  retryJob: (id: string) => request<Job>(`/api/jobs/${encodeURIComponent(id)}/retry`, { method: "POST" }),
  registry: () => request<{ active: string | null; versions: ModelVersion[]; history: string[] }>("/api/model/registry"),
  rollback: () => request<{ active_version: string }>("/api/model/rollback", { method: "POST" }),
  activate: (v: string) => request<{ active_version: string }>(`/api/model/activate/${encodeURIComponent(v)}`, { method: "POST" }),
  eligibility: () => request<Eligibility>("/api/training/eligibility"),
  diagnosticsSnapshot: (body: { frames: LandmarkFrame[]; events: object[]; note: string }) =>
    request<{ file: string; summary: Record<string, unknown>; event_stages: Record<string, number> }>("/api/diagnostics/snapshot", { method: "POST", body: JSON.stringify(body) }),
  diagnosticsSamples: (source: string, limit = 40) =>
    request<{ samples: { source: string; sample_id: string; label: string; group: string | null; file: string; frames: number; fps: number | null; used_to_train_active_model: boolean | null }[] }>(`/api/diagnostics/dataset-samples?source=${encodeURIComponent(source)}&limit=${limit}`),
  diagnosticsCompare: (body: { source: string; sample_id: string; frames: LandmarkFrame[] }) =>
    request<CompareResult>("/api/diagnostics/compare", { method: "POST", body: JSON.stringify(body) }),
  recordSequence: (body: { glosses: string[]; session_id: string; signer_id: string; conditions: Record<string, string>; frames: LandmarkFrame[] }) =>
    request<{ sequence_id: string; num_frames: number; hand_frames: number }>("/api/evaluation/sequence", { method: "POST", body: JSON.stringify(body) }),
  evaluationData: () =>
    request<{ isolated: number; per_label: Record<string, number>; sessions: string[]; signers?: string[]; sequences: number;
      sequence_signs: number; metadata_warnings?: string[] }>("/api/evaluation/data"),
  evaluateLive: () => request<LiveEvalReport>("/api/evaluation/live", { method: "POST" }),
  translateGlosses: (labels: string[]) =>
    request<GlossTranslation>("/api/translate/glosses", { method: "POST", body: JSON.stringify({ labels }) }),
  continuousStatus: () => request<ContinuousStatus>("/api/continuous/status"),
  trainContinuous: () => request<Job>("/api/continuous/train", { method: "POST" }),
  phrases: () => request<{ phrases: { kannada: string; english: string; category: string; sign_ids: string[]; verified: boolean; missing_animations: string[]; unrecognisable_signs: string[] }[] }>("/api/phrases"),
  upload: (batchId: string) => request<UploadBatch>(`/api/uploads/${encodeURIComponent(batchId)}`),
  importUpload: (batchId: string) => request<Job>(`/api/uploads/${encodeURIComponent(batchId)}/import`, { method: "POST" }),
  deleteUpload: (batchId: string, deleteLandmarks = false) =>
    request<{ deleted_batch: string }>(`/api/uploads/${encodeURIComponent(batchId)}?delete_landmarks=${deleteLandmarks}`, { method: "DELETE" }),
};

/** Multipart upload with real byte-level progress (fetch has no upload progress). */
export function uploadFiles(form: FormData, onProgress: (fraction: number) => void): Promise<UploadBatch> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadBatch);
      else reject(new ApiError(String((body as { detail?: string })?.detail ?? xhr.statusText), xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Upload failed: backend not reachable", 0));
    xhr.send(form);
  });
}
