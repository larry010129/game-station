import { memo, useEffect, useMemo, useState } from "react";
import type { MetaHero, MetaMap } from "../../lib/types";
import { Segmented } from "../../components/Segmented";
import { StationSelect } from "../../components/StationSelect";
import { signal } from "../../boot/bootSignals";
import { Card, Empty } from "../ui";
import { pct, hotWin, useGameMeta, RoleFilter, useMetaRank, useMetaMode, RankSelect, ModeSelect, useRankStats, rankStatus, useMeta, Stamp, Portrait, Waiting, Foot } from "./shared";
import { readString, writeString } from "../../lib/storage";
import { KEYS } from "../../lib/storageKeys";
import { api } from "../../lib/api";

function HeroRow({ hero, note }: { hero: MetaHero; note: string }) {
  const { game } = useGameMeta();
  return (
    <li className="mrow">
      <Portrait hero={hero} size={game === "apex" ? 36 : 30} />
      <span className="mname">
        {hero.name}
        <small>{hero.role}</small>
      </span>
      <span className={hotWin(hero.winRate) ? "mval hi" : "mval"}>
        {pct(hero.winRate)}
        <small>{note}</small>
      </span>
    </li>
  );
}

export const MapPicksCard = memo(function MapPicksCard() {
  const { mode: queueMode, pick: pickQueueMode } = useMetaMode();
  const { game, SITE, ROLES, MAP_MODES, cards } = useGameMeta();
  const m = useMeta(queueMode);
  const { rank, label, pick: pickRank } = useMetaRank();
  const stats = useRankStats(rank, queueMode);
  const [slug, setSlug] = useState<string>(() => readString(`${KEYS.metaMap}.${game}`) ?? readString(KEYS.metaMap) ?? "");
  const [mapType, setMapType] = useState("All");
  const [role, setRole] = useState<RoleFilter>("All");
  useEffect(() => {
    setSlug(readString(`${KEYS.metaMap}.${game}`) ?? "");
    setRole("All");
    setMapType("All");
  }, [game]);
  const meta = m.meta;
  const maps = useMemo(() => {
    const source: (MetaMap & { heroes?: MetaHero[] })[] = rank === "All" ? (meta?.maps ?? []) : stats.data && !stats.data.empty ? stats.data.maps : [];
    return [...source].sort((a, b) => a.name.localeCompare(b.name));
  }, [rank, meta, stats.data]);
  const modeOptions = useMemo(() => {
    const present = [...new Set(maps.map((x) => x.mode).filter(Boolean))];
    present.sort((a, b) => {
      const ia = MAP_MODES.indexOf(a);
      const ib = MAP_MODES.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return ["All", ...present];
  }, [maps, MAP_MODES]);
  const modeValue = modeOptions.includes(mapType) ? mapType : "All";
  const inMode = modeValue === "All" ? maps : maps.filter((x) => x.mode === modeValue);
  // With no map chosen yet, start on the most played one in this map type.
  const busiest = useMemo(() => inMode.reduce<(typeof inMode)[number] | undefined>((a, b) => (!a || (b.share ?? 0) > (a.share ?? 0) ? b : a), undefined), [inMode]);
  const map = inMode.find((x) => x.slug === slug) ?? busiest;
  const pick = (s: string) => {
    setSlug(s);
    writeString(`${KEYS.metaMap}.${game}`, s);
  };
  const [roster, setRoster] = useState<{ slug: string; mode: string; heroes: MetaHero[] } | null>(null);
  const [rosterState, setRosterState] = useState<"idle" | "loading" | "error">("idle");
  useEffect(() => {
    if (rank !== "All") {
      signal("/api/meta/map", "ok");
      return;
    }
    if (!meta) return;
    if (!map) {
      signal("/api/meta/map", meta.error ? "error" : "ok");
      return;
    }
    let alive = true;
    setRosterState("loading");
    api<{ heroes: MetaHero[] }>(`/api/meta/map?game=${encodeURIComponent(game)}&slug=${encodeURIComponent(map.slug)}&mode=${encodeURIComponent(queueMode)}`)
      .then((d) => {
        if (!alive) return;
        setRoster({ slug: map.slug, mode: queueMode, heroes: d.heroes ?? [] });
        setRosterState("idle");
        signal("/api/meta/map", "ok");
      })
      .catch(() => {
        if (!alive) return;
        setRosterState("error");
        signal("/api/meta/map", "error");
      });
    return () => {
      alive = false;
    };
  }, [map?.slug, meta, rank, queueMode, game]);
  const full = roster && map && roster.slug === map.slug && roster.mode === queueMode ? roster.heroes : null;
  const top = (list: MetaHero[], key: "winRate" | "pickRate") =>
    [...list].filter((h) => role === "All" || h.role === role).sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).slice(0, 5);
  // All ranks keeps the short headline lists, and a role uses the full map page. Another rank uses that rank's heroes for both.
  const rankedHeroes = rank !== "All" ? map?.heroes : null;
  const best = rankedHeroes ? top(rankedHeroes, "winRate") : role !== "All" && full ? top(full, "winRate") : (map?.best.filter((h) => role === "All" || h.role === role) ?? []);
  const played = rankedHeroes ? top(rankedHeroes, "pickRate") : role !== "All" && full ? top(full, "pickRate") : (map?.mostPlayed.filter((h) => role === "All" || h.role === role) ?? []);
  const waiting = rank === "All" && role !== "All" && !full && rosterState === "loading";
  const note = rankStatus(rank, stats.data, stats.state, maps.length > 0);
  // Suggestion: a best-performing hero that is also popular here is a safe pick; otherwise the top performer.
  const suggestion = best.find((b) => played.some((p) => p.id === b.id)) ?? best[0];
  const emptyMaps = !!meta && (meta.maps?.length ?? 0) === 0 && queueMode === "6v6";
  return (
    <Card title={cards.mappicks} sub={rank === "All" ? `What wins on each map · ${queueMode}` : `What wins on each map · ${queueMode} · ${label}`} right={<Stamp m={m} />}>
      <div className="mfilters">
        <ModeSelect value={queueMode} onChange={pickQueueMode} />
      </div>
      <Waiting m={m} ready={!!meta && ((meta.maps?.length ?? 0) > 0 || emptyMaps)} />
      {emptyMaps && <Empty>No 6v6 map stats loaded yet. Press reload, or check {SITE.replace(/^https?:\/\//, "")}.</Empty>}
      {meta && (meta.maps?.length ?? 0) > 0 && (
        <>
          <div className="mfilters">
            <Segmented label="Map type" value={modeValue} options={modeOptions.map((r) => ({ value: r, label: r }))} onChange={setMapType} />
            <Segmented label="Role" value={role} options={ROLES.map((r) => ({ value: r, label: r }))} onChange={setRole} />
            <RankSelect value={rank} onChange={pickRank} />
            {map && (
              <div className="msel map">
                <StationSelect
                  label="Map"
                  value={map.slug}
                  onChange={pick}
                  options={inMode.map((x) => ({ value: x.slug, label: modeValue === "All" ? `${x.name} · ${x.mode}` : x.name }))}
                />
              </div>
            )}
          </div>
          {note ? (
            <p className="mmapinfo">{note}</p>
          ) : map && (
          <>
          <p className="mmapinfo">
            {map.mode} · {pct(map.share)} of recent matches
          </p>
          {suggestion && (
            <div className="msuggest">
              <small>Suggested pick{role === "All" ? "" : ` · ${role}`}</small>
              <div>
                <Portrait hero={suggestion} size={game === "apex" ? 42 : 34} />
                <b className="pick">{suggestion.name}</b>
                <span className="chip or">{pct(suggestion.winRate)} win rate</span>
              </div>
            </div>
          )}
          <div className="mcols">
            <div>
              <h3>Best win rate</h3>
              {best.length ? (
                <ul>
                  {best.map((h) => (
                    <HeroRow key={h.id} hero={h} note="win rate" />
                  ))}
                </ul>
              ) : (
                <p className="mmapinfo">{waiting ? "Loading heroes…" : rosterState === "error" && rank === "All" && role !== "All" ? "Couldn't load this role." : "None in the top list."}</p>
              )}
            </div>
            <div>
              <h3>Most played</h3>
              {played.length ? (
                <ul>
                  {played.map((h) => (
                    <HeroRow key={h.id} hero={h} note={`${pct(h.pickRate, 0)} of picks`} />
                  ))}
                </ul>
              ) : (
                <p className="mmapinfo">{waiting ? "Loading heroes…" : rosterState === "error" && rank === "All" && role !== "All" ? "Couldn't load this role." : "None in the top list."}</p>
              )}
            </div>
          </div>
          </>
          )}
          <Foot meta={meta} href={game === "apex" ? SITE : `${SITE}/maps`} />
        </>
      )}
    </Card>
  );
});
