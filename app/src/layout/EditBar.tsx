import { useEffect, useRef, useState } from "react";

interface Props {
  customised: boolean;
  hasSavedDefault: boolean;
  onSaveDefault: () => void;
  onClearDefault: () => void;
  onReset: () => void;
  onDone: () => void;
  onCards: () => void;
  cardsOpen: boolean;
}

/** Shown while editing the layout. Reset asks for a second click before it throws a layout away. */
export function EditBar({ customised, hasSavedDefault, onSaveDefault, onClearDefault, onReset, onDone, onCards, cardsOpen }: Props) {
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
        <b>Editing layout.</b> Drag a card to move it, its corner to resize it, × to remove it. Open Add cards to drag in more, even copies.
      </p>
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
