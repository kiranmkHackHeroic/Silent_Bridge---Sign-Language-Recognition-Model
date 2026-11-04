/**
 * Pixar/Disney-Stylized 3D Character Avatar in Classic Suit & Round Glasses (Three.js).
 *
 * Purely procedural Three.js character rig featuring:
 * 1. Stylized Head & Facial Features:
 *    - Rounded, friendly head with soft warm peach skin (MeshPhysicalMaterial: roughness 0.45, clearcoat 0.1, sheen 0.35)
 *      and subtle rosy cheek blush spheres.
 *    - Rounded button nose, sculpted multi-part ears on both sides, and a vertex-morphed expressive mouth mesh
 *      that transitions smoothly across smile, neutral, question/surprised, and Kannada phonetic visemes.
 *    - Large, expressive Pixar-style eyes: white sclera, rich warm brown irises (#4a2511), dark pupils,
 *      dual white specular catchlight spheres, and animated upper-eyelid blinking.
 *    - Thick, expressive dark-brown eyebrows above the glasses that tilt and raise dynamically with
 *      ISL non-manual grammar markers and facial emotion states.
 * 2. Iconic Round Black Glasses:
 *    - Sleek matte-black TorusGeometry rings connected by a curved 3D nose bridge and side temple arms
 *      resting over the ears, fitted with ultra-subtle transparent glass lenses (transmission 0.85, opacity 0.18).
 * 3. Sculpted Wavy Brown Hair:
 *    - Volumetric, layered wavy dark-brown hair (#3b2214 with #54321d highlights) built from overlapping
 *      curved 3D tube, lathe, and sphere segments swept up in a side-parted wave with strand ridges.
 * 4. Classic Tailored Suit, White Collar & Tie:
 *    - Tailored charcoal-black suit jacket (#1e2024, roughness 0.5) with notched lapels, crisp white dress
 *      shirt collar (#f8fafc), black knotted necktie (#111317), and neat white pocket square on the left chest.
 *    - Dark suit sleeves on upper and lower arms with crisp white shirt cuffs at the wrists so the warm
 *      peach hands and articulated fingers stand out with high contrast during fast ISL sign playback.
 */
import * as THREE from "three";
import type { HandPose } from "../services/types";
import type { PosePair, Side } from "./animation";
import { applyEmotionPreset, NEUTRAL_FACE, type AvatarEmotion, type FacePose } from "./lipSync";

const UPPER = 0.28;
const FORE = 0.26;
const HAND_SCALE = 1.05;
const SHOULDER_Y = 1.40;
const SHOULDER_X = 0.19;

// ---------------------------------------------------- PBR Material Library
// 1. Soft warm peach skin (MeshPhysicalMaterial: roughness 0.45, clearcoat 0.1, sheen 0.35)
const SKIN_MAT = new THREE.MeshPhysicalMaterial({
  color: "#f6c8b0",
  roughness: 0.45,
  metalness: 0.0,
  clearcoat: 0.1,
  clearcoatRoughness: 0.35,
  sheen: 0.35,
  sheenRoughness: 0.5,
  sheenColor: new THREE.Color("#ffd9c6"),
});

const SKIN_SHADOW_MAT = new THREE.MeshPhysicalMaterial({
  color: "#e4ad93",
  roughness: 0.5,
  metalness: 0.0,
  clearcoat: 0.06,
  sheen: 0.3,
  sheenColor: new THREE.Color("#f5c2ab"),
});

const NOSE_BLUSH_MAT = new THREE.MeshPhysicalMaterial({
  color: "#ee9f8c",
  roughness: 0.43,
  metalness: 0.0,
  clearcoat: 0.12,
  sheen: 0.35,
  sheenColor: new THREE.Color("#ffc8b8"),
});

const CHEEK_BLUSH_MAT = new THREE.MeshPhysicalMaterial({
  color: "#f28479",
  roughness: 0.52,
  metalness: 0.0,
  clearcoat: 0.08,
  sheen: 0.35,
  sheenColor: new THREE.Color("#ffb2a6"),
  transparent: true,
  opacity: 0.36,
  depthWrite: false,
});

// 2. Pixar-style Eye & Brow materials
const EYE_SCLERA_MAT = new THREE.MeshPhysicalMaterial({
  color: "#fdfcfb",
  roughness: 0.12,
  metalness: 0.0,
  clearcoat: 0.85,
  clearcoatRoughness: 0.08,
});

const IRIS_BROWN_MAT = new THREE.MeshPhysicalMaterial({
  color: "#4a2511",
  roughness: 0.22,
  metalness: 0.02,
  clearcoat: 0.9,
  clearcoatRoughness: 0.08,
});

const IRIS_RING_MAT = new THREE.MeshPhysicalMaterial({
  color: "#6e391c",
  roughness: 0.2,
  metalness: 0.02,
  clearcoat: 0.9,
});

const PUPIL_MAT = new THREE.MeshPhysicalMaterial({
  color: "#090605",
  roughness: 0.05,
  metalness: 0.0,
  clearcoat: 1.0,
});

const CATCHLIGHT_MAT = new THREE.MeshBasicMaterial({
  color: "#ffffff",
});

const EYELASH_MAT = new THREE.MeshStandardMaterial({
  color: "#1e110a",
  roughness: 0.45,
  metalness: 0.02,
});

const BROW_MAT = new THREE.MeshPhysicalMaterial({
  color: "#2b170d",
  roughness: 0.46,
  metalness: 0.02,
  sheen: 0.28,
  sheenColor: new THREE.Color("#4a2b1a"),
});

// 3. Mouth materials
const LIP_MAT = new THREE.MeshPhysicalMaterial({
  color: "#d66e63",
  roughness: 0.38,
  metalness: 0.0,
  clearcoat: 0.22,
  clearcoatRoughness: 0.3,
  sheen: 0.25,
  sheenColor: new THREE.Color("#f39c92"),
});

const TEETH_MAT = new THREE.MeshPhysicalMaterial({
  color: "#fcfaf7",
  roughness: 0.18,
  metalness: 0.0,
  clearcoat: 0.6,
});

const TONGUE_MAT = new THREE.MeshStandardMaterial({
  color: "#cf5f5a",
  roughness: 0.55,
  metalness: 0.0,
});

const ORAL_CAVITY_MAT = new THREE.MeshBasicMaterial({
  color: "#230908",
});

// 4. Iconic Round Black Glasses materials
const GLASSES_FRAME_MAT = new THREE.MeshPhysicalMaterial({
  color: "#121417",
  roughness: 0.3,
  metalness: 0.18,
  clearcoat: 0.3,
  clearcoatRoughness: 0.2,
});

const GLASSES_HINGE_MAT = new THREE.MeshStandardMaterial({
  color: "#94a3b8",
  roughness: 0.25,
  metalness: 0.85,
});

const GLASSES_LENS_MAT = new THREE.MeshPhysicalMaterial({
  color: "#e8f4fc",
  roughness: 0.08,
  metalness: 0.0,
  transmission: 0.85,
  ior: 1.48,
  thickness: 0.008,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
});

