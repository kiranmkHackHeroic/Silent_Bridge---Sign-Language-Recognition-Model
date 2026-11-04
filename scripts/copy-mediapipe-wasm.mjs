import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dst = join(root, "frontend", "public", "mediapipe-wasm");
if (existsSync(src)) {
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log("[copy-mediapipe-wasm] copied MediaPipe wasm to frontend/public/mediapipe-wasm");
} else {
  console.warn("[copy-mediapipe-wasm] wasm folder not found, skipping:", src);
}

const ortSrc = join(root, "node_modules", "onnxruntime-web", "dist");
const ortDst = join(root, "frontend", "public", "onnx-wasm");
if (existsSync(ortSrc)) {
  mkdirSync(ortDst, { recursive: true });
  for (const file of readdirSync(ortSrc)) {
    if (file.startsWith("ort-wasm") && (file.endsWith(".wasm") || file.endsWith(".mjs"))) {
      cpSync(join(ortSrc, file), join(ortDst, file));
    }
  }
  console.log("[copy-mediapipe-wasm] copied ONNX Runtime Web wasm/mjs to frontend/public/onnx-wasm");
}

