import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AnimationClip } from "../services/types";
import { AvatarRig } from "./AvatarRig";
import { NEUTRAL, NEUTRAL_FACE, buildTimeline, poseAt, type FacePose, type PosePair, type Timeline } from "./animation";

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
}

interface Props {
  onState?: (s: PlaybackState) => void;
  speed?: number;
}

export const AvatarView = forwardRef<AvatarHandle, Props>(function AvatarView({ onState, speed = 1 }, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
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
  }), []);

  useEffect(() => {
    const mount = mountRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      setWebglError(`3D rendering (WebGL) is not available: ${String(err)}`);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const onLost = (e: Event) => {
      e.preventDefault();
      setWebglError("The 3D view lost its graphics context. Reload the page to restore the avatar.");
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);

    const scene = new THREE.Scene();
    // Upper-body framing: hands, face, and signing space
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    camera.position.set(0, 1.34, 1.78);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.27, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.1;
    controls.maxDistance = 3.5;
    controls.minPolarAngle = Math.PI * 0.3;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.minAzimuthAngle = -Math.PI * 0.45;
    controls.maxAzimuthAngle = Math.PI * 0.45;
    controls.update();

    // High-key animated character studio lighting (matching reference)
    scene.add(new THREE.HemisphereLight(0xfffaf0, 0x252a34, 2.0));

    const keyLight = new THREE.DirectionalLight(0xfffbf2, 2.6);
    keyLight.position.set(1.2, 2.2, 2.6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.1);
    fillLight.position.set(-1.6, 1.4, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    rimLight.position.set(0.2, 2.6, -2.0);
    scene.add(rimLight);

    const softBounce = new THREE.DirectionalLight(0xfef3c7, 0.6);
    softBounce.position.set(0, -1.0, 1.4);
    scene.add(softBounce);

    // Soft grounded contact shadow disc
    const shadowGeo = new THREE.CircleGeometry(0.32, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x07111c,
      transparent: true,
      opacity: 0.22,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.7, 0);
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

    let raf = 0;
    let last = performance.now();
    let lastReport = 0;
    let lastReported = "";
    const clock = new THREE.Clock();

    const tick = () => {
      raf = requestAnimationFrame(tick);
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
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerleave", onPointerLeave);
      mount.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
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
      ref={mountRef}
      className="avatar-mount"
      style={{ cursor: "pointer" }}
      title="Click anywhere to greet the avatar · Move mouse to track eyes"
    >
      <div className="avatar-hint-badge">
        <span>✨ Interactive 3D Human · Click to greet (ನಮಸ್ಕಾರ) · Follows cursor</span>
      </div>
    </div>
  );
});
