import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { BrandUnlock } from "../components/BrandUnlock";
import { PackContents, packSections } from "../components/PackContents";
import type { ThemeDef } from "../state/palette";
import { readJson, writeJson } from "../lib/storage";
import {
  applyResults,
  brandDaysLeft,
  cleanGacha,
  crystalValueFor,
  drawMany,
  featuredBrand,
  featuredRegion,
  isCompanyPack,
  packTable,
  pityFor,
  rainbowPityAfter,
  softPityFor,
  regionDaysLeft,
  type RegionMember,
  getContent,
  regionPackOn,
  itemLabel,
  packExhausted,
  priceOf,
  spendBrandPrisms,
  crystalKindFor,
  spendRegularCrystals,
  type DrawResult,
  type GachaState,
  type PackId,
} from "../state/gachaEngine";
import { grantItem, ownedItemIds } from "../state/items";
import { weekKey } from "../state/questEngine";
import { addCredits, CREDIT_NAME, formatCredits, spendCredits, useStationCredits } from "../state/stationCredits";
import {
  DEMO_AVAILABLE_BRAND_IDS,
  getLockedPresets,
  getThemeCatalogVersion,
  isBrandTheme,
  isCreditBuyableTheme,
  isRainbowTheme,
  listDrawableThemes,
  subscribeThemeCatalog,
} from "../state/themeCatalog";
import { grantPick } from "../state/useQuests";
import { TicketMark } from "../components/CheckinBoard";
import { spendTickets, useCheckinBoard } from "../state/useCheckinBoard";
import { regularExtraIds, TICKET_KINDS, TICKET_NAME, ticketFor, type TicketKind } from "../state/gachaContent";
import { brandHolds, DrawStage, FLIP_MS, landedAt, previewKind, REVEAL_GAP } from "../components/DrawBadges";
import { LookCard } from "../components/LookCard";
import { StarTag, type Stars } from "../components/StarTag";
import { TagPills } from "../components/TagPills";
import { playAlertPreview } from "../lib/previewSound";

const KEY = "cs.gacha";
const BANNER_SEEN_KEY = "cs.gacha.bannerSeen";
const lookOf = (id: string) => getLockedPresets().find((t) => t.id === id);
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type MainTab = PackId | "crystals";
type Phase = "idle" | "drawing" | "revealed";

/**
 * Published odds per draw, before soft pity: each row as the release sets it. Company packs have two 5-star rows
 * (featured, rainbow Regular); the Regular Pack has one (rainbow Regular).
 */
function oddsRows(pack: PackId, hasRainbow: boolean): { key: string; label: string; chance: number; stars?: Stars }[] {
  const w = packTable(pack).weights;
  const company = isCompanyPack(pack);
  const featured = company ? w.brandTheme : 0;
  const rainbow = hasRainbow ? (company ? (w.rainbowRegular ?? 0) : w.brandTheme) : 0;
  const rows: { key: string; label: string; chance: number; stars?: Stars }[] = [
    {
      key: "brand",
      label: pack === "region" ? "Featured company theme" : "Featured Brand theme",
      chance: featured * 100,
      stars: 5,
    },
    {
      key: "rainbow-regular",
      label: "Rainbow Regular theme",
      chance: rainbow * 100,
      stars: 5,
    },
    { key: "look", label: "Regular theme", chance: w.regularTheme * 100, stars: 4 },
    { key: "pick", label: "Weekly unlock pick", chance: w.pick * 100 },
    { key: "custom", label: "Custom upload unlock", chance: w.customUpload * 100 },
    { key: "better", label: "Better item", chance: w.better * 100 },
    { key: "common", label: "Common item", chance: w.common * 100 },
  ];
  return rows.filter((r) => r.chance > 0).map((r) => ({ ...r, chance: Math.round(r.chance * 100) / 100 }));
}

/** "common item 1 · better item 2 · Regular theme 3 · …": what each repeat pays in Regular crystals, in any pack. */
function repeatRates(content: ReturnType<typeof getContent>): string {
  const cv = content.crystalValues;
  const rows: [string, number][] = [
    ["common item", cv.common],
    ["better item", cv.better],
    ["Regular theme", cv.regularTheme],
    ["rainbow theme", cv.rainbowTheme ?? cv.regularTheme],
    ["custom upload", cv.customUpload],
  ];
  return rows.map(([label, n]) => `${label} ${n}`).join(" · ");
}

/** "5-star chance rises from draw 74 and is 100% by draw 90.": the pity rule players are told, in plain words. */
function softLine(pack: PackId, content: ReturnType<typeof getContent>): string {
  const at = rainbowPityAfter(pack, content) + 1;
  const soft = softPityFor(pack, content);
  return soft && soft.from < at
    ? `The 5-star chance rises from draw ${soft.from} since your last 5-star and is 100% by draw ${at}.`
    : `A 5-star is guaranteed by draw ${at} since your last one.`;
}

/** Regular Pack pool: Available locked non-Brand only (Hidden/Archived/Brand never). */
/**
 * The Regular pool: every drawable non-Brand look, plus the looks the CMS added back (`regularExtraIds`, for example a
 * Brand look after its rotation). Every Regular list on this page (draws, poster, crystal picker) comes from here.
 */
function regularLookThemes(): ThemeDef[] {
  const extra = new Set(regularExtraIds());
  return listDrawableThemes().filter((t) => isCreditBuyableTheme(t) || extra.has(t.id));
}
function regularPoolIds(): string[] {
  return regularLookThemes().map((t) => t.id);
}

/** Rainbow (5-star) Regular themes: draw-only, from the Regular Pack's rainbow row or a lost 50/50 in a company pack. */
function rainbowLookThemes(): ThemeDef[] {
  return listDrawableThemes().filter(isRainbowTheme);
}

