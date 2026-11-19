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
  gpu: { name: "GPU", group: "This PC", blurb: "Temperature with a limit gauge", size: [6, 4], min: [3, 4], on: true },
  load: { name: "Load", group: "This PC", blurb: "CPU and GPU load", size: [3, 5], min: [3, 5], on: true },
  uplink: { name: "Uplink", group: "Connection", blurb: "Ping to the region and your router", size: [3, 4], min: [3, 4], on: true },
  chart: { name: "Players online", group: "Overwatch", blurb: "Hourly players and the world map", size: [12, 22], min: [8, 10], on: true },
  alerts: { name: "Alerts and events", group: "This PC", blurb: "What happened this session", size: [6, 9], min: [4, 6], on: true },
  gamemode: { name: "Game mode", group: "Game", blurb: "One-tap game mode with undo", size: [6, 11], min: [5, 9], on: true },
  feed: { name: "Overwatch feed", group: "Overwatch", blurb: "News, patch notes and leaks", size: [6, 9], min: [5, 6], on: true },
  media: { name: "Now playing", group: "Media", blurb: "Spotify and other media: title, art, play, skip", size: [6, 9], min: [4, 7], on: true },
  calendar: { name: "Calendar", group: "Tools", blurb: "Month at a glance and what is next. Click to open the calendar", size: [6, 12], min: [4, 9] },
  spotify: { name: "Spotify control", group: "Media", blurb: "Play, skip, volume, shuffle and device for any Spotify account", size: [6, 12], min: [4, 9] },
  wavelink: { name: "Wave Link", group: "Media", blurb: "Elgato Wave Link 3: mic mute, mix and channel volumes", size: [6, 24], min: [4, 12] },
  memory: { name: "Memory", group: "This PC", blurb: "RAM used and the top apps using it", size: [6, 8], min: [4, 7] },
  power: { name: "Power and battery", group: "This PC", blurb: "Battery, charge watts, unplugged warning", size: [6, 8], min: [4, 7] },
  regionping: { name: "Ping by region", group: "Connection", blurb: "Americas, Europe and Asia side by side", size: [6, 8], min: [4, 7] },
  jitter: { name: "Jitter and packet loss", group: "Connection", blurb: "Last 60 seconds of ping spread and drops", size: [6, 8], min: [4, 7] },
  wifi: { name: "Wi-Fi signal", group: "Connection", blurb: "Strength, band and network name", size: [6, 7], min: [4, 6] },
  verdict: { name: "Connection verdict", group: "Connection", blurb: "Ranked-ready status from the metrics you pick", size: [6, 9], min: [4, 7] },
  trend: { name: "Player trend", group: "Overwatch", blurb: "Peak, low and the busiest hour", size: [6, 8], min: [4, 7] },
  patch: { name: "Patch summary", group: "Overwatch", blurb: "Latest patch, buffs against nerfs", size: [6, 9], min: [4, 7] },
  season: { name: "Season countdown", group: "Overwatch", blurb: "Days left in the season", size: [6, 6], min: [4, 5] },
  steam: { name: "Steam news", group: "Overwatch", blurb: "Latest Overwatch posts on Steam", size: [6, 9], min: [4, 7] },
  queue: { name: "Best time to play", group: "Overwatch", blurb: "Busy and quiet hours in your time zone", size: [6, 8], min: [4, 7] },
  airesearch: { name: "Leak feed", group: "Overwatch", blurb: "Hourly leak headlines from Google News, Reddit and YouTube", size: [6, 20], min: [4, 10], on: true },
  tierlist: { name: "Hero tier list", group: "Meta", blurb: "S to F tiers from Counterwatch, by role", size: [6, 20], min: [4, 9], on: true },
  mappicks: { name: "Map hero picks", group: "Meta", blurb: "Pick a map: most played and best win-rate heroes", size: [6, 20], min: [4, 9], on: true },
  bestpicks: { name: "Best pick per role", group: "Meta", blurb: "The strongest hero for tank, damage and support", size: [6, 11], min: [4, 8] },
  heroprofile: { name: "Hero profile", group: "Meta", blurb: "OW: poke/rush/dive · Apex: poke/dive/sustain + ALS pick rate", size: [12, 22], min: [6, 16], on: true },
  session: { name: "Session timer", group: "Game", blurb: "How long you have played, with a break reminder", size: [6, 6], min: [4, 5] },
  playhistory: { name: "Play history", group: "Game", blurb: "Hours per day this week", size: [6, 8], min: [4, 7] },
  report: { name: "Session report", group: "Game", blurb: "Ping, load and temperature of your last session", size: [6, 8], min: [4, 7] },
  gmhistory: { name: "Game mode history", group: "Game", blurb: "Past runs and what they changed", size: [6, 8], min: [4, 7] },
  clocks: { name: "World clock", group: "Tools", blurb: "Time where your teammates are, in five looks you can switch", size: [6, 11], min: [4, 8], on: true, looks: CLOCK_LOOKS },
  cost: { name: "App cost", group: "This PC", blurb: "How much CPU and memory this app uses, against its budget", size: [6, 8], min: [4, 7] },
  library: { name: "Game library", group: "Game", blurb: "Installed Steam games and Battle.net, one-tap play", size: [6, 12], min: [4, 8] },
  discord: { name: "Discord", group: "Media", blurb: "Who is in your voice channel, and your Discord notifications", size: [6, 16], min: [4, 11] },
  notes: { name: "Pre-game checklist", group: "Tools", blurb: "Checklist and notes saved on this PC", size: [6, 9], min: [4, 7] },
} as const satisfies Record<string, CardDef>;

