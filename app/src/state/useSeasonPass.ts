import { useCallback, useEffect, useState } from "react";
import { Award } from "lucide-react";
import { readJson, writeJson } from "../lib/storage";
import { useCelebrate } from "./Celebrate";
import { grantSkin } from "./cardSkinStore";
import { isCreatorUnlocked } from "./creatorAccess";
import { grantItem } from "./items";
import { usePatreonEntitlement } from "./patreon";
import { canClaim, claimable, cleanPass, levelOf, markClaimed, PASS_LEVELS, syncPass, type PassReward, type PassRow, type PassState } from "./seasonPass";
import { addCredits } from "./stationCredits";
import { grantTickets } from "./useCheckinBoard";
import { readQuests } from "./useQuests";
import { perkIncomeBonus, readPerkEffects } from "./perkStore";

export const PASS_KEY = "cs.seasonPass";
const EVENT = "cs-season-pass";
const RECHECK_MS = 30_000;

const readPass = (): PassState => cleanPass(readJson<unknown>(PASS_KEY, null), new Date());

function save(s: PassState): boolean {
  if (!writeJson(PASS_KEY, s)) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

/** Hands one reward out. False when a store refused it, so the claim is not saved. */
function grant(r: PassReward): boolean {
  switch (r.kind) {
    case "credits":
      // Perk tree: percent more on all Income.
      addCredits(r.n + perkIncomeBonus("pass", r.n));
      return true;
    case "ticket":
      return grantTickets(r.ticket, r.n);
    case "item":
      for (let i = 0; i < r.n; i++) if (!grantItem(r.id)) return false;
      return true;
    case "skin":
      return grantSkin(r.id);
  }
}

/** Patreon (any paid tier) opens the second row; the creator test unlock does too, for testing. */
export function usePassPatron(): boolean {
  const e = usePatreonEntitlement();
  return e.basic || e.brand || isCreatorUnlocked();
}

/** The pass, kept fresh, with claim actions. */
export function useSeasonPass() {
  const [state, setState] = useState(readPass);
  const patron = usePassPatron();
  useEffect(() => {
    const sync = () => setState(readPass());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    const id = window.setInterval(sync, RECHECK_MS);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, []);

  const claim = useCallback(
    (level: number, row: PassRow): boolean => {
      const cur = readPass();
      if (!canClaim(cur, level, row, patron)) return false;
      const def = PASS_LEVELS[level - 1];
      if (!grant(row === "free" ? def.free : def.patron)) return false;
      return save(markClaimed(cur, level, row));
    },
    [patron],
  );

  /** Claims everything open; returns how many were claimed. */
  const claimAll = useCallback((): number => {
    let n = 0;
    for (const c of claimable(readPass(), patron)) if (claim(c.level, c.row)) n++;
    return n;
  }, [claim, patron]);

  return { state, patron, claim, claimAll };
}

/**
 * Renders nothing. Turns new counted minutes and claimed quests into pass XP (on quest changes and every 30
 * seconds) and celebrates each new level once.
 */
export function PassWatcher(): null {
  const celebrate = useCelebrate();
  useEffect(() => {
    const check = () => {
      const cur = readPass();
      const q = readQuests();
      const fx = readPerkEffects();
      let next = syncPass(cur, { minutesTotal: q.minutesTotal, tasksClaimed: q.tasksClaimed }, new Date(), { xpMult: fx.passXpMult, capBonus: fx.passCapBonus, levelCap: fx.passLevelCap });
      const level = levelOf(next.xp).level;
      // A level reached by play is celebrated; the very first sync and a new season only record where things stand.
      const fresh = level > next.announced && cur.last != null && cur.season === next.season;
      if (level !== next.announced) next = { ...next, announced: level };
      if (next === cur) return;
      if (!save(next)) return;
      if (fresh) {
        celebrate({
          title: `Pass level ${level}`,
          line: level - cur.announced > 1 ? `Up ${level - cur.announced} levels. New rewards are waiting on the Season Pass.` : "New rewards are waiting on the Season Pass.",
          icon: Award,
        });
      }
    };
    check();
    window.addEventListener("cs-quests", check);
    const id = window.setInterval(check, RECHECK_MS);
    return () => {
      window.removeEventListener("cs-quests", check);
      window.clearInterval(id);
    };
  }, [celebrate]);
  return null;
}
