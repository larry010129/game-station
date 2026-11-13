import { useEffect, useRef, useState } from "react";
import { TINTS, prepareImage, type Theme } from "../state/useTheme";

interface Props {
  theme: Theme;
  image: string | null;
  imageSaved: boolean;
  onTint: (hex: string | null) => void;
  onDim: (v: number) => void;
  onImage: (data: string | null) => void;
  onReset: () => void;
  onClose: () => void;
  /** Drawn on the Vault page instead of as a floating panel. */
  embedded?: boolean;
}

/** Card colour and background picture. Opens from the palette button in the top bar. */
export function ThemePanel({ theme, image, imageSaved, onTint, onDim, onImage, onReset, onClose, embedded }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const picking = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const isPreset = TINTS.some((t) => t.hex === theme.tint);

  useEffect(() => {
    if (embedded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      // File / colour dialogs steal focus; ignore the click that comes back after they close.
      if (picking.current) return;
      const el = e.target as HTMLElement;
      if (box.current && !box.current.contains(el) && !el.closest("[data-theme-toggle]")) onClose();
    };
    const onFocus = () => {
      // Hold the guard briefly so the click that reactivates the window does not close the panel.
      window.setTimeout(() => {
        picking.current = false;
      }, 300);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("focus", onFocus);
    };
  }, [embedded, onClose]);

  const take = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      onImage(await prepareImage(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not use that picture.");
    } finally {
      setBusy(false);
      picking.current = false;
    }
  };

  return (
    <div className={embedded ? "theme embedded" : "theme"} ref={box} role={embedded ? "group" : "dialog"} aria-label="Appearance">
      <section>
        <h3>Card colour</h3>
        <p className="hint">Changes the colour of every card. The card style stays the same.</p>
        <div className="swatches" role="radiogroup" aria-label="Card colour">
          {TINTS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={theme.tint === t.hex}
              aria-label={t.name}
              title={t.name}
              className={`sw${t.hex ? "" : " base"}`}
              style={t.hex ? { background: t.hex } : undefined}
              onClick={() => onTint(t.hex)}
            />
          ))}
          <label
            className={`sw custom${!isPreset && theme.tint ? " on" : ""}`}
            title="Pick any colour"
            onPointerDown={() => {
              picking.current = true;
            }}
          >
            <input
              type="color"
              aria-label="Custom card colour"
              value={theme.tint ?? "#5b7db1"}
              onChange={(e) => onTint(e.target.value)}
              onBlur={() => {
                picking.current = false;
              }}
            />
            <span aria-hidden="true">+</span>
          </label>
        </div>
      </section>

      <section>
        <h3>Background picture</h3>
        <div
          className={`drop${dragOver ? " over" : ""}${image ? " filled" : ""}`}
          style={image ? { backgroundImage: `url(${image})` } : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void take(e.dataTransfer.files[0]);
          }}
        >
          {/* Label → file input: more reliable than a programmatic click() in WebView2. */}
          <label
            className={`pill-btn${busy ? " busy" : ""}`}
            onPointerDown={() => {
              picking.current = true;
            }}
          >
            {busy ? "Preparing…" : image ? "Change picture" : "Upload a picture"}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => {
                void take(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {!image && <small>or drop one here</small>}
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        {image && !imageSaved && <p className="err">Too big to remember after a restart. It shows until you close the app.</p>}
        {image && (
          <>
            <label className="range">
              <span>Darken</span>
              <input type="range" min={0} max={80} step={5} value={theme.dim} onChange={(e) => onDim(Number(e.target.value))} aria-label="Darken the background picture" />
              <output>{theme.dim}%</output>
            </label>
            <button type="button" className="link" onClick={() => onImage(null)}>
              Remove picture
            </button>
          </>
        )}
      </section>

      <button type="button" className="link reset" onClick={onReset}>
        Reset appearance
      </button>
    </div>
  );
}
