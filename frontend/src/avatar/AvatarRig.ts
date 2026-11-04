/**
 * Pixar/Disney-Stylized 3D Character Avatar (Three.js).
 *
 * Meticulously modeled after the user's reference character:
 * - Adorable, expressive stylized facial anatomy with chubby cheeks and soft chin.
 * - Extra-large, luminous Disney/Pixar eyes with multi-tone brown iris, jet pupil,
 *   thick upper lash line, and dual crisp specular catchlights.
 * - Signature cute rounded button nose with warm coral-pink blush.
 * - Thick, expressive arched brows set high on the forehead.
 * - Sweet, gentle smiling mouth with Cupid's bow that articulates for Kannada speech.
 * - Big, charming stylized ears with inner helix detailing.
 * - Voluminous, swept-up modern pompadour hairstyle with dynamic sculpted crests.
 * - Open blue/cream/slate plaid flannel shirt over a dark charcoal crewneck tee.
 * - 4-point high-key studio lighting with warm bounce and rim highlights.
 * - Real-time mouse gaze tracking, smooth blinks, and interactive greeting reaction.
 */
import * as THREE from "three";
import type { HandPose } from "../services/types";
import type { PosePair, Side } from "./animation";
import type { FacePose } from "./lipSync";

const UPPER = 0.28;
const FORE = 0.26;
const HAND_SCALE = 1.05;
const SHOULDER_Y = 1.40;
const SHOULDER_X = 0.19;

function mat(color: string | number, roughness = 0.5, metalness = 0.02, transparent = false, opacity = 1.0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent,
    opacity,
  });
}

// Procedural Plaid Flannel Texture matching the reference shirt
function createPlaidTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Base warm cream/beige
  ctx.fillStyle = "#dfdcd4";
  ctx.fillRect(0, 0, 256, 256);

  // Soft denim-blue vertical & horizontal bands
  ctx.fillStyle = "rgba(72, 106, 138, 0.72)";
  ctx.fillRect(0, 0, 72, 256);
  ctx.fillRect(128, 0, 72, 256);
  ctx.fillRect(0, 0, 256, 72);
  ctx.fillRect(0, 128, 256, 72);

  // Dark slate-charcoal intersect accents
  ctx.fillStyle = "rgba(38, 48, 62, 0.8)";
  ctx.fillRect(52, 0, 20, 256);
  ctx.fillRect(180, 0, 20, 256);
  ctx.fillRect(0, 52, 256, 20);
  ctx.fillRect(0, 180, 256, 20);

  // Crisp fine dark grid lines
  ctx.fillStyle = "#222a34";
  ctx.fillRect(32, 0, 3, 256);
  ctx.fillRect(160, 0, 3, 256);
  ctx.fillRect(0, 32, 256, 3);
  ctx.fillRect(0, 160, 256, 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  return tex;
}

// Materials palette
const plaidTex = createPlaidTexture();
const PLAID_SHIRT = new THREE.MeshStandardMaterial({ map: plaidTex, roughness: 0.75, metalness: 0.02 });
const INNER_TEE = mat("#26292e", 0.8, 0.02);
const SHIRT_DARK = mat("#202832", 0.85, 0.02);
const BUTTON_MAT = mat("#1a1e24", 0.3, 0.1);

// Warm porcelain peach skin
const SKIN = mat("#f7cfb8", 0.52, 0.01);
const SKIN_SHADOW = mat("#e8b89e", 0.58, 0.01);
const NOSE_BLUSH = mat("#ea8476", 0.6, 0.01);
const CHEEK_BLUSH = mat("#f09689", 0.75, 0.0, true, 0.35);

// Hair materials
const HAIR_MAIN = mat("#3f3128", 0.55, 0.03);
const HAIR_STRAND = mat("#4a3b31", 0.5, 0.04);
const HAIR_DARK = mat("#281e18", 0.65, 0.02);

// Big Pixar Eye materials
const EYE_WHITE = mat("#fdfcfb", 0.1, 0.01);
const IRIS_OUTER = mat("#3e1f0f", 0.25, 0.04);
const IRIS_INNER = mat("#6e381b", 0.22, 0.06);
const PUPIL = mat("#080504", 0.05, 0.0);
const SPARKLE_MAIN = mat("#ffffff", 0.0, 0.0);
const SPARKLE_SUB = mat("#ffffff", 0.0, 0.0, true, 0.8);
const LASH = mat("#1a110b", 0.6, 0.0);
const BROW_MAT = mat("#36251b", 0.6, 0.02);

