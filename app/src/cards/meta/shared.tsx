import { useEffect, useState } from "react";
import { age } from "../../lib/format";
import { openLink } from "../../lib/openLink";
import type { MetaData, MetaHero, MetaRank } from "../../lib/types";
import { Segmented } from "../../components/Segmented";
import { StationSelect } from "../../components/StationSelect";
import { signal } from "../../boot/bootSignals";
import { useApi, useStationCtx } from "../../state/useApi";
import { Empty, useEvery } from "../ui";
import { readString, writeString } from "../../lib/storage";
import { KEYS } from "../../lib/storageKeys";

const RANK_KEY = KEYS.metaRank;
const MODE_KEY = KEYS.metaMode;

export const SITE = "https://www.counterwatch.gg/stats/overwatch";
export const DAY = 24 * 3600_000;
export const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
/** 53% and up, matching the rounded tier-list figure. Ordinary rates stay gray. */
export const hotWin = (v: number | null | undefined) => v != null && Math.round(v * 100) >= 53;
export const ROLES = ["All", "Tank", "Damage", "Support"] as const;
export type RoleFilter = (typeof ROLES)[number];
export const MAP_MODES = ["Escort", "Hybrid", "Control", "Push", "Flashpoint", "Clash"];

// Same divisions the rank control on counterwatch.gg offers. Grandmaster+ joins Grandmaster and Champion.
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
export type MetaRankId = (typeof META_RANKS)[number]["value"];

export const META_MODES = [
  { value: "5v5", label: "5v5" },
  { value: "6v6", label: "6v6" },
] as const;
export type MetaModeId = (typeof META_MODES)[number]["value"];

export function readRank(): MetaRankId {
  const saved = readString(RANK_KEY);
  return META_RANKS.some((r) => r.value === saved) ? (saved as MetaRankId) : "All";
}

export function readMode(): MetaModeId {
  const saved = readString(MODE_KEY);
  return META_MODES.some((m) => m.value === saved) ? (saved as MetaModeId) : "5v5";
}