export type CardId = keyof typeof CARDS;
export const CARD_IDS = Object.keys(CARDS) as CardId[];

/**
 * Top-bar pages. Home is the saved card set in one place. Each other card page keeps its smaller slice.
 * A "page" tab is drawn by its own component and has no card layout; `note` says so when Edit layout is pressed there.
 */
export const TABS = [
  { id: "home", label: "Home", kind: "cards" },
  { id: "station", label: "Station", kind: "cards" },
  { id: "overwatch", label: "Overwatch", kind: "cards" },
  { id: "gamemode", label: "Game mode", kind: "cards" },
  { id: "news", label: "News", kind: "page", note: "News is a page, not a card layout." },
  { id: "calendar", label: "Calendar", kind: "page", note: "The calendar is a page, not a card layout." },
  { id: "quests", label: "Quests", kind: "page", note: "Quests is a page, not a card layout." },
  { id: "checkin", label: "Check-in", kind: "page", note: "Daily check-in is a page, not a card layout." },
  { id: "pass", label: "Pass", kind: "page", note: "The Season Pass is a page, not a card layout." },
  { id: "perks", label: "Perks", kind: "page", note: "The perk tree is a page, not a card layout." },
  { id: "draw", label: "Draw", kind: "page", note: "Draw is a page, not a card layout." },
  { id: "wiki", label: "Wiki", kind: "page", note: "Wiki is a page, not a card layout." },
  { id: "credits", label: "Credits", kind: "page", note: "Credits is a page, not a card layout." },
  { id: "buy-credits", label: "Support", kind: "page", note: "Support is a page, not a card layout." },
  { id: "themes", label: "Themes", kind: "page", note: "Themes is a page, not a card layout." },
  { id: "vault", label: "Vault", kind: "page", note: "Vault is settings, not a card layout." },
  { id: "profile", label: "Profile", kind: "page", note: "Profile is a page, not a card layout." },
  { id: "achievements", label: "Achievements", kind: "page", note: "Achievements is a page, not a card layout." },
] as const;
export type BuiltinTabId = (typeof TABS)[number]["id"];
/** A built-in tab id, or the id of a tab the user added in the Vault. */
export type TabId = string;
/** The tabs that are a page of their own rather than a grid of cards. */
export type PageTabId = Extract<(typeof TABS)[number], { kind: "page" }>["id"];

/** The "not a card layout" message for a page tab, or null for a card tab. */
export function pageNote(id: TabId): string | null {
  const tab = TABS.find((t) => t.id === id);
  return tab && tab.kind === "page" ? tab.note : null;
}

const TAB_OF_GROUP: Record<string, TabId> = {
  "This PC": "station",
  Connection: "station",
  Media: "station",
  Tools: "station",
  Overwatch: "overwatch",
  Meta: "overwatch",
  Game: "gamemode",
};

/** Which page a card belongs on. */
export function tabOf(id: CardId): TabId {
  return TAB_OF_GROUP[CARDS[id].group] ?? "station";
}
export const CARD_NAMES = Object.fromEntries(CARD_IDS.map((id) => [id, CARDS[id].name])) as Record<CardId, string>;
export const DEFAULT_ON: CardId[] = CARD_IDS.filter((id) => "on" in CARDS[id]);

