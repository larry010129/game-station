import { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import type { PlayersData } from "../lib/types";
import { Icon } from "./Icon";

const W = 1000;
const H = 500;
const SLOTS = 24;

// Where each region's bubble sits on the map: [longitude, latitude].
const CENTER: Record<string, [number, number]> = {
  na: [-100, 40],
  sa: [-60, -14],
  eu: [12, 50],
  asia: [98, 33],
  oce: [135, -25],
  other: [28, 6],
};

const fmt = (n: number) => n.toLocaleString("en-US");
const hourLabel = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric" }).replace(" ", "").toLowerCase();

function useMap() {
  return useMemo(() => {
    const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
    const land = feature(topo, topo.objects.land);
    const projection = geoNaturalEarth1().fitExtent(
      [
        [8, 8],
        [W - 8, H - 8],
      ],
      { type: "Sphere" },
    );
    const path = geoPath(projection);
    return { d: path(land) ?? "", sphere: path({ type: "Sphere" }) ?? "", project: (p: [number, number]) => projection(p) ?? [0, 0] };
  }, []);
}

export function PlayersMap({ data, failed }: { data: PlayersData | null; failed: boolean }) {
  const map = useMap();
  const hours = data?.hours ?? [];
  const now = data?.latest?.count ?? null;
  const peak = hours.reduce((m, h) => Math.max(m, h.count), 0);
  const max = Math.max(peak, now ?? 0, 1);

  return (
    <section className="players" aria-label="Players online by hour and region">
      <header className="ph">
        <div>
          <h2>Players online</h2>
          <small>{data?.demo ? "Sample data" : data ? "Steam, per hour" : "Loading"}</small>
        </div>
        <div className="pnow">
          {now == null ? "—" : fmt(now)}
          <small> now</small>
        </div>
        <Icon name="out" small />
      </header>

      <div className="pmap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="World map with estimated players per region">
          <path className="sphere" d={map.sphere} />
          <path className="land" d={map.d} />
          {data?.regions.map((r) => {
            const [x, y] = map.project(CENTER[r.id] ?? [0, 0]);
            const count = now == null ? null : Math.round(now * r.share);
            const rad = 14 + Math.sqrt(r.share) * 62;
            return (
              <g key={r.id} transform={`translate(${x} ${y})`}>
                <circle className="halo" r={rad * 1.5} />
                <circle className="dot" r={rad} />
                <text className="pct" y={-2}>
                  {Math.round(r.share * 100)}%
                </text>
                <text className="rn" y={16}>
                  {r.name}
                </text>
                {count != null && (
                  <text className="rc" y={32}>
                    ~{fmt(count)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {data?.regionsEstimated && <span className="est">Regions estimated</span>}
      </div>

      <div className="pbars" role="img" aria-label={`Players online, last ${hours.length} hours`}>
        {hours.length === 0 ? (
          <p className="pempty">{failed || data?.error ? "Couldn't reach Steam. The chart fills in once it can." : "Collecting the first reading."}</p>
        ) : (
          [...Array(Math.max(0, SLOTS - hours.length)).fill(null), ...hours.slice(-SLOTS)].map((h, i) => {
            if (!h) return <div key={`e${i}`} className="pb" />;
            const last = h === hours[hours.length - 1];
            return (
              <div key={h.t} className="pb" title={`${hourLabel(h.t)}: ${fmt(h.count)}`}>
                <i className={last ? "now" : h.count === peak ? "peak" : ""} style={{ height: `${Math.max(3, (h.count / max) * 100)}%` }} />
                {(i % 4 === 0 || last) && <span>{hourLabel(h.t)}</span>}
              </div>
            );
          })
        )}
      </div>
      <p className="pfoot">
        {peak ? `Peak ${fmt(peak)} · ` : ""}
        {data?.demo ? "sample numbers" : "Steam players only, not Battle.net"}
      </p>
    </section>
  );
}
