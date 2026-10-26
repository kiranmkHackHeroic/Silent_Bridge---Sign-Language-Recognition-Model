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
