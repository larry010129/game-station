/**
 * Split view: up to four panes inside the one window, each showing a page. Pure state steps, no React,
 * so they can be checked on their own. `useSplit` keeps the state and saves it.
 *
 * Shape by pane count: 2 side by side; 3 is one tall pane plus two stacked; 4 is a 2 x 2 grid.
 */
export const MAX_PANES = 4;
export const MIN_RATIO = 0.25;
export const MAX_RATIO = 0.75;

export interface Pane {
  id: number;
  tab: string;
}

export interface SplitState {
  panes: Pane[];
  /** Id of the pane that the top bar's page tabs and Edit layout act on. */
  active: number;
  /** Share of the width taken by the left column. */
  cols: number;
  /** Share of the height taken by the top row (the stacked panes). */
  rows: number;
}

export const clampRatio = (v: number): number => Math.min(MAX_RATIO, Math.max(MIN_RATIO, v));

export function initialSplit(): SplitState {
  return { panes: [{ id: 0, tab: "home" }], active: 0, cols: 0.5, rows: 0.5 };
}

/** The first of `candidates` no pane shows yet, else the first candidate. */
export function pickTab(s: SplitState, candidates: readonly string[]): string {
  return candidates.find((t) => !s.panes.some((p) => p.tab === t)) ?? candidates[0] ?? "home";
}

export function addPane(s: SplitState, tab: string): SplitState {
  if (s.panes.length >= MAX_PANES) return s;
  const id = Math.max(...s.panes.map((p) => p.id)) + 1;
  return { ...s, panes: [...s.panes, { id, tab }], active: id };
}

export function closePane(s: SplitState, id: number): SplitState {
  const at = s.panes.findIndex((p) => p.id === id);
  if (at < 0 || s.panes.length <= 1) return s;
  const panes = s.panes.filter((p) => p.id !== id);
  const active = s.active === id ? panes[Math.max(0, at - 1)].id : s.active;
  return { ...s, panes, active };
}

export function focusPane(s: SplitState, id: number): SplitState {
  return s.active === id || !s.panes.some((p) => p.id === id) ? s : { ...s, active: id };
}

export function setPaneTab(s: SplitState, id: number, tab: string): SplitState {
  const pane = s.panes.find((p) => p.id === id);
  if (!pane || pane.tab === tab) return s;
  return { ...s, panes: s.panes.map((p) => (p.id === id ? { ...p, tab } : p)) };
}

export function setRatio(s: SplitState, axis: "cols" | "rows", value: number): SplitState {
  const next = clampRatio(value);
  return s[axis] === next ? s : { ...s, [axis]: next };
}

/** What is saved: pane ids are not kept, so `active` is the active pane's position. */
export function saveShape(s: SplitState) {
  return { panes: s.panes.map((p) => ({ tab: p.tab })), active: s.panes.findIndex((p) => p.id === s.active), cols: s.cols, rows: s.rows };
}

/** A saved split, or null when it is missing, malformed or only one pane (a single pane is the normal view). */
export function cleanSplit(raw: unknown): SplitState | null {
  const o = raw as { panes?: unknown; active?: unknown; cols?: unknown; rows?: unknown } | null;
  if (!o || !Array.isArray(o.panes)) return null;
  const panes: Pane[] = [];
  for (const p of o.panes as Partial<Pane>[]) {
    if (panes.length < MAX_PANES && p && typeof p.tab === "string" && p.tab) panes.push({ id: panes.length, tab: p.tab });
  }
  if (panes.length < 2) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? clampRatio(v) : 0.5);
  const active = typeof o.active === "number" && panes[o.active] ? o.active : 0;
  return { panes, active, cols: num(o.cols), rows: num(o.rows) };
}
