import { useState, type ReactNode } from "react";
import { Responsive, WidthProvider, type Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { CARD_MIME, dragging } from "./dragCard";
import { BREAKPOINTS, CARDS, COLS, MARGIN, ROW_HEIGHT, type CardDef, type CardId, type CardInstance } from "./layouts";

const Grid = WidthProvider(Responsive);

interface Props {
  editing: boolean;
  layouts: Layouts;
  onLayouts: (next: Layouts) => void;
  onBreakpoint: (bp: string) => void;
  /** Cards on the dashboard, in order. */
  instances: CardInstance[];
  render: (inst: CardInstance) => ReactNode;
  onRemove: (id: string) => void;
  onLook: (id: string, look: string) => void;
  /** A card was dragged in from the Cards list and dropped at `at`. */
  onDropCard: (type: CardId, at: { x: number; y: number }, bp: "lg" | "md") => void;
}

/**
 * The card grid. Outside edit mode it is fixed, so clicks always reach the
 * cards. In edit mode every card can be dragged by any part of it, resized
 * from its bottom-right corner, or removed with its close button, and new cards
 * can be dragged in from the Cards list. The phone layout is a single fixed column.
 */
export function Dashboard({ editing, layouts, onLayouts, onBreakpoint, instances, render, onRemove, onLook, onDropCard }: Props) {
  const [bp, setBp] = useState("lg");
  const canEdit = editing && bp !== "sm";
  return (
    <Grid
      className={`layout${canEdit ? " editing" : ""}`}
      layouts={layouts}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={ROW_HEIGHT}
      margin={MARGIN}
      containerPadding={[0, 0]}
      compactType="vertical"
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
      resizeHandles={["se"]}
      draggableCancel=".cell-x,.cell-look"
      onBreakpointChange={(next) => {
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
          <div key={inst.id} className="cell" data-card={inst.type} aria-label={canEdit ? `${def.name}, drag to move` : undefined}>
            {render(inst)}
            {canEdit && <span className="cell-name">{def.name}</span>}
            {canEdit && def.looks && (
              <select className="cell-look" aria-label={`Look of ${def.name}`} value={inst.look} onChange={(e) => onLook(inst.id, e.target.value)}>
                {def.looks.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            )}
            {canEdit && (
              <button className="cell-x" aria-label={`Remove ${def.name}`} title="Remove this card" onClick={() => onRemove(inst.id)}>
                ×
              </button>
            )}
          </div>
        );
      })}
    </Grid>
  );
}