export const BREAKPOINTS = { lg: 1280, md: 760, sm: 0 };
/** In a split-view pane the two-column layout starts sooner, so a half-width pane is not a phone layout. */
export const PANE_BREAKPOINTS = { lg: 1280, md: 560, sm: 0 };
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
  ["gpu", 0, 0, 6, 4],
  ["load", 0, 4, 3, 5],
  ["uplink", 3, 4, 3, 4],
  ["media", 0, 9, 6, 9],
  ["chart", 6, 0, 12, 22],
  ["alerts", 18, 0, 6, 9],
  ["gamemode", 18, 9, 6, 11],
  ["feed", 18, 20, 6, 9],
];
// Tablet, 12 columns: the chart across the top, two columns below.
const MD_CORE: Box[] = [
  ["chart", 0, 0, 12, 13],
  ["gpu", 0, 13, 6, 4],
  ["load", 0, 17, 3, 5],
  ["uplink", 3, 17, 3, 4],
  ["media", 0, 22, 6, 9],
  ["alerts", 6, 13, 6, 9],
  ["gamemode", 6, 22, 6, 11],
  ["feed", 6, 33, 6, 9],
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
  ["gpu", 4],
  ["load", 5],
  ["uplink", 4],
  ["feed", 9],
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
  /** Held in place: the grid will not move or resize it. */
  locked?: boolean;
}

export type SizePreset = "S" | "M" | "L";
const PRESET_FACTOR: Record<SizePreset, number> = { S: 0.75, M: 1, L: 1.4 };

/** The width and height a size preset gives a card: M is its default, S and L scale it, never below its minimum. */
export function presetBox(type: CardId, bp: "lg" | "md", preset: SizePreset): { w: number; h: number } {
  const [w0, h0] = CARDS[type].size;
  const base = bp === "md" ? Math.min(12, w0) : w0;
  const m = mins(type, bp);
  const f = PRESET_FACTOR[preset];
  return { w: Math.min(COLS[bp], Math.max(m.minW, Math.round(base * f))), h: Math.max(m.minH, Math.round(h0 * f)) };
}

/** The distinct sizes the presets give this card, smallest first. A card whose minimum is already its default has no S. */
export function presetSizes(type: CardId, bp: "lg" | "md"): { preset: SizePreset; w: number; h: number }[] {
  const out: { preset: SizePreset; w: number; h: number }[] = [];
  for (const preset of ["S", "M", "L"] as const) {
    const b = presetBox(type, bp, preset);
    // Where two presets coincide the later one's name wins, so a card at its default size reads M.
    const same = out.findIndex((o) => o.w === b.w && o.h === b.h);
    if (same >= 0) out[same] = { preset, ...b };
    else out.push({ preset, ...b });
  }
  return out;
}

/** Which preset a size is exactly, or null for a size the user dragged to. M wins where presets coincide. */
export function presetOf(type: CardId, bp: "lg" | "md", w: number, h: number): SizePreset | null {
  for (const p of ["M", "S", "L"] as const) {
    const b = presetBox(type, bp, p);
    if (b.w === w && b.h === h) return p;
  }
  return null;
}

export const defaultLook = (type: CardId): string | undefined => (CARDS[type] as CardDef).looks?.[0].id;

export function defaultInstances(): CardInstance[] {
  return DEFAULT_ON.map((type) => ({ id: type, type, look: defaultLook(type) }));
}

/** The card types a tab shows: the ones the user picked for it, else the saved cards of its group (none on a tab the user added). */
export function tabCardTypes(tab: TabId, instances: readonly CardInstance[], chosen?: readonly CardId[]): CardId[] {
  if (chosen) return [...chosen];
  return [...new Set(instances.filter((inst) => tabOf(inst.type) === tab).map((inst) => inst.type))];
}

/**
 * Home shows the saved cards (minus any the user hid). Other pages show only the
 * saved cards that belong to that slice, or the ones the user picked for it.
 * Extra cards are added from the Cards list — Home no longer mounts the whole catalog.
 */
