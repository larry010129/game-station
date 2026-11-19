/**
 * The Wiki's Skill tree section, built from the perk tree data itself (never from the workbook or the docs), so it
 * always matches the tree the Perks page draws. Data only: no React, storage or DOM. `taken` is the player's taken
 * node ids; a taken node counts as collected.
 *
 * Entries: one "How the skill tree works" page, one page per class, one per named node (keystones, Season Keys,
 * specials, pentagons, notables), and the small nodes grouped by name and effect (`kindKey`).
 */
import type { WikiEntry, WikiSection } from "./wikiData.ts";
import { CLASSES, isLive, LIVE_STATS, MAX_PENTAGONS, MAX_SQUARES, MAX_STARTS, NODES, regionById, TREE, pointsEarned, type PerkNode, type PerkNodeType } from "./perks.ts";
import { ALL_PAID_LEVEL, LAST_POINT_LEVEL, MAX_LEVEL } from "./playerLevel.ts";

/** What each shape is called, in the order the groups are shown. */
export const PERK_KIND: Partial<Record<PerkNodeType, { one: string; many: string; rank: number }>> = {
  keystone: { one: "Keystone", many: "Keystones", rank: 6 },
  gate: { one: "Season Key", many: "Season Keys", rank: 5 },
  special: { one: "Special", many: "Specials", rank: 4 },
  pentagon: { one: "Pentagon", many: "Pentagons", rank: 3 },
  notable: { one: "Notable", many: "Notables", rank: 2 },
  small: { one: "Small node", many: "Small nodes", rank: 1 },
  bridge: { one: "Small node", many: "Small nodes", rank: 1 },
};

/** Higher sorts first under "Kind": rules, classes, then keystones down to small nodes. */
export function perkRank(e: Pick<WikiEntry, "group">): number {
  if (e.group === "How it works") return 9;
  if (e.group === "Classes") return 8;
  return Object.values(PERK_KIND).find((k) => k?.many === e.group)?.rank ?? 0;
}

const NAMED: readonly PerkNodeType[] = ["keystone", "gate", "special", "pentagon", "notable"];
const label = (stat: string) => TREE.statLabels?.[stat]?.[0] ?? stat;
const costText = (n: PerkNode) =>
  n.type === "gate" || n.type === "special" ? "Free, holds a square slot" : n.type === "pentagon" ? "Free, holds a pentagon slot" : `${n.cost} point${n.cost === 1 ? "" : "s"}`;
const hay = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ").toLowerCase();

/** The downside line of a trade-off node ("−5% Income from quests"), when its second value is negative. */
function downside(n: PerkNode): string | null {
  if (!n.stat2 || n.value2 == null || n.value2 >= 0) return null;
  const [text, unit] = TREE.statLabels?.[n.stat2] ?? [n.stat2, ""];
  return `${n.value2}${unit} ${text}`.replace(/^-/, "−");
}

function nodeEntry(n: PerkNode, taken: ReadonlySet<string>): WikiEntry {
  const cls = regionById(n.region);
  const kind = PERK_KIND[n.type]!;
  const live = isLive(n);
  const minus = downside(n);
  const facts: [string, string][] = [
    ["Class", `${cls.name} (${cls.focus})`],
    ["Kind", kind.one],
    ["Cost", costText(n)],
  ];
  if (n.passive) facts.push(["Passive", n.passive]);
  if (minus) facts.push(["Downside", minus]);
  facts.push(["Works now", live ? "Yes" : "Not active yet"], ["Taken", taken.has(n.id) ? "Yes" : "No"]);
  const sections: WikiSection[] = [
    {
      title: "Effect",
      status: live ? "usable" : "not-yet",
      blocks: live ? [{ t: "p", text: n.effect }] : [{ t: "p", text: n.effect }, { t: "p", text: "This node can be taken, but the app does not apply its effect yet." }],
    },
  ];
  if (n.type === "gate") sections.push({ title: "Season Key", blocks: [{ t: "p", text: `A player holds one Season Key. It opens Season Pass levels 46 to 60 and uses one of the ${MAX_SQUARES} square slots.` }] });
  return {
    id: `perk:${n.id}`,
    category: "perks",
    group: kind.many,
    name: n.name,
    type: `${kind.one} · ${cls.name}`,
    summary: n.effect,
    status: live ? "usable" : "not-yet",
    swatch: { kind: "perk", icon: n.icon, color: cls.color, shape: n.type },
    owned: taken.has(n.id),
    obtainedFrom: `Skill tree · ${cls.name}`,
    chance: 0,
    perkClass: cls.name,
    perkCost: n.cost,
    facts,
    sections,
    haystack: hay(n.name, n.effect, n.passive, minus ?? "", cls.name, cls.focus, kind.one, "skill tree perk"),
  };
}

