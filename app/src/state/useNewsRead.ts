import { useCallback, useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { getWhatsNewEntries } from "../content/contentStore";
import { CONTENT_CHANGELOG } from "./themeCatalog";
import { cleanNewsRead, markRead, NEWS_READ_KEY, type NewsReadState } from "./newsRead";

const EVENT = "cs-news-read";

/** Reads the saved state; the first run's `since` is saved straight away so it never moves. */
function load(): NewsReadState {
  const raw = readJson<unknown>(NEWS_READ_KEY, null);
  const s = cleanNewsRead(raw, Date.now());
  if (raw == null) writeJson(NEWS_READ_KEY, s);
  return s;
}

/** Read state shared by the News page and the top bar's unread dot. */
export function useNewsRead() {
  const [state, setState] = useState(load);
  useEffect(() => {
    const sync = () => setState(load());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const mark = useCallback((ids: readonly string[]) => {
    const cur = load();
    const next = markRead(cur, ids);
    if (next === cur) return;
    writeJson(NEWS_READ_KEY, next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { state, mark };
}

export interface Notice {
  id: string;
  title: string;
  body: string;
}

/** Station notices: the last content release's notes, or the bundled changelog before any release lands. */
export function listNotices(): Notice[] {
  const fromRelease = getWhatsNewEntries();
  return fromRelease.length > 0 ? fromRelease : [...CONTENT_CHANGELOG];
}

/** Which News board to open next ("notices" holds What's new). Set before switching to the News tab; read once on mount. */
export type NewsBoard = "news" | "notices";
const BOARD_EVENT = "cs-news-board";
let pendingBoard: NewsBoard | null = null;

export function openNewsBoard(board: NewsBoard): void {
  pendingBoard = board;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(BOARD_EVENT));
}

/** Looks without clearing: a React initializer can run twice in development, so the page clears it after mounting. */
export function peekNewsBoard(): NewsBoard | null {
  return pendingBoard;
}

export function clearNewsBoard(): void {
  pendingBoard = null;
}

export function takeNewsBoard(): NewsBoard | null {
  const b = pendingBoard;
  pendingBoard = null;
  return b;
}

export const NEWS_BOARD_EVENT = BOARD_EVENT;
