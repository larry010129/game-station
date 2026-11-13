import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { MetaHeroDetail, MetaMatchup } from "../../lib/types";
import { Segmented } from "../../components/Segmented";
import { StationSelect } from "../../components/StationSelect";
import { signal } from "../../boot/bootSignals";
import { useStationCtx } from "../../state/useApi";
import { Card, Empty } from "../ui";
import { SITE, pct, ROLES, RoleFilter, MAP_MODES, useMetaMode, ModeSelect, useMeta, Stamp, Portrait, Foot } from "./shared";
import { ARCH_COLORS, STAT_ROWS, CombatRadar, ArchetypeRadar, CmpBar, Dots } from "./charts";
import { readString, writeString } from "../../lib/storage";
import { KEYS } from "../../lib/storageKeys";

const HERO_KEY = KEYS.metaHero;

const COUNTER_TOP = 5;

/** Matchup list: top 5 by default; View more expands the filtered list. */
function MatchupList({ title, sub, tone, list }: { title: string; sub: string; tone: "good" | "bad"; list: MetaMatchup[] }) {
  const [expanded, setExpanded] = useState(false);
  const ranked = useMemo(
    () => [...list].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [list],
  );
  const shown = expanded ? ranked : ranked.slice(0, COUNTER_TOP);
  const canToggle = ranked.length > COUNTER_TOP;
  const top = Math.max(...ranked.map((c) => c.score ?? 0), 1);
  return (
    <section className={`hm ${tone}`}>
      <div className="hstathead">
        <span>{title}</span>
        <small>{sub}</small>
      </div>
      {ranked.length === 0 && <Empty>No data yet.</Empty>}
      <ul className="hlist">
        {shown.map((c) => (
          <li key={c.id}>
            <Portrait hero={{ name: c.name, img: c.img, role: c.role ?? "" }} size={34} />
            <span className="hn">
              <b>{c.name}</b>
              <small>{c.role}</small>
            </span>
            <span className="hbar">
              <i style={{ width: `${((c.score ?? 0) / top) * 100}%` }} />
            </span>
            <b className="hs">+{(c.score ?? 0).toFixed(1)}</b>
          </li>
        ))}
      </ul>
      {canToggle && (
        <button type="button" className="mlink hmore" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "View more"}
        </button>
      )}
    </section>
  );
}

