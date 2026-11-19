/**
 * Dashboard cards as Widget Pack prizes: each card's default stars and what it costs to run, plus the lock rules.
 * Data and plain functions only (no React, storage or layouts.ts), so Node tests can load it.
 *
 * Stars follow resource use (GACHA rule): 5-star cards are the ones the limiter has to hold back, meaning cards that
 * poll every few seconds, call an outside service, or keep working during a game. The limiter is `useEvery(normal,
 * slow)` in src/cards/ui.tsx. The CMS can change any card's stars per release.
 */
import { DEFAULT_CARD_BUY, getContent, widgetPackOf, widgetStatus, type CardBuy, type GachaContent } from "./gachaContent.ts";

export interface WidgetCost {
  stars: 4 | 5;
  /** One line on what the card costs to run, for the Wiki and the Draw preview. */
  use: string;
}

const SAMPLED = "Uses the station's own sensor sampling; no polling of its own.";
const NET = "/api/net every 2 s, shared by the four network cards; stops during a game.";
const META = "Meta data every 10 minutes; stops during a game.";

/** Every dashboard card id (the keys of CARDS in layouts.ts; a test keeps the two lists equal). */
export const WIDGET_COST: Record<string, WidgetCost> = {
  gpu: { stars: 4, use: SAMPLED },
  load: { stars: 4, use: SAMPLED },
  uplink: { stars: 4, use: SAMPLED },
  alerts: { stars: 4, use: "Lists this session's events; no polling of its own." },
  gamemode: { stars: 4, use: "Runs only when you press it; no polling of its own." },
  chart: { stars: 5, use: "Player data every 10 minutes plus a live world-map render (d3-geo and the world atlas)." },
  feed: { stars: 4, use: "Shows the shared news feed (checked every 5 minutes); no polling of its own." },
  media: { stars: 5, use: "/api/media every 2 s, and every 15 s during a game." },
  calendar: { stars: 4, use: "Reads your saved calendar and game events; no fast polling." },
  spotify: { stars: 5, use: "/api/spotify every 3 s through the Spotify Web API, and every 20 s during a game." },
  wavelink: { stars: 5, use: "/api/wavelink every 2 s, and every 4 s during a game: it never stops." },
  memory: { stars: 4, use: "/api/system every 5 s, and every 30 s during a game." },
  power: { stars: 4, use: "/api/system every 10 s, and every 60 s during a game." },
  regionping: { stars: 4, use: NET },
  jitter: { stars: 4, use: NET },
  wifi: { stars: 4, use: NET },
  verdict: { stars: 4, use: NET },
  trend: { stars: 4, use: "Uses the shared player data; no polling of its own." },
  patch: { stars: 4, use: "Uses the shared news feed; no polling of its own." },
  season: { stars: 4, use: META },
  steam: { stars: 4, use: "/api/steam every 10 minutes; stops during a game." },
  queue: { stars: 4, use: "Uses the shared player data; no polling of its own." },
  airesearch: { stars: 5, use: "Hourly leak scraping from Google News, Reddit and YouTube on the service." },
  tierlist: { stars: 4, use: META },
  mappicks: { stars: 4, use: META },
  bestpicks: { stars: 4, use: META },
  heroprofile: { stars: 5, use: "Per-hero meta fetches and scrapes (Counterwatch, ALS) whenever you pick a hero." },
  session: { stars: 4, use: "/api/sessions every 10 s, and every 60 s during a game." },
  playhistory: { stars: 4, use: "/api/sessions every 10 s, and every 60 s during a game." },
  report: { stars: 4, use: "/api/sessions every 10 s, and every 60 s during a game." },
  gmhistory: { stars: 4, use: "/api/gamemode/history every 15 s; stops during a game." },
  clocks: { stars: 4, use: "Ticks every second on this PC, and every 15 s during a game." },
  cost: { stars: 4, use: "/api/cost every 15 s, and every 30 s during a game." },
  library: { stars: 4, use: "/api/library every 60 s; stops during a game." },
  discord: { stars: 5, use: "/api/discord every 3 s through Discord RPC, and every 10 s during a game." },
  notes: { stars: 4, use: "Saved on this PC; no polling." },
};

export const WIDGET_IDS: readonly string[] = Object.keys(WIDGET_COST);
export const isWidgetId = (id: unknown): id is string => typeof id === "string" && id in WIDGET_COST;

/** Cards the Widget Pack can give now (Available), by stars. Ids this app does not know are left out. */
export function drawableWidgets(stars: 4 | 5, content: GachaContent = getContent()): string[] {
  return widgetPackOf(content)
    .widgets.filter((w) => w.status === "Available" && w.stars === stars && isWidgetId(w.id))
    .map((w) => w.id);
}

/** True when the Widget Pack is on and has at least one card to draw. */
export const widgetPackOn = (content: GachaContent = getContent()): boolean =>
  widgetPackOf(content).enabled && drawableWidgets(5, content).length + drawableWidgets(4, content).length > 0;

/** How cards can be bought in this release (the Card Pack's defaults when the Widget Pack sets none). */
export const widgetBuyOf = (content: GachaContent = getContent()): CardBuy => widgetPackOf(content).buy ?? DEFAULT_CARD_BUY;

/** Credits to buy a card now, or null: a draw-only tier, or the card is not Available. */
export function widgetPrice(id: string, content: GachaContent = getContent()): number | null {
  const w = widgetPackOf(content).widgets.find((x) => x.id === id);
  if (!w || w.status !== "Available" || !isWidgetId(id)) return null;
  const buy = widgetBuyOf(content);
  return w.stars === 5 ? buy.fivePrice : buy.fourPrice;
}

/**
 * True when a card cannot be used: the release locks it (any status but Free), the player does not own it, and no
 * Patreon Basic or creator unlock opens it. A card the release does not list is Free.
 */
export function isWidgetLocked(id: string, owned: readonly string[], basic: boolean, creator: boolean, content?: GachaContent): boolean {
  if (widgetStatus(id, content) === "Free") return false;
  return !basic && !creator && !owned.includes(id);
}

/**
 * The placed cards to record as owned now: those still Free. Recording them while Free is what keeps them when the
 * CMS later locks them; a card placed after its lock (restored, imported, reset) is not Free, so it is not recorded.
 */
export function widgetsToRecord(placed: readonly string[], owned: readonly string[], content?: GachaContent): string[] {
  return [...new Set(placed)].filter((id) => isWidgetId(id) && !owned.includes(id) && widgetStatus(id, content) === "Free");
}
