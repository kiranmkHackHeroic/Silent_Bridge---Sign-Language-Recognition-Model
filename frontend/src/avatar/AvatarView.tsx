import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AnimationClip } from "../services/types";
import { AvatarRig } from "./AvatarRig";
import { NEUTRAL, buildTimeline, poseAt, type PosePair, type Timeline } from "./animation";

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
  const speedRef = useRef(speed);
  const onStateRef = useRef(onState);
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
      // blend back to neutral from wherever we are
      timelineRef.current = {
        clips: [],
        duration: 0.5,
        segments: [{ kind: "blend", index: -1, start: 0, duration: 0.5, from: current, to: NEUTRAL }],
      };
      timeRef.current = 0;
      pausedRef.current = false;
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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 20);
    camera.position.set(0, 1.36, 2.05);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.28, 0);
    controls.enablePan = false;
    controls.minDistance = 1.1;
    controls.maxDistance = 3.5;
    controls.minPolarAngle = Math.PI * 0.3;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.minAzimuthAngle = -Math.PI * 0.45;
    controls.maxAzimuthAngle = Math.PI * 0.45;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3b4252, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(1.2, 2.4, 2.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x99f6e4, 0.8);
    rim.position.set(-1.5, 2, -1.5);
    scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.6, 48), new THREE.MeshStandardMaterial({ color: 0x64748b, transparent: true, opacity: 0.18 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.72;
    scene.add(floor);

    const rig = new AvatarRig();
    scene.add(rig.group);
    rig.setPose(NEUTRAL);

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
        if (r.done) {
          timelineRef.current = null;
        } else if (tl.clips.length) {
          state = { playing: true, paused: pausedRef.current, index: r.index, progress: Math.min(1, timeRef.current / tl.duration) };
        }
      }
      rig.setPose(poseRef.current, clock.getElapsedTime());
      renderer.render(scene, camera);
      const sig = `${state.playing}|${state.paused}|${state.index}`;
      if (onStateRef.current && (sig !== lastReported || now - lastReport > 150)) {
        lastReported = sig;
        lastReport = now;
        onStateRef.current(state);
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="avatar-mount" ref={mountRef}>
      {webglError && <div className="overlay-msg error">{webglError}</div>}
    </div>
  );
});
