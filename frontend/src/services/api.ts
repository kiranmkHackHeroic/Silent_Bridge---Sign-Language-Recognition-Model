import type {
  AnimationClip, DatasetSummary, Eligibility, ExternalDataset, Job, LandmarkFrame, Metrics, ModelStatus, ModelVersion,
  RecordedSample, TrainJob, TranslationResult, UploadBatch, ValidationSummary, VocabEntry,
} from "./types";

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
  animation: (signId: string) => request<AnimationClip>(`/api/animations/${encodeURIComponent(signId)}`),
  captureAnimation: (label: string) =>
    request<{ ok: boolean; keyframes: number }>("/api/animations/capture", { method: "POST", body: JSON.stringify({ label }) }),
  record: (body: { label: string; session_id: string; signer_id: string; video: { w: number; h: number }; frames: LandmarkFrame[] }) =>
    request<{ sample_id: string; hand_frames: number; num_frames: number }>("/api/dataset/record", {
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
