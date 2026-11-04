import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ActivitySegmenter,
  blockBalancedCosineSimilarity,
  cleanSequence,
  computeMotion,
  defaultRecognitionSettings,
  FACE_FLAG_INDEX,
  FACEREL_OFFSET,
  FaceTracker,
  FRAME_DIM,
  framesToMatrix,
  framesToVectorsTTA,
  HAND_DIM,
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
    const tracker = new FaceTracker(0.5, 10);
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

  it("stabilizeSingleHandSlots and imputeFaceRelative repair 1-frame slot flips and face dropouts", () => {
    const frames: FrameFeatures[] = [];
    for (let i = 0; i < 10; i++) {
      // At frame 4, simulate a 1-frame MediaPipe handedness flip ("Right" instead of "Left")
      // At frames 5 and 6, simulate face detection dropout (face: null)
      const handedness = i === 4 ? "Right" : "Left";
      const face = i === 5 || i === 6 ? null : { cx: 0.5, cy: 0.32, w: 0.18, h: 0.22 };
      frames.push(
        parseFrame({
          t: i * 33.3,
          w: 640,
          h: 480,
          hands: [
            {
              handedness,
              score: 0.92,
              landmarks: makeSyntheticHandLandmarks(0.42 + i * 0.01, 0.52 - i * 0.01),
            },
          ],
          face,
        })
      );
    }

    const cleaned = cleanSequence(framesToMatrix(frames));
    assert.notEqual(cleaned, null);
    assert.equal(cleaned!.length, 10);

    // Every frame in cleaned should now have slot 0 (Left) present, slot 1 (Right) absent, and face flag = 1.0
    for (let i = 0; i < cleaned!.length; i++) {
      const row = cleaned![i];
      assert.equal(row[PRESENCE_OFFSET], 1.0, `Expected slot 0 present at frame ${i}`);
      assert.equal(row[HAND_DIM + PRESENCE_OFFSET], 0.0, `Expected slot 1 absent at frame ${i}`);
      assert.equal(row[FACE_FLAG_INDEX], 1.0, `Expected imputed face flag 1.0 at frame ${i}`);
      assert.notEqual(row[FACEREL_OFFSET + 2], 0, `Expected non-zero palm/fw ratio at frame ${i}`);
    }
  });

  it("resampleSequence zeros entire 73-dim hand slot when interpolated presence < 0.5", () => {
    const r0 = new Float32Array(FRAME_DIM);
    r0[0] = 3.5; // hand shape value
    r0[PRESENCE_OFFSET] = 1.0;

    const r1 = new Float32Array(FRAME_DIM);
    // slot 0 absent in r1

    const resampled = resampleSequence([r0, r1], 4);
    assert.equal(resampled.length, 4);
    // At t=3 (pos=1.0) and t=2 (pos=0.667, presence=0.333 < 0.5), entire slot 0 must be zeroed
    assert.equal(resampled[2][PRESENCE_OFFSET], 0.0);
    assert.equal(resampled[2][0], 0.0);
    assert.equal(resampled[3][PRESENCE_OFFSET], 0.0);
    assert.equal(resampled[3][0], 0.0);
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

  it("framesToVectorsTTA produces 3 normalized views of 3668 floats for segments >= 10 frames", () => {
    const frames: FrameFeatures[] = [];
    for (let i = 0; i < 14; i++) {
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
    const views = framesToVectorsTTA(frames);
    assert.notEqual(views, null);
    assert.equal(views!.length, 3);
    const weightSum = views!.reduce((s, v) => s + v.weight, 0);
    assert.ok(Math.abs(weightSum - 1.0) < 1e-6);
    for (const v of views!) {
      assert.equal(v.vector.length, 3668);
    }
  });

  it("ActivitySegmenter segments on stillness and trims the still tail", () => {
    const settings = defaultRecognitionSettings(0.55);
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
