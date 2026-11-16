/**
 * Start-up content update (Phase 3). Dev-only host: localhost:1430/releases.
 * Contract matches `cms/shared/releaseTypes.ts` and the CMS release host.
 * Production host and signing key are TBD — see contentSettings.ts / docs/content-updates.md.
 *
 * Offline or any failure: keep current content, never throw to the boot UI.
 */

import { releasesBaseUrl } from "./contentSettings.ts";
import { applySignedRelease } from "./applyRelease.ts";
import {
  BUNDLED_RELEASE_NUMBER,
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
export async function runContentUpdate(signal?: AbortSignal, host: string | null = releasesBaseUrl()): Promise<ContentUpdateStatus> {
  try {
    hydrateContentFromStore();
    // `host` defaults to the dev release host (null outside a dev build); tests pass a stand-in.
    const base = host;
    if (!base) {
      lastStatus = { state: "skipped", detail: "content updates disabled (not a dev build)" };
      return lastStatus;
    }

    const have = currentReleaseNumber();
    let remote: number;
    try {
      remote = await fetchCurrentNumber(base, signal);
    } catch (e) {
      lastStatus = {
        state: "failed",
        detail: e instanceof Error ? e.message : "could not reach release host",
      };
      return lastStatus;
    }

    if (!(remote > have)) {
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

    const applied = readAppliedRelease();
    // Skip unchanged asset blobs; always re-fetch content.json so apply has a body to validate.
    const knownHashes = new Map(
      (applied?.files ?? []).filter((f) => f.path !== "content.json").map((f) => [f.path, f.hash.toLowerCase()]),
    );
    const changed = await fetchChangedFiles(base, target, signed.manifest.files, knownHashes, signal);
    if (!changed.has("content.json")) {
      lastStatus = { state: "rejected", number: target, reason: "content.json missing from download" };
      return lastStatus;
    }

    const result = await applySignedRelease(signed, changed, knownHashes);
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
