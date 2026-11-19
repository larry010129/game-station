/**
 * What a drawn item is called: its own name ("Dawn Bell", "Sweep", "Night Grid") and its kind ("Alert sound · Chime").
 * Plain data, no React: the Wiki data and the Node tests read it too. Icons live in itemFace.ts.
 */
import { BOOT_STYLES } from "../boot/bootStyleList.ts";
import { alertSoundInfo } from "../lib/previewSound.ts";
import { itemById, type ItemKind } from "./gachaContent.ts";

/** What each kind is called, in a sentence: "Alert sound", not "Alert Sound". */
export const KIND_NAME: Record<ItemKind, string> = {
  "streak-freeze": "Streak freeze",
  "alert-sound": "Alert sound",
  font: "Font",
  "name-flair": "Name flair",
  wallpaper: "Wallpaper",
  boot: "Boot screen",
  "layout-slot": "Layout slot",
  "custom-upload": "Custom upload",
};

// Kinds whose items carry no name in the content get one here, by number (wallpaper-01 is the first).
const NAMED: Partial<Record<ItemKind, readonly string[]>> = {
  wallpaper: [
    "Night Grid", "Low Orbit", "Dust Road", "Signal Fire", "Tidewater", "Blue Hour", "Static Bloom", "Ridge Line",
    "Coldfront", "Ember Field", "Paper Moon", "Long Exposure", "Harbor Lights", "Salt Flat", "Afterglow", "Deep Field",
    "Copper Rain", "Quiet Floor", "North Window", "Glasshouse", "Cinder", "Drift Ice", "Lantern Row", "First Light", "Overpass",
  ],
  font: ["Station Mono", "Signal Sans"],
  "name-flair": ["Spark Trail", "Halo Mark"],
  "layout-slot": ["Side Desk", "Back Room", "Annex"],
};

/** The item's own name. A kind with a single item (Streak freeze, Custom upload) is called by its kind. */
export function itemTitle(id: string): string {
  const def = itemById(id);
  if (!def) return id;
  if (def.kind === "alert-sound") return alertSoundInfo(id)?.name ?? KIND_NAME[def.kind];
  if (def.kind === "boot") return BOOT_STYLES.find((b) => b.id === id)?.name ?? KIND_NAME[def.kind];
  const n = Number(id.match(/-(\d+)$/)?.[1]);
  return NAMED[def.kind]?.[n - 1] ?? KIND_NAME[def.kind];
}

/** The line under the name: the kind, plus a sound's family ("Alert sound · Chime"). */
export function itemKindLine(id: string): string {
  const def = itemById(id);
  if (!def) return "Item";
  const family = def.kind === "alert-sound" ? alertSoundInfo(id)?.family : undefined;
  return family ? `Alert sound · ${family}` : KIND_NAME[def.kind];
}

/** The name with its kind, for a sentence or a reward line: "Night Grid wallpaper", "Streak freeze". */
export function itemFullName(id: string): string {
  const def = itemById(id);
  const title = itemTitle(id);
  return def && title !== KIND_NAME[def.kind] ? `${title} ${KIND_NAME[def.kind].toLowerCase()}` : title;
}