// Mouth materials
const LIP = mat("#d9776c", 0.42, 0.02);
const TEETH = mat("#faf7f2", 0.25, 0.02);
const CAVITY = mat("#240c09", 0.9, 0.0);

class Limb {
  mesh: THREE.Mesh;
  constructor(radiusTop: number, radiusBottom: number, material: THREE.Material, parent: THREE.Object3D) {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, 1, 24);
    this.mesh = new THREE.Mesh(geo, material);
    parent.add(this.mesh);
  }

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
    const s = side === "right" ? 1 : -1;
    parent.add(this.root);
    this.root.scale.setScalar(HAND_SCALE);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.024), SKIN);
    palm.position.set(0, 0.042, 0);
    this.root.add(palm);

    const heel = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.042, 6, 12), SKIN);
    heel.rotation.z = Math.PI / 2;
    heel.position.set(0, 0.006, 0);
    this.root.add(heel);

    for (const x of [0.024, 0.008, -0.008, -0.024]) {
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), SKIN);
      knuckle.position.set(x * s, 0.084, 0.002);
      this.root.add(knuckle);
    }

    const fingerX = [0.024, 0.008, -0.008, -0.024];
    const fingerScale = [0.94, 1.0, 0.94, 0.78];

    // Thumb
    const thumbBase = new THREE.Object3D();
    thumbBase.position.set(0.028 * s, 0.02, 0.008);
    thumbBase.rotation.set(0.24, 0, -0.72 * s);
    this.root.add(thumbBase);
    this.joints.push(this.chain(thumbBase, [0.028, 0.024, 0.02], 0.0088));

    // 4 Fingers
    fingerX.forEach((x, i) => {
      const base = new THREE.Object3D();
      base.position.set(x * s, 0.085, 0);
      this.root.add(base);
      const sc = fingerScale[i];
      this.joints.push(this.chain(base, [0.034 * sc, 0.024 * sc, 0.018 * sc], 0.0078));
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
    this.joints.forEach((chain, f) =>
      chain.forEach((j, k) => {
        j.rotation.x = THREE.MathUtils.clamp(curl[f]?.[k] ?? 0, -0.3, 2.0);
      }),
    );
  }
}

/**
 * Creates the Pixar-style round, chubby-cheeked stylized head geometry.
 */
function createPixarHeadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.108, 48, 36);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Chubby cheek expansion (y between -0.04 and +0.03)
    if (v.y > -0.05 && v.y < 0.04 && v.z > 0.0) {
      const cheekT = Math.sin(((v.y + 0.05) / 0.09) * Math.PI);
      v.x *= 1.0 + cheekT * 0.12;
      v.z *= 1.0 + cheekT * 0.08;
    }

    // Soft rounded jaw & chin (y < -0.02)
    if (v.y < -0.02) {
      const jawT = THREE.MathUtils.clamp((-v.y - 0.02) / 0.08, 0, 1);
      v.x *= 1.0 - jawT * 0.18;
      // Soft rounded chin pad
      if (v.z > 0 && v.y < -0.05) {
        const chinT = THREE.MathUtils.clamp((-v.y - 0.05) / 0.04, 0, 1);
        v.z += chinT * 0.008;
      }
    }

    // Proportions: slightly wide and round for the cute stylized look
    v.x *= 0.98;
    v.y *= 1.02;
    v.z *= 0.96;

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

export class AvatarRig {
  group = new THREE.Group();

  private upper: Record<Side, Limb>;
  private fore: Record<Side, Limb>;
  private elbowCuffs: Record<Side, THREE.Mesh>;
  private wrists: Record<Side, THREE.Mesh>;
  private shoulders: Record<Side, THREE.Vector3> = {
    right: new THREE.Vector3(-SHOULDER_X, SHOULDER_Y, 0),
    left: new THREE.Vector3(SHOULDER_X, SHOULDER_Y, 0),
  };
  private hands: Record<Side, Hand>;

  private torsoGroup: THREE.Group;
  private headPivot: THREE.Group;
  private head: THREE.Group;

  // Eyes & Gaze rig
  private eyesGroup: Record<Side, THREE.Group>;
  private brows: Record<Side, THREE.Mesh>;

  // Articulated mouth
  private mouthGroup: THREE.Group;
  private mouthSmileMesh: THREE.Mesh;
  private mouthCavity: THREE.Mesh;
  private teeth: THREE.Mesh;

