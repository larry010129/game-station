import { useContext, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Lock, X } from "lucide-react";
import { CardCtxContext, CardView } from "../layout/registry";
import { CardBoundary } from "./ErrorBoundary";
import { CARDS, type CardId } from "../layout/layouts";
import { fontStack, type ThemeDef } from "../state/palette";
import { SkinSample } from "./SkinSample";
import { StarTag } from "./StarTag";
import { WidgetSample } from "./WidgetSample";

/** What the card shows in its window. */
export type ShowcaseArt =
  | { kind: "widget"; id: string }
  | { kind: "skin"; id: string }
  | { kind: "look"; look: ThemeDef }
  | { kind: "icon"; icon: ReactNode };

export interface ShowcaseItem {
  id: string;
  name: string;
  stars?: 4 | 5;
  /** "Dashboard card", "Card skin", "Theme", "Wallpaper"… */
  type: string;
  owned: boolean;
  art: ShowcaseArt;
  /** What it does, in a sentence or two. */
  effect: string;
  /** Infobox rows. */
  facts: [string, string][];
  /** The main button under the panel, when there is something to do. */
  action?: { label: string; onClick: () => void; disabled?: boolean };
}

export interface ShowcaseSet {
  id: string;
  label: string;
  items: ShowcaseItem[];
}

/**
 * A prize on show: the set's prizes down the left, the chosen one as a collectible card in the middle (it leans
 * toward the pointer), and what it is and does on the right. A dashboard card you own runs live inside the frame.
 */
