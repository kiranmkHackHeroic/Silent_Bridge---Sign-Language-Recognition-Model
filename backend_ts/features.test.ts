import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import * as ort from "onnxruntime-node";
import {
  ActivitySegmenter,
  aggregateTTAProbabilities,
  averageFeatureVectors,
  blockBalancedCosineSimilarity,
  cleanSequence,
  computeMotion,
  defaultRecognitionSettings,
  despikeSequenceMatrix,
  evaluateAcceptanceGate,
  FACE_FLAG_INDEX,
  FACEREL_OFFSET,
  FaceTracker,
  FRAME_DIM,
  framesToMatrix,
  framesToVectorsTTA,
  HAND_DIM,
  normalizeProbabilities,
  ORIENT_OFFSET,
  parseFrame,
  POS_OFFSET,
  PRESENCE_OFFSET,
  ProbabilitySmoother,
  resampleSequence,
  smoothSequenceMatrix,
  StablePredictionGate,
  trimIdleEnds,
  type FrameFeatures,
} from "./features.ts";

function makeSyntheticHandLandmarks(wx: number, wy: number, palmScale = 0.08): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < 21; i++) {
    const angle = (i / 21) * Math.PI;
    const r = i === 0 ? 0 : palmScale * (1 + (i % 4) * 0.25);
    pts.push([wx + Math.cos(angle) * r, wy - Math.sin(angle) * r, -0.01 * (i % 5)]);
  }
  return pts;
}

