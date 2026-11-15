import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../components/Icon";
import { GachaPanel } from "../components/GachaPanel";
import { ThemeTune } from "../components/ThemeTune";
import { ThemePanel } from "../components/ThemePanel";
import { FONTS, fontOf, fontStack, moduleJson, toHex, type FontKey, type Palette, type ThemeDef } from "../state/palette";
import {
  CREDIT_NAME,
  CREDITS_EVENT,
  formatCredits,
  readCredits,
  spendCredits,
} from "../state/stationCredits";
import { LOOK_COST } from "../state/gachaEngine";
import { CATALOG, FREE_COUNT, LOCKED_PRESETS, THEME_GROUPS, UNLOCKABLES } from "../state/themeCatalog";
import { usePatreonEntitlement } from "../state/patreon";
import { takePick, useQuests } from "../state/useQuests";
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

function ThemeCard({
  theme,
  on,
  fav,
  onPick,
  onFav,
  onRemove,
  onHover,
}: {
  theme: ThemeDef;
  on: boolean;
  fav: boolean;
  onPick: () => void;
  onFav: () => void;
  onRemove?: () => void;
  onHover: (over: boolean) => void;
}) {
  const p = paint(theme);
  return (
    <div className="theme-pick-wrap" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <button type="button" className="theme-pick" aria-pressed={on} onClick={onPick} style={{ background: p.bg, color: p.text, borderRadius: p.radius, boxShadow: p.shadow }}>
        <span className="theme-pick-card" style={{ background: p.card, borderColor: p.border, borderRadius: p.radius, fontFamily: fontStack(p) }}>
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
      <button type="button" className="theme-pick-star" aria-pressed={fav} aria-label={fav ? `Unstar ${theme.name}` : `Star ${theme.name}`} title={fav ? "Remove from favourites" : "Add to favourites"} onClick={onFav}>
        <Icon name="star" small />
      </button>
      {onRemove && (
        <button type="button" className="theme-pick-x" aria-label={`Remove ${theme.name}`} title="Remove this theme" onClick={onRemove}>
          ×
        </button>
      )}
    </div>
  );
}

/** Pip centres on a 24-unit die face, and which of them each face (1-6) shows. */
const DICE_PIPS = [[7.5, 7.5], [16.5, 7.5], [7.5, 12], [16.5, 12], [7.5, 16.5], [16.5, 16.5], [12, 12]] as const;
const DICE_FACES = [[6], [0, 5], [0, 6, 5], [0, 1, 4, 5], [0, 1, 4, 5, 6], [0, 1, 2, 3, 4, 5]];
const PIP_R = 2.1;
/** One pip as a closed circular subpath, for cutting out of a face. */
const pipHole = (pip: number) => {
  const [cx, cy] = DICE_PIPS[pip];
  return `M${cx - PIP_R} ${cy}a${PIP_R} ${PIP_R} 0 1 0 ${PIP_R * 2} 0a${PIP_R} ${PIP_R} 0 1 0 ${-PIP_R * 2} 0z`;
};

/** Same layout as a theme swatch (Aa + three dots), but the colours are
 *  unknown: each dot is a "?" chip, over a faint 3D die that gets thrown again
 *  and again while the tile is hovered. */
