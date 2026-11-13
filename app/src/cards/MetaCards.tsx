import { useEffect, useMemo, useState } from "react";
import { age } from "../lib/format";
import { openLink } from "../lib/openLink";
import type { MetaCombat, MetaData, MetaHero, MetaHeroDetail } from "../lib/types";
import { Segmented } from "../components/Segmented";
import { useApi, useStationCtx } from "../state/useApi";
import { Card, Empty, useEvery } from "./ui";

const HERO_KEY = "cs.meta.hero";

const SITE = "https://www.counterwatch.gg/stats/overwatch";
const DAY = 24 * 3600_000;
const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const ROLES = ["All", "Tank", "Damage", "Support"] as const;
type RoleFilter = (typeof ROLES)[number];

/** Reads the Counterwatch numbers and can ask the service to fetch fresh ones. Cards share one request. */
function useMeta() {
  const { provider } = useStationCtx();
  const ms = useEvery(10 * 60_000, 0);
  const api = useApi<MetaData>("/api/meta", ms);
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
  return { meta, error: api.error, refresh, updating, stale };
}

type Meta = ReturnType<typeof useMeta>;

/** The "Updated 3 h ago" stamp with the reload button, used in every card header. */
function Stamp({ m }: { m: Meta }) {
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

function Portrait({ hero, size = 30 }: { hero: Pick<MetaHero, "name" | "img" | "role">; size?: number }) {
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
function Waiting({ m, ready }: { m: Meta; ready: boolean }) {
  if (m.error && !m.meta) return <Empty>The local service isn't answering. Start it, then press reload.</Empty>;
  if (!m.meta) return <Empty>Loading…</Empty>;
  if (!ready) return <Empty>{m.meta.error ? `Couldn't read counterwatch.gg: ${m.meta.error}` : "Fetching the latest stats from counterwatch.gg…"}</Empty>;
  return null;
}

function Foot({ meta, href }: { meta: MetaData; href: string }) {
  return (
    <p className="mfoot">
      {meta.demo ? "Sample data · " : ""}
      {meta.patch ? `${meta.patch.name} · ` : ""}
      <button className="mlink" onClick={() => openLink(href)}>
        counterwatch.gg ↗
      </button>
    </p>
  );
}

export function TierListCard() {
  const m = useMeta();
  const [role, setRole] = useState<RoleFilter>("All");
  const meta = m.meta;
  const ready = !!meta && meta.tiers.length > 0;
  return (
    <Card title="Hero tier list" sub={meta?.season ? `${meta.season.name}, all ranks` : "All ranks"} right={<Stamp m={m} />}>
      <Waiting m={m} ready={ready} />
      {meta && ready && (
        <>
          <Segmented label="Role" value={role} options={ROLES.map((r) => ({ value: r, label: r }))} onChange={setRole} />
          <div className="mtiers">
            {meta.tiers.map((t) => {
              const list = t.heroes.filter((h) => role === "All" || h.role === role);
              if (!list.length) return null;
              return (
                <div key={t.tier} className="mtier">
                  <b className={`mbadge t${t.tier.toLowerCase()}`}>{t.tier}</b>
                  <div className="mchips">
                    {list.map((h) => (
                      <button
                        key={h.id}
                        className="mchip"
                        onClick={() => h.slug && openLink(`${SITE}/heroes/${h.slug}`)}
                        title={`${h.name}: ${pct(h.winRate)} win rate, ${pct(h.pickRate)} pick rate. Open on Counterwatch.`}
                      >
                        <Portrait hero={h} size={26} />
                        <span>{h.name}</span>
                        <small>{pct(h.winRate, 0)}</small>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <Foot meta={meta} href={`${SITE}/tier-list`} />
        </>
      )}
    </Card>
  );
}

function HeroRow({ hero, note }: { hero: MetaHero; note: string }) {
  return (
    <li className="mrow">
      <Portrait hero={hero} size={30} />
      <span className="mname">
        {hero.name}
        <small>{hero.role}</small>
      </span>
      <span className="mval">
        {pct(hero.winRate)}
        <small>{note}</small>
      </span>
    </li>
  );
}

export function MapPicksCard() {
  const m = useMeta();
  const [slug, setSlug] = useState<string>(() => {
    try {
      return localStorage.getItem("cs.meta.map") ?? "";
    } catch {
      return "";
    }
  });
  const meta = m.meta;
  const maps = useMemo(() => [...(meta?.maps ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [meta]);
  // With no map chosen yet, start on the most played one.
  const busiest = useMemo(() => maps.reduce<(typeof maps)[number] | undefined>((a, b) => (!a || (b.share ?? 0) > (a.share ?? 0) ? b : a), undefined), [maps]);
  const map = maps.find((x) => x.slug === slug) ?? busiest;
  const pick = (s: string) => {
    setSlug(s);
    try {
      localStorage.setItem("cs.meta.map", s);
    } catch {
      // the choice still works until the app closes
    }
  };
  // Suggestion: a best-performing hero that is also popular here is a safe pick; otherwise the top performer.
  const suggestion = map && (map.best.find((b) => map.mostPlayed.some((p) => p.id === b.id)) ?? map.best[0]);
  return (
    <Card title="Map hero picks" sub="What wins on each map" right={<Stamp m={m} />}>
      <Waiting m={m} ready={!!map} />
      {meta && map && (
        <>
          <label className="msel">
            <span className="sr">Map</span>
            <select value={map.slug} onChange={(e) => pick(e.target.value)}>
              {maps.map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.name} · {x.mode}
                </option>
              ))}
            </select>
          </label>
          <p className="mmapinfo">
            {map.mode} · {pct(map.share)} of recent matches
          </p>
          {suggestion && (
            <div className="msuggest">
              <small>Suggested pick</small>
              <div>
                <Portrait hero={suggestion} size={34} />
                <b>{suggestion.name}</b>
                <span className="chip">{pct(suggestion.winRate)} win rate</span>
              </div>
            </div>
          )}
          <div className="mcols">
            <div>
              <h3>Best win rate</h3>
              <ul>
                {map.best.map((h) => (
                  <HeroRow key={h.id} hero={h} note="win rate" />
                ))}
              </ul>
            </div>
            <div>
              <h3>Most played</h3>
              <ul>
                {map.mostPlayed.map((h) => (
                  <HeroRow key={h.id} hero={h} note={`${pct(h.pickRate, 0)} of picks`} />
                ))}
              </ul>
            </div>
          </div>
          <Foot meta={meta} href={`${SITE}/maps`} />
        </>
      )}
    </Card>
  );
}

export function BestPicksCard() {
  const m = useMeta();
  const meta = m.meta;
  const ready = !!meta && meta.picks.length > 0;
  return (
    <Card title="Best pick per role" sub="Strong and steady across maps" right={<Stamp m={m} />}>
      <Waiting m={m} ready={ready} />
      {meta && ready && (
        <>
          <ul className="mpicks">
            {meta.picks.map((p) =>
              p.top ? (
                <li key={p.role}>
                  <small className="mrole">{p.role}</small>
                  <div className="mtop">
                    <Portrait hero={p.top} size={40} />
                    <div>
                      <b>{p.top.name}</b>
                      <span>{pct(p.top.winRate)} win rate</span>
                    </div>
                  </div>
                  {p.top.why && p.top.why.length > 0 && <p className="mwhy">{p.top.why.join(" · ")}</p>}
                  {p.others.length > 0 && <p className="mothers">Also good: {p.others.map((o) => o.name).join(", ")}</p>}
                </li>
              ) : null,
            )}
          </ul>
          <Foot meta={meta} href={`${SITE}/best-onetricks`} />
        </>
      )}
    </Card>
  );
}

const ARCH_COLORS: Record<string, string> = { POKE: "#eab308", RUSH: "#f0893a", DIVE: "#a78bfa" };
const STAT_ROWS: { key: keyof MetaCombat; label: string }[] = [
  { key: "kills", label: "Kills" },
  { key: "deaths", label: "Deaths" },
  { key: "assists", label: "Assists" },
  { key: "damage", label: "Damage" },
];

function polar(cx: number, cy: number, r: number, i: number, n: number) {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
}

function poly(values: number[], cx: number, cy: number, r: number) {
  const n = values.length;
  return values.map((v, i) => polar(cx, cy, r * Math.max(0, Math.min(1, v)), i, n).join(",")).join(" ");
}

/** K / D / A / DMG radar: filled hero vs dotted role average (Counterwatch-style). */
function CombatRadar({ hero, avg, max }: { hero: MetaCombat; avg: MetaCombat; max: MetaCombat }) {
  const keys: (keyof MetaCombat)[] = ["kills", "deaths", "assists", "damage"];
  const labels = ["K", "D", "A", "DMG"];
  const scale = (o: MetaCombat) => keys.map((k) => {
    const m = Math.max(Number(max[k]) || 0, Number(avg[k]) || 0, Number(hero[k]) || 0, 1);
    return (Number(o[k]) || 0) / m;
  });
  const cx = 70;
  const cy = 70;
  const r = 48;
  const n = 4;
  const rings = [0.33, 0.66, 1];
  return (
    <svg className="hradar" viewBox="0 0 140 140" role="img" aria-label="Combat stats versus role average">
      {rings.map((t) => (
        <polygon key={t} className="hgrid" points={Array.from({ length: n }, (_, i) => polar(cx, cy, r * t, i, n).join(",")).join(" ")} />
      ))}
      {keys.map((_, i) => {
        const [x, y] = polar(cx, cy, r, i, n);
        return <line key={i} className="hspoke" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      <polygon className="havg" points={poly(scale(avg), cx, cy, r)} />
      <polygon className="hfill" points={poly(scale(hero), cx, cy, r)} />
      {labels.map((lab, i) => {
        const [x, y] = polar(cx, cy, r + 14, i, n);
        return (
          <text key={lab} className="hlab" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

/** POKE / RUSH / DIVE triangle with the lean vertex emphasized. */
function ArchetypeRadar({ scores, lean }: { scores: MetaHeroDetail["archetype"]; lean: string }) {
  const keys = ["POKE", "RUSH", "DIVE"] as const;
  const values = keys.map((k) => scores[k] ?? 0);
  const cx = 70;
  const cy = 78;
  const r = 52;
  const n = 3;
  return (
    <svg className="hradar arch" viewBox="0 0 140 150" role="img" aria-label={`Composition fit: ${keys.map((k, i) => `${k} ${Math.round(values[i] * 100)}%`).join(", ")}`}>
      {[0.33, 0.66, 1].map((t) => (
        <polygon key={t} className="hgrid" points={Array.from({ length: n }, (_, i) => polar(cx, cy, r * t, i, n).join(",")).join(" ")} />
      ))}
      <polygon className="hfill arch" points={poly(values, cx, cy, r)} />
      {keys.map((k, i) => {
        const [x, y] = polar(cx, cy, r * values[i], i, n);
        const [lx, ly] = polar(cx, cy, r + 18, i, n);
        return (
          <g key={k}>
            <circle cx={x} cy={y} r={3.5} fill={ARCH_COLORS[k]} />
            <text className={`hlab ${k === lean ? "on" : ""}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={ARCH_COLORS[k]}>
              {k}
              <tspan className="hpct" x={lx} dy="1.15em">
                {Math.round(values[i] * 100)}%
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Dual-layer bar: hero fill vs a notch for the role average. */
function CmpBar({ value, avg, color }: { value: number; avg: number; color: string }) {
  const top = Math.max(value, avg, 0.001) * 1.08;
  return (
    <div className="hcmp" aria-hidden="true">
      <i style={{ width: `${(value / top) * 100}%`, background: color }} />
      <b style={{ left: `${(avg / top) * 100}%` }} />
    </div>
  );
}

function Dots({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span className="hdots" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < n ? "on" : ""} />
      ))}
    </span>
  );
}

export function HeroProfileCard() {
  const m = useMeta();
  const { provider } = useStationCtx();
  const [slug, setSlug] = useState(() => {
    try {
      return localStorage.getItem(HERO_KEY) ?? "tracer";
    } catch {
      return "tracer";
    }
  });
  const [detail, setDetail] = useState<MetaHeroDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const roster = useMemo(() => {
    const list = (m.meta?.tiers ?? []).flatMap((t) => t.heroes.map((h) => ({ ...h, tier: t.tier })));
    return list.filter((h) => h.slug).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [m.meta]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    provider
      .api<MetaHeroDetail>(`/api/meta/hero?slug=${encodeURIComponent(slug)}`)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setErr(d.error ?? null);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setErr(e.message);
        setDetail(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [provider, slug, m.meta?.fetchedAt]);

  const pick = (next: string) => {
    setSlug(next);
    try {
      localStorage.setItem(HERO_KEY, next);
    } catch {
      // ignore
    }
  };

  const color = detail?.roleColor || "var(--orange)";
  const leanColor = ARCH_COLORS[detail?.lean ?? ""] ?? "#a78bfa";

  return (
    <Card
      title="Hero profile"
      sub={detail ? `${detail.role ?? "Hero"} · Counterwatch` : "Combat, playstyle, vs role avg"}
      right={<Stamp m={m} />}
    >
      <label className="msel">
        <span className="sr">Hero</span>
        <select value={slug} onChange={(e) => pick(e.target.value)} disabled={!roster.length && !slug}>
          {roster.length === 0 && <option value={slug}>{detail?.name ?? slug}</option>}
          {roster.map((h) => (
            <option key={h.slug!} value={h.slug!}>
              {h.name} ({h.tier})
            </option>
          ))}
        </select>
      </label>

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

          {detail.bestMaps.length > 0 && (
            <p className="mmapinfo">
              Best maps: {detail.bestMaps.map((x) => `${x.name} ${pct(x.winRate, 0)}`).join(" · ")}
            </p>
          )}
          <Foot meta={m.meta!} href={detail.url ?? `${SITE}/heroes/${detail.slug}`} />
        </>
      )}
    </Card>
  );
}
