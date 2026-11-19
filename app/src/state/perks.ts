/**
 * The Station perk tree. Data and plain functions only (no React or storage), so the Node tests can load it.
 *
 * The tree itself (about 1,500 nodes in eight classes around Station Core) is generated from the design workbook into
 * ../content/perkTreeData.ts. The rules:
 *
 * - Perk Points are earned, never bought: they come from the player level (state/playerLevel.ts): the start points, then
 *   the per-level bands, which end where everything a player can take has been paid for.
 * - A node can be taken once it touches a node you have. Taking a far node takes the shortest path to it, nearest
 *   first, and costs every node on the way.
 * - Your first points.starts paths out of Station Core make those classes your starting regions; after that the
 *   core's other links close and other classes are reached over the Bridges further out.
 * - Squares (Season Keys and Specials) cost no points, but a player holds at most points.squares of them; a Season
 *   Key uses a slot. Each class's Season Key opens Pass levels 46 to 60 and adds a small extra of its own (stat2).
 * - Nothing is given back one node at a time. One free reset per local calendar month refunds every point and frees
 *   the starting regions.
 * - If points earned ever fall below points spent (a restored backup), the newest nodes stop counting until there are
 *   points for them again; nothing is deleted.
 * - Only some effects are wired into the app so far (LIVE_STATS). The rest can be taken (they are the way through the
 *   tree) but do nothing yet, and the tree says so.
 */
import { PERK_TREE } from "../content/perkTreeData.ts";
import { pointsAtLevel } from "./playerLevel.ts";

export type PerkNodeType = "start" | "class" | "small" | "notable" | "gate" | "special" | "pentagon" | "keystone" | "bridge" | "ring";

export interface PerkNode {
  id: string;
  /** Class id, or "core" for Station Core. */
  region: string;
  type: PerkNodeType;
  name: string;
  /** What it does, as one sentence. */
  effect: string;
  /** Effect key; nodes with the same stat add up. "" for Station Core. */
  stat: string;
  value: number;
  cost: number;
  x: number;
  y: number;
  /** What pays it out: "Play time", "Quests", "Always"... */
  earnedBy: string;
  /** Drawing id in perkIcons.ts, without the "i-". */
  icon: string;
  /** A second effect, added on top (each class's Season Key has its own). */
  stat2?: string;
  /** Keystones and pentagons: an extra always-on line on top of the main effect. */
  passive?: string;
  value2?: number;
}

export interface PerkRegion {
  id: string;
  /** Class name, e.g. "Tycoon". */
  name: string;
  /** What the class is about, e.g. "Payroll". */
  focus: string;
  color: string;
}

export interface PerkPoints {
  start: number;
  perPassLevel: number;
  cap: number;
  /** How many classes a player can start in. */
  starts: number;
  /** How many squares (Season Keys and Specials) a player can hold. */
  squares: number;
  /** How many pentagons (five unique nodes per class) a player can hold. */
  pentagons: number;
}

/**
 * Player level pacing (decided 2026-11-18), worked out from the tree by design/perk-tree-sample/build.py. The rules are
 * the design; the numbers follow the tree, so the timing holds when nodes are added or removed. This is the earlier flat
 * model (one full class in a month). The app now runs on the level table in ../content/playerLevelData.ts
 * (state/playerLevel.ts); this block still reports the tree's costs (classCost, reachCost, treeCost).
 */
export interface PerkPacing {
  rules: {
    counted: string;
    ref_hours_per_week: number;
    first_class_weeks: number;
    quick_levels: number;
    quick_minutes: number;
    xp_per_minute: number;
    points_per_level: number;
    start_points: number;
    max_level: number;
  };
  classCost: number;
  treeCost: number;
  /** Points a player can ever take: every class to band III, plus bands IV and V in the 2 starting classes. */
  reachCost: number;
  topCost: number;
  topName: string;
  classLevel: number;
  treeLevel: number;
  maxLevel: number;
  flatXp: number;
  flatHours: number;
  quickXp: number;
  hours: { firstClass: number; secondClass: number; tree: number };
}

