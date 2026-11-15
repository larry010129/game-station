import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Layout, Layouts } from "react-grid-layout";
import { readJson, removeKey, writeJson } from "../lib/storage";
import { instanceKeys } from "./cardKeys";
import { CARDS, COLS, DEFAULT_LAYOUTS, closeColumnGaps, defaultInstances, defaultLook, newBox, sanitize, type CardId, type CardInstance } from "./layouts";

const KEY = "cs.dash.v1";
const DEFAULT_KEY = "cs.dash.default.v1";
const HIDDEN_KEY = "cs.home.hidden";
const TABS_KEY = "cs.dash.tabs.v1";
const SETS_KEY = "cs.dash.sets.v1";
const MAX_SETS = 12;
const MAX_HISTORY = 60;

/** Where cards sit on one tab other than Home. Each tab keeps its own, so moving a card on one never moves it on another. */
type TabLayouts = Record<string, Layouts>;

const cleanHidden = (raw: unknown): CardId[] => (Array.isArray(raw) ? raw.filter((t): t is CardId => typeof t === "string" && t in CARDS) : []);
const readHidden = (): CardId[] => cleanHidden(read(HIDDEN_KEY));

function readTabs(raw: unknown): TabLayouts {
  const src = raw as Record<string, { lg?: Layout[]; md?: Layout[] }> | null;
  const out: TabLayouts = {};
  if (src && typeof src === "object") {
    for (const [tab, l] of Object.entries(src)) {
      if (l && Array.isArray(l.lg) && Array.isArray(l.md)) out[tab] = { lg: closeColumnGaps(l.lg, COLS.lg), md: closeColumnGaps(l.md, COLS.md) };
    }
  }
  return out;
}

/** Everything that makes up one arrangement: Home's cards and positions, each tab's own positions, and which card types are off. */
export interface LayoutSnap {
  instances: CardInstance[];
  lg: Layout[];
  md: Layout[];
  tabs: TabLayouts;
  hidden: CardId[];
}

interface NamedLayout {
  id: string;
  name: string;
  snap: LayoutSnap;
}

interface Sets {
  /** The named layout the live dashboard is saved into as you edit, or none. */
  active: string | null;
  list: NamedLayout[];
}

/** Reads a snapshot from anything (a saved set, an imported file), or null when it is not one. */
export function cleanSnap(raw: unknown): LayoutSnap | null {
  const o = raw as { instances?: unknown; lg?: Layout[]; md?: Layout[]; tabs?: unknown; hidden?: unknown } | null;
  if (!o || typeof o !== "object") return null;
  const dash = parse({ instances: o.instances, lg: o.lg, md: o.md });
  if (!dash) return null;
  return { instances: dash.instances, lg: dash.layouts.lg ?? [], md: dash.layouts.md ?? [], tabs: readTabs(o.tabs), hidden: cleanHidden(o.hidden) };
}

function readSets(): Sets {
  const raw = read(SETS_KEY) as { active?: unknown; list?: unknown } | null;
  const list: NamedLayout[] = [];
  if (raw && Array.isArray(raw.list)) {
    for (const r of raw.list as Partial<NamedLayout>[]) {
      const snap = r && typeof r.id === "string" && typeof r.name === "string" ? cleanSnap(r.snap) : null;
      if (snap && r.id && r.name && !list.some((n) => n.id === r.id)) list.push({ id: r.id, name: r.name.slice(0, 30), snap });
    }
  }
  const active = typeof raw?.active === "string" && list.some((n) => n.id === raw.active) ? (raw.active as string) : null;
  return { active, list: list.slice(0, MAX_SETS) };
}

interface Dash {
  instances: CardInstance[];
  layouts: Layouts;
}

const read = (key: string): unknown => readJson<unknown>(key, null);
const write = writeJson;
const drop = removeKey;

