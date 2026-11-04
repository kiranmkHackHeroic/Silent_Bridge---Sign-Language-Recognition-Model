import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { AnimationClip } from "../services/types";
import { BLEND_IN, BLEND_OUT, HOLD, NEUTRAL, TRANSITION, buildTimeline, lerpPose, poseAt, sampleClip } from "./animation";

const pose = (x: number) => ({
  pos: [x, 1.2, 0.3] as [number, number, number],
  dir: [0, 1, 0] as [number, number, number],
  normal: [0, 0, 1] as [number, number, number],
  curl: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
});

const clip: AnimationClip = {
  sign_id: "test",
  type: "placeholder",
  verified: false,
  description: "",
  duration: 1,
  keyframes: [
    { t: 0, right: pose(0), left: null },
    { t: 1, right: pose(1), left: null },
  ],
};

describe("animation sampling", () => {
  test("interpolates keyframes", () => {
    assert.ok(Math.abs(sampleClip(clip, 0.5).right.pos[0] - 0.5) < 1e-4);
    assert.equal(sampleClip(clip, -1).right.pos[0], 0);
    assert.equal(sampleClip(clip, 5).right.pos[0], 1);
  });

  test("uses the neutral pose for a hand that is null", () => {
    assert.deepEqual(sampleClip(clip, 0.5).left, NEUTRAL.left);
  });

  test("keeps direction and normal unit length and perpendicular", () => {
    const a = { ...pose(0), dir: [0, 1, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number] };
    const b = { ...pose(0), dir: [0, 0, 1] as [number, number, number], normal: [0, -1, 0] as [number, number, number] };
    const p = lerpPose(a, b, 0.5);
    assert.ok(Math.abs(Math.hypot(...p.dir) - 1) < 1e-5);
    assert.ok(Math.abs(Math.hypot(...p.normal) - 1) < 1e-5);
    assert.ok(Math.abs(p.dir[0] * p.normal[0] + p.dir[1] * p.normal[1] + p.dir[2] * p.normal[2]) < 1e-5);
  });
});

describe("sequence timeline", () => {
  test("plays clips in order as continuous signing and returns to neutral once at the end", () => {
    const tl = buildTimeline([clip, { ...clip, sign_id: "second" }]);
    const secondStart = BLEND_IN + 1 + TRANSITION;
    assert.ok(Math.abs(tl.duration - (secondStart + 1 + HOLD + BLEND_OUT)) < 1e-5);
    assert.equal(poseAt(tl, BLEND_IN + 0.5).index, 0);
    assert.equal(poseAt(tl, secondStart + 0.5).index, 1);
    assert.equal(poseAt(tl, secondStart + 1 + HOLD + 0.1).index, -1);
    // between the two signs the hands go straight from the end of sign 1 to the start of sign 2, never to rest
    const mid = poseAt(tl, BLEND_IN + 1 + TRANSITION / 2).pose;
    assert.notDeepEqual(mid.right.pos, NEUTRAL.right.pos);
    assert.equal(tl.segments.filter((s) => s.kind === "blend" && s.to === NEUTRAL).length, 1);
    const end = poseAt(tl, tl.duration + 1);
    assert.equal(end.done, true);
    assert.deepEqual(end.pose, NEUTRAL);
  });

  test("an empty sequence is immediately done", () => {
    const tl = buildTimeline([]);
    assert.equal(tl.duration, 0);
    assert.equal(poseAt(tl, 0).done, true);
  });
});

describe("co-articulation, lip-mouthing & Pixar 3D character rig", () => {
  test("coarticulatePair adds a smooth ballistic arc offset between consecutive signs", async () => {
    const { coarticulatePair, lerpPair } = await import("./animation");
    const a = { ...NEUTRAL, right: { ...NEUTRAL.right, pos: [0.0, 1.2, 0.3] as [number, number, number] } };
    const b = { ...NEUTRAL, right: { ...NEUTRAL.right, pos: [0.2, 1.2, 0.3] as [number, number, number] } };
    const straight = lerpPair(a, b, 0.5);
    const coarticulated = coarticulatePair(a, b, 0.5, true);
    assert.ok(coarticulated.right.pos[1] < straight.right.pos[1]);
  });

  test("converts Kannada text to phonetic visemes", async () => {
    const { wordToVisemes, sampleLipSync } = await import("./lipSync");
    const visemes = wordToVisemes("ನಮಸ್ಕಾರ");
    assert.ok(visemes.length >= 3);
    const midViseme = sampleLipSync("ನಮಸ್ಕಾರ", 0.5);
    assert.ok(midViseme.mouthOpen > 0.05);
  });

  test("animates lip mouthing during clip playback and returns to rest during hold", () => {
    const tl = buildTimeline([clip]);
    const inClipFace = poseAt(tl, BLEND_IN + 0.5).face;
    assert.ok(inClipFace);
    assert.ok(inClipFace.mouthOpen > 0);

    const holdFace = poseAt(tl, BLEND_IN + 1 + HOLD / 2).face;
    assert.ok(holdFace.mouthOpen <= inClipFace.mouthOpen + 0.1);
  });

  test("calculates spontaneous natural eye blinking", async () => {
    const { computeBlink } = await import("./lipSync");
    assert.equal(computeBlink(0), 0);
    assert.ok(computeBlink(0.06) > 0.5);
  });

  test("raises eyebrows and rounds mouth for ISL question signs and emotion presets", async () => {
    const { computeFacePose, applyEmotionPreset, NEUTRAL_FACE } = await import("./lipSync");
    const qFace = computeFacePose("what", 0.5, 1.0, false);
    assert.ok(qFace.browRaise > 0.5);
    assert.equal(qFace.emotion, "question");

    const smileFace = computeFacePose("namaskara", 0.5, 1.0, false);
    assert.ok(smileFace.mouthSmile > 0.5);
    assert.equal(smileFace.emotion, "smile");

    const presetQ = applyEmotionPreset(NEUTRAL_FACE, "question");
    assert.ok(presetQ.browRaise >= 0.8);
    assert.ok(presetQ.mouthPucker > 0.5);

    const presetS = applyEmotionPreset(NEUTRAL_FACE, "smile");
    assert.ok(presetS.mouthSmile > 0.7);
  });

  test("instantiates procedural AvatarRig and updates poses and expressions without error", async () => {
    const { AvatarRig } = await import("./AvatarRig");
    const rig = new AvatarRig();
    assert.ok(rig.group.children.length > 0);
    rig.setGaze(0.3, -0.2);
    rig.setEmotion("smile");
    assert.equal(rig.getEmotion(), "smile");
    rig.setPose(NEUTRAL, 0.5);
    rig.setEmotion("question");
    rig.setPose(NEUTRAL, 1.0);
    rig.setEmotion(null);
    rig.triggerReaction("greeting");
    rig.setPose(NEUTRAL, 1.2);
  });
});
