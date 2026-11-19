import { CURRENCY_ART, type CurrencyArt } from "./currencyArt";

/**
 * A shaded currency icon: the Draw Ticket (a pass on a lanyard) or the fragment (two floppy disks).
 * Regular is silver and Special is the 5-star rainbow; the tones are set by `.cur-ic[data-tier]` in app.css.
 * The drawing is a fixed string from currencyArt.ts, never user input, so it is set as markup directly.
 */
export function CurrencyIcon({ art, className }: { art: CurrencyArt; className?: string }) {
  const tier = art.endsWith("special") ? "special" : "regular";
  return (
    <svg
      className={`cur-ic${className ? ` ${className}` : ""}`}
      data-tier={tier}
      viewBox="0 0 48 48"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: CURRENCY_ART[art] }}
    />
  );
}

/** The fragment a repeat pays out: Regular (silver) or Special (rainbow). */
export function FragmentMark({ kind, className = "warp-mark" }: { kind: "regular" | "special"; className?: string }) {
  return <CurrencyIcon art={`fragment-${kind}`} className={className} />;
}
