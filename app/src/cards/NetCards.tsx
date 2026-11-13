import { memo, useEffect, useState } from "react";
import type { NetData } from "../lib/types";
import { useApi } from "../state/useApi";
import { Bar, Card, Empty, Sparkline, useEvery, type Tone } from "./ui";
import { readJson, writeJson } from "../lib/storage";
import { KEYS } from "../lib/storageKeys";

const pingTone = (ms: number | null): Tone => (ms == null ? "dim" : ms <= 60 ? "ok" : ms <= 120 ? "or" : "red");

function useNet() {
  // Probing only runs on the service while a card is asking, and stops during a match.
  const ms = useEvery(2000, 0);
  return useApi<NetData>("/api/net", ms);
}

/** Metrics the Connection verdict card can show; preference key `cs.verdict.metrics`. */
type VerdictMetricId = "overall" | "americas" | "europe" | "asia" | "ping" | "jitter" | "loss" | "wifi";

const VERDICT_METRICS: { id: VerdictMetricId; label: string }[] = [
  { id: "overall", label: "Overall" },
  { id: "americas", label: "Americas ping" },
  { id: "europe", label: "Europe ping" },
  { id: "asia", label: "Asia ping" },
  { id: "ping", label: "Host ping" },
  { id: "jitter", label: "Jitter" },
  { id: "loss", label: "Packet loss" },
  { id: "wifi", label: "Wi-Fi" },
];

const VERDICT_DEFAULT: VerdictMetricId[] = ["overall", "americas", "europe", "asia", "jitter"];
const VERDICT_KEY = KEYS.verdictMetrics;
const VERDICT_IDS = new Set(VERDICT_METRICS.map((m) => m.id));

function readVerdictMetrics(): VerdictMetricId[] {
  const raw = readJson<unknown>(VERDICT_KEY, null);
  if (!Array.isArray(raw)) return VERDICT_DEFAULT;
  const next = raw.filter((id): id is VerdictMetricId => typeof id === "string" && VERDICT_IDS.has(id as VerdictMetricId));
  return next.length ? next : VERDICT_DEFAULT;
}

function useVerdictMetrics() {
  const [ids, setIds] = useState<VerdictMetricId[]>(readVerdictMetrics);
  useEffect(() => {
    // Storage blocked: selection still works until the app closes.
    writeJson(VERDICT_KEY, ids);
  }, [ids]);
  const toggle = (id: VerdictMetricId) => {
    setIds((cur) => {
      if (cur.includes(id)) {
        if (cur.length <= 1) return cur;
        return cur.filter((x) => x !== id);
      }
      return VERDICT_METRICS.map((m) => m.id).filter((x) => x === id || cur.includes(x));
    });
  };
  return { ids, toggle };
}

function toneClass(tone: Tone): string {
  return tone === "ok" || tone === "dim" ? "" : tone;
}