export function instancesForTab(tab: TabId, instances: CardInstance[], hidden: readonly CardId[] = [], chosen?: readonly CardId[]): CardInstance[] {
  if (tab !== "home") return instances.filter((inst) => (chosen ? chosen.includes(inst.type) : tabOf(inst.type) === tab));
  if (chosen) return instances.filter((inst) => chosen.includes(inst.type));
  return instances.filter((inst) => !hidden.includes(inst.type));
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
      // Any height at or above the card's minimum is kept as saved. (An older rule reset the retired
      // ten-pill defaults, 8 and 6 rows, to the new size; it also made those heights impossible to choose.)
      const raw = base.h;
      const h = Math.max(raw, m.minH);
      return { i: inst.id, x: Math.max(0, Math.min(base.x, cols - w)), y: Math.max(0, base.y), w, h, ...m };
    });
  }
  return out;
}

/**
 * Packs boxes into `cols` columns with no holes: each card, in Home's reading order (top to bottom, left to right),
 * goes where it sits lowest, leftmost first. A page that shows only some of Home's cards would otherwise keep
 * Home's column gaps, such as the empty strip where the chart used to be.
 */
export function packBoxes(boxes: Layout[], cols: number): Layout[] {
  const sky = new Array<number>(cols).fill(0);
  const order = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
  return order.map((item) => {
    const w = Math.min(item.w, cols);
    let bestX = 0;
    let bestY = Infinity;
    for (let x = 0; x + w <= cols; x++) {
      let top = 0;
      for (let c = x; c < x + w; c++) top = Math.max(top, sky[c]);
      if (top < bestY) {
        bestY = top;
        bestX = x;
      }
    }
    for (let c = bestX; c < bestX + w; c++) sky[c] = bestY + item.h;
    return { ...item, x: bestX, y: bestY, w };
  });
}

/**
 * A saved page layout that has an empty column band between cards (the strip left where a card Home has, and this page
 * does not, used to sit) is packed again. A layout with no such band is the user's own and stays exactly as saved.
 */
export function closeColumnGaps(boxes: Layout[], cols: number): Layout[] {
  const used = new Array<boolean>(cols).fill(false);
  for (const b of boxes) for (let c = Math.max(0, b.x); c < Math.min(cols, b.x + b.w); c++) used[c] = true;
  const first = used.indexOf(true);
  const last = used.lastIndexOf(true);
  const gap = first >= 0 && used.slice(first, last + 1).includes(false);
  return gap ? packBoxes(boxes, cols) : boxes;
}

/**
 * The boxes for a tab other than Home. A tab has its own layout once it has been opened. Until then its cards
 * start in Home's order, packed to the top left with no gaps.
 */
export function layoutsForTab(instances: CardInstance[], home: Layouts, own?: Layouts): Layouts {
  const ids = new Set(instances.map((inst) => inst.id));
  const pick = (bp: "lg" | "md"): Layout[] => {
    if (own) return (own[bp] ?? []).filter((item) => ids.has(item.i));
    const boxes = (home[bp] ?? []).filter((item) => ids.has(item.i) && item.y < BOTTOM);
    return packBoxes(boxes, COLS[bp]);
  };
  return layoutsFor(instances, { lg: pick("lg"), md: pick("md"), sm: [] });
}

/** Saved boxes for the cards on screen. Catalog cards with no saved box keep their default spot. */
export function layoutsFor(instances: CardInstance[], saved: Layouts): Layouts {
  const ids = new Set(instances.map((inst) => inst.id));
  const fill = (bp: "lg" | "md"): Layout[] => {
    const kept = (saved[bp] ?? []).filter((item) => ids.has(item.i));
    const have = new Set(kept.map((item) => item.i));
    const added = instances
      .filter((inst) => !have.has(inst.id))
      .map((inst) => {
        const preset = inst.id === inst.type ? DEFAULT_LAYOUTS[bp]?.find((item) => item.i === inst.id) : undefined;
        return preset ? { ...preset, i: inst.id } : newBox(inst, bp);
      });
    return [...kept, ...added];
  };
  let y = 0;
  const sm: Layout[] = instances.map((inst) => {
    const h = (saved.sm ?? []).find((item) => item.i === inst.id)?.h ?? CARDS[inst.type].size[1];
    const item: Layout = { i: inst.id, x: 0, y, w: 1, h, static: true };
    y += h;
    return item;
  });
  return { lg: fill("lg"), md: fill("md"), sm };
}