// 5. Sculpted Wavy Brown Hair materials (#3b2214 with subtle #54321d highlights)
const HAIR_BASE_MAT = new THREE.MeshPhysicalMaterial({
  color: "#3b2214",
  roughness: 0.5,
  metalness: 0.02,
  clearcoat: 0.08,
  clearcoatRoughness: 0.45,
  sheen: 0.32,
  sheenRoughness: 0.45,
  sheenColor: new THREE.Color("#54321d"),
});

const HAIR_HIGHLIGHT_MAT = new THREE.MeshPhysicalMaterial({
  color: "#54321d",
  roughness: 0.44,
  metalness: 0.03,
  clearcoat: 0.12,
  clearcoatRoughness: 0.4,
  sheen: 0.38,
  sheenRoughness: 0.4,
  sheenColor: new THREE.Color("#6e4328"),
});

const HAIR_DEEP_MAT = new THREE.MeshPhysicalMaterial({
  color: "#28160c",
  roughness: 0.56,
  metalness: 0.01,
  sheen: 0.22,
  sheenColor: new THREE.Color("#3b2214"),
});

// 6. Classic Tailored Suit, Crisp White Collar & Black Tie materials
const SUIT_JACKET_MAT = new THREE.MeshPhysicalMaterial({
  color: "#1e2024",
  roughness: 0.5,
  metalness: 0.04,
  sheen: 0.28,
  sheenRoughness: 0.55,
  sheenColor: new THREE.Color("#32363f"),
});

const SUIT_LAPEL_MAT = new THREE.MeshPhysicalMaterial({
  color: "#17191d",
  roughness: 0.42,
  metalness: 0.06,
  clearcoat: 0.08,
  sheen: 0.34,
  sheenRoughness: 0.48,
  sheenColor: new THREE.Color("#2e333d"),
});

const WHITE_SHIRT_MAT = new THREE.MeshPhysicalMaterial({
  color: "#f8fafc",
  roughness: 0.36,
  metalness: 0.01,
  clearcoat: 0.06,
  sheen: 0.2,
  sheenColor: new THREE.Color("#ffffff"),
});

const BLACK_TIE_MAT = new THREE.MeshPhysicalMaterial({
  color: "#111317",
  roughness: 0.34,
  metalness: 0.06,
  clearcoat: 0.16,
  clearcoatRoughness: 0.28,
  sheen: 0.38,
  sheenRoughness: 0.42,
  sheenColor: new THREE.Color("#2b303c"),
});

const SUIT_BUTTON_MAT = new THREE.MeshPhysicalMaterial({
  color: "#0e1014",
  roughness: 0.22,
  metalness: 0.25,
  clearcoat: 0.6,
});

// Scratch vectors for zero-GC per-frame updates
const _upVec = new THREE.Vector3(0, 1, 0);
const _diffVec = new THREE.Vector3();

class Limb {
  mesh: THREE.Mesh;
  constructor(radiusTop: number, radiusBottom: number, material: THREE.Material, parent: THREE.Object3D) {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, 1, 24);
    this.mesh = new THREE.Mesh(geo, material);
    parent.add(this.mesh);
  }

  between(a: THREE.Vector3, b: THREE.Vector3) {
    _diffVec.subVectors(b, a);
    const len = _diffVec.length();
    this.mesh.position.copy(a).addScaledVector(_diffVec, 0.5);
    this.mesh.scale.set(1, Math.max(len, 1e-4), 1);
    this.mesh.quaternion.setFromUnitVectors(_upVec, _diffVec.normalize());
  }
}

class ForearmWithCuff {
  group = new THREE.Group();
  sleeveMesh: THREE.Mesh;
  cuffMesh: THREE.Mesh;
  cuffEdge: THREE.Mesh;
  cuffButton: THREE.Mesh;

  constructor(side: Side, parent: THREE.Object3D) {
    parent.add(this.group);

    // Dark tailored suit forearm sleeve (covers top 84% of forearm)
    const sleeveGeo = new THREE.CylinderGeometry(0.044, 0.038, 0.84, 24);
    sleeveGeo.translate(0, -0.08, 0);
    this.sleeveMesh = new THREE.Mesh(sleeveGeo, SUIT_JACKET_MAT);
    this.group.add(this.sleeveMesh);

    // Crisp white dress shirt cuff peeking out at the wrist end (top 18% near wrist)
    const cuffGeo = new THREE.CylinderGeometry(0.0355, 0.0365, 0.17, 24);
    cuffGeo.translate(0, 0.405, 0);
    this.cuffMesh = new THREE.Mesh(cuffGeo, WHITE_SHIRT_MAT);
    this.group.add(this.cuffMesh);

    // Crisp shirt cuff lip ring at the wrist border
    const edgeGeo = new THREE.TorusGeometry(0.0345, 0.0022, 10, 24);
    edgeGeo.rotateX(Math.PI / 2);
    edgeGeo.translate(0, 0.488, 0);
    this.cuffEdge = new THREE.Mesh(edgeGeo, WHITE_SHIRT_MAT);
    this.group.add(this.cuffEdge);

    // Small cufflink / sleeve button accent
    const s = side === "right" ? -1 : 1;
    const btnGeo = new THREE.CylinderGeometry(0.0038, 0.0038, 0.0025, 12);
    btnGeo.rotateZ(Math.PI / 2);
    btnGeo.translate(0.036 * s, 0.41, 0);
    this.cuffButton = new THREE.Mesh(btnGeo, SUIT_BUTTON_MAT);
    this.group.add(this.cuffButton);
  }

  between(elbow: THREE.Vector3, wrist: THREE.Vector3) {
    _diffVec.subVectors(wrist, elbow);
    const len = _diffVec.length();
    this.group.position.copy(elbow).addScaledVector(_diffVec, 0.5);
    this.group.scale.set(1, Math.max(len, 1e-4), 1);
    this.group.quaternion.setFromUnitVectors(_upVec, _diffVec.normalize());
  }
}

class Hand {
  root = new THREE.Group();
  joints: THREE.Object3D[][] = [];

  constructor(public side: Side, parent: THREE.Object3D) {
    const s = side === "right" ? 1 : -1;
    parent.add(this.root);
    this.root.scale.setScalar(HAND_SCALE);

    // Sculpted palm with rounded edges
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.078, 0.024), SKIN_MAT);
    palm.position.set(0, 0.042, 0);
    this.root.add(palm);

    const heel = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125, 0.042, 6, 12), SKIN_MAT);
    heel.rotation.z = Math.PI / 2;
    heel.position.set(0, 0.006, 0);
    this.root.add(heel);

    for (const x of [0.024, 0.008, -0.008, -0.024]) {
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.0092, 12, 10), SKIN_MAT);
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
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len - radius, 4, 10), SKIN_MAT);
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
 * Creates the Pixar-style rounded, friendly head geometry with soft cheeks and chin.
 */
function createPixarHeadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.106, 52, 40);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Friendly Pixar cheek fullness (y between -0.055 and +0.035)
    if (v.y > -0.055 && v.y < 0.035 && v.z > -0.01) {
      const cheekT = Math.sin(((v.y + 0.055) / 0.09) * Math.PI);
      const frontT = THREE.MathUtils.clamp((v.z + 0.01) / 0.11, 0, 1);
      v.x *= 1.0 + cheekT * frontT * 0.11;
      v.z *= 1.0 + cheekT * frontT * 0.065;
    }

    // Softly tapered jaw and friendly rounded chin pad
    if (v.y < -0.02) {
      const jawT = THREE.MathUtils.clamp((-v.y - 0.02) / 0.085, 0, 1);
      v.x *= 1.0 - jawT * 0.17;
      if (v.z > 0 && v.y < -0.05) {
        const chinT = THREE.MathUtils.clamp((-v.y - 0.05) / 0.045, 0, 1);
        v.z += chinT * 0.007;
      }
    }

    // Gentle cranial dome height
    if (v.y > 0.02) {
      const browT = THREE.MathUtils.clamp((v.y - 0.02) / 0.09, 0, 1);
      v.x *= 1.0 - browT * 0.04;
    }

    v.x *= 0.97;
    v.y *= 1.03;
    v.z *= 0.96;

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an expressive curved 3D eyebrow mesh using a 3D CatmullRomCurve3 tube with rounded end caps.
 */
function createSculptedEyebrow(side: Side): THREE.Group {
  const s = side === "right" ? -1 : 1; // right eye is on -x, left eye is on +x
  const browGroup = new THREE.Group();

  const pts = [
    new THREE.Vector3(-0.017 * s, 0.0005, 0.000),  // inner brow (toward nose bridge)
    new THREE.Vector3(-0.004 * s, 0.0055, 0.0025), // high arch peak
    new THREE.Vector3(0.010 * s, 0.0040, 0.001),   // outer arch
    new THREE.Vector3(0.021 * s, -0.0015, -0.003), // tapered outer tail
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.0050, 12, false);

  // Taper outer tip and thicken inner brow slightly for authentic Pixar expression
  const pos = tubeGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const along = (v.x * s + 0.017) / 0.038; // 0 = inner, 1 = outer
    const taper = along > 0.65 ? Math.max(0.35, 1.0 - ((along - 0.65) / 0.35) * 0.65) : 1.05;
    v.y *= taper;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  tubeGeo.computeVertexNormals();

  const mesh = new THREE.Mesh(tubeGeo, BROW_MAT);
  browGroup.add(mesh);

  const innerCap = new THREE.Mesh(new THREE.SphereGeometry(0.0049, 10, 8), BROW_MAT);
  innerCap.position.copy(pts[0]);
  browGroup.add(innerCap);

  const outerCap = new THREE.Mesh(new THREE.SphereGeometry(0.0030, 10, 8), BROW_MAT);
  outerCap.position.copy(pts[3]);
  browGroup.add(outerCap);

  return browGroup;
}

/**
 * Builds the iconic sleek matte-black round glasses with curved nose bridge,
 * side hinges, temple arms resting over the ears, and ultra-subtle transparent lenses.
 */
function createRoundBlackGlasses(): THREE.Group {
  const glasses = new THREE.Group();

  const eyeX = 0.041;
  const eyeY = 0.012;
  const frameZ = 0.105;
  const ringRadius = 0.028;
  const tubeRadius = 0.0034;

  // Left & Right Round Eyeglass Frames + Subtle Transparent Lenses
  for (const s of [-1, 1]) {
    const rimGeo = new THREE.TorusGeometry(ringRadius, tubeRadius, 18, 56);
    const rim = new THREE.Mesh(rimGeo, GLASSES_FRAME_MAT);
    rim.position.set(s * eyeX, eyeY, frameZ);
    rim.rotation.y = s * 0.06;
    glasses.add(rim);

    // Ultra-subtle transparent glass lens
    const lensGeo = new THREE.CircleGeometry(ringRadius - 0.0015, 40);
    const lens = new THREE.Mesh(lensGeo, GLASSES_LENS_MAT);
    lens.position.set(s * eyeX, eyeY, frameZ + 0.0005);
    lens.rotation.y = s * 0.06;
    lens.renderOrder = 3;
    glasses.add(lens);

    // Outer frame lug / endpiece
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0052, 0.006), GLASSES_FRAME_MAT);
    lug.position.set(s * (eyeX + ringRadius + 0.002), eyeY + 0.004, frameZ - 0.002);
    glasses.add(lug);

    // Tiny metallic hinge accent
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.006, 10), GLASSES_HINGE_MAT);
    hinge.position.set(s * (eyeX + ringRadius + 0.0045), eyeY + 0.004, frameZ - 0.004);
    glasses.add(hinge);

    // Temple arm extending back to rest cleanly over the ear
    const templeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * (eyeX + ringRadius + 0.004), eyeY + 0.004, frameZ - 0.003),
      new THREE.Vector3(s * 0.092, eyeY + 0.004, 0.062),
      new THREE.Vector3(s * 0.103, eyeY + 0.003, 0.012),
      new THREE.Vector3(s * 0.104, eyeY - 0.001, -0.014),
      new THREE.Vector3(s * 0.100, eyeY - 0.016, -0.026),
    ]);
    const templeGeo = new THREE.TubeGeometry(templeCurve, 24, 0.0025, 10, false);
    const temple = new THREE.Mesh(templeGeo, GLASSES_FRAME_MAT);
    glasses.add(temple);
  }

  // Curved Nose Bridge connecting the two round rims
  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-(eyeX - ringRadius + 0.001), eyeY + 0.004, frameZ + 0.001),
    new THREE.Vector3(-0.006, eyeY + 0.0085, frameZ + 0.004),
    new THREE.Vector3(0.0, eyeY + 0.0095, frameZ + 0.0048),
    new THREE.Vector3(0.006, eyeY + 0.0085, frameZ + 0.004),
    new THREE.Vector3(eyeX - ringRadius - 0.001, eyeY + 0.004, frameZ + 0.001),
  ]);
  const bridgeGeo = new THREE.TubeGeometry(bridgeCurve, 20, 0.0028, 12, false);
  const bridge = new THREE.Mesh(bridgeGeo, GLASSES_FRAME_MAT);
  glasses.add(bridge);

  return glasses;
}

/**
 * Builds volumetric, layered wavy dark-brown hair (#3b2214 with #54321d highlights)
 * swept up in a stylized side-parted wave with sculpted strand ridges.
 */
