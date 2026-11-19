import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { readJson, readString, writeJson } from "../lib/storage";
import { useCelebrate } from "./Celebrate";
import { ACHIEVEMENTS_KEY, cleanAchievements, evaluate, type AchievementSnapshot, type AchievementState } from "./achievements";
import { cardSkinById } from "./cardSkins";
import { readCardSkins } from "./cardSkinStore";
import { cleanGacha } from "./gachaEngine";
import { cleanNewsRead, NEWS_READ_KEY } from "./newsRead";
import { checkinDays } from "./profile";
import { cleanUnlocks } from "./unlocks";
import { readQuests } from "./useQuests";
import { UNLOCK_KEY } from "./useTheme";
import { readWidgets } from "./widgetStore";

const EVENT = "cs-achievements";
/** The stores whose changes can unlock something. Theme unlocks and the name have no event; the timer covers them. */
const WATCH = ["cs-quests", "cs-gacha", "cs-card-skins", "cs-widgets", "cs-news-read", "storage"];
const RECHECK_MS = 30_000;

export function readAchievementSnapshot(): AchievementSnapshot {
  const quests = readQuests();
  const skins = readCardSkins();
  return {
    minutesTotal: quests.minutesTotal,
    tasksClaimed: quests.tasksClaimed,
    checkinDays: checkinDays(quests),
    draws: cleanGacha(readJson<unknown>("cs.gacha", null)).draws,
    skinsOwned: skins.owned.length,
    fiveStarSkins: skins.owned.filter((id) => cardSkinById(id)?.stars === 5).length,
    themesUnlocked: cleanUnlocks(readJson<unknown>(UNLOCK_KEY, [])).length,
    widgetsWon: readWidgets().owned.length,
    nameSet: (readString("cs.displayName") ?? "").trim().length > 0,
    skinEquipped: skins.equipped != null,
    newsRead: cleanNewsRead(readJson<unknown>(NEWS_READ_KEY, null), Date.now()).read.length,
  };
}

const readState = (): AchievementState => cleanAchievements(readJson<unknown>(ACHIEVEMENTS_KEY, null));

/** The saved unlocks and the numbers behind them, kept fresh for the Achievements page. */
export function useAchievements(): { state: AchievementState; snap: AchievementSnapshot } {
  const [view, setView] = useState(() => ({ state: readState(), snap: readAchievementSnapshot() }));
  useEffect(() => {
    const sync = () => setView({ state: readState(), snap: readAchievementSnapshot() });
    for (const e of [EVENT, ...WATCH]) window.addEventListener(e, sync);
    const id = window.setInterval(sync, RECHECK_MS);
    return () => {
      for (const e of [EVENT, ...WATCH]) window.removeEventListener(e, sync);
      window.clearInterval(id);
    };
  }, []);
  return view;
}

/**
 * Renders nothing. Checks for new achievements whenever a watched store changes (and every 30 seconds), saves them,
 * and celebrates each one. The first check on an install unlocks quietly.
 */
export function AchievementWatcher(): null {
  const celebrate = useCelebrate();
  useEffect(() => {
    const check = () => {
      const cur = readState();
      const { state, fresh } = evaluate(cur, readAchievementSnapshot(), Date.now());
      if (state === cur) return;
      if (!writeJson(ACHIEVEMENTS_KEY, state)) return;
      window.dispatchEvent(new Event(EVENT));
      if (fresh.length > 3) {
        celebrate({ title: `${fresh.length} achievements`, line: fresh.map((a) => a.name).join(", ") + ".", icon: Trophy });
        return;
      }
      for (const a of fresh) celebrate({ title: a.name, line: `Achievement unlocked. ${a.how}`, icon: Trophy });
    };
    check();
    for (const e of WATCH) window.addEventListener(e, check);
    const id = window.setInterval(check, RECHECK_MS);
    return () => {
      for (const e of WATCH) window.removeEventListener(e, check);
      window.clearInterval(id);
    };
  }, [celebrate]);
  return null;
}