export const HeroProfileCard = memo(function HeroProfileCard({ instanceId = "heroprofile" }: { instanceId?: string }) {
  const { mode, pick: pickMode } = useMetaMode();
  const m = useMeta(mode);
  const { provider } = useStationCtx();
  const primary = instanceId === "heroprofile";
  const heroKey = `${HERO_KEY}.${instanceId}`;
  const [slug, setSlug] = useState(() => readString(heroKey) || (primary ? readString(HERO_KEY) : null) || "tracer");
  const [detail, setDetail] = useState<MetaHeroDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"profile" | "counters" | "maps">("profile");
  const [counterRole, setCounterRole] = useState<RoleFilter>("All");
  const [mapMode, setMapMode] = useState("All");
  /** Stamp reload bumps meta.fetchedAt — force-refetch hero (also replaces caches missing byRole). */
  const prevMetaFetchedAt = useRef<number | undefined>(undefined);

  const roster = useMemo(() => {
    const list = (m.meta?.tiers ?? []).flatMap((t) => t.heroes.map((h) => ({ ...h, tier: t.tier })));
    return list.filter((h) => h.slug).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [m.meta]);

  const mapModeOptions = useMemo(() => {
    const maps = detail?.topMaps ?? [];
    const present = [...new Set(maps.map((x) => x.mode).filter(Boolean))];
    present.sort((a, b) => {
      const ia = MAP_MODES.indexOf(a);
      const ib = MAP_MODES.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return ["All", ...present];
  }, [detail?.topMaps]);
  const mapModeValue = mapModeOptions.includes(mapMode) ? mapMode : "All";
  const filteredMaps = useMemo(() => {
    const maps = detail?.topMaps ?? [];
    return mapModeValue === "All" ? maps : maps.filter((x) => x.mode === mapModeValue);
  }, [detail?.topMaps, mapModeValue]);

  const avoidList = useMemo(() => {
    const overall = detail?.counters?.losesTo ?? [];
    if (counterRole === "All") return overall;
    const bucket = detail?.counters?.byRole?.[counterRole]?.losesTo;
    // Prefer full per-role buckets; fall back to filtering overall if cache predates byRole / is empty.
    if (bucket?.length) return bucket;
    return overall.filter((c) => c.role === counterRole);
  }, [detail?.counters, counterRole]);
  const beatsList = useMemo(() => {
    const overall = detail?.counters?.beats ?? [];
    if (counterRole === "All") return overall;
    const bucket = detail?.counters?.byRole?.[counterRole]?.beats;
    if (bucket?.length) return bucket;
    return overall.filter((c) => c.role === counterRole);
  }, [detail?.counters, counterRole]);

  useEffect(() => {
    let alive = true;
    const fetchedAt = m.meta?.fetchedAt;
    const force =
      typeof prevMetaFetchedAt.current === "number" &&
      typeof fetchedAt === "number" &&
      prevMetaFetchedAt.current !== fetchedAt;
    if (typeof fetchedAt === "number") prevMetaFetchedAt.current = fetchedAt;
    setLoading(true);
    setErr(null);
    const q = `/api/meta/hero?slug=${encodeURIComponent(slug)}&mode=${encodeURIComponent(mode)}${force ? "&force=1" : ""}`;
    provider
      .api<MetaHeroDetail>(q)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setErr(d.error ?? null);
        signal("/api/meta/hero", "ok");
      })
      .catch((e: Error) => {
        if (!alive) return;
        setErr(e.message);
        setDetail(null);
        signal("/api/meta/hero", "error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [provider, slug, mode, m.meta?.fetchedAt]);

  const pick = (next: string) => {
    setSlug(next);
    writeString(heroKey, next);
  };

  const color = detail?.roleColor || "var(--orange)";
  const leanColor = ARCH_COLORS[detail?.lean ?? ""] ?? "#a78bfa";

  const countersEmpty = mode === "6v6" && (detail?.counters?.losesTo?.length ?? 0) === 0 && (detail?.counters?.beats?.length ?? 0) === 0;

  return (
    <Card
      title="Hero profile"
      sub={detail ? `${detail.role ?? "Hero"} · ${mode} · Counterwatch` : `Combat, playstyle, vs role avg · ${mode}`}
      right={<Stamp m={m} />}
    >
      <div className="mfilters">
        <ModeSelect value={mode} onChange={pickMode} />
        <div className="msel">
          <StationSelect
            label="Hero"
            searchable
            value={slug}
            onChange={pick}
            disabled={!roster.length && !slug}
            options={
              roster.length
                ? roster.map((h) => ({ value: h.slug!, label: `${h.name} (${h.tier})` }))
                : [{ value: slug, label: detail?.name ?? slug }]
            }
          />
        </div>
      </div>

      {loading && !detail && <Empty>Loading hero page…</Empty>}
      {!loading && err && !detail && <Empty>Couldn't read this hero: {err}</Empty>}
      {detail && (
        <>
          <div className="hhero">
            <Portrait hero={{ name: detail.name, img: detail.img, role: detail.role ?? "" }} size={56} />
            <div className="hmeta">
              <b className="hname">{detail.name}</b>
              <div className="htags">
                {detail.role && (
                  <span className="htag role" style={{ color }}>
                    {detail.role}
                  </span>
                )}
                {detail.tier && <span className="htag tier">Tier {detail.tier}</span>}
                <span className="htag conf" title={detail.confidence.label}>
                  <Dots n={detail.confidence.dots} />
                  {detail.confidence.label}
                </span>
                {detail.mention && (
                  <span className="htag mention" title={detail.mention.detail ?? detail.mention.why ?? undefined}>
                    {detail.mention.label}
                  </span>
                )}
              </div>
            </div>
            <div className="hwin">
              <b>{pct(detail.winRate)}</b>
              <small>Win rate</small>
              <span>{detail.matches.toLocaleString("en-US")} matches</span>
            </div>
          </div>

          <div className="hseg seg" role="tablist" aria-label="Hero profile sections">
            {(["profile", "counters", "maps"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>
                {v === "profile" ? "Profile" : v === "counters" ? "Counters" : "Maps"}
              </button>
            ))}
          </div>

          {view === "profile" && (
            <>
          <div className="hviz">
            <CombatRadar hero={detail.stats} avg={detail.roleAvg} max={detail.roleMax} />
            <ArchetypeRadar scores={detail.archetype} lean={detail.lean} />
          </div>

          <div className="hgrid2">
            <div>
              <div className="hstathead">
                <span>Stats per 10 minutes</span>
                <small>
                  vs {(detail.role ?? "role").toLowerCase()} avg ({detail.roleAvg.heroCount ?? "—"})
                </small>
              </div>
              <ul className="hstats">
                {STAT_ROWS.map(({ key, label }) => {
                  const v = Number(detail.stats[key] ?? 0);
                  const a = Number(detail.roleAvg[key] ?? 0);
                  const fmt = key === "damage" ? (n: number) => Math.round(n).toLocaleString("en-US") : (n: number) => n.toFixed(1);
                  return (
                    <li key={key}>
                      <span>{label}</span>
                      <CmpBar value={v} avg={a} color={color} />
                      <div className="hnums">
                        <b style={{ color }}>{fmt(v)}</b>
                        <small>{fmt(a)}</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="hlean">
              <small>Leans</small>
              <b style={{ color: leanColor }}>{detail.lean}</b>
              <p>{detail.leanBlurb}</p>
            </div>
          </div>

            </>
          )}

          {view === "counters" && (
            <div className="hcount">
              {countersEmpty ? (
                <Empty>No 6v6 counter matchups in Counterwatch's public slice yet. Win rate, combat, and maps still update for 6v6.</Empty>
              ) : (
                <>
                  <div className="mfilters">
                    <Segmented
                      label="Role"
                      value={counterRole}
                      options={ROLES.map((r) => ({ value: r, label: r }))}
                      onChange={setCounterRole}
                    />
                  </div>
                  <div className="hcols">
                    <MatchupList
                      key={`avoid-${counterRole}`}
                      title="Avoid"
                      sub={`Heroes that beat ${detail.name}${counterRole === "All" ? "" : ` · ${counterRole}`}`}
                      tone="bad"
                      list={avoidList}
                    />
                    <MatchupList
                      key={`beats-${counterRole}`}
                      title="Beats"
                      sub={`Heroes ${detail.name} beats${counterRole === "All" ? "" : ` · ${counterRole}`}`}
                      tone="good"
                      list={beatsList}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {view === "maps" && (
            <div className="hmaps">
              <div className="mfilters">
                <Segmented
                  label="Map type"
                  value={mapModeValue}
                  options={mapModeOptions.map((r) => ({ value: r, label: r }))}
                  onChange={setMapMode}
                />
              </div>
              <div className="hstathead">
                <span>Best win rate by map</span>
                <small>
                  {mapModeValue === "All"
                    ? `${filteredMaps.length} maps · all modes`
                    : `${filteredMaps.length} · ${mapModeValue}`}
                </small>
              </div>
              {(detail.topMaps ?? []).length === 0 && <Empty>No map data for this hero yet.</Empty>}
              {(detail.topMaps ?? []).length > 0 && filteredMaps.length === 0 && (
                <Empty>No maps for {mapModeValue}.</Empty>
              )}
              <ul className="hlist">
                {filteredMaps.map((x) => (
                  <li key={x.slug}>
                    <span className="mn">
                      {x.name} <small>{x.mode}</small>
                    </span>
                    <span className="mbar">
                      <i style={{ width: `${Math.max(0, Math.min(100, ((x.winRate ?? 0.5) - 0.4) * 500))}%`, background: color }} />
                    </span>
                    <b style={{ color }}>{pct(x.winRate)}</b>
                    <small>{x.matches.toLocaleString("en-US")}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.meta && <Foot meta={m.meta} href={detail.url ?? `${SITE}/heroes/${detail.slug}`} />}
        </>
      )}
    </Card>
  );
});
