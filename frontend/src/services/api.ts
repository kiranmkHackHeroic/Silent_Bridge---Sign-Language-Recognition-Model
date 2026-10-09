import type {
  AnimationClip, DatasetSummary, LandmarkFrame, Metrics, ModelStatus, TranslationResult, VocabEntry,
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
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError("Backend not reachable. Is the FastAPI server running on port 8000?", 0);
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
  train: () => request<{ ok: boolean; metrics: Metrics; status: ModelStatus }>("/api/model/train", { method: "POST" }),
  vocabulary: () => request<{ labels: VocabEntry[] }>("/api/vocabulary"),
  upsertVocabulary: (label: string, english: string, kannada: string) =>
    request<VocabEntry>("/api/vocabulary", { method: "POST", body: JSON.stringify({ label, english, kannada }) }),
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
  deleteSample: (label: string, sampleId: string) =>
    request<{ ok: boolean }>(`/api/dataset/samples/${encodeURIComponent(label)}/${encodeURIComponent(sampleId)}`, {
      method: "DELETE",
    }),
};
