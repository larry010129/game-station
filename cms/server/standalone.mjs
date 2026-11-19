// Stand-alone CMS server for the Command CMS desktop app (no Vite).
// Serves the built UI (dist/) with an SPA fallback and mounts the same /api, /releases and /uploads
// middleware as `npm run dev`, on 127.0.0.1:1430 so the app's dev content check still finds it.
//
//   node server/standalone.mjs
//
// Env:
//   COMMAND_CMS_DATA   data folder (read by paths.mjs; set before this module loads)
//   COMMAND_CMS_DIST   built UI folder (default: ../dist)
//   COMMAND_CMS_SEED   draft.json copied into an empty data folder on first run
//   COMMAND_CMS_PORT   port (default 1430)
//   COMMAND_CMS_STDIN_SHUTDOWN=1  exit when stdin closes (the desktop shell closes it on quit)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DRAFT_PATH, DATA_DIR } from "./paths.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(process.env.COMMAND_CMS_DIST || path.join(here, "..", "dist"));
const PORT = Number(process.env.COMMAND_CMS_PORT || 1430);
const HOST = "127.0.0.1";

// First run in a fresh data folder: start from the bundled draft rather than an empty editor.
const seed = process.env.COMMAND_CMS_SEED;
if (seed && !fs.existsSync(DRAFT_PATH) && fs.existsSync(seed)) {
  fs.mkdirSync(path.dirname(DRAFT_PATH), { recursive: true });
  fs.copyFileSync(seed, DRAFT_PATH);
  console.log(`[cms] seeded ${DRAFT_PATH} from ${seed}`);
}

const { createReleaseMiddleware } = await import("./http.mjs");
const api = createReleaseMiddleware();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function sendFile(res, file, cache) {
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
  res.setHeader("Cache-Control", cache);
  fs.createReadStream(file).pipe(res);
}

/** Static UI: real files from dist/, anything else (client routes like /themes, /releases) gets index.html. */
function serveUi(req, res) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    res.statusCode = 405;
    return res.end();
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
  } catch {
    res.statusCode = 400;
    return res.end();
  }
  const file = path.resolve(DIST, "." + pathname);
  if (file.startsWith(DIST + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const hashed = pathname.startsWith("/assets/");
    return sendFile(res, file, hashed ? "public, max-age=31536000, immutable" : "no-cache");
  }
  const index = path.join(DIST, "index.html");
  if (!fs.existsSync(index)) {
    res.statusCode = 500;
    return res.end(`CMS UI not found at ${DIST} (run npm run build in cms/)`);
  }
  return sendFile(res, index, "no-cache");
}

const server = http.createServer((req, res) => api(req, res, () => serveUi(req, res)));

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[cms] port ${PORT} is already in use (is npm run dev or another Command CMS running?)`);
  } else {
    console.error(`[cms] server error: ${err.message}`);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[cms] http://${HOST}:${PORT}  data=${DATA_DIR}  ui=${DIST}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
if (process.env.COMMAND_CMS_STDIN_SHUTDOWN === "1") {
  process.stdin.on("end", shutdown);
  process.stdin.on("close", shutdown);
  process.stdin.resume();
}
