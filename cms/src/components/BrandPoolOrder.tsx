import { useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Shuffle, Undo2 } from "lucide-react";
import type { CmsTheme } from "../types/draft";
import { Button } from "../ui/primitives";
import { cn } from "@/lib/utils";

/** Fisher-Yates on a copy. */
function shuffled<T>(list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Row({
  id,
  index,
  total,
  theme,
  onMove,
}: {
  id: string;
  index: number;
  total: number;
  theme: CmsTheme | undefined;
  onMove: (from: number, to: number) => void;
}) {
  const controls = useDragControls();
  const p = theme?.palette;
  const name = theme?.name ?? `${id} (missing theme)`;

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.015, zIndex: 10 }}
      transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.7 }}
      className="relative flex list-none items-center gap-3 rounded-md border border-border/60 bg-card px-2.5 py-2 text-sm data-[dragging=true]:border-primary/50"
    >
      <button
        type="button"
        aria-label={`Move ${name}. Position ${index + 1} of ${total}. Use the up and down arrow keys, or drag.`}
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" && index > 0) {
            e.preventDefault();
            onMove(index, index - 1);
          } else if (e.key === "ArrowDown" && index < total - 1) {
            e.preventDefault();
            onMove(index, index + 1);
          }
        }}
        className="-my-1 grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded text-muted outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted">{index + 1}</span>
      <span
        aria-hidden
        className="grid h-5 w-8 shrink-0 place-items-center rounded border border-border"
        style={{ background: p?.bg ?? "transparent" }}
      >
        <span className="size-2 rounded-full" style={{ background: p?.accent ?? "var(--cms-muted)" }} />
      </span>
      <span className={cn("min-w-0 flex-1 truncate", theme ? "text-foreground" : "text-destructive-foreground")}>{name}</span>
      <span className="hidden shrink-0 font-mono text-xs text-muted sm:inline">{id}</span>
    </Reorder.Item>
  );
}

/**
 * The Brand pool as a list you reorder by dragging a row's handle (or with the arrow keys on the handle),
 * plus a Shuffle button that mixes the whole order, with Undo for the last shuffle.
 */
export function BrandPoolOrder({
  ids,
  themes,
  onChange,
}: {
  ids: string[];
  themes: CmsTheme[];
  onChange: (next: string[]) => void;
}) {
  const [before, setBefore] = useState<string[] | null>(null);
  const [note, setNote] = useState("");
  const byId = new Map(themes.map((t) => [t.id, t]));

  const move = (from: number, to: number) => {
    const next = ids.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setBefore(null);
    setNote(`${byId.get(item)?.name ?? item} moved to position ${to + 1} of ${ids.length}.`);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setBefore(ids);
            setNote("Order shuffled.");
            onChange(shuffled(ids));
          }}
          disabled={ids.length < 2}
        >
          <Shuffle className="mr-1.5 size-4" aria-hidden />
          Shuffle
        </Button>
        {before ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onChange(before);
              setBefore(null);
              setNote("Previous order restored.");
            }}
          >
            <Undo2 className="mr-1.5 size-4" aria-hidden />
            Undo shuffle
          </Button>
        ) : null}
        <p className="text-xs text-muted" role="status">
          {note || "Drag a handle to reorder."}
        </p>
      </div>

      <Reorder.Group
        axis="y"
        values={ids}
        onReorder={onChange}
        className="m-0 flex max-h-[28rem] list-none flex-col gap-1.5 overflow-y-auto p-0 pr-1"
      >
        {ids.map((id, index) => (
          <Row key={id} id={id} index={index} total={ids.length} theme={byId.get(id)} onMove={move} />
        ))}
      </Reorder.Group>
    </div>
  );
}
