import { isTauri } from "../providers";

/** Opens a story in the user's own browser: the system default in the desktop app, a new tab on the web. */
export async function openLink(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;
  if (isTauri) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    } catch {
      // fall through to the browser route
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