export function CardShowcase({ sets, start, onClose }: { sets: ShowcaseSet[]; start: { set: string; id?: string }; onClose: () => void }) {
  const [setId, setSetId] = useState(start.set);
  const set = sets.find((s) => s.id === setId) ?? sets[0];
  const [pickedId, setPickedId] = useState(start.id);
  const item = set.items.find((i) => i.id === pickedId) ?? set.items[0];
  const headingId = useId();
  const rail = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    root.current?.focus({ preventScroll: true });
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      before?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  // Keep the chosen thumbnail in view as the arrows walk the list, and keep focus on it while the list has focus.
  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>("[aria-selected='true']");
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (el && rail.current?.contains(document.activeElement) && document.activeElement !== el) el.focus({ preventScroll: true });
  }, [item?.id, setId]);

  const step = (d: number) => {
    const i = set.items.findIndex((x) => x.id === item?.id);
    const n = set.items[(i + d + set.items.length) % set.items.length];
    if (n) setPickedId(n.id);
  };
  const onRailKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") step(-1);
    else return;
    e.preventDefault();
  };

  const owned = set.items.filter((i) => i.owned).length;

  return (
    <div className="sc" role="dialog" aria-modal="true" aria-labelledby={headingId} ref={root} tabIndex={-1}>
      <header className="sc-top">
        <div className="sc-sets" role="tablist" aria-label="Prize type">
          {sets.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === set.id}
              className="sc-set"
              onClick={() => {
                setSetId(s.id);
                setPickedId(undefined);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="sc-count">
          {owned} of {set.items.length} owned
        </span>
        <button type="button" className="sc-close" aria-label="Close showcase" onClick={onClose}>
          <X aria-hidden="true" strokeWidth={1.5} />
        </button>
      </header>

      <div className="sc-rail" ref={rail} role="listbox" aria-label={set.label} aria-orientation="vertical" onKeyDown={onRailKey}>
        {set.items.map((i) => (
          <button
            key={i.id}
            type="button"
            role="option"
            aria-selected={i.id === item?.id}
            tabIndex={i.id === item?.id ? 0 : -1}
            className="sc-thumb"
            data-owned={i.owned || undefined}
            data-stars={i.stars}
            title={i.name}
            onClick={() => setPickedId(i.id)}
          >
            <Thumb item={i} />
            {!i.owned && <Lock className="sc-thumb-lock" aria-hidden="true" strokeWidth={1.6} />}
            <span className="sr-only">
              {i.name}
              {i.owned ? "" : ", not owned"}
            </span>
          </button>
        ))}
      </div>

      {item ? (
        <>
          <div className="sc-stage">
            <TiltCard key={`${set.id}:${item.id}`} item={item} />
          </div>
          <aside className="sc-panel" aria-labelledby={headingId}>
            <h2 id={headingId} className="sc-name">
              {item.name}
            </h2>
            <p className="sc-meta">
              {item.stars && <StarTag stars={item.stars} />}
              <span>{item.type}</span>
              <span className="sc-own" data-owned={item.owned || undefined}>
                {item.owned ? "Owned" : "Not owned"}
              </span>
            </p>
            <section className="sc-sec">
              <h3>What it does</h3>
              <p>{item.effect}</p>
            </section>
            {item.facts.length > 0 && (
              <dl className="sc-facts">
                {item.facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {item.action && (
              <button type="button" className="sc-action" onClick={item.action.onClick} disabled={item.action.disabled}>
                {item.action.label}
              </button>
            )}
          </aside>
        </>
      ) : (
        <p className="sc-empty">Nothing in this set yet.</p>
      )}
    </div>
  );
}

/**
 * Cards that keep their own saved data per placed copy (Notes) would start an empty, orphaned copy here, so they
 * show their sample instead of running live.
 */
const NOT_LIVE: ReadonlySet<string> = new Set(["notes"]);

/** The collectible card. Pictures lean toward the pointer; a live dashboard card holds still so its buttons work. */
function TiltCard({ item }: { item: ShowcaseItem }) {
  const ctx = useContext(CardCtxContext);
  const widgetId = item.art.kind === "widget" ? (item.art.id as CardId) : null;
  const live = widgetId != null && item.owned && ctx != null && !NOT_LIVE.has(widgetId);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (live || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };

  const style = { "--tx": tilt.x, "--ty": tilt.y } as CSSProperties;
  return (
    <div className="sc-tilt" onPointerMove={onMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })} style={style}>
      <svg className="sc-halo" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="96" />
        <circle cx="100" cy="100" r="72" />
      </svg>
      <div className="sc-card" data-kind={item.art.kind} data-stars={item.stars} data-live={live || undefined} data-owned={item.owned || undefined}>
        <div className="sc-window">
          {live ? (
            <div className="sc-live">
              <CardBoundary name={CARDS[widgetId!]?.name ?? item.name} keys={[]}>
                <CardView inst={{ id: `showcase-${item.id}`, type: widgetId! }} />
              </CardBoundary>
            </div>
          ) : (
            <Art art={item.art} />
          )}
        </div>
        <div className="sc-plate">
          <b>{item.name}</b>
          <span>{live ? "Live" : item.type}</span>
        </div>
        <span className="sc-sheen" aria-hidden="true" />
      </div>
    </div>
  );
}

function Art({ art }: { art: ShowcaseArt }) {
  if (art.kind === "widget") return <WidgetSample id={art.id} className="sc-widget" />;
  if (art.kind === "skin") return <SkinSample id={art.id} className="sc-skin" />;
  if (art.kind === "look") return <LookArt look={art.look} />;
  return <span className="sc-icon">{art.icon}</span>;
}

/**
 * A theme as card art: the window takes the theme's background, a big "Aa" in its accent, its three signal colours,
 * and a small dashboard card in its own surface and font.
 */
function LookArt({ look }: { look: ThemeDef }) {
  const p = look.palette;
  const style = (p ? { background: p.bg, color: p.text, fontFamily: fontStack(p) } : undefined) as CSSProperties | undefined;
  return (
    <div className="sc-lookart" style={style} role="img" aria-label={`${look.name} theme colours`}>
      <b style={{ color: p?.accent }}>Aa</b>
      <span className="sc-lookart-dots" aria-hidden="true">
        <i style={{ background: p?.accent }} />
        <i style={{ background: p?.caution }} />
        <i style={{ background: p?.alert }} />
      </span>
      <span className="sc-lookart-card" aria-hidden="true" style={p ? { background: p.card, borderColor: p.border, borderRadius: p.radius } : undefined}>
        <small style={{ color: p?.muted }}>GPU</small>
        <strong>
          62<small>°C</small>
        </strong>
        <i style={{ background: p?.accent }} />
      </span>
      <span className="sc-lookart-by" style={{ color: p?.muted }}>
        {look.author}
      </span>
    </div>
  );
}

function Thumb({ item }: { item: ShowcaseItem }) {
  const art = item.art;
  if (art.kind === "skin") return <span className="sc-thumb-art skin-swatch skin-swatch-mini" data-skin={art.id} aria-hidden="true" />;
  if (art.kind === "look") {
    const p = art.look.palette;
    return (
      <span className="sc-thumb-art" aria-hidden="true" style={p ? { background: p.bg, color: p.accent, borderColor: p.border } : undefined}>
        Aa
      </span>
    );
  }
  if (art.kind === "widget")
    return (
      <span className="sc-thumb-art sc-thumb-widget" aria-hidden="true">
        {item.name}
      </span>
    );
  return (
    <span className="sc-thumb-art sc-thumb-icon" aria-hidden="true">
      {art.icon}
    </span>
  );
}
