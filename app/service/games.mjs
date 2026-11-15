import { APEX_APP_ID, OVERWATCH_APP_ID } from "./constants.mjs";
import path from "node:path";
import { DATA_DIR } from "./paths.mjs";

/** Built-in live-service games the station can swap between. */
export const GAME_IDS = ["overwatch", "apex"];

export function normalizeGame(raw) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "apex" || v === "apexlegends" || v === "apex-legends") return "apex";
  return "overwatch";
}

/** Overwatch feed stays the legacy `config.feed` object. Apex uses `config.apexFeed` when present. */
export function feedConfigFor(config, game) {
  if (normalizeGame(game) === "apex") {
    return { ...APEX_FEED_DEFAULTS, ...(config.apexFeed ?? {}) };
  }
  return config.feed;
}

export function steamAppIdFor(config, game) {
  const g = normalizeGame(game);
  if (g === "apex") return config.apexSteamAppId ?? APEX_APP_ID;
  return config.steamAppId ?? OVERWATCH_APP_ID;
}

export function playersFileFor(game) {
  return path.join(DATA_DIR, normalizeGame(game) === "apex" ? "players-apex.json" : "players.json");
}

export function feedCacheFileFor(game) {
  return path.join(DATA_DIR, normalizeGame(game) === "apex" ? "feed-cache-apex.json" : "feed-cache.json");
}

export function steamLabelFor(game) {
  return normalizeGame(game) === "apex" ? "Apex Legends on Steam" : "Overwatch 2 on Steam";
}

export function playersSourceFor(game) {
  return normalizeGame(game) === "apex"
    ? "Steam (Apex Legends players on Steam)"
    : "Steam (Overwatch 2 players on Steam)";
}

/** Default Apex sources — Reddit / YouTube / Google News. No Blizzard; EA patch notes land via news/Reddit. */
export const APEX_FEED_DEFAULTS = {
  newsUrl: "https://www.ea.com/games/apex-legends/news",
  patchUrl: "https://www.ea.com/games/apex-legends/news",
  reddit: [
    { sub: "apexlegends", kind: "community" },
    { sub: "ApexLFG", kind: "community" },
    { sub: "apexuniversity", kind: "community" },
    { sub: "ApexUncovered", kind: "leak" },
  ],
  youtube: [
    { handle: "@PlayApex", name: "PlayApex" },
    { handle: "@NiceWGG", name: "NiceWGG" },
    { handle: "@CurseKidsTV", name: "CurseKids" },
  ],
  x: [
    { handle: "PlayApex", kind: "official" },
    { handle: "Respawn", kind: "official" },
  ],
  xRssUrl: "",
  newsSearch: [
    "Apex Legends leak",
    "Apex Legends season leak",
    "Apex Legends rumor",
    "Apex Legends datamine",
    "Apex Legends event leak",
    "Apex Legends collection event",
  ],
  tracked: [],
  trusted: [
    { name: "PlayApex", note: "Official Apex Legends account" },
    { name: "Respawn", note: "Respawn Entertainment" },
  ],
  refreshMs: 30 * 60 * 1000,
  redditGapMs: 12000,
  userAgent: "CommandStation/0.2 (personal dashboard; Windows)",
};