export interface PerkTreeData {
  points: PerkPoints;
  pacing: PerkPacing;
  regions: PerkRegion[];
  /** Effect key -> [label, unit]; unit is "%", "×" (on or off) or "" (a count). */
  statLabels: Record<string, [string, string]>;
  nodes: PerkNode[];
  edges: [string, string][];
}

export const TREE: PerkTreeData = PERK_TREE;
export const POINTS = TREE.points;
export const MAX_STARTS = POINTS.starts;
export const MAX_SQUARES = POINTS.squares;
export const MAX_PENTAGONS = POINTS.pentagons;

export const NODES = TREE.nodes;
const BY_ID = new Map(NODES.map((n) => [n.id, n]));
export const nodeById = (id: string): PerkNode | undefined => BY_ID.get(id);
export const START_ID = NODES.find((n) => n.type === "start")!.id;

const REGION_BY_ID = new Map(TREE.regions.map((r) => [r.id, r]));
export const regionById = (id: string): PerkRegion => REGION_BY_ID.get(id) ?? REGION_BY_ID.get("core")!;
/** The eight classes, without Station Core. */
export const CLASSES = TREE.regions.filter((r) => r.id !== "core");

/** Every node's neighbours. Built once: the effects are read every few seconds. */
const ADJ = new Map<string, string[]>(NODES.map((n) => [n.id, []]));
for (const [a, b] of TREE.edges) {
  ADJ.get(a)?.push(b);
  ADJ.get(b)?.push(a);
}
export const neighbours = (id: string): readonly string[] => ADJ.get(id) ?? [];

/** Class id -> the node Station Core links to in that class. */
export const CORE_LINK: Record<string, string> = {};
for (const id of neighbours(START_ID)) CORE_LINK[BY_ID.get(id)!.region] = id;

/** Effects the app applies today. Every other stat is drawn and can be taken, but does nothing yet. */
export const LIVE_STATS: ReadonlySet<string> = new Set([
  "creditsPerHour",
  "playCreditPct",
  "questCreditPct",
  "allCreditPct",
  "passXpPct",
  "passCap",
  "passLevelCap",
]);
export const isLive = (n: PerkNode): boolean => n.type === "start" || LIVE_STATS.has(n.stat);
/** Whether a node's second effect (if it has one) is applied yet. */
export const extraLive = (n: PerkNode): boolean => !n.stat2 || LIVE_STATS.has(n.stat2);

/** Squares: free to take, but a player holds at most MAX_SQUARES. */
export const isSquare = (n: PerkNode | undefined): boolean => n?.type === "gate" || n?.type === "special";
export const squaresHeld = (s: Pick<PerkState, "taken">): number => s.taken.filter((id) => isSquare(BY_ID.get(id))).length;
/** Season Keys: every class has one, but a player holds only one. */
export const isKey = (n: PerkNode | undefined): boolean => n?.type === "gate";
export const keyHeld = (s: Pick<PerkState, "taken">): boolean => s.taken.some((id) => isKey(BY_ID.get(id)));

/** Pentagons: free to take, but a player holds at most MAX_PENTAGONS. */
export const isPentagon = (n: PerkNode | undefined): boolean => n?.type === "pentagon";
export const pentagonsHeld = (s: Pick<PerkState, "taken">): number => s.taken.filter((id) => isPentagon(BY_ID.get(id))).length;

/**
 * Bands IV, V and VI (the outermost three) of a class open only to a player who started in that class: its first node
 * must be taken as one of their starting classes. The class comes from the node id (`payroll-b4-…`), so guest
 * small nodes and bridges count for the class whose band they sit in.
 *
 * Band VI can be taken in only ONE class: the class whose band VI the player started. It has three branches (a, b, c),
 * each 8 nodes along the class's constellation: an opening notable with a passive, 5 small with the branch's own stat, a mid
 * notable, then that branch's own "VI●" keystone. All three cost the same. The player takes only ONE branch. The first band VI
 * node taken closes band VI in every other class and the other two branches; a reset frees the choice.
 */
