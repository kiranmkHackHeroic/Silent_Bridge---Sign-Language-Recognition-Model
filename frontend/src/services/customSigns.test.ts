import { describe, expect, it, beforeEach } from "vitest";
import {
  averageEmbeddings,
  cosineSimilarity,
  deleteCustomSign,
  exportCustomSigns,
  importCustomSigns,
  loadCustomSigns,
  matchCustomSign,
  saveCustomSign,
  type CustomSign,
} from "./customSigns";

// Simple in-memory localStorage mock for node test runner
const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
};
// @ts-expect-error test mock
globalThis.localStorage = mockLocalStorage;

describe("Few-shot custom signs storage & prototype matching", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it("calculates exact cosine similarity", () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);

    const c = [0, 1, 0];
    expect(cosineSimilarity(a, c)).toBeCloseTo(0.0);

    const d = [1, 1, 0];
    expect(cosineSimilarity(a, d)).toBeCloseTo(1 / Math.sqrt(2));
  });

  it("averages multiple sample embeddings element-wise", () => {
    const s1 = [1, 2, 3];
    const s2 = [3, 4, 5];
    const mean = averageEmbeddings([s1, s2]);
    expect(mean).toEqual([2, 3, 4]);
  });

  it("saves, loads, and deletes custom signs in localStorage", () => {
    expect(loadCustomSigns()).toHaveLength(0);

    const sign: CustomSign = {
      id: "custom_kiran",
      name: "Kiran",
      kannada: "ಕಿರಣ್",
      sampleCount: 3,
      createdAt: Date.now(),
      embedding: [0.5, 0.5, 0.5],
    };

    saveCustomSign(sign);
    const loaded = loadCustomSigns();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Kiran");
    expect(loaded[0].kannada).toBe("ಕಿರಣ್");

    deleteCustomSign(sign.id);
    expect(loadCustomSigns()).toHaveLength(0);
  });

  it("matches feature vectors against registered prototypes above threshold", () => {
    const targetEmbedding = [0.8, 0.2, 0.1];
    saveCustomSign({
      id: "custom_water_regional",
      name: "Water (Regional)",
      kannada: "ನೀರು",
      sampleCount: 3,
      createdAt: Date.now(),
      embedding: targetEmbedding,
    });

    // Close vector -> match
    const queryClose = [0.82, 0.19, 0.09];
    const match = matchCustomSign(queryClose, 0.85);
    expect(match).not.toBeNull();
    expect(match?.sign.name).toBe("Water (Regional)");
    expect(match?.similarity).toBeGreaterThan(0.95);

    // Distant vector -> no match
    const queryFar = [0.0, 1.0, 0.0];
    expect(matchCustomSign(queryFar, 0.85)).toBeNull();
  });

  it("exports and imports custom signs as JSON", () => {
    saveCustomSign({
      id: "custom_school",
      name: "My School",
      kannada: "ನನ್ನ ಶಾಲೆ",
      sampleCount: 3,
      createdAt: Date.now(),
      embedding: [1, 2, 3],
    });

    const json = exportCustomSigns();
    expect(json).toContain("My School");

    mockLocalStorage.clear();
    expect(loadCustomSigns()).toHaveLength(0);

    const importedCount = importCustomSigns(json);
    expect(importedCount).toBe(1);
    expect(loadCustomSigns()).toHaveLength(1);
  });
});
