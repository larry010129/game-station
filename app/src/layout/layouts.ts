import type { Layout, Layouts } from "react-grid-layout";

/** Every card the dashboard can show. `size` is [width, height] in 24-column grid units; `min` is the smallest readable size. */
export interface CardDef {
  name: string;
  group: string;
  blurb: string;
  size: [number, number];
  min: [number, number];
  /** Shown on a fresh install. Everything else is added from the Cards list. */
  on?: boolean;
  /** Ways the card can be drawn. The user picks one per card on the dashboard. */
  looks?: readonly { id: string; name: string }[];
}

/** The five ways the world clock card can be drawn. */
export const CLOCK_LOOKS = [
  { id: "rulers", name: "Rulers" },
  { id: "ring", name: "24-hour ring" },
  { id: "curve", name: "Day curve" },
  { id: "levels", name: "Offset levels" },
  { id: "headline", name: "Headline" },
] as const;

export const CARDS = {
  gpu: { name: "GPU", group: "This PC", blurb: "Temperature with a limit gauge", size: [6, 8], min: [3, 7], on: true },
  load: { name: "Load", group: "This PC", blurb: "CPU and GPU load", size: [3, 6], min: [3, 5], on: true },
  uplink: { name: "Uplink", group: "Connection", blurb: "Ping to the region and your router", size: [3, 6], min: [3, 5], on: true },
  chart: { name: "Players online", group: "Overwatch", blurb: "Hourly players and the world map", size: [12, 22], min: [8, 10], on: true },
  alerts: { name: "Alerts and events", group: "This PC", blurb: "What happened this session", size: [6, 9], min: [4, 6], on: true },
  gamemode: { name: "Game mode", group: "Game", blurb: "One-tap game mode with undo", size: [6, 11], min: [5, 9], on: true },
  feed: { name: "Overwatch feed", group: "Overwatch", blurb: "News, patch notes and leaks", size: [6, 9], min: [5, 6], on: true },
  deck: { name: "Stream Deck", group: "Game", blurb: "Stream Deck + preview", size: [6, 13], min: [4, 10], on: true },
  media: { name: "Now playing", group: "Media", blurb: "Spotify and other media: title, art, play, skip", size: [6, 9], min: [4, 7], on: true },
  memory: { name: "Memory", group: "This PC", blurb: "RAM used and the top apps using it", size: [6, 8], min: [4, 7] },
  power: { name: "Power and battery", group: "This PC", blurb: "Battery, charge watts, unplugged warning", size: [6, 8], min: [4, 7] },
  regionping: { name: "Ping by region", group: "Connection", blurb: "Americas, Europe and Asia side by side", size: [6, 8], min: [4, 7] },
  jitter: { name: "Jitter and packet loss", group: "Connection", blurb: "Last 60 seconds of ping spread and drops", size: [6, 8], min: [4, 7] },
  wifi: { name: "Wi-Fi signal", group: "Connection", blurb: "Strength, band and network name", size: [6, 7], min: [4, 6] },
  verdict: { name: "Connection verdict", group: "Connection", blurb: "One line: good for ranked, or not", size: [6, 6], min: [4, 5] },
  trend: { name: "Player trend", group: "Overwatch", blurb: "Peak, low and the busiest hour", size: [6, 8], min: [4, 7] },
  patch: { name: "Patch summary", group: "Overwatch", blurb: "Latest patch, buffs against nerfs", size: [6, 9], min: [4, 7] },
  leaks: { name: "Leak watch", group: "Overwatch", blurb: "Only the leak posts, newest first", size: [6, 9], min: [4, 7] },
  season: { name: "Season countdown", group: "Overwatch", blurb: "Days left in the season", size: [6, 6], min: [4, 5] },
  steam: { name: "Steam news", group: "Overwatch", blurb: "Latest Overwatch posts on Steam", size: [6, 9], min: [4, 7] },
  queue: { name: "Best time to play", group: "Overwatch", blurb: "Busy and quiet hours in your time zone", size: [6, 8], min: [4, 7] },
  airesearch: { name: "Leak feed", group: "Overwatch", blurb: "Claude or Gemini searches the web for leaks every hour", size: [6, 20], min: [4, 10], on: true },
  tierlist: { name: "Hero tier list", group: "Meta", blurb: "S to F tiers from Counterwatch, by role", size: [6, 20], min: [4, 9], on: true },
  mappicks: { name: "Map hero picks", group: "Meta", blurb: "Pick a map: most played and best win-rate heroes", size: [6, 20], min: [4, 9], on: true },
  bestpicks: { name: "Best pick per role", group: "Meta", blurb: "The strongest hero for tank, damage and support", size: [6, 11], min: [4, 8] },
  heroprofile: { name: "Hero profile", group: "Meta", blurb: "Win rate, KDA radar, poke/dive/rush, vs role avg", size: [12, 22], min: [6, 16], on: true },
  session: { name: "Session timer", group: "Game", blurb: "How long you have played, with a break reminder", size: [6, 6], min: [4, 5] },
  playhistory: { name: "Play history", group: "Game", blurb: "Hours per day this week", size: [6, 8], min: [4, 7] },
  report: { name: "Session report", group: "Game", blurb: "Ping, load and temperature of your last session", size: [6, 8], min: [4, 7] },
  gmhistory: { name: "Game mode history", group: "Game", blurb: "Past runs and what they changed", size: [6, 8], min: [4, 7] },
  clocks: { name: "World clock", group: "Tools", blurb: "Time where your teammates are, in five looks you can switch", size: [6, 11], min: [4, 8], on: true, looks: CLOCK_LOOKS },
  notes: { name: "Pre-game checklist", group: "Tools", blurb: "Checklist and notes saved on this PC", size: [6, 9], min: [4, 7] },
  deckmap: { name: "Deck button map", group: "Tools", blurb: "What each Stream Deck key does", size: [6, 9], min: [4, 7] },
} as const satisfies Record<string, CardDef>;

