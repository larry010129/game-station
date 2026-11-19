/**
 * The Draw Wiki: every drawable prize and draw rule as a wiki page, built from the live release (never from
 * GACHA REDESIGN.md, whose numbers are older). Data only: no React, storage or DOM. The pools come in from the
 * caller (the Draw page's own pool helpers), so the wiki and the Draw page always agree on what can drop.
 */
import { tagParts, type ThemeTags } from "../content/brandTags.ts";
import {
  cardBuyOf,
  cardPackOf,
  cardPackOn,
  checkinPrizesOf,
  getContent,
  isCompanyPack,
  packTable,
  rainbowPityAfter,
  regionPackOn,
  softPityFor,
  TICKET_NAME,
  ticketFor,
  widgetPackOf,
  widgetStatus,
  type ItemDef,
  type ItemKind,
  type PackId,
  type SoftPity,
} from "./gachaContent.ts";
import { cardSkinById } from "./cardSkins.ts";
import { drawableWidgets, WIDGET_COST, WIDGET_IDS, widgetPackOn } from "./widgets.ts";
import { LOOK_COST } from "./gachaEngine.ts";
import { itemTitle } from "./itemNames.ts";
import type { ThemeDef } from "./palette.ts";
import { isCreditBuyableTheme } from "./themeCatalog.ts";
import { LOOKS_WAITING_CAP } from "./questEngine.ts";

export type WikiCategory = "themes" | "skins" | "widgets" | "items" | "mechanics" | "perks";
/** How far an item works today. Only alert sounds can be heard (as a preview); the rest are kept but not used yet. */
export type WikiStatus = "usable" | "preview" | "not-yet" | "undecided";
export type WikiSwatch =
  | { kind: "look"; look: ThemeDef }
  | { kind: "skin"; id: string }
  | { kind: "item"; item: ItemKind }
  | { kind: "widget"; id: string; name: string }
  | { kind: "rule" }
  /** A skill tree node: its icon drawing, its class colour and its shape. */
  | { kind: "perk"; icon: string; color: string; shape: string };
export type WikiBlock =
  | { t: "p"; text: string }
  | { t: "list"; items: string[] }
  | { t: "table"; caption: string; head: string[]; rows: string[][] };
export interface WikiSection {
  title: string;
  status?: WikiStatus;
  blocks: WikiBlock[];
}
export interface WikiEntry {
  id: string;
  category: WikiCategory;
  /** The list heading it sits under on its category page and in the navbox. */
  group: string;
  name: string;
  stars?: 4 | 5;
  /** "Theme", "Card skin", "Wallpaper"… */
  type: string;
  /** One line: what it is or does. */
  summary: string;
  status?: WikiStatus;
  swatch: WikiSwatch;
  tags?: ThemeTags;
  /** In a pack's featured slot right now. */
  featured?: boolean;
  /** The player has it (a stackable item: at least one in the stack). Draw rules: false. */
  owned: boolean;
  /** Short "Brand Pack · Card Pack", or why it cannot drop now. */
  obtainedFrom: string;
  /** Best chance per draw in any pack, in percent (0: cannot drop right now). */
  chance: number;
  /** Infobox rows. */
  facts: [string, string][];
  sections: WikiSection[];
  /** Lower-case text the search box matches. */
  haystack: string;
  /** Entries with the same key share one tile in the grid (items do this by kind; small skill tree nodes by name and effect). */
  kindKey?: string;
  /** The shared tile's name, when it is not the entry type. */
  kindName?: string;
  /** Skill tree: the node's class name and point cost, for sorting. */
  perkClass?: string;
  perkCost?: number;
}

export const STATUS_LABEL: Record<WikiStatus, string> = {
  usable: "Usable",
  preview: "Preview only",
  "not-yet": "Not usable yet",
  undecided: "Not decided yet",
};

export const CATEGORY_NAME: Record<WikiCategory, string> = {
  themes: "Themes",
  skins: "Card skins",
  widgets: "Widgets",
  items: "Items",
  mechanics: "Draw rules",
  perks: "Skill tree",
};