function createWavyBrownHair(): THREE.Group {
  const hair = new THREE.Group();

  // 1. Base cranial hair dome covering crown, back, and sides
  const capGeo = new THREE.SphereGeometry(0.113, 44, 34, 0, Math.PI * 2, 0, Math.PI * 0.66);
  const capPos = capGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < capPos.count; i++) {
    v.fromBufferAttribute(capPos, i);
    // Add side-part volume on the top-right (-x) and crown
    if (v.y > 0.03) {
      const crownLift = Math.sin(THREE.MathUtils.clamp((v.y - 0.03) / 0.08, 0, 1) * (Math.PI / 2));
      v.y += crownLift * 0.020;
      if (v.x < 0.02) {
        v.y += crownLift * 0.010;
      }
    }
    // Carve clean forehead opening in front so face and eyebrows are completely clear
    if (v.z > 0.035 && v.y < 0.076) {
      const pushUp = (0.076 - v.y) * 0.72;
      v.y += pushUp;
    }
    capPos.setXYZ(i, v.x * 0.99, v.y, v.z * 1.02);
  }
  capGeo.computeVertexNormals();
  const baseCap = new THREE.Mesh(capGeo, HAIR_BASE_MAT);
  baseCap.position.set(0, 0.016, -0.010);
  baseCap.rotation.x = -0.18;
  hair.add(baseCap);

  // Back nape taper
  const nape = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.062, 0.075, 28), HAIR_DEEP_MAT);
  nape.position.set(0, -0.030, -0.042);
  nape.scale.set(0.95, 1.0, 0.72);
  hair.add(nape);

  // 2. Layered Wavy Side-Parted Swept Locks (from left part +x=0.056 sweeping up and across toward -x)
  const waveSpecs: Array<{
    pts: [number, number, number][];
    radius: number;
    mat: THREE.Material;
  }> = [
    // Primary hero front wave swooping up from the side part (+x) across the forehead crest to (-x)
    {
      pts: [
        [0.054, 0.090, 0.068],
        [0.024, 0.120, 0.086],
        [-0.018, 0.130, 0.082],
        [-0.060, 0.116, 0.064],
        [-0.090, 0.088, 0.032],
      ],
      radius: 0.024,
      mat: HAIR_BASE_MAT,
    },
    // Highlight ridge crest riding along the front wave
    {
      pts: [
        [0.046, 0.096, 0.074],
        [0.016, 0.126, 0.092],
        [-0.024, 0.135, 0.088],
        [-0.064, 0.120, 0.068],
        [-0.088, 0.094, 0.040],
      ],
      radius: 0.015,
      mat: HAIR_HIGHLIGHT_MAT,
    },
    // Secondary mid-crown wave behind the front wave
    {
      pts: [
        [0.062, 0.098, 0.035],
        [0.024, 0.134, 0.052],
        [-0.024, 0.142, 0.048],
        [-0.068, 0.124, 0.028],
        [-0.096, 0.086, -0.005],
      ],
      radius: 0.026,
      mat: HAIR_BASE_MAT,
    },
    // Mid-crown highlight strand ridge
    {
      pts: [
        [0.050, 0.106, 0.042],
        [0.012, 0.140, 0.058],
        [-0.032, 0.146, 0.052],
        [-0.072, 0.126, 0.030],
      ],
      radius: 0.014,
      mat: HAIR_HIGHLIGHT_MAT,
    },
    // Upper-back crown wave for full 3D silhouette
    {
      pts: [
        [0.065, 0.100, -0.005],
        [0.020, 0.136, 0.012],
        [-0.028, 0.140, 0.008],
        [-0.075, 0.116, -0.012],
        [-0.098, 0.076, -0.038],
      ],
      radius: 0.026,
      mat: HAIR_BASE_MAT,
    },
    // Charming S-curve accent lock dipping slightly on the right temple (-x)
    {
      pts: [
        [-0.016, 0.124, 0.088],
        [-0.050, 0.112, 0.088],
        [-0.078, 0.092, 0.074],
        [-0.094, 0.066, 0.052],
      ],
      radius: 0.015,
      mat: HAIR_HIGHLIGHT_MAT,
    },
    // Left side-part comb-back wave (on +x side of the part line)
    {
      pts: [
        [0.058, 0.090, 0.064],
        [0.082, 0.094, 0.046],
        [0.098, 0.078, 0.015],
        [0.102, 0.052, -0.022],
      ],
      radius: 0.020,
      mat: HAIR_BASE_MAT,
    },
    // Left side highlight ridge
    {
      pts: [
        [0.064, 0.096, 0.056],
        [0.088, 0.098, 0.036],
        [0.101, 0.080, 0.004],
      ],
      radius: 0.012,
      mat: HAIR_HIGHLIGHT_MAT,
    },
    // Right side swept temple wave (-x side)
    {
      pts: [
        [-0.068, 0.098, 0.052],
        [-0.094, 0.082, 0.026],
        [-0.104, 0.056, -0.012],
        [-0.098, 0.028, -0.044],
      ],
      radius: 0.020,
      mat: HAIR_BASE_MAT,
    },
  ];

  for (const spec of waveSpecs) {
    const curve = new THREE.CatmullRomCurve3(spec.pts.map((p) => new THREE.Vector3(...p)));
    const geo = new THREE.TubeGeometry(curve, 28, spec.radius, 14, false);
    const pos = geo.attributes.position;
    const center = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const u = Math.min(1, Math.max(0, Math.floor(i / 15) / 28));
      curve.getPointAt(u, center);
      const scale = Math.sin(u * Math.PI) * 0.55 + 0.45;
      v.sub(center).multiplyScalar(scale).add(center);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    hair.add(new THREE.Mesh(geo, spec.mat));
  }

  // 3. Neat tapered sideburns in front of both ears
  for (const s of [-1, 1]) {
    const sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.044, 6, 12), HAIR_DEEP_MAT);
    sb.position.set(s * 0.097, 0.012, 0.014);
    sb.rotation.set(0.10, 0, s * 0.14);
    hair.add(sb);
  }

  return hair;
}

/**
 * Builds the tailored charcoal-black suit jacket (#1e2024), crisp white dress shirt collar (#f8fafc),
 * notched lapels, black knotted necktie (#111317), and left-chest white pocket square.
 */