function cleanInstances(raw: unknown): CardInstance[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: CardInstance[] = [];
  for (const r of raw as Partial<CardInstance>[]) {
    if (!r || typeof r.id !== "string" || typeof r.type !== "string" || !(r.type in CARDS) || seen.has(r.id)) continue;
    seen.add(r.id);
    const type = r.type as CardId;
    const looks = (CARDS[type] as { looks?: readonly { id: string }[] }).looks;
    const look = looks?.some((l) => l.id === r.look) ? r.look : defaultLook(type);
    out.push({ id: r.id, type, look, ...(r.locked === true ? { locked: true } : {}) });
  }
  return out;
}

function parse(raw: unknown): Dash | null {
  const o = raw as { instances?: unknown; lg?: Layout[]; md?: Layout[] } | null;
  const instances = cleanInstances(o?.instances);
  return instances ? { instances, layouts: sanitize({ lg: o?.lg ?? [], md: o?.md ?? [] }, instances) } : null;
}

function factory(): Dash {
  const instances = defaultInstances();
  return { instances, layouts: sanitize(DEFAULT_LAYOUTS, instances) };
}

/** Before cards could be added many times, the card list and the layout were saved apart. */
function migrate(): Dash | null {
  const ids = read("cs.cards.v1");
  const old = read("cs.layout.v1") as Layouts | null;
  if (!Array.isArray(ids)) return null;
  const instances = cleanInstances((ids as string[]).map((t) => ({ id: t, type: t })));
  return instances ? { instances, layouts: sanitize(old, instances) } : null;
}

const nextId = (type: CardId, instances: CardInstance[]) => {
  if (!instances.some((i) => i.id === type)) return type;
  let n = 2;
  while (instances.some((i) => i.id === `${type}~${n}`)) n++;
  return `${type}~${n}`;
};

function sameDash(a: Dash, b: Dash) {
  if (a.instances.length !== b.instances.length) return false;
  if (!a.instances.every((x, i) => x.id === b.instances[i].id && x.type === b.instances[i].type && x.look === b.instances[i].look && !!x.locked === !!b.instances[i].locked)) return false;
  return (["lg", "md"] as const).every((bp) =>
    (b.layouts[bp] ?? []).every((d) => {
      const s = (a.layouts[bp] ?? []).find((g) => g.i === d.i);
      return s && s.x === d.x && s.y === d.y && s.w === d.w && s.h === d.h;
    }),
  );
}

/**
 * The cards on the dashboard and where each one sits, saved between launches.
 * A card type can be added any number of times; each copy has its own id, position and look.
 * The user can also save the current arrangement as the default that Reset returns to.
 */
