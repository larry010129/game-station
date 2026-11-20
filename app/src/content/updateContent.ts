/**
 * Start-up content update (Phase 3). Dev-only host: localhost:1430/releases.
 * Contract matches `cms/shared/releaseTypes.ts` and the CMS release host.
 * Production host and signing key are TBD — see contentSettings.ts / docs/content-updates.md.
 *
 * Offline or any failure: keep current content, never throw to the boot UI.
 */

import { releaseHosts, releaseSourceOf } from "./contentSettings.ts";
import { applySignedRelease } from "./applyRelease.ts";
import { checkExeUpdateAtStart, needsNewerExe } from "./exeUpdate.ts";
import {
  BUNDLED_RELEASE_NUMBER,
  clearAppliedRelease,
  currentReleaseNumber,
  hydrateContentFromStore,
  readAppliedRelease,
} from "./contentStore.ts";
import { fetchChangedFiles, fetchCurrentNumber, fetchSignedManifest } from "./fetchRelease.ts";

export type ContentUpdateStatus =
  | { state: "skipped"; detail: string }
  | { state: "current"; number: number }
  | { state: "updated"; number: number }
  /** The newest release is scheduled for later: content stays at `number` until `at` (ISO), then the app switches. */
  | { state: "scheduled"; number: number; next: number; at: string }
  | { state: "rejected"; number: number; reason: string }
  /** The release needs a newer exe than this one. Content stays as it is until the exe updates (update type 2). */
  | { state: "needs-exe"; number: number; min: string }
  | { state: "failed"; detail: string };

let lastStatus: ContentUpdateStatus = { state: "skipped", detail: "not run" };

/** How many releases back the app looks for one that is already live when the newest ones are scheduled. */
const MAX_LOOKBACK = 10;

/** When a release goes live (ms). A manifest without `effectiveAt` (older releases) is live at once. */
export function goLiveTime(manifest: { effectiveAt?: string }): number {
  const t = manifest.effectiveAt ? Date.parse(manifest.effectiveAt) : NaN;
  return Number.isFinite(t) ? t : 0;
}

let recheck: ReturnType<typeof setTimeout> | null = null;

/** Runs the update again a moment after `at`, so a scheduled release switches in while the app stays open. */
function scheduleRecheck(at: number): void {
  if (typeof window === "undefined") return;
  if (recheck) clearTimeout(recheck);
  const delay = Math.min(Math.max(1_000, at - Date.now() + 1_500), 2 ** 31 - 1);
  recheck = setTimeout(() => {
    recheck = null;
    void runContentUpdate();
  }, delay);
}

export function getLastContentUpdateStatus(): ContentUpdateStatus {
  return lastStatus;
}

/**
 * Hydrate from localStorage, then (when enabled) check the CMS for a newer release.
 * Always resolves; never throws.
 */