export const LOCKED_BANDS = [4, 5, 6];
export const BAND_SIX = 6;
export function lockedClass(id: string): string | null {
  const m = /^([a-z]+)-b(\d+)-/.exec(id);
  return m && LOCKED_BANDS.includes(Number(m[2])) ? m[1] : null;
}
export const isBandSix = (id: string): boolean => /^[a-z]+-b6-/.test(id);
/** The branch letter of a band VI node (`payroll-b6-a1`, `…-am`, `…-ak`), or null for every other band. */
export function bandSixBranch(id: string): string | null {
  const m = /^[a-z]+-b6-([abc])(?:\d+|m|k)$/.exec(id);
  return m ? m[1] : null;
}
/** The branch the player started (the first branch node taken), or null while none is. */
export function chosenBranch(taken: readonly string[]): string | null {
  for (const id of taken) {
    const b = bandSixBranch(id);
    if (b) return b;
  }
  return null;
}
/** The class whose band VI is started (its first taken node), or null while none is. */
export function bandSixOwner(taken: readonly string[]): string | null {
  const id = taken.find(isBandSix);
  return id ? (lockedClass(id) ?? null) : null;
}
/**
 * Is this node shut to the player? Its band is IV to VI and they did not start in its class, or it is band VI and
 * another class already owns band VI, or it is on a band VI branch they did not choose. `taken` is what they hold
 * (only band VI needs it).
 */
export const bandLocked = (starts: readonly string[], id: string, taken: readonly string[] = []): boolean => {
  const c = lockedClass(id);
  if (c === null || !starts.includes(c)) return c !== null;
  if (!isBandSix(id)) return false;
  const owner = bandSixOwner(taken);
  if (owner !== null && owner !== c) return true;
  const branch = bandSixBranch(id);
  const chosen = chosenBranch(taken);
  return branch !== null && chosen !== null && chosen !== branch;
};

export const PERKS_KEY = "cs.perkTree";

export interface PerkState {
  v: 2;
  /** Taken nodes (Station Core is always taken and not listed), in the order taken. */
  taken: string[];
  /** Starting classes, in the order chosen. */
  starts: string[];
  /** Local month (YYYY-MM) of the last reset, or null. */
  resetMonth: string | null;
}

export const emptyPerks = (): PerkState => ({ v: 2, taken: [], starts: [], resetMonth: null });

/** Is the link from Station Core into `region` open, given these starting classes? */
const coreLinkOpen = (starts: readonly string[], region: string) => starts.includes(region) || starts.length < MAX_STARTS;

/** Can you step from `a` to `b` (a link both ways), with these starting classes? Links out of the core close once every start is chosen. */
export function linkOpen(starts: readonly string[], a: string, b: string): boolean {
  if (a === START_ID) return coreLinkOpen(starts, BY_ID.get(b)!.region);
  if (b === START_ID) return coreLinkOpen(starts, BY_ID.get(a)!.region);
  return true;
}

/**
 * Turns anything read from storage into a valid state: known nodes only, at most MAX_STARTS starts (each with its
 * first node taken), and every node joined to Station Core by nodes taken before it.
 */
export function cleanPerks(raw: unknown): PerkState {
  const out = emptyPerks();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  const listed = Array.isArray(r.taken) ? r.taken.filter((id): id is string => typeof id === "string" && BY_ID.has(id) && id !== START_ID) : [];
  const wanted = Array.isArray(r.starts) ? r.starts.filter((id): id is string => typeof id === "string" && id in CORE_LINK) : [];
  // Saves from before the class nodes started at the class's first spoke node: put its class node in front.
  for (const region of wanted) {
    const old = `${region}-s1`;
    if (CORE_LINK[region] && !listed.includes(CORE_LINK[region]) && listed.includes(old)) listed.splice(listed.indexOf(old), 0, CORE_LINK[region]);
  }
  const starts = [...new Set(wanted)].filter((region) => listed.includes(CORE_LINK[region])).slice(0, MAX_STARTS);
  const have = new Set([START_ID]);
  let squares = 0;
  let pentagons = 0;
  let keys = 0;
  for (const id of listed) {
    if (have.has(id)) continue;
    // Squares past the limit are dropped (they are leaves, so nothing hangs off them).
    if (isSquare(BY_ID.get(id)) && squares >= MAX_SQUARES) continue;
    if (isPentagon(BY_ID.get(id)) && pentagons >= MAX_PENTAGONS) continue;
    if (bandLocked(starts, id, out.taken)) continue;
    if (isKey(BY_ID.get(id)) && keys >= 1) continue;
    if (neighbours(id).some((nb) => have.has(nb) && (nb !== START_ID || starts.includes(BY_ID.get(id)!.region)))) {
      have.add(id);
      out.taken.push(id);
      if (isSquare(BY_ID.get(id))) squares++;
      if (isPentagon(BY_ID.get(id))) pentagons++;
      if (isKey(BY_ID.get(id))) keys++;
    }
  }
  out.starts = starts.filter((region) => have.has(CORE_LINK[region]));
  out.resetMonth = typeof r.resetMonth === "string" && /^\d{4}-\d{2}$/.test(r.resetMonth) ? r.resetMonth : null;
  return out;
}

