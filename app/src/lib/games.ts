/** Which live-service game the station is showing. Cards keep the same shells; packs swap copy and sources. */
export type GameId = "overwatch" | "apex";

export interface GamePack {
  id: GameId;
  /** Short label for the navbar switcher. */
  label: string;
  /** Longer product name for toasts and credits. */
  fullName: string;
  /** Tab label for the game page (was always "Overwatch"). */
  tabLabel: string;
  /** Character noun: Hero vs Legend. */
  character: string;
  /** Plural characters. */
  characters: string;
  /** Role filter chips for meta cards. */
  roles: readonly string[];
  /** Queue / playlist modes for meta cards. */
  modes: readonly { value: string; label: string }[];
  /** Rank ladder labels (All ranks first). */
  ranks: readonly { value: string; label: string }[];
  /** Map-type filter chips (Escort… vs BR POIs). */
  mapModes: readonly string[];
  /** Card title/sub overrides keyed by CardId-ish names used in meta + Overwatch groups. */
  cards: {
    feed: string;
    heroprofile: string;
    mappicks: string;
    bestpicks: string;
    tierlist: string;
    airesearch: string;
    patch: string;
    season: string;
    steam: string;
  };
  /** Default character slug when nothing is saved yet. */
  defaultHero: string;
  /** Official patch URL host pattern (null = any patch-kind item). */
  officialPatchHost: RegExp | null;
  steamSub: string;
  metaSiteLabel: string;
  metaSiteUrl: string;
}

export const GAMES: Record<GameId, GamePack> = {
  overwatch: {
    id: "overwatch",
    label: "Overwatch",
    fullName: "Overwatch 2",
    tabLabel: "Overwatch",
    character: "Hero",
    characters: "Heroes",
    roles: ["All", "Tank", "Damage", "Support"],
    modes: [
      { value: "5v5", label: "5v5" },
      { value: "6v6", label: "6v6" },
    ],
    ranks: [
      { value: "All", label: "All ranks" },
      { value: "Bronze", label: "Bronze" },
      { value: "Silver", label: "Silver" },
      { value: "Gold", label: "Gold" },
      { value: "Platinum", label: "Platinum" },
      { value: "Emerald", label: "Emerald" },
      { value: "Diamond", label: "Diamond" },
      { value: "Master", label: "Master" },
      { value: "Grandmaster+", label: "Grandmaster+" },
    ],
    mapModes: ["Escort", "Hybrid", "Control", "Push", "Flashpoint", "Clash"],
    cards: {
      feed: "Overwatch feed",
      heroprofile: "Hero profile",
      mappicks: "Map hero picks",
      bestpicks: "Best pick per role",
      tierlist: "Hero tier list",
      airesearch: "Leak feed",
      patch: "Patch summary",
      season: "Season countdown",
      steam: "Steam news",
    },
    defaultHero: "tracer",
    officialPatchHost: /^https:\/\/overwatch\.blizzard\.com\/[^?#]*\/news\/patch-notes\/?(?:[?#]|$)/i,
    steamSub: "Overwatch 2 on Steam",
    metaSiteLabel: "counterwatch.gg",
    metaSiteUrl: "https://www.counterwatch.gg/stats/overwatch",
  },
  apex: {
    id: "apex",
    label: "Apex",
    fullName: "Apex Legends",
    tabLabel: "Apex",
    character: "Legend",
    characters: "Legends",
    roles: ["All", "Assault", "Skirmisher", "Recon", "Support", "Controller"],
    modes: [
      { value: "br", label: "Battle Royale" },
      { value: "mixtape", label: "Mixtape" },
    ],
    ranks: [
      { value: "All", label: "All ranks" },
      { value: "Rookie", label: "Rookie" },
      { value: "Bronze", label: "Bronze" },
      { value: "Silver", label: "Silver" },
      { value: "Gold", label: "Gold" },
      { value: "Platinum", label: "Platinum" },
      { value: "Diamond", label: "Diamond" },
      { value: "Master", label: "Master" },
      { value: "Predator", label: "Predator" },
    ],
    mapModes: ["BR", "Mixtape", "Ranked"],
    cards: {
      feed: "Apex feed",
      heroprofile: "Legend profile",
      mappicks: "Map legend picks",
      bestpicks: "Best guns",
      tierlist: "Legend tier list",
      airesearch: "Events & leaks",
      patch: "Patch summary",
      season: "Season countdown",
      steam: "Steam news",
    },
    defaultHero: "pathfinder",
    officialPatchHost: null,
    steamSub: "Apex Legends on Steam",
    metaSiteLabel: "Apex Legends Status",
    metaSiteUrl: "https://apexlegendsstatus.com/game-stats/legends-pick-rates/",
  },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];

export function isGameId(v: unknown): v is GameId {
  return v === "overwatch" || v === "apex";
}

export function packOf(id: GameId): GamePack {
  return GAMES[id] ?? GAMES.overwatch;
}

/** Append `game=` (and optional extras) to a service path. */
export function withGame(path: string, game: GameId, extra?: Record<string, string | null | undefined>): string {
  const [base, qs = ""] = path.split("?");
  const params = new URLSearchParams(qs);
  params.set("game", game);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
  }
  const out = params.toString();
  return out ? `${base}?${out}` : base;
}
