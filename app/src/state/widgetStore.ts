import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { useCreatorUnlock } from "./creatorAccess";
import { usePatreonEntitlement } from "./patreon";
import { addCredits, CREDIT_NAME, readCredits, spendCredits } from "./stationCredits";
import { isWidgetId, isWidgetLocked, widgetPrice, widgetsToRecord } from "./widgets";

/** Dashboard cards owned (won from the Widget Pack, or placed while Free), saved on this PC (a `cs.` key). */
export const WIDGETS_KEY = "cs.widgets";
const EVENT = "cs-widgets";

export interface WidgetState {
  v: 1;
  owned: string[];
}

export function cleanWidgets(raw: unknown): WidgetState {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return { v: 1, owned: Array.isArray(r.owned) ? [...new Set(r.owned.filter(isWidgetId))] : [] };
}

export const readWidgets = (): WidgetState => cleanWidgets(readJson<unknown>(WIDGETS_KEY, null));

function save(ids: string[]): boolean {
  const cur = readWidgets();
  const add = ids.filter((id) => isWidgetId(id) && !cur.owned.includes(id));
  if (!add.length) return true;
  if (!writeJson(WIDGETS_KEY, { ...cur, owned: [...cur.owned, ...add] })) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

/** Adds a card won from the Widget Pack. */
export const grantWidget = (id: string): boolean => save([id]);

/**
 * Buys a card outright with Credits, at the CMS price for its stars. Credits are taken first; a card that cannot be
 * saved hands them straight back. Returns what happened, in words, for a toast.
 */
export function buyWidget(id: string, name: string): { ok: boolean; message: string } {
  const price = widgetPrice(id);
  if (price == null) return { ok: false, message: `${name} can't be bought. Win it in the Widget Pack.` };
  if (readWidgets().owned.includes(id)) return { ok: true, message: `You already have ${name}.` };
  if (readCredits() < price) return { ok: false, message: `Not enough ${CREDIT_NAME}: ${name} costs ${price}, you have ${readCredits()}.` };
  if (spendCredits(price) == null) return { ok: false, message: "The payment couldn't be saved, so nothing was spent." };
  if (!grantWidget(id)) {
    addCredits(price);
    return { ok: false, message: `Couldn't save ${name} (storage is full or blocked). Your ${CREDIT_NAME} was returned.` };
  }
  return { ok: true, message: `${name} unlocked for ${price} ${CREDIT_NAME}. Add it from Edit layout, Add cards.` };
}

/** Records the placed cards that are still Free as owned, so a later lock in the CMS never takes them away. */
export function recordFreePlaced(placed: readonly string[]): void {
  const add = widgetsToRecord(placed, readWidgets().owned);
  if (add.length) save(add);
}

/** The owned cards, refreshed on every change (this window and others). */
export function useWidgets(): WidgetState {
  const [state, setState] = useState(readWidgets);
  useEffect(() => {
    const sync = () => setState(readWidgets());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}

/** Whether each card is locked for this player now. Patreon Basic and the creator unlock open every card. */
export function useWidgetLock(): (id: string) => boolean {
  const { owned } = useWidgets();
  const { basic } = usePatreonEntitlement();
  const creator = useCreatorUnlock();
  return (id: string) => isWidgetLocked(id, owned, basic, creator);
}