/** Points earned at a player level: 4 to start, then the level bands (more early, fewer later). */
export function pointsEarned(playerLevel: number): number {
  return pointsAtLevel(playerLevel);
}

export function pointsSpent(s: PerkState): number {
  return s.taken.reduce((n, id) => n + (BY_ID.get(id)?.cost ?? 0), 0);
}

export function pointsLeft(s: PerkState, earned: number): number {
  return Math.max(0, earned - pointsSpent(s));
}

/** The taken nodes that count: oldest first, stopping where the points run out. Each is joined to the core by earlier ones. */
export function activeNodes(s: PerkState, earned: number): string[] {
  const out: string[] = [];
  let left = earned;
  for (const id of s.taken) {
    const cost = BY_ID.get(id)?.cost ?? 0;
    if (cost > left) break;
    out.push(id);
    left -= cost;
  }
  return out;
}

export interface PerkPath {
  /** Nodes to take, nearest first. Empty when the target is already taken. */
  nodes: string[];
  /** The node you already have that the path leaves from (Station Core or a taken node). */
  from: string;
  cost: number;
  /** The class this path makes a new starting region, if it leaves Station Core into one. */
  opens: string | null;
}

/** Shortest path (fewest nodes) from what you have to `target`, or null when no open path reaches it. */
export function pathTo(s: PerkState, target: string): PerkPath | null {
  if (!BY_ID.has(target)) return null;
  const have = new Set([START_ID, ...s.taken]);
  if (have.has(target)) return { nodes: [], from: target, cost: 0, opens: null };
  const prev = new Map<string, string>();
  const queue = [...have];
  const seen = new Set(have);
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const nb of neighbours(cur)) {
      if (seen.has(nb) || !linkOpen(s.starts, cur, nb) || bandLocked(s.starts, nb, s.taken)) continue;
      seen.add(nb);
      prev.set(nb, cur);
      if (nb === target) {
        const nodes: string[] = [];
        let x = nb;
        while (!have.has(x)) {
          nodes.unshift(x);
          x = prev.get(x)!;
        }
        const first = BY_ID.get(nodes[0])!;
        const opens = x === START_ID && !s.starts.includes(first.region) ? first.region : null;
        return { nodes, from: x, cost: nodes.reduce((n, id) => n + BY_ID.get(id)!.cost, 0), opens };
      }
      queue.push(nb);
    }
  }
  return null;
}

export type TakeCheck = "ok" | "owned" | "closed" | "points" | "squares" | "pentagons" | "key";

export function canTake(s: PerkState, target: string, earned: number): TakeCheck {
  const p = pathTo(s, target);
  if (!p) return "closed";
  if (p.nodes.length === 0) return "owned";
  if (p.cost > pointsLeft(s, earned)) return "points";
  if (keyHeld(s) && p.nodes.some((id) => isKey(BY_ID.get(id)))) return "key";
  const more = p.nodes.filter((id) => isSquare(BY_ID.get(id))).length;
  if (more > 0 && squaresHeld(s) + more > MAX_SQUARES) return "squares";
  const pent = p.nodes.filter((id) => isPentagon(BY_ID.get(id))).length;
  return pent > 0 && pentagonsHeld(s) + pent > MAX_PENTAGONS ? "pentagons" : "ok";
}

/** Takes `target` and every node on the way to it. Returns the same state when it cannot. */
export function takeNode(s: PerkState, target: string, earned: number): PerkState {
  if (canTake(s, target, earned) !== "ok") return s;
  const p = pathTo(s, target)!;
  return { ...s, taken: [...s.taken, ...p.nodes], starts: p.opens ? [...s.starts, p.opens] : s.starts };
}

