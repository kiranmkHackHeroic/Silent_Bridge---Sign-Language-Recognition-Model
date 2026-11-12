// Copies the MediaPipe WASM runtime from node_modules into public/ so the app
// works fully offline (no CDN needed at runtime).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dst = join(root, "public", "mediapipe-wasm");

const STDERR_FILTER_SNIPPET = `var err = (...args) => { const m = String(args[0] ?? ""); if (m.startsWith("INFO:") || m.startsWith("WARNING:") || /^[IW]0000\\s/.test(m) || m.includes("XNNPACK") || m.includes("absl::InitializeLog") || m.includes("gl_context") || m.includes("Graph successfully started") || m.includes("norm_rect")) { console.debug(...args); return; } console.error(...args); };`;

function patchMediaPipeWasmLoader(dir) {
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".js")) {
      const fullPath = join(dir, file);
      const content = readFileSync(fullPath, "utf8");
      if (content.includes("var err = console.error.bind(console);")) {
        const patched = content.replace(
          "var err = console.error.bind(console);",
          STDERR_FILTER_SNIPPET,
        );
        writeFileSync(fullPath, patched, "utf8");
      }
    }
  }
}

if (!existsSync(src)) {
  patchMediaPipeWasmLoader(dst);
  console.warn("[copy-mediapipe-wasm] wasm folder not found, skipping:", src);
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
patchMediaPipeWasmLoader(src);
patchMediaPipeWasmLoader(dst);
console.log("[copy-mediapipe-wasm] copied and patched MediaPipe wasm in public/mediapipe-wasm");

