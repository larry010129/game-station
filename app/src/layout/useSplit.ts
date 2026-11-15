import { useCallback, useEffect, useMemo, useState } from "react";
import { readJson, removeKey, writeJson } from "../lib/storage";
import { addPane, cleanSplit, closePane, focusPane, initialSplit, MAX_PANES, pickTab, saveShape, setPaneTab, setRatio, type Pane, type SplitState } from "./split";

const KEY = "cs.split.v1";

/**
 * Split view state, saved between launches. One pane is the normal view and is not saved, so the app still
 * opens on Home. `known` lists the pages that exist; a pane on a page that was removed shows Home.
 */
export function useSplit(known: ReadonlySet<string>) {
  const [state, setState] = useState<SplitState>(() => cleanSplit(readJson<unknown>(KEY, null)) ?? initialSplit());

  useEffect(() => {
    if (state.panes.length > 1) writeJson(KEY, saveShape(state));
    else removeKey(KEY);
  }, [state]);

  const panes = useMemo<Pane[]>(() => state.panes.map((p) => (known.has(p.tab) ? p : { ...p, tab: "home" })), [state.panes, known]);
  const activeTab = (panes.find((p) => p.id === state.active) ?? panes[0]).tab;

  /** Opens a pane on the first of `candidates` that no pane shows yet, and focuses it. */
  const add = useCallback((candidates: readonly string[]) => setState((s) => addPane(s, pickTab(s, candidates))), []);
  const close = useCallback((id: number) => setState((s) => closePane(s, id)), []);
  const focus = useCallback((id: number) => setState((s) => focusPane(s, id)), []);
  const setTab = useCallback((id: number, tab: string) => setState((s) => setPaneTab(s, id, tab)), []);
  const resize = useCallback((axis: "cols" | "rows", value: number) => setState((s) => setRatio(s, axis, value)), []);

  return { panes, active: state.active, activeTab, cols: state.cols, rows: state.rows, canAdd: state.panes.length < MAX_PANES, add, close, focus, setTab, resize };
}
