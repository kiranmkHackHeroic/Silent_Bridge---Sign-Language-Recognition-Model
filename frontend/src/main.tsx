import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts are bundled locally so Kannada renders identically on any demo PC (no CDN).
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-kannada/400.css";
import "@fontsource/noto-sans-kannada/600.css";
import "@fontsource/noto-sans-kannada/700.css";
import App from "./App";
import "./styles/app.css";

// MediaPipe Tasks Vision WASM forwards C++ TensorFlow Lite / XNNPACK / absl INFO
// and WARNING messages to stderr (which Emscripten binds to console.error).
// Downgrade those informational C++ runtime notices to console.debug.
const rawConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (
    first.startsWith("INFO:") ||
    first.startsWith("WARNING:") ||
    /^[IW]0000\s/.test(first) ||
    first.includes("Created TensorFlow Lite XNNPACK delegate") ||
    first.includes("absl::InitializeLog") ||
    first.includes("gl_context") ||
    first.includes("Graph successfully started")
  ) {
    console.debug(...args);
    return;
  }
  rawConsoleError(...args);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