async function runContentUpdateInner(
  signal?: AbortSignal,
  host: string | readonly string[] | null = releaseHosts(),
): Promise<ContentUpdateStatus> {
  try {
    hydrateContentFromStore();
    // `host` defaults to the release hosts for this build (newest first); tests pass a stand-in.
    const hosts = host == null ? [] : typeof host === "string" ? [host] : [...host];
    if (hosts.length === 0) {
      lastStatus = { state: "skipped", detail: "content updates disabled (no release host configured)" };
      return lastStatus;
    }

    // Use the first host that answers; the rest are backups (for example an address kept alive after a domain change).
    let base = hosts[0];
    let remote = 0;
    let lastError: unknown = null;
    let reached = false;
    for (const h of hosts) {
      try {
        remote = await fetchCurrentNumber(h, signal);
        base = h;
        reached = true;
        break;
      } catch (e) {
        lastError = e;
        if (signal?.aborted) break;
      }
    }
    if (!reached) {
      lastStatus = {
        state: "failed",
        detail: lastError instanceof Error ? lastError.message : "could not reach release host",
      };
      return lastStatus;
    }

    // Release numbers only compare within one line of releases. A release saved from another host (an old local CMS,
    // or saved before the source was recorded) must not block this host's lower numbers: start again from the bundle.
    const source = releaseSourceOf(base);
    const stored = readAppliedRelease();
    const foreign = !!stored && stored.source !== source;
    const have = foreign ? BUNDLED_RELEASE_NUMBER : currentReleaseNumber();

    if (!(remote > have)) {
      if (foreign) {
        clearAppliedRelease();
        hydrateContentFromStore();
      }
      lastStatus = { state: "current", number: have };
      return lastStatus;
    }

    // The newest release may be scheduled for later. Walk back to the newest one already live (newer than ours),
    // and remember the soonest scheduled time so the app switches in when it comes.
    const now = Date.now();
    let soonest: { number: number; at: number } | null = null;
    let signed: Awaited<ReturnType<typeof fetchSignedManifest>> | null = null;
    for (let n = remote; n > have && remote - n < MAX_LOOKBACK; n--) {
      let m: Awaited<ReturnType<typeof fetchSignedManifest>>;
      try {
        m = await fetchSignedManifest(base, n, signal);
      } catch (e) {
        // The newest manifest must load; an older one that will not (removed, offline mid-walk) ends the walk.
        if (n === remote) throw e;
        break;
      }
      if (m.manifest.number !== n) {
        lastStatus = { state: "rejected", number: n, reason: "manifest number mismatch" };
        return lastStatus;
      }
      const at = goLiveTime(m.manifest);
      if (at > now) {
        if (!soonest || at < soonest.at) soonest = { number: n, at };
        continue;
      }
      signed = m;
      break;
    }
    if (soonest) scheduleRecheck(soonest.at);
    if (!signed) {
      lastStatus = soonest
        ? { state: "scheduled", number: have, next: soonest.number, at: new Date(soonest.at).toISOString() }
        : { state: "current", number: have };
      return lastStatus;
    }
    const target = signed.manifest.number;

    // A release can name the oldest exe it works with. An older exe updates itself first (forced), then comes back for content.
    const min = signed.manifest.minAppVersion;
    if (needsNewerExe(min)) {
      checkExeUpdateAtStart();
      lastStatus = { state: "needs-exe", number: have, min: min as string };
      return lastStatus;
    }

    const applied = foreign ? null : readAppliedRelease();
    // Skip unchanged asset blobs; always re-fetch content.json so apply has a body to validate.
    const knownHashes = new Map(
      (applied?.files ?? []).filter((f) => f.path !== "content.json").map((f) => [f.path, f.hash.toLowerCase()]),
    );
    const changed = await fetchChangedFiles(base, target, signed.manifest.files, knownHashes, signal);
    if (!changed.has("content.json")) {
      lastStatus = { state: "rejected", number: target, reason: "content.json missing from download" };
      return lastStatus;
    }

    const result = await applySignedRelease(signed, changed, knownHashes, source);
    if (!result.ok) {
      lastStatus = { state: "rejected", number: target, reason: result.reason };
      return lastStatus;
    }
    lastStatus = { state: "updated", number: result.applied.number };
    return lastStatus;
  } catch (e) {
    lastStatus = {
      state: "failed",
      detail: e instanceof Error ? e.message : "content update failed",
    };
    return lastStatus;
  }
}

/** Test helper: reset module status. */
export function resetContentUpdateStatus(): void {
  lastStatus = { state: "skipped", detail: "not run" };
}

export { BUNDLED_RELEASE_NUMBER, hydrateContentFromStore };

/**
 * What the screen needs to know about updates: the next scheduled go-live time (for the time chip) and whether a
 * release went live while the app was open (the player must reload). Plain data, so tests need no screen.
 */
export interface ContentGate {
  scheduled: { number: number; at: number } | null;
  reload: { number: number } | null;
}

/** The gate after an update check. `inSession` is false for the check that runs at start-up: that one needs no reload. */
export function gateAfter(prev: ContentGate, status: ContentUpdateStatus, inSession: boolean): ContentGate {
  switch (status.state) {
    case "scheduled":
      return { ...prev, scheduled: { number: status.next, at: Date.parse(status.at) } };
    case "updated":
      return { scheduled: null, reload: inSession ? { number: status.number } : prev.reload };
    case "current":
      return { ...prev, scheduled: null };
    default:
      return prev;
  }
}

/** The heads-up shows this long before a scheduled release goes live. */
export const UPDATE_NOTICE_LEAD_MS = 30 * 60_000;

/** True while a scheduled release is 30 minutes or less away (and not yet live): show the time chip. */
export function noticeDue(gate: ContentGate, now: number): boolean {
  return !!gate.scheduled && gate.scheduled.at > now && gate.scheduled.at - now <= UPDATE_NOTICE_LEAD_MS;
}

/** True once a scheduled release's go-live time has come. */
export function scheduledDue(gate: ContentGate, now: number): boolean {
  return !!gate.scheduled && gate.scheduled.at <= now;
}

let gate: ContentGate = { scheduled: null, reload: null };
let firstRunDone = false;
const gateListeners = new Set<() => void>();

export function getContentGate(): ContentGate {
  return gate;
}

export function subscribeContentGate(fn: () => void): () => void {
  gateListeners.add(fn);
  return () => {
    gateListeners.delete(fn);
  };
}

/** Test helper: back to a fresh app start. */
export function resetContentGate(): void {
  gate = { scheduled: null, reload: null };
  firstRunDone = false;
  gateListeners.forEach((f) => f());
}

export async function runContentUpdate(
  signal?: AbortSignal,
  host?: string | readonly string[] | null,
): Promise<ContentUpdateStatus> {
  const status = host === undefined ? await runContentUpdateInner(signal) : await runContentUpdateInner(signal, host);
  const next = gateAfter(gate, status, firstRunDone);
  firstRunDone = true;
  if (next !== gate) {
    gate = next;
    gateListeners.forEach((f) => f());
  }
  return status;
}