describe("Sign recognition accuracy pipeline (features & TTA)", () => {
  it("FaceTracker smooths face coordinates and retains anchor during hand-over-face occlusion", () => {
    const tracker = new FaceTracker(0.55, 120);
    const f1 = parseFrame({
      t: 0,
      w: 640,
      h: 480,
      hands: [{ handedness: "Left", score: 0.95, landmarks: makeSyntheticHandLandmarks(0.45, 0.55) }],
      face: { cx: 0.5, cy: 0.35, w: 0.2, h: 0.25 },
    }, tracker);
    assert.equal(f1.face, true);
    assert.equal(f1.vector[FACE_FLAG_INDEX], 1.0);
    assert.notEqual(f1.vector[FACEREL_OFFSET + 1], 0);

    // Frame 2: hand occludes face -> payload.face is null, but FaceTracker preserves anchor!
    const f2 = parseFrame({
      t: 33,
      w: 640,
      h: 480,
      hands: [{ handedness: "Left", score: 0.95, landmarks: makeSyntheticHandLandmarks(0.48, 0.38) }],
      face: null,
    }, tracker);
    assert.equal(f2.face, true);
    assert.equal(f2.vector[FACE_FLAG_INDEX], 1.0);
    assert.ok(Math.abs(f2.vector[FACEREL_OFFSET + 1]) < 0.5, "Hand near occluded face should have small face-relative dy");
  });

  it("stabilizeSingleHandSlots and imputeFaceRelative repair multi-frame slot flips (up to 25%) and face dropouts", () => {
    const frames: FrameFeatures[] = [];
    for (let i = 0; i < 24; i++) {
      // Simulate a 5-frame mid-sign handedness flip ("Right" instead of "Left")
      // and face detection dropout at frames 10..13
      const handedness = i >= 8 && i <= 12 ? "Right" : "Left";
      const face = i >= 10 && i <= 13 ? null : { cx: 0.5, cy: 0.32, w: 0.18, h: 0.22 };
      frames.push(
        parseFrame({
          t: i * 33.3,
          w: 640,
          h: 480,
          hands: [
            {
              handedness,
              score: 0.92,
              landmarks: makeSyntheticHandLandmarks(0.42 + i * 0.005, 0.52 - i * 0.005),
            },
          ],
          face,
        })
      );
    }

    const cleaned = cleanSequence(framesToMatrix(frames));
    assert.notEqual(cleaned, null);
    assert.equal(cleaned!.length, 24);

    // Every frame in cleaned should now have slot 0 (Left) present, slot 1 (Right) absent, and face flag = 1.0
    for (let i = 0; i < cleaned!.length; i++) {
      const row = cleaned![i];
      assert.equal(row[PRESENCE_OFFSET], 1.0, `Expected slot 0 present at frame ${i}`);
      assert.equal(row[HAND_DIM + PRESENCE_OFFSET], 0.0, `Expected slot 1 absent at frame ${i}`);
      assert.equal(row[FACE_FLAG_INDEX], 1.0, `Expected imputed face flag 1.0 at frame ${i}`);
      assert.notEqual(row[FACEREL_OFFSET + 2], 0, `Expected non-zero palm/fw ratio at frame ${i}`);
    }
  });

  it("resampleSequence avoids landmark shrinkage at 1->0 presence boundaries while zeroing absent slots", () => {
    const r0 = new Float32Array(FRAME_DIM);
    r0[0] = 3.5; // hand shape value
    r0[ORIENT_OFFSET] = 1.0; // unit finger direction
    r0[ORIENT_OFFSET + 3] = 1.0; // unit palm normal
    r0[PRESENCE_OFFSET] = 1.0;

    const r1 = new Float32Array(FRAME_DIM);
    // slot 0 absent in r1

    const resampled = resampleSequence([r0, r1], 4);
    assert.equal(resampled.length, 4);
    // At t=1 (pos=0.333, interpPres=0.667 >= 0.5), slot 0 must copy active r0 verbatim (no 33% shrinkage!)
    assert.equal(resampled[1][PRESENCE_OFFSET], 1.0);
    assert.equal(resampled[1][0], 3.5);
    assert.equal(resampled[1][ORIENT_OFFSET], 1.0);
    // At t=2 (pos=0.667, interpPres=0.333 < 0.5) and t=3, entire slot 0 must be zeroed
    assert.equal(resampled[2][PRESENCE_OFFSET], 0.0);
    assert.equal(resampled[2][0], 0.0);
    assert.equal(resampled[3][PRESENCE_OFFSET], 0.0);
    assert.equal(resampled[3][0], 0.0);
  });

  it("despikeSequenceMatrix eliminates 1-frame MediaPipe teleportation spikes and preserves unit orientation", () => {
    const frames: FrameFeatures[] = [];
    for (let i = 0; i < 7; i++) {
      // Frame 3 teleports wildly by +0.35
      const wx = i === 3 ? 0.85 : 0.45 + i * 0.005;
      frames.push(
        parseFrame({
          t: i * 33.3,
          w: 640,
          h: 480,
          hands: [{ handedness: "Left", score: 0.95, landmarks: makeSyntheticHandLandmarks(wx, 0.5) }],
          face: { cx: 0.5, cy: 0.35, w: 0.2, h: 0.25 },
        })
      );
    }
    const rawMat = framesToMatrix(frames);
    const despiked = despikeSequenceMatrix(rawMat);
    const neighborAvg = 0.5 * (rawMat[2][POS_OFFSET] + rawMat[4][POS_OFFSET]);
    assert.ok(
      Math.abs(despiked[3][POS_OFFSET] - neighborAvg) < 0.05,
      `Expected despiked x (${despiked[3][POS_OFFSET]}) close to neighbor avg (${neighborAvg})`
    );
    const fdNorm = Math.hypot(
      despiked[3][ORIENT_OFFSET],
      despiked[3][ORIENT_OFFSET + 1],
      despiked[3][ORIENT_OFFSET + 2]
    );
    assert.ok(Math.abs(fdNorm - 1.0) < 1e-5);
  });

  it("smoothSequenceMatrix reduces high-frequency coordinate jitter while preserving unit orientation normals", () => {
    const frames: FrameFeatures[] = [];
    for (let i = 0; i < 8; i++) {
      const jitter = i % 2 === 0 ? 0.015 : -0.015;
      frames.push(
        parseFrame({
          t: i * 33.3,
          w: 640,
          h: 480,
          hands: [{ handedness: "Left", score: 0.95, landmarks: makeSyntheticHandLandmarks(0.45 + jitter, 0.5) }],
          face: { cx: 0.5, cy: 0.35, w: 0.2, h: 0.25 },
        })
      );
    }
    const rawMat = framesToMatrix(frames);
    const smoothed = smoothSequenceMatrix(rawMat);

    // Check that alternating x-position jitter at interior frames is reduced
    const rawDelta = Math.abs(rawMat[3][POS_OFFSET] - rawMat[2][POS_OFFSET]);
    const smoothDelta = Math.abs(smoothed[3][POS_OFFSET] - smoothed[2][POS_OFFSET]);
    assert.ok(smoothDelta < rawDelta * 0.5, `Expected smoothDelta (${smoothDelta}) < 0.5 * rawDelta (${rawDelta})`);

    // Check unit length of finger direction and palm normal
    const fdNorm = Math.hypot(
      smoothed[3][ORIENT_OFFSET],
      smoothed[3][ORIENT_OFFSET + 1],
      smoothed[3][ORIENT_OFFSET + 2]
    );
    assert.ok(Math.abs(fdNorm - 1.0) < 1e-5);
  });

  it("trimIdleEnds trims static lead-in/tail frames around an active sign stroke", () => {
    const frames: FrameFeatures[] = [];
    for (let i = 0; i < 20; i++) {
      // Frames 0..4 static at x=0.3, frames 5..14 moving across to x=0.6, frames 15..19 static at x=0.6
      const progress = Math.max(0, Math.min(1, (i - 4) / 10));
      frames.push(
        parseFrame({
          t: i * 33.3,
          w: 640,
          h: 480,
          hands: [{ handedness: "Left", score: 0.95, landmarks: makeSyntheticHandLandmarks(0.3 + progress * 0.3, 0.5) }],
          face: { cx: 0.5, cy: 0.35, w: 0.2, h: 0.25 },
        })
      );
    }
    const rawMat = framesToMatrix(frames);
    const trimmed = trimIdleEnds(rawMat);
    assert.ok(trimmed.length < rawMat.length, `Expected trimmed length (${trimmed.length}) < ${rawMat.length}`);
    assert.ok(trimmed.length >= 8);
  });

  it("framesToVectorsTTA produces 5 views for >= 12 frames and 3 views for short 8-frame segments", () => {
    const makeFrames = (count: number) => {
      const frames: FrameFeatures[] = [];
      for (let i = 0; i < count; i++) {
        frames.push(
          parseFrame({
            t: i * 33.3,
            w: 640,
            h: 480,
            hands: [{ handedness: "Left", score: 0.95, landmarks: makeSyntheticHandLandmarks(0.35 + i * 0.015, 0.55 - i * 0.01) }],
            face: { cx: 0.5, cy: 0.35, w: 0.2, h: 0.25 },
          })
        );
      }
      return frames;
    };

    const views14 = framesToVectorsTTA(makeFrames(14));
    assert.notEqual(views14, null);
    assert.equal(views14!.length, 5);
    const weightSum14 = views14!.reduce((s, v) => s + v.weight, 0);
    assert.ok(Math.abs(weightSum14 - 1.0) < 1e-6);
    for (const v of views14!) {
      assert.equal(v.vector.length, 3668);
    }

    const views8 = framesToVectorsTTA(makeFrames(8));
    assert.notEqual(views8, null);
    assert.equal(views8!.length, 3);
    const weightSum8 = views8!.reduce((s, v) => s + v.weight, 0);
    assert.ok(Math.abs(weightSum8 - 1.0) < 1e-6);
  });

  it("normalizeProbabilities fixes unnormalized 3x ensemble outputs to a valid simplex summing to 1.0", () => {
    const raw = new Float32Array([2.1, 0.6, 0.3, -0.1, Number.NaN]);
    const norm = normalizeProbabilities(raw);
    let sum = 0;
    for (let i = 0; i < norm.length; i++) {
      assert.ok(norm[i] >= 0 && norm[i] <= 1);
      sum += norm[i];
    }
    assert.ok(Math.abs(sum - 1.0) < 1e-6);
    assert.ok(Math.abs(norm[0] - 0.7) < 1e-6);
    assert.ok(Math.abs(norm[1] - 0.2) < 1e-6);
    assert.ok(Math.abs(norm[2] - 0.1) < 1e-6);
    assert.equal(norm[3], 0);
    assert.equal(norm[4], 0);
  });

  it("live sign_model.onnx output sums to ~3.0 raw and normalizes cleanly to 1.0 via normalizeProbabilities", async () => {
    const onnxPath = path.resolve(process.cwd(), "frontend", "public", "models", "sign_model.onnx");
    const session = await ort.InferenceSession.create(onnxPath, {
      executionProviders: ["cpu"],
    });
    const input = new Float32Array(3668);
    const tensor = new ort.Tensor("float32", input, [1, 3668]);
    const out = await session.run({ [session.inputNames[0]]: tensor });
    const raw = out[session.outputNames[0]].data as Float32Array;
    assert.equal(raw.length, 144);

    let rawSum = 0;
    for (let i = 0; i < raw.length; i++) rawSum += raw[i];
    assert.ok(rawSum > 2.9 && rawSum < 3.1, `Expected unnormalized 3-seed ONNX sum ~3.0, got ${rawSum}`);

    const calibrated = normalizeProbabilities(raw);
    let normSum = 0;
    let maxP = 0;
    for (let i = 0; i < calibrated.length; i++) {
      assert.ok(calibrated[i] >= 0 && calibrated[i] <= 1.0);
      normSum += calibrated[i];
      if (calibrated[i] > maxP) maxP = calibrated[i];
    }
    assert.ok(Math.abs(normSum - 1.0) < 1e-5, `Expected normalized sum 1.0, got ${normSum}`);
    assert.ok(maxP <= 1.0 && maxP > 0);
  });

  it("aggregateTTAProbabilities favors multi-view consensus over a single-view spike", () => {
    // Class 0 is consistently strong across all 4 views (~0.45), whereas Class 1 only spikes in 1 view (0.95)
    const agg = aggregateTTAProbabilities([
      { probs: [0.46, 0.02, 0.52], weight: 0.25 },
      { probs: [0.46, 0.02, 0.52], weight: 0.25 },
      { probs: [0.48, 0.02, 0.50], weight: 0.25 },
      { probs: [0.45, 0.54, 0.01], weight: 0.25 },
    ]);
    // Geometric component penalizes Class 2's 0.01 collapse and Class 1's 0.02 views, elevating consistent Class 0
    assert.equal(agg.bestIndex, 0);
    assert.ok(agg.confidence > 0 && agg.confidence <= 1);
    assert.ok(agg.margin > 0);
    assert.ok(agg.normalizedEntropy >= 0 && agg.normalizedEntropy <= 1);
  });

  it("evaluateAcceptanceGate enforces user threshold, rejects noisy ties, and rescues strong consensus", () => {
    // High user threshold (0.75): must NOT bypass at confidence 0.45 even with strong margin
    const strictReject = evaluateAcceptanceGate(
      { confidence: 0.45, margin: 0.30, viewAgreement: 1.0, normalizedEntropy: 0.25 },
      0.75
    );
    assert.equal(strictReject.accepted, false);

    // Ambiguous top-2 tie right at threshold (margin < 0.06) should be rejected
    const tieReject = evaluateAcceptanceGate(
      { confidence: 0.56, margin: 0.02, viewAgreement: 0.6, normalizedEntropy: 0.6 },
      0.55
    );
    assert.equal(tieReject.accepted, false);

    // High-entropy diffuse noise should be rejected
    const noisyReject = evaluateAcceptanceGate(
      { confidence: 0.58, margin: 0.08, viewAgreement: 0.4, normalizedEntropy: 0.85 },
      0.55
    );
    assert.equal(noisyReject.accepted, false);

    // Clean threshold met with clear margin should be accepted
    const cleanAccept = evaluateAcceptanceGate(
      { confidence: 0.62, margin: 0.18, viewAgreement: 0.8, normalizedEntropy: 0.35 },
      0.55
    );
    assert.equal(cleanAccept.accepted, true);
    assert.equal(cleanAccept.reason, "threshold_met");

    // Narrow consensus rescue when threshold <= 0.65, >=80% agreement, low entropy, large margin
    const consensusAccept = evaluateAcceptanceGate(
      { confidence: 0.48, margin: 0.28, viewAgreement: 1.0, normalizedEntropy: 0.32 },
      0.55
    );
    assert.equal(consensusAccept.accepted, true);
    assert.equal(consensusAccept.reason, "high_consensus_rescue");
  });

  it("averageFeatureVectors down-weights noisy outlier recordings when N >= 3", () => {
    const good1 = new Float32Array(3668).fill(1.0);
    const good2 = new Float32Array(3668).fill(1.02);
    const good3 = new Float32Array(3668).fill(0.98);
    const outlier = new Float32Array(3668).fill(-1.0);
    const centroid = averageFeatureVectors([good1, good2, good3, outlier]);
    assert.notEqual(centroid, null);
    // Unweighted mean would be 0.5; consensus-weighted centroid should be much closer to 1.0
    assert.ok(centroid![0] > 0.85, `Expected outlier-resistant centroid > 0.85, got ${centroid![0]}`);
  });

  it("ActivitySegmenter segments on stillness and trims the still tail", () => {
    const settings = defaultRecognitionSettings(0.55);
    assert.equal(settings.use_tta, true);
    const seg = new ActivitySegmenter(settings);
    let prev: FrameFeatures | null = null;
    let emitted = null;

    // 12 moving frames + 25 still frames (25 * 33.3ms = 832ms > 650ms still_ms)
    for (let i = 0; i < 37; i++) {
      const moving = i < 12;
      const wx = moving ? 0.3 + i * 0.025 : 0.3 + 11 * 0.025;
      const f = parseFrame({
        t: i * 33.3,
        w: 640,
        h: 480,
        hands: [{ handedness: "Left", score: 0.95, landmarks: makeSyntheticHandLandmarks(wx, 0.5) }],
        face: { cx: 0.5, cy: 0.35, w: 0.2, h: 0.25 },
      });
      computeMotion(prev, f);
      prev = f;
      const out = seg.update(f);
      if (out) {
        emitted = out;
        break;
      }
    }

    assert.notEqual(emitted, null);
    assert.equal(emitted!.reason, "still");
    assert.ok(seg.last_trimmed > 10, `Expected still tail trimmed (>10 frames), got ${seg.last_trimmed}`);
  });

  it("ProbabilitySmoother and StablePredictionGate lock and release predictions cleanly", () => {
    const smoother = new ProbabilitySmoother(0.5);
    const s1 = smoother.update({ water: 0.8, eat: 0.2 });
    assert.equal(s1.water, 0.8);
    const s2 = smoother.update({ water: 0.4, eat: 0.6 });
    assert.ok(Math.abs(s2.water - 0.6) < 1e-6);

    const gate = new StablePredictionGate(0.6, 3, 0.2, 2, 500);
    assert.equal(gate.update("water", 0.75, 100), null);
    assert.equal(gate.update("water", 0.78, 133), null);
    assert.equal(gate.update("water", 0.82, 166), "water");
    // Held sign should stay locked and not re-emit
    assert.equal(gate.update("water", 0.85, 800), null);
    // Notify boundary unlocks so same sign can be emitted again
    gate.notifyBoundary();
    assert.equal(gate.update("water", 0.75, 900), null);
    assert.equal(gate.update("water", 0.78, 933), null);
    assert.equal(gate.update("water", 0.82, 966), "water");
  });

  it("blockBalancedCosineSimilarity distinguishes identical handshapes at different face heights", () => {
    const a = new Float32Array(3668);
    const b = new Float32Array(3668);
    for (let t = 0; t < 24; t++) {
      const fBase = t * FRAME_DIM;
      for (let i = 0; i < 60; i++) {
        a[fBase + i] = 0.4;
        b[fBase + i] = 0.4;
      }
      a[fBase + FACEREL_OFFSET + 1] = -0.9; // forehead (father)
      b[fBase + FACEREL_OFFSET + 1] = 0.9;  // chin (mother)
    }
    const sim = blockBalancedCosineSimilarity(a, b);
    assert.ok(sim < 0.85, `Expected block-balanced similarity < 0.85 for opposite face heights, got ${sim}`);
  });
});

