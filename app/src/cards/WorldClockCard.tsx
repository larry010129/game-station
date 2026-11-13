import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CLOCK_LOOKS } from "../layout/layouts";
import { Card, useEvery } from "./ui";

interface City {
  label: string;
  tz: string;
}

const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const KEY = "cs.clocks";

function useCities() {
  const [cities, setCities] = useState<City[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const got = raw ? (JSON.parse(raw) as City[]) : null;
      if (Array.isArray(got) && got.length) return got;
    } catch {
      // fall through
    }
    return [
      { label: "You", tz: localTz() },
      { label: "Los Angeles", tz: "America/Los_Angeles" },
      { label: "London", tz: "Europe/London" },
      { label: "Seoul", tz: "Asia/Seoul" },
    ];
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cities));
    } catch {
      // Storage blocked: it still works until the app closes.
    }
  }, [cities]);
  return [cities, setCities] as const;
}

const validTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat([], { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

interface Parts {
  h: number;
  m: number;
  s: number;
  /** Hours since midnight, 0 to 24. */
  hf: number;
  /** Minutes ahead of UTC. */
  off: number;
  day: string;
  date: string;
  hm: string;
  ss: string;
}

function parts(tz: string, d: Date): Parts {
  const ok = validTz(tz);
  const zone = ok ? tz : "UTC";
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short", day: "numeric", month: "short" }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)?.value ?? "0";
  const h = +g("hour") % 24;
  const m = +g("minute");
  const s = +g("second");
  const off = Math.round((new Date(d.toLocaleString("en-US", { timeZone: zone })).getTime() - new Date(d.toLocaleString("en-US", { timeZone: "UTC" })).getTime()) / 60000);
  const p2 = (n: number) => String(n).padStart(2, "0");
  return { h, m, s, hf: h + m / 60 + s / 3600, off, day: g("weekday"), date: `${g("day")} ${g("month")}`, hm: `${p2(h)}:${p2(m)}`, ss: p2(s) };
}

const rel = (o: number, base: number) => {
  const x = (o - base) / 60;
  return x === 0 ? "here" : `${x > 0 ? "+" : "−"}${Math.abs(x)} h`;
};

interface LookProps {
  cities: City[];
  P: Parts[];
}

/** 1. Rulers: one tick ruler per city, the marker slides along that city's day. */
function Rulers({ cities, P }: LookProps) {
  const me = P[0];
  return (
    <div className="wc-rulers">
      {cities.map((c, i) => (
        <div key={`${c.tz}${i}`} className="wc-r">
          <div className="wc-rh">
            <span>
              {c.label}
              <small>{i === 0 ? "here" : `${P[i].day} · ${rel(P[i].off, me.off)}`}</small>
            </span>
            <b>{P[i].hm}</b>
          </div>
          <div className="ticks">
            <i style={{ left: `${(P[i].hf / 24) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="xl wc-axis">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}

/** 2. Ring: one dashed 24-hour ring, each city a dot at its local hour. */
function Ring({ cities, P }: LookProps) {
  const X = 149;
  const Y = 134;
  const R = 92;
  const pol = (hf: number, r: number): [number, number] => {
    const a = (hf / 24) * 2 * Math.PI;
    return [X + r * Math.sin(a), Y - r * Math.cos(a)];
  };
  const [x1, y1] = pol(6, R);
  const [x2, y2] = pol(18, R);
  return (
    <svg className="wc-ring" viewBox="0 0 298 268" role="img" aria-label="World clock ring">
      <path className="day" d={`M${x1} ${y1}A${R} ${R} 0 0 1 ${x2} ${y2}`} />
      <circle className="rg" cx={X} cy={Y} r={R} />
      {Array.from({ length: 24 }, (_, h) => {
        const m = h % 6 === 0;
        const [a, b] = pol(h, R - (m ? 11 : 6));
        const [c, d] = pol(h, R - 2);
        return <line key={h} className={`tk${m ? " m" : ""}`} x1={a} y1={b} x2={c} y2={d} />;
      })}
      {[0, 6, 12, 18].map((h) => {
        const [x, y] = pol(h, R - 21);
        return (
          <text key={h} className="hr" x={x} y={y + 3.5}>
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
      <circle className="hub" cx={X} cy={Y} r="36" />
      <text className="ht" x={X} y={Y + 4}>
        {P[0].hm}
      </text>
      <text className="hs" x={X} y={Y + 18}>
        {cities[0].label.toLowerCase()}
      </text>
      {cities.map((c, i) => {
        const [x, y] = pol(P[i].hf, R);
        const [lx, ly] = pol(P[i].hf, R + 17);
        const a = (P[i].hf / 24) * 2 * Math.PI;
        const sx = Math.sin(a);
        const cx = Math.cos(a);
        const anchor = sx > 0.3 ? "start" : sx < -0.3 ? "end" : "middle";
        const dy = cx > 0.6 ? -16 : cx < -0.6 ? 8 : -4;
        return (
          <g key={`${c.tz}${i}`}>
            <g transform={`translate(${x} ${y})`}>
              <circle className="halo" r="10.5" />
              <circle className={`dot${i === 0 ? " me" : ""}`} r="5.5" />
            </g>
            <text className="nm" x={lx} y={ly + dy} textAnchor={anchor}>
              {i === 0 ? "You" : c.label}
            </text>
            <text className="tm" x={lx} y={ly + dy + 14} textAnchor={anchor}>
              {P[i].hm}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** 3. Curve: the sun's day as a hairline curve; cities ride along it, above the dashed horizon means daytime. */
function Curve({ cities, P }: LookProps) {
  const W = 600;
  const H = 330;
  const HZ = 178;
  const AMP = 112;
  const cy = (hf: number) => HZ - AMP * Math.sin(((hf - 6) / 24) * 2 * Math.PI);
  const pts = useMemo(() => {
    const a: string[] = [];
    for (let h = 0; h <= 24; h += 0.25) a.push(`${((h / 24) * W).toFixed(1)},${cy(h).toFixed(1)}`);
    return a.join(" ");
  }, []);
  const me = P[0];
  const order = cities
    .map((_, i) => i)
    .filter((i) => i > 0)
    .sort((a, b) => P[a].hf - P[b].hf);
  const label = new Map<number, { up: boolean }>();
  let last: { lp: number; up: boolean } | null = null;
  for (const i of order) {
    const lp = (P[i].hf / 24) * 100;
    const y = cy(P[i].hf);
    let up = y < HZ;
    if (last && lp - last.lp < 15) up = !last.up;
    if (Math.abs(P[i].hf - me.hf) < 3.2) up = !(y > cy(me.hf));
    if (lp < 34) up = false;
    if (lp > 80) up = true;
    label.set(i, { up });
    last = { lp, up };
  }
  const pct = (v: number) => `${(v / H) * 100}%`;
  return (
    <div className="wc-curve">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <line className="d" x1="0" x2={W} y1={HZ - AMP} y2={HZ - AMP} />
        <line className="d t" x1="0" x2={W} y1={HZ} y2={HZ} />
        <line className="d" x1="0" x2={W} y1={HZ + AMP} y2={HZ + AMP} />
        <polyline className="l" points={pts} />
      </svg>
      <span className="lev f" style={{ top: pct(HZ - AMP) }}>
        12<small>noon</small>
      </span>
      <span className="lev" style={{ top: pct(HZ) }}>
        06 · 18<small>horizon</small>
      </span>
      <span className="lev f" style={{ top: pct(HZ + AMP) }}>
        00<small>midnight</small>
      </span>
      {[
        ["3%", "00"],
        ["25%", "06"],
        ["50%", "12"],
        ["75%", "18"],
      ].map(([l, t]) => (
        <span key={t} className="xa" style={{ left: l }}>
          {t}
        </span>
      ))}
      <div className="ring" style={{ left: `${(me.hf / 24) * 100}%`, top: pct(cy(me.hf)) }}>
        <span>{me.hm}</span>
      </div>
      {cities.map((c, i) => {
        if (i === 0) return null;
        const lp = (P[i].hf / 24) * 100;
        const y = cy(P[i].hf);
        const up = label.get(i)?.up ?? false;
        return (
          <div key={`${c.tz}${i}`}>
            <div className="pt" style={{ left: `${lp}%`, top: pct(y) }} />
            <div className="cl" style={{ left: `${Math.min(84, Math.max(8, lp))}%`, top: `calc(${pct(y)} + ${up ? -52 : 14}px)` }}>
              {c.label}
              <b>{P[i].hm}</b>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 4. Levels: a dashed level per city; cities ahead of you sit higher, cities behind sit lower. */
function Levels({ cities, P }: LookProps) {
  const box = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(220);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    setH(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  const me = P[0];
  const offs = P.map((p) => (p.off - me.off) / 60);
  const mx = Math.max(...offs);
  const mn = Math.min(...offs);
  const span = Math.max(1, mx - mn);
  const room = Math.max(40, h - 30);
  const gap = Math.min(34, room / Math.max(1, cities.length));
  const rows = cities.map((_, i) => ({ i, y: 24 + ((mx - offs[i]) / span) * room })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < rows.length; k++) if (rows[k].y - rows[k - 1].y < gap) rows[k].y = rows[k - 1].y + gap;
  const over = rows[rows.length - 1].y - (room + 24);
  if (over > 0) {
    for (let k = rows.length - 1; k >= 0; k--) {
      rows[k].y -= over;
      if (k && rows[k].y - rows[k - 1].y >= gap) break;
    }
  }
  return (
    <div className="wc-lad" ref={box}>
      {rows.map(({ i, y }) => (
        <div key={`${cities[i].tz}${i}`} className={`ln${i === 0 ? " me" : ""}`} style={{ top: y }}>
          {i === 0 && <div className="pt" />}
          <em>{i === 0 ? `You · ${cities[i].label}` : cities[i].label}</em>
          <span className="lev">
            {P[i].hm}
            <small>{i === 0 ? P[i].day : `${rel(P[i].off, me.off)}${P[i].day !== me.day ? ` · ${P[i].day}` : ""}`}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

/** 5. Headline: your time large with a day-progress ruler, the others in a small grid. */
function Headline({ cities, P }: LookProps) {
  const me = P[0];
  return (
    <div className="wc-head">
      <div className="wc-hrow">
        <div className="big">
          {me.hm}
          <small>{me.ss}</small>
        </div>
        <span className="chip">
          {me.day} {me.date}
        </span>
      </div>
      <div className="ticks">
        <i style={{ left: `${(me.hf / 24) * 100}%` }} />
      </div>
      <div className="xl">
        <span>00</span>
        <span>{Math.round((me.hf / 24) * 100)}% of the day</span>
        <span>24</span>
      </div>
      <div className="wc-quad">
        {cities.slice(1).map((c, i) => (
          <div key={`${c.tz}${i}`} className="q">
            <small>{c.label}</small>
            <div>
              <b>{P[i + 1].hm}</b>
              <i>
                {rel(P[i + 1].off, me.off)}
                {P[i + 1].day !== me.day ? ` · ${P[i + 1].day}` : ""}
              </i>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const LOOKS = { rulers: Rulers, ring: Ring, curve: Curve, levels: Levels, headline: Headline } as const;

interface Props {
  look?: string;
  onLook: (look: string) => void;
}

/**
 * Clocks for the places your teammates are, drawn one of five ways. The look and the
 * list of cities are changed from the dots menu on the card (or the look box while editing the layout).
 */
export function WorldClockCard({ look, onLook }: Props) {
  const [cities, setCities] = useCities();
  const [menu, setMenu] = useState(false);
  const [label, setLabel] = useState("");
  const [tz, setTz] = useState("");
  const [now, setNow] = useState(() => new Date());
  const ms = useEvery(1000, 15000);
  useEffect(() => {
    if (!ms) return;
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);

  const P = useMemo(() => cities.map((c) => parts(c.tz, now)), [cities, now]);
  const View = LOOKS[(look as keyof typeof LOOKS) in LOOKS ? (look as keyof typeof LOOKS) : "rulers"];
  const zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  const lookName = CLOCK_LOOKS.find((l) => l.id === look)?.name ?? CLOCK_LOOKS[0].name;

  return (
    <Card
      title="World clock"
      sub={menu ? "Look and cities" : lookName}
      right={
        <button className="klink" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          {menu ? "Done" : "Customise"}
        </button>
      }
    >
      {menu ? (
        <div className="wc-menu">
          <h3>Look</h3>
          <div className="wc-looks">
            {CLOCK_LOOKS.map((l) => (
              <button key={l.id} className={`klink${l.id === (look ?? CLOCK_LOOKS[0].id) ? " on" : ""}`} aria-pressed={l.id === (look ?? CLOCK_LOOKS[0].id)} onClick={() => onLook(l.id)}>
                {l.name}
              </button>
            ))}
          </div>
          <h3>Cities</h3>
          <div className="klist">
            {cities.map((c, i) => (
              <div key={`${c.tz}${i}`} className="krow clock">
                <span className="kname">{i === 0 ? `${c.label} (first = your time)` : c.label}</span>
                <b className="ktime">{P[i].hm}</b>
                {i > 0 && (
                  <button className="kx" aria-label={`Remove ${c.label}`} onClick={() => setCities(cities.filter((_, j) => j !== i))}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <form
            className="kadd"
            onSubmit={(e) => {
              e.preventDefault();
              if (!validTz(tz) || cities.length >= 6) return;
              setCities([...cities, { label: label.trim() || tz.split("/").pop()!.replace(/_/g, " "), tz }]);
              setLabel("");
              setTz("");
            }}
          >
            <input placeholder="Name (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input list="wc-tz" placeholder="Time zone, e.g. Asia/Tokyo" value={tz} onChange={(e) => setTz(e.target.value)} />
            <datalist id="wc-tz">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            <button className="eb-btn primary" disabled={!validTz(tz) || cities.length >= 6} title={cities.length >= 6 ? "Six cities at most" : undefined}>
              Add
            </button>
          </form>
        </div>
      ) : (
        <div className="wc-body">
          <View cities={cities} P={P} />
        </div>
      )}
    </Card>
  );
}
