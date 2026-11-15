import { cleanTweaks, type Tweaks } from "../state/tweaks";
import { cleanSnap, type LayoutSnap } from "./useDashboard";

/** What a shared layout file says it is, so some other JSON is never mistaken for one. */
export const SHARE_KIND = "command-station-layout";
const VERSION = 1;
/** A layout is a few KB; anything much larger is not one. */
export const MAX_SHARE_BYTES = 400 * 1024;
const MAX_MODULE_CHARS = 100 * 1024;

export interface SharedTheme {
  /** A catalogue theme's id, or a custom theme's id on the machine it came from. */
  id: string;
  tweaks: Tweaks;
  /** For a theme made on the sender's PC: its theme-module JSON, so it can be added here. */
  module?: string;
}

export interface Shared {
  name: string;
  layout: LayoutSnap;
  theme?: SharedTheme;
}

export function buildShare(name: string, layout: LayoutSnap, theme?: SharedTheme): string {
  return JSON.stringify({ kind: SHARE_KIND, v: VERSION, name, layout, ...(theme ? { theme } : {}) }, null, 2);
}

/** Reads a shared layout, or throws an Error whose message says what is wrong in plain words. */
export function parseShare(text: string): Shared {
  if (text.length > MAX_SHARE_BYTES) throw new Error("That is too big to be a layout (over 400 KB).");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That is not a layout. Use a layout file or a code from Copy code.");
  }
  const o = raw as { kind?: unknown; v?: unknown; name?: unknown; layout?: unknown; theme?: { id?: unknown; tweaks?: unknown; module?: unknown } } | null;
  if (!o || typeof o !== "object" || o.kind !== SHARE_KIND) throw new Error("That file is not a Command Station layout.");
  if (o.v !== VERSION) throw new Error("That layout was made by a newer version of Command Station.");
  const layout = cleanSnap(o.layout);
  if (!layout) throw new Error("That layout has no usable cards in it.");
  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 30) : "Imported layout";
  let theme: SharedTheme | undefined;
  if (o.theme && typeof o.theme === "object" && typeof o.theme.id === "string" && o.theme.id.length > 0 && o.theme.id.length <= 80) {
    theme = {
      id: o.theme.id,
      tweaks: cleanTweaks(o.theme.tweaks),
      ...(typeof o.theme.module === "string" && o.theme.module.length <= MAX_MODULE_CHARS ? { module: o.theme.module } : {}),
    };
  }
  return { name, layout, theme };
}
