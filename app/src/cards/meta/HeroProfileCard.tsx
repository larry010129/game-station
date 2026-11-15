import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { MetaHeroDetail, MetaMatchup } from "../../lib/types";
import { Segmented } from "../../components/Segmented";
import { StationSelect } from "../../components/StationSelect";
import { signal } from "../../boot/bootSignals";
import { Card, Empty } from "../ui";
import { withGame } from "../../lib/games";
import { openLink } from "../../lib/openLink";
import { pct, useGameMeta, RoleFilter, useMetaMode, ModeSelect, useMeta, Stamp, Portrait, Foot } from "./shared";
import { ARCH_COLORS, STAT_ROWS, CombatRadar, ArchetypeRadar, CmpBar, Dots } from "./charts";
import { readString, writeString } from "../../lib/storage";
import { KEYS } from "../../lib/storageKeys";
import { api } from "../../lib/api";

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

function ApexProfileBody({ detail }: { detail: MetaHeroDetail }) {
  const color = detail.roleColor || "var(--orange)";
  const leanColor = ARCH_COLORS[detail.lean ?? ""] ?? "#a78bfa";
  /** Kit radar only when Apex SUSTAIN axis is present — never invent OW RUSH or blank zeros. */
  const showKitRadar = typeof detail.archetype?.SUSTAIN === "number";
  const delta =
    detail.pickDelta != null
      ? `${detail.pickDeltaDir === "down" ? "▼" : "▲"} ${(detail.pickDelta * 100).toFixed(2)}% vs 7d ago`
      : null;
  const peers = detail.classPeers ?? [];
  const sources = detail.sources?.length
    ? detail.sources
    : [
        { label: "Apex Legends Status", href: detail.url ?? "https://apexlegendsstatus.com/game-stats/legends-pick-rates/" },
        { label: "Tracker.gg Apex", href: "https://tracker.gg/apex" },
      ];

  return (
    <>
      <div className="hapex">
        <div className="hapex-block">
          <div className="hstathead">
            <span>Pick rate</span>
            <small>ALS popularity · any mode</small>
          </div>
          <div className="hapex-pick">
            <b style={{ color }}>{pct(detail.pickRate)}</b>
            {delta && (
              <span className={`hapex-delta ${detail.pickDeltaDir === "down" ? "down" : "up"}`}>{delta}</span>
            )}
          </div>
          {detail.classPickAvg != null && detail.pickRate != null && (
            <div className="hapex-vs">
              <span>vs {(detail.role ?? "class").toLowerCase()} avg</span>
              <CmpBar value={detail.pickRate} avg={detail.classPickAvg} color={color} />
              <div className="hnums">
                <b style={{ color }}>{pct(detail.pickRate)}</b>
                <small>{pct(detail.classPickAvg)}</small>
              </div>
            </div>
          )}
          <ul className="hapex-facts">
            {detail.popularityRank != null && (
              <li>
                <span>Popularity</span>
                <b>#{detail.popularityRank}</b>
              </li>
            )}
            {detail.avgRank && (
              <li>
                <span>Avg rank</span>
                <b>{detail.avgRank}</b>
              </li>
            )}
            {detail.avgLevel != null && (
              <li>
                <span>Avg level</span>
                <b>{detail.avgLevel.toLocaleString("en-US")}</b>
              </li>
            )}
            {detail.tier && (
              <li>
                <span>Pick tier</span>
                <b>Tier {detail.tier}</b>
              </li>
            )}
          </ul>
        </div>
        <div className="hapex-block">
          <div className="hstathead">
            <span>Same class</span>
            <small>{detail.role ?? "—"} · by pick rate</small>
          </div>
          {peers.length === 0 && <Empty>No class peers in the ALS table yet.</Empty>}
          <ul className="hlist hapex-peers">
            {peers.slice(0, 6).map((h) => (
              <li key={h.slug ?? h.id}>
                <Portrait hero={h} size={34} />
                <span className="hn">
                  <b>{h.name}</b>
                  <small>{h.role}</small>
                </span>
                <b className="hs" style={{ color }}>
                  {pct(h.pickRate)}
                </b>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {showKitRadar && (
        <div className="hviz">
          <ArchetypeRadar scores={detail.archetype} lean={detail.lean} game="apex" />
          <div className="hlean">
            <small>Leans</small>
            <b style={{ color: leanColor }}>{detail.lean || "—"}</b>
            <p>{detail.leanBlurb}</p>
          </div>
        </div>
      )}
      <div className="hapex-links">
        {sources.map((s) => (
          <button key={s.href} type="button" className="mlink" onClick={() => openLink(s.href)}>
            {s.label} ↗
          </button>
        ))}
      </div>
    </>
  );
}

export const HeroProfileCard = memo(function HeroProfileCard({ instanceId = "heroprofile" }: { instanceId?: string }) {
  const { mode, pick: pickMode } = useMetaMode();
  const { game, SITE, ROLES, MAP_MODES, cards, character, defaultHero } = useGameMeta();
  const m = useMeta(mode);
  const primary = instanceId === "heroprofile";
  const heroKey = `${HERO_KEY}.${game}.${instanceId}`;
  const [slug, setSlug] = useState(() => readString(heroKey) || (primary && game === "overwatch" ? readString(HERO_KEY) : null) || defaultHero);
  const [detail, setDetail] = useState<MetaHeroDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"profile" | "counters" | "maps">("profile");
  const [counterRole, setCounterRole] = useState<RoleFilter>("All");
  const [mapMode, setMapMode] = useState("All");
  /** Stamp reload bumps meta.fetchedAt — force-refetch hero (also replaces caches missing byRole). */
  const prevMetaFetchedAt = useRef<number | undefined>(undefined);
  const apex = game === "apex";

  useEffect(() => {
    setSlug(readString(heroKey) || defaultHero);
    setDetail(null);
    setCounterRole("All");
    setMapMode("All");
    setView("profile");
  }, [game, heroKey, defaultHero]);

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
  }, [detail?.topMaps, MAP_MODES]);
  const mapModeValue = mapModeOptions.includes(mapMode) ? mapMode : "All";
  const filteredMaps = useMemo(() => {
    const maps = detail?.topMaps ?? [];
    return mapModeValue === "All" ? maps : maps.filter((x) => x.mode === mapModeValue);
  }, [detail?.topMaps, mapModeValue]);

  const avoidList = useMemo(() => {
    const overall = detail?.counters?.losesTo ?? [];
    if (counterRole === "All") return overall;
    const byRole = detail?.counters?.byRole as Record<string, { losesTo?: MetaMatchup[]; beats?: MetaMatchup[] }> | undefined;
    const bucket = byRole?.[counterRole]?.losesTo;
    // Prefer full per-role buckets; fall back to filtering overall if cache predates byRole / is empty.
    if (bucket?.length) return bucket;
    return overall.filter((c) => c.role === counterRole);
  }, [detail?.counters, counterRole]);
  const beatsList = useMemo(() => {
    const overall = detail?.counters?.beats ?? [];
    if (counterRole === "All") return overall;
    const byRole = detail?.counters?.byRole as Record<string, { losesTo?: MetaMatchup[]; beats?: MetaMatchup[] }> | undefined;
    const bucket = byRole?.[counterRole]?.beats;
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
    const q = withGame("/api/meta/hero", game, { slug, mode, force: force ? "1" : undefined });
    api<MetaHeroDetail>(q)
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
  }, [slug, mode, m.meta?.fetchedAt, game]);

  const pick = (next: string) => {
    setSlug(next);
    writeString(heroKey, next);
  };

  const color = detail?.roleColor || "var(--orange)";
  const leanColor = ARCH_COLORS[detail?.lean ?? ""] ?? "#a78bfa";

  const countersEmpty =
    (apex && (detail?.counters?.losesTo?.length ?? 0) === 0 && (detail?.counters?.beats?.length ?? 0) === 0) ||
    (mode === "6v6" && (detail?.counters?.losesTo?.length ?? 0) === 0 && (detail?.counters?.beats?.length ?? 0) === 0);

  const tabs = ["profile", "counters", "maps"] as const;
  const tabLabel = (v: (typeof tabs)[number]) =>
    v === "profile" ? "Profile" : v === "counters" ? (apex ? "Matchups" : "Counters") : "Maps";

  return (
    <Card
      title={cards.heroprofile}
      sub={
        detail
          ? apex
            ? `${detail.role ?? character} · ALS pick rates`
            : `${detail.role ?? character} · ${mode}`
          : apex
            ? `Class, pick rate, sources · ${mode}`
            : `Combat, playstyle, vs role avg · ${mode}`
      }
      right={<Stamp m={m} />}
    >
      <div className="mfilters">
        <ModeSelect value={mode} onChange={pickMode} />
        <div className="msel">
          <StationSelect
            label={character}
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

      {loading && !detail && <Empty>Loading {character.toLowerCase()} page…</Empty>}
      {!loading && err && !detail && <Empty>Couldn't read this {character.toLowerCase()}: {err}</Empty>}
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
              {apex ? (
                <>
                  <b style={{ color }}>{pct(detail.pickRate)}</b>
                  <small>Pick rate</small>
                  <span>
                    {detail.popularityRank != null ? `#${detail.popularityRank} overall` : "ALS popularity"}
                  </span>
                </>
              ) : (
                <>
                  <b>{pct(detail.winRate)}</b>
                  <small>Win rate</small>
                  <span>{detail.matches.toLocaleString("en-US")} matches</span>
                </>
              )}
            </div>
          </div>

          <div className="hseg seg" role="tablist" aria-label={apex ? "Legend profile sections" : "Hero profile sections"}>
            {tabs.map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>
                {tabLabel(v)}
              </button>
            ))}
          </div>

          {view === "profile" && (
            <>
              {apex ? (
                <ApexProfileBody detail={detail} />
              ) : (
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
            </>
          )}

          {view === "counters" && (
            <div className="hcount">
              {countersEmpty ? (
                <Empty>
                  {apex ? (
                    <>
                      ALS does not publish legend-vs-legend matchups on the public pick-rate page.{" "}
                      <button type="button" className="mlink" onClick={() => openLink(detail.url ?? SITE)}>
                        Open Apex Legends Status ↗
                      </button>
                    </>
                  ) : (
                    "No 6v6 counter matchups in Counterwatch's public slice yet. Win rate, combat, and maps still update for 6v6."
                  )}
                </Empty>
              ) : (
                <>
                  <div className="mfilters">
                    <Segmented
                      label={apex ? "Class" : "Role"}
                      value={ROLES.includes(counterRole) ? counterRole : "All"}
                      options={ROLES.map((r) => ({ value: r, label: r }))}
                      onChange={setCounterRole}
                    />
                  </div>
                  <div className="hcols">
                    <MatchupList
                      key={`avoid-${counterRole}`}
                      title="Avoid"
                      sub={`${apex ? "Legends" : "Heroes"} that beat ${detail.name}${counterRole === "All" ? "" : ` · ${counterRole}`}`}
                      tone="bad"
                      list={avoidList}
                    />
                    <MatchupList
                      key={`beats-${counterRole}`}
                      title="Beats"
                      sub={`${apex ? "Legends" : "Heroes"} ${detail.name} beats${counterRole === "All" ? "" : ` · ${counterRole}`}`}
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
              {(detail.topMaps ?? []).length === 0 ? (
                <Empty>
                  {apex ? (
                    <>
                      No public per-legend map win rates in the ALS scrape.{" "}
                      <button type="button" className="mlink" onClick={() => openLink(SITE)}>
                        Open ALS ↗
                      </button>
                    </>
                  ) : (
                    "No map data for this hero yet."
                  )}
                </Empty>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
          {m.meta && <Foot meta={m.meta} href={detail.url ?? (game === "apex" ? SITE : `${SITE}/heroes/${detail.slug}`)} />}
        </>
      )}
    </Card>
  );
});
