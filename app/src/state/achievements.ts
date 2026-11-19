/**
 * Achievements: milestones read from what the station already records (play time, tasks, draws, the collection,
 * settings). Data and plain functions only (no React or storage), so the Node tests can load it.
 *
 * An achievement unlocks the first time its number reaches its target and stays unlocked for good, even if the
 * number later drops (a reset rank, a backup restored). They give no Credits: they are a record, not an economy.
 */

export type Tier = "bronze" | "silver" | "gold";
export type AchievementCategory = "play" | "tasks" | "draw" | "collection" | "station";

/** Everything the achievements read, gathered from the stores by the caller. */
export interface AchievementSnapshot {
  minutesTotal: number;
  tasksClaimed: number;
  checkinDays: number;
  draws: number;
  skinsOwned: number;
  fiveStarSkins: number;
  themesUnlocked: number;
  widgetsWon: number;
  nameSet: boolean;
  skinEquipped: boolean;
  newsRead: number;
}

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  tier: Tier;
  name: string;
  /** What to do, as an instruction. */
  how: string;
  target: number;
  value: (s: AchievementSnapshot) => number;
}

const n = (b: boolean) => (b ? 1 : 0);

export const CATEGORIES: readonly { id: AchievementCategory; name: string; blurb: string }[] = [
  { id: "play", name: "Time on station", blurb: "Counted play time and ranks." },
  { id: "tasks", name: "Tasks", blurb: "Quests claimed and days checked in." },
  { id: "draw", name: "Draws", blurb: "Pulls across every pack." },
  { id: "collection", name: "Collection", blurb: "Themes, card skins and dashboard cards." },
  { id: "station", name: "Your station", blurb: "Making the station yours." },
];

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "play-first", category: "play", tier: "bronze", name: "Clocked in", how: "Count your first 10 minutes of play.", target: 10, value: (s) => s.minutesTotal },
  { id: "play-10h", category: "play", tier: "silver", name: "Regular hours", how: "Count 10 hours of play.", target: 600, value: (s) => s.minutesTotal },
  { id: "play-50h", category: "play", tier: "gold", name: "Long haul", how: "Count 50 hours of play.", target: 3000, value: (s) => s.minutesTotal },

  { id: "tasks-5", category: "tasks", tier: "bronze", name: "First few", how: "Claim 5 quests.", target: 5, value: (s) => s.tasksClaimed },
  { id: "tasks-25", category: "tasks", tier: "silver", name: "Reliable", how: "Claim 25 quests.", target: 25, value: (s) => s.tasksClaimed },
  { id: "tasks-100", category: "tasks", tier: "gold", name: "Never idle", how: "Claim 100 quests.", target: 100, value: (s) => s.tasksClaimed },
  { id: "checkin-7", category: "tasks", tier: "silver", name: "Week in a row", how: "Check in on 7 different days.", target: 7, value: (s) => s.checkinDays },

  { id: "draw-1", category: "draw", tier: "bronze", name: "First pull", how: "Make your first draw.", target: 1, value: (s) => s.draws },
  { id: "draw-50", category: "draw", tier: "silver", name: "Regular at the counter", how: "Make 50 draws.", target: 50, value: (s) => s.draws },
  { id: "draw-200", category: "draw", tier: "gold", name: "High roller", how: "Make 200 draws.", target: 200, value: (s) => s.draws },

  { id: "skin-1", category: "collection", tier: "bronze", name: "New coat", how: "Own a card skin.", target: 1, value: (s) => s.skinsOwned },
  { id: "skin-5star", category: "collection", tier: "silver", name: "Moving light", how: "Own a 5-star card skin.", target: 1, value: (s) => s.fiveStarSkins },
  { id: "skin-9", category: "collection", tier: "gold", name: "Half the wardrobe", how: "Own 9 card skins.", target: 9, value: (s) => s.skinsOwned },
  { id: "theme-1", category: "collection", tier: "bronze", name: "Fresh paint", how: "Unlock a theme.", target: 1, value: (s) => s.themesUnlocked },
  { id: "theme-10", category: "collection", tier: "silver", name: "Gallery", how: "Unlock 10 themes.", target: 10, value: (s) => s.themesUnlocked },
  { id: "widget-1", category: "collection", tier: "bronze", name: "New card", how: "Win a dashboard card from the Widget Pack.", target: 1, value: (s) => s.widgetsWon },

  { id: "name", category: "station", tier: "bronze", name: "Name on the door", how: "Set your name in Vault, This PC.", target: 1, value: (s) => n(s.nameSet) },
  { id: "equip", category: "station", tier: "bronze", name: "Dressed up", how: "Equip a card skin.", target: 1, value: (s) => n(s.skinEquipped) },
  { id: "news-20", category: "station", tier: "bronze", name: "Well read", how: "Read 20 stories on the News board.", target: 20, value: (s) => s.newsRead },
];

export const ACHIEVEMENTS_KEY = "cs.achievements";

export interface AchievementState {
  v: 1;
  /** Achievement id -> when it unlocked (ms). */
  unlocked: Record<string, number>;
  /** False until the first check has run; that check unlocks quietly so an existing player is not flooded. */
  seeded: boolean;
}

export const emptyAchievements = (): AchievementState => ({ v: 1, unlocked: {}, seeded: false });

const KNOWN = new Set(ACHIEVEMENTS.map((a) => a.id));

export function cleanAchievements(raw: unknown): AchievementState {
  const out = emptyAchievements();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  out.seeded = r.seeded === true;
  if (r.unlocked && typeof r.unlocked === "object" && !Array.isArray(r.unlocked)) {
    for (const [id, t] of Object.entries(r.unlocked as Record<string, unknown>)) {
      if (KNOWN.has(id) && typeof t === "number" && Number.isFinite(t) && t > 0) out.unlocked[id] = t;
    }
  }
  return out;
}

/**
 * Unlocks what the snapshot reaches. `fresh` lists the ones to announce: empty on the first (seeding) check.
 * Returns the same state object when nothing changes.
 */
export function evaluate(state: AchievementState, snap: AchievementSnapshot, now: number): { state: AchievementState; fresh: AchievementDef[] } {
  const reached = ACHIEVEMENTS.filter((a) => !state.unlocked[a.id] && a.value(snap) >= a.target);
  if (!reached.length && state.seeded) return { state, fresh: [] };
  const unlocked = { ...state.unlocked };
  for (const a of reached) unlocked[a.id] = now;
  return { state: { v: 1, unlocked, seeded: true }, fresh: state.seeded ? reached : [] };
}

/** How far along one achievement is, for its progress bar. */
export function progressOf(a: AchievementDef, snap: AchievementSnapshot): { have: number; share: number } {
  const have = Math.max(0, Math.min(a.value(snap), a.target));
  return { have, share: a.target ? have / a.target : 1 };
}

export function tierTally(state: AchievementState): Record<Tier, number> {
  const out: Record<Tier, number> = { bronze: 0, silver: 0, gold: 0 };
  for (const a of ACHIEVEMENTS) if (state.unlocked[a.id]) out[a.tier]++;
  return out;
}

export function categoryTally(state: AchievementState, category: AchievementCategory): { have: number; of: number } {
  const list = ACHIEVEMENTS.filter((a) => a.category === category);
  return { have: list.filter((a) => state.unlocked[a.id]).length, of: list.length };
}
