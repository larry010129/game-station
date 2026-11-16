// Scheduled pushes: a release goes live at its signed `effectiveAt`. The CMS refuses a push without a time, the
// time is typed as mm/dd/yy hh:mm, and the app keeps its content until the time comes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { formatMdyHm, maskMdyHm, parseMdyHm, untilText } from "../../../cms/src/lib/schedule.ts";
import { scheduleErrors, SCHEDULE_GRACE_MS } from "../../../cms/server/store.mjs";
import { goLiveTime, runContentUpdate } from "../../src/content/updateContent.ts";
import { clearAppliedRelease, currentReleaseNumber } from "../../src/content/contentStore.ts";
import { resetContent } from "../../src/state/gachaEngine.ts";
import { clearReleaseThemes } from "../../src/state/themeCatalog.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/fixtures");
const signedV2 = JSON.parse(readFileSync(join(fixtures, "release-v2.manifest.json"), "utf8"));
const contentV2 = readFileSync(join(fixtures, "release-v2.content.json"), "utf8");
const HOST = "http://cms.test/releases";

function mockStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

/** A stand-in release host: `current` is the newest number; `manifests` maps number → signed manifest. */
function mockHost(current, manifests) {
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(String(url));
    const path = String(url).slice(HOST.length + 1);
    const ok = (text) => ({ ok: true, status: 200, text: async () => text });
    if (path === "current") return ok(JSON.stringify({ number: current }));
    const m = path.match(/^(\d+)\/manifest\.json$/);
    if (m && manifests[m[1]]) return ok(JSON.stringify(manifests[m[1]]));
    if (/content\.json$/.test(path) || path.startsWith("blobs/")) return ok(contentV2);
    return { ok: false, status: 404, text: async () => "" };
  };
  return seen;
}

/** The fixture release renumbered and given a go-live time (its signature no longer matters: it is never applied). */
const scheduled = (number, at) => ({ ...signedV2, manifest: { ...signedV2.manifest, number, effectiveAt: new Date(at).toISOString() } });

test.beforeEach(() => {
  mockStorage();
  resetContent();
  clearAppliedRelease();
  clearReleaseThemes();
});

test("mm/dd/yy hh:mm is read as local 24-hour time, and impossible dates are refused", () => {
  const d = parseMdyHm("11/17/26 09:05");
  assert.deepEqual([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()], [2026, 11, 17, 9, 5]);
  assert.equal(formatMdyHm(d), "11/17/26 09:05");
  for (const bad of ["02/30/26 10:00", "13/01/26 10:00", "11/17/26 24:00", "11/17/26 9:05", "11-17-26 09:05", ""]) {
    assert.equal(parseMdyHm(bad), null, bad);
  }
  assert.equal(maskMdyHm("1117260905"), "11/17/26 09:05");
  assert.equal(maskMdyHm("11172"), "11/17/2");
  assert.equal(untilText(new Date(2026, 10, 17, 12, 30), new Date(2026, 10, 17, 9, 0)), "in 3 h 30 min");
});

test("a push needs a go-live time that has not passed", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  assert.match(scheduleErrors(undefined, now)[0], /Choose when/);
  assert.match(scheduleErrors("not a date", now)[0], /not a valid/);
  assert.match(scheduleErrors("2026-11-16T11:00:00Z", now)[0], /in the past/);
  assert.deepEqual(scheduleErrors(new Date(now - SCHEDULE_GRACE_MS + 1000).toISOString(), now), []);
  assert.deepEqual(scheduleErrors("2026-11-20T09:00:00Z", now), []);
});

test("a release without a go-live time is live at once", () => {
  assert.equal(goLiveTime({}), 0);
  assert.equal(goLiveTime({ effectiveAt: "2026-11-17T09:00:00Z" }), Date.parse("2026-11-17T09:00:00Z"));
});

test("a release scheduled for later is not applied yet; the app keeps its content", async () => {
  mockHost(3, { 3: scheduled(3, Date.now() + 3_600_000) });
  const status = await runContentUpdate(undefined, HOST);
  assert.equal(status.state, "scheduled");
  assert.equal(status.next, 3);
  assert.equal(currentReleaseNumber(), 0);
});

test("when the newest release is scheduled, the newest one already live is applied", async () => {
  const seen = mockHost(3, { 3: scheduled(3, Date.now() + 3_600_000), 2: signedV2 });
  const status = await runContentUpdate(undefined, HOST);
  assert.deepEqual(status, { state: "updated", number: 2 });
  assert.equal(currentReleaseNumber(), 2);
  assert.ok(seen.some((u) => u.endsWith("/3/manifest.json")) && seen.some((u) => u.endsWith("/2/manifest.json")));
});

test("once its time has passed, a scheduled release is applied like any other", async () => {
  const past = { ...signedV2, manifest: { ...signedV2.manifest } };
  mockHost(2, { 2: past });
  const status = await runContentUpdate(undefined, HOST);
  assert.deepEqual(status, { state: "updated", number: 2 });
});
