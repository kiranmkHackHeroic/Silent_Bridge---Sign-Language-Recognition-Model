/**
 * Procedural 3D signing avatar (Three.js).
 *
 * A simple, explicitly-labelled prototype avatar built from primitives:
 * shoulders -> analytic two-bone IK (upper arm, forearm) -> wrist orientation
 * from (finger direction, palm normal) -> 5 fingers x 3 joints driven by curl.
 * Hand local frame: fingers along +Y, palm faces +Z, thumb on +X (right hand) /
 * -X (left hand). Avatar faces +Z; its right side is -X.
 */
import * as THREE from "three";
import type { HandPose } from "../services/types";
import type { PosePair, Side } from "./animation";

const UPPER = 0.28;
const HAND_SCALE = 1.12;
const FORE = 0.26;
const SHOULDER_Y = 1.42;
const SHOULDER_X = 0.19;

function mat(color: string, roughness = 0.6) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
}

const SKIN = mat("#c98d68", 0.62);
const SHIRT = mat("#1f6f78", 0.85);
const SHIRT_DARK = mat("#185a62", 0.85);
const HAIR = mat("#1c1714", 0.9);
const DARK = mat("#1f2937", 0.4);
const LIP = mat("#9a4f3d", 0.6);

class Limb {
  mesh: THREE.Mesh;
  constructor(radiusTop: number, radiusBottom: number, material: THREE.Material, parent: THREE.Object3D) {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, 1, 18);
    this.mesh = new THREE.Mesh(geo, material);
    parent.add(this.mesh);
  }
  /** Stretch the unit cylinder between two world points. */
  between(a: THREE.Vector3, b: THREE.Vector3) {
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    this.mesh.position.copy(a).addScaledVector(d, 0.5);
    this.mesh.scale.set(1, Math.max(len, 1e-4), 1);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }
}

class Hand {
  root = new THREE.Group();
  joints: THREE.Object3D[][] = [];

  constructor(public side: Side, parent: THREE.Object3D) {
    const s = side === "right" ? 1 : -1; // thumb side along local X
    parent.add(this.root);
    this.root.scale.setScalar(HAND_SCALE); // slightly enlarged so handshapes read clearly on screen
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.085, 0.028), SKIN);
    palm.position.set(0, 0.045, 0);
    this.root.add(palm);
    const heel = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 4, 10), SKIN);
    heel.rotation.z = Math.PI / 2;
    heel.position.set(0, 0.006, 0);
    this.root.add(heel);
    for (const x of [0.027, 0.009, -0.009, -0.027]) {
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 10, 8), SKIN);
      knuckle.position.set(x * s, 0.087, 0);
      this.root.add(knuckle);
    }
    const fingerX = [0.027, 0.009, -0.009, -0.027];
    const fingerScale = [0.95, 1.0, 0.95, 0.78];
    // thumb
    const thumbBase = new THREE.Object3D();
    thumbBase.position.set(0.03 * s, 0.018, 0.008);
    thumbBase.rotation.set(0.25, 0, -0.75 * s);
    this.root.add(thumbBase);
    this.joints.push(this.chain(thumbBase, [0.03, 0.026, 0.022], 0.0095));
    fingerX.forEach((x, i) => {
      const base = new THREE.Object3D();
      base.position.set(x * s, 0.088, 0);
      this.root.add(base);
      const sc = fingerScale[i];
      this.joints.push(this.chain(base, [0.036 * sc, 0.025 * sc, 0.019 * sc], 0.0085));
    });
  }

  private chain(parent: THREE.Object3D, lengths: number[], radius: number): THREE.Object3D[] {
    const joints: THREE.Object3D[] = [];
    let p = parent;
    for (const len of lengths) {
      const joint = new THREE.Object3D();
      p.add(joint);
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len - radius, 4, 10), SKIN);
      seg.position.y = len / 2;
      joint.add(seg);
      const next = new THREE.Object3D();
      next.position.y = len;
      joint.add(next);
      joints.push(joint);
      p = next;
    }
    return joints;
  }

  setCurl(curl: number[][]) {
    this.joints.forEach((chain, f) => chain.forEach((j, k) => {
      j.rotation.x = THREE.MathUtils.clamp(curl[f]?.[k] ?? 0, -0.3, 2.0);
    }));
  }
}

export class AvatarRig {
  group = new THREE.Group();
  private upper: Record<Side, Limb>;
  private fore: Record<Side, Limb>;
  private elbows: Record<Side, THREE.Mesh>;
  private wrists: Record<Side, THREE.Mesh>;
  private hands: Record<Side, Hand>;
  private shoulders: Record<Side, THREE.Vector3> = {
    right: new THREE.Vector3(-SHOULDER_X, SHOULDER_Y, 0),
    left: new THREE.Vector3(SHOULDER_X, SHOULDER_Y, 0),
  };
  private head: THREE.Group;

