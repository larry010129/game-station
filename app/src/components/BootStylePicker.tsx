import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC } from "react";
import { createPortal } from "react-dom";
import { BootScreen, PlainStage, headline } from "../boot/BootScreen";
import { STYLE_STAGES, type StageProps } from "../boot/BootStyleStages";
import { BOOT_STYLES, equipBootStyle, useBootStyles, type BootStyleId } from "../boot/bootStyles";
import { sampleBootState, useScriptedBoot } from "../boot/scriptedBoot";

/**
 * Boot screens on the Themes page. Each style is a one-time item (boot-01 to boot-12) won from the packs or the season
 * pass; the plain screen is free. Picking one sets the start-up screen for the next launch, and Preview plays it now.
 */
export function BootStylePicker({ image, onOpenDraw }: { image?: string | null; onOpenDraw: () => void }) {
  const { equipped, usable } = useBootStyles();
  const [preview, setPreview] = useState<BootStyleId | "plain" | null>(null);
  const mine = BOOT_STYLES.filter((s) => usable.includes(s.id));
  const locked = BOOT_STYLES.filter((s) => !usable.includes(s.id));

  return (
    <section className="theme-section boot-picker" aria-labelledby="themes-boot">
      <h3 id="themes-boot" className="theme-section-title">
        Boot screens <span>{mine.length} of {BOOT_STYLES.length}</span>
      </h3>
      <p className="hint">The screen the station shows while it starts. Win styles in the packs or the season pass; your pick shows from the next launch.</p>

      <div className="boot-grid" role="radiogroup" aria-label="Boot screen">
        <BootOption id={null} name="Plain" blurb="The standard start-up screen." checked={equipped === null} onPick={() => equipBootStyle(null)} onPreview={() => setPreview("plain")} />
        {mine.map((s) => (
          <BootOption key={s.id} id={s.id} name={s.name} blurb={s.blurb} checked={equipped === s.id} onPick={() => equipBootStyle(s.id)} onPreview={() => setPreview(s.id)} />
        ))}
      </div>

      {locked.length > 0 ? (
        <>
          <h4 className="skin-locked-title">Locked</h4>
          <div className="boot-grid">
            {locked.map((s) => (
              <div key={s.id} className="boot-option boot-option-locked">
                <BootThumb id={s.id} />
                <span className="boot-option-name">
                  {s.name}
                  <span className="boot-option-num">{packName(s.id)}</span>
                </span>
                <small>
                  <span>{s.blurb}</span>
                  <button type="button" className="link skin-draw" onClick={onOpenDraw}>
                    Draw only
                  </button>
                </small>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {preview ? <BootPreview style={preview === "plain" ? null : preview} image={image} onDone={() => setPreview(null)} /> : null}
    </section>
  );
}

function BootOption({
  id,
  name,
  blurb,
  checked,
  onPick,
  onPreview,
}: {
  id: BootStyleId | null;
  name: string;
  blurb: string;
  checked: boolean;
  onPick: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="boot-option">
      <button type="button" role="radio" aria-checked={checked} className="boot-option-pick" onClick={onPick}>
        <BootThumb id={id} />
        <span className="boot-option-name">
          {name}
          {id ? <span className="boot-option-num">{packName(id)}</span> : null}
          {checked ? <em>In use</em> : null}
        </span>
      </button>
      <small>
        <span>{blurb}</span>
        <button type="button" className="link" onClick={onPreview} aria-label={`Preview ${name}`}>
          Preview
        </button>
      </small>
    </div>
  );
}

/** The name packs and draw results use for this item ("Boot 7"), so the two can be matched up. */
const packName = (id: BootStyleId) => `Boot ${Number(id.slice(5))}`;

const THUMB_W = 1120;

/** The real stage at a quarter size, frozen two thirds of the way through a boot. */
function BootThumb({ id }: { id: BootStyleId | null }) {
  const props = useMemo<StageProps>(() => {
    const state = sampleBootState();
    return { state, pct: Math.round(state.progress * 100), line: headline(state), failed: false, leaving: false, noSignal: false, chip: "Working" };
  }, []);
  const Stage: FC<StageProps> = id ? STYLE_STAGES[id] : PlainStage;
  // The stage is laid out at a desktop size, then scaled to the thumbnail's width.
  const box = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / THUMB_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <span ref={box} className="boot-thumb" style={{ "--thumb-s": scale } as CSSProperties} data-boot-style={id ?? undefined} aria-hidden="true" {...{ inert: "" }}>
      <span className="boot-thumb-canvas">
        <span className="boot-work">
          <span className="boot-work-veil" />
          <Stage {...props} />
        </span>
      </span>
    </span>
  );
}

/** Plays a style over the whole window on the scripted timeline; Esc or Skip closes it early. */
function BootPreview({ style, image, onDone }: { style: BootStyleId | null; image?: string | null; onDone: () => void }) {
  const state = useScriptedBoot();
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onDone]);
  return createPortal(
    <>
      <BootScreen state={state} style={style} image={image} onExited={onDone} />
      <button type="button" className="pill-btn boot-preview-skip" onClick={onDone} autoFocus>
        Skip preview
      </button>
    </>,
    document.body,
  );
}
