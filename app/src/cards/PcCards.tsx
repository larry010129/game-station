import type { SystemData } from "../lib/types";
import { useApi } from "../state/useApi";
import { Bar, Card, Empty, gb, useEvery } from "./ui";

export function MemoryCard() {
  const ms = useEvery(5000, 30000);
  const { data } = useApi<SystemData>("/api/system", ms);
  if (!data) return <Card title="Memory"><Empty>Reading memory...</Empty></Card>;
  const { totalMb, usedMb, top } = data.mem;
  const pct = (usedMb / totalMb) * 100;
  const tone = pct > 90 ? "red" : pct > 80 ? "or" : "ok";
  const biggest = Math.max(...top.map((t) => t.mb), 1);
  return (
    <Card title="Memory" sub="RAM in use" right={<span className={`chip${tone === "ok" ? "" : tone === "or" ? " or" : " red"}`}>{Math.round(pct)}%</span>}>
      <div className="big">
        {gb(usedMb)}
        <small>of {gb(totalMb)} GB</small>
      </div>
      <Bar pct={pct} tone={tone} label="Memory used" />
      <div className="klist">
        {top.slice(0, 5).map((t) => (
          <div key={t.n} className="krow">
            <span className="kname">{t.n}</span>
            <Bar pct={(t.mb / biggest) * 100} tone="dim" />
            <span className="kval">{t.mb >= 1024 ? `${gb(t.mb)} GB` : `${t.mb} MB`}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

const mins = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;

export function PowerCard({ game }: { game: string | null }) {
  const ms = useEvery(10000, 60000);
  const { data } = useApi<SystemData>("/api/system", ms);
  const b = data?.battery;
  if (!data) return <Card title="Power and battery"><Empty>Reading the battery...</Empty></Card>;
  if (!b) return <Card title="Power and battery"><Empty>No battery found. This looks like a desktop PC.</Empty></Card>;
  const plugged = b.online ?? b.status === 2;
  const charge = (b.chargeMw ?? 0) / 1000;
  const drain = (b.dischargeMw ?? 0) / 1000;
  const warn = !plugged && game != null;
  const state = b.charging ? "Charging" : plugged ? "Plugged in" : "On battery";
  const tone = b.pct <= 15 && !plugged ? "red" : b.pct <= 30 && !plugged ? "or" : "ok";
  return (
    <Card
      title="Power and battery"
      sub={state}
      right={warn ? <span className="chip or">Unplugged while gaming</span> : <span className="chip">{plugged ? "On charger" : "On battery"}</span>}
    >
      <div className="big">
        {b.pct}
        <small>%</small>
      </div>
      <Bar pct={b.pct} tone={tone} label="Battery" />
      <div className="kfacts">
        <div>
          <small>{b.charging ? "Charging at" : "Drawing"}</small>
          <b>{b.charging ? (charge ? `${charge.toFixed(1)} W` : "—") : drain ? `${drain.toFixed(1)} W` : plugged ? "0 W" : "—"}</b>
        </div>
        <div>
          <small>Time left</small>
          <b>{!plugged && b.minutes ? mins(b.minutes) : "—"}</b>
        </div>
      </div>
    </Card>
  );
}