function RandomThemeCard({ onPick, picked }: { onPick: () => void; picked?: string }) {
  const p = PREVIEW;
  const label = picked ? `Random theme: ${picked}` : "Random theme";
  const [rolling, setRolling] = useState(false);
  // The cube's accumulated tumble. Always whole quarter turns, so it comes to
  // rest square on a face; it only ever grows, so the die never unwinds.
  const [spin, setSpin] = useState({ x: 0, y: 0 });
  // Whether another throw should follow the current one. Leaving the tile only
  // clears this, so a throw in flight always lands instead of snapping back.
  const again = useRef(false);

  // One full turn on each axis plus 0-3 quarter turns, never zero on both, so
  // every throw lands showing something different from the last.
  const toss = () => {
    const k = 1 + Math.floor(Math.random() * 15);
    setSpin((s) => ({ x: s.x + 360 + 90 * (k & 3), y: s.y + 360 + 90 * (k >> 2) }));
  };
  const start = () => {
    again.current = true;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setRolling(true);
  };
  const stop = () => {
    again.current = false;
  };

  return (
    <div className="theme-pick-wrap">
      <button
        type="button"
        className="theme-pick theme-pick-random"
        title={label}
        aria-label={label}
        onClick={onPick}
        onMouseEnter={start}
        onMouseLeave={stop}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && start()}
        onBlur={stop}
        style={{ borderRadius: p.radius }}
      >
        <span className="theme-pick-card theme-pick-card-random" style={{ borderRadius: p.radius }}>
          {/* The throw (hop, squash, bounce) is a CSS animation on the outer
              span; each time it starts or loops, the cube inside is given a new
              tumble to land on. */}
          <span
            className={`theme-dice${rolling ? " is-rolling" : ""}`}
            aria-hidden="true"
            onAnimationStart={toss}
            onAnimationIteration={() => (again.current ? toss() : setRolling(false))}
          >
            <span className="theme-dice-view">
              <span className="theme-dice-cube" style={{ transform: `rotateX(${spin.x}deg) rotateY(${spin.y}deg)` }}>
                {DICE_FACES.map((pips, i) => (
                  // Each face is the full square, edge to edge, so neighbours
                  // meet along the cube's edges; the pips are holes cut out of
                  // it (evenodd), letting the tile's colour show through.
                  <svg key={i} className={`theme-dice-face f${i + 1}`} viewBox="0 0 24 24">
                    <path fillRule="evenodd" d={`M0 0h24v24H0z${pips.map(pipHole).join("")}`} />
                    <rect width="24" height="24" />
                  </svg>
                ))}
              </span>
            </span>
          </span>
          <b>Aa</b>
          <span className="theme-pick-dots theme-pick-dots-random" aria-hidden="true">
            <i>?</i>
            <i>?</i>
            <i>?</i>
          </span>
        </span>
        <span className="theme-pick-meta">
          {/* After a pick the title reads "Random · <theme>"; a long theme name
              is cut by the ellipsis on <strong>, so "Random" always shows. */}
          <strong>
            Random
            {picked && (
              <>
                <span className="theme-pick-sep" aria-hidden="true" />
                {picked}
              </>
            )}
          </strong>
          <small>Command Station</small>
        </span>
      </button>
    </div>
  );
}

/** Looks like a normal theme pick (Aa + colour dots). A small corner lock badge
 *  marks it as gated. Click opens the unlock dialog — it never applies the theme. */
function LockedThemeCard({ theme, onOpen }: { theme: ThemeDef; onOpen: () => void }) {
  const p = paint(theme);
  return (
    <div className="theme-pick-wrap">
      <button
        type="button"
        className="theme-pick theme-pick-locked"
        title={`${theme.name}: locked`}
        aria-label={`Locked theme ${theme.name}. Open unlock options.`}
        aria-haspopup="dialog"
        onClick={onOpen}
        style={{ background: p.bg, color: p.text, borderRadius: p.radius, boxShadow: p.shadow }}
      >
        <span className="theme-pick-card" style={{ background: p.card, borderColor: p.border, borderRadius: p.radius, fontFamily: fontStack(p) }}>
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
      <span className="theme-pick-lock" aria-hidden="true">
        <Icon name="lock" small />
      </span>
    </div>
  );
}

/** Unlock popup: quest (free) or spend Credits. Pattern from 21st Modal Pricing
 *  (two clear choices) + accessible dialog shell (Escape, focus trap, aria-modal). */
