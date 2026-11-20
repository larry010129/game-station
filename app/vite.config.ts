import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 1420 is what src-tauri/tauri.conf.json points the desktop window at.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  clearScreen: false,
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 1420,
    strictPort: true,
    // Same-origin /api in the browser (portraits, feed) → local service.
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
    },
    // Tauri release builds lock .exe under target/; watching them crashes Vite (EBUSY).
    watch: { ignored: ["**/src-tauri/target/**"] },
  },
  build: { target: "es2021" },
});
