import { useRef, useState } from "react";
import { moduleJson } from "../state/palette";
import type { ThemeDef } from "../state/palette";
import type { Tweaks } from "../state/tweaks";
import { buildShare, parseShare, type SharedTheme } from "./layoutShare";
import type { LayoutSnap } from "./useDashboard";

interface Props {
  layouts: { active: string | null; list: { id: string; name: string }[]; full: boolean };
  snapshot: () => LayoutSnap;
  theme: { active: ThemeDef; tweaks: Tweaks };
  onSave: (name: string, from?: LayoutSnap) => boolean;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  /** Puts a shared theme on (adds its module if it came with one). */
  onTheme: (t: SharedTheme) => void;
  onClose: () => void;
}

const download = (name: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^\w-]+/g, "-").toLowerCase() || "layout"}.layout.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/** Named layouts and sharing. Switching is instant because the active layout is saved as you edit. */
export function LayoutManager({ layouts, snapshot, theme, onSave, onSwitch, onDelete, onTheme, onClose }: Props) {
  const [name, setName] = useState("");
  const [withTheme, setWithTheme] = useState(true);
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const activeName = layouts.list.find((l) => l.id === layouts.active)?.name ?? "My layout";
  const say = (text: string, bad = false) => setNote({ text, bad });

  const sharedText = () => {
    const t = theme.active;
    const sharedTheme: SharedTheme | undefined = withTheme
      ? { id: t.id, tweaks: theme.tweaks, ...(t.source === "yours" && t.palette ? { module: moduleJson(t.name, t.palette) } : {}) }
      : undefined;
    return buildShare(activeName, snapshot(), sharedTheme);
  };

  const take = (text: string) => {
    try {
      const shared = parseShare(text);
      if (!onSave(shared.name, shared.layout)) return say("You already have 12 layouts. Delete one first.", true);
      if (shared.theme) onTheme(shared.theme);
      setPaste("");
      say(`Added "${shared.name}" and switched to it.`);
    } catch (e) {
      say(e instanceof Error ? e.message : "Could not read that layout.", true);
    }
  };

  return (
    <div className="layout-mgr" role="dialog" aria-label="Layouts">
      <div className="layout-mgr-head">
        <h3>Layouts</h3>
        <button type="button" className="link" onClick={onClose}>
          Close
        </button>
      </div>

      <ul className="layout-mgr-list">
        {layouts.list.length === 0 && <li className="hint">Save the arrangement on screen to switch between several later.</li>}
        {layouts.list.map((l) => (
          <li key={l.id}>
            <button type="button" className="pill-btn" aria-pressed={l.id === layouts.active} onClick={() => onSwitch(l.id)}>
              {l.name}
            </button>
            <button
              type="button"
              className="link"
              aria-label={`Delete ${l.name}`}
              onClick={() => {
                if (confirm !== l.id) return setConfirm(l.id);
                setConfirm(null);
                onDelete(l.id);
              }}
            >
              {confirm === l.id ? "Click again to delete" : "Delete"}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="layout-mgr-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!onSave(name || "Layout")) return say("You already have 12 layouts. Delete one first.", true);
          setName("");
          say("Saved. It now follows your edits.");
        }}
      >
        <input value={name} maxLength={30} placeholder="Name this arrangement" aria-label="Layout name" onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="pill-btn" disabled={layouts.full}>
          Save as new
        </button>
      </form>

      <div className="layout-mgr-share">
        <label className="theme-check">
          <input type="checkbox" checked={withTheme} onChange={(e) => setWithTheme(e.target.checked)} />
          Include my theme ({theme.active.name})
        </label>
        <div className="layout-mgr-row">
          <button type="button" className="pill-btn" onClick={() => download(activeName, sharedText())}>
            Export file
          </button>
          <button
            type="button"
            className="pill-btn"
            onClick={() => {
              void navigator.clipboard.writeText(sharedText()).then(
                () => say("Copied. Paste it anywhere to share."),
                () => say("The clipboard is blocked here. Use Export file instead.", true),
              );
            }}
          >
            Copy code
          </button>
          <button type="button" className="pill-btn" onClick={() => file.current?.click()}>
            Import file
          </button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 400 * 1024) return say("That file is over 400 KB.", true);
              void f.text().then(take, () => say("Could not read that file.", true));
            }}
          />
        </div>
        <textarea value={paste} placeholder="Or paste a copied layout code here" aria-label="Layout code" rows={2} onChange={(e) => setPaste(e.target.value)} />
        <button type="button" className="pill-btn" disabled={!paste.trim()} onClick={() => take(paste)}>
          Import pasted code
        </button>
      </div>

      {note && (
        <p className={note.bad ? "layout-mgr-note bad" : "layout-mgr-note"} role={note.bad ? "alert" : "status"}>
          {note.text}
        </p>
      )}
    </div>
  );
}