function UnlockThemeDialog({
  open,
  name,
  onClose,
  onUnlock,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onUnlock: (via: "weekly" | "credits") => void;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { state: quests } = useQuests();
  const waiting = quests.looksWaiting;
  const [balance, setBalance] = useState(() => readCredits());
  const [short, setShort] = useState(false);

  useEffect(() => {
    if (!open) {
      setShort(false);
      return;
    }
    const syncBal = () => setBalance(readCredits());
    syncBal();
    setShort(false);
    window.addEventListener(CREDITS_EVENT, syncBal);
    window.addEventListener("storage", syncBal);
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusables = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(
            (el) => el.getClientRects().length > 0,
          )
        : [];
    const first = focusables()[0] ?? panel;
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener(CREDITS_EVENT, syncBal);
      window.removeEventListener("storage", syncBal);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const canAfford = balance >= LOOK_COST;

  const useWeekly = () => {
    if (takePick()) onUnlock("weekly");
  };

  const claimCredits = () => {
    const next = spendCredits(LOOK_COST);
    if (next == null) {
      setBalance(readCredits());
      setShort(true);
      return;
    }
    setBalance(next);
    setShort(false);
    onUnlock("credits");
  };

  return createPortal(
    <div
      className="theme-unlock-root"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="theme-unlock"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
      >
        <header className="theme-unlock-head">
          <div>
            <h2 id={titleId}>{name}</h2>
            <p id={descId}>Locked. Use a weekly unlock, or spend {CREDIT_NAME.toLowerCase()}. Every locked look costs the same.</p>
          </div>
          <button type="button" className="theme-unlock-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <p className="theme-unlock-balance" aria-live="polite">
          Balance <strong>{formatCredits(balance)}</strong>
        </p>

        <div className="theme-unlock-paths" role="group" aria-label="Unlock options">
          <section className="theme-unlock-path" aria-labelledby="unlock-weekly-title">
            <div className="theme-unlock-path-top">
              <h3 id="unlock-weekly-title">Weekly unlock</h3>
              <span className="theme-unlock-badge">{waiting > 0 ? `${waiting} waiting` : "Free"}</span>
            </div>
            <p>
              {waiting > 0
                ? "Pick this look with a weekly unlock. It costs nothing."
                : "Check in on 5 different days in one week to earn one. Find it under Quests."}
            </p>
            <button type="button" className="pill-btn" disabled={waiting < 1} aria-disabled={waiting < 1} onClick={useWeekly}>
              {waiting > 0 ? "Use a weekly unlock" : "None waiting"}
            </button>
          </section>

          <section className="theme-unlock-path" aria-labelledby="unlock-credits-title">
            <div className="theme-unlock-path-top">
              <h3 id="unlock-credits-title">Spend {CREDIT_NAME}</h3>
              <span className="theme-unlock-price">{formatCredits(LOOK_COST)}</span>
            </div>
            <p>Spending {CREDIT_NAME.toLowerCase()} never uses up a waiting weekly unlock.</p>
            {(!canAfford || short) && (
              <p className="theme-unlock-short" role="alert">
                Not enough {CREDIT_NAME.toLowerCase()}: need {LOOK_COST}, you have {balance}.
              </p>
            )}
            <button
              type="button"
              className="pill-btn"
              aria-pressed={canAfford ? true : undefined}
              disabled={!canAfford}
              aria-disabled={!canAfford}
              onClick={claimCredits}
            >
              {canAfford ? `Spend ${formatCredits(LOOK_COST)}` : `Need ${formatCredits(LOOK_COST)}`}
            </button>
          </section>
        </div>

        <footer className="theme-unlock-foot">
          <button type="button" className="link" onClick={onClose}>
            Not now
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Theme store: pick a look, build one, or upload a module. */
export function ThemesPage({ look }: { look: Look }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  // What the Random tile last picked. The tile only names it while that theme is
  // still the active one, so choosing anything else by hand clears the name.
  const [randomPick, setRandomPick] = useState<{ id: string; name: string } | null>(null);
  const [making, setMaking] = useState(false);
  const [name, setName] = useState("My theme");
  const [draft, setDraft] = useState<Palette>(BLANK);
  const [font, setFont] = useState<FontKey | "">("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockFor, setUnlockFor] = useState<ThemeDef | null>(null);
  // Patreon Basic opens every preset look; an earned unlock (weekly pick, Credits) is kept separately and survives cancelling.
  const { brand } = usePatreonEntitlement();

  const groups = useMemo(() => {
    const extra = look.modules.length ? ["Yours"] : [];
    const own = [...(look.favs.length ? ["Favourites"] : []), ...(look.recent.length ? ["Recent"] : [])];
    const [all, ...rest] = THEME_GROUPS;
    return [all, ...own, ...rest, ...extra.filter((g) => !THEME_GROUPS.includes(g))];
  }, [look.modules.length, look.favs.length, look.recent.length]);

  const themes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...CATALOG, ...UNLOCKABLES, ...look.modules].filter((t) => {
      if (group === "Favourites") return look.favs.includes(t.id);
      if (group === "Recent") return look.recent.includes(t.id);
      if (group !== "All" && t.group !== group) return false;
      if (!q) return true;
      return `${t.name} ${t.author} ${t.group}`.toLowerCase().includes(q);
    });
    if (group === "Recent") return list.sort((a, b) => look.recent.indexOf(a.id) - look.recent.indexOf(b.id));
    // Starred themes lead the full list; the rest keep the catalogue order, so the free looks come first and the locked ones follow.
    if (group === "All" && !q) {
      const starred = list.filter((t) => look.favs.includes(t.id));
      return [...starred, ...list.filter((t) => !look.favs.includes(t.id))];
    }
    return list;
  }, [group, look.favs, look.modules, look.recent, query]);

  // Hover preview: the page tries a theme on after a short hover and drops it on leave. Off by default.
  const hoverTimer = useRef(0);
  const hoverOn = (id: string, over: boolean) => {
    window.clearTimeout(hoverTimer.current);
    if (!over) return look.preview(null);
    if (look.hover) hoverTimer.current = window.setTimeout(() => look.preview(id), 320);
  };
  useEffect(() => {
    const { preview } = look;
    return () => {
      window.clearTimeout(hoverTimer.current);
      preview(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // If hover preview is switched off mid-preview, put the real theme back.
  useEffect(() => {
    if (!look.hover) look.preview(null);
  }, [look.hover, look.preview]);

  const showRandom = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return "random".startsWith(q) || "random theme".startsWith(q);
    return group === "All";
  }, [group, query]);

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
    setFont(fontOf(current) ?? "");
    setName("My theme");
    setMaking(true);
    setError(null);
  };

  const saveDraft = () => {
    const radius = /^\d+(\.\d+)?(px|rem)$/.test(draft.radius) ? draft.radius : "16px";
    look.create(name, { ...draft, radius, font: font || undefined, mono: font === "mono" });
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

  const randomTheme = () => {
    const open = CATALOG.filter((t) => !look.isLocked(t.id));
    const pool = open.filter((t) => t.id !== look.active.id);
    const list = pool.length > 0 ? pool : open;
    const t = list[Math.floor(Math.random() * list.length)];
    look.select(t.id);
    setRandomPick({ id: t.id, name: t.name });
  };

  return (
    <section className="themes" aria-label="Themes">
      <header className="themes-head">
        <h2>Themes</h2>
        <p>
          {FREE_COUNT + LOCKED_PRESETS.length} looks from the station and 21st.dev: the first {FREE_COUNT} are free and {LOCKED_PRESETS.length} are locked. You can also make or upload your own. Selecting one recolours the page, the cards, caution, and alerts.
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

      {themes.length === 0 && !showRandom ? (
        <p className="hint">No themes match that.</p>
      ) : (
        <div className="theme-grid">
          {showRandom && <RandomThemeCard onPick={randomTheme} picked={randomPick && randomPick.id === look.active.id ? randomPick.name : undefined} />}
          {themes.map((t) =>
            look.isLocked(t.id) ? (
              <LockedThemeCard key={t.id} theme={t} onOpen={() => setUnlockFor(t)} />
            ) : (
            <ThemeCard
              key={t.id}
              theme={t}
              on={look.active.id === t.id}
              fav={look.favs.includes(t.id)}
              onPick={() => look.select(t.id)}
              onFav={() => look.toggleFav(t.id)}
              onHover={(over) => hoverOn(t.id, over)}
              onRemove={t.source === "yours" ? () => look.remove(t.id) : undefined}
            />
            ),
          )}
        </div>
      )}

      <UnlockThemeDialog
        open={unlockFor != null}
        name={unlockFor?.name ?? ""}
        onClose={() => setUnlockFor(null)}
        onUnlock={(via) => {
          if (!unlockFor) return;
          look.unlock(unlockFor.id, { select: true });
          setError(null);
          setNotice(via === "weekly" ? `${unlockFor.name} unlocked with a weekly unlock.` : `${unlockFor.name} unlocked, spent ${formatCredits(LOOK_COST)}.`);
          setUnlockFor(null);
        }}
      />

      <ThemeTune
        tweaks={look.tweaks}
        base={{ radius: radiusPx(look.active.palette?.radius ?? "16px"), opacity: look.active.palette ? 82 : 66, accent: toHex(look.active.palette?.accent ?? "#f0893a", "#f0893a") }}
        onTweak={look.tweak}
        onClear={look.clearTweaks}
        hover={look.hover}
        onHover={look.setHover}
      />

      <div className="themes-split">
        <GachaPanel owned={look.unlocks} onWin={(id) => look.unlock(id)} />
        <section className="vault-card" aria-label="Create a theme">
          <h3>Create</h3>
          <p className="hint">Build a look on this PC. It stays in Yours.</p>
          {!brand ? (
            <p className="hint" role="status">
              The brand-colour editor comes with the Silver tier and above, and with Creator access. Credits and weekly unlocks cannot open it. Log in with Patreon on the Support page.
            </p>
          ) : !making ? (
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
              <label>
                Font
                <select value={font} onChange={(e) => setFont(e.target.value as FontKey | "")} style={{ fontFamily: FONTS.find((f) => f.key === font)?.stack }}>
                  {FONTS.map((f) => (
                    <option key={f.key} value={f.key} style={{ fontFamily: f.stack }}>
                      {f.label}
                    </option>
                  ))}
                </select>
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
