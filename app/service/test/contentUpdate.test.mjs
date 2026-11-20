// Content delivery client (Phase 3) against fixtures + CMS SignedManifest contract.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { applySignedRelease } from "../../src/content/applyRelease.ts";
import {
  BUNDLED_RELEASE_NUMBER,
  writeAppliedRelease,
  clearAppliedRelease,
  currentReleaseNumber,
  getWhatsNewEntries,
  hydrateContentFromStore,
  readAppliedRelease,
} from "../../src/content/contentStore.ts";
import { canonicalJson } from "../../src/content/releaseTypes.ts";
import { runContentUpdate } from "../../src/content/updateContent.ts";
import { sha256Hex, verifySignedManifest } from "../../src/content/verifyRelease.ts";
import { getContent, resetContent, validateContent } from "../../src/state/gachaEngine.ts";
import { clearReleaseThemes, getCatalog, CATALOG } from "../../src/state/themeCatalog.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/fixtures");
const signed = JSON.parse(readFileSync(join(root, "release-v2.manifest.json"), "utf8"));
const contentText = readFileSync(join(root, "release-v2.content.json"), "utf8");

function mockStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

test.beforeEach(() => {
  mockStorage();
  resetContent();
  clearAppliedRelease();
  clearReleaseThemes();
});

test("fixture SignedManifest verifies and content.json hash matches", async () => {
  assert.ok(await verifySignedManifest(signed));
  assert.ok(canonicalJson(signed.manifest).includes('"number":2'));
  assert.equal(await sha256Hex(contentText), signed.manifest.contentHash);
});

test("applySignedRelease sets content and persists What's new", async () => {
  const result = await applySignedRelease(signed, new Map([["content.json", contentText]]));
  assert.equal(result.ok, true);
  assert.equal(getContent().packs.regular.priceOne, 110);
  assert.equal(currentReleaseNumber(), 2);
  assert.equal(readAppliedRelease()?.number, 2);
  // Fixture themes:[] → keep bundled catalog (no empty overlay).
  assert.equal(getCatalog(), CATALOG);
  assert.deepEqual(readAppliedRelease()?.themes ?? [], []);
  const whats = getWhatsNewEntries();
  assert.ok(whats.some((e) => /Version 1\.2/.test(e.title)));
  assert.ok(whats.some((e) => /110/.test(e.body)));
});

test("bad signature is rejected and bundled content is kept", async () => {
  const bad = {
    ...signed,
    signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  };
  const result = await applySignedRelease(bad, new Map([["content.json", contentText]]));
  assert.equal(result.ok, false);
  assert.equal(getContent().packs.regular.priceOne, 100);
  assert.equal(currentReleaseNumber(), BUNDLED_RELEASE_NUMBER);
});

test("invalid odds in release are rejected", async () => {
  const bundle = JSON.parse(contentText);
  bundle.gacha.packs.regular.weights.common = 0.5;
  const text = JSON.stringify(bundle);
  assert.equal(validateContent(bundle.gacha), false);
  const forged = {
    ...signed,
    manifest: {
      ...signed.manifest,
      contentHash: await sha256Hex(text),
      files: [{ path: "content.json", hash: await sha256Hex(text), size: text.length }],
    },
  };
  const result = await applySignedRelease(forged, new Map([["content.json", text]]));
  assert.equal(result.ok, false);
  assert.equal(getContent().packs.regular.priceOne, 100);
});

test("hydrateContentFromStore restores a persisted release", async () => {
  assert.equal((await applySignedRelease(signed, new Map([["content.json", contentText]]))).ok, true);
  resetContent();
  assert.equal(getContent().packs.regular.priceOne, 100);
  const h = hydrateContentFromStore();
  assert.equal(h.fromStore, true);
  assert.equal(h.number, 2);
  assert.equal(getContent().packs.regular.priceOne, 110);
});

test("hash mismatch rejects without applying", async () => {
  const result = await applySignedRelease(signed, new Map([["content.json", contentText + " "]]));
  assert.equal(result.ok, false);
  assert.equal(getContent().packs.regular.priceOne, 100);
});

