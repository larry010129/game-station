import { useCallback, useEffect, useState } from "react";
import { readJson, removeKey, writeJson } from "../lib/storage";
import { CARDS, TABS, type CardId } from "./layouts";

const KEY = "cs.nav.v1";
const MAX_TABS = 8;
const MAX_LABEL = 20;

export interface CustomTab {
  id: string;
  label: string;
}

interface Nav {
  /** Tabs the user added, in the order they appear after the built-in card tabs. */
  custom: CustomTab[];
  /** Cards the user picked for a tab. A tab with no entry shows its default cards. */
  cards: Record<string, CardId[]>;
}

const taken = (id: string) => TABS.some((t) => t.id === id);

function clean(raw: unknown): Nav {
  const o = raw as { custom?: unknown; cards?: unknown } | null;
  const custom: CustomTab[] = [];
  if (Array.isArray(o?.custom)) {
    for (const t of o.custom as Partial<CustomTab>[]) {
      if (t && typeof t.id === "string" && typeof t.label === "string" && t.label.trim() && !taken(t.id) && !custom.some((c) => c.id === t.id)) {
        custom.push({ id: t.id, label: t.label.slice(0, MAX_LABEL) });
      }
    }
  }
  const cards: Record<string, CardId[]> = {};
  if (o?.cards && typeof o.cards === "object") {
    for (const [tab, list] of Object.entries(o.cards as Record<string, unknown>)) {
      const known = taken(tab) || custom.some((c) => c.id === tab);
      if (!known || tab === "home" || !Array.isArray(list)) continue;
      cards[tab] = [...new Set(list.filter((t): t is CardId => typeof t === "string" && t in CARDS))];
    }
  }
  return { custom, cards };
}

/** The tabs the user added and which cards each tab shows, saved between launches. */
export function useNav() {
  const [nav, setNav] = useState<Nav>(() => clean(readJson<unknown>(KEY, null)));

  useEffect(() => {
    if (nav.custom.length || Object.keys(nav.cards).length) writeJson(KEY, nav);
    else removeKey(KEY);
  }, [nav]);

  const addTab = useCallback((label: string): string | null => {
    const clipped = label.trim().slice(0, MAX_LABEL);
    if (!clipped) return null;
    const id = `tab-${Date.now().toString(36)}`;
    setNav((n) => (n.custom.length >= MAX_TABS ? n : { ...n, custom: [...n.custom, { id, label: clipped }], cards: { ...n.cards, [id]: [] } }));
    return id;
  }, []);

  const renameTab = useCallback((id: string, label: string) => {
    const clipped = label.trim().slice(0, MAX_LABEL);
    if (!clipped) return;
    setNav((n) => ({ ...n, custom: n.custom.map((t) => (t.id === id ? { ...t, label: clipped } : t)) }));
  }, []);

  const removeTab = useCallback((id: string) => {
    setNav((n) => {
      const { [id]: _gone, ...cards } = n.cards;
      return { custom: n.custom.filter((t) => t.id !== id), cards };
    });
  }, []);

  const setCards = useCallback((tab: string, types: readonly CardId[]) => {
    setNav((n) => ({ ...n, cards: { ...n.cards, [tab]: [...new Set(types)] } }));
  }, []);

  /** Back to the default cards for a built-in tab. */
  const resetCards = useCallback((tab: string) => {
    setNav((n) => {
      const { [tab]: _gone, ...cards } = n.cards;
      return { ...n, cards };
    });
  }, []);

  return { custom: nav.custom, cards: nav.cards, canAdd: nav.custom.length < MAX_TABS, addTab, renameTab, removeTab, setCards, resetCards };
}