  // Interactive look-at & greeting wave states
  private gazeX = 0;
  private gazeY = 0;
  private reactionTimer = 0;
  private waveProgress = 0;

  constructor() {
    const g = this.group;

    // ---------------------------------------------------- Torso: Open Plaid Shirt over Tee
    this.torsoGroup = new THREE.Group();
    g.add(this.torsoGroup);

    // Dark charcoal inner tee visible in the center
    const innerTee = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.144, 0.52, 32), INNER_TEE);
    innerTee.position.set(0, 1.18, 0);
    innerTee.scale.set(0.96, 1.0, 0.62);
    this.torsoGroup.add(innerTee);

    // Plaid flannel overshirt (flared front panels)
    const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.152, 0.50, 32), PLAID_SHIRT);
    shirt.position.set(0, 1.18, 0.004);
    shirt.scale.set(1.0, 1.0, 0.65);
    this.torsoGroup.add(shirt);

    // Folded shirt collar wings
    const collarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.08, 0.012), PLAID_SHIRT);
    collarLeft.position.set(0.065, 1.43, 0.075);
    collarLeft.rotation.set(-0.35, 0.28, -0.42);
    this.torsoGroup.add(collarLeft);

    const collarRight = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.08, 0.012), PLAID_SHIRT);
    collarRight.position.set(-0.065, 1.43, 0.075);
    collarRight.rotation.set(-0.35, -0.28, 0.42);
    this.torsoGroup.add(collarRight);

    // Front placket button on the shirt
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.003, 16), BUTTON_MAT);
    button.rotation.x = Math.PI / 2;
    button.position.set(-0.02, 1.30, 0.11);
    this.torsoGroup.add(button);

    // Waist / Hips
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.16, 32), SHIRT_DARK);
    hips.position.set(0, 0.78, 0);
    hips.scale.set(1.0, 1.0, 0.64);
    this.torsoGroup.add(hips);

    // Smooth rounded shoulders in plaid
    for (const side of ["right", "left"] as Side[]) {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.056, 24, 18), PLAID_SHIRT);
      sh.position.copy(this.shoulders[side]);
      this.torsoGroup.add(sh);
    }

    // Slender, smooth neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.048, 0.13, 24), SKIN);
    neck.position.set(0, 1.49, -0.005);
    this.torsoGroup.add(neck);

    // ---------------------------------------------------- Head Structure
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 1.54, 0);
    g.add(this.headPivot);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.085, 0);
    this.headPivot.add(this.head);

    // Pixar sculpted head
    const skullGeo = createPixarHeadGeometry();
    const skull = new THREE.Mesh(skullGeo, SKIN);
    this.head.add(skull);

    // ---------------------------------------------------- Voluminous Swept Pompadour Hairstyle
    // Main hair cap covering top, crown, and back
    const hairCapGeo = new THREE.SphereGeometry(0.116, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.60);
    const hairCap = new THREE.Mesh(hairCapGeo, HAIR_MAIN);
    hairCap.scale.set(0.96, 1.12, 1.02);
    hairCap.position.set(0, 0.016, -0.014);
    hairCap.rotation.x = -0.36;
    this.head.add(hairCap);

    // Big sweeping front crest wave (swooping up and towards the right, matching photo)
    const crest1 = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.028, 16, 36, Math.PI * 0.85), HAIR_STRAND);
    crest1.position.set(0.005, 0.092, 0.038);
    crest1.rotation.set(-0.48, 0.22, -0.58);
    this.head.add(crest1);

    // Secondary overlapping swooping tuft
    const crest2 = new THREE.Mesh(new THREE.TorusGeometry(0.080, 0.024, 14, 32, Math.PI * 0.72), HAIR_MAIN);
    crest2.position.set(-0.025, 0.102, 0.026);
    crest2.rotation.set(-0.52, 0.35, -0.42);
    this.head.add(crest2);

    // Forward dipping bang lock (accent tuft in front)
    const frontLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.075, 6, 16), HAIR_STRAND);
    frontLock.position.set(0.022, 0.095, 0.068);
    frontLock.rotation.set(0.68, 0.42, -0.85);
    this.head.add(frontLock);

    // Left swept side ridges
    const sideTuftLeft = new THREE.Mesh(new THREE.CapsuleGeometry(0.020, 0.065, 6, 14), HAIR_MAIN);
    sideTuftLeft.position.set(-0.068, 0.088, 0.032);
    sideTuftLeft.rotation.set(-0.25, -0.32, 0.72);
    this.head.add(sideTuftLeft);

    // Tapered side hair & sideburns framing the ears
    for (const side of ["right", "left"] as Side[]) {
      const isRight = side === "right";
      const s = isRight ? -1 : 1;
      const sideburn = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.065, 4, 12), HAIR_DARK);
      sideburn.position.set(0.096 * s, 0.008, 0.012);
      sideburn.rotation.set(0.12, 0, 0.16 * s);
      this.head.add(sideburn);
    }

    // ---------------------------------------------------- Big Expressive Pixar Eyes
    this.eyesGroup = { right: new THREE.Group(), left: new THREE.Group() };

    for (const side of ["right", "left"] as Side[]) {
      const isRight = side === "right";
      const x = isRight ? -0.040 : 0.040;
      const eg = this.eyesGroup[side];
      eg.position.set(x, 0.015, 0.092);
      this.head.add(eg);

      // Large Sclera sphere
      const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.020, 28, 22), EYE_WHITE);
      eg.add(eyeball);

      // Deep rich chocolate outer iris
      const irisOuter = new THREE.Mesh(new THREE.CircleGeometry(0.0125, 28), IRIS_OUTER);
      irisOuter.position.set(0, 0, 0.0195);
      eg.add(irisOuter);

      // Warm golden-hazel inner iris
      const irisInner = new THREE.Mesh(new THREE.CircleGeometry(0.0088, 24), IRIS_INNER);
      irisInner.position.set(0, 0, 0.0197);
      eg.add(irisInner);

      // Jet Black Pupil
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 22), PUPIL);
      pupil.position.set(0, 0, 0.0199);
      eg.add(pupil);

      // Large Primary Specular Catchlight (upper-right)
      const sparkleMain = new THREE.Mesh(new THREE.CircleGeometry(0.0034, 14), SPARKLE_MAIN);
      sparkleMain.position.set(0.0035, 0.0038, 0.0201);
      eg.add(sparkleMain);

      // Secondary Lower Specular Catchlight (lower-left)
      const sparkleSub = new THREE.Mesh(new THREE.CircleGeometry(0.0016, 12), SPARKLE_SUB);
      sparkleSub.position.set(-0.0032, -0.0035, 0.0201);
      eg.add(sparkleSub);

      // Thick Dark Upper Eyelash / Lash Line Curve
      const lashCurve = new THREE.Mesh(new THREE.TorusGeometry(0.0215, 0.0028, 10, 24, Math.PI * 0.82), LASH);
      lashCurve.position.set(0, 0.003, 0.0115);
      lashCurve.rotation.set(0.18, isRight ? -0.1 : 0.1, isRight ? 0.38 : -0.38);
      eg.add(lashCurve);
    }

    // Thick, Arched Stylized Brows (set high above the eyes)
    const browGeo = new THREE.CapsuleGeometry(0.0055, 0.038, 6, 12);
    const browR = new THREE.Mesh(browGeo, BROW_MAT);
    browR.rotation.z = Math.PI / 2 - 0.22;
    browR.position.set(-0.044, 0.056, 0.096);
    this.head.add(browR);

    const browL = new THREE.Mesh(browGeo, BROW_MAT);
    browL.rotation.z = Math.PI / 2 + 0.22;
    browL.position.set(0.044, 0.056, 0.096);
    this.head.add(browL);
    this.brows = { right: browR, left: browL };

    // Soft Rosy Cheek Blush
    for (const x of [-0.054, 0.054]) {
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), CHEEK_BLUSH);
      blush.position.set(x, -0.018, 0.096);
      blush.rotation.y = x < 0 ? -0.34 : 0.34;
      this.head.add(blush);
    }

    // ---------------------------------------------------- Signature Rounded Button Nose
    const noseGroup = new THREE.Group();
    noseGroup.position.set(0, -0.009, 0.104);
    this.head.add(noseGroup);

    // Warm coral-pink button nose tip (wide, cute, rounded)
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 20, 16), NOSE_BLUSH);
    noseTip.scale.set(1.25, 0.85, 1.05);
    noseGroup.add(noseTip);

    // Soft nostril indents
    for (const x of [-0.009, 0.009]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 10), SKIN_SHADOW);
      nostril.position.set(x, -0.002, -0.002);
      nostril.scale.set(0.9, 0.8, 0.8);
      noseGroup.add(nostril);
    }

    // Gentle nasal bridge blending upwards
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0068, 0.022, 14), SKIN);
    bridge.position.set(0, 0.014, -0.004);
    bridge.rotation.x = -0.18;
    noseGroup.add(bridge);

    // ---------------------------------------------------- Charming Prominent Stylized Ears
    for (const x of [-0.033, 0.033]) {
      const isRight = x < 0;
      const earGroup = new THREE.Group();
      earGroup.position.set(x * 3.3, 0.0, -0.008);
      earGroup.rotation.y = isRight ? 0.28 : -0.28;
      this.head.add(earGroup);

      // Outer ear lobe
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 16), SKIN);
      ear.scale.set(0.42, 1.15, 0.85);
      earGroup.add(ear);

      // Inner helix pink recess
      const innerRecess = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), NOSE_BLUSH);
      innerRecess.scale.set(0.35, 0.9, 0.65);
      innerRecess.position.set(isRight ? 0.003 : -0.003, 0.002, 0.004);
      earGroup.add(innerRecess);
    }

    // ---------------------------------------------------- Sweet Smiling Mouth
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, -0.046, 0.098);
    this.head.add(this.mouthGroup);

    // Oral cavity for visemes
    this.mouthCavity = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.026, 4, 12), CAVITY);
    this.mouthCavity.rotation.z = Math.PI / 2;
    this.mouthCavity.position.set(0, 0, -0.004);
    this.mouthCavity.scale.set(1.0, 0.25, 1.0);
    this.mouthCavity.visible = false;
    this.mouthGroup.add(this.mouthCavity);

    // Upper dental arch
    this.teeth = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.0045, 0.003), TEETH);
    this.teeth.position.set(0, 0.003, -0.001);
    this.teeth.visible = false;
    this.mouthGroup.add(this.teeth);

    // Soft curved smiling lips (Pixar gentle smirk)
    this.mouthSmileMesh = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0034, 10, 24, Math.PI * 0.68), LIP);
    this.mouthSmileMesh.position.set(0, 0.005, 0);
    this.mouthSmileMesh.rotation.set(-0.15, 0, Math.PI * 1.16);
    this.mouthGroup.add(this.mouthSmileMesh);

    // ---------------------------------------------------- Limbs & Articulated Hands
    this.upper = {
      right: new Limb(0.048, 0.042, PLAID_SHIRT, g),
      left: new Limb(0.048, 0.042, PLAID_SHIRT, g),
    };
    this.fore = {
      right: new Limb(0.038, 0.03, SKIN, g),
      left: new Limb(0.038, 0.03, SKIN, g),
    };

    // Rolled flannel sleeve cuffs at the elbow
    this.elbowCuffs = {
      right: new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.044, 0.05, 20), PLAID_SHIRT),
      left: new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.044, 0.05, 20), PLAID_SHIRT),
    };
    g.add(this.elbowCuffs.right, this.elbowCuffs.left);

    this.wrists = {
      right: new THREE.Mesh(new THREE.SphereGeometry(0.029, 16, 12), SKIN),
      left: new THREE.Mesh(new THREE.SphereGeometry(0.029, 16, 12), SKIN),
    };
    g.add(this.wrists.right, this.wrists.left);

    this.hands = { right: new Hand("right", g), left: new Hand("left", g) };
  }

  setGaze(lookX: number, lookY: number) {
    this.gazeX = THREE.MathUtils.clamp(lookX, -1, 1);
    this.gazeY = THREE.MathUtils.clamp(lookY, -1, 1);
  }

  triggerReaction(_kind: "greeting" | "smile" = "greeting") {
    this.reactionTimer = 2.2;
    this.waveProgress = 0;
  }

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
    this.elbowCuffs[side].position.copy(elbow);
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

  setPose(pose: PosePair, time = 0, face?: Partial<FacePose>) {
    let effectivePose = pose;
    let reactionNod = 0;
    let reactionSmileBonus = 0;

    if (this.reactionTimer > 0) {
      this.reactionTimer = Math.max(0, this.reactionTimer - 0.016);
      const total = 2.2;
      const elapsed = total - this.reactionTimer;
      this.waveProgress = elapsed / total;

      reactionNod = Math.sin(this.waveProgress * Math.PI * 2) * 0.07;
      reactionSmileBonus = Math.sin(this.waveProgress * Math.PI) * 0.45;

      if (this.waveProgress < 0.9) {
        const waveWeight = Math.sin(this.waveProgress * Math.PI);
        const waveCycle = Math.sin(elapsed * 9.0) * 0.06;
        const waveX = -0.24 + waveCycle;
        const waveY = 1.38 + Math.abs(waveCycle) * 0.3;
        const waveZ = 0.32;

        effectivePose = {
          ...pose,
          right: {
            pos: [
              pose.right.pos[0] * (1 - waveWeight) + waveX * waveWeight,
              pose.right.pos[1] * (1 - waveWeight) + waveY * waveWeight,
              pose.right.pos[2] * (1 - waveWeight) + waveZ * waveWeight,
            ],
            dir: [0, 1, 0],
            normal: [0, 0, 1],
            curl: [
              [0.1, 0.1, 0.1],
              [0.05, 0.05, 0.05],
              [0.05, 0.05, 0.05],
              [0.1, 0.1, 0.1],
              [0.15, 0.15, 0.15],
            ],
          },
        };
      }
    }

    this.solveArm("right", effectivePose.right);
    this.solveArm("left", effectivePose.left);

    // Natural breathing
    const breath = Math.sin(time * 1.5) * 0.012;
    this.torsoGroup.scale.set(1.0 + breath * 0.5, 1.0 + breath * 0.3, 1.0 + breath);

    // Idle movement & mouse gaze
    const idleY = Math.sin(time * 0.6) * 0.022;
    const idleX = Math.sin(time * 0.9) * 0.012;
    const gazeYaw = this.gazeX * 0.18;
    const gazePitch = -this.gazeY * 0.14;

    this.headPivot.rotation.y = idleY + gazeYaw + (face?.headTilt ?? 0) * 0.35;
    this.headPivot.rotation.x = idleX + gazePitch + (face?.headNod ?? 0) + reactionNod;
    this.headPivot.rotation.z = (face?.headTilt ?? 0) * 0.45;

    // Smooth eyelid blinking with catchlights
    const blink = Math.min(1, Math.max(0, face?.blink ?? 0));
    const eyeScaleY = Math.max(0.08, 1.0 - blink * 0.92);

    const eyeYaw = this.gazeX * 0.24;
    const eyePitch = -this.gazeY * 0.18;
    for (const side of ["right", "left"] as Side[]) {
      const eg = this.eyesGroup[side];
      eg.scale.y = eyeScaleY;
      eg.rotation.y = eyeYaw;
      eg.rotation.x = eyePitch;
    }

    // High Arched Eyebrows
    const raise = Math.min(1, Math.max(0, face?.browRaise ?? 0));
    const furrow = Math.min(1, Math.max(0, face?.browFurrow ?? 0));
    const browDeltaY = raise * 0.008 - furrow * 0.005;

    this.brows.right.position.y = 0.056 + browDeltaY;
    this.brows.right.rotation.z = Math.PI / 2 - 0.22 - raise * 0.09 + furrow * 0.15;

    this.brows.left.position.y = 0.056 + browDeltaY;
    this.brows.left.rotation.z = Math.PI / 2 + 0.22 + raise * 0.09 - furrow * 0.15;

    // Sweet Smiling Mouth & Phonetic Kannada Visemes
    const open = Math.min(1, Math.max(0, face?.mouthOpen ?? 0.02));
    const rawSmile = face?.mouthSmile ?? 0.12;
    const smile = Math.min(1, Math.max(-0.3, rawSmile + reactionSmileBonus));
    const pucker = Math.min(1, Math.max(0, face?.mouthPucker ?? 0));

    const widthScale = Math.max(0.7, 1.0 + 0.35 * smile - 0.3 * pucker);
    const heightScale = Math.max(0.2, 0.25 + 1.8 * open);

    this.mouthSmileMesh.scale.set(widthScale, 1.0 + 0.8 * open, 1.0 + 0.25 * pucker);
    this.mouthSmileMesh.position.y = 0.005 - 0.006 * open;

    this.mouthCavity.scale.set(widthScale * 0.9, heightScale, 1.0);
    this.mouthCavity.visible = open > 0.08;

    this.teeth.visible = open > 0.14;
    this.teeth.scale.set(Math.min(1, widthScale), 1, 1);

    this.mouthGroup.position.z = 0.098 + 0.004 * pucker;
  }
}
