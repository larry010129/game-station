import { memo, useState } from "react";
import type { SystemData } from "../lib/types";
import { useToast } from "../state/Toast";
import { useApi } from "../state/useApi";
import { StatMeter } from "../components/Tiles";
import { Bar, Card, Empty, gb, useEvery } from "./ui";
import { api } from "../lib/api";

export const MemoryCard = memo(function MemoryCard() {
  const toast = useToast();
  const ms = useEvery(5000, 30000);
  const { data } = useApi<SystemData>("/api/system", ms);
  const [busy, setBusy] = useState(false);

  const clean = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = (await api("/api/memory/clean", {})) as { freedMb?: number } | undefined;
      const freed = r?.freedMb ?? 0;
      toast(freed > 0 ? `Memory cleaned: ${freed >= 1024 ? `${gb(freed)} GB` : `${freed} MB`} freed.` : "Memory cleaned.");
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't clean memory.");
    } finally {
      setBusy(false);
    }
  };

  const cleanButton = (
    <button className="eb-btn kmem-clean" type="button" onClick={clean} disabled={busy}>
      {busy ? "Cleaning..." : "Clean memory"}
    </button>
  );

  if (!data) {
    return (
      <Card title="Memory" right={cleanButton}>
        <Empty>Reading memory...</Empty>
      </Card>
    );
  }
  const { totalMb, usedMb, top } = data.mem;
  const pct = (usedMb / totalMb) * 100;
  // Green is comfortable, yellow is getting busy, orange is high, red means close it down.
  const tone = pct >= 85 ? "red" : pct >= 70 ? "or" : pct >= 50 ? "mid" : "good";
  const biggest = Math.max(...top.map((t) => t.mb), 1);
  return (
    <Card title="Memory" sub="RAM in use" label={`Memory ${gb(usedMb)} of ${gb(totalMb)} GB`} right={<span className={`chip ${tone}`}>{Math.round(pct)}%</span>}>
      <div className={`big ${tone}`}>
        {gb(usedMb)}
        <small>of {gb(totalMb)} GB</small>
      </div>
      <StatMeter pct={pct} tone={tone} label={`Memory ${gb(usedMb)} of ${gb(totalMb)} GB`} />
      <div className="klist kmem-list">
        {top.slice(0, 5).map((t) => (
          <div key={t.n} className="krow">
            <span className="kname">{t.n}</span>
            <Bar pct={(t.mb / biggest) * 100} tone="dim" />
            <span className="kval">{t.mb >= 1024 ? `${gb(t.mb)} GB` : `${t.mb} MB`}</span>
          </div>
        ))}
      </div>
      {cleanButton}
    </Card>
  );
});

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
      <div className={`big${tone === "red" ? " red" : tone === "or" ? " or" : ""}`}>
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
