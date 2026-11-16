import { setRestoring } from "../lib/storage";
import { BG_ID } from "./useTheme";
import { deletePicture } from "./imageStore";

/** Kept across a reset: it only says this session already ran the boot screen. */
const KEEP = new Set(["cs.booted"]);

/**
 * Puts this PC back to a fresh install: Credits, quests, draws, unlocked looks, the creator unlock, themes, layouts
 * and every other saved setting go, and the wallpaper picture too. The Patreon sign-in lives in the station service,
 * so it is not touched; its tier is simply read again after the reload.
 *
 * Ordinary writes are paused first so no live effect can put its in-memory value back before the page reloads.
 */
export async function factoryReset(): Promise<void> {
  setRestoring(true);
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("cs.") && !KEEP.has(k)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // Storage not readable: nothing more can be cleared here.
  }
  await deletePicture(BG_ID).catch(() => {});
  window.location.reload();
}
