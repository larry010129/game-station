import { useEffect, useState } from "react";
import { age } from "../../lib/format";
import { withGame } from "../../lib/games";
import { openLink } from "../../lib/openLink";
import type { MetaData, MetaHero, MetaRank } from "../../lib/types";
import { apiBase } from "../../lib/api";
import { Segmented } from "../../components/Segmented";
import { StationSelect } from "../../components/StationSelect";
import { signal } from "../../boot/bootSignals";
import { useApi, useStationCtx } from "../../state/useApi";
import { Empty, useEvery } from "../ui";
import { readString, writeString } from "../../lib/storage";
import { KEYS } from "../../lib/storageKeys";
import { api } from "../../lib/api";

const RANK_KEY = KEYS.metaRank;
const MODE_KEY = KEYS.metaMode;

export const DAY = 24 * 3600_000;
export const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
/** 53% and up, matching the rounded tier-list figure. Ordinary rates stay gray. */
export const hotWin = (v: number | null | undefined) => v != null && Math.round(v * 100) >= 53;

export type RoleFilter = string;
export type MetaRankId = string;
export type MetaModeId = string;

/** Pack-driven labels for the open game (Overwatch roles vs Apex classes). */
export function useGameMeta() {
  const { game, pack } = useStationCtx();
  return {
    game,
    pack,
    SITE: pack.metaSiteUrl,
    SITE_LABEL: pack.metaSiteLabel,
    ROLES: pack.roles,
    MAP_MODES: pack.mapModes,
    META_RANKS: pack.ranks,
    META_MODES: pack.modes,
    character: pack.character,
    characters: pack.characters,
    cards: pack.cards,
    defaultHero: pack.defaultHero,
  };
}

function modeKey(game: string) {
  return `${MODE_KEY}.${game}`;
}
function rankKey(game: string) {
  return `${RANK_KEY}.${game}`;
}

export function readRank(game: string, ranks: readonly { value: string }[]): MetaRankId {
  const saved = readString(rankKey(game)) ?? (game === "overwatch" ? readString(RANK_KEY) : null);
  return ranks.some((r) => r.value === saved) ? (saved as MetaRankId) : "All";
}

export function readMode(game: string, modes: readonly { value: string }[]): MetaModeId {
  const saved = readString(modeKey(game)) ?? (game === "overwatch" ? readString(MODE_KEY) : null);
  return modes.some((m) => m.value === saved) ? (saved as MetaModeId) : modes[0]?.value ?? "5v5";
}

/** One saved rank for both meta cards. Changing it on either card updates the other. */
export function useMetaRank() {
  const { game, META_RANKS } = useGameMeta();
  const [rank, setRank] = useState<MetaRankId>(() => readRank(game, META_RANKS));
  useEffect(() => {
    setRank(readRank(game, META_RANKS));
    const sync = () => setRank(readRank(game, META_RANKS));
    window.addEventListener("cs-meta-rank", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cs-meta-rank", sync);
      window.removeEventListener("storage", sync);
    };
  }, [game, META_RANKS]);
  const pick = (value: string) => {
    const next = META_RANKS.some((r) => r.value === value) ? value : "All";
    setRank(next);
    writeString(rankKey(game), next);
    window.dispatchEvent(new Event("cs-meta-rank"));
  };
  const label = META_RANKS.find((r) => r.value === rank)?.label ?? "All ranks";
  return { rank, label, pick };
}

/** One saved queue mode shared across meta cards for the active game. */
export function useMetaMode() {
  const { game, META_MODES } = useGameMeta();
  const [mode, setMode] = useState<MetaModeId>(() => readMode(game, META_MODES));
  useEffect(() => {
    setMode(readMode(game, META_MODES));
    const sync = () => setMode(readMode(game, META_MODES));
    window.addEventListener("cs-meta-mode", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cs-meta-mode", sync);
      window.removeEventListener("storage", sync);
    };
  }, [game, META_MODES]);
  const pick = (value: string) => {
    const next = META_MODES.some((m) => m.value === value) ? value : META_MODES[0]?.value ?? value;
    setMode(next);
    writeString(modeKey(game), next);
    window.dispatchEvent(new Event("cs-meta-mode"));
  };
  return { mode, pick };
}

