import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Icon } from "../components/Icon";
import { StationSelect, type StationOption } from "../components/StationSelect";
import { clampRatio, type Pane } from "./split";

type Axis = "cols" | "rows";
const STEP = 0.02;

/** A draggable divider. Drag, or focus it and use the arrow keys; double-click puts it back in the middle. */
function Handle({ axis, value, grid, style, onCommit }: { axis: Axis; value: number; grid: RefObject<HTMLDivElement>; style: CSSProperties; onCommit: (v: number) => void }) {
  const live = useRef<number | null>(null);
  const horizontal = axis === "rows";
  // Dragging moves the grid's own tracks, so the panes are not re-rendered on every pointer move.
  const paint = (v: number) => {
    grid.current?.style.setProperty(`--${axis}-a`, `${v}fr`);
    grid.current?.style.setProperty(`--${axis}-b`, `${1 - v}fr`);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = grid.current?.getBoundingClientRect();
    if (!box || live.current == null) return;
    live.current = clampRatio(horizontal ? (e.clientY - box.top) / box.height : (e.clientX - box.left) / box.width);
    paint(live.current);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = horizontal ? { ArrowUp: -1, ArrowDown: 1 }[e.key] : { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    onCommit(value + dir * STEP);
  };
  return (
    <div
      className={`split-handle ${horizontal ? "h" : "v"}`}
      role="separator"
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      aria-label={horizontal ? "Resize panes up and down" : "Resize panes left and right"}
      aria-valuemin={25}
      aria-valuemax={75}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      style={style}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        live.current = value;
        e.currentTarget.dataset.drag = "";
      }}
      onPointerMove={onMove}
      onPointerUp={(e) => {
        delete e.currentTarget.dataset.drag;
        if (live.current != null) onCommit(live.current);
        live.current = null;
      }}
      onPointerCancel={(e) => {
        delete e.currentTarget.dataset.drag;
        paint(value);
        live.current = null;
      }}
      onDoubleClick={() => onCommit(0.5)}
      onKeyDown={onKey}
    />
  );
}

/** Where pane `i` of `n` sits in the 3 x 3 track grid (panes on 1 and 3, dividers on 2). */
function place(i: number, n: number): CSSProperties {
  if (n === 3 && i === 0) return { gridColumn: 1, gridRow: "1 / -1" };
  const right = n === 2 ? i === 1 : i % 2 === 1;
  const bottom = n === 2 ? false : n === 3 ? i === 2 : i >= 2;
  return { gridColumn: right ? 3 : 1, gridRow: bottom ? 3 : 1 };
}

interface Props {
  panes: Pane[];
  active: number;
  cols: number;
  rows: number;
  /** The pages a pane can show. */
  options: StationOption[];
  onFocus: (id: number) => void;
  onClose: (id: number) => void;
  onTab: (id: number, tab: string) => void;
  onResize: (axis: Axis, value: number) => void;
  render: (pane: Pane) => ReactNode;
}

/** Two to four panes in one window. Each has its own page picker and scroll; the focused one takes the top bar's tabs. */
export function SplitView({ panes, active, cols, rows, options, onFocus, onClose, onTab, onResize, render }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const n = panes.length;
  const stacked = n > 2;
  const style = {
    "--cols-a": `${cols}fr`,
    "--cols-b": `${1 - cols}fr`,
    "--rows-a": `${rows}fr`,
    "--rows-b": `${1 - rows}fr`,
  } as CSSProperties;
  return (
    <div ref={grid} className={`split${stacked ? " stacked" : ""}`} style={style}>
      {panes.map((p, i) => (
        <section
          key={p.id}
          className={`pane${p.id === active ? " on" : ""}`}
          style={place(i, n)}
          aria-label={`Pane ${i + 1}`}
          onPointerDownCapture={() => onFocus(p.id)}
          onFocusCapture={() => onFocus(p.id)}
        >
          <header className="pane-top">
            <StationSelect variant="compact" label={`Page shown in pane ${i + 1}`} value={p.tab} options={options} onChange={(tab) => onTab(p.id, tab)} />
            <button className="pane-x" type="button" aria-label={`Close pane ${i + 1}`} title="Close this pane" onClick={() => onClose(p.id)}>
              <Icon name="close" small />
            </button>
          </header>
          <div className="pane-body" key={p.tab}>
            {render(p)}
          </div>
        </section>
      ))}
      <Handle axis="cols" value={cols} grid={grid} style={{ gridColumn: 2, gridRow: "1 / -1" }} onCommit={(v) => onResize("cols", v)} />
      {stacked && <Handle axis="rows" value={rows} grid={grid} style={n === 3 ? { gridColumn: 3, gridRow: 2 } : { gridColumn: "1 / -1", gridRow: 2 }} onCommit={(v) => onResize("rows", v)} />}
    </div>
  );
}