export type CardId = keyof typeof CARDS;
export const CARD_IDS = Object.keys(CARDS) as CardId[];

/** Top-bar pages. Each card lives on one page, so the dashboard is not one long scroll. */
export const TABS = [
  { id: "station", label: "Station" },
  { id: "overwatch", label: "Overwatch" },
  { id: "gamemode", label: "Game mode" },
  { id: "devices", label: "Devices" },
  { id: "vault", label: "Vault" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

const TAB_OF_GROUP: Record<string, TabId> = {
  "This PC": "station",
  Connection: "station",
  Media: "station",
  Tools: "station",
  Overwatch: "overwatch",
  Meta: "overwatch",
  Game: "gamemode",
};

/** Which page a card belongs on. Stream Deck lives under Devices, not Game mode. */
export function tabOf(id: CardId): TabId {
  if (id === "deck" || id === "deckmap") return "devices";
  return TAB_OF_GROUP[CARDS[id].group] ?? "station";
}
export const CARD_NAMES = Object.fromEntries(CARD_IDS.map((id) => [id, CARDS[id].name])) as Record<CardId, string>;
export const DEFAULT_ON: CardId[] = CARD_IDS.filter((id) => "on" in CARDS[id]);

export const BREAKPOINTS = { lg: 1280, md: 760, sm: 0 };
export const COLS = { lg: 24, md: 12, sm: 1 };
export const ROW_HEIGHT = 20;
export const MARGIN: [number, number] = [12, 12];

type Box = [CardId, number, number, number, number];

function build(boxes: Box[], scale: number): Layout[] {
  return boxes.map(([i, x, y, w, h]) => ({
    i,
    x,
    y,
    w,
    h,
    minW: Math.ceil(CARDS[i].min[0] / scale),
    minH: CARDS[i].min[1],
  }));
}

// Desktop, 24 columns: left tiles, the chart in the middle, panels on the right.
const LG_CORE: Box[] = [
  ["gpu", 0, 0, 6, 8],
  ["load", 0, 8, 3, 6],
  ["uplink", 3, 8, 3, 6],
  ["media", 0, 14, 6, 9],
  ["chart", 6, 0, 12, 22],
  ["alerts", 18, 0, 6, 9],
  ["gamemode", 18, 9, 6, 11],
  ["feed", 18, 20, 6, 9],
  ["deck", 18, 29, 6, 13],
];
// Tablet, 12 columns: the chart across the top, two columns below.
const MD_CORE: Box[] = [
  ["chart", 0, 0, 12, 13],
  ["gpu", 0, 13, 6, 8],
  ["load", 0, 21, 3, 6],
  ["uplink", 3, 21, 3, 6],
  ["media", 0, 27, 6, 9],
  ["alerts", 6, 13, 6, 9],
  ["gamemode", 6, 22, 6, 11],
  ["feed", 6, 33, 6, 9],
  ["deck", 6, 42, 6, 13],
];

const CORE = new Set<CardId>(LG_CORE.map((b) => b[0]));
const EXTRA = CARD_IDS.filter((id) => !CORE.has(id));
// Extra cards start below everything; the grid packs them upward into free space.
/** Stacks the extra cards in columns under the core grid, so tall cards never overlap the next row. */
function stack(cols: number, colW: number, top: number, width: (id: CardId) => number): Box[] {
  const heights = Array.from({ length: cols }, () => top);
  return EXTRA.map((id): Box => {
    const k = heights.indexOf(Math.min(...heights));
    const h = CARDS[id].size[1];
    const box: Box = [id, k * colW, heights[k], width(id), h];
    heights[k] += h;
    return box;
  });
}
const LG: Box[] = [...LG_CORE, ...stack(4, 6, 60, (id) => CARDS[id].size[0])];
const MD: Box[] = [...MD_CORE, ...stack(2, 6, 80, () => 6)];

// Phone: one column in a fixed order. Not editable at this width.
const SM_ORDER: [CardId, number][] = [
  ["chart", 12],
  ["media", 9],
  ["gamemode", 11],
  ["alerts", 9],
  ["gpu", 8],
  ["load", 6],
  ["uplink", 6],
  ["feed", 9],
  ["deck", 13],
  ...EXTRA.map((id): [CardId, number] => [id, CARDS[id].size[1]]),
];

export const DEFAULT_LAYOUTS: Layouts = {
  lg: build(LG, 1),
  md: build(MD, 2),
  sm: SM_ORDER.reduce<Layout[]>((acc, [i, h]) => {
    const y = acc.length ? acc[acc.length - 1].y + acc[acc.length - 1].h : 0;
    acc.push({ i, x: 0, y, w: 1, h, static: true });
    return acc;
  }, []),
};

/** One card on the dashboard. The same card type can appear many times, each with its own id and look. */
export interface CardInstance {
  id: string;
  type: CardId;
  look?: string;
}

export const defaultLook = (type: CardId): string | undefined => (CARDS[type] as CardDef).looks?.[0].id;

export function defaultInstances(): CardInstance[] {
  return DEFAULT_ON.map((type) => ({ id: type, type, look: defaultLook(type) }));
}

/** Where a fresh card goes when it has no position yet: at the bottom, and the grid packs it upward. */
export const BOTTOM = 100000;

const mins = (type: CardId, bp: "lg" | "md") => ({
  minW: bp === "md" ? Math.ceil(CARDS[type].min[0] / 2) : CARDS[type].min[0],
  minH: CARDS[type].min[1],
});

/** A new card's box, `w` and `h` taken from its default size. */
export function newBox(inst: CardInstance, bp: "lg" | "md", at?: { x: number; y: number }): Layout {
  const [w0, h] = CARDS[inst.type].size;
  const w = bp === "md" ? Math.min(12, w0) : w0;
  return { i: inst.id, x: at ? Math.max(0, Math.min(at.x, COLS[bp] - w)) : 0, y: at ? at.y : BOTTOM, w, h, ...mins(inst.type, bp) };
}

/**
 * Keeps a saved layout usable for these cards: every card present, nothing
 * smaller than its minimum, nothing past the right edge. A card with no saved
 * position gets its default spot (when it is one of the starting cards) or
 * goes to the bottom.
 */
export function sanitize(saved: Layouts | null | undefined, instances: CardInstance[]): Layouts {
  let y = 0;
  const sm = instances.map((inst) => {
    const h = CARDS[inst.type].size[1];
    const item: Layout = { i: inst.id, x: 0, y, w: 1, h, static: true };
    y += h;
    return item;
  });
  const out: Layouts = { sm };
  for (const bp of ["lg", "md"] as const) {
    const cols = COLS[bp];
    const got = saved?.[bp] ?? [];
    out[bp] = instances.map((inst) => {
      const m = mins(inst.type, bp);
      const base = got.find((g) => g.i === inst.id) ?? (inst.id === inst.type ? DEFAULT_LAYOUTS[bp]?.find((g) => g.i === inst.id) : undefined);
      if (!base) return newBox(inst, bp);
      const w = Math.min(cols, Math.max(base.w, m.minW));
      const h = Math.max(base.h, m.minH);
      return { i: inst.id, x: Math.max(0, Math.min(base.x, cols - w)), y: Math.max(0, base.y), w, h, ...m };
    });
  }
  return out;
}
