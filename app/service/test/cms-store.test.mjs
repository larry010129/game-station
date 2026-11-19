// Round 5, A5/A6/A9: CMS release files survive a crash mid-write, a damaged blob is repaired, and
// /releases/current says when the release goes live. Runs against a temp data folder, never cms/data.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cms-store-test-"));
process.env.COMMAND_CMS_DATA = tmp;
const paths = await import("../../../cms/server/paths.mjs");
assert.ok(paths.DATA_DIR.startsWith(tmp), `refusing to run: data dir ${paths.DATA_DIR} is not the temp folder`);
const store = await import("../../../cms/server/store.mjs");

// A known-good app-shape bundle as the draft (the live cms/data draft may be mid-edit and not publishable).
const repoDraft = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src/content/fixtures/release-v2.content.json");
const draft = JSON.parse(fs.readFileSync(repoDraft, "utf8"));

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

/**
 * Makes fs.writeFileSync crash (write the first few bytes, then throw, like a kill mid-write) for files whose path
 * starts with `target` (a temp file next to it counts, since that is how an atomic write reaches it).
 */
function crashWrites(target) {
  const real = fs.writeFileSync;
  fs.writeFileSync = (file, data, ...rest) => {
    if (!String(file).startsWith(target)) return real(file, data, ...rest);
    real(file, String(data).slice(0, 10), ...rest);
    throw new Error("simulated crash");
  };
  return () => {
    fs.writeFileSync = real;
  };
}

test("A5: a crash while saving the draft leaves the previous draft readable", () => {
  store.ensureDataLayout();
  store.writeDraft(draft);
  const restore = crashWrites(paths.DRAFT_PATH);
  try {
    assert.throws(() => store.writeDraft({ ...draft, releaseNotes: "half written" }));
  } finally {
    restore();
  }
  assert.doesNotThrow(() => store.readDraft(), "draft.json must not be left truncated");
  assert.equal(fs.readdirSync(path.dirname(paths.DRAFT_PATH)).filter((f) => f.includes(".tmp-")).length, 0, "no temp file is left");
});

test("A5: a crash while publishing leaves current.json pointing at the previous release", () => {
  store.writeDraft(draft);
  const first = store.publish();
  assert.equal(first.ok, true, JSON.stringify(first.errors));
  const restore = crashWrites(paths.CURRENT_PATH);
  try {
    assert.throws(() => store.publish());
  } finally {
    restore();
  }
  assert.doesNotThrow(() => store.readCurrent(), "current.json must not be left truncated");
  assert.equal(store.readCurrent().number, first.number);
});

test("A6: a damaged blob is rewritten by the next publish that uses it", () => {
  // The same draft object both times, so both publishes produce the same content blob.
  const r = store.publish({ draft });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const signed = JSON.parse(fs.readFileSync(path.join(paths.BY_NUMBER_DIR, String(r.number), "manifest.json"), "utf8"));
  const hash = signed.manifest.contentHash;
  const blob = path.join(paths.BLOBS_DIR, hash);
  fs.writeFileSync(blob, "trunc");
  const again = store.publish({ draft });
  assert.equal(again.ok, true, JSON.stringify(again.errors));
  const fixed = JSON.parse(fs.readFileSync(path.join(paths.BY_NUMBER_DIR, String(again.number), "manifest.json"), "utf8"));
  assert.equal(fixed.manifest.contentHash, hash, "test assumption: the content blob is reused");
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(blob)).digest("hex"), hash, "the blob matches its hash again");
});

test("A8: a request whose URL cannot be parsed gets a 400 instead of crashing the CMS server", async () => {
  const { createReleaseMiddleware } = await import("../../../cms/server/http.mjs");
  const mw = createReleaseMiddleware();
  const res = { statusCode: 0, headers: {}, body: "", setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = String(b ?? ""); } };
  let nexted = false;
  assert.doesNotThrow(() => mw({ url: "//", method: "GET", headers: {} }, res, () => (nexted = true)));
  assert.equal(res.statusCode, 400);
  assert.equal(nexted, false);
});

test("A9: /releases/current includes effectiveAt", () => {
  store.writeDraft(draft);
  const at = new Date(Date.now() + 3_600_000).toISOString();
  const r = store.publish({ effectiveAt: at });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(store.currentInfo().effectiveAt, at);
});
