/**
 * Vite plugin: local release host + publish/signing API on the same port as the CMS UI.
 * Replaces the earlier stub; keeps GET/PUT /api/draft, POST /api/upload,
 * POST /api/publish, GET /api/releases, GET /uploads/*.
 */
import type { Plugin } from "vite";
import { createReleaseMiddleware } from "./http.mjs";
import { ensureDataLayout } from "./store.mjs";

export function draftApiPlugin(): Plugin {
  return {
    name: "cms-release-host",
    configureServer(server) {
      ensureDataLayout();
      server.middlewares.use(createReleaseMiddleware());
    },
    configurePreviewServer(server) {
      ensureDataLayout();
      server.middlewares.use(createReleaseMiddleware());
    },
  };
}

/** Alias used by vite-plugin-release-host.mjs */
export const releaseHostPlugin = draftApiPlugin;
