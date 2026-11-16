// Content delivery client (Phase 3) against fixtures + CMS SignedManifest contract.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { applySignedRelease } from "../../src/content/applyRelease.ts";
import {
  BUNDLED_RELEASE_NUMBER,
  clearAppliedRelease,
  currentReleaseNumber,
  getWhatsNewEntries,
  hydrateContentFromStore,
  readAppliedRelease,
} from "../../src/content/contentStore.ts";
import { canonicalJson } from "../../src/content/releaseTypes.ts";
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
  assert.ok(whats.some((e) => /Release 2/.test(e.title)));
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
