/** Storage keys used by cards, in one place so the card that writes a key and the reset list agree. */
export const KEYS = {
  checklist: "cs.checklist",
  note: "cs.note",
  clocks: "cs.clocks",
  metaHero: "cs.meta.hero",
  metaMap: "cs.meta.map",
  metaRank: "cs.meta.rank",
  metaMode: "cs.meta.mode",
  discordRead: "cs.discordRead",
  verdictMetrics: "cs.verdict.metrics",
  seasonEnd: "cs.season.end",
  breakHours: "cs.break.hours",
  stationCredits: "cs.stationCredits",
  themeUnlocks: "cs.themeUnlocks",
} as const;
