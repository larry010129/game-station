import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Maximize, Minimize, Minus, Plus, RotateCcw, Scan, Search } from "lucide-react";
import { PERK_ICON_SYMBOLS } from "../content/perkIcons";
import {
  canReset,
  extraLive,
  bandLocked,
  bandSixOwner,
  isKey,
  isPentagon,
  keyHeld,
  lockedClass,
  isSquare,
  MAX_PENTAGONS,
  MAX_SQUARES,
  pentagonsHeld,
  squaresHeld,
  CLASSES,
  CORE_LINK,
  isLive,
  linkOpen,
  MAX_STARTS,
  neighbours,
  nodeById,
  NODES,
  pathTo,
  pointsLeft,
  pointsSpent,
  regionById,
  START_ID,
  TREE,
  type PerkNode,
  type PerkNodeType,
  type PerkPath,
} from "../state/perks";
import { usePerks } from "../state/perkStore";
import { LAST_POINT_LEVEL, levelProgress, MAX_LEVEL, pointsPerLevelAt, xpLabel, xpToNext } from "../state/playerLevel";
import { usePlayerLevel } from "../state/usePlayerLevel";
import { useToast } from "../state/Toast";

/** Node sizes in tree units. */
const R: Record<PerkNodeType, number> = { start: 40, class: 46, keystone: 46, notable: 26, gate: 22, special: 22, pentagon: 34, small: 14, ring: 13, bridge: 14 };
/** How much of a round node the icon fills. */
const ICON_FILL: Partial<Record<PerkNodeType, number>> = { small: 0.56, ring: 0.56, bridge: 0.56, notable: 0.55, keystone: 0.52, start: 0.5, class: 0.62 };
const NAMED = new Set<PerkNodeType>(["start", "class", "notable", "keystone", "gate", "special", "pentagon"]);
const TYPE_NAME: Record<PerkNodeType, string> = {
  start: "Station Core",
  class: "Class",
  small: "Small node",
  notable: "Notable",
  gate: "Season Key",
  special: "Special",
  pentagon: "Pentagon",
  keystone: "Keystone",
  bridge: "Bridge",
  ring: "Ring node",
};
/** Who pays a node out, in a sentence. */
const PAYS: Record<string, string> = {
  "Play time": "While you play",
  Sessions: "From your play sessions",
  Streaks: "From your play streak",
  Background: "While the station runs",
  Rig: "While your PC runs well",
  Always: "All the time",
  Quests: "When you claim quests",
  Draws: "When you draw",
  "Rule change": "Changes a rule",
};
const MIN_K = 0.04;
/** The SVG reaches this share of the stage past each edge, so a drag shows tree that is already painted. */
const MARGIN = 0.5;
const MAX_K = 3;
const diamond = (k: number) => `0,${-k} ${k},0 0,${k} ${-k},0`;
/** A pentagon of radius k, point up. */
const pentagon = (k: number) =>
  [0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return `${(k * Math.cos(a)).toFixed(1)},${(k * Math.sin(a)).toFixed(1)}`; }).join(" ");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Where each class's name sits: by its farthest keystone, above it in the top half and below it in the bottom half. */
const REGION_LABELS = CLASSES.map((c) => {
  const key = NODES.filter((n) => n.region === c.id && n.type === "keystone").sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0];
  return key ? { ...c, x: key.x, y: key.y, up: key.y < 0 } : null;
}).filter((l): l is NonNullable<typeof l> => l != null);