function classEntry(region: (typeof CLASSES)[number], taken: ReadonlySet<string>, starts: readonly string[]): WikiEntry {
  const nodes = NODES.filter((n) => n.region === region.id);
  const of = (t: PerkNodeType) => nodes.filter((n) => n.type === t);
  const line = (n: PerkNode) => `${n.name}: ${n.effect}`;
  const cost = nodes.reduce((s, n) => s + n.cost, 0);
  const have = nodes.filter((n) => taken.has(n.id)).length;
  const key = of("gate")[0];
  const sections: WikiSection[] = [
    { title: "About", blocks: [{ t: "p", text: `${region.name} is the ${region.focus} class: its nodes are about ${region.focus.toLowerCase()}.` }] },
  ];
  if (key) sections.push({ title: "Season Key", blocks: [{ t: "list", items: [line(key)] }] });
  for (const t of ["keystone", "special", "pentagon"] as const) {
    const list = of(t);
    if (list.length) sections.push({ title: PERK_KIND[t]!.many, blocks: [{ t: "list", items: list.map(line) }] });
  }
  return {
    id: `perk-class:${region.id}`,
    category: "perks",
    group: "Classes",
    name: region.name,
    type: `Class · ${region.focus}`,
    summary: `The ${region.focus} class: ${nodes.length} nodes, ${cost} points to fill.`,
    swatch: { kind: "perk", icon: `class-${region.id}`, color: region.color, shape: "class" },
    owned: starts.includes(`${region.id}-class`),
    obtainedFrom: "Skill tree",
    chance: 0,
    perkClass: region.name,
    perkCost: cost,
    facts: [
      ["Focus", region.focus],
      ["Nodes", String(nodes.length)],
      ["Notables", String(of("notable").length)],
      ["Keystones", String(of("keystone").length)],
      ["Points to fill", String(cost)],
      ["You hold", `${have} of ${nodes.length}`],
      ["Starting class", starts.includes(`${region.id}-class`) ? "Yes" : "No"],
    ],
    sections,
    haystack: hay(region.name, region.focus, "class skill tree perk", key?.name),
  };
}

function rulesEntry(): WikiEntry {
  const levels = [1, 10, 50, 100, 150, 200, ALL_PAID_LEVEL, LAST_POINT_LEVEL].filter((l, i, a) => l <= MAX_LEVEL && a.indexOf(l) === i).sort((a, b) => a - b);
  const kinds = (["start", "class", "small", "bridge", "notable", "keystone", "gate", "special", "pentagon"] as PerkNodeType[])
    .map((t) => [t, NODES.filter((n) => n.type === t)] as const)
    .filter(([, list]) => list.length);
  const kindName = (t: PerkNodeType) => (t === "start" ? "Station Core" : t === "class" ? "Class start" : t === "bridge" ? "Bridge (small)" : PERK_KIND[t]!.one);
  const costs = (list: readonly PerkNode[]) => {
    const set = [...new Set(list.map((n) => n.cost))].sort((a, b) => a - b);
    return set.length === 1 ? String(set[0]) : `${set[0]}–${set[set.length - 1]}`;
  };
  const treeCost = NODES.reduce((s, n) => s + n.cost, 0);
  return {
    id: "perk:rules",
    category: "perks",
    group: "How it works",
    name: "How the skill tree works",
    type: "Rules",
    summary: `Perk Points come from your player level and are spent on a tree of ${NODES.length} nodes in ${CLASSES.length} classes around Station Core.`,
    swatch: { kind: "perk", icon: "core", color: "var(--accent)", shape: "start" },
    owned: false,
    obtainedFrom: "Skill tree",
    chance: 0,
    facts: [
      ["Nodes", String(NODES.length)],
      ["Classes", String(CLASSES.length)],
      ["Points to fill", String(treeCost)],
      ["Starting classes", String(MAX_STARTS)],
      ["Square slots", String(MAX_SQUARES)],
      ["Pentagon slots", String(MAX_PENTAGONS)],
    ],
    sections: [
      {
        title: "Perk Points",
        blocks: [
          { t: "p", text: "Points come from your player level, which rises with the time the app runs. Early levels pay more points than late ones." },
          { t: "table", caption: "Points earned by player level", head: ["Player level", "Points"], rows: levels.map((l) => [String(l), String(pointsEarned(l))]) },
        ],
      },
      {
        title: "Taking nodes",
        blocks: [
          {
            t: "list",
            items: [
              "Click a node on the Perks page to see its path and cost, then click it again to take the whole path.",
              `The first ${MAX_STARTS} paths out of Station Core set your starting classes.`,
              `Squares (Season Keys and Specials) cost no points, but you hold at most ${MAX_SQUARES}. Pentagons cost none either; you hold at most ${MAX_PENTAGONS}.`,
              "Band VI can be taken in one class only, and in it only one of its three paths.",
              "If your points fall below what you spent, your newest nodes pause until you earn more.",
              "One free reset a calendar month gives every point back, starting classes included.",
            ],
          },
        ],
      },
      { title: "Node kinds", blocks: [{ t: "table", caption: "Every node in the tree", head: ["Kind", "Count", "Point cost"], rows: kinds.map(([t, list]) => [kindName(t), String(list.length), costs(list)]) }] },
      { title: "What works today", blocks: [{ t: "p", text: "These effects are applied by the app now; every other node can be taken but says Not active yet." }, { t: "list", items: [...LIVE_STATS].map(label) }] },
    ],
    haystack: hay("how the skill tree works perk points rules reset starting class squares pentagons band"),
  };
}

/** Every Skill tree entry for the Wiki. */
export function buildPerkWiki(taken: readonly string[], starts: readonly string[]): WikiEntry[] {
  const has = new Set(taken);
  const out: WikiEntry[] = [rulesEntry(), ...CLASSES.map((r) => classEntry(r, has, starts))];
  for (const n of NODES) if (NAMED.includes(n.type)) out.push(nodeEntry(n, has));
  // Small nodes and bridges: one entry per node, grouped in the grid by name and effect (kindKey).
  for (const n of NODES) {
    if (n.type !== "small" && n.type !== "bridge") continue;
    const e = nodeEntry(n, has);
    out.push({ ...e, group: "Small nodes", type: "Small node", kindKey: `small:${n.name}:${n.effect}`, kindName: n.name });
  }
  return out;
}
