import { useCallback, useEffect, useState } from "react";
import { GAMES, isGameId, packOf, type GameId, type GamePack } from "../lib/games";
import { readString, writeString } from "../lib/storage";

const KEY = "cs.activeGame";
const EVENT = "cs-active-game";

function readGame(): GameId {
  const saved = readString(KEY);
  return isGameId(saved) ? saved : "overwatch";
}

/** Persisted Overwatch | Apex selection. Changing it updates every listener in this window. */
export function useActiveGame(): { game: GameId; pack: GamePack; setGame: (id: GameId) => void; games: typeof GAMES } {
  const [game, setGameState] = useState<GameId>(readGame);

  useEffect(() => {
    const sync = () => setGameState(readGame());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setGame = useCallback((id: GameId) => {
    if (!isGameId(id)) return;
    writeString(KEY, id);
    setGameState(id);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { game, pack: packOf(game), setGame, games: GAMES };
}