/**
 * This fortnight's Brand pair ∩ Available drawable Brand looks.
 * Hidden/Archived never drawn. If the date-rule pair is still Hidden (offline demo),
 * fall back to DEMO_AVAILABLE_BRAND_IDS so Brand Pack stays exercisable until CMS.
 */
/** Drawable company looks tagged for the Region Pack (Hidden and Archived never count). */
function regionPool(): RegionMember[] {
  return listDrawableThemes()
    .filter((t) => isBrandTheme(t) && t.tags?.packs.includes("region"))
    .map((t) => ({ id: t.id, tags: t.tags! }));
}

function featuredDrawableIds(now = new Date()): string[] {
  const drawableBrand = new Set(listDrawableThemes().filter(isBrandTheme).map((t) => t.id));
  const featured = featuredBrand(now).filter((id) => drawableBrand.has(id));
  if (featured.length > 0) return featured;
  const rotation = new Set(getContent().brandThemeIds);
  return DEMO_AVAILABLE_BRAND_IDS.filter((id) => drawableBrand.has(id) && rotation.has(id));
}

/* ---- Small drawn marks for the Draw shell (one stroke weight, currentColor) ---- */
function CreditMark() {
  return (
    <svg className="warp-mark" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5v7M5.5 8h5" />
    </svg>
  );
}

/** The cost chip on a draw button: Draw Tickets when they pay, otherwise Credits. */
function DrawCost({ pay, credits, count, kind }: { pay: "credits" | "tickets"; credits: number; count: number; kind: TicketKind }) {
  return pay === "tickets" ? (
    <span className="warp-cost" data-pay="ticket" data-ticket={kind}>
      <TicketMark kind={kind} className="tk-mark warp-mark" />
      {count}
    </span>
  ) : (
    <span className="warp-cost">
      <CreditMark />
      {credits}
    </span>
  );
}

function CrystalMark() {
  return (
    <svg className="warp-mark" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.75 13.25 6 8 14.25 2.75 6Z" />
      <path d="M2.75 6h10.5M8 1.75 6 6l2 8.25L10 6Z" />
    </svg>
  );
}

function DrawMark() {
  return (
    <svg className="warp-mark warp-title-mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="11" height="15" rx="2" transform="rotate(-10 9.5 12.5)" />
      <rect x="9" y="4" width="11" height="15" rx="2" transform="rotate(8 14.5 11.5)" />
    </svg>
  );
}

/** A banner thumbnail on the rail: the pack's own looks, as slanted colour bands. */
function Thumb({ looks }: { looks: readonly (ThemeDef | undefined)[] }) {
  const shown = looks.filter((l): l is ThemeDef => !!l);
  return (
    <span className="warp-thumb" aria-hidden="true">
      {shown.map((l) => (
        <i key={l.id} style={{ background: l.palette?.bg, borderColor: l.palette?.accent }} />
      ))}
    </span>
  );
}

/* ---- Banner (phase 2 strip — static placeholder) ---- */
const BANNER = {
  id: "banner-regular-1",
  title: "Station looks",
  subtitle: "Regular Pack · wallpapers & sounds",
  pack: "regular" as PackId,
  line: "Same odds as the pack. Featured items are the ones available now.",
};

export function gachaBannerIsNew(): boolean {
  try {
    const seen = readJson<string[]>(BANNER_SEEN_KEY, []);
    const ids = new Set(Array.isArray(seen) ? seen : []);
    return !ids.has(BANNER.id);
  } catch {
    return true;
  }
}

function markBannerSeen(): void {
  writeJson(BANNER_SEEN_KEY, [BANNER.id]);
}

/**
 * Draw Theme pop-up: Regular / Brand packs, published odds, crystals & prisms, banner strip.
 * Credits are earned only — never sold here.
 */
