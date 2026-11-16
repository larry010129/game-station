/**
 * Item store: owned one-time set + stackable counts, persisted locally.
 *
 * Apply path (GachaModal / other agents — do not call from draw logic here):
 * - `{ kind: "item"; id: string; repeat: boolean }` → `grantItem(id)` when `!repeat`
 *   (engine already sets `repeat` for owned one-time; stackables always `repeat: false`)
 * - `{ kind: "pick" }` → `grantPick()` from `useQuests` / `questEngine` (+1 looksWaiting, capped)
 *
 * `DrawResult.item.id` is a bundled catalog id from `gachaContent` (e.g. `streak-freeze`,
 * `wallpaper-01`, `boot-01`, `alert-sound-01`, `layout-slot-01`, `font-01`, `name-flair-01`,
 * `custom-upload`). Unknown ids are ignored.
 */
import { readJson, writeJson } from "../lib/storage";
import { getContent, itemById } from "./gachaContent.ts";

export const ITEMS_KEY = "cs.items";

export interface ItemsState {
  v: 1;
  /** One-time item ids owned forever. */
  owned: string[];
  /** Stackable counts (e.g. streak-freeze). */
  stacks: Record<string, number>;
}

export const emptyItems = (): ItemsState => ({
  v: 1,
  owned: [],
  stacks: {},
});

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function knownIds(): Set<string> {
  return new Set(getContent().items.map((i) => i.id));
}

/** Turns anything read from storage into a valid state. */
export function cleanItems(raw: unknown): ItemsState {
  const out = emptyItems();
  if (!isRecord(raw)) return out;
  const known = knownIds();
  if (Array.isArray(raw.owned)) {
    const seen = new Set<string>();
    for (const id of raw.owned) {
      if (typeof id !== "string" || !known.has(id) || itemById(id)?.stackable || seen.has(id)) continue;
      seen.add(id);
      out.owned.push(id);
    }
  }
  if (isRecord(raw.stacks)) {
    for (const [k, v] of Object.entries(raw.stacks)) {
      if (!itemById(k)?.stackable || !isNum(v)) continue;
      const n = Math.floor(v);
      if (n > 0) out.stacks[k] = n;
    }
  }
  return out;
}

/** Pure grant into a state object (no storage). Unknown ids / already-owned one-time → unchanged. */
export function grantInto(s: ItemsState, id: string): ItemsState {
  const def = itemById(id);
  if (!def) return s;

  if (def.stackable) {
    return { ...s, stacks: { ...s.stacks, [id]: (s.stacks[id] ?? 0) + 1 } };
  }

  if (s.owned.includes(id)) return s;
  return { ...s, owned: [...s.owned, id] };
}

export const readItems = (): ItemsState => cleanItems(readJson<unknown>(ITEMS_KEY, null));

function writeItems(s: ItemsState): void {
  writeJson(ITEMS_KEY, s);
}

/**
 * Persists a grant. Stackables always add; one-time already owned is a no-op
 * (caller awards crystals from `DrawResult.item.repeat`).
 */
export function grantItem(id: string): void {
  const prev = readItems();
  const next = grantInto(prev, id);
  if (next !== prev) writeItems(next);
}

/** Owned one-time ids (for drawMany `owned.items` / packExhausted). */
export function ownedItemIds(): string[] {
  return readItems().owned.slice();
}
