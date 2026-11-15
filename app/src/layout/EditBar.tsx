import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";

interface Props {
  customised: boolean;
  hasSavedDefault: boolean;
  onSaveDefault: () => void;
  onClearDefault: () => void;
  onReset: () => void;
  onDone: () => void;
  onCards: () => void;
  cardsOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** The active named layout, if any, shown on the Layouts button. */
  layoutName?: string;
  layoutsOpen: boolean;
  onLayouts: () => void;
}

/** Shown while editing the layout. Reset asks for a second click before it throws a layout away. */
export function EditBar({ customised, hasSavedDefault, onSaveDefault, onClearDefault, onReset, onDone, onCards, cardsOpen, canUndo, canRedo, onUndo, onRedo, layoutName, layoutsOpen, onLayouts }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number>();
  const savedTimer = useRef<number>();
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(savedTimer.current);
    },
    [],
  );

  return (
    <div className="editbar" role="region" aria-label="Layout editing">
      <p>
        <b>Editing layout.</b> Drag a card to move it, any edge or corner to resize it, × to remove it. Click a card and use the arrow keys to nudge it (Shift to resize).
      </p>
      <button className="eb-btn eb-icon" disabled={!canUndo} onClick={onUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
        <Icon name="undo" small />
      </button>
      <button className="eb-btn eb-icon" disabled={!canRedo} onClick={onRedo} aria-label="Redo" title="Redo (Ctrl+Y)">
        <Icon name="redo" small />
      </button>
      <button className={`eb-btn${layoutsOpen ? " primary" : ""}`} onClick={onLayouts} title="Save, switch, share and import layouts">
        {layoutName ? `Layout: ${layoutName}` : "Layouts"}
      </button>
      <button className={`eb-btn${cardsOpen ? " primary" : ""}`} onClick={onCards} title="Open the list of cards and drag them onto the dashboard">
        Add cards
      </button>
      <button
        className="eb-btn"
        disabled={!customised && !saved}
        title="Makes this arrangement the one Reset layout returns to"
        onClick={() => {
          onSaveDefault();
          setSaved(true);
          window.clearTimeout(savedTimer.current);
          savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
        }}
      >
        {saved ? "Saved as default" : "Save as default"}
      </button>
      {hasSavedDefault && (
        <button className="eb-btn" title="Forget your saved default and use the original layout" onClick={onClearDefault}>
          Original layout
        </button>
      )}
      <button
        className="eb-btn"
        disabled={!customised}
        title={customised ? undefined : "The layout is already the default"}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            timer.current = window.setTimeout(() => setConfirming(false), 3000);
            return;
          }
          window.clearTimeout(timer.current);
          setConfirming(false);
          onReset();
        }}
      >
        {confirming ? "Click again to reset" : "Reset layout"}
      </button>
      <button className="eb-btn primary" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
