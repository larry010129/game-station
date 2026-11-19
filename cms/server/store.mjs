import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { draftToContentBundle, isCmsDraft } from "./convert.mjs";
import { ensureKeypair, signManifest } from "./keys.mjs";
import {
  BANNERS_UPLOAD_DIR,
  BLOBS_DIR,
  BY_NUMBER_DIR,
  CURRENT_PATH,
  DATA_DIR,
  DRAFT_ASSETS_DIR,
  DRAFT_PATH,
  RELEASES_DIR,
  UPLOADS_DIR,
} from "./paths.mjs";
import { validateBundle } from "./validate.mjs";

const BANNER_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const BANNER_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Written to a temp file first, then renamed over the target, so a crash or kill mid-write cannot leave a
 * half-written draft, manifest or current.json (the same pattern as the app service's writeJson). A failed write
 * removes its temp file.
 */
export function writeFileAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
}

export function ensureDataLayout() {
  ensureKeypair();
  for (const dir of [
    RELEASES_DIR,
    BY_NUMBER_DIR,
    BLOBS_DIR,
    DRAFT_ASSETS_DIR,
    UPLOADS_DIR,
    BANNERS_UPLOAD_DIR,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(CURRENT_PATH)) {
    writeFileAtomic(CURRENT_PATH, JSON.stringify({ number: 0, publishedAt: null }, null, 2));
  }
}

/**
 * Save a banner image under data/uploads/banners/.
 * @param {Buffer} buf
 * @param {{ filename?: string, contentType?: string }} [opts]
 * @returns {{ url: string, path: string, filename: string }}
 */
export function saveBannerUpload(buf, opts = {}) {
  ensureDataLayout();
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    throw new Error("empty upload body");
  }
  if (buf.length > 8 * 1024 * 1024) {
    throw new Error("file too large (max 8MB)");
  }

  const rawName = typeof opts.filename === "string" ? opts.filename : "banner.png";
  let ext = path.extname(rawName).toLowerCase();
  if (!BANNER_EXTS.has(ext) && opts.contentType) {
    const byMime = Object.entries(BANNER_MIME).find(([, mime]) => mime === opts.contentType);
    if (byMime) ext = byMime[0];
  }
  if (!BANNER_EXTS.has(ext)) {
    throw new Error("unsupported image type (png/jpg/webp/gif)");
  }

  const filename = `banner-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}${ext}`;
  const abs = path.join(BANNERS_UPLOAD_DIR, filename);
  writeFileAtomic(abs, buf);
  const url = `/uploads/banners/${filename}`;
  return { url, path: `uploads/banners/${filename}`, filename };
}

/** Read a file under data/uploads/ (rel path like "banners/foo.png"). */
export function readUpload(rel) {
  ensureDataLayout();
  if (typeof rel !== "string" || !rel || rel.includes("..") || path.isAbsolute(rel)) {
    return null;
  }
  const abs = path.join(UPLOADS_DIR, ...rel.replace(/\\/g, "/").split("/").filter(Boolean));
  if (!abs.startsWith(UPLOADS_DIR) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return null;
  }
  return fs.readFileSync(abs);
}

export function mimeForUpload(rel) {
  const ext = path.extname(rel).toLowerCase();
  return BANNER_MIME[ext] || "application/octet-stream";
}

export function readCurrent() {
  ensureDataLayout();
  return JSON.parse(fs.readFileSync(CURRENT_PATH, "utf8"));
}

export function readDraft() {
  ensureDataLayout();
  if (!fs.existsSync(DRAFT_PATH)) {
    const err = new Error("draft.json missing — run node scripts/seed-draft.mjs");
    err.code = "ENOENT";
    throw err;
  }
  return JSON.parse(fs.readFileSync(DRAFT_PATH, "utf8"));
}

export function writeDraft(draft) {
  fs.mkdirSync(path.dirname(DRAFT_PATH), { recursive: true });
  const next = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  writeFileAtomic(DRAFT_PATH, JSON.stringify(next, null, 2));
}

export function listReleases() {
  ensureDataLayout();
  if (!fs.existsSync(BY_NUMBER_DIR)) return [];
  return fs
    .readdirSync(BY_NUMBER_DIR)
    .map((name) => Number(name))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => b - a)
    .map((number) => {
      const signed = readSignedManifest(number);
      return {
        number,
        publishedAt: signed?.manifest?.publishedAt ?? null,
        effectiveAt: signed?.manifest?.effectiveAt ?? signed?.manifest?.publishedAt ?? null,
        notes: signed?.manifest?.notes ?? "",
      };
    });
}

export function releaseDir(number) {
  return path.join(BY_NUMBER_DIR, String(number));
}

