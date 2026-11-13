import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Layout, Layouts } from "react-grid-layout";
import { CARDS, DEFAULT_LAYOUTS, defaultInstances, defaultLook, newBox, sanitize, type CardId, type CardInstance } from "./layouts";

const KEY = "cs.dash.v1";
const DEFAULT_KEY = "cs.dash.default.v1";

interface Dash {
  instances: CardInstance[];
  layouts: Layouts;
}

const read = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: it still works until the app closes.
  }
};
const drop = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

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
    out.push({ id: r.id, type, look });
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
  if (!a.instances.every((x, i) => x.id === b.instances[i].id && x.type === b.instances[i].type && x.look === b.instances[i].look)) return false;
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
  const defaults = userDefault ?? factory();
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const [dash, setDash] = useState<Dash>(() => parse(read(KEY)) ?? migrate() ?? parse(read(DEFAULT_KEY)) ?? factory());

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
  const updateVisible = useCallback((next: Layouts, ids: readonly string[]) => {
    const keep = new Set(ids);
    setDash((d) => {
      const pick = (bp: "lg" | "md") => [
        ...(d.layouts[bp] ?? []).filter((item) => !keep.has(item.i)),
        ...(next[bp] ?? []).filter((item) => keep.has(item.i)),
      ];
      return { ...d, layouts: sanitize({ lg: pick("lg"), md: pick("md") }, d.instances) };
    });
  }, []);

  /** Puts a new copy of a card on the dashboard. `at` is where it was dropped, in the current grid. */
  const add = useCallback((type: CardId, at?: { x: number; y: number }, bp: "lg" | "md" = "lg") => {
    setDash((d) => {
      const inst: CardInstance = { id: nextId(type, d.instances), type, look: defaultLook(type) };
      const instances = [...d.instances, inst];
      const layouts = sanitize(
        { lg: [...(d.layouts.lg ?? []), newBox(inst, "lg", bp === "lg" ? at : undefined)], md: [...(d.layouts.md ?? []), newBox(inst, "md", bp === "md" ? at : undefined)] },
        instances,
      );
      return { instances, layouts };
    });
  }, []);

  const remove = useCallback((id: string) => setDash((d) => {
    const instances = d.instances.filter((i) => i.id !== id);
    return { instances, layouts: sanitize(d.layouts, instances) };
  }), []);

  const setLook = useCallback((id: string, look: string) => setDash((d) => ({ ...d, instances: d.instances.map((i) => (i.id === id ? { ...i, look } : i)) })), []);

  /** Back to the saved default, or the built-in one when none is saved. */
  const reset = useCallback(() => setDash(defaultsRef.current), []);

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
  }, []);

  return { instances: dash.instances, layouts: dash.layouts, update, updateVisible, add, remove, setLook, reset, saveAsDefault, clearDefault, customised, hasSavedDefault: userDefault != null };
}
