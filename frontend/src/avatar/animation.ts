/**
 * Pure animation logic (no WebGL): pose interpolation, Catmull-Rom spline co-articulation,
 * lip-mouthing integration, and sign-sequence timelines.
 * Coordinates are avatar world metres: avatar faces +z, its right hand is on -x.
 */
import type { AnimationClip, HandPose, Vec3 } from "../services/types";
import { computeFacePose, NEUTRAL_FACE, type FacePose } from "./lipSync";

export type { FacePose };
export { NEUTRAL_FACE };

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

/**
 * 1D Catmull-Rom spline evaluation.
 * Evaluates the curve segment between p1 and p2 at w in [0, 1], given control points p0 and p3.
 * Preserves C1 velocity continuity across keyframes without sharp linear corners.
 */
export function catmullRom(p0: number, p1: number, p2: number, p3: number, w: number): number {
  const w2 = w * w;
  const w3 = w2 * w;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * w +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * w2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * w3
  );
}

export function catmullRom3(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, w: number): Vec3 {
  return [
    catmullRom(p0[0], p1[0], p2[0], p3[0], w),
    catmullRom(p0[1], p1[1], p2[1], p3[1], w),
    catmullRom(p0[2], p1[2], p2[2], p3[2], w),
  ];
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

/**
 * Sample pose of both hands in a clip at time t.
 * Uses Catmull-Rom spline interpolation on 3D positions for fluid trajectories
 * and smooth Hermite easing on wrist orientation and finger curl.
 */
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

  const getPos = (side: Side, idx: number): Vec3 => {
    if (idx < 0) {
      const p0 = pick(keys[0], side).pos;
      const p1 = pick(keys[Math.min(1, keys.length - 1)], side).pos;
      return [2 * p0[0] - p1[0], 2 * p0[1] - p1[1], 2 * p0[2] - p1[2]];
    }
    if (idx >= keys.length) {
      const pN1 = pick(keys[keys.length - 1], side).pos;
      const pN2 = pick(keys[Math.max(0, keys.length - 2)], side).pos;
      return [2 * pN1[0] - pN2[0], 2 * pN1[1] - pN2[1], 2 * pN1[2] - pN2[2]];
    }
    return pick(keys[idx], side).pos;
  };

  const sampleSide = (side: Side): HandPose => {
    // If the hand is omitted across keyframes, keep it strictly in neutral
    if (keys.every((k) => k[side] === null)) {
      return NEUTRAL[side];
    }

    const poseA = pick(a, side);
    const poseB = pick(b, side);
    const pos = catmullRom3(
      getPos(side, i - 1),
      poseA.pos,
      poseB.pos,
      getPos(side, i + 2),
      w,
    );
    const ew = ease(w);
    let dir = normalize(lerp3(poseA.dir, poseB.dir, ew));
    let normal = lerp3(poseA.normal, poseB.normal, ew);
    const d = normal[0] * dir[0] + normal[1] * dir[1] + normal[2] * dir[2];
    normal = normalize([normal[0] - d * dir[0], normal[1] - d * dir[1], normal[2] - d * dir[2]]);
    if (!Number.isFinite(normal[0])) normal = poseA.normal;
    if (!Number.isFinite(dir[0])) dir = poseA.dir;

    return {
      pos,
      dir,
      normal,
      curl: poseA.curl.map((f, fi) => f.map((c, fj) => lerp(c, poseB.curl[fi]?.[fj] ?? c, ew))),
    };
  };

  return {
    right: sampleSide("right"),
    left: sampleSide("left"),
  };
}

export function lerpPair(a: PosePair, b: PosePair, w: number): PosePair {
  return { right: lerpPose(a.right, b.right, w), left: lerpPose(a.left, b.left, w) };
}

/**
 * Co-articulates hand trajectories during inter-sign transitions.
 * Hands follow natural ballistic arcs with slight downward gravity dip
 * rather than mechanical straight lines between signs.
 */
export function coarticulatePair(a: PosePair, b: PosePair, w: number, isInterSign = false): PosePair {
  const ew = ease(w);
  const blended = lerpPair(a, b, ew);
  if (!isInterSign) return blended;

  // Ballistic arc offset: max in the middle (w = 0.5)
  const arc = Math.sin(Math.PI * Math.min(1, Math.max(0, w)));
  const dipY = -0.02 * arc;
  const dipZ = 0.012 * arc;

  return {
    right: {
      ...blended.right,
      pos: [blended.right.pos[0], blended.right.pos[1] + dipY, blended.right.pos[2] + dipZ],
    },
    left: {
      ...blended.left,
      pos: [blended.left.pos[0], blended.left.pos[1] + dipY, blended.left.pos[2] + dipZ],
    },
  };
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
/** Sign-to-sign transition inside a sentence: continuous signing co-articulation. */
export const TRANSITION = 0.2;
export const HOLD = 0.2;
export const BLEND_OUT = 0.5;

/**
 * Continuous signing: blend in, then each sign flows into the next with a smooth
 * co-articulated transition, followed by one final hold and return to neutral.
 */
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

export interface PoseResult {
  pose: PosePair;
  face: FacePose;
  index: number;
  done: boolean;
  activeSignId?: string;
}

export function poseAt(tl: Timeline, t: number): PoseResult {
  if (!tl.segments.length || t >= tl.duration) {
    return {
      pose: NEUTRAL,
      face: computeFacePose(undefined, -1, t, false),
      index: -1,
      done: true,
    };
  }

  const seg = tl.segments.find((s) => t < s.start + s.duration) ?? tl.segments[tl.segments.length - 1];
  const local = Math.max(0, t - seg.start);

  if (seg.kind === "clip" && seg.clip) {
    const progress = seg.duration > 0 ? local / seg.duration : 1;
    return {
      pose: sampleClip(seg.clip, local),
      face: computeFacePose(seg.clip.sign_id, progress, t, false),
      index: seg.index,
      done: false,
      activeSignId: seg.clip.sign_id,
    };
  }

  const w = seg.duration > 0 ? local / seg.duration : 1;
  const isInterSign = seg.kind === "blend" && seg.index > 0;
  return {
    pose: coarticulatePair(seg.from!, seg.to!, w, isInterSign),
    face: computeFacePose(undefined, -1, t, isInterSign),
    index: seg.index,
    done: false,
  };
}

/** Start time of the given clip index (for progress display). */
export function clipStart(tl: Timeline, index: number): number {
  return tl.segments.find((s) => s.index === index)?.start ?? 0;
}
