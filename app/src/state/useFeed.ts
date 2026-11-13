import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem, Provider } from "../lib/types";

// The service itself looks for new stories every 30 minutes; asking it for the
// stored list is cheap, so the dashboard checks more often to show them quickly.
const REFRESH_MS = 5 * 60 * 1000;

const byNewest = (list: FeedItem[]) => [...list].sort((a, b) => b.publishedAt - a.publishedAt);

/**
 * Loads the Overwatch feed now and every 5 minutes, but never during a match.
 * Anything that appears after the first load is reported through `onNew`.
 */
export function useFeed(provider: Provider, paused: boolean, onNew?: (items: FeedItem[]) => void) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const known = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

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
    if (paused) return;
    let alive = true;
    const load = () =>
      provider
        .readFeed()
        .then((list) => alive && apply(list))
        .catch(() => alive && setError("Couldn't load the feed. It will try again in 5 minutes."));
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [provider, paused, apply]);

  /** Asks the service to look at every source right now. */
  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      apply(await provider.refreshFeed());
    } catch {
      setError("Couldn't check for new stories. Is the service running?");
    } finally {
      setChecking(false);
    }
  }, [provider, apply]);

  return { items, error, checking, checkNow };
}