const BOUNDS = (() => {
  const xs = NODES.map((n) => n.x);
  const ys = NODES.map((n) => n.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
})();

type EdgeKind = "base" | "closed" | "open" | "taken";
const EDGE_KINDS: readonly EdgeKind[] = ["base", "closed", "open", "taken"];

/**
 * The links, lit by what you have: one path per kind (about 1,900 links in four elements), so the browser has far
 * less to paint. Redrawn only when what you have changes.
 */
const EdgeLayer = memo(function EdgeLayer({ takenKey, startsKey }: { takenKey: string; startsKey: string }) {
  const paths = useMemo(() => {
    const have = new Set([START_ID, ...(takenKey ? takenKey.split(",") : [])]);
    const starts = startsKey ? startsKey.split(",") : [];
    const out: Record<EdgeKind, string[]> = { base: [], closed: [], open: [], taken: [] };
    for (const [a, b] of TREE.edges) {
      const na = nodeById(a)!;
      const nb = nodeById(b)!;
      const ta = have.has(a);
      const tb = have.has(b);
      const kind: EdgeKind = !linkOpen(starts, a, b) ? "closed" : ta && tb ? "taken" : ta || tb ? "open" : "base";
      out[kind].push(`M${na.x} ${na.y}L${nb.x} ${nb.y}`);
    }
    return out;
  }, [takenKey, startsKey]);
  return (
    <g className="pt-edges">
      {EDGE_KINDS.map((k) => (paths[k].length ? <path key={k} className={k} d={paths[k].join("")} /> : null))}
    </g>
  );
});

/** The nodes. Redrawn only when what you have (or what counts) changes. */
const NodeLayer = memo(function NodeLayer({ takenKey, activeKey, startsKey }: { takenKey: string; activeKey: string; startsKey: string }) {
  const have = useMemo(() => new Set([START_ID, ...(takenKey ? takenKey.split(",") : [])]), [takenKey]);
  const active = useMemo(() => new Set([START_ID, ...(activeKey ? activeKey.split(",") : [])]), [activeKey]);
  const starts = useMemo(() => (startsKey ? startsKey.split(",") : []), [startsKey]);
  const stateOf = (n: PerkNode) => {
    const taken = have.has(n.id);
    const open = !taken && neighbours(n.id).some((nb) => have.has(nb) && linkOpen(starts, nb, n.id));
    return taken ? (active.has(n.id) ? "taken" : "idle") : open ? "open" : "far";
  };
  return (
    <>
      <g className="pt-nodes">
        {NODES.map((n) => (
          <PerkGlyph key={n.id} n={n} state={stateOf(n)} />
        ))}
      </g>
      {/* Names live in their own layer: only it follows the zoom, so zooming never restyles every node. */}
      <g className="pt-k pt-names" aria-hidden="true">
        {NODES.filter((n) => NAMED.has(n.type)).map((n) => (
          <text key={n.id} className="pt-name" x={n.x} y={n.y} data-type={n.type} data-state={stateOf(n)} style={{ "--nr": R[n.type] } as CSSProperties}>
            {n.name}
          </text>
        ))}
        {/* Only names on the tree: what a node does (and its passive) is in the hover tip and the side panel. */}
      </g>
    </>
  );
});

function PerkGlyph({ n, state }: { n: PerkNode; state: string }) {
  const r = R[n.type] ?? 15;
  const color = regionById(n.region).color;
  const iconSize = n.type === "special" || n.type === "pentagon" ? r * 0.92 : 2 * r * (ICON_FILL[n.type] ?? 0.55);
  const shape = n.type === "gate" || n.type === "special";
  return (
    <g className={`pt-node t-${n.type}`} data-state={state} data-id={n.id} data-dead={isLive(n) ? undefined : ""} transform={`translate(${n.x} ${n.y})`} style={{ "--rc0": color } as CSSProperties}>
      {(n.type === "keystone" || n.type === "start" || n.type === "class") && <circle className="pt-ring" r={r + 9} />}
      {n.type === "pentagon" ? (
        <>
          <polygon className="pt-ring" points={pentagon(r + 10)} />
          <polygon className="pt-disc" points={pentagon(r)} />
        </>
      ) : shape ? (
        <>
          <polygon className="pt-ring" points={diamond(r + 9)} />
          <polygon className="pt-disc" points={diamond(r)} />
        </>
      ) : (
        <circle className={n.type === "start" ? "pt-disc pt-core" : "pt-disc"} r={r} />
      )}
      {n.type === "gate" ? (
        <path className="pt-key" d="M-9 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0M0 0h10M6 0v4M9 0v3" />
      ) : (
        <use className="pt-icon" href={`#pki-${n.icon}`} x={-iconSize / 2} y={-iconSize / 2} width={iconSize} height={iconSize} />
      )}
    </g>
  );
}

/** One showcase slot: the node's shape, filled in its class colour with its icon, or a dashed outline when empty. */
function Slot({
  shape,
  n,
  onPick,
  onAim,
  at,
  named = false,
}: {
  shape: "pentagon" | "diamond";
  n?: PerkNode;
  onPick: (n: PerkNode) => void;
  onAim: (n: PerkNode | null) => void;
  at?: CSSProperties;
  /** Show the name under the shape (pentagons); squares name themselves in the board's caption. */
  named?: boolean;
}) {
  const r = shape === "pentagon" ? 20 : 17;
  const points = shape === "pentagon" ? pentagon(r) : diamond(r);
  const art = (
    <svg className="pt-slot-shape" viewBox="-24 -24 48 48" aria-hidden="true">
      <polygon points={points} />
      {n?.type === "gate" ? (
        <path className="pt-slot-key" d="M-9 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0M0 0h10M6 0v4M9 0v3" />
      ) : n ? (
        <use href={`#pki-${n.icon}`} x={-r * 0.48} y={-r * 0.48} width={r * 0.96} height={r * 0.96} />
      ) : null}
    </svg>
  );
  if (!n) {
    return (
      <span className="pt-slot" data-shape={shape} data-empty="" style={at} role="img" aria-label={`Empty ${shape === "pentagon" ? "pentagon" : "square"} slot`}>
        {art}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="pt-slot"
      data-shape={shape}
      style={{ ...at, "--rc0": regionById(n.region).color } as CSSProperties}
      aria-label={named ? undefined : n.name}
      onClick={() => onPick(n)}
      onMouseEnter={() => onAim(n)}
      onMouseLeave={() => onAim(null)}
      onFocus={() => onAim(n)}
      onBlur={() => onAim(null)}
    >
      {art}
      {named && <small>{n.name}</small>}
    </button>
  );
}

/**
 * What you hold, like a loadout bar, filled in the order taken: the pentagons in a row with their names, then the
 * squares in two rows of four that interlock (the second row sits half a slot over and tucks up between the first).
 * The caption under it names the slot you point at or focus.
 */
function SlotBoard({ taken, onPick }: { taken: readonly string[]; onPick: (n: PerkNode) => void }) {
  const [aim, setAim] = useState<PerkNode | null>(null);
  const held = taken.map((id) => nodeById(id)!).filter(Boolean);
  const pentagons = held.filter(isPentagon);
  const squares = held.filter(isSquare);
  const fill = (list: PerkNode[], size: number) => Array.from({ length: size }, (_, i) => list[i]);
  const perRow = Math.ceil(MAX_SQUARES / 2);
  return (
    <div className="pt-slots">
      <div className="pt-slot-pents" style={{ "--cols": MAX_PENTAGONS } as CSSProperties}>
        {fill(pentagons, MAX_PENTAGONS).map((n, i) => (
          <Slot key={n?.id ?? `p${i}`} shape="pentagon" n={n} onPick={onPick} onAim={setAim} named />
        ))}
      </div>
      <div className="pt-slot-squares" style={{ "--cols": perRow * 2 + 1 } as CSSProperties}>
        {fill(squares, MAX_SQUARES).map((n, i) => {
          const row = i < perRow ? 1 : 2;
          const col = (i % perRow) * 2 + (row === 1 ? 1 : 2);
          return <Slot key={n?.id ?? `s${i}`} shape="diamond" n={n} onPick={onPick} onAim={setAim} at={{ gridRow: row, gridColumn: `${col} / span 2`, marginTop: row === 2 ? -18 : undefined }} />;
        })}
      </div>
      <p className="pt-slot-caption" aria-live="polite" style={aim ? ({ "--rc0": regionById(aim.region).color } as CSSProperties) : undefined}>
        {aim ? (
          <>
            <b>{aim.name}</b> {aim.effect.split("\n").join(" · ")}
          </>
        ) : held.some((n) => isSquare(n) || isPentagon(n)) ? (
          "Point at a slot to see it. Click it to find it on the tree."
        ) : (
          "Pentagons and squares you take on the tree fill these slots."
        )}
      </p>
    </div>
  );
}

/** The path a node would take, drawn over the tree, plus rings for the chosen node and search hits. */
function Overlay({ path, target, picked, found }: { path: PerkPath | null; target: string | null; picked: string | null; found: readonly string[] }) {
  const chain = path && path.nodes.length ? [path.from, ...path.nodes] : [];
  const tn = target ? nodeById(target) : undefined;
  const pn = picked ? nodeById(picked) : undefined;
  return (
    <g className="pt-overlay" aria-hidden="true">
      {chain.slice(1).map((id, i) => {
        const a = nodeById(chain[i])!;
        const b = nodeById(id)!;
        return <line key={id} className="pt-way" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      {chain.slice(1).map((id) => {
        const n = nodeById(id)!;
        return <circle key={`s${id}`} className="pt-step" cx={n.x} cy={n.y} r={(R[n.type] ?? 15) + 5} />;
      })}
      {found.map((id) => {
        const n = nodeById(id)!;
        return <circle key={`f${id}`} className="pt-found" cx={n.x} cy={n.y} r={(R[n.type] ?? 15) + 14} />;
      })}
      {pn && <circle className="pt-picked" cx={pn.x} cy={pn.y} r={(R[pn.type] ?? 15) + 16} />}
      {tn && tn !== pn && <circle className="pt-aim" cx={tn.x} cy={tn.y} r={(R[tn.type] ?? 15) + 12} />}
    </g>
  );
}

/** A trade-off node reads "gain, −loss": the loss goes on its own line, in red. */
function EffectText({ text }: { text: string }) {
  const i = text.indexOf(", −");
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <br />
      <span className="pt-down">{text.slice(i + 2)}</span>
    </>
  );
}

/** Taken nodes summed by stat, as rows for "In effect now". Only effects the app applies. */
function liveRows(effects: ReturnType<typeof usePerks>["effects"]): [string, string][] {
  return [
    ["Income per counted hour", `+${effects.creditsPerHour}`],
    ["Income from play", `+${effects.playIncomePct}%`],
    ["Income from quests", `+${effects.questIncomePct}%`],
    ["All Income", `+${effects.allIncomePct}%`],
    ["Season Pass XP", `+${Math.round((effects.passXpMult - 1) * 100)}%`],
    ["Weekly Pass XP cap", `+${effects.passCapBonus.toLocaleString()}`],
    ["Season Pass levels open", `1 to ${effects.passLevelCap}`],
  ];
}

/**
 * The perk tree section of the Profile page: the whole tree in the middle (drag to move, wheel to zoom) and, beside
 * it, what you have to spend, your starting classes, the node you picked, and what is in effect. A node is taken on
 * the tree itself: click it to see its path and cost, click it again to take it.
 */
export function PerkSection() {
  const { state, earned, active, effects, take, reset } = usePerks();
  const player = usePlayerLevel();
  const toast = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  /** The tree fills the whole app window. */
  const [full, setFull] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const view = useRef({ x: 0, y: 0, k: 0.2, ready: false });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  const left = pointsLeft(state, earned);
  const spent = pointsSpent(state);
  const takenKey = state.taken.join(",");
  const activeKey = active.join(",");
  const startsKey = state.starts.join(",");
  const now = new Date();

  // ---- pan and zoom ----
  // The SVG is twice the stage's size each way (half a stage of margin on every side). While you drag or wheel, the
  // painted SVG is only moved and scaled on the GPU (a CSS transform on the <svg>); the tree is redrawn once, when the
  // gesture ends. Moving the tree itself on every frame repainted about 10,000 elements a frame.
  const pending = useRef({ a: 1, bx: 0, by: 0 });
  const settleTimer = useRef<number | undefined>(undefined);

  const apply = useCallback(() => {
    const v = view.current;
    const world = worldRef.current;
    const svg = svgRef.current;
    if (!world || !svg) return;
    world.setAttribute("transform", `translate(${v.x} ${v.y}) scale(${v.k})`);
    // Only the label layers read the zoom; setting it on the whole tree would restyle every node.
    for (const el of world.querySelectorAll<SVGGElement>(".pt-k")) el.style.setProperty("--k", String(v.k));
    // Names below about 50% would overlap their neighbours.
    svg.classList.toggle("far", v.k < 0.5);
    // Zoomed right out, even keystone names run into each other.
    svg.classList.toggle("tiny", v.k < 0.15);
    svg.classList.toggle("wide", v.k >= 0.3);
    svg.classList.toggle("mid", v.k >= 0.4);
    svg.classList.toggle("near", v.k >= 0.7);
  }, []);

  /** The stage's size, and the SVG's (untransformed) size and top-left on screen. */
  const size = () => {
    const r = stageRef.current?.getBoundingClientRect();
    const sw = r?.width ?? 0;
    const sh = r?.height ?? 0;
    return { sw, sh, w: sw * (1 + 2 * MARGIN), h: sh * (1 + 2 * MARGIN), left: (r?.left ?? 0) - sw * MARGIN, top: (r?.top ?? 0) - sh * MARGIN };
  };

  const showPending = () => {
    const p = pending.current;
    const svg = svgRef.current;
    if (svg) svg.style.transform = p.a === 1 && p.bx === 0 && p.by === 0 ? "" : `translate3d(${p.bx}px, ${p.by}px, 0) scale(${p.a})`;
  };

  /** Folds the GPU-only move into the tree and redraws it once. */
  const settle = useCallback(() => {
    window.clearTimeout(settleTimer.current);
    const p = pending.current;
    if (p.a === 1 && p.bx === 0 && p.by === 0) return;
    const v = view.current;
    view.current = { ...v, k: v.k * p.a, x: p.a * v.x + p.bx, y: p.a * v.y + p.by };
    pending.current = { a: 1, bx: 0, by: 0 };
    // Both in the same frame, so the tree never shows twice.
    apply();
    showPending();
  }, [apply]);

  const fitAll = useCallback(() => {
    settle();
    const { sw, sh, w, h } = size();
    if (!sw || !sh) return;
    // Room in screen pixels for the class names, which keep their size as you zoom out.
    const k = Math.max(MIN_K, Math.min((sw - 140) / (BOUNDS.x1 - BOUNDS.x0), (sh - 150) / (BOUNDS.y1 - BOUNDS.y0)));
    view.current = { ...view.current, k, x: w / 2 - ((BOUNDS.x0 + BOUNDS.x1) / 2) * k, y: h / 2 - ((BOUNDS.y0 + BOUNDS.y1) / 2) * k };
    apply();
  }, [apply, settle]);

  /** Centres a tree point at zoom `k`. */
  const centre = useCallback(
    (x: number, y: number, k: number) => {
      settle();
      const { w, h } = size();
      const kk = Math.min(MAX_K, Math.max(MIN_K, k));
      view.current = { ...view.current, k: kk, x: w / 2 - x * kk, y: h / 2 - y * kk };
      apply();
    },
    [apply, settle],
  );

  /** Zooms by `f` about a point in SVG pixels and redraws (the + and - buttons and keys). */
  const zoomAt = useCallback(
    (f: number, cx: number, cy: number) => {
      settle();
      const v = view.current;
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * f));
      view.current = { ...v, x: cx - (cx - v.x) * (k / v.k), y: cy - (cy - v.y) * (k / v.k), k };
      apply();
      setHover(null);
    },
    [apply, settle],
  );
  const zoomCentre = (f: number) => {
    const { w, h } = size();
    zoomAt(f, w / 2, h / 2);
  };

  // First view: Station Core and the inner ring of every class. Waits until the stage has a size.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const first = () => {
      const { sw, sh } = size();
      if (!sw || !sh || view.current.ready) return;
      view.current.ready = true;
      centre(0, 0, Math.min(sw, sh) / 3200);
    };
    // Straight away when the stage already has a size, else as soon as it gets one.
    first();
    const ro = new ResizeObserver(first);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [centre]);

  // Going full page (or back) keeps the tree point in the middle of the stage, at the same zoom.
  const midBefore = useRef<{ x: number; y: number; k: number } | null>(null);
  const toggleFull = () => {
    settle();
    const { w, h } = size();
    const v = view.current;
    midBefore.current = { x: (w / 2 - v.x) / v.k, y: (h / 2 - v.y) / v.k, k: v.k };
    setHover(null);
    setFull((f) => !f);
  };
  useLayoutEffect(() => {
    const m = midBefore.current;
    if (!m) return;
    midBefore.current = null;
    centre(m.x, m.y, m.k);
    stageRef.current?.focus({ preventScroll: true });
  }, [full, centre]);
  // Escape leaves full page wherever the focus is.
  useEffect(() => {
    if (!full) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      toggleFull();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  });

  // Wheel: scale the painted SVG about the pointer, and redraw once the wheel has been still for a moment.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { left, top } = size();
      const p = pending.current;
      const qx = e.clientX - left;
      const qy = e.clientY - top;
      const want = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const k = view.current.k * p.a;
      const f = Math.min(MAX_K, Math.max(MIN_K, k * want)) / k;
      pending.current = { a: p.a * f, bx: f * (p.bx - qx) + qx, by: f * (p.by - qy) + qy };
      showPending();
      setHover(null);
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(settle, 160);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheel);
      window.clearTimeout(settleTimer.current);
    };
  }, [settle]);

  // Drag: move the painted SVG; redraw when the pointer is released, or when the margin is nearly used up.
  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, vx: pending.current.bx, vy: pending.current.by, moved: false };
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) {
        d.moved = true;
        stageRef.current?.classList.add("dragging");
        setHover(null);
      }
      if (!d.moved) return;
      pending.current = { ...pending.current, bx: d.vx + dx, by: d.vy + dy };
      const { sw, sh } = size();
      if (Math.abs(pending.current.bx) > sw * MARGIN * 0.9 || Math.abs(pending.current.by) > sh * MARGIN * 0.9) {
        // Past the painted margin: redraw here and carry on dragging from this point.
        settle();
        d.x = e.clientX;
        d.y = e.clientY;
        d.vx = 0;
        d.vy = 0;
        return;
      }
      showPending();
    };
    const up = () => {
      const d = drag.current;
      if (!d) return;
      stageRef.current?.classList.remove("dragging");
      if (d.moved) settle();
      // Cleared after the click that follows a drag has been ignored.
      window.setTimeout(() => (drag.current = null), 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [settle]);

  // ---- choosing and taking ----
  const takeIt = useCallback(
    (id: string) => {
      const n = nodeById(id)!;
      const p = pathTo(state, id);
      if (!p || p.nodes.length === 0) return;
      if (p.cost > left) {
        toast(`${n.name} needs ${plural(p.cost, "point")}; you have ${left}.`);
        return;
      }
      if (squaresHeld(state) + p.nodes.filter((x) => isSquare(nodeById(x))).length > MAX_SQUARES) {
        toast(`You already hold ${MAX_SQUARES} of ${MAX_SQUARES} squares. The monthly reset frees them.`);
        return;
      }
      if (pentagonsHeld(state) + p.nodes.filter((x) => isPentagon(nodeById(x))).length > MAX_PENTAGONS) {
        toast(`You already hold ${MAX_PENTAGONS} of ${MAX_PENTAGONS} pentagons. The monthly reset frees them.`);
        return;
      }
      if (keyHeld(state) && p.nodes.some((x) => isKey(nodeById(x)))) {
        toast("You already have a Season Key. You can hold only one; the monthly reset frees it.");
        return;
      }
      if (!take(id)) return;
      const opened = p.opens ? ` ${regionById(p.opens).name} is starting class ${state.starts.length + 1} of ${MAX_STARTS}.` : "";
      toast(p.nodes.length > 1 ? `Took ${n.name} and ${plural(p.nodes.length - 1, "node")} on the way.${opened}` : `Took ${n.name}.${opened}`);
    },
    [state, left, take, toast],
  );

  const nodeAt = (target: EventTarget | null): string | null => {
    const el = (target as Element | null)?.closest?.("[data-id]");
    return el ? el.getAttribute("data-id") : null;
  };

  const onClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    if (drag.current?.moved) return;
    const id = nodeAt(e.target);
    if (!id) {
      setPicked(null);
      return;
    }
    // Taking spends points with no give-back until the monthly reset, so the second click of a double-click
    // (detail 2) never takes: picking and taking stay two separate clicks.
    if (id !== picked) setPicked(id);
    else if (e.detail < 2) takeIt(id);
  };

  const onOver = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current?.moved) return;
    const id = nodeAt(e.target);
    if (!id) {
      if (hover) setHover(null);
      return;
    }
    if (hover?.id === id) return;
    const box = stageRef.current!.getBoundingClientRect();
    setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const { w, h } = size();
    const step = 80;
    const pan = (dx: number, dy: number) => {
      settle();
      view.current = { ...view.current, x: view.current.x + dx, y: view.current.y + dy };
      apply();
    };
    const keys: Record<string, () => void> = {
      "+": () => zoomAt(1.25, w / 2, h / 2),
      "=": () => zoomAt(1.25, w / 2, h / 2),
      "-": () => zoomAt(0.8, w / 2, h / 2),
      "0": fitAll,
      ArrowLeft: () => pan(step, 0),
      ArrowRight: () => pan(-step, 0),
      ArrowUp: () => pan(0, step),
      ArrowDown: () => pan(0, -step),
      Enter: () => picked && takeIt(picked),
      Escape: () => setPicked(null),
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  };

  // ---- search ----
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return NODES.filter((n) => NAMED.has(n.type) && n.type !== "start" && (n.name.toLowerCase().includes(q) || n.effect.toLowerCase().includes(q)));
  }, [query]);
  const foundIds = useMemo(() => hits.map((n) => n.id), [hits]);
  const goTo = (n: PerkNode) => {
    setPicked(n.id);
    centre(n.x, n.y, Math.max(view.current.k, 0.6));
  };

  // ---- what the panel and the overlay show ----
  const aim = hover?.id ?? picked;
  const aimPath = useMemo(() => (aim ? pathTo(state, aim) : null), [aim, state]);
  const pickedNode = picked ? nodeById(picked) : undefined;
  const pickedPath = useMemo(() => (picked ? pathTo(state, picked) : null), [picked, state]);
  const hoverNode = hover ? nodeById(hover.id) : undefined;
  const waiting = active.filter((id) => !isLive(nodeById(id)!)).length;
  const paused = state.taken.length - active.length;

  /** How many Season Keys, squares and pentagons you hold, as "Season Key 0/1". */
  const slotCount = (n: PerkNode): string =>
    isKey(n) ? `Season Key ${keyHeld(state) ? 1 : 0}/1` : n.type === "special" ? `Square ${squaresHeld(state)}/${MAX_SQUARES}` : isPentagon(n) ? `Pentagon ${pentagonsHeld(state)}/${MAX_PENTAGONS}` : "";
  /** Whether you can take a node, in one short line: ["ok" | "no" | "own", text]. */
  const statusOf = (n: PerkNode, p: PerkPath | null): ["ok" | "no" | "own", string] => {
    const join = (...bits: (string | false | null | undefined)[]) => bits.filter(Boolean).join(" · ");
    if (n.id === START_ID) return ["own", `Start · your first ${MAX_STARTS} paths out pick your starting classes`];
    if (state.taken.includes(n.id)) return ["own", join("Yours", slotCount(n), !active.includes(n.id) && "paused until you earn the points back")];
    if (isKey(n) && keyHeld(state)) return ["no", "Can't take · Season Key 1/1 already held"];
    if (!p) {
      if (!bandLocked(state.starts, n.id, state.taken)) return ["no", "Can't take · no open path yet"];
      const own = lockedClass(n.id)!;
      if (state.starts.includes(own)) {
        const owner = bandSixOwner(state.taken)!;
        return ["no", owner === own ? "Can't take · you already chose another band VI path" : `Can't take · band VI is already started in ${regionById(owner).name}`];
      }
      return ["no", `Can't take · bands IV, V and VI need a ${regionById(own).name} start`];
    }
    if (isSquare(n) && squaresHeld(state) >= MAX_SQUARES) return ["no", `Can't take · squares full (${squaresHeld(state)}/${MAX_SQUARES})`];
    if (isPentagon(n) && pentagonsHeld(state) >= MAX_PENTAGONS) return ["no", `Can't take · pentagons full (${pentagonsHeld(state)}/${MAX_PENTAGONS})`];
    if (p.cost > left) return ["no", `Can't take · needs ${plural(p.cost, "pt")}, you have ${left}`];
    return ["ok", join("Can take", p.cost === 0 ? "free" : plural(p.cost, "pt"), p.nodes.length > 1 && `${p.nodes.length} nodes`, slotCount(n), p.opens && `start ${state.starts.length + 1}/${MAX_STARTS}`)];
  };

  return (
    <>
      <div
        ref={stageRef}
        className={full ? "pfp-stage pt-stage is-full" : "pfp-stage pt-stage"}
        tabIndex={0}
        role="application"
        aria-label="Perk tree. Drag to move, wheel or plus and minus to zoom, arrow keys to pan, Enter takes the picked node."
        onKeyDown={onKey}
      >
        <svg ref={svgRef} className="pt-svg" onPointerDown={onPointerDown} onClick={onClick} onPointerOver={onOver} onPointerLeave={() => setHover(null)}>
          <defs dangerouslySetInnerHTML={{ __html: PERK_ICON_SYMBOLS }} />
          <g ref={worldRef} className="pt-world">
            <g className="pt-k pt-regions" aria-hidden="true">
              {REGION_LABELS.map((l) => (
                <text key={l.id} className="pt-region" data-up={l.up || undefined} x={l.x} y={l.y} style={{ "--rc0": l.color } as CSSProperties}>
                  <tspan>{l.name.toUpperCase()}</tspan>
                  <tspan className="pt-region-sub" x={l.x} dy="1.25em">
                    {l.focus}
                  </tspan>
                </text>
              ))}
            </g>
            <EdgeLayer takenKey={takenKey} startsKey={startsKey} />
            <Overlay path={aimPath} target={aim} picked={picked} found={foundIds} />
            <NodeLayer takenKey={takenKey} activeKey={activeKey} startsKey={startsKey} />
          </g>
        </svg>

        <div className="pt-find">
          <label className="pt-search">
            <Search aria-hidden="true" strokeWidth={1.6} />
            <input type="search" value={query} placeholder="Find a perk" aria-label="Find a perk by name or effect" onChange={(e) => setQuery(e.target.value)} />
          </label>
          {query.trim().length > 1 && (
            <div className="pt-hits">
              {hits.length === 0 ? (
                <p>No named perk matches.</p>
              ) : (
                <>
                  {hits.slice(0, 6).map((n) => (
                    <button key={n.id} type="button" style={{ "--rc0": regionById(n.region).color } as CSSProperties} onClick={() => goTo(n)}>
                      <i aria-hidden="true" />
                      <b>{n.name}</b>
                      <span>{regionById(n.region).name}</span>
                    </button>
                  ))}
                  {hits.length > 6 && <p>{hits.length - 6} more ringed on the tree.</p>}
                </>
              )}
            </div>
          )}
        </div>

        <div className="pt-tools">
          <button type="button" aria-label="Zoom in" onClick={() => zoomCentre(1.25)}>
            <Plus aria-hidden="true" strokeWidth={1.6} />
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => zoomCentre(0.8)}>
            <Minus aria-hidden="true" strokeWidth={1.6} />
          </button>
          <button type="button" aria-label="Show the whole tree" title="Show the whole tree" onClick={fitAll}>
            <Scan aria-hidden="true" strokeWidth={1.6} />
          </button>
          <button type="button" aria-label={full ? "Leave full page" : "Full page"} title={full ? "Leave full page (Esc)" : "Full page"} aria-pressed={full} onClick={toggleFull}>
            {full ? <Minimize aria-hidden="true" strokeWidth={1.6} /> : <Maximize aria-hidden="true" strokeWidth={1.6} />}
          </button>
        </div>

        {full && (
          <div className="pt-fullbar" aria-live="polite">
            <b>{left}</b>
            <span>Perk Points left</span>
            <small>{pickedNode ? `${pickedNode.name}: ${statusOf(pickedNode, pickedPath)[1]}` : "Click a node to see its path, click it again to take it. Esc leaves full page."}</small>
          </div>
        )}

        {hoverNode && hover && (
          <div className="pt-tip" style={{ left: hover.x, top: hover.y, "--rc0": regionById(hoverNode.region).color } as CSSProperties} aria-hidden="true">
            <b>{hoverNode.name}</b>
            <span>
              <EffectText text={hoverNode.effect} />
            </span>
            {hoverNode.passive && <span className="pt-passive">Passive: {hoverNode.passive}</span>}
            <small className="pt-st" data-kind={statusOf(hoverNode, aimPath)[0]}>
              {statusOf(hoverNode, aimPath)[1]}
            </small>
          </div>
        )}
      </div>

      <aside className="pfp-panel pt-panel" aria-label="Perk details">
        <div className="pt-points">
          <div>
            <b>{left}</b>
            <span>Perk Points left</span>
          </div>
          <small>
            {earned} earned, {spent} spent. Points come from your player level, which grows while the app is running.
          </small>
          {/* Placeholder readout: where the level and XP bar live is still to be designed. */}
          <small>
            {player.level >= MAX_LEVEL
              ? `Level ${player.level}, the top level.`
              : `Level ${player.level}, ${Math.floor(levelProgress(player) * 100)}% to level ${player.level + 1} (${xpLabel(xpToNext(player.level) - player.xp)} XP to go). ${
                  pointsPerLevelAt(player.level + 1) > 0 ? `The next level gives ${pointsPerLevelAt(player.level + 1)} points.` : `No more points after level ${LAST_POINT_LEVEL}.`
                }`}
          </small>
          {paused > 0 && <small className="pt-warn">Your newest {plural(paused, "node is", "nodes are")} paused until you earn the points back.</small>}
        </div>

        <div className="pt-block">
          <h4 className="pfp-sub">
            Starting classes <span>{state.starts.length} of {MAX_STARTS}</span>
          </h4>
          {state.starts.length > 0 && (
            <div className="pt-chips">
              {state.starts.map((id) => {
                const c = regionById(id);
                return (
                  <span key={id} className="pt-chip" style={{ "--rc0": c.color } as CSSProperties}>
                    <i aria-hidden="true" />
                    {c.name} <small>{c.focus}</small>
                  </span>
                );
              })}
            </div>
          )}
          <p className="pt-note">
            {state.starts.length < MAX_STARTS
              ? `Your first ${MAX_STARTS} paths out of Station Core choose them. After that the core's other links close, and other classes are reached over the Bridges further out.`
              : "The core's other links are closed. Reach other classes over the Bridges further out. The monthly reset frees your starting classes."}
          </p>
        </div>

        <div className="pt-block">
          <h4 className="pfp-sub">
            Your slots{" "}
            <span>
              {pentagonsHeld(state)}/{MAX_PENTAGONS} pentagons · {squaresHeld(state)}/{MAX_SQUARES} squares
            </span>
          </h4>
          <SlotBoard taken={state.taken} onPick={goTo} />
          <p className="pt-note">
            Free to take, but you hold {MAX_PENTAGONS} pentagons and {MAX_SQUARES} squares at most. A Season Key uses a square slot.
          </p>
        </div>

        {pickedNode ? (
          <div className="pt-detail" style={{ "--rc0": regionById(pickedNode.region).color } as CSSProperties}>
            <h3>{pickedNode.name}</h3>
            <span className="pt-meta">
              <i aria-hidden="true" />
              {pickedNode.region === "core" ? "Station Core" : `${regionById(pickedNode.region).name} (${regionById(pickedNode.region).focus})`} · {TYPE_NAME[pickedNode.type]}
            </span>
            <p>
              <EffectText text={pickedNode.effect} />
            </p>
            {pickedNode.passive && (
              <p className="pt-passive">
                <b>Passive:</b> {pickedNode.passive}
              </p>
            )}
            {pickedNode.id !== START_ID && (
              <dl className="pfp-list">
                <div>
                  <dt>Cost</dt>
                  <dd>{isPentagon(pickedNode) ? `Free (uses 1 of ${MAX_PENTAGONS} pentagon slots)` : isSquare(pickedNode) ? `Free (uses 1 of ${MAX_SQUARES} square slots)` : plural(pickedNode.cost, "point")}</dd>
                </div>
                <div>
                  <dt>Pays out</dt>
                  <dd>{PAYS[pickedNode.earnedBy] ?? pickedNode.earnedBy}</dd>
                </div>
              </dl>
            )}
            {!isLive(pickedNode) && (
              <p className="pt-later">
                {isSquare(pickedNode) || isPentagon(pickedNode)
                  ? `Not active yet. This feature comes in a later update, so taking it now only uses a ${isPentagon(pickedNode) ? "pentagon" : "square"} slot.`
                  : "Not active yet. This effect comes in a later update; taking it now still opens the way past it."}
              </p>
            )}
            {!extraLive(pickedNode) && <p className="pt-later">Opening levels 46 to 60 works now; its extra comes in a later update.</p>}
            <p className="pt-state pt-st" data-kind={statusOf(pickedNode, pickedPath)[0]}>
              {statusOf(pickedNode, pickedPath)[1]}
              {statusOf(pickedNode, pickedPath)[0] === "ok" && <small>Click it again on the tree to take it.</small>}
            </p>
          </div>
        ) : (
          <div className="pt-detail pt-empty">
            <h3>Pick a node</h3>
            <p>Click any node on the tree to see what it does and the path to it. Click it again to take it, with every node on the way.</p>
          </div>
        )}

        <h4 className="pfp-sub">In effect now</h4>
        <dl className="pfp-list">
          {liveRows(effects).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          {waiting > 0 && (
            <div className="pt-waiting">
              <dt>Taken, not active yet</dt>
              <dd>{plural(waiting, "node")}</dd>
            </div>
          )}
        </dl>

        <details className="pt-key">
          <summary>Reading the tree</summary>
          <ul>
            <li>
              <svg viewBox="-13 -13 26 26" aria-hidden="true">
                <circle r="5" />
              </svg>
              Small node: a small bonus. 1 point.
            </li>
            <li>
              <svg viewBox="-13 -13 26 26" aria-hidden="true">
                <circle r="8" />
              </svg>
              Notable: a named, bigger bonus. 2 points.
            </li>
            <li>
              <svg viewBox="-13 -13 26 26" aria-hidden="true">
                <polygon points={diamond(8)} />
              </svg>
              Square (a diamond): free, but you hold {MAX_SQUARES} at most. Each class has a Season Key (opens Pass levels 46 to 60, plus its own extra; you can hold only one Key) and eleven Specials.
            </li>
            <li>
              <svg viewBox="-13 -13 26 26" aria-hidden="true">
                <polygon points={pentagon(8.5)} />
              </svg>
              Pentagon: free, but you hold {MAX_PENTAGONS} at most. Each class has five, one beside each grand keystone.
            </li>
            <li>
              <svg viewBox="-13 -13 26 26" aria-hidden="true">
                <circle r="9" />
                <circle r="12" className="dash" />
              </svg>
              Keystone: changes a rule, with a cost. 3 points.
            </li>
            <li>
              <svg viewBox="-13 -13 26 26" aria-hidden="true">
                <circle r="5" className="dim" />
              </svg>
              Faded: not active yet, coming in a later update.
            </li>
          </ul>
          <p>
            {CLASSES.length} classes, {NODES.length.toLocaleString()} nodes. Each class's first node links to Station Core ({Object.keys(CORE_LINK).length} links).
          </p>
        </details>

        <button type="button" className="eb-btn pt-reset" disabled={!canReset(state, now)} onClick={() => reset() && toast("Perks reset. Every point and both starting classes are back.")}>
          <RotateCcw aria-hidden="true" strokeWidth={1.6} />
          {state.taken.length === 0 ? "Nothing to reset" : canReset(state, now) ? "Reset all perks (free, once a month)" : "Reset used this month"}
        </button>
      </aside>
    </>
  );
}
