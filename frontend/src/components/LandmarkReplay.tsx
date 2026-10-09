import { useEffect, useRef } from "react";
import { HAND_CONNECTIONS } from "../services/vision";
import type { LandmarkFrame } from "../services/types";

/** Plays back a recorded landmark sequence (skeleton only, mirrored like the camera view). */
export function LandmarkReplay({ frames, label }: { frames: LandmarkFrame[]; label?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !frames.length) return;
    const ctx = canvas.getContext("2d")!;
    const W = 480, H = 360;
    canvas.width = W;
    canvas.height = H;
    const t0 = frames[0].t;
    const dur = Math.max(1, frames[frames.length - 1].t - t0);
    let raf = 0;
    const start = performance.now();
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = t0 + ((performance.now() - start) % (dur + 600));
      let f = frames[0];
      for (const fr of frames) {
        if (fr.t <= t) f = fr;
        else break;
      }
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W, 0);
      ctx.scale(-1, 1); // mirror to match the live preview
      if (f.face) {
        ctx.strokeStyle = "rgba(167,139,250,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect((f.face.cx - f.face.w / 2) * W, (f.face.cy - f.face.h / 2) * H, f.face.w * W, f.face.h * H);
      }
      for (const hand of f.hands) {
        ctx.strokeStyle = hand.handedness === "Left" ? "#2dd4bf" : "#f59e0b";
        ctx.lineWidth = 3;
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(hand.landmarks[a][0] * W, hand.landmarks[a][1] * H);
          ctx.lineTo(hand.landmarks[b][0] * W, hand.landmarks[b][1] * H);
          ctx.stroke();
        }
      }
      ctx.restore();
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "13px Inter, sans-serif";
      ctx.fillText(`${label ?? ""}  ${((f.t - t0) / 1000).toFixed(1)}s / ${(dur / 1000).toFixed(1)}s  ·  ${f.hands.length} hand(s)`, 10, H - 12);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [frames, label]);
  return <canvas ref={ref} className="replay-canvas" aria-label="Recorded landmark replay" />;
}

export function quickCheck(frames: LandmarkFrame[]): { ok: boolean; handFrames: number; message: string } {
  const handFrames = frames.filter((f) => f.hands.length > 0).length;
  if (!frames.length) return { ok: false, handFrames, message: "No frames were captured." };
  if (handFrames === 0) return { ok: false, handFrames, message: "No hands were detected. This sample would be rejected." };
  if (handFrames / frames.length < 0.25) return { ok: false, handFrames, message: `Hands visible in only ${handFrames}/${frames.length} frames.` };
  return { ok: true, handFrames, message: `Hands visible in ${handFrames}/${frames.length} frames.` };
}