export function RankSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { META_RANKS } = useGameMeta();
  return (
    <div className="msel">
      <StationSelect label="Rank" value={value} onChange={onChange} options={META_RANKS.map((r) => ({ value: r.value, label: r.label }))} />
    </div>
  );
}

export function ModeSelect({ value, onChange }: { value: MetaModeId; onChange: (value: string) => void }) {
  const { META_MODES } = useGameMeta();
  return <Segmented label="Mode" value={value} options={META_MODES.map((m) => ({ value: m.value, label: m.label }))} onChange={onChange} />;
}

export function useRankStats(rank: string, mode: MetaModeId) {
  const { game } = useStationCtx();
  const [loaded, setLoaded] = useState<{ key: string; data: MetaRank | null; state: "idle" | "loading" | "error" }>({
    key: `${game}:5v5:All`,
    data: null,
    state: "idle",
  });
  const key = `${game}:${mode}:${rank}`;
  useEffect(() => {
    if (rank === "All") {
      signal("/api/meta/rank", "ok");
      setLoaded({ key, data: null, state: "idle" });
      return;
    }
    let alive = true;
    setLoaded({ key, data: null, state: "loading" });
    api<MetaRank>(withGame("/api/meta/rank", game, { rank, mode }))
      .then((d) => {
        if (!alive) return;
        setLoaded({ key, data: d, state: "idle" });
        signal("/api/meta/rank", "ok");
      })
      .catch(() => {
        if (!alive) return;
        setLoaded({ key, data: null, state: "error" });
        signal("/api/meta/rank", "error");
      });
    return () => {
      alive = false;
    };
  }, [rank, mode, key, game]);
  if (loaded.key !== key) return { data: null, state: "loading" as const };
  return { data: loaded.data, state: loaded.state };
}

export function rankStatus(rank: string, data: MetaRank | null, state: "idle" | "loading" | "error", hasRows: boolean) {
  if (rank === "All") return null;
  if (state === "loading" && !data) return "Loading this rank…";
  if (data && !data.empty && hasRows) return null;
  if (state === "error" || data?.error) return "Couldn't load this rank.";
  if (data) return "No stats for this rank.";
  return "Loading this rank…";
}

/** True when the snapshot has something the cards can show (even while a scrape is still running). */
export function metaUsable(meta: MetaData | null | undefined): boolean {
  if (!meta) return false;
  if (meta.fetchedAt == null) return false;
  return (meta.tiers?.length ?? 0) > 0 || (meta.maps?.length ?? 0) > 0 || (meta.picks?.length ?? 0) > 0;
}

/** Reads meta numbers for the shared mode + active game and can ask the service to fetch fresh ones. */
export function useMeta(mode: MetaModeId) {
  const { game, pack } = useStationCtx();
  const path = withGame("/api/meta", game, { mode });
  const [fast, setFast] = useState(false);
  const ms = useEvery(fast ? 2_000 : 10 * 60_000, 0);
  const metaApi = useApi<MetaData>(path, ms);
  const meta = metaApi.data;
  const updating = meta?.updating === true;
  useEffect(() => {
    setFast(updating);
  }, [updating]);
  useEffect(() => {
    if (metaApi.error && !meta) {
      signal("/api/meta", "error");
      return;
    }
    if (metaUsable(meta)) {
      signal("/api/meta", "ok");
      return;
    }
    if (meta && !updating) signal("/api/meta", meta.error ? "error" : "ok");
  }, [meta, metaApi.error, updating]);
  const refresh = () => {
    api<MetaData>(withGame("/api/meta/refresh", game, { mode }), {})
      .catch(() => {})
      .then(() => metaApi.reload());
  };
  const stale = meta?.fetchedAt != null && Date.now() - meta.fetchedAt > DAY * 1.5;
  return { meta, error: metaApi.error, refresh, updating, stale, mode, game, pack };
}

export type Meta = ReturnType<typeof useMeta>;

