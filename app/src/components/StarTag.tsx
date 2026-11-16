import type { DrawResult } from "../state/gachaEngine";

/**
 * Theme rarity. 5★ is a rainbow look: a company look (Brand or Region) or a rainbow Regular theme; 4★ is a standard
 * Regular theme (the gold badge).
 * A look counts by the row it dropped from, so a Brand look added back to the Regular pool is 4★ when drawn there.
 */
export type Stars = 4 | 5;

export function starsOf(r: DrawResult): Stars | null {
  return r.kind === "look" ? (r.brand || r.rainbow ? 5 : 4) : null;
}

/** A small rarity tag: rainbow for 5★, gold for 4★. */
export function StarTag({ stars, className = "" }: { stars: Stars; className?: string }) {
  return (
    <span className={`star-tag ${className}`.trim()} data-stars={stars} aria-label={`${stars} star`}>
      {stars}
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 .9 7.5 4.1l3.5.4-2.6 2.4.7 3.5L6 8.7 2.9 10.4l.7-3.5L1 4.5l3.5-.4Z" />
      </svg>
    </span>
  );
}
