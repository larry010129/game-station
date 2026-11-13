import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 1420 is what src-tauri/tauri.conf.json points the desktop window at.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: "es2021" },
});