/** The "Updated 3 h ago" stamp with the reload button, used in every card header. */
export function Stamp({ m }: { m: Meta }) {
  const { meta, updating, stale, refresh, pack } = m;
  return (
    <div className="mstamp">
      <span className={stale || meta?.error ? "or" : ""} title={meta?.error ?? undefined}>
        {updating ? "Updating…" : meta?.fetchedAt ? `Updated ${age(meta.fetchedAt)}` : "Not loaded"}
      </span>
      <button className="micon" onClick={refresh} disabled={updating} aria-label={`Reload ${pack.metaSiteLabel} stats`} title={`Reload from ${pack.metaSiteLabel}`}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={updating ? "spin" : ""} aria-hidden="true">
          <path d="M20 11a8 8 0 1 0-2.3 5.7" />
          <path d="M20 4v7h-7" />
        </svg>
      </button>
    </div>
  );
}

/** Resolve a meta image path against the local service (or keep absolute/data URLs). */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const rel = path.startsWith("/") ? path : `/${path}`;
  // Always hit the service origin — Portrait fetches with CORS (connect-src), then paints blob:.
  return `${apiBase}${rel}`;
}

/** Apex weapon classes — wide silhouettes that must not use the circular legend crop. */
const GUN_ROLES = new Set(["ar", "smg", "lmg", "shotgun", "sniper", "marksman", "pistol"]);

export function isGunRole(role: string | null | undefined): boolean {
  return GUN_ROLES.has((role ?? "").trim().toLowerCase());
}

export function Portrait({ hero, size = 30 }: { hero: Pick<MetaHero, "name" | "img" | "role">; size?: number }) {
  const { game } = useGameMeta();
  const [src, setSrc] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  const gun = isGunRole(hero.role);
  // Apex legend tiles are square Tracker plates — drop the Overwatch-style circle crop.
  const legend = game === "apex" && !gun;
  const width = gun ? Math.round(size * 1.85) : size;
  const height = size;
  const cls = `mport ${hero.role.toLowerCase()}${gun ? " gun" : legend ? " legend" : ""}`;
  // Fetch via connect-src (always allowed to the service), then paint a blob: URL — Tauri img-src
  // often blocks raw http://127.0.0.1 portraits even when the API JSON is fine.
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    setBad(false);
    setSrc(null);
    const url = mediaUrl(hero.img);
    if (!url) return;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (alive) setBad(true);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hero.img]);
  const letter = (hero.name ?? "?").slice(0, 1);
  return src && !bad ? (
    <img className={cls} src={src} alt="" width={width} height={height} />
  ) : (
    <span className={cls} style={{ width, height }} aria-hidden="true">
      {letter}
    </span>
  );
}

/** What to show instead of the card body while there is nothing to show. Null once the data is here. */
export function Waiting({ m, ready }: { m: Meta; ready: boolean }) {
  if (m.error && !m.meta) return <Empty>The local service isn't answering. Start it, then press reload.</Empty>;
  if (!m.meta) return <Empty>Loading…</Empty>;
  if (!ready) {
    return (
      <Empty>
        {m.meta.error
          ? `Couldn't read ${m.pack.metaSiteLabel}: ${m.meta.error}`
          : `Fetching the latest stats from ${m.pack.metaSiteLabel}…`}
      </Empty>
    );
  }
  return null;
}

export function Foot({ meta, href }: { meta: MetaData; href: string }) {
  const { pack } = useGameMeta();
  return (
    <p className="mfoot">
      {meta.patch ? `${meta.patch.name} · ` : ""}
      <button className="mlink" onClick={() => openLink(href)}>
        {pack.metaSiteLabel} ↗
      </button>
    </p>
  );
}

/** @deprecated Prefer useGameMeta().SITE — kept for any leftover imports. */
export const SITE = "https://www.counterwatch.gg/stats/overwatch";
export const ROLES = ["All", "Tank", "Damage", "Support"] as const;
export const MAP_MODES = ["Escort", "Hybrid", "Control", "Push", "Flashpoint", "Clash"];
export const META_RANKS = [
  { value: "All", label: "All ranks" },
  { value: "Bronze", label: "Bronze" },
  { value: "Silver", label: "Silver" },
  { value: "Gold", label: "Gold" },
  { value: "Platinum", label: "Platinum" },
  { value: "Emerald", label: "Emerald" },
  { value: "Diamond", label: "Diamond" },
  { value: "Master", label: "Master" },
  { value: "Grandmaster+", label: "Grandmaster+" },
] as const;
export const META_MODES = [
  { value: "5v5", label: "5v5" },
  { value: "6v6", label: "6v6" },
] as const;