function createTailoredSuitTorso(shoulders: Record<Side, THREE.Vector3>): THREE.Group {
  const torso = new THREE.Group();

  // 1. Seamless tailored suit jacket body (from y=0.72 hem to y=1.43 shoulders)
  const jacketPoints = [
    new THREE.Vector2(0.001, 0.72),
    new THREE.Vector2(0.156, 0.72),
    new THREE.Vector2(0.152, 0.84),
    new THREE.Vector2(0.146, 0.98), // tailored waist taper
    new THREE.Vector2(0.160, 1.15),
    new THREE.Vector2(0.175, 1.30),
    new THREE.Vector2(0.184, 1.39),
    new THREE.Vector2(0.162, 1.43),
    new THREE.Vector2(0.072, 1.44),
    new THREE.Vector2(0.001, 1.44),
  ];
  const jacketGeo = new THREE.LatheGeometry(jacketPoints, 44);
  jacketGeo.scale(1.0, 1.0, 0.60);
  const jacketMesh = new THREE.Mesh(jacketGeo, SUIT_JACKET_MAT);
  torso.add(jacketMesh);

  // Subtle center-front jacket opening seam below the V-point
  const frontSeam = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.36, 0.008), SUIT_LAPEL_MAT);
  frontSeam.position.set(0, 0.90, 0.093);
  torso.add(frontSeam);

  // 2. Crisp White Dress Shirt V-Zone Chest Insert (#f8fafc)
  // Built in local coordinates around y=1.26 so Z depth sits cleanly on the front of the chest (z ~ 0.104)
  const shirtShape = new THREE.Shape();
  shirtShape.moveTo(-0.066, 0.18);
  shirtShape.lineTo(0.066, 0.18);
  shirtShape.lineTo(0.054, 0.04);
  shirtShape.lineTo(0.0, -0.17);
  shirtShape.lineTo(-0.054, 0.04);
  shirtShape.closePath();

  const shirtGeo = new THREE.ExtrudeGeometry(shirtShape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  const shirtBib = new THREE.Mesh(shirtGeo, WHITE_SHIRT_MAT);
  shirtBib.position.set(0, 1.26, 0.098);
  shirtBib.rotation.x = 0.05;
  torso.add(shirtBib);

  // Crisp White Dress Shirt Stand-Up Neck Collar Band
  const collarBand = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.046, 28), WHITE_SHIRT_MAT);
  collarBand.position.set(0, 1.444, 0.002);
  collarBand.scale.set(1.0, 1.0, 0.92);
  torso.add(collarBand);

  // Crisp White Pointed Dress Shirt Collar Wings (framing the tie knot)
  for (const s of [-1, 1]) {
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.010);
    wingShape.lineTo(s * 0.054, 0.022);
    wingShape.lineTo(s * 0.058, -0.012);
    wingShape.lineTo(s * 0.020, -0.038);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.005,
      bevelEnabled: true,
      bevelThickness: 0.0018,
      bevelSize: 0.0015,
      bevelSegments: 2,
    });
    const wing = new THREE.Mesh(wingGeo, WHITE_SHIRT_MAT);
    wing.position.set(s * 0.005, 1.434, 0.111);
    wing.rotation.set(0.14, -s * 0.22, 0);
    torso.add(wing);
  }

  // 3. Black Knotted Necktie (#111317) prominently down the center of the white shirt
  // Sculpted Windsor Tie Knot
  const knotShape = new THREE.Shape();
  knotShape.moveTo(-0.017, 0.015);
  knotShape.lineTo(0.017, 0.015);
  knotShape.lineTo(0.011, -0.017);
  knotShape.lineTo(-0.011, -0.017);
  knotShape.closePath();

  const knotGeo = new THREE.ExtrudeGeometry(knotShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 3,
  });
  const tieKnot = new THREE.Mesh(knotGeo, BLACK_TIE_MAT);
  tieKnot.position.set(0, 1.416, 0.113);
  torso.add(tieKnot);

  // Tapered Necktie Blade in local coordinates around y=1.26 so it sits cleanly in front of the white shirt bib
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.010, 0.145);
  bladeShape.lineTo(0.010, 0.145);
  bladeShape.lineTo(0.022, -0.095);
  bladeShape.lineTo(0.0, -0.145);
  bladeShape.lineTo(-0.022, -0.095);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.006,
    bevelEnabled: true,
    bevelThickness: 0.0022,
    bevelSize: 0.0018,
    bevelSegments: 2,
  });
  const tieBlade = new THREE.Mesh(bladeGeo, BLACK_TIE_MAT);
  tieBlade.position.set(0, 1.26, 0.111);
  tieBlade.rotation.x = 0.05;
  torso.add(tieBlade);

  // 4. Tailored Notched Suit Lapels (Left & Right) in local coordinates around y=1.26
  for (const s of [-1, 1]) {
    const lapelShape = new THREE.Shape();
    lapelShape.moveTo(s * 0.054, 0.182);
    lapelShape.lineTo(s * 0.098, 0.165);
    // Classic triangular lapel notch step
    lapelShape.lineTo(s * 0.082, 0.105);
    lapelShape.lineTo(s * 0.104, 0.090);
    // Outer lapel edge sweeping down to the center button
    lapelShape.lineTo(s * 0.070, -0.045);
    lapelShape.lineTo(s * 0.004, -0.180);
    lapelShape.lineTo(s * 0.001, -0.155);
    lapelShape.lineTo(s * 0.046, 0.025);
    lapelShape.closePath();

    const lapelGeo = new THREE.ExtrudeGeometry(lapelShape, {
      depth: 0.009,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    const lapel = new THREE.Mesh(lapelGeo, SUIT_LAPEL_MAT);
    lapel.position.set(0, 1.26, 0.109);
    lapel.rotation.set(0.05, -s * 0.08, 0);
    torso.add(lapel);
  }

  // Two tailored suit jacket buttons below the lapel V-point
  for (const [by, bz] of [
    [1.055, 0.104],
    [0.955, 0.096],
  ]) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.0045, 18), SUIT_BUTTON_MAT);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, by, bz);
    torso.add(btn);
  }

  // 5. Neat White Pocket Square on the Left Chest (+x side)
  const pocketGroup = new THREE.Group();
  pocketGroup.position.set(0.088, 1.255, 0.102);
  pocketGroup.rotation.set(0.04, 0.26, -0.04);
  torso.add(pocketGroup);

  // Breast pocket welt trim
  const pocketWelt = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.0085, 0.006), SUIT_LAPEL_MAT);
  pocketGroup.add(pocketWelt);

  // Crisp folded white pocket square peeking out of the breast pocket
  const psShape = new THREE.Shape();
  psShape.moveTo(-0.022, 0.002);
  psShape.lineTo(-0.008, 0.024);
  psShape.lineTo(0.004, 0.011);
  psShape.lineTo(0.015, 0.027);
  psShape.lineTo(0.022, 0.002);
  psShape.closePath();

  const psGeo = new THREE.ExtrudeGeometry(psShape, {
    depth: 0.0035,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.001,
    bevelSegments: 2,
  });
  const pocketSquare = new THREE.Mesh(psGeo, WHITE_SHIRT_MAT);
  pocketSquare.position.set(0, 0.002, -0.001);
  pocketGroup.add(pocketSquare);

  // 6. Tailored Suit Shoulders blended seamlessly into the upper jacket
  for (const side of ["right", "left"] as Side[]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.052, 24, 18), SUIT_JACKET_MAT);
    sh.position.copy(shoulders[side]);
    sh.scale.set(0.96, 0.92, 0.95);
    torso.add(sh);
  }

  // 7. Proportionate Peach Skin Neck emerging from the white shirt collar
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.047, 0.105, 24), SKIN_MAT);
  neck.position.set(0, 1.48, -0.002);
  torso.add(neck);

  return torso;
}

export class AvatarRig {
  group = new THREE.Group();

  private upper: Record<Side, Limb>;
  private fore: Record<Side, ForearmWithCuff>;
  private elbowJoints: Record<Side, THREE.Mesh>;
  private wrists: Record<Side, THREE.Mesh>;
  private shoulders: Record<Side, THREE.Vector3> = {
    right: new THREE.Vector3(-SHOULDER_X, SHOULDER_Y, 0),
    left: new THREE.Vector3(SHOULDER_X, SHOULDER_Y, 0),
  };
  private hands: Record<Side, Hand>;

  private torsoGroup: THREE.Group;
  private headPivot: THREE.Group;
  private head: THREE.Group;

  // Pixar Eyes, Eyelids & Dynamic Brows
  private eyesGroup: Record<Side, THREE.Group>;
  private upperLids: Record<Side, THREE.Group>;
  private brows: Record<Side, THREE.Group>;
  private cheeks: Record<Side, THREE.Mesh>;

