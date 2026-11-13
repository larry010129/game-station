import { memo, useState } from "react";
import { useStoredJson } from "../lib/storage";
import { Card } from "./ui";
import { KEYS } from "../lib/storageKeys";

interface Item {
  id: number;
  text: string;
  done: boolean;
}

const DEFAULT_LIST: Item[] = ["Charger plugged in", "Close Discord and other chat apps", "Game mode on", "Music ready", "Water nearby"].map((text, id) => ({ id, text, done: false }));

const isItems = (v: unknown): v is Item[] =>
  Array.isArray(v) && v.every((i) => i != null && typeof i === "object" && typeof (i as Item).id === "number" && typeof (i as Item).text === "string" && typeof (i as Item).done === "boolean");
const isText = (v: unknown): v is string => typeof v === "string";

export const NotesCard = memo(function NotesCard({ instanceId = "notes" }: { instanceId?: string }) {
  const primary = instanceId === "notes";
  const [items, setItems] = useStoredJson<Item[]>(`${KEYS.checklist}.${instanceId}`, DEFAULT_LIST, primary ? KEYS.checklist : undefined, isItems);
  const [note, setNote] = useStoredJson<string>(`${KEYS.note}.${instanceId}`, "", primary ? KEYS.note : undefined, isText);
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
});
