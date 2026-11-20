/**
 * Content delivery settings: where the app downloads signed releases from.
 *
 * Every run (dev and real builds) reads the Cloudflare release host, which the web CMS publishes to.
 * Set VITE_RELEASES_BASE to point a dev run at another host (for example a local CMS on localhost:1430).
 * Every release is checked against the matching public key before it is used (see verifyRelease.ts).
 */
import { DEV_CONTENT_PUBLIC_KEY_SPKI_B64, PROD_CONTENT_PUBLIC_KEY_SPKI_B64 } from "./devPublicKey.ts";

/** Local CMS release host (see GACHA REDESIGN.md -> Testing the CMS locally). */
export const DEV_RELEASES_BASE = "http://localhost:1430/releases";

/** Public release host on Cloudflare (command-station-releases Worker, read-only). */
export const PROD_RELEASES_BASE = "https://command-station-releases.yuzi010129.workers.dev/releases";

/**
 * Release hosts to try, newest first. When a custom domain is added, put it FIRST and keep the old address as a
 * backup: an installed app only knows the addresses it was built with, so a retired address strands it.
 */
export const RELEASE_HOSTS: readonly string[] = [PROD_RELEASES_BASE];

/** True in a Vite dev run, or when Node runs the code (tests, scripts). False in a built app. */
export function isDevLike(): boolean {
  try {
    if (import.meta.env?.DEV === true) return true;
  } catch {
    /* no import.meta.env: not Vite */
  }
  const proc = (globalThis as { process?: { versions?: { node?: string } } }).process;
  return typeof proc?.versions?.node === "string";
}

/** Content updates are on in every build. A failed check keeps the current content. */
export function contentUpdatesEnabled(): boolean {
  return true;
}

/** Release hosts to try, in order. A dev run can force one host with VITE_RELEASES_BASE. */
export function releaseHosts(): string[] {
  try {
    const override = import.meta.env?.VITE_RELEASES_BASE;
    if (isDevLike() && typeof override === "string" && override) return [override];
  } catch {
    /* not Vite */
  }
  return [...RELEASE_HOSTS];
}

/**
 * Which line of releases a host belongs to. Every address in RELEASE_HOSTS serves the same releases ("cloudflare");
 * any other host (a local CMS, a test host) is its own line. Release numbers only compare within one line.
 */
export function releaseSourceOf(base: string): string {
  return RELEASE_HOSTS.includes(base) ? "cloudflare" : `custom:${base}`;
}

/** First release host (kept for callers that want one address). */
export function releasesBaseUrl(): string | null {
  return releaseHosts()[0] ?? null;
}

/** Public keys (SPKI, base64) a release may be signed with. The dev key is trusted in dev runs only. */
export function trustedPublicKeys(): string[] {
  return isDevLike()
    ? [PROD_CONTENT_PUBLIC_KEY_SPKI_B64, DEV_CONTENT_PUBLIC_KEY_SPKI_B64]
    : [PROD_CONTENT_PUBLIC_KEY_SPKI_B64];
}
