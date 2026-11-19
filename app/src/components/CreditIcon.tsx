import { useId, useMemo } from "react";
import { isBigCreditGain } from "../state/gachaContent";
import { formatCredits } from "../state/stationCredits";
import { CREDIT_ART, type CreditArt } from "./creditArt";

/** Which drawing a Credits amount gets: the coins, or the cash bundle for one gain above the CMS amount. */
export function creditArtFor(gain?: number): CreditArt {
  return gain !== undefined && isBigCreditGain(gain) ? "cash" : "coins";
}

/**
 * The Credits icon, shaded like the other currency icons (`.cur-ic` in app.css) and coloured by the theme accent.
 * A balance or a price leaves `gain` out and always shows the coins. A reward passes the amount it pays as `gain`:
 * one gain above the CMS "big amount" shows the cash bundle instead.
 * The drawing is a fixed string from creditArt.ts, never user input, so it is set as markup directly.
 */
export function CreditIcon({ gain, className = "warp-mark" }: { gain?: number; className?: string }) {
  const art = creditArtFor(gain);
  // Each icon gets its own clip ids, so one hidden icon can never break the clipping of another.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const markup = useMemo(() => CREDIT_ART[art].split("CLIP").join(`cr${uid}-`), [art, uid]);
  return (
    <svg
      className={`cur-ic${className ? ` ${className}` : ""}`}
      data-tier="credit"
      data-art={art}
      viewBox="0 0 48 48"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/**
 * A balance with its icon, such as "200 Income". The icon scales with the text it sits in.
 * `bare` leaves the currency name out, for a tight spot that already says what the number is.
 */
export function CreditBalance({ amount, bare = false }: { amount: number; bare?: boolean }) {
  return (
    <span className="credit-amt">
      <CreditIcon className="" />
      {bare ? amount : formatCredits(amount)}
    </span>
  );
}
