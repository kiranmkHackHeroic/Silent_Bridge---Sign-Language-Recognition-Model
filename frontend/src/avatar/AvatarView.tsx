import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { AnimationClip } from "../services/types";
import { AvatarRig } from "./AvatarRig";
import {
  NEUTRAL,
  NEUTRAL_FACE,
  buildTimeline,
  poseAt,
  type AvatarEmotion,
  type FacePose,
  type PosePair,
  type Timeline,
} from "./animation";

export interface PlaybackState {
  playing: boolean;
  paused: boolean;
  index: number;
  progress: number; // 0..1 over the whole sequence
}

export interface AvatarHandle {
  play: (clips: AnimationClip[]) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  greet: () => void;
  setEmotion: (emotion: AvatarEmotion | null) => void;
}

interface Props {
  onState?: (s: PlaybackState) => void;
  speed?: number;
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, "rgba(7, 14, 26, 0.52)");
  grad.addColorStop(0.55, "rgba(7, 14, 26, 0.22)");
  grad.addColorStop(1, "rgba(7, 14, 26, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const AvatarView = forwardRef<AvatarHandle, Props>(function AvatarView({ onState, speed = 1 }, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [activeEmotion, setActiveEmotion] = useState<AvatarEmotion | null>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const timeRef = useRef(0);
  const pausedRef = useRef(false);
  const poseRef = useRef<PosePair>(NEUTRAL);
  const faceRef = useRef<FacePose>(NEUTRAL_FACE);
  const speedRef = useRef(speed);
  const onStateRef = useRef(onState);
  const rigRef = useRef<AvatarRig | null>(null);

  speedRef.current = speed;
  onStateRef.current = onState;

  const handleEmotionChange = (emotion: AvatarEmotion | null) => {
    setActiveEmotion(emotion);
    rigRef.current?.setEmotion(emotion);
  };

  useImperativeHandle(ref, () => ({
    play(clips) {
      timelineRef.current = buildTimeline(clips, poseRef.current);
      timeRef.current = 0;
      pausedRef.current = false;
    },
    pause() {
      pausedRef.current = true;
    },
    resume() {
      pausedRef.current = false;
    },
    stop() {
      const current = poseRef.current;
      timelineRef.current = {
        clips: [],
        duration: 0.5,
        segments: [{ kind: "blend", index: -1, start: 0, duration: 0.5, from: current, to: NEUTRAL }],
      };
      timeRef.current = 0;
      pausedRef.current = false;
    },
    greet() {
      rigRef.current?.triggerReaction("greeting");
    },
    setEmotion(emotion) {
      handleEmotionChange(emotion);
    },
  }), []);

  useEffect(() => {
    const mount = mountRef.current!;
    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (err) {
      setWebglError(`3D rendering (WebGL) is not available: ${String(err)}`);
      return;
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    const onLost = (e: Event) => {
      e.preventDefault();
      setWebglError("The 3D view lost its graphics context. Reload the page to restore the avatar.");
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);

    const scene = new THREE.Scene();

    // Procedural Studio Environment Reflection (IBL for physical materials, glasses & eyes)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    if ("environmentIntensity" in scene) {
      (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.38;
    }
    pmremGenerator.dispose();

    // Balanced upper-body framing: full wavy hair, face, round glasses, suit & signing space
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 20);
    camera.position.set(0, 1.35, 1.92);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.31, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.15;
    controls.maxDistance = 3.5;
    controls.minPolarAngle = Math.PI * 0.28;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.minAzimuthAngle = -Math.PI * 0.45;
    controls.maxAzimuthAngle = Math.PI * 0.45;
    controls.update();

    // ---------------------------------------------------- Studio Three-Point Lighting Rig
    // 1. Hemisphere Fill Light (warm studio ceiling to cool slate floor gradient)
    const hemiLight = new THREE.HemisphereLight(0xfff8f0, 0x1e293b, 1.55);
    hemiLight.position.set(0, 3.0, 0);
    scene.add(hemiLight);

    // 2. Soft Warm Key Light (front-right studio softbox angle)
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.45);
    keyLight.position.set(1.5, 2.3, 2.5);
    scene.add(keyLight);

    // 3. Soft Cool Fill Light (front-left to keep facial features & suit lapels legible)
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.05);
    fillLight.position.set(-1.8, 1.4, 2.0);
    scene.add(fillLight);

    // 4. Cool Rim / Back Light (3D edge separation along dark suit shoulders & wavy hair)
    const rimLightCool = new THREE.DirectionalLight(0x93c5fd, 1.95);
    rimLightCool.position.set(-1.3, 2.4, -2.2);
    scene.add(rimLightCool);

    const rimLightWarm = new THREE.DirectionalLight(0xffedd5, 1.35);
    rimLightWarm.position.set(1.3, 2.2, -1.9);
    scene.add(rimLightWarm);

    // 5. Soft radial contact shadow grounding disc beneath the torso
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.CircleGeometry(0.36, 36);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.715, 0);
    scene.add(shadow);

    const rig = new AvatarRig();
    rigRef.current = rig;
    scene.add(rig.group);
    rig.setPose(NEUTRAL);

    // Interactive cursor gaze tracking & click reaction
    const targetGaze = { x: 0, y: 0 };
    const currentGaze = { x: 0, y: 0 };

    const onPointerMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetGaze.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetGaze.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const onPointerLeave = () => {
      targetGaze.x = 0;
      targetGaze.y = 0;
    };

    const onClick = () => {
      rig.triggerReaction("greeting");
    };

    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerleave", onPointerLeave);
    mount.addEventListener("click", onClick);

    const resize = () => {
      const w = mount.clientWidth || 400;
      const h = mount.clientHeight || 400;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let frameId = 0;
    let disposed = false;
    let last = performance.now();
    let lastReport = 0;
    let lastReported = "";
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === "function") {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const tl = timelineRef.current;
      let state: PlaybackState = { playing: false, paused: false, index: -1, progress: 0 };

      if (tl) {
        if (!pausedRef.current) timeRef.current += dt * speedRef.current;
        const r = poseAt(tl, timeRef.current);
        poseRef.current = r.pose;
        faceRef.current = r.face;
        if (r.done) {
          timelineRef.current = null;
        } else if (tl.clips.length) {
          state = {
            playing: true,
            paused: pausedRef.current,
            index: r.index,
            progress: Math.min(1, timeRef.current / tl.duration),
          };
        }
      } else {
        // While idle, calculate natural breathing, blinking, and micro-prosody
        faceRef.current = poseAt({ segments: [], duration: 0, clips: [] }, clock.getElapsedTime()).face;
      }

      // Smooth gaze tracking towards cursor
      currentGaze.x += (targetGaze.x - currentGaze.x) * 0.08;
      currentGaze.y += (targetGaze.y - currentGaze.y) * 0.08;
      rig.setGaze(currentGaze.x, currentGaze.y);

      rig.setPose(poseRef.current, clock.getElapsedTime(), faceRef.current);
      controls.update();
      renderer.render(scene, camera);

      const sig = `${state.playing}|${state.paused}|${state.index}`;
      if (onStateRef.current && (sig !== lastReported || now - lastReport > 150)) {
        lastReported = sig;
        lastReport = now;
        onStateRef.current(state);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerleave", onPointerLeave);
      mount.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      envTex.dispose();
      shadowTex.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglError) {
    return <div className="overlay-error">{webglError}</div>;
  }

  return (
    <div
      className="avatar-mount"
      title="Click anywhere to greet the avatar · Move mouse to track eyes"
    >
      <div
        ref={mountRef}
        className="avatar-canvas-host"
        style={{ width: "100%", height: "100%", cursor: "pointer" }}
      />
      <div className="avatar-hint-badge">
        <span>Click to greet (ನಮಸ್ಕಾರ) · Follows cursor</span>
      </div>
      <div className="avatar-expr-bar" role="group" aria-label="Facial expression preset">
        {(
          [
            { id: null, label: "Auto" },
            { id: "smile", label: "Smile" },
            { id: "neutral", label: "Neutral" },
            { id: "question", label: "Question ?" },
          ] as const
        ).map((item) => (
          <button
            key={item.label}
            type="button"
            className={`avatar-expr-btn ${activeEmotion === item.id ? "on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              handleEmotionChange(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
});