/** One saved rank for both meta cards. Changing it on either card updates the other. */
export function useMetaRank() {
  const [rank, setRank] = useState<MetaRankId>(readRank);
  useEffect(() => {
    const sync = () => setRank(readRank());
    window.addEventListener("cs-meta-rank", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cs-meta-rank", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const pick = (value: string) => {
    const next = META_RANKS.some((r) => r.value === value) ? (value as MetaRankId) : "All";
    setRank(next);
    writeString(RANK_KEY, next);
    window.dispatchEvent(new Event("cs-meta-rank"));
  };
  const label = META_RANKS.find((r) => r.value === rank)?.label ?? "All ranks";
  return { rank, label, pick };
}

/** One saved queue mode (5v5 / 6v6) shared across all Counterwatch meta cards. */
export function useMetaMode() {
  const [mode, setMode] = useState<MetaModeId>(readMode);
  useEffect(() => {
    const sync = () => setMode(readMode());
    window.addEventListener("cs-meta-mode", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cs-meta-mode", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const pick = (value: string) => {
    const next = META_MODES.some((m) => m.value === value) ? (value as MetaModeId) : "5v5";
    setMode(next);
    writeString(MODE_KEY, next);
    window.dispatchEvent(new Event("cs-meta-mode"));
  };
  return { mode, pick };
}

export function RankSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="msel">
      <StationSelect label="Rank" value={value} onChange={onChange} options={META_RANKS.map((r) => ({ value: r.value, label: r.label }))} />
    </div>
  );
}

export function ModeSelect({ value, onChange }: { value: MetaModeId; onChange: (value: string) => void }) {
  return <Segmented label="Mode" value={value} options={META_MODES.map((m) => ({ value: m.value, label: m.label }))} onChange={onChange} />;
}

export function useRankStats(rank: string, mode: MetaModeId) {
  const { provider } = useStationCtx();
  const [loaded, setLoaded] = useState<{ key: string; data: MetaRank | null; state: "idle" | "loading" | "error" }>({
    key: "5v5:All",
    data: null,
    state: "idle",
  });
  const key = `${mode}:${rank}`;
  useEffect(() => {
    if (rank === "All") {
      signal("/api/meta/rank", "ok");
      setLoaded({ key, data: null, state: "idle" });
      return;
    }
    let alive = true;
    setLoaded({ key, data: null, state: "loading" });
    provider
      .api<MetaRank>(`/api/meta/rank?rank=${encodeURIComponent(rank)}&mode=${encodeURIComponent(mode)}`)
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
  }, [provider, rank, mode, key]);
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

/** Reads the Counterwatch numbers for the shared mode and can ask the service to fetch fresh ones. */
export function useMeta(mode: MetaModeId) {
  const { provider } = useStationCtx();
  const ms = useEvery(10 * 60_000, 0);
  const path = `/api/meta?mode=${encodeURIComponent(mode)}`;
  const api = useApi<MetaData>(path, ms);
  const [busy, setBusy] = useState(false);
  const refresh = () => {
    setBusy(true);
    provider
      .api<MetaData>("/api/meta/refresh", {})
      .catch(() => {})
      .then(() => api.reload())
      .then(() => setBusy(false));
  };
  const meta = api.data;
  const updating = busy || meta?.updating === true;
  const stale = meta?.fetchedAt != null && Date.now() - meta.fetchedAt > DAY * 1.5;
  return { meta, error: api.error, refresh, updating, stale, mode };
}

export type Meta = ReturnType<typeof useMeta>;

/** The "Updated 3 h ago" stamp with the reload button, used in every card header. */
export function Stamp({ m }: { m: Meta }) {
  const { meta, updating, stale, refresh } = m;
  return (
    <div className="mstamp">
      <span className={stale || meta?.error ? "or" : ""} title={meta?.error ?? undefined}>
        {updating ? "Updating…" : meta?.fetchedAt ? `Updated ${age(meta.fetchedAt)}` : "Not loaded"}
      </span>
      <button className="micon" onClick={refresh} disabled={updating} aria-label="Reload Counterwatch stats" title="Reload from counterwatch.gg">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={updating ? "spin" : ""} aria-hidden="true">
          <path d="M20 11a8 8 0 1 0-2.3 5.7" />
          <path d="M20 4v7h-7" />
        </svg>
      </button>
    </div>
  );
}

export function Portrait({ hero, size = 30 }: { hero: Pick<MetaHero, "name" | "img" | "role">; size?: number }) {
  const [bad, setBad] = useState(false);
  const letter = (hero.name ?? "?").slice(0, 1);
  return hero.img && !bad ? (
    <img className={`mport ${hero.role.toLowerCase()}`} src={hero.img} alt="" width={size} height={size} loading="lazy" onError={() => setBad(true)} />
  ) : (
    <span className={`mport ${hero.role.toLowerCase()}`} style={{ width: size, height: size }} aria-hidden="true">
      {letter}
    </span>
  );
}

/** What to show instead of the card body while there is nothing to show. Null once the data is here. */
export function Waiting({ m, ready }: { m: Meta; ready: boolean }) {
  if (m.error && !m.meta) return <Empty>The local service isn't answering. Start it, then press reload.</Empty>;
  if (!m.meta) return <Empty>Loading…</Empty>;
  if (!ready) return <Empty>{m.meta.error ? `Couldn't read counterwatch.gg: ${m.meta.error}` : "Fetching the latest stats from counterwatch.gg…"}</Empty>;
  return null;
}

export function Foot({ meta, href }: { meta: MetaData; href: string }) {
  return (
    <p className="mfoot">
      {meta.patch ? `${meta.patch.name} · ` : ""}
      <button className="mlink" onClick={() => openLink(href)}>
        counterwatch.gg ↗
      </button>
    </p>
  );
}
