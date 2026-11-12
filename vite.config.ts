import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, "frontend"),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      allow: [path.resolve(__dirname)],
    },
    hmr: process.env.DISABLE_HMR !== "true",
    watch: process.env.DISABLE_HMR === "true" ? null : {},
  },
  preview: {
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
});