export const RegionPingCard = memo(function RegionPingCard() {
  const { data } = useNet();
  if (!data) return <Card title="Ping by region"><Empty>Measuring...</Empty></Card>;
  const best = data.regions.reduce<number | null>((m, r) => (r.ms != null && (m == null || r.ms < m) ? r.ms : m), null);
  return (
    <Card title="Ping by region" sub="Round trip to Blizzard's game servers">
      <div className="klist roomy">
        {data.regions.map((r) => (
          <div key={r.id} className="krow big-row">
            <span className="kname">{r.name}</span>
            <Bar pct={r.ms == null ? 0 : Math.min(100, (r.ms / 250) * 100)} tone={pingTone(r.ms)} label={`${r.name} ping`} />
            <span className={`kval${r.ms != null && r.ms > 120 ? " red" : r.ms != null && r.ms > 60 ? " or" : ""}`}>
              {r.ms == null ? "—" : `${r.ms} ms`}
              {r.ms != null && r.ms === best && <em> best</em>}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
});

export const JitterCard = memo(function JitterCard() {
  const { data } = useNet();
  if (!data) return <Card title="Jitter and packet loss"><Empty>Measuring...</Empty></Card>;
  const j = data.jitter;
  const tone = j.lossPct != null && j.lossPct >= 2 ? "red" : j.jitter != null && j.jitter > 15 ? "or" : "ok";
  return (
    <Card title="Jitter and packet loss" sub={`To ${data.host}, last ${j.samples.length} s`} right={<span className={`chip${tone === "ok" ? "" : tone === "or" ? " or" : " red"}`}>{tone === "ok" ? "Steady" : tone === "or" ? "Uneven" : "Dropping"}</span>}>
      <Sparkline values={j.samples} lo={0} />
      <div className="kfacts three">
        <div>
          <small>Ping</small>
          <b className={j.avg == null ? undefined : j.avg > 120 ? "red" : j.avg > 60 ? "or" : undefined}>{j.avg == null ? "—" : `${j.avg} ms`}</b>
        </div>
        <div>
          <small>Jitter</small>
          <b className={j.jitter == null ? undefined : j.jitter > 25 ? "red" : j.jitter > 15 ? "or" : undefined}>{j.jitter == null ? "—" : `${j.jitter} ms`}</b>
        </div>
        <div>
          <small>Lost</small>
          <b className={j.lossPct == null ? undefined : j.lossPct >= 2 ? "red" : j.lossPct > 0 ? "or" : undefined}>{j.lossPct == null ? "—" : `${j.lossPct}%`}</b>
        </div>
      </div>
    </Card>
  );
});

export const WifiCard = memo(function WifiCard() {
  const { data } = useNet();
  if (!data) return <Card title="Wi-Fi signal"><Empty>Reading Wi-Fi...</Empty></Card>;
  const w = data.wifi;
  if (!w || !w.connected) {
    return (
      <Card title="Wi-Fi signal" sub="Not on Wi-Fi">
        <Empty>This PC is wired, or Wi-Fi is off. A cable is the steadiest for ranked.</Empty>
      </Card>
    );
  }
  const sig = w.signal ?? 0;
  const tone: Tone = sig >= 70 ? "ok" : sig >= 45 ? "or" : "red";
  return (
    <Card title="Wi-Fi signal" sub={w.ssid ?? "Wi-Fi"} right={<span className="chip">{w.band ?? w.radio ?? "Wi-Fi"}</span>}>
      <div className={`big${tone === "red" ? " red" : tone === "or" ? " or" : ""}`}>
        {sig}
        <small>%</small>
      </div>
      <Bar pct={sig} tone={tone} label="Wi-Fi signal" />
      <div className="kfacts three">
        <div>
          <small>Band</small>
          <b>{w.band ?? "—"}</b>
        </div>
        <div>
          <small>Standard</small>
          <b>{w.radio ?? "—"}</b>
        </div>
        <div>
          <small>Speed</small>
          <b>{w.rateMbps ? `${w.rateMbps} Mbps` : "—"}</b>
        </div>
      </div>
    </Card>
  );
});

const fig = (n: number) => String(Math.round(n * 10) / 10);

/** Same score as before: 0 OK, 1–2 caution, 3+ bad. Ping, jitter, loss and Wi-Fi thresholds are unchanged. */
export function verdict(d: NetData): { tone: Tone; status: string; ping: number | null; loss: number | null; jitter: number | null; wifi: number | null } {
  const j = d.jitter;
  if (j.avg == null) return { tone: "dim", status: "—", ping: null, loss: null, jitter: null, wifi: null };
  let score = 0;
  let loss: number | null = null;
  let jitter: number | null = null;
  let wifi: number | null = null;
  if (j.lossPct != null && j.lossPct >= 2) (score += 2), (loss = j.lossPct);
  else if (j.lossPct != null && j.lossPct >= 0.5) (score += 1), (loss = j.lossPct);
  if (j.jitter != null && j.jitter > 25) (score += 2), (jitter = j.jitter);
  else if (j.jitter != null && j.jitter > 12) (score += 1), (jitter = j.jitter);
  if (j.avg > 100) score += 2;
  else if (j.avg > 60) score += 1;
  const w = d.wifi;
  if (w?.connected && w.signal != null && w.signal < 45) (score += 1), (wifi = w.signal);
  const tone: Tone = score === 0 ? "ok" : score <= 2 ? "or" : "red";
  return { tone, status: tone === "ok" ? "OK" : tone === "or" ? "Caution" : "Bad", ping: j.avg, loss, jitter, wifi };
}

type VerdictRow = { id: VerdictMetricId; label: string; value: string; tone: Tone; status?: boolean };

function verdictRows(d: NetData, ids: VerdictMetricId[]): VerdictRow[] {
  const v = verdict(d);
  const region = (id: string) => d.regions.find((r) => r.id === id);
  const j = d.jitter;
  const w = d.wifi;
  const rows: VerdictRow[] = [];
  for (const id of ids) {
    if (id === "overall") {
      rows.push({ id, label: "Overall", value: v.status, tone: v.tone, status: true });
      continue;
    }
    if (id === "americas" || id === "europe" || id === "asia") {
      const r = region(id);
      const ms = r?.ms ?? null;
      rows.push({ id, label: r?.name ?? id, value: ms == null ? "—" : `${ms} ms`, tone: pingTone(ms) });
      continue;
    }
    if (id === "ping") {
      const ms = j.avg;
      rows.push({ id, label: "Host", value: ms == null ? "—" : `${fig(ms)} ms`, tone: pingTone(ms) });
      continue;
    }
    if (id === "jitter") {
      const ms = j.jitter;
      const tone: Tone = ms == null ? "dim" : ms > 25 ? "red" : ms > 15 ? "or" : "ok";
      rows.push({ id, label: "Jitter", value: ms == null ? "—" : `${fig(ms)} ms`, tone });
      continue;
    }
    if (id === "loss") {
      const pct = j.lossPct;
      const tone: Tone = pct == null ? "dim" : pct >= 2 ? "red" : pct > 0 ? "or" : "ok";
      rows.push({ id, label: "Loss", value: pct == null ? "—" : `${fig(pct)}%`, tone });
      continue;
    }
    if (id === "wifi") {
      if (!w || !w.connected) {
        rows.push({ id, label: "Wi-Fi", value: "Off / wired", tone: "dim" });
      } else {
        const sig = w.signal;
        const tone: Tone = sig == null ? "dim" : sig >= 70 ? "ok" : sig >= 45 ? "or" : "red";
        rows.push({ id, label: "Wi-Fi", value: sig == null ? "—" : `${fig(sig)}%`, tone });
      }
    }
  }
  return rows;
}

export const VerdictCard = memo(function VerdictCard() {
  const { data } = useNet();
  const { ids, toggle } = useVerdictMetrics();
  const [pick, setPick] = useState(false);
  if (!data) return <Card title="Connection verdict"><Empty>Measuring...</Empty></Card>;
  const rows = verdictRows(data, ids);
  const overall = rows.find((r) => r.id === "overall");
  const name =
    overall == null
      ? `Connection verdict: ${rows.map((r) => `${r.label} ${r.value}`).join(", ")}`
      : overall.tone === "dim"
        ? "Connection verdict: no reading"
        : `Connection verdict: ${overall.value}. ${rows.filter((r) => r.id !== "overall").map((r) => `${r.label} ${r.value}`).join(", ")}`;
  return (
    <Card
      title="Connection verdict"
      sub={pick ? "Choose metrics" : "Ranked-ready scan"}
      label={name}
      right={
        <button type="button" className="klink" aria-expanded={pick} onClick={() => setPick((p) => !p)}>
          {pick ? "Done" : "Metrics"}
        </button>
      }
    >
      {pick ? (
        <div className="klist">
          {VERDICT_METRICS.map((m) => (
            <label key={m.id} className="krow check">
              <input type="checkbox" checked={ids.includes(m.id)} onChange={() => toggle(m.id)} />
              <span className="kname">{m.label}</span>
            </label>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty>Pick at least one metric.</Empty>
      ) : (
        <div className="klist">
          {rows.map((r) => {
            const warn = toneClass(r.tone);
            return (
              <div key={r.id} className="krow">
                <span className="kname">{r.label}</span>
                {r.status ? (
                  <span className={`kstatus ${r.tone}`} style={{ marginLeft: "auto" }}>
                    <i className="kdot" aria-hidden="true" />
                    {r.value}
                  </span>
                ) : (
                  <span className={warn ? `kval ${warn}` : "kval"} style={{ marginLeft: "auto" }}>
                    {r.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
});
