import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { readJson, writeJson } from "../lib/storage";
import { useCelebrate } from "./Celebrate";
import { LAST_POINT_LEVEL, addCountedMs, cleanLevel, countedGapMs, MAX_LEVEL, PLAYER_LEVEL_KEY, pointsAtLevel, type PlayerLevelState } from "./playerLevel";

/** Player level storage and its clock. The level is saved as the level plus the XP inside it. */
const EVENT = "cs-player-level";
const TICK_MS = 15_000;

export const readPlayerLevel = (): PlayerLevelState => cleanLevel(readJson<unknown>(PLAYER_LEVEL_KEY, null));

function save(s: PlayerLevelState): boolean {
  if (!writeJson(PLAYER_LEVEL_KEY, s)) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

/** The saved level, kept fresh. */
export function usePlayerLevel(): PlayerLevelState {
  const [state, setState] = useState(readPlayerLevel);
  useEffect(() => {
    const sync = () => setState(readPlayerLevel());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    const id = window.setInterval(sync, TICK_MS * 2);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, []);
  return state;
}

/**
 * Renders nothing. While the app is running (open or minimized) each tick adds the awake time since the last one as
 * XP; a long gap (the PC slept) counts only up to the clamp. Celebrates each level reached, with the points it gave.
 * The last tick time is kept in memory only, so closing the app never pays for the time it was closed.
 */
export function PlayerLevelWatcher(): null {
  const celebrate = useCelebrate();
  useEffect(() => {
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const ms = countedGapMs(last, now);
      last = now;
      const before = readPlayerLevel();
      const after = addCountedMs(before, ms);
      if (after.level === before.level && after.xp === before.xp) return;
      if (!save(after)) return;
      if (after.level > before.level) {
        const gained = pointsAtLevel(after.level) - pointsAtLevel(before.level);
        celebrate({
          title: `Level ${after.level}`,
          line:
            gained > 0
              ? `+${gained} Perk Points. Spend them on the Perks tab of your Profile.`
              : after.level >= MAX_LEVEL
                ? "Top level. Every Perk Point you can earn is already yours."
                : `No more Perk Points after level ${LAST_POINT_LEVEL}.`,
          icon: Zap,
        });
      }
    };
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [celebrate]);
  return null;
}
