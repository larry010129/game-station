import {
  currentInfo,
  ensureDataLayout,
  listReleases,
  mimeForUpload,
  publish,
  readBlob,
  readDraft,
  readSignedManifest,
  readUpload,
  rollback,
  saveBannerUpload,
  scheduleErrors,
  writeDraft,
} from "./store.mjs";
import { publicKeyPem, verifyManifest } from "./keys.mjs";
import { validateBundle } from "./validate.mjs";

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return Buffer.alloc(0);
  return Buffer.concat(chunks);
}

async function readBody(req) {
  const rawBuf = await readRawBody(req);
  if (rawBuf.length === 0) return null;
  const raw = rawBuf.toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw);
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.end(data);
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(text);
}

function sendBuf(res, status, buf, type = "application/octet-stream") {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.end(buf);
}

/**
 * Connect/Vite middleware: handles /api/* and /releases*.
 */
export function createReleaseMiddleware() {
  ensureDataLayout();

  return function releaseMiddleware(req, res, next) {
    let url;
    try {
      url = new URL(req.url || "/", "http://localhost");
    } catch {
      // A request path such as "//" is not a valid URL. Answer it instead of throwing, which would stop the
      // standalone server (it has no error handler around this middleware).
      return sendJson(res, 400, { error: "bad request URL" });
    }
    const { pathname } = url;
    const method = (req.method || "GET").toUpperCase();

    if (
      method === "OPTIONS" &&
      (pathname.startsWith("/api") ||
        pathname.startsWith("/releases") ||
        pathname.startsWith("/uploads"))
    ) {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Filename");
      res.end();
      return;
    }

    // Bare /releases is the CMS SPA page — only /releases/* host paths are claimed.
    const isApi = pathname.startsWith("/api/");
    const isUpload = pathname.startsWith("/uploads/");
    const isReleaseHost =
      pathname === "/releases/current" ||
      pathname === "/releases/public-key" ||
      pathname.startsWith("/releases/blobs/") ||
      /^\/releases\/\d+\//.test(pathname);
    if (!isApi && !isReleaseHost && !isUpload) return next();

    try {
      // —— Local draft uploads (banner art preview) ——
      if (method === "GET" && isUpload) {
        const rel = pathname.slice("/uploads/".length);
        const buf = readUpload(rel);
        if (!buf) return sendJson(res, 404, { error: "upload not found" });
        return sendBuf(res, 200, buf, mimeForUpload(rel));
      }

      // —— App-facing release host (under /releases/…) ——
      if (method === "GET" && pathname === "/releases/current") {
        return sendJson(res, 200, currentInfo());
      }
      if (method === "GET" && pathname === "/releases/public-key") {
        return sendText(res, 200, publicKeyPem(), "application/x-pem-file");
      }
      if (method === "GET" && pathname.startsWith("/releases/blobs/")) {
        const hash = pathname.slice("/releases/blobs/".length);
        if (!/^[a-f0-9]{64}$/i.test(hash)) return sendJson(res, 400, { error: "bad hash" });
        const buf = readBlob(hash.toLowerCase());
        if (!buf) return sendJson(res, 404, { error: "blob not found" });
        return sendBuf(res, 200, buf);
      }
      {
        const m = pathname.match(/^\/releases\/(\d+)\/manifest\.json$/);
        if (method === "GET" && m) {
          const signed = readSignedManifest(Number(m[1]));
          if (!signed) return sendJson(res, 404, { error: "release not found" });
          return sendJson(res, 200, signed);
        }
      }
      {
        const m = pathname.match(/^\/releases\/(\d+)\/content\.json$/);
        if (method === "GET" && m) {
          const signed = readSignedManifest(Number(m[1]));
          if (!signed) return sendJson(res, 404, { error: "release not found" });
          const buf = readBlob(signed.manifest.contentHash);
          if (!buf) return sendJson(res, 404, { error: "content blob missing" });
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(buf);
          return;
        }
      }

      // —— CMS publish API (contracts shared with UI contentApi.ts) ——
      if (pathname === "/api/upload" && method === "POST") {
        return readRawBody(req)
          .then((buf) => {
            const folder = url.searchParams.get("folder") || "banners";
            if (folder !== "banners") {
              return sendJson(res, 400, { ok: false, errors: ["unsupported folder"] });
            }
            const filename =
              (typeof req.headers["x-filename"] === "string" && req.headers["x-filename"]) ||
              url.searchParams.get("filename") ||
              "banner.png";
            const contentType =
              typeof req.headers["content-type"] === "string"
                ? req.headers["content-type"].split(";")[0].trim()
                : undefined;
            const saved = saveBannerUpload(buf, { filename, contentType });
            return sendJson(res, 200, { ok: true, url: saved.url, path: saved.path });
          })
          .catch((err) =>
            sendJson(res, 400, { ok: false, errors: [String(err.message || err)] }),
          );
      }
      if (pathname === "/api/draft" && method === "GET") {
        try {
          return sendJson(res, 200, readDraft());
        } catch (err) {
          return sendJson(res, 404, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      if (pathname === "/api/draft" && method === "PUT") {
        return readBody(req)
          .then((body) => {
            if (!body || typeof body !== "object") {
              return sendJson(res, 400, { ok: false, errors: ["JSON object required"] });
            }
            writeDraft(body);
            return sendJson(res, 200, { ok: true, path: "cms/data/draft.json" });
          })
          .catch((err) => sendJson(res, 400, { ok: false, errors: [String(err.message || err)] }));
      }
      if (pathname === "/api/validate" && method === "POST") {
        return readBody(req)
          .then((body) => {
            const draft =
              body && (body.economy || body.gacha) ? body : readDraft();
            const result = validateBundle(draft);
            return sendJson(res, result.ok ? 200 : 400, result);
          })
          .catch((err) => sendJson(res, 400, { ok: false, errors: [String(err.message || err)] }));
      }
      if (pathname === "/api/publish" && method === "POST") {
        return readBody(req)
          .then((body) => {
            // A Push is always scheduled: the go-live time is required (scripts may still call publish() directly).
            const timeErrors = scheduleErrors(body?.effectiveAt);
            if (timeErrors.length) return sendJson(res, 400, { ok: false, errors: timeErrors });
            const result = publish({
              notes: body?.notes,
              draft: body?.draft,
              effectiveAt: body?.effectiveAt,
            });
            return sendJson(res, result.ok ? 200 : 400, result);
          })
          .catch((err) => sendJson(res, 400, { ok: false, errors: [String(err.message || err)] }));
      }
      if (pathname === "/api/rollback" && method === "POST") {
        return readBody(req)
          .then((body) => {
            const result = rollback(body?.to ?? body?.number);
            return sendJson(res, result.ok ? 200 : 400, result);
          })
          .catch((err) => sendJson(res, 400, { ok: false, errors: [String(err.message || err)] }));
      }
      if (pathname === "/api/releases" && method === "GET") {
        return sendJson(res, 200, { current: currentInfo(), releases: listReleases() });
      }
      if (pathname === "/api/verify" && method === "POST") {
        return readBody(req)
          .then((body) => {
            const signed = body?.number != null ? readSignedManifest(Number(body.number)) : body;
            if (!signed?.manifest || !signed?.signature) {
              return sendJson(res, 400, { ok: false, errors: ["manifest + signature required"] });
            }
            const ok = verifyManifest(signed.manifest, signed.signature);
            return sendJson(res, 200, { ok });
          })
          .catch((err) => sendJson(res, 400, { ok: false, errors: [String(err.message || err)] }));
      }

      if (isApi) return sendJson(res, 404, { error: `Unknown API route ${pathname}` });
      return next();
    } catch (err) {
      return sendJson(res, 500, { error: String(err?.message || err) });
    }
  };
}
