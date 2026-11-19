import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { isCardSkinId } from "./cardSkins";
import { isCreatorUnlocked } from "./creatorAccess";

/** Card skins won from the Card Pack and the one the dashboard wears, saved on this PC (a `cs.` key: factory reset clears it). */
export const CARD_SKINS_KEY = "cs.cardSkins";
const EVENT = "cs-card-skins";

export interface CardSkinState {
  v: 1;
  owned: string[];
  /** The skin every dashboard card wears; null for the theme's own cards. */
  equipped: string | null;
}

const empty = (): CardSkinState => ({ v: 1, owned: [], equipped: null });

/**
 * Turns anything read from storage into a valid state. Unknown ids are dropped; an equipped skin must be owned,
 * unless the creator unlock is on (it opens every skin without adding them to `owned`).
 */
export function cleanCardSkins(raw: unknown, creator = false): CardSkinState {
  const out = empty();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.owned)) out.owned = [...new Set(r.owned.filter(isCardSkinId))];
  if (isCardSkinId(r.equipped) && (creator || out.owned.includes(r.equipped))) out.equipped = r.equipped;
  return out;
}

export const readCardSkins = (): CardSkinState => cleanCardSkins(readJson<unknown>(CARD_SKINS_KEY, null), isCreatorUnlocked());

function save(next: CardSkinState): boolean {
  if (!writeJson(CARD_SKINS_KEY, next)) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

/** Adds a won skin. A skin already owned is left alone. */
export function grantSkin(id: string): boolean {
  if (!isCardSkinId(id)) return false;
  const cur = readCardSkins();
  if (cur.owned.includes(id)) return true;
  return save({ ...cur, owned: [...cur.owned, id] });
}

/** Puts an owned skin (any skin under the creator unlock) on every dashboard card, or takes the skin off with null. */
export function equipSkin(id: string | null): boolean {
  const cur = readCardSkins();
  if (id !== null && !(isCreatorUnlocked() ? isCardSkinId(id) : cur.owned.includes(id))) return false;
  return save({ ...cur, equipped: id });
}

/** The saved skins, refreshed on every change (this window and others). */
export function useCardSkins(): CardSkinState {
  const [state, setState] = useState(readCardSkins);
  useEffect(() => {
    const sync = () => setState(readCardSkins());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}

/** Puts the equipped skin on the page root (`data-card-skin`), where styles/cardskins.css picks it up. */
export function useApplyCardSkin(): void {
  const { equipped } = useCardSkins();
  useEffect(() => {
    const root = document.documentElement;
    if (equipped) root.dataset.cardSkin = equipped;
    else delete root.dataset.cardSkin;
  }, [equipped]);
}
