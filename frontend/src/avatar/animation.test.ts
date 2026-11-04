import { describe, expect, it } from "vitest";
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
  it("interpolates keyframes", () => {
    expect(sampleClip(clip, 0.5).right.pos[0]).toBeCloseTo(0.5);
    expect(sampleClip(clip, -1).right.pos[0]).toBe(0);
    expect(sampleClip(clip, 5).right.pos[0]).toBe(1);
  });

  it("uses the neutral pose for a hand that is null", () => {
    expect(sampleClip(clip, 0.5).left).toEqual(NEUTRAL.left);
  });

  it("keeps direction and normal unit length and perpendicular", () => {
    const a = { ...pose(0), dir: [0, 1, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number] };
    const b = { ...pose(0), dir: [0, 0, 1] as [number, number, number], normal: [0, -1, 0] as [number, number, number] };
    const p = lerpPose(a, b, 0.5);
    expect(Math.hypot(...p.dir)).toBeCloseTo(1);
    expect(Math.hypot(...p.normal)).toBeCloseTo(1);
    expect(p.dir[0] * p.normal[0] + p.dir[1] * p.normal[1] + p.dir[2] * p.normal[2]).toBeCloseTo(0);
  });
});

describe("sequence timeline", () => {
  it("plays clips in order as continuous signing and returns to neutral once at the end", () => {
    const tl = buildTimeline([clip, { ...clip, sign_id: "second" }]);
    const secondStart = BLEND_IN + 1 + TRANSITION;
    expect(tl.duration).toBeCloseTo(secondStart + 1 + HOLD + BLEND_OUT);
    expect(poseAt(tl, BLEND_IN + 0.5).index).toBe(0);
    expect(poseAt(tl, secondStart + 0.5).index).toBe(1);
    expect(poseAt(tl, secondStart + 1 + HOLD + 0.1).index).toBe(-1);
    // between the two signs the hands go straight from the end of sign 1 to the start of sign 2, never to rest
    const mid = poseAt(tl, BLEND_IN + 1 + TRANSITION / 2).pose;
    expect(mid.right.pos).not.toEqual(NEUTRAL.right.pos);
    expect(tl.segments.filter((s) => s.kind === "blend" && s.to === NEUTRAL)).toHaveLength(1);
    const end = poseAt(tl, tl.duration + 1);
    expect(end.done).toBe(true);
    expect(end.pose).toEqual(NEUTRAL);
  });

  it("an empty sequence is immediately done", () => {
    const tl = buildTimeline([]);
    expect(tl.duration).toBe(0);
    expect(poseAt(tl, 0).done).toBe(true);
  });
});

describe("co-articulation & lip-mouthing (Feature 6)", () => {
  it("coarticulatePair adds a smooth ballistic arc offset between consecutive signs", async () => {
    const { coarticulatePair, lerpPair } = await import("./animation");
    const a = { ...NEUTRAL, right: { ...NEUTRAL.right, pos: [0.0, 1.2, 0.3] as [number, number, number] } };
    const b = { ...NEUTRAL, right: { ...NEUTRAL.right, pos: [0.2, 1.2, 0.3] as [number, number, number] } };
    const straight = lerpPair(a, b, 0.5);
    const coarticulated = coarticulatePair(a, b, 0.5, true);
    // Inter-sign transition exhibits ballistic downward dip
    expect(coarticulated.right.pos[1]).toBeLessThan(straight.right.pos[1]);
  });

  it("converts Kannada text to phonetic visemes", async () => {
    const { wordToVisemes, sampleLipSync } = await import("./lipSync");
    const visemes = wordToVisemes("ನಮಸ್ಕಾರ");
    expect(visemes.length).toBeGreaterThanOrEqual(3);
    const midViseme = sampleLipSync("ನಮಸ್ಕಾರ", 0.5);
    expect(midViseme.mouthOpen).toBeGreaterThan(0.05);
  });

  it("animates lip mouthing during clip playback and returns to rest during hold", () => {
    const tl = buildTimeline([clip]);
    const inClipFace = poseAt(tl, BLEND_IN + 0.5).face;
    expect(inClipFace).toBeDefined();
    expect(inClipFace.mouthOpen).toBeGreaterThan(0);

    const holdFace = poseAt(tl, BLEND_IN + 1 + HOLD / 2).face;
    expect(holdFace.mouthOpen).toBeLessThanOrEqual(inClipFace.mouthOpen + 0.1);
  });

  it("calculates spontaneous natural eye blinking", async () => {
    const { computeBlink } = await import("./lipSync");
    // At time 0, eyes are open (0)
    expect(computeBlink(0)).toBe(0);
    // At peak of blink cycle (e.g. 0.06s), eyes are shut (> 0.5)
    expect(computeBlink(0.06)).toBeGreaterThan(0.5);
  });
});
