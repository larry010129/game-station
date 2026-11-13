import http from "node:http";

export const DEFAULT_ORIGINS = ["http://localhost:1420", "http://127.0.0.1:1420", "http://tauri.localhost", "tauri://localhost"];

/**
 * Tiny localhost-only API for the dashboard. It binds to 127.0.0.1, and also
 * refuses requests from other web origins (so a random web page cannot drive it),
 * requests with a foreign Host header (DNS rebinding), and non-JSON POSTs
 * (which would otherwise be CORS "simple requests").
 */
export function createServer({ host, port, handlers, log, allowedOrigins = [] }) {
  const origins = new Set([...DEFAULT_ORIGINS, ...allowedOrigins]);
  let boundPort = port;

  const hostOk = (h) => {
    if (!h) return false;
    const names = new Set([host, "127.0.0.1", "localhost", "[::1]"]);
    return [...names].some((n) => h === `${n}:${boundPort}` || (boundPort === 80 && h === n));
  };

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (!hostOk(req.headers.host)) {
      send(res, 403, { error: "Forbidden host" });
      return;
    }
    if (origin !== undefined) {
      if (!origins.has(origin)) {
        send(res, 403, { error: "Forbidden origin" });
        return;
      }
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && !/^application\/json\s*(;|$)/i.test(req.headers["content-type"] ?? "")) {
      send(res, 415, { error: "Content-Type must be application/json" });
      return;
    }

    try {
      const url = new URL(req.url ?? "/", `http://${host}:${boundPort}`);
      const path = url.pathname;
      let body = null;
      if (req.method === "POST") {
        body = await readBody(req);
        try {
          body = body ? JSON.parse(body) : null;
        } catch {
          send(res, 400, { error: "Bad JSON" });
          return;
        }
      }

      const key = `${req.method} ${path}`;
      const handler = handlers[key];
      if (!handler) {
        send(res, 404, { error: "Not found" });
        return;
      }
      const result = await handler(body, url);
      send(res, 200, result);
    } catch (e) {
      log(`request failed: ${e.message}`);
      send(res, e.status ?? 500, { error: e.message || "Server error" });
    }
  });

  return {
    listen: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          boundPort = server.address().port;
          log(`listening on http://${host}:${boundPort}`);
          resolve();
        });
      }),
    port: () => boundPort,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections?.();
      }),
  };
}

function send(res, code, data) {
  const json = JSON.stringify(data);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(Object.assign(new Error("Body too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
