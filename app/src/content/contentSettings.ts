/**
 * Content delivery settings: where the app downloads signed releases from.
 *
 * Dev run (Vite): the local CMS. Real build / installed app: the Cloudflare release host.
 * Every release is checked against the matching public key before it is used (see verifyRelease.ts).
 */
import { DEV_CONTENT_PUBLIC_KEY_SPKI_B64, PROD_CONTENT_PUBLIC_KEY_SPKI_B64 } from "./devPublicKey.ts";

/** Local CMS release host (see GACHA REDESIGN.md -> Testing the CMS locally). */
export const DEV_RELEASES_BASE = "http://localhost:1430/releases";

/** Public release host on Cloudflare (command-station-releases Worker, read-only). */
export const PROD_RELEASES_BASE = "https://command-station-releases.yuzi010129.workers.dev/releases";

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

/** Base URL for release fetches. */
export function releasesBaseUrl(): string | null {
  return isDevLike() ? DEV_RELEASES_BASE : PROD_RELEASES_BASE;
}

/** Public keys (SPKI, base64) a release may be signed with. The dev key is trusted in dev runs only. */
export function trustedPublicKeys(): string[] {
  return isDevLike()
    ? [PROD_CONTENT_PUBLIC_KEY_SPKI_B64, DEV_CONTENT_PUBLIC_KEY_SPKI_B64]
    : [PROD_CONTENT_PUBLIC_KEY_SPKI_B64];
}