/** What each item kind is meant to do (GACHA REDESIGN.md, item catalog) and whether the app uses it yet. */
export const ITEM_INFO: Record<ItemKind, { name: string; effect: string; status: WikiStatus }> = {
  "streak-freeze": {
    name: "Streak Freeze",
    effect: "Counts as a check-in on a day you miss, so one gap does not break the weekly theme quest. Every one you win adds to your stack.",
    status: "not-yet",
  },
  "alert-sound": {
    name: "Alert sound",
    effect: "A tone for station alerts. Each sound is its own unlock.",
    status: "preview",
  },
  font: { name: "Font", effect: "Adds a font to the theme editor's font list.", status: "not-yet" },
  "name-flair": { name: "Name flair", effect: "A colour or small mark on your name in the top bar.", status: "not-yet" },
  wallpaper: {
    name: "Wallpaper",
    effect: "A picture you can set as the dashboard background. Each wallpaper is its own unlock.",
    status: "not-yet",
  },
  boot: {
    name: "Boot screen",
    effect: "A style for the start-up screen. Each style is its own unlock, and boot screens drop less often than wallpapers.",
    status: "not-yet",
  },
  "layout-slot": { name: "Layout slot", effect: "Room for one more saved dashboard layout.", status: "not-yet" },
  "custom-upload": {
    name: "Custom upload unlock",
    effect: "Lets you upload a file of your own. Whether it covers a wallpaper, a theme or a boot image is not decided yet.",
    status: "undecided",
  },
};

const STATUS_NOTE: Record<WikiStatus, string> = {
  usable: "",
  preview: "You can win it and hear it now. Choosing it as the tone for station alerts comes in a later app update.",
  "not-yet": "You can win and keep it now. It starts working in a later app update; what you own carries over.",
  undecided: "You can win and keep it now. What it unlocks is still being decided.",
};

type AnyPack = PackId | "cards" | "widgets";
const PACK_NAME: Record<AnyPack, string> = { regular: "Regular Pack", brand: "Brand Pack", region: "Region Pack", cards: "Card Pack", widgets: "Widget Pack" };

