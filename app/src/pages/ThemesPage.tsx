import { useMemo, useState } from "react";
import { ThemePanel } from "../components/ThemePanel";
import { moduleJson, toHex, type Palette, type ThemeDef } from "../state/palette";
import { CATALOG, THEME_GROUPS } from "../state/themeCatalog";
import type { useTheme } from "../state/useTheme";

type Look = ReturnType<typeof useTheme>;

const PREVIEW: Palette = {
  bg: "#0a0a0b",
  card: "#1c1c1e",
  text: "#efefef",
  muted: "#9a9a9e",
  accent: "#d0d0d4",
  caution: "#f0893a",
  alert: "#e5484d",
  border: "rgba(255, 255, 255, 0.22)",
  radius: "16px",
};

const BLANK: Palette = {
  bg: "#0d0e1a",
  card: "#17192b",
  text: "#e7fffb",
  muted: "#8ecfc9",
  accent: "#39c5bb",
  caution: "#f0b429",
  alert: "#e85a8c",
  border: "#2a6d68",
  radius: "16px",
};

const FIELDS: { key: keyof Palette; label: string }[] = [
  { key: "bg", label: "Page" },
  { key: "card", label: "Cards" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Quiet text" },
  { key: "accent", label: "Accent" },
  { key: "caution", label: "Caution" },
  { key: "alert", label: "Alert" },
  { key: "border", label: "Border" },
];

function paint(theme: ThemeDef): Palette {
  return theme.palette ?? PREVIEW;
}

function radiusPx(radius: string) {
  if (radius.endsWith("rem")) return Math.round(parseFloat(radius) * 16);
  const n = parseInt(radius, 10);
  return Number.isFinite(n) ? n : 16;
}

function ThemeCard({ theme, on, onPick, onRemove }: { theme: ThemeDef; on: boolean; onPick: () => void; onRemove?: () => void }) {
  const p = paint(theme);
  return (
    <div className="theme-pick-wrap">
      <button type="button" className="theme-pick" aria-pressed={on} onClick={onPick} style={{ background: p.bg, color: p.text, borderRadius: p.radius, boxShadow: p.shadow }}>
        <span className="theme-pick-card" style={{ background: p.card, borderColor: p.border, borderRadius: p.radius, fontFamily: p.mono ? "ui-monospace, monospace" : undefined }}>
          <b style={{ color: p.accent }}>Aa</b>
          <span className="theme-pick-dots" aria-hidden="true">
            <i style={{ background: p.accent }} />
            <i style={{ background: p.caution }} />
            <i style={{ background: p.alert }} />
          </span>
        </span>
        <span className="theme-pick-meta">
          <strong>{theme.name}</strong>
          <small style={{ color: p.muted }}>{theme.author}</small>
        </span>
      </button>
      {onRemove && (
        <button type="button" className="theme-pick-x" aria-label={`Remove ${theme.name}`} title="Remove this theme" onClick={onRemove}>
          ×
        </button>
      )}
    </div>
  );
}

/** Theme store: pick a look, build one, or upload a module. */
export function ThemesPage({ look }: { look: Look }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [making, setMaking] = useState(false);
  const [name, setName] = useState("My theme");
  const [draft, setDraft] = useState<Palette>(BLANK);
  const [mono, setMono] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const extra = look.modules.length ? ["Yours"] : [];
    return [...THEME_GROUPS, ...extra.filter((g) => !THEME_GROUPS.includes(g))];
  }, [look.modules.length]);

  const themes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...CATALOG, ...look.modules].filter((t) => {
      if (group !== "All" && t.group !== group) return false;
      if (!q) return true;
      return `${t.name} ${t.author} ${t.group}`.toLowerCase().includes(q);
    });
  }, [group, look.modules, query]);

  const startCreate = () => {
    const current = look.active.palette ?? PREVIEW;
    setDraft({
      ...current,
      bg: toHex(current.bg, BLANK.bg),
      card: toHex(current.card, BLANK.card),
      text: toHex(current.text, BLANK.text),
      muted: toHex(current.muted, BLANK.muted),
      accent: toHex(current.accent, BLANK.accent),
      caution: toHex(current.caution, BLANK.caution),
      alert: toHex(current.alert, BLANK.alert),
      border: toHex(current.border, BLANK.border),
      radius: `${radiusPx(current.radius)}px`,
    });
    setMono(!!current.mono);
    setName("My theme");
    setMaking(true);
    setError(null);
  };

  const saveDraft = () => {
    const radius = /^\d+(\.\d+)?(px|rem)$/.test(draft.radius) ? draft.radius : "16px";
    look.create(name, { ...draft, radius, mono });
    setMaking(false);
    setNotice(`Saved ${name.trim() || "Untitled"}.`);
    setError(null);
  };

  const takeFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    if (file.size > 200 * 1024) {
      setError("That file is over 200 KB.");
      return;
    }
    try {
      const count = look.importModules(await file.text(), file.name);
      setNotice(count === 1 ? "Theme added and selected." : `${count} themes added. The first one is selected.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that theme.");
    }
  };

  const downloadBlank = () => {
    const blob = new Blob([moduleJson("Miku", BLANK)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "theme-module.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="themes" aria-label="Themes">
      <header className="themes-head">
        <h2>Themes</h2>
        <p>
          {CATALOG.length} looks from the station and 21st.dev, plus any you make or upload. Selecting one recolours the page, the cards, caution, and alerts.
        </p>
      </header>

      <div className="theme-tools">
        <input
          type="search"
          value={query}
          placeholder="Search themes"
          aria-label="Search themes"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="theme-chips" role="toolbar" aria-label="Theme groups">
          {groups.map((g) => (
            <button key={g} type="button" className="pill-btn" aria-pressed={group === g} onClick={() => setGroup(g)}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {themes.length === 0 ? (
        <p className="hint">No themes match that.</p>
      ) : (
        <div className="theme-grid">
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              on={look.active.id === t.id}
              onPick={() => look.select(t.id)}
              onRemove={t.source === "yours" ? () => look.remove(t.id) : undefined}
            />
          ))}
        </div>
      )}

      <div className="themes-split">
        <section className="vault-card" aria-label="Create a theme">
          <h3>Create</h3>
          <p className="hint">Build a look on this PC. It stays in Yours.</p>
          {!making ? (
            <button type="button" className="pill-btn" onClick={startCreate}>
              New theme
            </button>
          ) : (
            <div className="theme-form">
              <label>
                Name
                <input value={name} maxLength={40} aria-label="Theme name" onChange={(e) => setName(e.target.value)} />
              </label>
              <div className="theme-form-grid">
                {FIELDS.map((f) => (
                  <label key={f.key}>
                    {f.label}
                    <input
                      type="color"
                      aria-label={f.label}
                      value={toHex(String(draft[f.key]))}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <label className="range">
                <span>Corners</span>
                <input
                  type="range"
                  min={0}
                  max={28}
                  step={1}
                  value={radiusPx(draft.radius)}
                  aria-label="Corner radius"
                  onChange={(e) => setDraft((d) => ({ ...d, radius: `${e.target.value}px` }))}
                />
                <output>{radiusPx(draft.radius)}</output>
              </label>
              <label className="theme-check">
                <input type="checkbox" checked={mono} onChange={(e) => setMono(e.target.checked)} />
                Monospace type
              </label>
              <div className="theme-form-actions">
                <button type="button" className="pill-btn" aria-pressed="true" onClick={saveDraft}>
                  Save and use
                </button>
                <button type="button" className="link" onClick={() => setMaking(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="vault-card" aria-label="Upload a theme module">
          <h3>Upload a module</h3>
          <p className="hint">A station JSON file, a VS Code colour theme, or 21st CSS with :root colours.</p>
          <label className="pill-btn">
            Choose file
            <input
              type="file"
              accept=".json,.css,application/json,text/css"
              onChange={(e) => {
                void takeFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className="link" onClick={downloadBlank}>
            Download a blank module
          </button>
          {notice && <p className="hint">{notice}</p>}
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>

      <section className="vault-card" aria-label="Wallpaper">
        <h3>Wallpaper</h3>
        <ThemePanel
          embedded
          image={look.image}
          imageSaved={look.imageSaved}
          dim={look.dim}
          onDim={look.setDim}
          onImage={look.setImage}
          onReset={look.reset}
          onClose={() => undefined}
        />
      </section>
    </section>
  );
}
