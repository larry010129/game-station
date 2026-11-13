import { useEffect, useRef, useState } from "react";
import { prepareImage } from "../state/useTheme";

interface Props {
  image: string | null;
  imageSaved: boolean;
  dim: number;
  onDim: (v: number) => void;
  onImage: (data: string | null) => void;
  onReset: () => void;
  onClose: () => void;
  /** Drawn on a page instead of as a floating panel. */
  embedded?: boolean;
}

/** Background picture behind the station. Colour lives on the Themes page. */
export function ThemePanel({ image, imageSaved, dim, onDim, onImage, onReset, onClose, embedded }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const picking = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (embedded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      if (picking.current) return;
      const el = e.target as HTMLElement;
      if (box.current && !box.current.contains(el) && !el.closest("[data-theme-toggle]")) onClose();
    };
    const onFocus = () => {
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
    <div className={embedded ? "theme embedded" : "theme"} ref={box} role={embedded ? "group" : "dialog"} aria-label="Wallpaper">
      <section>
        <div className="theme-copy">
          <h3>Background</h3>
          <p className="hint">Picture behind the station, on this PC.</p>
        </div>
        <div className="theme-control">
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
          {image && !imageSaved && <p className="err">This PC would not keep the picture. It shows until you close the app.</p>}
          {image && (
            <>
              <label className="range">
                <span>Darken</span>
                <input type="range" min={0} max={80} step={5} value={dim} onChange={(e) => onDim(Number(e.target.value))} aria-label="Darken the background picture" />
                <output>{dim}%</output>
              </label>
              <button type="button" className="link" onClick={() => onImage(null)}>
                Remove picture
              </button>
            </>
          )}
        </div>
      </section>

      <div className="theme-actions">
        <button type="button" className="link reset" onClick={onReset}>
          Reset appearance
        </button>
      </div>
    </div>
  );
}
