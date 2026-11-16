import { createReleaseMiddleware } from "./http.mjs";
import { ensureDataLayout } from "./store.mjs";

/** Same middleware as draftApiPlugin — use either from vite.config. */
export function releaseHostPlugin() {
  return {
    name: "game-station-release-host",
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
