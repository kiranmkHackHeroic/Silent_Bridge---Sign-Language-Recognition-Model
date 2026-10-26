/**
 * Pure animation logic (no WebGL): pose interpolation and sign-sequence timelines.
 * Coordinates are avatar world metres: avatar faces +z, its right hand is on -x.
 */
import type { AnimationClip, HandPose, Vec3 } from "../services/types";

export type Side = "right" | "left";
export interface PosePair {
  right: HandPose;
  left: HandPose;
}

const RELAXED: number[][] = [[0.4, 0.2, 0.1], [0.25, 0.3, 0.2], [0.25, 0.3, 0.2], [0.25, 0.3, 0.2], [0.25, 0.3, 0.2]];

export const NEUTRAL: PosePair = {
  right: { pos: [-0.21, 0.98, 0.07], dir: normalize([0, -1, 0.12]), normal: [1, 0, 0], curl: RELAXED },
  left: { pos: [0.21, 0.98, 0.07], dir: normalize([0, -1, 0.12]), normal: [-1, 0, 0], curl: RELAXED },
};

const lerp = (a: number, b: number, w: number) => a + (b - a) * w;
const lerp3 = (a: Vec3, b: Vec3, w: number): Vec3 => [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)];

export function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return n > 1e-9 ? [v[0] / n, v[1] / n, v[2] / n] : [0, 1, 0];
}

export function ease(w: number): number {
  const x = Math.min(1, Math.max(0, w));
  return x * x * (3 - 2 * x);
}

export function lerpPose(a: HandPose, b: HandPose, w: number): HandPose {
  let dir = normalize(lerp3(a.dir, b.dir, w));
  let normal = lerp3(a.normal, b.normal, w);
  // keep palm normal perpendicular to the finger direction
  const d = normal[0] * dir[0] + normal[1] * dir[1] + normal[2] * dir[2];
  normal = normalize([normal[0] - d * dir[0], normal[1] - d * dir[1], normal[2] - d * dir[2]]);
  if (!Number.isFinite(normal[0])) normal = a.normal;
  if (!Number.isFinite(dir[0])) dir = a.dir;
  return {
    pos: lerp3(a.pos, b.pos, w),
    dir,
    normal,
    curl: a.curl.map((f, i) => f.map((c, j) => lerp(c, b.curl[i]?.[j] ?? c, w))),
  };
}

/** Pose of one hand in a clip at time t (null keyframe hands rest in NEUTRAL). */
export function sampleClip(clip: AnimationClip, t: number): PosePair {
  const keys = clip.keyframes;
  const pick = (k: (typeof keys)[number], side: Side) => k[side] ?? NEUTRAL[side];
  if (keys.length === 0) return NEUTRAL;
  if (t <= keys[0].t) return { right: pick(keys[0], "right"), left: pick(keys[0], "left") };
  const last = keys[keys.length - 1];
  if (t >= last.t) return { right: pick(last, "right"), left: pick(last, "left") };
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t < t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const w = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
  return {
    right: lerpPose(pick(a, "right"), pick(b, "right"), w),
    left: lerpPose(pick(a, "left"), pick(b, "left"), w),
  };
}

export function lerpPair(a: PosePair, b: PosePair, w: number): PosePair {
  return { right: lerpPose(a.right, b.right, w), left: lerpPose(a.left, b.left, w) };
}

export interface TimelineSegment {
  kind: "blend" | "clip" | "hold";
  index: number; // index into the clip list (-1 = final return to neutral)
  start: number;
  duration: number;
  clip?: AnimationClip;
  from?: PosePair;
  to?: PosePair;
}

export interface Timeline {
  segments: TimelineSegment[];
  duration: number;
  clips: AnimationClip[];
}

export const BLEND_IN = 0.35;
/** Sign-to-sign transition inside a sentence: the hands move directly to the next sign (continuous signing). */
export const TRANSITION = 0.2;
export const HOLD = 0.2;
export const BLEND_OUT = 0.5;

/** Continuous signing: blend in, then each sign flows into the next with a short transition (no return to rest
 * between signs), then one final hold and blend back to neutral. */
export function buildTimeline(clips: AnimationClip[], startPose: PosePair = NEUTRAL): Timeline {
  const segments: TimelineSegment[] = [];
  let t = 0;
  let prev = startPose;
  clips.forEach((clip, index) => {
    const first = sampleClip(clip, 0);
    const blend = index === 0 ? BLEND_IN : TRANSITION;
    segments.push({ kind: "blend", index, start: t, duration: blend, from: prev, to: first });
    t += blend;
    const dur = Math.max(0.05, clip.duration);
    segments.push({ kind: "clip", index, start: t, duration: dur, clip });
    t += dur;
    prev = sampleClip(clip, dur);
  });
  if (clips.length) {
    segments.push({ kind: "hold", index: clips.length - 1, start: t, duration: HOLD, from: prev, to: prev });
    t += HOLD;
    segments.push({ kind: "blend", index: -1, start: t, duration: BLEND_OUT, from: prev, to: NEUTRAL });
    t += BLEND_OUT;
  }
  return { segments, duration: t, clips };
}

export function poseAt(tl: Timeline, t: number): { pose: PosePair; index: number; done: boolean } {
  if (!tl.segments.length) return { pose: NEUTRAL, index: -1, done: true };
  if (t >= tl.duration) return { pose: NEUTRAL, index: -1, done: true };
  const seg = tl.segments.find((s) => t < s.start + s.duration) ?? tl.segments[tl.segments.length - 1];
  const local = Math.max(0, t - seg.start);
  if (seg.kind === "clip" && seg.clip) return { pose: sampleClip(seg.clip, local), index: seg.index, done: false };
  const w = seg.duration > 0 ? ease(local / seg.duration) : 1;
  return { pose: lerpPair(seg.from!, seg.to!, w), index: seg.index, done: false };
}

/** Start time of the given clip index (for progress display). */
export function clipStart(tl: Timeline, index: number): number {
  return tl.segments.find((s) => s.index === index)?.start ?? 0;
}
