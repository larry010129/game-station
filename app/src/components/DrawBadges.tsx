import type { CSSProperties } from "react";
import { crystalKindFor, crystalValueFor, isRainbowResult, itemById, itemLabel, type DrawResult, type PackId } from "../state/gachaEngine";
import type { ThemeDef } from "../state/palette";
import { Easing, interpolate, progress } from "../lib/timeline";
import { StarTag, starsOf } from "./StarTag";

/**
 * The draw, in three beats on one clock `t` (ms):
 * 1. a rarity tease: a burst whose colour hints at the best result in the draw;
 * 2. the badges drop into the spread face down: a company look's back is rainbow, every other back is one colour;
 * 3. the player turns each one over: tap a badge, Reveal all, or Skip. The page owns when each was turned (`flipAt`).
 */
export const TEASE_MS = 1100;
const DROP_GAP = 90;
const DROP_MS = 420;
export const FLIP_MS = 640;
/** Gap between badges when Reveal all turns them over in turn. */
export const REVEAL_GAP = 240;

/** When badge `i` has landed in the spread and can be turned over. */
export const landedAt = (i: number) => TEASE_MS + i * DROP_GAP + DROP_MS;

/**
 * Rarity is only told apart for rainbow (5-star) looks: a company (Brand or Region) look or a rainbow Regular theme.
 * Their back is rainbow. Every other result shares one back colour, so a face-down badge says "rainbow" or nothing.
 * (The tier keeps its old name, "company", in data attributes and CSS.)
 */
export type Rarity = "common" | "company";

export function rarityOf(r: DrawResult): Rarity {
  return isRainbowResult(r) ? "company" : "common";
}

/** The best rarity in a draw; the tease is rainbow when any badge is a company look. */
export function bestRarity(results: readonly DrawResult[]): Rarity {
  return results.some((r) => rarityOf(r) === "company") ? "company" : "common";
}

/**
 * What a face-up badge's colour says: every item, pick and repeat is one colour, every Regular theme another,
 * and a rainbow look (company or rainbow Regular theme) is rainbow.
 */
export type FrontKind = "item" | "theme" | "company";

export function frontOf(r: DrawResult): FrontKind {
  if (r.kind === "look") return isRainbowResult(r) ? "company" : "theme";
  return "item";
}

/** What clicking a face-up badge does: a look opens its card, an alert sound plays, anything else does nothing. */
export function previewKind(r: DrawResult): "card" | "sound" | null {
  if (r.kind === "look") return "card";
  if (r.kind === "item" && itemById(r.id)?.kind === "alert-sound") return "sound";
  return null;
}

/** Badges that are a first company look; each plays its logo moment once it is face up. */
export function brandHolds(results: readonly DrawResult[]): number[] {
  return results.flatMap((r, i) => (r.kind === "look" && r.brand && !r.repeat ? [i] : []));
}

/** Each badge in a spread rests at a slight tilt, as if laid down by hand (a single badge stays straight). */
const REST_Z = [-1.6, 1.2, -2, 1.5, -1, 1.8, -1.3, 2];
const REST_Y = [9, -10, 7, -8, 10, -7, 8, -9];
const DROPS = [6, 20, 0, 13, 22, 4, 16, 9];
const tiltOf = (i: number, count: number) => (count === 1 ? 0 : REST_Z[i % REST_Z.length]);

const outBack = (x: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  const u = Math.min(1, Math.max(0, x)) - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};

// ---------------------------------------------------------------- badge faces
function tileClass(result: DrawResult): string {
  if (result.kind === "look") return isRainbowResult(result) ? "gs-tile brand" : "gs-tile";
  if (result.kind === "pick") return "gs-tile pick";
  if (result.repeat) return "gs-tile crystal";
  const def = itemById(result.id);
  return def?.tier === "better" || def?.tier === "brand" ? "gs-tile item better" : "gs-tile item";
}

