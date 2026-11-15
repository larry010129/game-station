import { useEffect, useRef } from "react";
import type { FeedItem } from "../lib/types";
import { readString, writeString } from "../lib/storage";
import { api } from "../lib/api";

const KEY = "cs.leak.feedSeen";
const POLL_MS = 5 * 60_000;

/**
 * Watches free leak headlines on the news feed. When a leak shows up that the last look did not have,
 * `onNew` gets it once. Ids already reported are remembered, so a restart does not repeat them.
 * The first look stays quiet. Never polls during a match.
 */
export function useLeakAlerts(paused: boolean, onNew: (items: FeedItem[]) => void, game = "overwatch") {
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    if (paused) return;
    let alive = true;
    const check = () =>
      api<FeedItem[]>(`/api/feed?game=${encodeURIComponent(game)}`)
        .then((items) => {
          if (!alive || !Array.isArray(items)) return;
          const leaks = items.filter((i) => i.kind === "leak" && i.id);
          const ids = leaks.map((i) => i.id);
          const raw = readString(`${KEY}.${game}`);
          writeString(`${KEY}.${game}`, ids.join("\n"));
          if (raw == null) return;
          const seen = new Set(raw.split("\n").filter(Boolean));
          const fresh = leaks.filter((i) => !seen.has(i.id));
          if (fresh.length) onNewRef.current(fresh);
        })
        .catch(() => {});
    check();
    const id = window.setInterval(check, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [paused, game]);
}
