import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { Responsive, WidthProvider, type Layout, type Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { CardBoundary } from "../components/ErrorBoundary";
import { Icon } from "../components/Icon";
import { StationSelect } from "../components/StationSelect";
import { CARD_MIME, dragging } from "./dragCard";
import { OnScreenContext } from "./onScreen";
import { resetKeys } from "./cardKeys";
import { BREAKPOINTS, PANE_BREAKPOINTS, CARDS, COLS, MARGIN, ROW_HEIGHT, presetOf, presetSizes, type CardDef, type CardId, type CardInstance } from "./layouts";

const Grid = WidthProvider(Responsive);

/** Scrolls a just-added card into view. The grid may take a moment to lay it out, so this looks for a short while. */
function revealCard(id: string) {
  let tries = 0;
  const look = () => {
    const el = document.querySelector<HTMLElement>(`.layout [data-inst="${CSS.escape(id)}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    else if (tries++ < 12) window.setTimeout(look, 80);
  };
  look();
}

/** How far past the window edge a card still counts as on screen, so it wakes before you scroll to it. */
const NEAR = "300px";

/**
 * One grid cell. The grid hands it its position, size and drag handlers, so they are passed through.
 * It tells the card inside whether it is on screen; off screen the card stops polling and its animations pause.
 */
const Cell = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { card: string; inst: string }>(function Cell({ card, inst, className, children, ...rest }, ref) {
  const el = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(true);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      el.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  useEffect(() => {
    const node = el.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setOn(entries[entries.length - 1].isIntersecting), { rootMargin: NEAR });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <div {...rest} ref={setRef} className={`cell${className ? ` ${className}` : ""}`} data-card={card} data-inst={inst} data-offscreen={on ? undefined : ""}>
      {/* Off-screen cards unmount so their React tree and timers are not kept warm. */}
      <OnScreenContext.Provider value={on}>{on ? children : null}</OnScreenContext.Provider>
    </div>
  );
});

interface Props {
  editing: boolean;
  /** Free: cards stay where you drop them. Otherwise they snap up into order and push each other. */
  free?: boolean;
  /** Drawn inside a split-view pane: narrower widths keep the two-column layout. */
  inPane?: boolean;
  layouts: Layouts;
  onLayouts: (next: Layouts) => void;
  onBreakpoint: (bp: string) => void;
  /** Cards on the dashboard, in order. */
  instances: CardInstance[];
  render: (inst: CardInstance) => ReactNode;
  onRemove: (id: string) => void;
  onLook: (id: string, look: string) => void;
  /** Hold a card in place (or let it move again). */
  onLock: (id: string, locked: boolean) => void;
  /** Put a copy of a card just below `at`, in the grid `bp` is showing. */
  onDuplicate: (id: string, at: { x: number; y: number }, bp: "lg" | "md") => string | undefined;
  /** A card was dragged in from the Cards list and dropped at `at`. */
  onDropCard: (type: CardId, at: { x: number; y: number }, bp: "lg" | "md") => void;
}

/**
 * The card grid. Outside edit mode it is fixed, so clicks always reach the
 * cards. In edit mode every card can be dragged by any part of it, resized
 * from any edge or corner, or removed with its close button, and new cards
 * can be dragged in from the Cards list. The phone layout is a single fixed column.
 */
export function Dashboard({ editing, free = false, inPane = false, layouts, onLayouts, onBreakpoint, instances, render, onRemove, onLook, onLock, onDuplicate, onDropCard }: Props) {
  const [bp, setBp] = useState("lg");
  const bpRef = useRef("lg");
  const wrap = useRef<HTMLDivElement>(null);
  const onBreakpointRef = useRef(onBreakpoint);
  onBreakpointRef.current = onBreakpoint;

  // The grid only reports a breakpoint when it changes, so one it starts in is never announced and
  // `bp` could stay on "lg" while the grid draws two columns. Reading the grid's own width, the one it
  // picks its columns from, keeps `bp` true from the first frame and through every resize.
  useEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(".layout");
    if (!el) return;
    const bps = inPane ? PANE_BREAKPOINTS : BREAKPOINTS;
    const read = () => {
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return;
      const next = w > bps.lg ? "lg" : w > bps.md ? "md" : "sm";
      if (bpRef.current === next) return;
      bpRef.current = next;
      setBp(next);
      onBreakpointRef.current(next);
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inPane]);
  const canEdit = editing && bp !== "sm";
  const grid = bp === "md" ? "md" : "lg";

  // A locked card is `static` to the grid: it neither moves nor resizes, and others flow around it.
  const gridLayouts = useMemo(() => {
    const locked = new Set(instances.filter((i) => i.locked).map((i) => i.id));
    if (!locked.size) return layouts;
    const out: Layouts = {};
    for (const [k, items] of Object.entries(layouts)) out[k] = (items ?? []).map((it) => (locked.has(it.i) ? { ...it, static: true } : it));
    return out;
  }, [layouts, instances]);

  const itemOf = (id: string): Layout | undefined => layouts[grid]?.find((it) => it.i === id);
  const put = (id: string, patch: Partial<Layout>) => {
    const items = layouts[grid];
    if (!items) return;
    onLayouts({ ...layouts, [grid]: items.map((it) => (it.i === id ? { ...it, ...patch } : it)) });
  };

  /** Sets one of the card's preset sizes. */
  const setSize = (inst: CardInstance, size: { w: number; h: number }) => {
    const it = itemOf(inst.id);
    if (it) put(inst.id, { w: size.w, h: size.h, x: Math.max(0, Math.min(it.x, COLS[grid] - size.w)) });
  };

  /** Arrow keys move the focused card a step; with Shift they resize it. */
  const onKey = (e: KeyboardEvent<HTMLDivElement>, inst: CardInstance) => {
    if (e.target !== e.currentTarget || inst.locked) return;
    const dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const dy = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!dx && !dy) return;
    const it = itemOf(inst.id);
    if (!it) return;
    e.preventDefault();
    const cols = COLS[grid];
    if (e.shiftKey) put(inst.id, { w: Math.max(it.minW ?? 1, Math.min(cols - it.x, it.w + dx)), h: Math.max(it.minH ?? 1, it.h + dy) });
    else put(inst.id, { x: Math.max(0, Math.min(cols - it.w, it.x + dx)), y: Math.max(0, it.y + dy) });
  };

  return (
    <div ref={wrap} style={{ display: "contents" }}>
      <Grid
        className={`layout${canEdit ? " editing" : ""}`}
        layouts={gridLayouts}
        breakpoints={inPane ? PANE_BREAKPOINTS : BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        containerPadding={[0, 0]}
        compactType={free ? null : "vertical"}
        preventCollision={free}
        isDraggable={canEdit}
        isResizable={canEdit}
        isDroppable={canEdit}
        droppingItem={{ i: "__dropping__", w: 6, h: 8 }}
        onDropDragOver={() => {
          const t = dragging.type;
          if (!t) return undefined;
          const [w, h] = CARDS[t].size;
          return { w: bp === "md" ? Math.min(12, w) : w, h };
        }}
        onDrop={(_layout, item, e) => {
          const raw = (e as DragEvent).dataTransfer?.getData(CARD_MIME) || dragging.type;
          dragging.type = null;
          if (raw && raw in CARDS && item) onDropCard(raw as CardId, { x: item.x, y: item.y }, bp === "md" ? "md" : "lg");
        }}
        // Every edge and corner resizes. Bottom-right is last so it sits on top where the strips meet it.
        resizeHandles={["s", "w", "e", "n", "sw", "nw", "ne", "se"]}
        draggableCancel=".cell-x,.cell-look,.cell-tools"
        onBreakpointChange={(next) => {
          bpRef.current = next;
          setBp(next);
          onBreakpoint(next);
        }}
        onLayoutChange={(_, all) => {
          if (canEdit) onLayouts(all);
        }}
      >
        {instances.map((inst) => {
          const def: CardDef = CARDS[inst.type];
          return (
            <Cell
              key={inst.id}
              card={inst.type}
              inst={inst.id}
              tabIndex={canEdit ? 0 : undefined}
              aria-label={canEdit ? `${def.name}. ${inst.locked ? "Locked." : "Arrow keys move it, Shift plus arrow keys resize it."}` : undefined}
              onKeyDown={canEdit ? (e) => onKey(e, inst) : undefined}
            >
              <CardBoundary name={def.name} keys={resetKeys(inst.id, inst.type)}>
                {render(inst)}
              </CardBoundary>
              {canEdit && <span className="cell-name">{def.name}</span>}
              {canEdit && def.looks && (
                <StationSelect
                  className="cell-look"
                  variant="chip"
                  label={`Look of ${def.name}`}
                  value={inst.look ?? def.looks[0].id}
                  onChange={(next) => onLook(inst.id, next)}
                  options={def.looks.map((l) => ({ value: l.id, label: l.name }))}
                />
              )}
              {canEdit && (
                <span className="cell-tools">
                  <button
                    type="button"
                    aria-label={inst.locked ? `Unlock ${def.name}` : `Lock ${def.name} in place`}
                    aria-pressed={!!inst.locked}
                    title={inst.locked ? "Unlock: let it move and resize again" : "Lock it in place"}
                    onClick={() => onLock(inst.id, !inst.locked)}
                  >
                    <Icon name={inst.locked ? "lock" : "unlock"} small />
                  </button>
                  <button
                    type="button"
                    aria-label={`Duplicate ${def.name}`}
                    title="Add a copy just below"
                    onClick={() => {
                      const it = itemOf(inst.id);
                      const made = onDuplicate(inst.id, { x: it?.x ?? 0, y: it ? it.y + it.h : 0 }, grid);
                      if (made) revealCard(made);
                    }}
                  >
                    <Icon name="copy" small />
                  </button>
                  {(() => {
                    const it = itemOf(inst.id);
                    const now = it ? presetOf(inst.type, grid, it.w, it.h) : null;
                    return (
                      <span className="cell-size" role="radiogroup" aria-label={`Size of ${def.name}`} title={now ? undefined : "Custom size: pick S, M or L to snap to a preset"}>
                        {presetSizes(inst.type, grid).map((sz) => (
                          <button
                            key={sz.preset}
                            type="button"
                            role="radio"
                            aria-checked={now === sz.preset}
                            disabled={!!inst.locked}
                            aria-label={{ S: "Small", M: "Medium", L: "Large" }[sz.preset]}
                            onClick={() => setSize(inst, sz)}
                          >
                            {sz.preset}
                          </button>
                        ))}
                      </span>
                    );
                  })()}
                </span>
              )}
              {canEdit && (
                <button className="cell-x" aria-label={`Remove ${def.name}`} title="Remove this card" onClick={() => onRemove(inst.id)}>
                  ×
                </button>
              )}
            </Cell>
          );
        })}
      </Grid>
    </div>
  );
}
