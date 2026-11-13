import { useEffect, useState } from "react";
import { Card, Empty } from "./ui";

function useSaved<T>(key: string, fallback: T, legacyKey?: string) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
      // First copy of a card inherits the old shared value once, then keeps its own.
      if (legacyKey) {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) return JSON.parse(legacy) as T;
      }
      return fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // Storage blocked: it still works until the app closes.
    }
  }, [key, v]);
  return [v, setV] as const;
}

interface Clock {
  label: string;
  tz: string;
}

const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function ClocksCard() {
  const [clocks, setClocks] = useSaved<Clock[]>("cs.clocks", [
    { label: "You", tz: localTz() },
    { label: "London", tz: "Europe/London" },
    { label: "Seoul", tz: "Asia/Seoul" },
  ]);
  const [now, setNow] = useState(Date.now());
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [tz, setTz] = useState("");
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  const valid = (z: string) => {
    try {
      new Intl.DateTimeFormat([], { timeZone: z });
      return true;
    } catch {
      return false;
    }
  };
  const fmt = (z: string) => new Date(now).toLocaleTimeString([], { timeZone: z, hour: "numeric", minute: "2-digit" });
  const day = (z: string) => new Date(now).toLocaleDateString([], { timeZone: z, weekday: "short" });
  return (
    <Card
      title="World clocks"
      sub="Where your teammates are"
      right={
        <button className="klink" onClick={() => setAdding((a) => !a)}>
          {adding ? "Cancel" : "Add"}
        </button>
      }
    >
      {adding && (
        <form
          className="kadd"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid(tz)) return;
            setClocks([...clocks, { label: label.trim() || tz.split("/").pop()!.replace(/_/g, " "), tz }]);
            setLabel("");
            setTz("");
            setAdding(false);
          }}
        >
          <input placeholder="Name (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input list="tzlist" placeholder="Time zone, e.g. America/New_York" value={tz} onChange={(e) => setTz(e.target.value)} />
          <datalist id="tzlist">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          <button className="eb-btn primary" disabled={!valid(tz)}>
            Add
          </button>
        </form>
      )}
      <div className="klist roomy">
        {clocks.map((c, i) => (
          <div key={`${c.tz}${i}`} className="krow clock">
            <span className="kname">{c.label}</span>
            <span className="kday">{day(c.tz)}</span>
            <b className="ktime">{valid(c.tz) ? fmt(c.tz) : "—"}</b>
            <button className="kx" aria-label={`Remove ${c.label}`} onClick={() => setClocks(clocks.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        {clocks.length === 0 && <Empty>No clocks. Press Add.</Empty>}
      </div>
    </Card>
  );
}

interface Item {
  id: number;
  text: string;
  done: boolean;
}

const DEFAULT_LIST: Item[] = ["Charger plugged in", "Close Discord and other chat apps", "Game mode on", "Music ready", "Water nearby"].map((text, id) => ({ id, text, done: false }));

export function NotesCard({ instanceId = "notes" }: { instanceId?: string }) {
  const primary = instanceId === "notes";
  const [items, setItems] = useSaved<Item[]>(`cs.checklist.${instanceId}`, DEFAULT_LIST, primary ? "cs.checklist" : undefined);
  const [note, setNote] = useSaved<string>(`cs.note.${instanceId}`, "", primary ? "cs.note" : undefined);
  const [text, setText] = useState("");
  const done = items.filter((i) => i.done).length;
  return (
    <Card title="Pre-game checklist" sub={`${done} of ${items.length} done`} right={done > 0 ? <button className="klink" onClick={() => setItems(items.map((i) => ({ ...i, done: false })))}>Untick all</button> : undefined}>
      <div className="klist">
        {items.map((i) => (
          <label key={i.id} className={`krow check${i.done ? " done" : ""}`}>
            <input type="checkbox" checked={i.done} onChange={() => setItems(items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))} />
            <span className="kname">{i.text}</span>
            <button className="kx" aria-label={`Delete ${i.text}`} onClick={() => setItems(items.filter((x) => x.id !== i.id))}>
              ×
            </button>
          </label>
        ))}
      </div>
      <form
        className="kadd one"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setItems([...items, { id: Date.now(), text: text.trim(), done: false }]);
          setText("");
        }}
      >
        <input placeholder="Add an item" value={text} onChange={(e) => setText(e.target.value)} />
      </form>
      <textarea className="knote" placeholder="Notes (saved on this PC)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
    </Card>
  );
}

const ACTIONS = ["Show the reading only", "Toggle game mode", "Next profile", "Kill switch", "Play / pause music", "Next track", "Previous track", "Open the Overwatch feed"];
const KEYS = ["Game mode", "CPU %", "GPU °C", "GPU %", "Ping ms", "Overwatch", "Kill", "Profile"];
const DEFAULT_MAP = ["Toggle game mode", "Show the reading only", "Show the reading only", "Show the reading only", "Show the reading only", "Open the Overwatch feed", "Kill switch", "Next profile"];

export function DeckMapCard() {
  const [map, setMap] = useSaved<string[]>("cs.deckmap", DEFAULT_MAP);
  return (
    <Card title="Deck button map" sub="What each key is for. Not linked to hardware yet.">
      <div className="klist">
        {KEYS.map((k, i) => (
          <div key={k} className="krow map">
            <span className="kname">
              <em>{i + 1}</em> {k}
            </span>
            <select aria-label={`Action for key ${i + 1}, ${k}`} value={map[i] ?? DEFAULT_MAP[i]} onChange={(e) => setMap(KEYS.map((_, j) => (j === i ? e.target.value : (map[j] ?? DEFAULT_MAP[j]))))}>
              {ACTIONS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </Card>
  );
}