export function readSignedManifest(number) {
  const p = path.join(releaseDir(number), "manifest.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function readBlob(hash) {
  const p = path.join(BLOBS_DIR, hash);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

function putBlob(buf) {
  const hash = sha256(buf);
  const p = path.join(BLOBS_DIR, hash);
  // A blob is named by its hash, so an existing one is reused only if it still matches (a crash may have cut it short).
  if (!fs.existsSync(p) || sha256(fs.readFileSync(p)) !== hash) writeFileAtomic(p, buf);
  return hash;
}

function resolveDraftAsset(rel) {
  const safe = rel.replace(/\\/g, "/");
  if (typeof rel !== "string" || !rel || safe.includes("..") || path.isAbsolute(rel)) {
    throw new Error(`invalid asset path: ${rel}`);
  }
  if (safe.startsWith("uploads/")) {
    return path.join(DATA_DIR, ...safe.split("/"));
  }
  return path.join(DRAFT_ASSETS_DIR, ...safe.split("/"));
}

function materializeFiles(bundle) {
  const contentBuf = Buffer.from(JSON.stringify(bundle), "utf8");
  const contentHash = putBlob(contentBuf);
  const files = [{ path: "content.json", hash: contentHash, size: contentBuf.length }];

  const assetPaths = Array.isArray(bundle.assetPaths) ? bundle.assetPaths : [];
  for (const rel of assetPaths) {
    const safe = String(rel).replace(/\\/g, "/");
    const abs = resolveDraftAsset(safe);
    if (!fs.existsSync(abs)) throw new Error(`missing asset: ${safe}`);
    const buf = fs.readFileSync(abs);
    const hash = putBlob(buf);
    files.push({ path: `assets/${safe}`, hash, size: buf.length });
  }
  return { files, contentHash };
}

/**
 * @param {{ draft?: object, notes?: string }} [opts]
 */
export function publish(opts = {}) {
  ensureDataLayout();
  let draft;
  try {
    draft = opts.draft ? structuredClone(opts.draft) : readDraft();
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }

  if (typeof opts.notes === "string") {
    draft.releaseNotes = opts.notes;
  }

  const check = validateBundle(draft);
  if (!check.ok) return { ok: false, errors: check.errors };

  const bundle = isCmsDraft(draft) ? draftToContentBundle(draft) : draft;
  if (typeof opts.notes === "string") bundle.notes = opts.notes;

  let files;
  let contentHash;
  try {
    ({ files, contentHash } = materializeFiles(bundle));
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }

  const current = readCurrent();
  const number = (Number(current.number) || 0) + 1;
  const publishedAt = new Date().toISOString();
  // Go-live time, signed into the manifest. Apps keep their content until then. Absent: live now (scripts, rollback).
  let effectiveAt = publishedAt;
  if (opts.effectiveAt != null) {
    const t = Date.parse(String(opts.effectiveAt));
    if (!Number.isFinite(t)) return { ok: false, errors: ["effectiveAt must be a date and time"] };
    effectiveAt = new Date(t).toISOString();
  }
  const manifest = {
    number,
    publishedAt,
    effectiveAt,
    notes: typeof bundle.notes === "string" ? bundle.notes : "",
    contentHash,
    files,
  };
  const signature = signManifest(manifest);
  const signed = { manifest, signature, alg: "ed25519" };

  const dir = releaseDir(number);
  fs.mkdirSync(dir, { recursive: true });
  writeFileAtomic(path.join(dir, "manifest.json"), JSON.stringify(signed, null, 2));
  writeFileAtomic(path.join(dir, "content.json"), JSON.stringify(bundle, null, 2));

  writeFileAtomic(CURRENT_PATH, JSON.stringify({ number, publishedAt, effectiveAt }, null, 2));
  writeDraft(draft);

  return {
    ok: true,
    number,
    effectiveAt,
    manifestPath: `/releases/${number}/manifest.json`,
  };
}

/** Grace for clock drift and slow clicks: a go-live time this far in the past still counts as "now". */
export const SCHEDULE_GRACE_MS = 2 * 60_000;

/**
 * A Push must say when it goes live: an ISO time no earlier than now (minus the grace). Returns the errors, if any.
 * @param {unknown} effectiveAt
 * @param {number} [now]
 */
export function scheduleErrors(effectiveAt, now = Date.now()) {
  if (effectiveAt == null || effectiveAt === "") return ["Choose when this release goes live (mm/dd/yy hh:mm)."];
  const t = Date.parse(String(effectiveAt));
  if (!Number.isFinite(t)) return ["The go-live time is not a valid date and time."];
  if (t < now - SCHEDULE_GRACE_MS) return ["The go-live time is in the past. Pick now or a later time."];
  return [];
}

/** Re-publish an older release as a newer number (rollback). */
export function rollback(toNumber) {
  ensureDataLayout();
  const n = Number(toNumber);
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, errors: ["to must be a positive release number"] };
  }
  const contentPath = path.join(releaseDir(n), "content.json");
  if (!fs.existsSync(contentPath)) {
    return { ok: false, errors: [`release ${n} not found`] };
  }
  const bundle = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const note = `Rollback to release ${n}`;
  bundle.notes = bundle.notes ? `${note}: ${bundle.notes}` : note;

  // Publish converted bundle directly (already app shape)
  const current = readCurrent();
  const number = (Number(current.number) || 0) + 1;
  let files;
  let contentHash;
  try {
    ({ files, contentHash } = materializeFiles(bundle));
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
  const gachaCheck = validateBundle(bundle);
  if (!gachaCheck.ok) return { ok: false, errors: gachaCheck.errors };

  const publishedAt = new Date().toISOString();
  const manifest = {
    number,
    publishedAt,
    notes: bundle.notes,
    contentHash,
    files,
  };
  const signature = signManifest(manifest);
  const signed = { manifest, signature, alg: "ed25519" };
  const dir = releaseDir(number);
  fs.mkdirSync(dir, { recursive: true });
  writeFileAtomic(path.join(dir, "manifest.json"), JSON.stringify(signed, null, 2));
  writeFileAtomic(path.join(dir, "content.json"), JSON.stringify(bundle, null, 2));
  writeFileAtomic(CURRENT_PATH, JSON.stringify({ number, publishedAt }, null, 2));

  return {
    ok: true,
    number,
    rolledBackFrom: n,
    manifestPath: `/releases/${number}/manifest.json`,
  };
}

export function currentInfo() {
  const cur = readCurrent();
  const number = Number(cur.number) || 0;
  return {
    number,
    publishedAt: cur.publishedAt ?? null,
    // When the current release goes live (CurrentReleaseInfo in cms/shared and app/src/content releaseTypes.ts).
    effectiveAt: cur.effectiveAt ?? null,
    manifestPath: number > 0 ? `/releases/${number}/manifest.json` : null,
  };
}
