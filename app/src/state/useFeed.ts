import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem } from "../lib/types";
import { signal } from "../boot/bootSignals";
import { readFeed, refreshFeed } from "../lib/api";

// The service itself looks for new stories every 30 minutes; asking it for the
// stored list is cheap, so the dashboard checks more often to show them quickly.
const REFRESH_MS = 5 * 60 * 1000;
/** After the first cache hit, re-read soon so a background refresh can paint. */
const CATCH_UP_MS = [8_000, 25_000, 60_000] as const;

const byNewest = (list: FeedItem[]) => [...list].sort((a, b) => b.publishedAt - a.publishedAt);

/**
 * Loads the selected game's feed now and every 5 minutes, but never during a match.
 * Anything that appears after the first load is reported through `onNew`.
 */
export function useFeed(paused: boolean, onNew?: (items: FeedItem[]) => void, game = "overwatch") {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const known = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;
  /** The game shown now, so a slow answer for the game shown before can be recognised and dropped. */
  const gameRef = useRef(game);
  gameRef.current = game;

  const apply = useCallback((list: FeedItem[]) => {
    const sorted = byNewest(list);
    if (known.current) {
      const fresh = sorted.filter((i) => !known.current!.has(i.id));
      if (fresh.length) onNewRef.current?.(fresh);
    }
    known.current = new Set(sorted.map((i) => i.id));
    setItems(sorted);
    setError(null);
  }, []);

  useEffect(() => {
    // Switching games resets "seen" so Apex stories are not treated as Overwatch news.
    known.current = null;
    setItems([]);
    setError(null);
  }, [game]);

  useEffect(() => {
    if (paused) return;
    let alive = true;
    const load = () =>
      readFeed(game)
        .then((list) => {
          signal("/api/feed", "ok");
          if (alive) apply(list);
        })
        .catch(() => {
          signal("/api/feed", "error");
          if (alive) setError("Couldn't load the feed. It will try again in 5 minutes.");
        });
    load();
    const catchUps = CATCH_UP_MS.map((ms) => window.setTimeout(load, ms));
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      for (const t of catchUps) window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [paused, apply, game]);

  /** Asks the service to look at every source right now. */
  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      const list = await refreshFeed(game);
      // A full check can take a while. If the user switched games meanwhile, this list belongs to the other
      // game: showing it would put its stories in this game's feed and announce every one of them as new.
      if (gameRef.current === game) apply(list);
    } catch {
      if (gameRef.current === game) setError("Couldn't check for new stories. Is the service running?");
    } finally {
      setChecking(false);
    }
  }, [apply, game]);

  return { items, error, checking, checkNow };
}
