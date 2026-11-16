/**
 * Content delivery settings (Phase 3 — lightweight local CMS).
 *
 * Dev only: Vite `import.meta.env.DEV`. Never enabled in production builds or
 * Tauri release packages. Production release host and signing key are TBD.
 */

/** Local CMS release host (see GACHA REDESIGN.md → Testing the CMS locally). */
export const DEV_RELEASES_BASE = "http://localhost:1430/releases";

/** True only in a Vite development run — never in `vite build` / Tauri release. */
export function contentUpdatesEnabled(): boolean {
  try {
    return import.meta.env.DEV === true;
  } catch {
    return false;
  }
}

/** Base URL for release fetches, or null when updates are off. */
export function releasesBaseUrl(): string | null {
  return contentUpdatesEnabled() ? DEV_RELEASES_BASE : null;
}
