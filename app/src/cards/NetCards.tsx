import type { NetData } from "../lib/types";
import { useApi } from "../state/useApi";
import { Bar, Card, Empty, Sparkline, useEvery, type Tone } from "./ui";

const pingTone = (ms: number | null): Tone => (ms == null ? "dim" : ms <= 60 ? "ok" : ms <= 120 ? "or" : "red");

function useNet() {
  // Probing only runs on the service while a card is asking, and stops during a match.
  const ms = useEvery(2000, 0);
  return useApi<NetData>("/api/net", ms);
}

export function RegionPingCard() {
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
            <span className="kval">
              {r.ms == null ? "—" : `${r.ms} ms`}
              {r.ms != null && r.ms === best && <em> best</em>}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function JitterCard() {
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
          <b>{j.avg == null ? "—" : `${j.avg} ms`}</b>
        </div>
        <div>
          <small>Jitter</small>
          <b>{j.jitter == null ? "—" : `${j.jitter} ms`}</b>
        </div>
        <div>
          <small>Lost</small>
          <b>{j.lossPct == null ? "—" : `${j.lossPct}%`}</b>
        </div>
      </div>
    </Card>
  );
}

export function WifiCard() {
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
      <div className="big">
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
}

/** Rolls ping, jitter, loss and Wi-Fi into one plain verdict. */
export function verdict(d: NetData): { word: string; tone: Tone; why: string } {
  const j = d.jitter;
  if (j.avg == null) return { word: "No reading", tone: "dim", why: "Could not reach the servers." };
  const reasons: string[] = [];
  let score = 0;
  if (j.lossPct != null && j.lossPct >= 2) (score += 2), reasons.push(`${j.lossPct}% packets lost`);
  else if (j.lossPct != null && j.lossPct >= 0.5) (score += 1), reasons.push(`${j.lossPct}% packets lost`);
  if (j.jitter != null && j.jitter > 25) (score += 2), reasons.push(`jitter ${j.jitter} ms`);
  else if (j.jitter != null && j.jitter > 12) (score += 1), reasons.push(`jitter ${j.jitter} ms`);
  if (j.avg > 100) (score += 2), reasons.push(`ping ${j.avg} ms`);
  else if (j.avg > 60) (score += 1), reasons.push(`ping ${j.avg} ms`);
  const w = d.wifi;
  if (w?.connected && w.signal != null && w.signal < 45) (score += 1), reasons.push("weak Wi-Fi");
  if (score === 0) return { word: "Good for ranked", tone: "ok", why: `Ping ${j.avg} ms, steady, no loss.` };
  if (score <= 2) return { word: "Playable", tone: "or", why: `Watch out: ${reasons.join(", ")}.` };
  return { word: "Risky for ranked", tone: "red", why: `Problems: ${reasons.join(", ")}.` };
}

export function VerdictCard() {
  const { data } = useNet();
  if (!data) return <Card title="Connection verdict"><Empty>Measuring...</Empty></Card>;
  const v = verdict(data);
  return (
    <Card title="Connection verdict" sub="From ping, jitter, loss and Wi-Fi" right={<span className={`chip${v.tone === "ok" || v.tone === "dim" ? "" : v.tone === "or" ? " or" : " red"}`}>{v.tone === "ok" ? "OK" : v.tone === "or" ? "Caution" : v.tone === "red" ? "Alert" : "—"}</span>}>
      <div className={`kverdict ${v.tone}`}>{v.word}</div>
      <p className="kwhy">{v.why}</p>
    </Card>
  );
}