/** "1.4%", "0.08%", "<0.01%". */
export function pct(n: number): string {
  if (n <= 0) return "0%";
  if (n < 0.01) return "<0.01%";
  return `${n >= 1 ? n.toFixed(2).replace(/\.?0+$/, "") : n.toFixed(2)}%`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface WikiInput {
  /** Looks the player owns (theme ids). */
  ownedLooks: readonly string[];
  ownedSkins: readonly string[];
  /** One-time items owned. */
  ownedItems: readonly string[];
  /** Stackable item counts. */
  stacks: Readonly<Record<string, number>>;
  /** The Regular pool (Draw page `regularLookThemes`). */
  regular: readonly ThemeDef[];
  /** Rainbow Regular themes (Draw page `rainbowLookThemes`). */
  rainbow: readonly ThemeDef[];
  /** Every drawable company look (Brand group, Available). */
  company: readonly ThemeDef[];
  /** This rotation's Brand Pack featured ids. */
  brandFeatured: readonly string[];
  /** This week's Region Pack focus. */
  region: { label: string; ids: readonly string[] } | null;
  /** Published odds per pack, the rows the Draw page shows. */
  odds: Partial<Record<AnyPack, readonly { label: string; chance: number; stars?: 4 | 5 }[]>>;
  /** Dashboard cards owned (Widget Pack). */
  ownedWidgets?: readonly string[];
  /** Each dashboard card's name, group and blurb (layouts.ts CARDS), passed in so this module stays loadable in Node. */
  cards?: Readonly<Record<string, { name: string; group: string; blurb: string }>>;
}

interface Source {
  pack: AnyPack;
  chance: number;
}

function softText(guaranteedAt: number, soft: SoftPity | null): string {
  return soft && soft.from < guaranteedAt
    ? `the chance starts rising at draw ${soft.from} and reaches 100% by draw ${guaranteedAt}`
    : `guaranteed by draw ${guaranteedAt}`;
}

export function buildWiki(input: WikiInput): WikiEntry[] {
  const content = getContent();
  const cv = content.crystalValues;
  const themePacks: PackId[] = ["regular", "brand", ...(regionPackOn(content) ? (["region"] as const) : [])];
  const cardsOn = cardPackOn(content);
  const cp = cardPackOf(content);

  const wp = widgetPackOf(content);
  const widgetsOn = widgetPackOn(content);
  const ticketOf = (pack: AnyPack) => TICKET_NAME[pack === "cards" ? cp.ticket : pack === "widgets" ? wp.ticket : ticketFor(pack, content)];
  const pricesOf = (pack: AnyPack) =>
    pack === "cards" ? [cp.priceOne, cp.priceTen] : pack === "widgets" ? [wp.priceOne, wp.priceTen] : [packTable(pack, content).priceOne, packTable(pack, content).priceTen];
  const featuredOf = (pack: PackId): readonly string[] => (pack === "brand" ? input.brandFeatured : pack === "region" ? (input.region?.ids ?? []) : []);
  const regularPoolOf = (pack: PackId) => {
    const f = featuredOf(pack);
    return isCompanyPack(pack) ? input.regular.filter((t) => !f.includes(t.id)) : input.regular;
  };

  /** "How to obtain" table plus the short line for list pages. */
  const obtain = (sources: Source[], extra: string[]): { block: WikiBlock[]; short: string; best: number } => {
    const live = sources.filter((s) => s.chance > 0);
    const blocks: WikiBlock[] = [];
    if (live.length) {
      blocks.push({
        t: "table",
        caption: "Drop chance per draw",
        head: ["Pack", "Ticket", "1 draw", "10 draws", "Chance per draw"],
        rows: live.map((s) => {
          const [one, ten] = pricesOf(s.pack);
          return [PACK_NAME[s.pack], ticketOf(s.pack), `${one} Income`, `${ten} Income`, pct(s.chance)];
        }),
      });
    }
    if (extra.length) blocks.push({ t: "list", items: extra });
    return {
      block: blocks,
      short: live.length ? live.map((s) => PACK_NAME[s.pack]).join(" · ") : "Not in any pack right now",
      best: live.reduce((m, s) => Math.max(m, s.chance), 0),
    };
  };

  const haystack = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ").toLowerCase();
  const entries: WikiEntry[] = [];

  /* ---- Themes ---- */
  const lookPityLine = `Look pity: after ${content.lookPityAfter} draws in a pack without a theme, the next draw there is a Regular theme you do not own.`;
  const tenLine = "Every 10-draw holds at least one Regular theme.";
  const regularIds = new Set(input.regular.map((t) => t.id));

  const themeEntry = (t: ThemeDef, kind: "regular" | "rainbow" | "company"): WikiEntry => {
    const owned = input.ownedLooks.includes(t.id);
    const sources: Source[] = [];
    const extra: string[] = [];
    let repeat = "";
    let unlock = "Draw only";
    if (kind === "regular") {
      for (const p of themePacks) {
        const pool = regularPoolOf(p);
        if (pool.some((x) => x.id === t.id)) sources.push({ pack: p, chance: (packTable(p, content).weights.regularTheme * 100) / pool.length });
      }
      extra.push(lookPityLine, tenLine, `Pick it with ${plural(content.regularCrystalCost, "Regular fragment")} on the Draw page.`);
      if (isCreditBuyableTheme(t)) {
        unlock = `${LOOK_COST} Income`;
        extra.push(`Unlock it on the Themes page for ${LOOK_COST} Income, or with a weekly unlock pick.`);
      }
      repeat = `${plural(cv.regularTheme, "Regular fragment")}`;
    } else if (kind === "rainbow") {
      for (const p of themePacks) {
        const w = packTable(p, content).weights;
        const share = isCompanyPack(p) ? (w.rainbowRegular ?? 0) : w.brandTheme;
        if (share > 0 && input.rainbow.length) sources.push({ pack: p, chance: (share * 100) / input.rainbow.length });
      }
      if (sources.some((s) => s.pack === "regular")) {
        extra.push(`Regular Pack 5-star pity: ${softText(rainbowPityAfter("regular", content) + 1, softPityFor("regular", content))} since your last 5-star.`);
      }
      extra.push("Never sold for Income, weekly picks or fragments.");
      repeat = plural(cv.rainbowTheme ?? cv.regularTheme, "Regular fragment");
    } else {
      for (const p of themePacks.filter(isCompanyPack)) {
        const f = featuredOf(p);
        if (f.includes(t.id)) sources.push({ pack: p, chance: (packTable(p, content).weights.brandTheme * 100) / f.length });
      }
      if (sources.length) {
        for (const s of sources) {
          const p = s.pack as PackId;
          extra.push(`${PACK_NAME[p]} 5-star pity: ${softText(rainbowPityAfter(p, content) + 1, softPityFor(p, content))}, and the guaranteed 5-star is always a featured look.`);
        }
        extra.push(`While it is featured, unlock it with ${plural(content.brandPrismCost, "Special fragment")}.`);
      } else {
        extra.push(`Not featured right now. ${themePacks.includes("region") ? "The Brand and Region Packs each feature" : "The Brand Pack features"} two company looks at a time, so it can come back in a later rotation.`);
      }
      extra.push("Company looks are never sold for Income.");
      repeat = plural(cv.brandTheme, "Special fragment");
    }
    const o = obtain(sources, extra);
    const stars = kind === "regular" ? 4 : 5;
    const group = kind === "regular" ? "4★ Regular themes" : kind === "rainbow" ? "5★ Rainbow Regular themes" : "5★ Company themes";
    const summary =
      kind === "company"
        ? "A 5-star company look. Recolours the whole station (background, text, accent and cards) when you apply it on the Themes page."
        : kind === "rainbow"
          ? "A 5-star rainbow look, only from draws. Recolours the whole station when you apply it on the Themes page."
          : "Recolours the whole station (background, text, accent and cards) when you apply it on the Themes page.";
    const facts: [string, string][] = [
      ["Type", "Theme"],
      ["Rarity", `${stars}-star`],
      ["Made by", t.author],
    ];
    if (t.tags) facts.push(["Region", tagParts(t.tags).label]);
    facts.push(["Unlock", unlock], ["Repeat pays", repeat], ["Owned", owned ? "Yes" : "No"]);
    return {
      id: `theme:${t.id}`,
      category: "themes",
      group,
      name: t.name,
      stars,
      type: kind === "company" ? "Company theme" : kind === "rainbow" ? "Rainbow theme" : "Theme",
      summary,
      status: "usable",
      swatch: { kind: "look", look: t },
      tags: t.tags,
      featured: sources.length > 0 && kind === "company",
      owned,
      obtainedFrom: o.short,
      chance: o.best,
      facts,
      sections: [
        { title: "Description", blocks: [{ t: "p", text: summary }] },
        { title: "How to obtain", blocks: o.block },
        { title: "When you already own it", blocks: [{ t: "p", text: `Drawing it again pays ${repeat} instead.` }] },
      ],
      haystack: haystack(t.name, t.author, summary, group, t.tags?.country),
    };
  };

  for (const t of input.company) if (!regularIds.has(t.id)) entries.push(themeEntry(t, "company"));
  for (const t of input.rainbow) entries.push(themeEntry(t, "rainbow"));
  for (const t of input.regular) entries.push(themeEntry(t, "regular"));

  /* ---- Card skins ---- */
  if (cardsOn) {
    const buy = cardBuyOf(content);
    for (const stars of [5, 4] as const) {
      const ids = cp.skins.filter((s) => s.status === "Available" && s.stars === stars && cardSkinById(s.id)).map((s) => s.id);
      const share = stars === 5 ? cp.weights.five : cp.weights.four;
      for (const id of ids) {
        const def = cardSkinById(id)!;
        const owned = input.ownedSkins.includes(id);
        const extra = [
          `A 4-star or better skin is guaranteed within ${cp.fourPityAfter + 1} Card Pack draws.`,
          `5-star pity: ${softText(cp.fivePityAfter + 1, cp.softPity ?? null)} since your last 5-star skin.`,
        ];
        const price = stars === 5 ? buy.fivePrice : buy.fourPrice;
        if (price != null) extra.push(`Buy it outright on the Draw page for ${price} Income.`);
        if (stars === 4 && buy.crystalPick) extra.push(`Or pick it with ${plural(content.regularCrystalCost, "Regular fragment")}.`);
        const o = obtain([{ pack: "cards", chance: (share * 100) / Math.max(1, ids.length) }], extra);
        const repeat = plural(stars === 5 ? cp.crystalValues.five : cp.crystalValues.four, "Regular fragment");
        const summary = `${def.blurb} Restyles every dashboard card on top of any theme. Put it on from Themes → Card skins.`;
        entries.push({
          id: `skin:${id}`,
          category: "skins",
          group: stars === 5 ? "5★ Card skins (moving light)" : "4★ Card skins (still surfaces)",
          name: def.name,
          stars,
          type: "Card skin",
          summary,
          status: "usable",
          swatch: { kind: "skin", id },
          owned,
          obtainedFrom: o.short,
          chance: o.best,
          facts: [
            ["Type", "Card skin"],
            ["Rarity", `${stars}-star`],
            ["Look", stars === 5 ? "Animated" : "Still"],
            ["Buy", price != null ? `${price} Income` : "Draw only"],
            ["Repeat pays", repeat],
            ["Owned", owned ? "Yes" : "No"],
          ],
          sections: [
            { title: "Description", blocks: [{ t: "p", text: summary }] },
            { title: "How to obtain", blocks: o.block },
            { title: "When you already own it", blocks: [{ t: "p", text: `Drawing it again pays ${repeat} instead.` }] },
          ],
          haystack: haystack(def.name, summary, "card skin"),
        });
      }
    }
  }

  /* ---- Widgets (the dashboard cards themselves) ---- */
  for (const id of WIDGET_IDS) {
    const card = input.cards?.[id];
    if (!card) continue;
    const status = widgetStatus(id, content);
    const has = (input.ownedWidgets ?? []).includes(id);
    // A Hidden card is not announced yet: it stays off the wiki unless the player already has it.
    if (status === "Hidden" && !has) continue;
    const listed = wp.widgets.find((w) => w.id === id);
    const stars = listed?.stars ?? WIDGET_COST[id].stars;
    const extra: string[] = [];
    const sources: Source[] = [];
    if (status === "Available" && widgetsOn) {
      const ids = drawableWidgets(stars, content);
      sources.push({ pack: "widgets", chance: ((stars === 5 ? wp.weights.five : wp.weights.four) * 100) / Math.max(1, ids.length) });
      extra.push(
        `A 4-star or better card is guaranteed within ${wp.fourPityAfter + 1} Widget Pack draws.`,
        `5-star pity: ${softText(wp.fivePityAfter + 1, wp.softPity ?? null)} since your last 5-star card.`,
      );
    } else if (status === "Free") extra.push("Free: add it any time from Edit layout, Add cards.");
    else if (status === "Archived") extra.push("No longer in the Widget Pack. Players who already have it keep it.");
    if (status !== "Free") extra.push("A card already on your dashboard before it was locked stays yours.");
    const o = obtain(sources, extra);
    const repeat = plural(stars === 5 ? wp.crystalValues.five : wp.crystalValues.four, "Regular fragment");
    const statusName = status === "Available" ? "Drawable" : status;
    const summary = `${card.blurb}. Add it from Edit layout, Add cards${status === "Free" ? "" : ", once you have it"}.`;
    entries.push({
      id: `widget:${id}`,
      category: "widgets",
      group: card.group,
      name: card.name,
      stars,
      type: "Dashboard card",
      summary,
      status: "usable",
      swatch: { kind: "widget", id, name: card.name },
      owned: status === "Free" || has,
      obtainedFrom: status === "Free" ? "Free" : o.short,
      chance: o.best,
      facts: [
        ["Type", "Dashboard card"],
        ["Rarity", `${stars}-star`],
        ["Group", card.group],
        ["Status", statusName],
        ["Repeat pays", status === "Free" ? "Not drawn" : repeat],
        ["Owned", status === "Free" ? "Free" : has ? "Yes" : "No"],
      ],
      sections: [
        { title: "Description", blocks: [{ t: "p", text: summary }] },
        { title: "Resource use", blocks: [{ t: "p", text: WIDGET_COST[id].use }, { t: "p", text: stars === 5 ? "5-star: one of the cards that works hardest, so the limiter holds it back during a game." : "4-star: light to run." }] },
        { title: "How to obtain", blocks: o.block },
        ...(status === "Free" ? [] : [{ title: "When you already own it", blocks: [{ t: "p" as const, text: `Drawing it again pays ${repeat} instead.` }] }]),
      ],
      haystack: haystack(card.name, card.group, card.blurb, "widget dashboard card", statusName),
    });
  }

  /* ---- Items ---- */
  const reg = packTable("regular", content);
  const innerShare = (table: { betterInner: typeof reg.betterInner; commonInner: typeof reg.commonInner }, kind: ItemKind): number => {
    const bi = table.betterInner;
    const ci = table.commonInner;
    const map: Partial<Record<ItemKind, number>> = {
      wallpaper: bi.wallpaper,
      boot: bi.boot,
      "layout-slot": bi.layout,
      "streak-freeze": ci.streakFreeze,
      "alert-sound": ci.alert,
      font: ci.font,
      "name-flair": ci.flair,
    };
    return map[kind] ?? 0;
  };
  const checkin = checkinPrizesOf(content);
  const kindCount = (kind: ItemKind) => content.items.filter((i) => i.kind === kind).length;

  for (const item of content.items as readonly ItemDef[]) {
    const info = ITEM_INFO[item.kind];
    const count = Math.max(1, kindCount(item.kind));
    const sources: Source[] = [];
    for (const p of themePacks) {
      const t = packTable(p, content);
      const w = t.weights;
      const chance =
        item.kind === "custom-upload"
          ? (w.customUpload * 100) / count
          : ((item.tier === "better" ? w.better : w.common) * innerShare(t, item.kind) * 100) / count;
      sources.push({ pack: p, chance });
    }
    if (cardsOn && item.kind !== "custom-upload") {
      const share = item.tier === "better" ? cp.weights.better : cp.weights.common;
      sources.push({ pack: "cards", chance: (share * innerShare(reg, item.kind) * 100) / count });
    }
    const extra: string[] = [];
    checkin.forEach((prize, day) => {
      if (prize.kind === "item" && prize.id === item.id) extra.push(`Daily check-in board, day ${day + 1}${prize.count > 1 ? ` (${prize.count} of them)` : ""}.`);
    });
    if (item.kind === "streak-freeze") extra.push(`Once draws have given you ${content.weeklyPickCap} weekly unlock picks this week, the pick's chance moves to Streak Freeze until Monday.`);
    const o = obtain(sources, extra);
    const name = itemTitle(item.id);
    const tierName = item.tier === "better" ? "Better" : item.tier === "common" ? "Common" : "Company packs only";
    const repeatValue = item.tier === "better" ? cv.better : item.tier === "common" ? cv.common : cv.customUpload;
    const repeat = item.stackable ? "Never repeats" : plural(repeatValue, "Regular fragment");
    const ownedText = item.stackable ? `${input.stacks[item.id] ?? 0} in stack` : input.ownedItems.includes(item.id) ? "Yes" : "No";
    const notes = STATUS_NOTE[info.status];
    entries.push({
      id: `item:${item.id}`,
      category: "items",
      group: item.tier === "better" ? "Better items" : item.tier === "common" ? "Common items" : "Company-pack items",
      name,
      type: info.name,
      summary: info.effect,
      status: info.status,
      swatch: { kind: "item", item: item.kind },
      owned: item.stackable ? (input.stacks[item.id] ?? 0) > 0 : input.ownedItems.includes(item.id),
      obtainedFrom: o.short,
      chance: o.best,
      facts: [
        ["Type", info.name],
        ["Tier", tierName],
        ["Kind", item.stackable ? "Stackable" : "One-time"],
        ["Repeat pays", repeat],
        ["Owned", ownedText],
        ["Status", STATUS_LABEL[info.status]],
      ],
      sections: [
        { title: "Effect", status: info.status, blocks: [{ t: "p", text: info.effect }, ...(notes ? [{ t: "p" as const, text: notes }] : [])] },
        { title: "How to obtain", blocks: o.block },
        {
          title: "When you already own it",
          blocks: [{ t: "p", text: item.stackable ? "It stacks, so every win adds one more and nothing is wasted." : `Drawing it again pays ${repeat} instead.` }],
        },
      ],
      haystack: haystack(name, info.name, info.effect, tierName),
    });
  }

  /* ---- Draw rules ---- */
  const allPacks: AnyPack[] = [...themePacks, ...(cardsOn ? (["cards"] as const) : []), ...(widgetsOn ? (["widgets"] as const) : [])];
  const rule = (id: string, name: string, summary: string, facts: [string, string][], sections: WikiSection[]): WikiEntry => ({
    id: `rule:${id}`,
    category: "mechanics",
    group: "Draw rules",
    name,
    type: "Draw rule",
    summary,
    swatch: { kind: "rule" },
    owned: false,
    obtainedFrom: "",
    chance: 0,
    facts,
    sections,
    haystack: haystack(name, summary),
  });

  entries.push(
    rule(
      "packs",
      "Packs",
      "Each pack has its own price, ticket and prize table. The table rolls once per draw.",
      [
        ["Packs", String(allPacks.length)],
        ["Ticket kinds", "Regular, Special"],
      ],
      [
        {
          title: "Prices and tickets",
          blocks: [
            {
              t: "table",
              caption: "What each pack costs",
              head: ["Pack", "Ticket", "1 draw", "10 draws"],
              rows: allPacks.map((p) => {
                const [one, ten] = pricesOf(p);
                return [PACK_NAME[p], ticketOf(p), `${one} Income`, `${ten} Income`];
              }),
            },
            { t: "p", text: "Draw Tickets of the pack's kind pay first, one per draw, so a 10-draw needs 10 of them. Without enough, the draw costs Income." },
          ],
        },
        ...allPacks.map(
          (p): WikiSection => ({
            title: `${PACK_NAME[p]} odds`,
            blocks: [
              {
                t: "table",
                caption: `${PACK_NAME[p]} chance per draw`,
                head: ["Prize", "Chance per draw"],
                rows: (input.odds[p] ?? []).map((r) => [r.stars ? `${r.stars}★ ${r.label}` : r.label, pct(r.chance)]),
              },
            ],
          }),
        ),
      ],
    ),
    rule(
      "pity",
      "Pity and guarantees",
      "Pity counts your draws without a rare prize and forces one before the count runs out.",
      [
        ["Look pity", `${content.lookPityAfter + 1} draws`],
        ["5-star (Regular)", `${rainbowPityAfter("regular", content) + 1} draws`],
      ],
      [
        {
          title: "Themes",
          blocks: [
            { t: "p", text: lookPityLine },
            { t: "p", text: tenLine },
            {
              t: "table",
              caption: "5-star pity per pack",
              head: ["Pack", "5-star guaranteed by", "Chance starts rising at"],
              rows: themePacks.map((p) => {
                const at = rainbowPityAfter(p, content) + 1;
                const soft = softPityFor(p, content);
                return [PACK_NAME[p], `Draw ${at}`, soft && soft.from < at ? `Draw ${soft.from}` : "No early rise"];
              }),
            },
            { t: "p", text: `In the ${themePacks.includes("region") ? "Brand and Region Packs" : "Brand Pack"} the guaranteed 5-star is always one of the featured looks. Each pack keeps its own counters.` },
          ],
        },
        ...(cardsOn
          ? [
              {
                title: "Card Pack",
                blocks: [
                  { t: "p", text: `A 4-star or better skin is guaranteed within ${cp.fourPityAfter + 1} draws.` },
                  { t: "p", text: `A 5-star skin: ${softText(cp.fivePityAfter + 1, cp.softPity ?? null)} since your last one.` },
                ],
              } satisfies WikiSection,
            ]
          : []),
      ],
    ),
    rule(
      "currencies",
      "Currencies",
      "Income and Draw Tickets pay for draws. Repeats turn into fragments, which unlock a prize you choose.",
      [
        ["Regular pick", `${plural(content.regularCrystalCost, "Regular fragment")}`],
        ["Featured pick", `${plural(content.brandPrismCost, "Special fragment")}`],
      ],
      [
        {
          title: "Income (Payroll)",
          blocks: [{ t: "p", text: `Payroll pays it on this PC for your time on the station and for claimed quests. It pays for draws and unlocks Regular themes on the Themes page (${LOOK_COST} Income each).` }],
        },
        {
          title: "Draw Tickets",
          blocks: [
            { t: "p", text: "Regular Tickets and Special Tickets come from the daily check-in board. Each pack takes one kind:" },
            { t: "list", items: allPacks.map((p) => `${PACK_NAME[p]}: ${ticketOf(p)}`) },
          ],
        },
        {
          title: "Fragments",
          blocks: [
            {
              t: "table",
              caption: "What a repeat pays",
              head: ["Repeat", "Pays"],
              rows: [
                ["Common item", plural(cv.common, "Regular fragment")],
                ["Better item", plural(cv.better, "Regular fragment")],
                ["Custom upload unlock", plural(cv.customUpload, "Regular fragment")],
                ["4★ Regular theme", plural(cv.regularTheme, "Regular fragment")],
                ["5★ Rainbow Regular theme", plural(cv.rainbowTheme ?? cv.regularTheme, "Regular fragment")],
                ["5★ Company theme", plural(cv.brandTheme, "Special fragment")],
                ...(cardsOn
                  ? [
                      ["4★ Card skin", plural(cp.crystalValues.four, "Regular fragment")],
                      ["5★ Card skin", plural(cp.crystalValues.five, "Regular fragment")],
                    ]
                  : []),
              ],
            },
            {
              t: "list",
              items: [
                `Spend ${plural(content.regularCrystalCost, "Regular fragment")} to unlock a Regular theme you choose${cardsOn && cardBuyOf(content).crystalPick ? ", or a 4-star card skin" : ""}.`,
                `Spend ${plural(content.brandPrismCost, "Special fragment")} to unlock one of the featured company looks.`,
                "Stackable items and weekly picks never repeat. Fragments never turn into Income.",
              ],
            },
          ],
        },
      ],
    ),
    rule(
      "weekly-pick",
      "Weekly unlock pick",
      "A free theme pick. Redeem it on the Themes page for any locked Regular theme.",
      [
        ["From draws", `Up to ${content.weeklyPickCap} a week`],
        ["Can wait", `Up to ${LOOKS_WAITING_CAP}`],
      ],
      [
        {
          title: "How to obtain",
          blocks: [
            {
              t: "table",
              caption: "Weekly pick chance per draw",
              head: ["Pack", "Chance per draw"],
              rows: themePacks.map((p) => [PACK_NAME[p], pct(packTable(p, content).weights.pick * 100)]),
            },
            {
              t: "list",
              items: [
                "The Weekly theme quest: check in on 5 different days in a week.",
                `Draws give at most ${content.weeklyPickCap} a week (Monday to Sunday). After that the row pays a Streak Freeze instead.`,
                `You can hold up to ${LOOKS_WAITING_CAP} picks waiting.`,
              ],
            },
          ],
        },
        { title: "When you already own it", blocks: [{ t: "p", text: "Picks stack, so they never repeat." }] },
      ],
    ),
  );

  // The CMS keeps some prizes off the wiki until they are announced (`wikiHiddenIds`). Draw rules always show, and
  // so does anything the player already owns (as Hidden themes do once owned).
  const hidden = new Set(content.wikiHiddenIds ?? []);
  // Themes, skins and items are listed by their bare id; dashboard cards as "widget:<id>", since a card id can also be
  // a theme id (both have "discord").
  const key = (e: WikiEntry) => (e.category === "widgets" ? e.id : e.id.slice(e.id.indexOf(":") + 1));
  return hidden.size ? entries.filter((e) => e.category === "mechanics" || e.owned || !hidden.has(key(e))) : entries;
}