function Tile({ result, look }: { result: DrawResult; look?: ThemeDef }) {
  // A repeat, look or item, pays out a crystal (a prism in the Brand Pack): show it.
  if (result.kind !== "pick" && result.repeat) {
    return (
      <div className="gs-tile crystal" data-crystal={crystalKindFor(result)}>
        <svg viewBox="0 0 48 54" width="40" height="45" aria-hidden="true">
          <path d="M24 2 43 14v26L24 52 5 40V14z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M5 14 24 26 43 14M24 26v26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M24 2 13 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55" strokeLinecap="round" />
        </svg>
        <b>+{crystalValueFor(result)}</b>
      </div>
    );
  }
  if (result.kind === "look") {
    const p = look?.palette;
    const radius = p ? Math.min(parseInt(p.radius, 10) || 12, 14) : 12;
    return (
      <div className={tileClass(result)} style={{ background: p?.bg, borderColor: p?.border, borderRadius: radius }}>
        <span className="gs-tile-card" style={{ background: p?.card, borderColor: p?.border, borderRadius: Math.max(radius - 4, 3) }}>
          <b style={{ color: p?.accent }}>Aa</b>
        </span>
        <span className="gs-tile-dots" aria-hidden="true">
          <i style={{ background: p?.accent }} />
          <i style={{ background: p?.caution }} />
          <i style={{ background: p?.alert }} />
        </span>
      </div>
    );
  }
  if (result.kind === "pick") {
    return (
      <div className={tileClass(result)}>
        <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
          <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M24 14v12l8 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (result.repeat) {
    return (
      <div className={tileClass(result)}>
        <svg viewBox="0 0 40 44" width="40" height="44" aria-hidden="true">
          <path d="M20 2l16 10v20L20 42 4 32V12z" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M20 14l8 5v10l-8 5-8-5V19z" fill="currentColor" opacity="0.35" />
        </svg>
      </div>
    );
  }
  return (
    <div className={tileClass(result)}>
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
        <rect x="10" y="12" width="28" height="24" rx="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="M16 20h16M16 26h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function labels(result: DrawResult, look?: ThemeDef): { title: string; sub: string } {
  if (result.kind === "look") {
    const name = look?.name ?? result.id;
    if (result.repeat) return { title: name, sub: `Repeat · +${crystalValueFor(result)} ${crystalKindFor(result) === "special" ? "special" : "regular"}` };
    // The 5★ / 4★ tag is drawn beside `sub` by the badge (StarTag), so the words stay plain.
    return { title: name, sub: result.brand ? "Brand look" : result.rainbow ? "Rainbow look" : "New look" };
  }
  if (result.kind === "pick") return { title: "Weekly pick", sub: "Unlock token" };
  if (result.repeat) return { title: itemLabel(result.id), sub: `Repeat · +${crystalValueFor(result)} regular` };
  return { title: itemLabel(result.id), sub: "Item" };
}

// Badge faces and the lanyard each hangs from (rail, strap, reel, clip), after the Team Lanyard Rail component.
/** Front colours: items share the app theme's colour, Regular themes are gold, rainbow looks are rainbow (CSS). */
const FRONT_TONE: Record<FrontKind, string> = { item: "var(--accent)", theme: "#e3b13a", company: "#c39bff" };

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function qrPath(seed: number) {
  const size = 21;
  const next = rng(seed);
  const corners = [[0, 0], [size - 7, 0], [0, size - 7]];
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const corner = corners.find(([cx, cy]) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7);
      const quiet = (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
      let on: boolean;
      if (corner) on = Math.max(Math.abs(x - corner[0] - 3), Math.abs(y - corner[1] - 3)) !== 2;
      else if (quiet) on = false;
      else if (x === 6 || y === 6) on = (x + y) % 2 === 0;
      else on = next() > 0.52;
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return d;
}

function barcode(seed: number) {
  const next = rng(seed ^ 0x9e3779b9);
  let x = 0;
  let d = "";
  while (x < 92) {
    const w = 1 + Math.floor(next() * 3);
    d += `M${x} 0h${w}v20h-${w}z`;
    x += w + 1 + Math.floor(next() * 2.2);
  }
  return { d, width: x };
}

function toneOf(r: DrawResult): string {
  return FRONT_TONE[frontOf(r)];
}

function Band({ tall }: { tall?: boolean }) {
  return <span className={`db-band${tall ? " tall" : ""}`} aria-hidden="true" />;
}

function Finish({ gx, shade }: { gx: number; shade: number }) {
  return (
    <>
      <span className="db-glint" aria-hidden="true" style={{ transform: `translateX(${gx.toFixed(1)}%)` }} />
      <span className="db-shade" aria-hidden="true" style={{ opacity: shade }} />
    </>
  );
}

/** The lanyard above one badge: rail, ring, woven strap with a crimp and the reel. The cord and clip hang on the badge itself, so they move with it. */
function Rig() {
  return (
    <span className="db-rig" aria-hidden="true">
      <i className="db-rail" />
      <i className="db-ring" />
      <i className="db-strap" />
      <i className="db-crimp" />
      <i className="db-reel" />
    </span>
  );
}

function ResultGrid({
  results,
  t,
  lookOf,
  flipAt,
  onFlip,
  onPreview,
  pack,
}: {
  results: readonly DrawResult[];
  t: number;
  lookOf: (id: string) => ThemeDef | undefined;
  flipAt: Readonly<Record<number, number>>;
  onFlip: (i: number) => void;
  onPreview: (r: DrawResult) => void;
  pack: PackId;
}) {
  return (
    <div className="db-grid" data-count={results.length}>
      {results.map((res, i) => {
              const ft = flipAt[i] ?? Infinity;
              const f = 180 * outBack(progress(t, ft, ft + FLIP_MS, Easing.inOut));
              const rarity = rarityOf(res);
              const drop = progress(t, landedAt(i) - DROP_MS, landedAt(i), Easing.out);
              const landed = t >= landedAt(i);
              const dropLen = results.length === 1 ? 10 : DROPS[i % DROPS.length];
              const slotStyle: CSSProperties = {
                color: toneOf(res),
                ["--tone" as string]: toneOf(res),
                ["--drop" as string]: dropLen,
                opacity: drop,
              };
              const swing = tiltOf(i, results.length) + (1 - drop) * (i % 2 ? 6 : -6);
              const badgeStyle: CSSProperties = {
                transform: `translateY(${((1 - drop) * -48).toFixed(1)}px) rotate(${swing.toFixed(2)}deg)`,
              };
              const isRepeat = res.kind !== "pick" && res.repeat;
              const isNew = res.kind === "look" ? !res.repeat : res.kind === "item" ? !res.repeat && !itemById(res.id)?.stackable : false;
              const restY = results.length === 1 ? 0 : REST_Y[i % REST_Y.length] * (1 - Math.min(1, f / 24));
              const look = res.kind === "look" ? lookOf(res.id) : undefined;
              const { title, sub } = labels(res, look);
              const facing = f > 90;
              const kind = f > 160 ? previewKind(res) : null;
              const seed = hash(`${i}:${res.kind}:${"id" in res ? res.id : "pick"}`);
              const bars = barcode(seed);
              const digits = String(seed % 1000000000).padStart(9, "0");
              const phi = ((((f + 90) % 180) + 180) % 180) - 90;
              const facingAmount = Math.abs(Math.cos((f * Math.PI) / 180));
              return (
                <div key={i} className="db-slot" data-tier={rarity} data-front={frontOf(res)} data-down={f < 90 ? "true" : "false"} style={slotStyle}>
                        <Rig />
                        <button
                          type="button"
                          style={badgeStyle}
                          className={`db-badge${f < 20 && landed ? " is-down" : ""}${kind ? " is-preview" : ""}`}
                          disabled={!landed}
                          aria-label={
                            facing
                              ? `${title}, ${starsOf(res) ? `${starsOf(res)} star, ` : ""}${sub}${kind === "card" ? ". Click to preview." : kind === "sound" ? ". Click to play the sound." : ""}`
                              : `Badge ${i + 1}, face down${rarity === "company" ? ", rainbow" : ""}. Click to turn it over.`
                          }
                          onClick={() => {
                            if (f < 20) onFlip(i);
                            else if (kind) onPreview(res);
                          }}
                        >
                          <span className="db-flip" style={{ transform: `perspective(900px) rotateY(${(f + restY).toFixed(1)}deg)` }}>
                            <span className="db-face back">
                              <Band />
                              <i className="db-hole" />
                              <span className="db-back-head">
                                <strong>Draw Theme</strong>
                                <small>{pack === "brand" ? "Brand Pack" : pack === "region" ? "Region Pack" : "Regular Pack"}</small>
                              </span>
                              <svg className="db-qr" aria-hidden="true" viewBox="-1 -1 23 23">
                                <path d={qrPath(seed)} fill="currentColor" />
                              </svg>
                              <Finish gx={phi * 0.9} shade={(1 - facingAmount) * 0.45} />
                            </span>
                            <span className="db-face front">
                              <Band tall />
                              <i className="db-hole" />
                              {isNew && (
                                <span className="db-tag">
                                  <svg viewBox="0 0 12 12" width="1em" height="1em" aria-hidden="true">
                                    <path d="M6 1l1.2 3.1L10.5 5.3 7.2 6.5 6 10 4.8 6.5 1.5 5.3l3.3-1.2z" fill="currentColor" />
                                  </svg>
                                  New
                                </span>
                              )}
                              {isRepeat && (
                                <span className="db-tag">
                                  <svg viewBox="0 0 12 12" width="1em" height="1em" aria-hidden="true">
                                    <path d="M6 1 10.5 3.6v4.8L6 11 1.5 8.4V3.6z" fill="currentColor" />
                                  </svg>
                                  +{crystalValueFor(res)}
                                </span>
                              )}
                              <span className="db-art">
                                <span className="db-art-in">
                                  <Tile result={res} look={look} />
                                </span>
                              </span>
                              <span className="db-name">{title}</span>
                              <span className="db-role">
                                {starsOf(res) ? <StarTag stars={starsOf(res)!} /> : null}
                                {sub}
                              </span>
                              <span className="db-team">{pack === "brand" ? "Brand" : pack === "region" ? "Region" : "Regular"} · draw {String(i + 1).padStart(2, "0")}</span>
                              <span className="db-codes">
                                <svg aria-hidden="true" viewBox={`0 0 ${bars.width} 20`} preserveAspectRatio="none">
                                  <path d={bars.d} fill="currentColor" />
                                </svg>
                                <small>{digits}</small>
                              </span>
                              <Finish gx={phi * 0.9} shade={(1 - facingAmount) * 0.45} />
                            </span>
                          </span>
                          <i className="db-cord" aria-hidden="true" />
                          <i className="db-clip" aria-hidden="true" />
                        </button>
                </div>
              );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- the tease
/** The opening burst: its colour says how good the draw is before any badge is turned. */
function Tease({ t, rarity }: { t: number; rarity: Rarity }) {
  if (t >= TEASE_MS + 300) return null;
  const show = interpolate(t, [0, 180, TEASE_MS - 160, TEASE_MS + 300], [0, 1, 1, 0]);
  const grow = progress(t, 0, TEASE_MS, Easing.out);
  // A company look gets a second swell: the burst brightens late, the moment the colour shifts.
  const swell = rarity === "company" ? interpolate(t, [TEASE_MS * 0.45, TEASE_MS * 0.7], [0, 1]) : 0;
  return (
    <div className="db-tease" data-tier={rarity} aria-hidden="true" style={{ opacity: show }}>
      <span className="db-tease-rays" style={{ transform: `rotate(${(grow * 40).toFixed(1)}deg) scale(${(0.6 + grow * 0.6).toFixed(3)})` }} />
      <span className="db-tease-core" style={{ transform: `scale(${(0.5 + grow * 0.5 + swell * 0.18).toFixed(3)})` }} />
    </div>
  );
}

// ---------------------------------------------------------------- the stage
export function DrawStage({
  results,
  t,
  phase,
  pack,
  lookOf,
  flipAt,
  onFlip,
  onPreview,
}: {
  results: readonly DrawResult[];
  t: number;
  phase: "idle" | "drawing" | "revealed";
  pack: PackId;
  lookOf: (id: string) => ThemeDef | undefined;
  flipAt: Readonly<Record<number, number>>;
  onFlip: (i: number) => void;
  onPreview: (r: DrawResult) => void;
}) {
  return (
    <div className="gs db" data-pack={pack}>
      {phase !== "idle" && results.length > 0 ? (
        <>
          <Tease t={t} rarity={bestRarity(results)} />
          <ResultGrid results={results} t={t} lookOf={lookOf} flipAt={flipAt} onFlip={onFlip} onPreview={onPreview} pack={pack} />
        </>
      ) : null}
    </div>
  );
}
