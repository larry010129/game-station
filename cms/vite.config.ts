import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { draftApiPlugin } from "./server/draftApiPlugin";

// Port 1430 — sibling to the app on 1420 (see GACHA REDESIGN.md "Testing the CMS locally").
// draftApiPlugin mounts signed /releases/* host + /api publish on the same port.
export default defineConfig({
  plugins: [react(), draftApiPlugin()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    port: 1430,
    strictPort: true,
    fs: { allow: [".."] },
  },
  preview: {
    port: 1430,
    strictPort: true,
  },
  publicDir: "public",
  build: { target: "es2021" },
});
