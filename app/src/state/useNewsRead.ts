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