const pad = (n: number) => String(n).padStart(2, "0");
export const monthKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function canReset(s: PerkState, now: Date): boolean {
  return s.taken.length > 0 && s.resetMonth !== monthKey(now);
}

export function resetPerks(s: PerkState, now: Date): PerkState {
  return canReset(s, now) ? { v: 2, taken: [], starts: [], resetMonth: monthKey(now) } : s;
}

/** Base Season Pass level cap, and the cap once any Season Key is taken. */
export const PASS_CAP_BASE = 45;
export const PASS_CAP_KEY = 60;

export interface PerkEffects {
  /** Extra Income per counted hour. */
  creditsPerHour: number;
  /** Percent more Income from play (counted minutes and the hourly bonus). */
  playIncomePct: number;
  /** Percent more Income from claimed quests. */
  questIncomePct: number;
  /** Percent more on every Income earned: play, quests and Season Pass rewards. */
  allIncomePct: number;
  /** Season Pass XP multiplier, 1 or more. */
  passXpMult: number;
  /** Extra Season Pass XP allowed per week. */
  passCapBonus: number;
  /** Highest Season Pass level that can be reached: 45, or 60 with any Season Key. */
  passLevelCap: number;
}

/** Each stat summed over the given nodes. */
export function statTotals(ids: readonly string[]): Record<string, number> {
  const tot: Record<string, number> = {};
  for (const id of ids) {
    const n = BY_ID.get(id);
    if (!n) continue;
    if (n.stat) tot[n.stat] = (tot[n.stat] ?? 0) + n.value;
    // A trade-off node's downside (a negative second effect) only counts while its gain is in force. Otherwise a node
    // whose gain does nothing yet would still cost the player something.
    if (n.stat2 && ((n.value2 ?? 0) >= 0 || isLive(n))) tot[n.stat2] = (tot[n.stat2] ?? 0) + (n.value2 ?? 0);
  }
  return tot;
}

/** A total never drops below base: the perk tree cannot make a player earn less than one with no perks. */
const floor0 = (n: number | undefined): number => Math.max(0, n ?? 0);

export function effectsOf(active: readonly string[]): PerkEffects {
  const t = statTotals(active);
  return {
    creditsPerHour: floor0(t.creditsPerHour),
    playIncomePct: floor0(t.playCreditPct),
    questIncomePct: floor0(t.questCreditPct),
    allIncomePct: floor0(t.allCreditPct),
    passXpMult: 1 + floor0(t.passXpPct) / 100,
    passCapBonus: floor0(t.passCap),
    // A Season Key opens levels 46 to 60 or not: a second one opens nothing more (its own extra still adds up).
    passLevelCap: (t.passLevelCap ?? 0) > 0 ? PASS_CAP_KEY : PASS_CAP_BASE,
  };
}

/** Bonus Income for the whole counted hours crossed going from one minute total to another. */
export function hourBonus(minutesBefore: number, minutesAfter: number, perHour: number): number {
  if (perHour <= 0 || minutesAfter <= minutesBefore) return 0;
  return (Math.floor(minutesAfter / 60) - Math.floor(Math.max(0, minutesBefore) / 60)) * perHour;
}

export type IncomeSource = "play" | "quest" | "pass";

/** The percent bonus that applies to Income from one source. */
export function incomePct(fx: PerkEffects, source: IncomeSource): number {
  return fx.allIncomePct + (source === "play" ? fx.playIncomePct : source === "quest" ? fx.questIncomePct : 0);
}

/**
 * Whole bonus Income for `base` Income at `pct` percent, carrying the fraction to the next payment so small payments
 * (a 15-second play tick pays 0 or 1) still add up. Returns the bonus and the new carry.
 */
export function percentBonus(base: number, pct: number, carry: number): { bonus: number; carry: number } {
  if (base <= 0 || pct <= 0) return { bonus: 0, carry };
  const due = Math.max(0, carry) + (base * pct) / 100;
  const bonus = Math.floor(due + 1e-9);
  return { bonus, carry: due - bonus };
}
