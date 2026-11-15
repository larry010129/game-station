import { useEffect, useState } from "react";
import type { PlayersData } from "../lib/types";
import { signal } from "../boot/bootSignals";
import { readPlayers } from "../lib/api";

const REFRESH_MS = 10 * 60 * 1000;
/** After the first cache hit, re-read soon so a background Steam poll can paint. */
const CATCH_UP_MS = [5_000, 15_000] as const;

/** Loads the online-player count now and every 10 minutes, but never during a match. */
export function usePlayers(paused: boolean, game = "overwatch") {
  const [data, setData] = useState<PlayersData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
  }, [game]);

  useEffect(() => {
    if (paused) return;
    let alive = true;
    const load = () =>
      readPlayers(game)
        .then((d) => {
          signal("/api/players", "ok");
          if (!alive) return;
          setData(d);
          setFailed(false);
        })
        .catch(() => {
          signal("/api/players", "error");
          if (alive) setFailed(true);
        });
    load();
    const catchUps = CATCH_UP_MS.map((ms) => window.setTimeout(load, ms));
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      for (const t of catchUps) window.clearTimeout(t);
      window.clearInterval(id);
    };
  }, [paused, game]);

  return { data, failed };
}