  // Dynamic Morphing Mouth Assembly
  private mouthGroup: THREE.Group;
  private upperLipMesh: THREE.Mesh;
  private lowerLipMesh: THREE.Mesh;
  private mouthCavity: THREE.Mesh;
  private teeth: THREE.Mesh;
  private tongue: THREE.Mesh;

  // Interactive look-at, emotion override & greeting wave states
  private gazeX = 0;
  private gazeY = 0;
  private reactionTimer = 0;
  private waveProgress = 0;
  private emotionOverride: AvatarEmotion | null = null;

  // Smoothed facial state for silky morphing
  private smoothSmile = 0.14;
  private smoothOpen = 0.04;
  private smoothPucker = 0.0;
  private smoothBrowRaise = 0.0;
  private smoothBrowFurrow = 0.0;

  constructor() {
    const g = this.group;

    // ---------------------------------------------------- 1. Classic Tailored Suit, Collar & Tie
    this.torsoGroup = createTailoredSuitTorso(this.shoulders);
    g.add(this.torsoGroup);

    // ---------------------------------------------------- 2. Stylized Pixar Head & Facial Features
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 1.50, 0);
    g.add(this.headPivot);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.088, 0);
    // Warm, appealing Pixar head proportion relative to the tailored shoulders
    this.head.scale.setScalar(1.14);
    this.headPivot.add(this.head);

    const skull = new THREE.Mesh(createPixarHeadGeometry(), SKIN_MAT);
    this.head.add(skull);

    // Subtle rosy cheek blush spheres on both cheeks
    const cheekGeo = new THREE.SphereGeometry(0.024, 20, 16);
    const cheekR = new THREE.Mesh(cheekGeo, CHEEK_BLUSH_MAT);
    cheekR.position.set(-0.056, -0.016, 0.088);
    cheekR.scale.set(1.15, 0.72, 0.42);
    cheekR.rotation.y = -0.35;
    this.head.add(cheekR);

    const cheekL = new THREE.Mesh(cheekGeo, CHEEK_BLUSH_MAT);
    cheekL.position.set(0.056, -0.016, 0.088);
    cheekL.scale.set(1.15, 0.72, 0.42);
    cheekL.rotation.y = 0.35;
    this.head.add(cheekL);
    this.cheeks = { right: cheekR, left: cheekL };

    // ---------------------------------------------------- 3. Large Expressive Pixar Eyes + Blinking
    this.eyesGroup = { right: new THREE.Group(), left: new THREE.Group() };
    this.upperLids = { right: new THREE.Group(), left: new THREE.Group() };

    for (const side of ["right", "left"] as Side[]) {
      const isRight = side === "right";
      const x = isRight ? -0.041 : 0.041;
      const eyeSocket = new THREE.Group();
      eyeSocket.position.set(x, 0.012, 0.088);
      this.head.add(eyeSocket);

      const eg = this.eyesGroup[side];
      eyeSocket.add(eg);

      // White Sclera sphere
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.0205, 32, 24), EYE_SCLERA_MAT);
      sclera.scale.set(1.0, 1.04, 0.92);
      eg.add(sclera);

      // Rich Warm Brown Iris (#4a2511)
      const irisOuter = new THREE.Mesh(new THREE.CircleGeometry(0.0128, 32), IRIS_BROWN_MAT);
      irisOuter.position.set(0, 0, 0.0188);
      eg.add(irisOuter);

      // Warm Golden-Brown Inner Iris Ring
      const irisInner = new THREE.Mesh(new THREE.CircleGeometry(0.0092, 28), IRIS_RING_MAT);
      irisInner.position.set(0, 0, 0.0190);
      eg.add(irisInner);

      // Dark Pupil
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.0056, 24), PUPIL_MAT);
      pupil.position.set(0, 0, 0.0193);
      eg.add(pupil);

      // Tiny White Specular Catchlight Spheres (primary upper-right + secondary lower-left)
      const catchMain = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 14, 12), CATCHLIGHT_MAT);
      catchMain.position.set(0.0040, 0.0042, 0.0198);
      catchMain.scale.set(1.0, 1.0, 0.45);
      eg.add(catchMain);

      const catchSub = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 12, 10), CATCHLIGHT_MAT);
      catchSub.position.set(-0.0036, -0.0038, 0.0198);
      catchSub.scale.set(1.0, 1.0, 0.45);
      eg.add(catchSub);

      // Upper Eyelash Arch fixed above the sclera
      const lashArch = new THREE.Mesh(new THREE.TorusGeometry(0.0208, 0.0022, 10, 28, Math.PI * 0.86), EYELASH_MAT);
      lashArch.position.set(0, 0.002, 0.011);
      lashArch.rotation.set(0.18, isRight ? -0.08 : 0.08, isRight ? 0.34 : -0.34);
      eg.add(lashArch);

      // Animated Upper Eyelid for smooth blinking
      const lidPivot = this.upperLids[side];
      eyeSocket.add(lidPivot);

      const upperLidGeo = new THREE.SphereGeometry(0.0216, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52);
      const upperLid = new THREE.Mesh(upperLidGeo, SKIN_MAT);
      upperLid.scale.set(1.02, 1.05, 0.95);
      lidPivot.add(upperLid);
      lidPivot.rotation.x = -1.48;
      lidPivot.visible = false;
    }

    // ---------------------------------------------------- 4. Thick Expressive Eyebrows Above the Glasses
    const browR = createSculptedEyebrow("right");
    browR.position.set(-0.042, 0.056, 0.098);
    this.head.add(browR);

    const browL = createSculptedEyebrow("left");
    browL.position.set(0.042, 0.056, 0.098);
    this.head.add(browL);
    this.brows = { right: browR, left: browL };

    // ---------------------------------------------------- 5. Iconic Round Black Glasses
    const glassesGroup = createRoundBlackGlasses();
    this.head.add(glassesGroup);

    // ---------------------------------------------------- 6. Rounded Button Nose & Sculpted Ears
    const noseGroup = new THREE.Group();
    noseGroup.position.set(0, -0.010, 0.104);
    this.head.add(noseGroup);

    // Rounded Pixar button nose tip
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.0118, 24, 18), NOSE_BLUSH_MAT);
    noseTip.scale.set(1.22, 0.88, 1.05);
    noseGroup.add(noseTip);

    // Soft sculpted nostril wings
    for (const x of [-0.0095, 0.0095]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 14, 12), SKIN_SHADOW_MAT);
      wing.position.set(x, -0.0022, -0.0025);
      wing.scale.set(0.95, 0.78, 0.85);
      noseGroup.add(wing);
    }

    // Smooth upper nasal bridge
    const nasalBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.016, 6, 14), SKIN_MAT);
    nasalBridge.position.set(0, 0.012, -0.004);
    nasalBridge.rotation.x = -0.22;
    noseGroup.add(nasalBridge);

    // Sculpted Ears on Both Sides
    for (const s of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(s * 0.104, 0.000, -0.008);
      earGroup.rotation.set(0.04, s * -0.28, s * -0.06);
      this.head.add(earGroup);

      // Outer pinna / lobe
      const earBase = new THREE.Mesh(new THREE.SphereGeometry(0.023, 22, 18), SKIN_MAT);
      earBase.scale.set(0.42, 1.18, 0.82);
      earGroup.add(earBase);

      // Sculpted outer helix rim
      const helix = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0042, 10, 24, Math.PI * 1.25), SKIN_MAT);
      helix.scale.set(0.8, 1.22, 0.75);
      helix.rotation.set(0, Math.PI / 2, s > 0 ? -0.45 : 2.6);
      helix.position.set(s * 0.003, 0.002, 0.0);
      earGroup.add(helix);

      // Inner concha hollow
      const concha = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 16, 12), SKIN_SHADOW_MAT);
      concha.scale.set(0.32, 0.88, 0.62);
      concha.position.set(s * 0.004, 0.001, 0.003);
      earGroup.add(concha);
    }

    // ---------------------------------------------------- 7. Expressive Morphing Mouth Mesh
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, -0.045, 0.097);
    this.head.add(this.mouthGroup);

    // Inner oral cavity
    this.mouthCavity = new THREE.Mesh(new THREE.CircleGeometry(0.016, 28), ORAL_CAVITY_MAT);
    this.mouthCavity.position.set(0, 0.001, -0.002);
    this.mouthGroup.add(this.mouthCavity);

    // Upper dental arch
    this.teeth = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.005, 0.004), TEETH_MAT);
    this.teeth.position.set(0, 0.005, -0.0008);
    this.mouthGroup.add(this.teeth);

    // Soft tongue hint inside oral cavity
    this.tongue = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 12), TONGUE_MAT);
    this.tongue.scale.set(1.2, 0.55, 0.6);
    this.tongue.position.set(0, -0.005, -0.0012);
    this.mouthGroup.add(this.tongue);

    // Upper and lower sculpted lip curves (dynamically morphed in setPose)
    const initialUpperCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.020, 0.003, -0.002),
      new THREE.Vector3(-0.009, 0.002, 0.002),
      new THREE.Vector3(0.0, 0.0015, 0.003),
      new THREE.Vector3(0.009, 0.002, 0.002),
      new THREE.Vector3(0.020, 0.003, -0.002),
    ]);
    const initialLowerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.020, 0.003, -0.002),
      new THREE.Vector3(-0.010, -0.002, 0.002),
      new THREE.Vector3(0.0, -0.0035, 0.003),
      new THREE.Vector3(0.010, -0.002, 0.002),
      new THREE.Vector3(0.020, 0.003, -0.002),
    ]);

    this.upperLipMesh = new THREE.Mesh(new THREE.TubeGeometry(initialUpperCurve, 24, 0.0028, 10, false), LIP_MAT);
    this.lowerLipMesh = new THREE.Mesh(new THREE.TubeGeometry(initialLowerCurve, 24, 0.0031, 10, false), LIP_MAT);
    this.mouthGroup.add(this.upperLipMesh, this.lowerLipMesh);

    // ---------------------------------------------------- 8. Sculpted Wavy Brown Hair
    const hairGroup = createWavyBrownHair();
    this.head.add(hairGroup);

    // ---------------------------------------------------- 9. Suit Sleeves, White Cuffs & Hands
    this.upper = {
      right: new Limb(0.050, 0.044, SUIT_JACKET_MAT, g),
      left: new Limb(0.050, 0.044, SUIT_JACKET_MAT, g),
    };
    this.fore = {
      right: new ForearmWithCuff("right", g),
      left: new ForearmWithCuff("left", g),
    };

    // Seamless dark suit elbow joints
    this.elbowJoints = {
      right: new THREE.Mesh(new THREE.SphereGeometry(0.0435, 20, 16), SUIT_JACKET_MAT),
      left: new THREE.Mesh(new THREE.SphereGeometry(0.0435, 20, 16), SUIT_JACKET_MAT),
    };
    g.add(this.elbowJoints.right, this.elbowJoints.left);

    // Warm peach skin wrists emerging from the crisp white dress shirt cuffs
    this.wrists = {
      right: new THREE.Mesh(new THREE.SphereGeometry(0.0285, 16, 12), SKIN_MAT),
      left: new THREE.Mesh(new THREE.SphereGeometry(0.0285, 16, 12), SKIN_MAT),
    };
    g.add(this.wrists.right, this.wrists.left);

    this.hands = { right: new Hand("right", g), left: new Hand("left", g) };
  }

  setGaze(lookX: number, lookY: number) {
    this.gazeX = THREE.MathUtils.clamp(lookX, -1, 1);
    this.gazeY = THREE.MathUtils.clamp(lookY, -1, 1);
  }

  setEmotion(emotion: AvatarEmotion | null) {
    this.emotionOverride = emotion;
  }

  getEmotion(): AvatarEmotion | null {
    return this.emotionOverride;
  }

  triggerReaction(kind: "greeting" | "smile" = "greeting") {
    this.reactionTimer = 2.2;
    this.waveProgress = 0;
    if (kind === "smile") {
      this.emotionOverride = "smile";
    }
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
    this.elbowJoints[side].position.copy(elbow);
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

  /**
   * Smoothly morphs the upper and lower lip geometries and inner mouth elements
   * based on open, smile, and pucker parameters.
   */
  private updateMorphingMouth(open: number, smile: number, pucker: number) {
    // Corner width & vertical lift
    const halfW = THREE.MathUtils.clamp(0.019 * (1.0 + 0.30 * smile - 0.38 * pucker), 0.011, 0.027);
    const cornerY = 0.002 + smile * 0.007 - pucker * 0.002;
    const cornerZ = -0.0025 - smile * 0.002 + pucker * 0.003;
    const forwardZ = 0.0025 + pucker * 0.0045;

    const gapHalf = open * 0.0115 + pucker * 0.0028;
    const midArch = smile * 0.0018;

    const upperPts = [
      new THREE.Vector3(-halfW, cornerY, cornerZ),
      new THREE.Vector3(-halfW * 0.5, cornerY * 0.55 + gapHalf * 0.65 + 0.001, forwardZ * 0.75),
      new THREE.Vector3(0, gapHalf * 0.75 + 0.0012 + midArch, forwardZ),
      new THREE.Vector3(halfW * 0.5, cornerY * 0.55 + gapHalf * 0.65 + 0.001, forwardZ * 0.75),
      new THREE.Vector3(halfW, cornerY, cornerZ),
    ];

    const lowerPts = [
      new THREE.Vector3(-halfW, cornerY, cornerZ),
      new THREE.Vector3(-halfW * 0.52, cornerY * 0.35 - gapHalf * 0.95 - 0.0015, forwardZ * 0.75),
      new THREE.Vector3(0, -gapHalf * 1.15 - 0.0022 + midArch * 0.5, forwardZ),
      new THREE.Vector3(halfW * 0.52, cornerY * 0.35 - gapHalf * 0.95 - 0.0015, forwardZ * 0.75),
      new THREE.Vector3(halfW, cornerY, cornerZ),
    ];

    this.deformTubeAlongCurve(this.upperLipMesh.geometry as THREE.BufferGeometry, new THREE.CatmullRomCurve3(upperPts), 24, 10, 0.0026);
    this.deformTubeAlongCurve(this.lowerLipMesh.geometry as THREE.BufferGeometry, new THREE.CatmullRomCurve3(lowerPts), 24, 10, 0.0030);

    // Inner oral cavity, teeth, and tongue visibility & scale
    const cavityVisible = open > 0.06 || pucker > 0.35;
    this.mouthCavity.visible = cavityVisible;
    const cavW = Math.max(0.35, (halfW / 0.018) * 0.88);
    const cavH = Math.max(0.18, (gapHalf / 0.010) * 0.95 + 0.12);
    this.mouthCavity.scale.set(cavW, cavH, 1.0);
    this.mouthCavity.position.y = (upperPts[2].y + lowerPts[2].y) * 0.5;
    this.mouthCavity.position.z = forwardZ - 0.0038;

    this.teeth.visible = open > 0.10 || smile > 0.45;
    this.teeth.scale.set(Math.min(1.05, cavW * 0.92), 1.0, 1.0);
    this.teeth.position.y = upperPts[2].y - 0.0025;
    this.teeth.position.z = forwardZ - 0.0025;

    this.tongue.visible = open > 0.18;
    this.tongue.position.y = lowerPts[2].y + 0.0032;
    this.tongue.position.z = forwardZ - 0.0032;
  }

  private deformTubeAlongCurve(
    geo: THREE.BufferGeometry,
    curve: THREE.CatmullRomCurve3,
    tubularSegments: number,
    radialSegments: number,
    baseRadius: number,
  ) {
    const pos = geo.attributes.position;
    const frames = curve.computeFrenetFrames(tubularSegments, false);
    const pt = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (let i = 0; i <= tubularSegments; i++) {
      const u = i / tubularSegments;
      curve.getPointAt(u, pt);
      // Taper lip thickness cleanly toward mouth corners
      const taper = Math.sin(u * Math.PI) * 0.65 + 0.35;
      const r = baseRadius * taper;
      const N = frames.normals[i];
      const B = frames.binormals[i];

      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = -Math.cos(v);
        normal.set(
          cos * N.x + sin * B.x,
          cos * N.y + sin * B.y,
          cos * N.z + sin * B.z,
        ).normalize();

        const idx = i * (radialSegments + 1) + j;
        pos.setXYZ(idx, pt.x + r * normal.x, pt.y + r * normal.y, pt.z + r * normal.z);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  setPose(pose: PosePair, time = 0, face?: Partial<FacePose>) {
    let effectivePose = pose;
    let reactionNod = 0;
    let reactionSmileBonus = 0;
    let reactionBrowBonus = 0;

    if (this.reactionTimer > 0) {
      this.reactionTimer = Math.max(0, this.reactionTimer - 0.016);
      const total = 2.2;
      const elapsed = total - this.reactionTimer;
      this.waveProgress = elapsed / total;

      reactionNod = Math.sin(this.waveProgress * Math.PI * 2) * 0.07;
      reactionSmileBonus = Math.sin(this.waveProgress * Math.PI) * 0.55;
      reactionBrowBonus = Math.sin(this.waveProgress * Math.PI) * 0.35;

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

    // Combine base face pose with any active emotion preset override
    let mergedFace: FacePose = {
      ...NEUTRAL_FACE,
      ...face,
    };
    if (this.emotionOverride) {
      mergedFace = applyEmotionPreset(mergedFace, this.emotionOverride);
    }

    // Natural breathing on torso
    const breath = Math.sin(time * 1.5) * 0.010;
    this.torsoGroup.scale.set(1.0 + breath * 0.45, 1.0 + breath * 0.25, 1.0 + breath * 0.85);

    // Idle head micro-motion & mouse gaze
    const idleY = Math.sin(time * 0.6) * 0.022;
    const idleX = Math.sin(time * 0.9) * 0.012;
    const gazeYaw = this.gazeX * 0.18;
    const gazePitch = -this.gazeY * 0.14;

    this.headPivot.rotation.y = idleY + gazeYaw + (mergedFace.headTilt ?? 0) * 0.35;
    this.headPivot.rotation.x = idleX + gazePitch + (mergedFace.headNod ?? 0) + reactionNod;
    this.headPivot.rotation.z = (mergedFace.headTilt ?? 0) * 0.45;

    // Smooth eye gaze + animated upper eyelid blinking
    const blink = THREE.MathUtils.clamp(mergedFace.blink ?? 0, 0, 1);
    const eyeYaw = this.gazeX * 0.22;
    const eyePitch = -this.gazeY * 0.16;

    for (const side of ["right", "left"] as Side[]) {
      const eg = this.eyesGroup[side];
      eg.rotation.y = eyeYaw;
      eg.rotation.x = eyePitch;
      eg.scale.y = Math.max(0.10, 1.0 - blink * 0.90);

      // Show upper eyelid cap during blink closure
      const lid = this.upperLids[side];
      lid.visible = blink > 0.08;
      lid.rotation.x = -1.35 + blink * 1.30;
    }

    // Smoothly interpolate facial expression parameters
    const targetOpen = THREE.MathUtils.clamp(mergedFace.mouthOpen ?? 0.04, 0, 1);
    const targetSmile = THREE.MathUtils.clamp((mergedFace.mouthSmile ?? 0.14) + reactionSmileBonus, -0.35, 1.0);
    const targetPucker = THREE.MathUtils.clamp(mergedFace.mouthPucker ?? 0, 0, 1);
    const targetRaise = THREE.MathUtils.clamp((mergedFace.browRaise ?? 0) + reactionBrowBonus, 0, 1);
    const targetFurrow = THREE.MathUtils.clamp(mergedFace.browFurrow ?? 0, 0, 1);

    this.smoothOpen += (targetOpen - this.smoothOpen) * 0.35;
    this.smoothSmile += (targetSmile - this.smoothSmile) * 0.28;
    this.smoothPucker += (targetPucker - this.smoothPucker) * 0.32;
    this.smoothBrowRaise += (targetRaise - this.smoothBrowRaise) * 0.28;
    this.smoothBrowFurrow += (targetFurrow - this.smoothBrowFurrow) * 0.28;

    // Dynamic Eyebrows above the glasses (ISL non-manual grammar markers)
    const browDeltaY = this.smoothBrowRaise * 0.011 - this.smoothBrowFurrow * 0.0055;
    const browTilt = this.smoothBrowRaise * 0.14 - this.smoothBrowFurrow * 0.24;

    this.brows.right.position.y = 0.056 + browDeltaY;
    this.brows.right.rotation.z = -browTilt;
    this.brows.right.rotation.x = -this.smoothBrowRaise * 0.08 + this.smoothBrowFurrow * 0.10;

    this.brows.left.position.y = 0.056 + browDeltaY;
    this.brows.left.rotation.z = browTilt;
    this.brows.left.rotation.x = -this.smoothBrowRaise * 0.08 + this.smoothBrowFurrow * 0.10;

    // Subtle cheek lift when smiling
    const cheekLift = Math.max(0, this.smoothSmile) * 0.0038;
    this.cheeks.right.position.y = -0.016 + cheekLift;
    this.cheeks.left.position.y = -0.016 + cheekLift;

    // Morph the expressive mouth mesh
    this.updateMorphingMouth(this.smoothOpen, this.smoothSmile, this.smoothPucker);
  }
}