export function DrawPage({
  owned,
  onWin,
  onBack,
}: {
  owned: readonly string[];
  onWin: (id: string) => void;
  onBack: () => void;
}) {
  const titleId = useId();
  const balance = useStationCredits();
  // Draw Tickets from the daily check-in board. Each pack takes one kind (CMS `packTickets`); one ticket pays one draw.
  const wallet = useCheckinBoard().tickets;
  const [state, setState] = useState<GachaState>(() => cleanGacha(readJson<unknown>(KEY, null)));
  const [chosenTab, setTab] = useState<MainTab>("regular");
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<DrawResult[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [t, setT] = useState(-1);
  // A badge that was clicked open: a look shows its card here.
  const [preview, setPreview] = useState<Extract<DrawResult, { kind: "look" }> | null>(null);
  // Brand looks won for the first time. Each gets its logo moment, one after another, once the badges are shown.
  const [celebrate, setCelebrate] = useState<string[]>([]);
  // The reveal clock (ms since the draw started) and when each badge was turned over. Badges wait face down until the
  // player taps them, presses Reveal all (`auto`), or Skip. `celebrated` holds the company looks whose logo moment ran.
  const [flipAt, setFlipAt] = useState<Record<number, number>>({});
  const flips = useRef<Record<number, number>>({});
  const tRef = useRef(-1);
  const drawn = useRef<DrawResult[]>([]);
  const clock = useRef<{ start: number; celebrated: Set<number>; auto: boolean }>({ start: 0, celebrated: new Set(), auto: false });
  const celebrating = useRef(false);
  // The count of the last draw, for Draw again, and the confirm dialog's open count.
  const [lastCount, setLastCount] = useState<1 | 10>(1);
  const [again, setAgain] = useState<1 | 10 | null>(null);
  const afterCelebration = useRef<() => void>(() => {});
  const nextCelebration = useCallback(() => afterCelebration.current(), []);
  const [pickKind, setPickKind] = useState<"crystals" | "prisms" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // The list of everything in the current pack and its chance, opened from the "up next" showcase.
  const [poolOpen, setPoolOpen] = useState(false);
  const closePool = useCallback(() => setPoolOpen(false), []);
  // Read before the mount effect marks the banner seen, so the rail can still say "New" on this visit.
  const [bannerNew] = useState(gachaBannerIsNew);
  const frame = useRef(0);
  const migrated = useRef(false);
  // Layout size from the page's own width, not the window, so a split pane gets the compact layout.
  const shellRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState<"wide" | "mid" | "narrow">("wide");
  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setWidth(w < 820 ? "narrow" : w < 1060 ? "mid" : "wide");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const catalogEpoch = useSyncExternalStore(subscribeThemeCatalog, getThemeCatalogVersion, getThemeCatalogVersion);
  const content = getContent();
  // The CMS can switch the Region Pack off; its tab then disappears and a chosen Region tab falls back to Regular.
  const regionOn = regionPackOn(content);
  const tab: MainTab = chosenTab === "region" && !regionOn ? "regular" : chosenTab;
  const pack: PackId = tab === "crystals" ? "regular" : tab;
  const brandFeatured = useMemo(() => featuredDrawableIds(), [catalogEpoch]);
  const daysLeft = useMemo(() => brandDaysLeft(), []);
  const focus = useMemo(() => featuredRegion(regionPool()), [catalogEpoch]);
  const regionDays = useMemo(() => regionDaysLeft(), []);
  // The company pair the current pack draws from: this fortnight's Brand pair, or this week's Region pair.
  const featured = pack === "region" ? focus.ids : brandFeatured;
  const featuredLooks = brandFeatured.map((id) => lookOf(id)).filter(Boolean);
  const regionLooks = focus.ids.map((id) => lookOf(id)).filter(Boolean);
  const company = isCompanyPack(pack);
  // Rainbow pity of the current pack. The 50/50 runs in the engine but is never described to the player.
  const packPity = pityFor(state, pack);
  const allRegular = useMemo(() => regularPoolIds(), [catalogEpoch]);
  const rainbowLooks = useMemo(() => rainbowLookThemes(), [catalogEpoch]);
  const rainbowPool = useMemo(() => rainbowLooks.map((t) => t.id), [rainbowLooks]);
  // In a company pack a featured look drops only from its own row, never from the Regular theme row.
  const regularPool = useMemo(() => (company ? allRegular.filter((id) => !featured.includes(id)) : allRegular), [allRegular, company, featured]);
  const ticketKind: TicketKind = ticketFor(pack);
  const tickets = wallet[ticketKind];
  const ownedItems = ownedItemIds();
  const exhausted = tab !== "crystals" && packExhausted(pack, owned, ownedItems, regularPool, featured, rainbowPool);
  const lookPity = state.lookPity[pack];
  const pityLeft = Math.max(1, content.lookPityAfter + 1 - lookPity);
  const rainbowLeft = Math.max(1, rainbowPityAfter(pack, content) + 1 - packPity.brand);
  const odds = tab === "crystals" ? [] : oddsRows(tab, rainbowPool.length > 0);

  useEffect(() => {
    markBannerSeen();
    if (!migrated.current && state.pendingCredits > 0) {
      migrated.current = true;
      addCredits(state.pendingCredits);
      const next = { ...state, pendingCredits: 0 };
      writeJson(KEY, next);
      setState(next);
      setNote(`Migrated ${formatCredits(state.pendingCredits)} from old coupons.`);
    }
  }, [state]);

  // Escape closes the preview or the theme picker, whichever is on top. The reveal stage handles its own Escape below.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (preview) setPreview(null);
      else if (pickKind) setPickKind(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickKind, preview]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // The Regular Pack poster cycles through every Regular theme, three at a time, holding each set for 3 seconds.
  // It holds while the pointer is over the poster, while a draw is open, and while the app is in the background.
  const CYCLE_MS = 3000;
  const [cycle, setCycle] = useState(0);
  const [posterHeld, setPosterHeld] = useState(false);
  const cycling = tab === "regular" && phase === "idle" && !posterHeld && regularPool.length > 3;
  useEffect(() => {
    if (!cycling) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setCycle((c) => c + 1);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [cycling]);
  useEffect(() => {
    celebrating.current = celebrate.length > 0;
  }, [celebrate]);

  const setFlips = (next: Record<number, number>) => {
    flips.current = next;
    setFlipAt(next);
  };

  const busy = phase === "drawing";
  const price1 = priceOf(pack, 1) ?? 100;
  const price10 = priceOf(pack, 10) ?? 900;
  /** Held tickets of this pack's kind pay first: one per draw. Without enough tickets the draw costs Credits. */
  const payFor = (count: number): "credits" | "tickets" => (tickets >= count ? "tickets" : "credits");
  const pay1 = payFor(1);
  const pay10 = payFor(10);

  /**
   * Pressing 1 draw or 10 draws spends Draw Tickets when enough are held (the pack's own ticket kind, one per draw), otherwise the
   * Credits, and starts the reveal straight away. A ticket draw rolls exactly like a Credit draw; only the payment differs.
   */
  const draw = (count: number, pay: "credits" | "tickets" = payFor(count)) => {
    if (tab === "crystals" || exhausted || busy) return;
    const price = priceOf(pack, count);
    if (price == null) return;
    if (pay === "tickets") {
      if (!spendTickets(ticketKind, count)) {
        setNote(`Not enough ${TICKET_NAME[ticketKind]}s: need ${count}, you have ${tickets}.`);
        return;
      }
    } else if (spendCredits(price) == null) {
      setNote(`Not enough ${CREDIT_NAME.toLowerCase()}: need ${price}, you have ${balance}.`);
      return;
    }
    setPreview(null);
    const now = new Date();
    const { results: rolled, pity: nextPity } = drawMany(
      pack,
      count,
      {
        looks: owned,
        items: ownedItems,
        regularPool,
        rainbowPool,
        week: weekKey(now),
        featured,
        now,
      },
      packPity,
      Math.random,
    );
    for (const r of rolled) {
      if (r.kind === "look" && !r.repeat) onWin(r.id);
      if (r.kind === "item" && !r.repeat) grantItem(r.id);
      if (r.kind === "pick") grantPick();
    }
    const next = applyResults(state, pack, rolled, nextPity);
    writeJson(KEY, next);
    setState(next);
    setResults(rolled);
    setNote(null);
    drawn.current = rolled;
    setLastCount(count === 10 ? 10 : 1);
    setAgain(null);
    setFlips({});
    cancelAnimationFrame(frame.current);
    // Reduced motion skips the tease and the drop: the badges are already in place, face down.
    clock.current = { start: performance.now() - (reduced() ? landedAt(rolled.length - 1) : 0), celebrated: new Set(), auto: false };
    setPhase("drawing");
    frame.current = requestAnimationFrame(tick);
  };

  /** One frame of the reveal: advance the clock, start a company look's logo moment once it is face up, finish when all are. */
  function tick() {
    const nowT = performance.now() - clock.current.start;
    tRef.current = nowT;
    setT(nowT);
    const rs = drawn.current;
    const f = flips.current;
    const holds = brandHolds(rs);
    if (!celebrating.current) {
      for (const i of holds) {
        const at = f[i];
        if (at == null || nowT < at + FLIP_MS || clock.current.celebrated.has(i)) continue;
        clock.current.celebrated.add(i);
        celebrating.current = true;
        setCelebrate([(rs[i] as { id: string }).id]);
        break;
      }
    }
    const turned = Object.values(f);
    const allUp = rs.length > 0 && turned.length === rs.length && nowT >= Math.max(...turned) + FLIP_MS;
    if (allUp && !celebrating.current && holds.every((i) => clock.current.celebrated.has(i))) {
      setPhase("revealed");
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }

  /** Tapping a face-down badge turns it over (once it has landed). */
  const turnOver = (i: number) => {
    if (phase !== "drawing" || celebrating.current) return;
    const nowT = tRef.current;
    if (nowT < landedAt(i) || flips.current[i] != null) return;
    setFlips({ ...flips.current, [i]: reduced() ? nowT - FLIP_MS : nowT });
  };

  /** Reveal all: turn the rest over in order, stopping after the next new company look for its logo moment. */
  const scheduleAuto = () => {
    const rs = drawn.current;
    const holds = new Set(brandHolds(rs));
    const next = { ...flips.current };
    let at = Math.max(tRef.current, landedAt(rs.length - 1));
    let stopped = false;
    for (let i = 0; i < rs.length; i++) {
      if (next[i] != null) continue;
      next[i] = reduced() ? at - FLIP_MS : at;
      at += reduced() ? 0 : REVEAL_GAP;
      if (holds.has(i)) {
        stopped = true;
        break;
      }
    }
    clock.current.auto = stopped;
    setFlips(next);
  };

  const revealAll = () => {
    if (phase !== "drawing" || celebrating.current) return;
    clock.current.auto = true;
    scheduleAuto();
  };

  /** Skip fast-forwards: every badge up to the next new company look is face up at once, and its logo moment plays. */
  const skip = () => {
    if (phase !== "drawing" || celebrating.current) return;
    const rs = drawn.current;
    let nowT = tRef.current;
    const land = landedAt(rs.length - 1);
    if (nowT < land) {
      clock.current.start -= land - nowT;
      nowT = land;
      tRef.current = land;
    }
    const holds = new Set(brandHolds(rs));
    const next = { ...flips.current };
    for (let i = 0; i < rs.length; i++) {
      if (next[i] != null) continue;
      next[i] = nowT - FLIP_MS;
      if (holds.has(i)) break;
    }
    clock.current.auto = false;
    setFlips(next);
  };

  // Back to draw: the logo moment closes; Reveal all carries on if it was running.
  afterCelebration.current = () => {
    setCelebrate((q) => {
      const rest = q.slice(1);
      celebrating.current = rest.length > 0;
      return rest;
    });
    if (clock.current.auto && phase === "drawing") scheduleAuto();
  };

  const closeStage = () => {
    cancelAnimationFrame(frame.current);
    clock.current = { start: 0, celebrated: new Set(), auto: false };
    drawn.current = [];
    setFlips({});
    setAgain(null);
    setResults([]);
    setT(-1);
    setPhase("idle");
  };

  useEffect(() => {
    if (phase === "idle" || preview || pickKind || celebrate.length > 0 || again) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phase === "drawing") skip();
      else closeStage();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, preview, pickKind, celebrate.length, again]);

  /** Clicking a face-up badge: a look opens its card, an alert sound plays, anything else is left alone. */
  const onPreview = (r: DrawResult) => {
    const kind = previewKind(r);
    if (kind === "sound" && r.kind === "item") playAlertPreview(r.id);
    else if (kind === "card" && r.kind === "look") setPreview(r);
  };

  const spendPick = (id: string) => {
    if (pickKind === "crystals") {
      const res = spendRegularCrystals(state, id, owned, regularPool);
      if (!res.ok) {
        setNote("Cannot spend Regular crystals on that look.");
        return;
      }
      onWin(id);
      writeJson(KEY, res.state);
      setState(res.state);
      setPickKind(null);
      setNote(`Unlocked with ${content.regularCrystalCost} Regular crystals.`);
      return;
    }
    if (pickKind === "prisms") {
      const res = spendBrandPrisms(state, id, owned, brandFeatured);
      if (!res.ok) {
        setNote("Special crystals only unlock one of the featured themes now.");
        return;
      }
      onWin(id);
      writeJson(KEY, res.state);
      setState(res.state);
      setPickKind(null);
      setNote(`Unlocked with ${content.brandPrismCost} Special crystals.`);
      setCelebrate([id]);
    }
  };

  // What came out, in a few counts. Each badge already names its result, so this stays short; the full list is
  // kept for screen readers.
  // A repeat pays Special crystals for a featured theme, Regular crystals for anything else (crystalKindFor).
  const crystalWord = (r: DrawResult) => (crystalKindFor(r) === "special" ? "Special crystals" : "Regular crystals");
  const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const newLooks = results.filter((r) => r.kind === "look" && !r.repeat);
  const brandLooks = newLooks.filter((r) => r.kind === "look" && r.brand).length;
  const rainbowNew = newLooks.filter((r) => r.kind === "look" && r.rainbow).length;
  const plainItems = results.filter((r) => r.kind === "item" && !r.repeat).length;
  const picks = results.filter((r) => r.kind === "pick").length;
  const repeats = results.filter((r) => (r.kind === "look" || r.kind === "item") && r.repeat);
  const repeatRegular = repeats.filter((r) => crystalKindFor(r) === "regular").reduce((sum, r) => sum + crystalValueFor(r), 0);
  const repeatSpecial = repeats.filter((r) => crystalKindFor(r) === "special").reduce((sum, r) => sum + crystalValueFor(r), 0);
  const repeatValueText = [repeatRegular ? `+${repeatRegular} Regular crystals` : "", repeatSpecial ? `+${repeatSpecial} Special crystals` : ""].filter(Boolean).join(", ");
  const summary =
    phase !== "revealed"
      ? ""
      : [
          newLooks.length
            ? `${count(newLooks.length, "new look")}${brandLooks || rainbowNew ? ` (${[brandLooks ? `${brandLooks} Brand` : "", rainbowNew ? `${rainbowNew} rainbow` : ""].filter(Boolean).join(", ")})` : ""}`
            : "",
          plainItems ? count(plainItems, "item") : "",
          picks ? count(picks, "weekly pick") : "",
          repeats.length ? `${count(repeats.length, "repeat")}, ${repeatValueText}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
  const summaryFull =
    phase !== "revealed"
      ? ""
      : results
          .map((r) => {
            if (r.kind === "look") {
              const name = lookOf(r.id)?.name ?? r.id;
              if (r.repeat) return `Repeat: +${crystalValueFor(r)} ${crystalWord(r)} (${name})`;
              return r.brand ? `Brand look: ${name}` : r.rainbow ? `Rainbow look: ${name}` : name;
            }
            if (r.kind === "pick") return "Weekly unlock pick";
            if (r.repeat) return `Repeat: +${crystalValueFor(r)} ${crystalWord(r)}`;
            return itemLabel(r.id);
          })
          .join(", ");

  const pickPool =
    pickKind === "crystals"
      ? regularLookThemes().filter((t) => !owned.includes(t.id))
      : pickKind === "prisms"
        ? brandFeatured.map((id) => lookOf(id)).filter((t): t is NonNullable<typeof t> => !!t && !owned.includes(t.id))
        : [];

  const regularLooks = regularLookThemes();
  // Every look the Regular Pack can give, rainbow ones first: the poster and the tab thumbnail cycle through these.
  const regularPackLooks = [...rainbowLooks, ...regularLooks];
  // Which set of three the Regular poster shows now, and the set after it (fanned under the info text as "up next").
  const posterPages = Math.max(1, Math.ceil(regularPackLooks.length / 3));
  const posterPage = cycle % posterPages;
  const setOf = (page: number) =>
    regularPackLooks.length <= 3
      ? regularPackLooks
      : [0, 1, 2].map((k) => regularPackLooks[(page * 3 + k) % regularPackLooks.length]).filter((l, k, a) => a.indexOf(l) === k);
  const posterLooks = tab === "brand" ? featuredLooks : tab === "region" ? regionLooks : setOf(posterPage);
  // Every pack gets the same "see everything and its chance" button. Regular fans the next set of looks; Brand and Region
  // fan the featured company looks, and count their featured themes on top of the Regular ones they can also give.
  const showcase =
    tab === "regular" ? (posterPages > 1 ? setOf((posterPage + 1) % posterPages) : []) : tab === "brand" ? featuredLooks.filter((l): l is NonNullable<typeof l> => !!l) : tab === "region" ? regionLooks.filter((l): l is NonNullable<typeof l> => !!l) : [];
  const moreCount = tab === "regular" ? regularPackLooks.length : regularPackLooks.length + showcase.length;
  const showcaseCap = tab === "regular" ? "Up next" : tab === "brand" ? "Featured now" : `${focus.label} week`;
  const pityMax = content.lookPityAfter + 1;
  const pityFilled = pityMax - pityLeft;
  const actionBar = exhausted ? (
    <p className="gacha-disabled">You already have everything in this pack.</p>
  ) : (
    <>
    <div className="gacha-actions warp-draws">
      <button
        type="button"
        className="warp-draw"
        disabled={busy || (pay1 === "credits" && balance < price1)}
        onClick={() => draw(1)}
        aria-label={pay1 === "tickets" ? `1 draw, 1 ${TICKET_NAME[ticketKind]}` : `1 draw, ${formatCredits(price1)}`}
      >
        <DrawCost pay={pay1} credits={price1} count={1} kind={ticketKind} />
        <span className="warp-draw-label">
          1 draw
          {pay1 === "tickets" ? <small>1 {TICKET_NAME[ticketKind]}</small> : null}
        </span>
      </button>
      <button
        type="button"
        className="warp-draw"
        disabled={busy || (pay10 === "credits" && balance < price10)}
        onClick={() => draw(10)}
        aria-label={`10 draws, ${pay10 === "tickets" ? `10 ${TICKET_NAME[ticketKind]}s` : formatCredits(price10)}, at least 1 Regular theme`}
      >
        <DrawCost pay={pay10} credits={price10} count={10} kind={ticketKind} />
        <span className="warp-draw-label">
          10 draws
          <small>{pay10 === "tickets" ? "10 tickets · " : ""}at least 1 Regular theme</small>
        </span>
      </button>
    </div>
    </>
  );

  return (
    <div className="draw-page-wrap">
      <section
        ref={shellRef}
        className="gacha gacha-page dp warp"
        data-pack={tab === "crystals" ? "regular" : tab}
        data-w={width}
        aria-labelledby={titleId}
      >
        <header className="warp-top">
          <h2 id={titleId} className="warp-title">
            <DrawMark />
            Draw
          </h2>
          <p className="warp-wallet" aria-label="Your balance">
            <span className="warp-coin" data-kind="credit">
              <CreditMark />
              <b>{balance}</b> {CREDIT_NAME}
            </span>
            <span className="warp-coin" data-kind="crystal">
              <CrystalMark />
              <b>{state.crystals}</b> Regular crystals
            </span>
            <span className="warp-coin" data-kind="prism">
              <CrystalMark />
              <b>{state.prisms}</b> Special crystals
            </span>
            {TICKET_KINDS.map((k) =>
              wallet[k] > 0 ? (
                <span key={k} className="warp-coin" data-kind="ticket" data-ticket={k}>
                  <TicketMark kind={k} className="tk-mark warp-mark" />
                  <b>{wallet[k]}</b> {k === "regular" ? "Regular" : "Special"}
                </span>
              ) : null,
            )}
          </p>
          <button type="button" className="warp-close" aria-label="Close Draw" onClick={onBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </header>

        <div className="warp-body">
          <div className="warp-rail" role="tablist" aria-label="Draw tabs">
            <button type="button" role="tab" aria-selected={tab === "regular"} className="warp-tab" onClick={() => setTab("regular")}>
              <Thumb looks={regularPackLooks.slice(0, 3)} />
              <span className="warp-tab-name">Regular</span>
              {bannerNew ? <em className="warp-flag">New</em> : null}
            </button>
            <button type="button" role="tab" aria-selected={tab === "brand"} className="warp-tab" data-kind="brand" onClick={() => setTab("brand")}>
              <Thumb looks={featuredLooks} />
              <span className="warp-tab-name">Brand</span>
              <em className="warp-flag quiet">{daysLeft}d left</em>
            </button>
            {regionOn ? (
              <button type="button" role="tab" aria-selected={tab === "region"} className="warp-tab" data-kind="region" onClick={() => setTab("region")}>
                <Thumb looks={regionLooks} />
                <span className="warp-tab-name">Region</span>
                <em className="warp-flag quiet">{focus.label}</em>
              </button>
            ) : null}
            <button type="button" role="tab" aria-selected={tab === "crystals"} className="warp-tab" data-kind="exchange" onClick={() => setTab("crystals")}>
              <span className="warp-thumb exchange" aria-hidden="true">
                <CrystalMark />
              </span>
              <span className="warp-tab-name">Exchange</span>
            </button>
          </div>

          {tab !== "crystals" ? (
            <div className="warp-stage">
              <aside className="warp-info">
                <span className="warp-chip">
                  {tab === "brand" ? "Rotating pack" : tab === "region" ? (focus.kind === "country" ? "Country week" : "Region week") : "Regular pack"}
                </span>
                <h3>{tab === "brand" ? "Brand Pack" : tab === "region" ? focus.label : BANNER.title}</h3>
                <p className="warp-lede">
                  New look guaranteed within <em>{pityLeft}</em> draw{pityLeft === 1 ? "" : "s"}.
                </p>
                <p className="warp-lede">
                  Rainbow guaranteed within <em>{rainbowLeft}</em> draw{rainbowLeft === 1 ? "" : "s"}.
                </p>
                <div
                  className="warp-pips"
                  role="img"
                  aria-label={`${pityFilled} of ${pityMax} draws toward a guaranteed look`}
                  style={{ "--n": pityMax } as CSSProperties}
                >
                  {Array.from({ length: pityMax }, (_, i) => (
                    <i key={i} data-on={i < pityFilled ? "true" : "false"} />
                  ))}
                </div>
                <p className="warp-sub">
                  {tab === "region"
                    ? focus.ids.length === 0
                      ? `No ${focus.label} company looks are out yet. The focus changes in ${regionDays} day${regionDays === 1 ? "" : "s"}.`
                      : `${focus.ids.length === 1 ? "One featured company" : "Two featured companies"} from ${focus.label}, changing in ${regionDays} day${regionDays === 1 ? "" : "s"}.`
                    : tab === "brand"
                    ? `Two featured themes, changing in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`
                    : BANNER.subtitle}
                </p>
                {note && phase === "idle" ? (
                  <p className="gacha-line" role="status">
                    {note}
                  </p>
                ) : null}
                {moreCount > 0 ? (
                  <button
                    type="button"
                    className="warp-show"
                    onClick={() => setPoolOpen(true)}
                    aria-label={`See all ${moreCount} looks and every item in this pack, with their chances`}
                  >
                    <span className="warp-fan" aria-hidden="true">
                      {showcase.map((look) => (
                        <span
                          key={look.id}
                          className="warp-mini"
                          style={{ background: look.palette?.bg, color: look.palette?.accent, borderColor: look.palette?.border }}
                        >
                          <i style={{ background: look.palette?.card }} />
                          <b>Aa</b>
                        </span>
                      ))}
                    </span>
                    <span className="warp-show-cap">
                      <b>
                        {showcase.length === 0
                          ? "Everything in this pack"
                          : showcase.length > 1 && tab !== "regular"
                          ? showcase.map((l) => l!.name).join(" + ")
                          : showcase[0]!.name}
                      </b>
                      <small>
                        {showcaseCap} · {moreCount} looks in this pack
                      </small>
                    </span>
                  </button>
                ) : null}
              </aside>
              <div
                className="warp-art"
                onPointerEnter={() => setPosterHeld(true)}
                onPointerLeave={() => setPosterHeld(false)}
                onFocusCapture={() => setPosterHeld(true)}
                onBlurCapture={() => setPosterHeld(false)}
              >
                {posterLooks.map((look) =>
                  look ? (
                    <div key={tab === "regular" ? `${look.id}-${posterPage}` : look.id} className="warp-hero" data-rainbow={isRainbowTheme(look) ? "true" : undefined}>
                      <LookCard look={look} />
                      <span className="warp-name">
                        <i style={{ background: look.palette?.accent ?? "var(--accent)" }} />
                        <span>
                          <b>{look.name}</b>
                          {look.tags ? <TagPills tags={look.tags} /> : <small>{tab === "brand" ? "Brand theme" : look.author}</small>}
                        </span>
                      </span>
                    </div>
                  ) : null,
                )}
                <div className="gacha-stage" data-phase={phase} data-pack={pack} data-collapsed={phase === "idle" ? "true" : "false"}>
                  <DrawStage
                    results={results}
                    t={t}
                    phase={phase}
                    pack={pack}
                    lookOf={lookOf}
                    flipAt={flipAt}
                    onFlip={turnOver}
                    onPreview={onPreview}
                  />
                  {phase !== "idle" ? (
                    <div className="gs-foot">
                      <p className="gacha-line" role="status" aria-live="polite">
                        {busy
                          ? t < landedAt(results.length - 1)
                            ? "Drawing…"
                            : `Tap a badge to turn it over. ${results.length - Object.keys(flipAt).length} left.`
                          : note ?? summary}
                        {!busy && !note && summaryFull ? <span className="gacha-sr">. {summaryFull}</span> : null}
                      </p>
                      {busy ? (
                        <div className="gs-foot-act">
                          <button type="button" className="warp-text" onClick={revealAll}>
                            Reveal all
                          </button>
                          <button type="button" className="gacha-skip" onClick={skip}>
                            Skip
                          </button>
                        </div>
                      ) : (
                        <div className="gs-foot-act dp-act">
                          {exhausted ? (
                            <p className="gacha-disabled">You already have everything in this pack.</p>
                          ) : (
                            <button type="button" className="warp-draw" onClick={() => setAgain(lastCount)}>
                              <DrawCost pay={payFor(lastCount)} credits={lastCount === 10 ? price10 : price1} count={lastCount} kind={ticketKind} />
                              <span className="warp-draw-label">Draw {lastCount === 10 ? "10" : "1"} again</span>
                            </button>
                          )}
                          <button type="button" className="link" onClick={closeStage}>
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="warp-side-act">
                {phase === "idle" ? (
                  <>
                    <button type="button" className="warp-text" onClick={() => setTab("crystals")}>
                      Exchange
                    </button>
                    <button type="button" className="warp-text" onClick={() => setDetailsOpen(true)}>
                      View details
                    </button>
                  </>
                ) : null}
              </div>
              <div className="warp-bar">
                {phase === "idle" ? (
                  <div className="dp-act">{actionBar}</div>
                ) : (
                  <p className="warp-sub">
                    Spend earned {CREDIT_NAME.toLowerCase()} or check-in tickets on a pack draw. {CREDIT_NAME} are never sold.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="warp-pass">
              <section>
                <h3>Regular crystals</h3>
                <div
                  className="warp-pips"
                  role="img"
                  aria-label={`${state.crystals} of ${content.regularCrystalCost} crystals`}
                  style={{ "--n": content.regularCrystalCost } as CSSProperties}
                >
                  {Array.from({ length: content.regularCrystalCost }, (_, i) => (
                    <i key={i} data-on={i < state.crystals ? "true" : "false"} />
                  ))}
                </div>
                <p>
                  {state.crystals} / {content.regularCrystalCost} toward a Regular theme pick
                </p>
                <p className="warp-pass-rates">
                  Repeats in any pack pay Regular crystals: {repeatRates(content)}
                </p>
                <button type="button" className="pill-btn gacha-go" disabled={state.crystals < content.regularCrystalCost} onClick={() => setPickKind("crystals")}>
                  Pick a Regular theme · {content.regularCrystalCost} Regular crystals
                </button>
              </section>
              <section>
                <h3>Special crystals</h3>
                <div className="gacha-meter gold">
                  <i style={{ width: `${Math.min(100, (state.prisms / content.brandPrismCost) * 100)}%` }} />
                </div>
                <p>
                  {state.prisms} / {content.brandPrismCost} toward one of the featured themes
                </p>
                <p className="warp-pass-rates">
                  A repeat featured theme pays {content.crystalValues.brandTheme} Special crystal{content.crystalValues.brandTheme === 1 ? "" : "s"}.
                </p>
                <button type="button" className="pill-btn gacha-go brand" disabled={state.prisms < content.brandPrismCost} onClick={() => setPickKind("prisms")}>
                  Pick a featured theme · {content.brandPrismCost} Special crystal{content.brandPrismCost === 1 ? "" : "s"}
                </button>
              </section>
              {note && (
                <p className="gacha-line" role="status">
                  {note}
                </p>
              )}
              <p className="warp-sub warp-pass-foot">
                Spend earned {CREDIT_NAME.toLowerCase()} or check-in tickets on a pack draw. {CREDIT_NAME} are never sold.
              </p>
            </div>
          )}
        </div>

        {again ? (
          <div className="warp-shade" onClick={() => setAgain(null)}>
            <div className="warp-tip warp-again" role="dialog" aria-modal="true" aria-labelledby="warp-again-title" onClick={(e) => e.stopPropagation()}>
              <h3 id="warp-again-title">
                Draw {again} again?
              </h3>
              <p>
                {tab === "region" ? `Region Pack · ${focus.label}` : tab === "brand" ? "Brand Pack" : "Regular Pack"}
              </p>
              {payFor(again) === "tickets" ? (
                <div className="warp-again-cost" aria-label={`${TICKET_NAME[ticketKind]}s before and after`}>
                  <span>
                    <TicketMark kind={ticketKind} className="tk-mark warp-mark" />
                    {tickets}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span data-short="false">
                    <TicketMark kind={ticketKind} className="tk-mark warp-mark" />
                    {tickets - again}
                  </span>
                </div>
              ) : (
                <div className="warp-again-cost" aria-label="Credits before and after">
                  <span>
                    <CreditMark />
                    {balance}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span data-short={balance < (again === 10 ? price10 : price1) ? "true" : "false"}>
                    <CreditMark />
                    {balance - (again === 10 ? price10 : price1)}
                  </span>
                </div>
              )}
              {payFor(again) === "credits" && balance < (again === 10 ? price10 : price1) ? (
                <p className="warp-again-short">
                  Not enough {CREDIT_NAME.toLowerCase()}: need {again === 10 ? price10 : price1}, you have {balance}.
                </p>
              ) : null}
              <div className="warp-again-act">
                <button type="button" className="warp-text" onClick={() => setAgain(null)} autoFocus>
                  Cancel
                </button>
                <button
                  type="button"
                  className="warp-draw"
                  disabled={payFor(again) === "credits" && balance < (again === 10 ? price10 : price1)}
                  onClick={() => {
                    const n = again;
                    setAgain(null);
                    draw(n);
                  }}
                >
                  <span className="warp-draw-label">Draw {again}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {poolOpen && tab !== "crystals" ? (
          <PackContents
            title={tab === "regular" ? "Everything in the Regular Pack" : tab === "brand" ? "Everything in the Brand Pack" : `Everything in the Region Pack · ${focus.label}`}
            sections={packSections(
              tab,
              regularLooks,
              rainbowLooks,
              (tab === "region" ? regionLooks : featuredLooks).filter((l): l is NonNullable<typeof l> => !!l),
              owned,
              ownedItems,
            )}
            onClose={closePool}
          />
        ) : null}

        {detailsOpen && (
          <div className="warp-shade" onClick={() => setDetailsOpen(false)}>
            <div className="warp-tip" role="dialog" aria-label="Published odds" onClick={(e) => e.stopPropagation()}>
              <h3>Published odds</h3>
              <p>
                {tab === "brand" || tab === "region"
                  ? "Chance per draw. Featured themes are the ones available now."
                  : BANNER.line}{" "}
                {softLine(pack, content)}
              </p>
              <table className="gacha-odds">
                <tbody>
                  {odds.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <span className="gacha-odds-label">
                          {row.stars ? <StarTag stars={row.stars} /> : null}
                          {row.label}
                        </span>
                      </td>
                      <td>{row.chance}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="pill-btn gacha-go" onClick={() => setDetailsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}

        {preview && lookOf(preview.id) ? (
          <div className="gacha-pick gacha-preview" role="dialog" aria-label={`Preview of ${lookOf(preview.id)?.name}`}>
            <header>
              <h3>Preview</h3>
              <button type="button" className="theme-unlock-x" aria-label="Close preview" onClick={() => setPreview(null)}>
                ×
              </button>
            </header>
            <LookCard look={lookOf(preview.id)!} className="gacha-preview-card" />
            <p className="hint">
              {preview.repeat
                ? `Already yours. Repeat: +${crystalValueFor(preview)} ${crystalWord(preview)}.`
                : preview.brand
                  ? "New Brand look. It is unlocked."
                  : preview.rainbow
                    ? "New rainbow look. It is unlocked."
                    : "New look. It is unlocked."}
            </p>
          </div>
        ) : null}

        {celebrate.length > 0 && lookOf(celebrate[0]) ? (
          <BrandUnlock
            key={celebrate[0]}
            look={lookOf(celebrate[0])!}
            remaining={celebrate.length - 1}
            doneLabel={phase === "drawing" ? "Back to draw" : "Continue"}
            onDone={nextCelebration}
          />
        ) : null}

        {pickKind && (
          <div className="gacha-pick" role="dialog" aria-label="Choose a theme">
            <header>
              <h3>{pickKind === "crystals" ? "Pick a Regular theme" : "Pick a Brand theme"}</h3>
              <button type="button" className="theme-unlock-x" aria-label="Close pick" onClick={() => setPickKind(null)}>
                ×
              </button>
            </header>
            {pickPool.length === 0 ? (
              <p className="hint">
                {pickKind === "prisms" ? "You own both featured themes. Special crystals wait for the next ones." : "No Regular themes left to unlock."}
              </p>
            ) : (
              <ul>
                {pickPool.map((look) => (
                  <li key={look.id}>
                    <button type="button" onClick={() => spendPick(look.id)}>
                      <i style={{ background: look.palette?.accent ?? "var(--accent)" }} />
                      {look.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