export function useDashboard() {
  const [userDefault, setUserDefault] = useState<Dash | null>(() => parse(read(DEFAULT_KEY)));
  const builtIn = useMemo(factory, []);
  const defaults = userDefault ?? builtIn;
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const [dash, setDash] = useState<Dash>(() => parse(read(KEY)) ?? migrate() ?? parse(read(DEFAULT_KEY)) ?? factory());
  // The latest dashboard, for callbacks that must look at it without doing work inside a state updater.
  const dashRef = useRef(dash);
  dashRef.current = dash;

  /** Card types the user removed. Kept so Reset / starting-set logic can leave them off. */
  const [hidden, setHidden] = useState<CardId[]>(readHidden);
  useEffect(() => {
    if (hidden.length) write(HIDDEN_KEY, hidden);
    else drop(HIDDEN_KEY);
  }, [hidden]);

  const [tabLayouts, setTabLayouts] = useState<TabLayouts>(() => readTabs(read(TABS_KEY)));
  useEffect(() => {
    if (Object.keys(tabLayouts).length) write(TABS_KEY, tabLayouts);
    else drop(TABS_KEY);
  }, [tabLayouts]);

  const tabLayoutsRef = useRef(tabLayouts);
  tabLayoutsRef.current = tabLayouts;
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

  const customised = useMemo(() => !sameDash(dash, defaults), [dash, defaults]);
  useEffect(() => {
    if (customised) write(KEY, { instances: dash.instances, lg: dash.layouts.lg, md: dash.layouts.md });
    else drop(KEY);
  }, [dash, customised]);

  /** The grid reports every move and resize here. */
  const update = useCallback((next: Layouts) => setDash((d) => ({ ...d, layouts: sanitize(next, d.instances) })), []);

  /**
   * Same as `update`, but only the cards on the current tab. Cards on other
   * tabs keep the positions they already have.
   */
  const updateVisible = useCallback((next: Layouts, shown: readonly CardInstance[]) => {
    const keep = new Set(shown.map((inst) => inst.id));
    setDash((d) => {
      // Home shows catalog cards that were never saved as instances (e.g. Hero profile on an older
      // save). Without saving them here, sanitize() would drop their new position and the card
      // would snap back to its default spot.
      const have = new Set(d.instances.map((inst) => inst.id));
      const instances = [...d.instances, ...shown.filter((inst) => !have.has(inst.id))];
      const pick = (bp: "lg" | "md") => [
        ...(d.layouts[bp] ?? []).filter((item) => !keep.has(item.i)),
        ...(next[bp] ?? []).filter((item) => keep.has(item.i)),
      ];
      return { instances, layouts: sanitize({ lg: pick("lg"), md: pick("md") }, instances) };
    });
  }, []);

  /** The grid reports a move or resize on a tab other than Home. Only that tab's own layout changes. */
  const updateTab = useCallback((tab: string, next: Layouts, shown: readonly CardInstance[]) => {
    const own = sanitize(next, shown as CardInstance[]);
    setTabLayouts((t) => ({ ...t, [tab]: { lg: own.lg, md: own.md } }));
  }, []);

  /** Back to how the tab started: Home's positions, packed to the top. */
  const resetTab = useCallback((tab: string) => {
    setTabLayouts((t) => {
      const { [tab]: _gone, ...rest } = t;
      return rest;
    });
  }, []);

  /**
   * Puts a new copy of a card on the dashboard. `at` is where it was dropped, in the current grid.
   * On a tab other than Home, pass `tab` so the card is placed in that tab's own layout.
   */
  const add = useCallback((type: CardId, at?: { x: number; y: number }, bp: "lg" | "md" = "lg", tab?: string, look?: string) => {
    setHidden((h) => (h.includes(type) ? h.filter((t) => t !== type) : h));
    // The id is chosen here, outside the state updaters, so each updater stays pure.
    const inst: CardInstance = { id: nextId(type, dashRef.current.instances), type, look: look ?? defaultLook(type) };
    const here = tab ? undefined : at;
    setDash((d) => {
      if (d.instances.some((i) => i.id === inst.id)) return d;
      const instances = [...d.instances, inst];
      const layouts = sanitize(
        { lg: [...(d.layouts.lg ?? []), newBox(inst, "lg", bp === "lg" ? here : undefined)], md: [...(d.layouts.md ?? []), newBox(inst, "md", bp === "md" ? here : undefined)] },
        instances,
      );
      return { instances, layouts };
    });
    if (tab) {
      setTabLayouts((t) => {
        const own = t[tab];
        if (!own) return t;
        return { ...t, [tab]: { lg: [...(own.lg ?? []), newBox(inst, "lg", bp === "lg" ? at : undefined)], md: [...(own.md ?? []), newBox(inst, "md", bp === "md" ? at : undefined)] } };
      });
    }
    return inst.id;
  }, []);

  const remove = useCallback((id: string) => {
    const type = id.split("~")[0] as CardId;
    // Remember a fully removed type so Reset / starting-set can leave it off.
    const left = dashRef.current.instances.filter((i) => i.id !== id);
    if (type in CARDS && !left.some((i) => i.type === type)) setHidden((h) => (h.includes(type) ? h : [...h, type]));
    // What this copy saved on its own (checklist, note, chosen hero) goes with it.
    if (type in CARDS) instanceKeys(id, type).forEach(drop);
    setTabLayouts((t) => Object.fromEntries(Object.entries(t).map(([tab, l]) => [tab, { lg: (l.lg ?? []).filter((b) => b.i !== id), md: (l.md ?? []).filter((b) => b.i !== id) }])));
    setDash((d) => {
      const instances = d.instances.filter((i) => i.id !== id);
      return { instances, layouts: sanitize(d.layouts, instances) };
    });
  }, []);

  /** A tab was deleted: its layout goes with it. */
  const dropTab = useCallback((tab: string) => resetTab(tab), [resetTab]);

  const setLocked = useCallback((id: string, locked: boolean) => setDash((d) => ({ ...d, instances: d.instances.map((i) => (i.id === id ? (locked ? { ...i, locked: true } : { id: i.id, type: i.type, look: i.look }) : i)) })), []);

  /** A second copy of a card, with the same look, just below the original. */
  const duplicate = useCallback(
    (id: string, at: { x: number; y: number }, bp: "lg" | "md", tab?: string) => {
      const from = dashRef.current.instances.find((i) => i.id === id);
      return from ? add(from.type, at, bp, tab, from.look) : undefined;
    },
    [add],
  );

  const setLook = useCallback((id: string, look: string) => setDash((d) => ({ ...d, instances: d.instances.map((i) => (i.id === id ? { ...i, look } : i)) })), []);

  /** Back to the saved default, or the built-in one when none is saved. */
  const reset = useCallback(() => {
    setDash(defaultsRef.current);
    setHidden([]);
  }, []);

  /** Makes the cards and positions on screen now the default that Reset returns to. */
  const saveAsDefault = useCallback(() => {
    const snap = dash;
    write(DEFAULT_KEY, { instances: snap.instances, lg: snap.layouts.lg, md: snap.layouts.md });
    setUserDefault(snap);
  }, [dash]);

  /** Forgets the saved default and goes back to the built-in layout. */
  const clearDefault = useCallback(() => {
    drop(DEFAULT_KEY);
    setUserDefault(null);
    setDash(factory());
    setHidden([]);
  }, []);

  // ---- undo / redo: one entry per burst of edits (a drag fires several updates a few ms apart).
  interface Moment {
    dash: Dash;
    tabLayouts: TabLayouts;
    hidden: CardId[];
  }
  /** What a moment holds, as text, so the grid re-reporting the same layout does not count as an edit. */
  const keyOf = (m: Moment) => JSON.stringify([m.dash.instances, m.dash.layouts.lg, m.dash.layouts.md, m.tabLayouts, m.hidden]);
  const hist = useRef<{ past: Moment[]; future: Moment[]; last: Moment; lastKey: string; at: number }>(null as never);
  if (hist.current === null) {
    const first: Moment = { dash, tabLayouts, hidden };
    hist.current = { past: [], future: [], last: first, lastKey: keyOf(first), at: 0 };
  }
  const [depth, setDepth] = useState({ undo: 0, redo: 0 });
  useEffect(() => {
    const h = hist.current;
    const now: Moment = { dash, tabLayouts, hidden };
    const key = keyOf(now);
    const before = h.last;
    h.last = now;
    if (key === h.lastKey) return;
    h.lastKey = key;
    const t = Date.now();
    if (t - h.at > 600 || h.past.length === 0) {
      h.past.push(before);
      if (h.past.length > MAX_HISTORY) h.past.shift();
    }
    h.future = [];
    h.at = t;
    setDepth({ undo: h.past.length, redo: 0 });
  }, [dash, tabLayouts, hidden]);

  const restore = useCallback((m: Moment) => {
    // Marked as the current state before it is applied, so the effect above sees no change to record.
    hist.current.lastKey = keyOf(m);
    setDash(m.dash);
    setTabLayouts(m.tabLayouts);
    setHidden(m.hidden);
  }, []);
  const undo = useCallback(() => {
    const h = hist.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(h.last);
    h.at = 0;
    restore(prev);
    setDepth({ undo: h.past.length, redo: h.future.length });
  }, [restore]);
  const redo = useCallback(() => {
    const h = hist.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(h.last);
    h.at = 0;
    restore(next);
    setDepth({ undo: h.past.length, redo: h.future.length });
  }, [restore]);
  /** Forgets what can be undone: called when editing starts, so Undo only ever reverses this session's edits. */
  const clearHistory = useCallback(() => {
    const h = hist.current;
    h.past = [];
    h.future = [];
    h.at = 0;
    setDepth({ undo: 0, redo: 0 });
  }, []);

  // ---- named layouts. The live dashboard keeps its own storage; a named layout is a saved copy of it that
  // follows your edits while it is the active one, so switching away never loses a change.
  const [sets, setSets] = useState<Sets>(readSets);
  const setsRef = useRef(sets);
  setsRef.current = sets;
  useEffect(() => {
    if (sets.list.length) write(SETS_KEY, sets);
    else drop(SETS_KEY);
  }, [sets]);
  useEffect(() => {
    setSets((s) => {
      if (!s.active) return s;
      const snap: LayoutSnap = { instances: dash.instances, lg: dash.layouts.lg ?? [], md: dash.layouts.md ?? [], tabs: tabLayouts, hidden };
      return { ...s, list: s.list.map((n) => (n.id === s.active ? { ...n, snap } : n)) };
    });
  }, [dash, tabLayouts, hidden]);

  const applySnap = useCallback((snap: LayoutSnap) => {
    const instances = snap.instances;
    setDash({ instances, layouts: sanitize({ lg: snap.lg, md: snap.md }, instances) });
    setTabLayouts(snap.tabs);
    setHidden(snap.hidden);
  }, []);

  const uniqueName = (list: NamedLayout[], wanted: string) => {
    const base = wanted.trim().slice(0, 30) || "Layout";
    let name = base;
    for (let n = 2; list.some((l) => l.name.toLowerCase() === name.toLowerCase()); n++) name = `${base.slice(0, 26)} ${n}`;
    return name;
  };

  /** Saves what is on screen (or the given snapshot, which is also put on screen) as a new named layout and makes it the active one. */
  const saveLayoutAs = useCallback(
    (name: string, from?: LayoutSnap): boolean => {
      const cur = dashRef.current;
      const snap: LayoutSnap = from ?? { instances: cur.instances, lg: cur.layouts.lg ?? [], md: cur.layouts.md ?? [], tabs: tabLayoutsRef.current, hidden: hiddenRef.current };
      const s = setsRef.current;
      if (s.list.length >= MAX_SETS) return false;
      const id = `l-${Date.now().toString(36)}${s.list.length}`;
      setSets({ active: id, list: [...s.list, { id, name: uniqueName(s.list, name), snap }] });
      if (from) applySnap(from);
      return true;
    },
    [applySnap],
  );

  const switchLayout = useCallback(
    (id: string) => {
      const target = setsRef.current.list.find((n) => n.id === id);
      if (!target) return;
      setSets((s) => ({ ...s, active: id }));
      applySnap(target.snap);
    },
    [applySnap],
  );

  const deleteLayout = useCallback((id: string) => setSets((s) => ({ active: s.active === id ? null : s.active, list: s.list.filter((n) => n.id !== id) })), []);

  return { hidden, instances: dash.instances, layouts: dash.layouts, tabLayouts, updateTab, resetTab, dropTab, update, updateVisible, add, remove, setLook, setLocked, duplicate, undo, redo, canUndo: depth.undo > 0, canRedo: depth.redo > 0, clearHistory, layoutSets: { active: sets.active, list: sets.list.map((n) => ({ id: n.id, name: n.name })), full: sets.list.length >= MAX_SETS }, saveLayoutAs, switchLayout, deleteLayout, snapshot: (): LayoutSnap => ({ instances: dash.instances, lg: dash.layouts.lg ?? [], md: dash.layouts.md ?? [], tabs: tabLayouts, hidden }), reset, saveAsDefault, clearDefault, customised, hasSavedDefault: userDefault != null };
}
