import { useEffect, useState } from "react";
import type { PlayersData, Provider } from "../lib/types";

const REFRESH_MS = 10 * 60 * 1000;

/** Loads the online-player count now and every 10 minutes, but never during a match. */
export function usePlayers(provider: Provider, paused: boolean) {
  const [data, setData] = useState<PlayersData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (paused) return;
    let alive = true;
    const load = () =>
      provider
        .readPlayers()
        .then((d) => {
          if (!alive) return;
          setData(d);
          setFailed(false);
        })
        .catch(() => alive && setFailed(true));
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [provider, paused]);

  return { data, failed };
}