/** A stand-in release host that serves the fixture release as number 2. */
async function fixtureHost(number = 2) {
  const server = http.createServer((req, res) => {
    const send = (type, body) => {
      res.writeHead(200, { "content-type": type });
      res.end(body);
    };
    if (req.url === "/releases/current") return send("application/json", JSON.stringify({ number }));
    if (req.url === "/releases/2/manifest.json") return send("application/json", JSON.stringify(signed));
    if (req.url === `/releases/blobs/${signed.manifest.contentHash}`) return send("application/octet-stream", contentText);
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}/releases`, close: () => new Promise((r) => server.close(r)) };
}

test("update falls back to the next release host when the first is down", async () => {
  const host = await fixtureHost();
  try {
    const status = await runContentUpdate(undefined, ["http://127.0.0.1:1/releases", host.url]);
    assert.deepEqual(status, { state: "updated", number: 2 });
    assert.equal(getContent().packs.regular.priceOne, 110);
  } finally {
    await host.close();
  }
});

test("update reports failed when every release host is down", async () => {
  const status = await runContentUpdate(undefined, ["http://127.0.0.1:1/releases", "http://127.0.0.1:2/releases"]);
  assert.equal(status.state, "failed");
  assert.equal(getContent().packs.regular.priceOne, 100);
});

test("update uses the first host that answers, not a later one", async () => {
  const host = await fixtureHost();
  try {
    const status = await runContentUpdate(undefined, host.url);
    assert.equal(status.state, "updated");
  } finally {
    await host.close();
  }
});

test("a release saved from another host does not block this host's lower number", async () => {
  // An old local CMS got the app to release 12 (saved without a source).
  assert.equal((await applySignedRelease(signed, new Map([["content.json", contentText]]))).ok, true);
  writeAppliedRelease({ ...readAppliedRelease(), number: 12 });
  assert.equal(currentReleaseNumber(), 12);
  const host = await fixtureHost(2);
  try {
    assert.deepEqual(await runContentUpdate(undefined, host.url), { state: "updated", number: 2 });
    assert.equal(currentReleaseNumber(), 2);
    assert.equal(readAppliedRelease()?.source, `custom:${host.url}`);
  } finally {
    await host.close();
  }
});

test("same host, same number: nothing to download", async () => {
  const host = await fixtureHost(2);
  try {
    assert.equal((await runContentUpdate(undefined, host.url)).state, "updated");
    assert.deepEqual(await runContentUpdate(undefined, host.url), { state: "current", number: 2 });
  } finally {
    await host.close();
  }
});

test("a foreign release is dropped when the new host has no release yet", async () => {
  assert.equal((await applySignedRelease(signed, new Map([["content.json", contentText]]))).ok, true);
  assert.equal(getContent().packs.regular.priceOne, 110);
  const host = await fixtureHost(0);
  try {
    assert.deepEqual(await runContentUpdate(undefined, host.url), { state: "current", number: 0 });
    assert.equal(readAppliedRelease(), null);
    assert.equal(getContent().packs.regular.priceOne, 100);
  } finally {
    await host.close();
  }
});

import { gateAfter, noticeDue, scheduledDue, UPDATE_NOTICE_LEAD_MS } from "../../src/content/updateContent.ts";

const none = { scheduled: null, reload: null };

test("gate: a scheduled release is remembered, and a start-up update needs no reload", () => {
  const at = new Date("2026-11-20T12:00:00Z").toISOString();
  const sched = gateAfter(none, { state: "scheduled", number: 1, next: 2, at }, false);
  assert.deepEqual(sched.scheduled, { number: 2, at: Date.parse(at) });
  assert.equal(gateAfter(none, { state: "updated", number: 2 }, false).reload, null);
});

test("gate: an update applied while the app is open asks for a reload and clears the schedule", () => {
  const prev = { scheduled: { number: 2, at: 1 }, reload: null };
  assert.deepEqual(gateAfter(prev, { state: "updated", number: 2 }, true), { scheduled: null, reload: { number: 2 } });
  assert.deepEqual(gateAfter(prev, { state: "current", number: 2 }, true), { scheduled: null, reload: null });
  assert.equal(gateAfter(prev, { state: "failed", detail: "x" }, true), prev);
});

test("gate: heads-up from 30 minutes before go-live, popup at go-live", () => {
  const at = 1_000_000_000_000;
  const g = { scheduled: { number: 2, at }, reload: null };
  assert.equal(noticeDue(g, at - UPDATE_NOTICE_LEAD_MS - 1), false);
  assert.equal(noticeDue(g, at - UPDATE_NOTICE_LEAD_MS), true);
  assert.equal(noticeDue(g, at - 1), true);
  assert.equal(noticeDue(g, at), false);
  assert.equal(scheduledDue(g, at - 1), false);
  assert.equal(scheduledDue(g, at), true);
  assert.equal(noticeDue(none, at), false);
});
