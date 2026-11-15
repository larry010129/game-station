import http from "node:http";

export const DEFAULT_ORIGINS = ["http://localhost:1420", "http://127.0.0.1:1420", "http://tauri.localhost", "tauri://localhost"];

/**
 * Tiny localhost-only API for the dashboard. It binds to 127.0.0.1, and also
 * refuses requests from other web origins (so a random web page cannot drive it),
 * requests with a foreign Host header (DNS rebinding), browser requests marked Sec-Fetch-Site: cross-site, and non-JSON POSTs
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
    // Browsers label every request. The dashboard itself is "cross-site" to the service (localhost:1420 or
    // tauri.localhost calling 127.0.0.1:8787), so an allowlisted Origin is authorised on its own. What this
    // catches is a cross-site request with NO Origin (a no-cors GET from a random page); non-browser clients send
    // no header at all and are still welcome. Browser redirects back to this service (Spotify OAuth) are
    // cross-site navigations by nature; each handler verifies its own token/session.
    const pathOnly = req.url?.split("?")[0] ?? "";
    const isBrowserReturn = req.method === "GET" && pathOnly === "/api/spotify/callback";
    if (req.headers["sec-fetch-site"] === "cross-site" && origin === undefined && !isBrowserReturn) {
      send(res, 403, { error: "Forbidden cross-site request" });
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
      if (result && typeof result.__html === "string") {
        // Browser return pages (Spotify OAuth) answer with HTML.
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
        res.end(result.__html);
        return;
      }
      if (result && result.__bytes instanceof Uint8Array) {
        res.writeHead(200, {
          "Content-Type": result.__type || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": result.__cache || "public, max-age=86400",
        });
        res.end(Buffer.from(result.__bytes));
        return;
      }
      send(res, 200, result);
    } catch (e) {
      log(`request failed: ${e.message}`);
      // Answer first, then let the connection close: destroying the request early would drop the 413 too.
      if (e.status === 413) res.setHeader("Connection", "close");
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
    let tooBig = false;
    req.on("data", (c) => {
      size += c.length;
      // Already refused: keep draining so the 413 can be delivered, but never take an endless upload.
      if (tooBig) {
        if (size > 32_000_000) req.destroy();
        return;
      }
      if (size > 1_000_000) {
        tooBig = true;
        chunks.length = 0;
        reject(Object.assign(new Error("Body too large"), { status: 413 }));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