  constructor() {
    const g = this.group;
    // torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.145, 0.52, 28), SHIRT);
    torso.position.set(0, 1.18, 0);
    torso.scale.set(1, 1, 0.62);
    g.add(torso);
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.15, 0.2, 28), SHIRT_DARK);
    hips.position.set(0, 0.83, 0);
    hips.scale.set(1, 1, 0.62);
    g.add(hips);
    const collar = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), SHIRT);
    collar.position.set(0, 1.4, 0);
    collar.scale.set(1.05, 0.35, 0.62);
    g.add(collar);
    for (const side of ["right", "left"] as Side[]) {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 14), SHIRT);
      sh.position.copy(this.shoulders[side]);
      g.add(sh);
    }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 16), SKIN);
    neck.position.set(0, 1.5, 0);
    g.add(neck);
    // head
    this.head = new THREE.Group();
    this.head.position.set(0, 1.62, 0);
    g.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), SKIN);
    skull.scale.set(0.88, 1.08, 0.95);
    this.head.add(skull);
    // hair cap tilted backwards: covers the back of the head but stays above the eyes
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), HAIR);
    hair.scale.set(0.9, 1.08, 0.98);
    hair.position.set(0, 0.006, -0.008);
    hair.rotation.x = -0.45;
    this.head.add(hair);
    for (const x of [-0.032, 0.032]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), DARK);
      eye.position.set(x, 0.012, 0.086);
      this.head.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.024, 4, 8), LIP);
    mouth.rotation.z = Math.PI / 2;
    mouth.position.set(0, -0.045, 0.088);
    this.head.add(mouth);
    for (const x of [-0.033, 0.033]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.005, 0.006), HAIR);
      brow.position.set(x, 0.034, 0.088);
      brow.rotation.z = x < 0 ? 0.08 : -0.08;
      this.head.add(brow);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), SKIN);
      ear.scale.set(0.5, 1, 0.8);
      ear.position.set(x * 2.7, 0.0, -0.005);
      this.head.add(ear);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), SKIN);
    nose.position.set(0, -0.008, 0.095);
    this.head.add(nose);
    // arms + hands
    this.upper = { right: new Limb(0.045, 0.04, SHIRT, g), left: new Limb(0.045, 0.04, SHIRT, g) };
    this.fore = { right: new Limb(0.037, 0.03, SKIN, g), left: new Limb(0.037, 0.03, SKIN, g) };
    this.elbows = {
      right: new THREE.Mesh(new THREE.SphereGeometry(0.041, 16, 12), SHIRT),
      left: new THREE.Mesh(new THREE.SphereGeometry(0.041, 16, 12), SHIRT),
    };
    g.add(this.elbows.right, this.elbows.left);
    this.wrists = {
      right: new THREE.Mesh(new THREE.SphereGeometry(0.031, 14, 10), SKIN),
      left: new THREE.Mesh(new THREE.SphereGeometry(0.031, 14, 10), SKIN),
    };
    g.add(this.wrists.right, this.wrists.left);
    this.hands = { right: new Hand("right", g), left: new Hand("left", g) };
  }

  /** Keep hand targets reachable and outside the torso. */
  private constrain(side: Side, target: THREE.Vector3): THREE.Vector3 {
    const t = target.clone();
    if (Math.abs(t.x) < 0.2 && t.y > 0.9 && t.y < 1.45) t.z = Math.max(t.z, 0.13);
    const sh = this.shoulders[side];
    const d = t.clone().sub(sh);
    const reach = UPPER + FORE - 0.005;
    if (d.length() > reach) t.copy(sh).addScaledVector(d.normalize(), reach);
    return t;
  }

  private solveArm(side: Side, pose: HandPose) {
    const sh = this.shoulders[side];
    const wrist = this.constrain(side, new THREE.Vector3(...pose.pos));
    const toW = wrist.clone().sub(sh);
    const d = THREE.MathUtils.clamp(toW.length(), 0.06, UPPER + FORE - 0.005);
    const u = toW.normalize();
    const cosA = THREE.MathUtils.clamp((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d), -1, 1);
    const sinA = Math.sqrt(1 - cosA * cosA);
    const out = side === "right" ? -1 : 1;
    const pole = new THREE.Vector3(out * 0.55, -1, -0.35).normalize();
    const v = pole.sub(u.clone().multiplyScalar(pole.dot(u)));
    if (v.lengthSq() < 1e-6) v.set(0, -1, 0);
    v.normalize();
    const elbow = sh.clone().addScaledVector(u, UPPER * cosA).addScaledVector(v, UPPER * sinA);
    const wristReal = sh.clone().addScaledVector(u, d);
    this.upper[side].between(sh, elbow);
    this.fore[side].between(elbow, wristReal);
    this.elbows[side].position.copy(elbow);
    this.wrists[side].position.copy(wristReal);

    const hand = this.hands[side];
    hand.root.position.copy(wristReal);
    const y = new THREE.Vector3(...pose.dir).normalize();
    let z = new THREE.Vector3(...pose.normal);
    z.sub(y.clone().multiplyScalar(z.dot(y)));
    if (z.lengthSq() < 1e-6) z = new THREE.Vector3(0, 0, 1);
    z.normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    const m = new THREE.Matrix4().makeBasis(x, y, z);
    hand.root.quaternion.setFromRotationMatrix(m);
    hand.setCurl(pose.curl);
  }

  setPose(pose: PosePair, time = 0) {
    this.solveArm("right", pose.right);
    this.solveArm("left", pose.left);
    // subtle idle motion so the avatar does not look frozen
    this.head.rotation.y = Math.sin(time * 0.6) * 0.04;
    this.head.rotation.x = Math.sin(time * 0.9) * 0.015;
  }
}
