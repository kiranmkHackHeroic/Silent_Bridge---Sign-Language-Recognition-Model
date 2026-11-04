import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  averageEmbeddings,
  blockBalancedCosineSimilarity,
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
    assert.ok(Math.abs(cosineSimilarity(a, b) - 1.0) < 1e-6);

    const c = [0, 1, 0];
    assert.ok(Math.abs(cosineSimilarity(a, c) - 0.0) < 1e-6);

    const d = [1, 1, 0];
    assert.ok(Math.abs(cosineSimilarity(a, d) - 1 / Math.sqrt(2)) < 1e-6);
  });

  it("averages multiple sample embeddings and down-weights outliers when >= 3 samples", () => {
    const s1 = [1, 2, 3];
    const s2 = [3, 4, 5];
    const mean = averageEmbeddings([s1, s2]);
    assert.deepEqual(mean, [2, 3, 4]);

    // 3 consistent samples + 1 orthogonal outlier
    const c1 = [1, 0, 0];
    const c2 = [0.98, 0.02, 0];
    const c3 = [0.99, 0.01, 0];
    const outlier = [0, 0, 1];
    const robust = averageEmbeddings([c1, c2, c3, outlier]);
    // Consensus weighting should keep x-component higher than naive 0.7425 average
    assert.ok(robust[0] > 0.85, `Expected x > 0.85 with outlier down-weighting, got ${robust[0]}`);
  });

  it("balances hand shape, face-relative location, and velocity blocks in 3668-D similarity", () => {
    const vecChin = new Float32Array(3668);
    const vecForehead = new Float32Array(3668);
    // Give both identical hand shapes (60 floats per frame), but opposite face-relative Y and velocity
    for (let t = 0; t < 24; t++) {
      const fBase = t * 147;
      for (let i = 0; i < 60; i++) {
        vecChin[fBase + i] = 0.5;
        vecForehead[fBase + i] = 0.5;
      }
      // Face-relative dx, dy, palm/fw at offset 63..65
      vecChin[fBase + 63] = 0.1;
      vecChin[fBase + 64] = 0.8; // below face center (chin)
      vecChin[fBase + 65] = 0.5;

      vecForehead[fBase + 63] = 0.1;
      vecForehead[fBase + 64] = -0.8; // above face center (forehead)
      vecForehead[fBase + 65] = 0.5;
    }
    const rawSim = cosineSimilarity(vecChin, vecForehead);
    const balancedSim = blockBalancedCosineSimilarity(vecChin, vecForehead);
    // Raw cosine similarity is > 0.90 because 60 handshape dims dominate 3 face-rel dims;
    // block-balanced similarity penalizes the opposite face location significantly.
    assert.ok(rawSim > 0.90);
    assert.ok(balancedSim < rawSim - 0.08, `Expected balancedSim (${balancedSim}) < rawSim (${rawSim}) - 0.08`);
  });

  it("saves, loads, and deletes custom signs in localStorage", () => {
    assert.equal(loadCustomSigns().length, 0);

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
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].name, "Kiran");
    assert.equal(loaded[0].kannada, "ಕಿರಣ್");

    deleteCustomSign(sign.id);
    assert.equal(loadCustomSigns().length, 0);
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

    const queryClose = [0.82, 0.19, 0.09];
    const match = matchCustomSign(queryClose, 0.85);
    assert.notEqual(match, null);
    assert.equal(match?.sign.name, "Water (Regional)");
    assert.ok((match?.similarity ?? 0) > 0.95);

    const queryFar = [0.0, 1.0, 0.0];
    assert.equal(matchCustomSign(queryFar, 0.85), null);
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
    assert.ok(json.includes("My School"));

    mockLocalStorage.clear();
    assert.equal(loadCustomSigns().length, 0);

    const importedCount = importCustomSigns(json);
    assert.equal(importedCount, 1);
    assert.equal(loadCustomSigns().length, 1);
  });
});
