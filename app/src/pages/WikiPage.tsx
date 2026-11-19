import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from "react";
import { BookOpen, GitFork, LayoutDashboard, Palette, Sparkles, Square, Volume2, X, type LucideIcon } from "lucide-react";
import { featuredDrawableIds, oddsRows, rainbowLookThemes, regionPool, regularLookThemes } from "./DrawPage";
import { cardOddsRows } from "../state/cardEngine";
import { equipSkin, useCardSkins } from "../state/cardSkinStore";
import { featuredRegion } from "../state/gachaEngine";
import { cardPackOn, regionPackOn } from "../state/gachaContent";
import { ITEM_ICON } from "../state/itemFace";
import { readItems } from "../state/items";
import { getThemeCatalogVersion, isBrandTheme, listDrawableThemes, subscribeThemeCatalog } from "../state/themeCatalog";
import { buildWiki, CATEGORY_NAME, pct, STATUS_LABEL, type WikiBlock, type WikiCategory, type WikiEntry, type WikiStatus } from "../state/wikiData";
import { playAlertPreview } from "../lib/previewSound";
import { LookCard } from "../components/LookCard";
import { SkinSample } from "../components/SkinSample";
import { WidgetSample } from "../components/WidgetSample";
import { useWidgets } from "../state/widgetStore";
import { widgetPackOn } from "../state/widgets";
import { CARDS } from "../layout/layouts";
import { StarTag } from "../components/StarTag";
import { TagPills } from "../components/TagPills";
import { Segmented } from "../components/Segmented";
import { CardShowcase, type ShowcaseItem, type ShowcaseSet } from "../components/CardShowcase";
import { CollectionHub, type HubNode } from "../components/CollectionHub";
import { ArrowDownWideNarrow, ArrowLeft, ArrowUpNarrowWide, Trophy } from "lucide-react";
import { ACHIEVEMENTS, tierTally } from "../state/achievements";
import { useAchievements } from "../state/useAchievements";
import { usePerks } from "../state/perkStore";
import { buildPerkWiki, perkRank } from "../state/perkWiki";
import { PERK_ICON_SYMBOLS } from "../content/perkIcons";

const CATEGORIES: WikiCategory[] = ["themes", "skins", "widgets", "items", "perks", "mechanics"];
const CATEGORY_ICON: Record<WikiCategory, LucideIcon> = { themes: Palette, skins: Square, widgets: LayoutDashboard, items: Sparkles, mechanics: BookOpen, perks: GitFork };
/** The hub puts the biggest collection in the middle, then the rest around it. */
const HUB_ORDER: WikiCategory[] = ["themes", "skins", "widgets", "items", "mechanics", "perks"];
/** Below this width the details open in a dialog instead of sitting beside the grid. */
const NARROW = 700;
/** The skill tree's rules entry, and the rail group that opens it as a page. */
const RULES_ID = "perk:rules";
const RULES_GROUP = "How it works";
/** A Skill tree tile's kind, in the singular. */
const PERK_GROUP_ONE: Record<string, string> = {
  "How it works": "Rules",
  Classes: "Class",
  Keystones: "Keystone",
  "Season Keys": "Season Key",
  Specials: "Special",
  Pentagons: "Pentagon",
  Notables: "Notable",
  "Small nodes": "Small node",
};

type SortKey = "rarity" | "name" | "chance" | "class" | "cost";
type Sort = { key: SortKey; dir: "ascending" | "descending" };
const SORT_LABEL: Record<SortKey, string> = { rarity: "Rarity", name: "Name", chance: "Best chance per draw", class: "Class", cost: "Cost" };
/** The sorts each section offers. The skill tree's "rarity" is its node kind (rules, classes, keystones … small nodes). */
const sortsFor = (cat: WikiCategory): SortKey[] => (cat === "perks" ? ["rarity", "class", "cost", "name"] : cat === "mechanics" ? ["name"] : ["rarity", "name", "chance"]);
const sortLabel = (cat: WikiCategory, k: SortKey) => (cat === "perks" && k === "rarity" ? "Kind" : SORT_LABEL[k]);
/** Which way a sort starts: names A to Z, everything else highest first. */
const firstDir = (k: SortKey): Sort["dir"] => (k === "name" || k === "class" ? "ascending" : "descending");

/**
 * One tile in the grid. Themes, card skins and draw rules are one entry each. Items are one tile per kind (25
 * wallpapers share one tile), with the individual items listed in the details.
 */
interface Card {
  id: string;
  category: WikiCategory;
  group: string;
  name: string;
  stars?: 4 | 5;
  entry: WikiEntry;
  members?: WikiEntry[];
  owned: number;
  total: number;
  chance: number;
  featured: boolean;
  haystack: string;
}

function cardsOf(entries: WikiEntry[]): Card[] {
  const out: Card[] = [];
  const kinds = new Map<string, WikiEntry[]>();
  for (const e of entries) {
    const k = e.category === "items" ? e.type : e.kindKey;
    if (k) kinds.set(k, [...(kinds.get(k) ?? []), e]);
    else
      out.push({
        id: e.id,
        category: e.category,
        group: e.group,
        name: e.name,
        stars: e.stars,
        entry: e,
        owned: e.owned ? 1 : 0,
        // The skill tree's rules page is reading, not something to collect.
        total: e.id === "perk:rules" ? 0 : 1,
        chance: e.chance,
        featured: !!e.featured,
        haystack: e.haystack,
      });
  }
  for (const [type, members] of kinds) {
    const first = members[0];
    out.push({
      id: `kind:${type}`,
      category: first.category,
      group: first.group,
      name: first.kindName ?? type,
      entry: first,
      members: members.length > 1 ? members : undefined,
      owned: members.filter((m) => m.owned).length,
      total: members.length,
      chance: Math.max(...members.map((m) => m.chance)),
      featured: false,
      haystack: members.map((m) => m.haystack).join(" "),
    });
  }
  return out;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const rank = (c: Card) => (c.category === "perks" ? perkRank(c) : 0) + (c.stars ?? 0) * 10 + (c.group.startsWith("Company") ? 3 : c.group.startsWith("Better") ? 2 : 0) + (c.featured ? 1 : 0);
function sorted(list: Card[], sort: Sort): Card[] {
  const f = sort.dir === "ascending" ? 1 : -1;
  return [...list]
    .sort((a, b) => collator.compare(a.name, b.name))
    .sort((a, b) => {
      if (sort.key === "name") return f * collator.compare(a.name, b.name);
      if (sort.key === "chance") return f * (a.chance - b.chance);
      if (sort.key === "class") return f * collator.compare(a.entry.perkClass ?? "", b.entry.perkClass ?? "") || rank(b) - rank(a);
      if (sort.key === "cost") return f * ((a.entry.perkCost ?? 0) - (b.entry.perkCost ?? 0)) || rank(b) - rank(a);
      return f * (rank(a) - rank(b));
    });
}

const useDomId = () => useId().replace(/:/g, "");

/**
 * The Draw Wiki on one screen: section tabs, a group rail, a grid (or sortable list) of every prize, and its details
 * beside it. Nothing is more than one click away.
 */
export function WikiPage({
  owned,
  onOpenDraw,
  onOpenAchievements,
  onOpenPerks,
}: {
  owned: readonly string[];
  onOpenDraw: () => void;
  onOpenAchievements?: () => void;
  onOpenPerks?: () => void;
}) {
  const achievements = useAchievements();
  const epoch = useSyncExternalStore(subscribeThemeCatalog, getThemeCatalogVersion, getThemeCatalogVersion);
  const skins = useCardSkins();
  const widgets = useWidgets();
  const regionOn = regionPackOn();
  const perks = usePerks();
  const perkTaken = perks.state.taken;
  const perkStarts = perks.state.starts;
  const perkCards = useMemo(() => cardsOf(buildPerkWiki(perkTaken, perkStarts)), [perkTaken, perkStarts]);
  const prizeCards = useMemo(() => {
    const rainbow = rainbowLookThemes();
    const items = readItems();
    const focus = regionOn ? featuredRegion(regionPool()) : null;
    return cardsOf(
      buildWiki({
        ownedLooks: owned,
        ownedSkins: skins.owned,
        ownedItems: items.owned,
        stacks: items.stacks,
        regular: regularLookThemes(),
        rainbow,
        company: listDrawableThemes().filter(isBrandTheme),
        brandFeatured: featuredDrawableIds(),
        region: focus ? { label: focus.label, ids: focus.ids } : null,
        odds: {
          regular: oddsRows("regular", rainbow.length > 0),
          brand: oddsRows("brand", rainbow.length > 0),
          ...(regionOn ? { region: oddsRows("region", rainbow.length > 0) } : {}),
          ...(cardPackOn() ? { cards: cardOddsRows() } : {}),
          ...(widgetPackOn() ? { widgets: cardOddsRows(undefined, "widgets") } : {}),
        },
        ownedWidgets: widgets.owned,
        cards: CARDS,
      }),
    );
    // `epoch` re-reads the catalog when a content release lands.
  }, [epoch, owned, skins.owned, widgets.owned, regionOn]);
  const cards = useMemo(() => [...prizeCards, ...perkCards], [prizeCards, perkCards]);

  const [cat, setCat] = useState<WikiCategory>("themes");
  /** The Wiki opens on the collection hub; picking a collection (or searching) opens its section. */
  const [hub, setHub] = useState(true);
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<Sort>({ key: "rarity", dir: "descending" });
  const [picked, setPicked] = useState<Partial<Record<WikiCategory, string>>>({});
  const [said, setSaid] = useState("");

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (c: Card) => words.every((w) => c.haystack.includes(w));
  const inCat = cards.filter((c) => c.category === cat);
  // Skill tree groups follow the kind order (rules, classes, keystones … small nodes), not the tree's own order.
  const groups = [...new Set(inCat.map((c) => c.group))].sort((a, b) => (cat === "perks" ? perkRank({ group: b }) - perkRank({ group: a }) : 0));
  // The skill tree's "How it works" is a page of its own (opened from the rail), not a tile in the grid.
  const rulesCard = cat === "perks" ? inCat.find((c) => c.id === RULES_ID) : undefined;
  const onRulesPage = !!rulesCard && group === RULES_GROUP;
  const gridCat = rulesCard ? inCat.filter((c) => c !== rulesCard) : inCat;
  const shown = sorted(
    gridCat.filter((c) => (group === "all" || c.group === group) && matches(c)),
    sort,
  );
  const selected = shown.find((c) => c.id === picked[cat]) ?? shown[0];

  const root = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  // Draw rules read as a Quick Read note in a popup instead of the side panel.
  const note = useRef<HTMLDialogElement>(null);
  const [reading, setReading] = useState<Card | null>(null);
  useEffect(() => {
    if (reading && note.current && !note.current.open) note.current.showModal();
  }, [reading]);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < NARROW));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pick = (c: Card) => setPicked((p) => ({ ...p, [cat]: c.id }));
  /** Click or Enter: select it. A draw rule opens as a Quick Read note; anything else shows its details (in the dialog when narrow). */
  const open = (c: Card) => {
    pick(c);
    if (c.category === "mechanics") setReading(c);
    else if (narrow) dialog.current?.showModal();
  };
  const chooseCat = (c: WikiCategory) => {
    setCat(c);
    setGroup("all");
    // A sort the new section does not offer (chance on the skill tree, class on themes) goes back to its first one.
    if (!sortsFor(c).includes(sort.key)) setSort({ key: "rarity", dir: "descending" });
  };
  /** Typing a search: when this section has no match but another does, show that one. */
  const search = (text: string) => {
    setQ(text);
    if (text.trim()) setHub(false);
    const ws = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (c: Card) => ws.every((w) => c.haystack.includes(w));
    if (!ws.length || cards.some((c) => c.category === cat && hit(c))) return;
    const other = CATEGORIES.find((c) => cards.some((x) => x.category === c && hit(x)));
    if (other) chooseCat(other);
  };
  const chooseSort = (key: SortKey) => {
    const dir = sort.key === key && sort.dir === "descending" ? "ascending" : sort.key === key ? "descending" : firstDir(key);
    setSort({ key, dir });
    setSaid(`Sorted by ${sortLabel(cat, key)}, ${dir}`);
  };

  const [showcase, setShowcase] = useState<{ set: string; id?: string } | null>(null);
  const showcaseSets = useMemo((): ShowcaseSet[] => {
    if (!showcase) return [];
    const of = (c: WikiCategory) => cards.filter((x) => x.category === c).map((x) => toShowcase(x, skins.equipped, onOpenDraw));
    return [
      { id: "widgets", label: "Dashboard cards", items: of("widgets") },
      { id: "skins", label: "Card skins", items: of("skins") },
      { id: "themes", label: "Themes", items: of("themes") },
      { id: "items", label: "Items", items: of("items") },
    ];
  }, [showcase, cards, skins.equipped, onOpenDraw]);

  const titleId = useDomId();
  const tabBase = useDomId();
  const detailId = useDomId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = CATEGORIES.length;
    const to = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    chooseCat(CATEGORIES[to]);
    tabs.current[to]?.focus();
  };

  const tally = collected(inCat, cat === "perks" ? "Taken" : "Items");
  const detail = selected ? <Detail card={selected} onOpenDraw={onOpenDraw} onOpenPerks={onOpenPerks} onShowcase={() => {
        // The narrow details dialog is modal (top layer); close it so the showcase is not drawn under it.
        dialog.current?.close();
        setShowcase({ set: selected.category, id: selected.id });
      }} headingId={detailId} /> : null;

  return (
    <section className="wiki" ref={root} aria-labelledby={titleId}>
      <svg className="wiki-sprite" aria-hidden="true" focusable="false">
        <defs dangerouslySetInnerHTML={{ __html: PERK_ICON_SYMBOLS }} />
      </svg>
      <header className="wiki-top">
        <div className="wiki-title">
          <h2 id={titleId}>Wiki</h2>
          <p>Every prize the Draw page can give, what it does and where it drops, and every node of the skill tree. Numbers come from the current release and the tree itself.</p>
        </div>
        <form className="wiki-search" role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="wiki-sr" htmlFor={`${titleId}-q`}>
            Search the wiki
          </label>
          <input id={`${titleId}-q`} type="search" value={q} onChange={(e) => search(e.target.value)} placeholder="Search: Holo Foil, wallpaper, pity, keystone…" autoComplete="off" spellCheck={false} />
          {q && (
            <button type="button" className="wiki-link-btn" onClick={() => setQ("")}>
              Clear
            </button>
          )}
        </form>
      </header>

      {hub ? (
        <CollectionHub
          nodes={HUB_ORDER.filter((c) => cards.some((x) => x.category === c)).map((c): HubNode => {
            const list = cards.filter((x) => x.category === c);
            const t = collected(list);
            return {
              id: c,
              name: CATEGORY_NAME[c],
              icon: CATEGORY_ICON[c],
              owned: t.owned,
              total: c === "mechanics" ? list.length : t.total,
              unit: c === "mechanics" ? "pages" : c === "perks" ? "taken" : "owned",
              detail:
                c === "mechanics"
                  ? "Odds, pity and repeats"
                  : c === "perks"
                    ? `${list.filter((x) => x.group === "Classes").length} classes · ${list.filter((x) => x.group === "Keystones").length} keystones`
                    : c === "items"
                    ? `${list.length} kinds`
                    : t.rows.map(([label, have, of]) => `${label} ${have}/${of}`).join(" · "),
            } satisfies HubNode;
          }).concat(
            onOpenAchievements
              ? [
                  {
                    id: "achievements",
                    name: "Achievements",
                    icon: Trophy,
                    owned: Object.keys(achievements.state.unlocked).length,
                    total: ACHIEVEMENTS.length,
                    unit: "unlocked",
                    detail: (() => {
                      const t = tierTally(achievements.state);
                      return `Gold ${t.gold} · Silver ${t.silver} · Bronze ${t.bronze}`;
                    })(),
                  },
                ]
              : [],
          )}
          onOpen={(id) => {
            if (id === "achievements") {
              onOpenAchievements?.();
              return;
            }
            chooseCat(id as WikiCategory);
            setHub(false);
          }}
        />
      ) : (
        <>
      <button type="button" className="wiki-back" onClick={() => setHub(true)}>
        <ArrowLeft aria-hidden="true" strokeWidth={1.6} />
        Collection
      </button>
      <div className="wiki-cats" role="tablist" aria-label="Wiki sections">
        {CATEGORIES.map((c, i) => {
          const list = cards.filter((x) => x.category === c);
          if (!list.length) return null;
          const Icon = CATEGORY_ICON[c];
          const hits = words.length ? list.filter(matches).length : null;
          const t = collected(list);
          return (
            <button
              key={c}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${tabBase}-${c}`}
              aria-selected={c === cat}
              tabIndex={c === cat ? 0 : -1}
              className="wiki-cat"
              onClick={() => chooseCat(c)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              <Icon aria-hidden="true" strokeWidth={1.5} />
              <span className="wiki-cat-name">{CATEGORY_NAME[c]}</span>
              <span className="wiki-cat-count">{hits != null ? `${hits} found` : c === "mechanics" ? `${list.length} pages` : `${t.owned}/${t.total} ${c === "perks" ? "taken" : "owned"}`}</span>
            </button>
          );
        })}
      </div>

      <div className="wiki-panel" role="tabpanel" aria-labelledby={`${tabBase}-${cat}`} data-full={cat === "mechanics" || undefined} data-page={onRulesPage || undefined}>
        {groups.length > 1 && (
          <nav className="wiki-rail" aria-label={`${CATEGORY_NAME[cat]} groups`}>
            <ul>
              {["all", ...groups].map((g) => {
                const n = g === "all" ? gridCat.filter(matches).length : inCat.filter((c) => c.group === g && matches(c)).length;
                return (
                  <li key={g}>
                    <button type="button" aria-pressed={group === g} onClick={() => setGroup(g)}>
                      <span>{g === "all" ? "All" : g}</span>
                      <small>{g === RULES_GROUP ? "Page" : n}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {onRulesPage && rulesCard ? (
          <RulesPage card={rulesCard} onOpenPerks={onOpenPerks} />
        ) : (
        <div className="wiki-main">
          <div className="wiki-tools">
            <span className="wiki-shown">
              {shown.length} {shown.length === 1 ? "entry" : "entries"}
            </span>
            {cat !== "mechanics" && (
              <>
                <label className="wiki-sort">
                  <span>Sort</span>
                  <select
                    value={sort.key}
                    onChange={(e) => {
                      // Picking a new sort starts it in its usual direction; the arrow button reverses it.
                      const key = e.target.value as SortKey;
                      const dir = firstDir(key);
                      setSort({ key, dir });
                      setSaid(`Sorted by ${sortLabel(cat, key)}, ${dir}`);
                    }}
                  >
                    {sortsFor(cat).map((k) => (
                      <option key={k} value={k}>
                        {sortLabel(cat, k)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="wiki-sort-dir"
                  aria-label={sort.dir === "ascending" ? "Ascending. Switch to descending" : "Descending. Switch to ascending"}
                  title={sort.dir === "ascending" ? "Ascending" : "Descending"}
                  onClick={() => {
                    const dir = sort.dir === "ascending" ? "descending" : "ascending";
                    setSort({ key: sort.key, dir });
                    setSaid(`Sorted by ${sortLabel(cat, sort.key)}, ${dir}`);
                  }}
                >
                  {sort.dir === "ascending" ? <ArrowUpNarrowWide aria-hidden="true" strokeWidth={1.6} /> : <ArrowDownWideNarrow aria-hidden="true" strokeWidth={1.6} />}
                </button>
                {cat !== "perks" && (
                <Segmented
                  label="Show as"
                  value={view}
                  options={[
                    { value: "grid", label: "Grid" },
                    { value: "list", label: "List" },
                  ]}
                  onChange={setView}
                />
                )}
              </>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="wiki-empty" role="status">
              <p>{words.length ? `Nothing in ${CATEGORY_NAME[cat]} matches "${q.trim()}".` : "Nothing here in this release."}</p>
              {words.length > 0 && (
                <button type="button" className="wiki-link-btn" onClick={() => setQ("")}>
                  Clear the search
                </button>
              )}
            </div>
          ) : view === "list" && cat !== "mechanics" && cat !== "perks" ? (
            <ListView cards={shown} selected={selected} sort={sort} onSort={chooseSort} onOpen={open} label={`${CATEGORY_NAME[cat]}, ${shown.length} entries`} />
          ) : (
            <GridView cards={shown} selected={selected} onPick={pick} onOpen={open} label={CATEGORY_NAME[cat]} />
          )}
        </div>

        )}

        {!narrow && cat !== "mechanics" && !onRulesPage && (
          <aside className="wiki-detail" aria-labelledby={detailId}>
            {detail}
          </aside>
        )}
      </div>

      {cat !== "mechanics" && (
        <footer className="wiki-tally" aria-label="Collection">
          <span>Collected</span>
          {tally.rows.map(([label, have, of]) => (
            <span key={label} className="wiki-tally-row">
              <b>{label}</b> {have}/{of}
              <i aria-hidden="true" style={{ inlineSize: `${of ? (100 * have) / of : 0}%` }} />
            </span>
          ))}
        </footer>
      )}
        </>
      )}

      {showcase && showcaseSets.length > 0 && <CardShowcase sets={showcaseSets} start={showcase} onClose={() => setShowcase(null)} />}

      <p className="wiki-sr" role="status">
        {said}
      </p>

      <dialog ref={note} className="wiki-note" aria-labelledby={`${detailId}-note`} onClose={() => setReading(null)} {...({ closedby: "any" } as object)}>
        {reading && <QuickRead card={reading} headingId={`${detailId}-note`} />}
      </dialog>

      {narrow && (
        <dialog ref={dialog} className="wiki-dialog" aria-labelledby={detailId} {...({ closedby: "any" } as object)}>
          <form method="dialog" className="wiki-dialog-bar">
            <button type="submit" className="wiki-action">
              Close
            </button>
          </form>
          {detail}
        </dialog>
      )}
    </section>
  );
}

/**
 * The skill tree's "How it works" as a page in the Wiki panel: the node badge and title, the lead, the numbers that
 * define the tree in one row, then each section at reading width. Its tables get the full width a page has.
 */
function RulesPage({ card, onOpenPerks }: { card: Card; onOpenPerks?: () => void }) {
  const e = card.entry;
  const headingId = useDomId();
  return (
    <article className="wiki-page" aria-labelledby={headingId}>
      <header className="wiki-page-head">
        <Swatch card={card} small />
        <div>
          <h3 id={headingId}>{card.name}</h3>
          <p>{e.summary}</p>
        </div>
        {onOpenPerks && (
          <button type="button" className="wiki-action" onClick={onOpenPerks}>
            Open skill tree
          </button>
        )}
      </header>
      <dl className="wiki-page-facts">
        {e.facts.map(([k, v]) => (
          <div key={k}>
            <dd>{v}</dd>
            <dt>{k}</dt>
          </div>
        ))}
      </dl>
      <div className="wiki-page-body">
        {e.sections.map((s) => (
          <section key={s.title}>
            <h4>{s.title}</h4>
            {s.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}

/** A draw rule as a note to read: a Quick Read bar, the title, then every section. */
function QuickRead({ card, headingId }: { card: Card; headingId: string }) {
  const e = card.entry;
  return (
    <>
      <div className="wiki-note-bar">
        <span className="wiki-note-label">
          <BookOpen aria-hidden="true" strokeWidth={1.6} />
          Quick Read
        </span>
        <form method="dialog">
          <button type="submit" className="wiki-note-x" aria-label="Close" autoFocus>
            <X aria-hidden="true" strokeWidth={1.6} />
          </button>
        </form>
      </div>
      <div className="wiki-note-body">
        <h3 id={headingId}>{card.name}</h3>
        <p className="wiki-note-lead">{e.summary}</p>
        {e.sections.map((s) => (
          <section key={s.title}>
            <h4>{s.title}</h4>
            {s.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

/** Owned against total for a set of cards: by stars for looks and skins, one line for items. */
function collected(list: Card[], label = "Items"): { owned: number; total: number; rows: [string, number, number][] } {
  const owned = list.reduce((s, c) => s + c.owned, 0);
  const total = list.reduce((s, c) => s + c.total, 0);
  const rows: [string, number, number][] = [];
  for (const stars of [5, 4] as const) {
    const s = list.filter((c) => c.stars === stars);
    if (s.length) rows.push([`${stars}★`, s.reduce((n, c) => n + c.owned, 0), s.length]);
  }
  if (!rows.length) rows.push([label, owned, total]);
  return { owned, total, rows };
}

/* ---------------- Grid ---------------- */

/**
 * The prize grid: a listbox whose selection follows focus. Arrow keys move by what is visually next to the focused
 * tile (edge-based, nearest in the row or column first); Home and End jump to the ends; Enter opens it.
 */
function GridView({ cards, selected, onPick, onOpen, label }: { cards: Card[]; selected?: Card; onPick: (c: Card) => void; onOpen: (c: Card) => void; label: string }) {
  const list = useRef<HTMLUListElement>(null);
  const onKey = (e: KeyboardEvent<HTMLLIElement>, c: Card) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(c);
      return;
    }
    const items = [...(list.current?.querySelectorAll<HTMLElement>("[role=option]") ?? [])];
    const next = e.key === "Home" ? items[0] : e.key === "End" ? items[items.length - 1] : nearest(items, e.currentTarget, e.key);
    if (!next) return; // Nothing that way: let the arrow key scroll as usual.
    e.preventDefault();
    const target = cards.find((x) => x.id === next.dataset.id);
    if (target) onPick(target);
    next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  return (
    <ul ref={list} className="wiki-grid" role="listbox" aria-label={label}>
      {cards.map((c) => {
        const on = c.id === selected?.id;
        return (
          <li
            key={c.id}
            data-id={c.id}
            role="option"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className="wiki-tile"
            data-stars={c.stars}
            onClick={() => onOpen(c)}
            onKeyDown={(e) => onKey(e, c)}
          >
            <span className="wiki-tile-art">
              <Swatch card={c} />
              {c.featured && <span className="wiki-flag">Featured</span>}
              {c.category !== "mechanics" && (c.total > 1 ? c.category !== "perks" && <span className="wiki-own">{c.owned}/{c.total}</span> : c.owned > 0 && <span className="wiki-own">{c.category === "perks" ? "Taken" : "Owned"}</span>)}
            </span>
            <span className="wiki-tile-foot">
              <span className="wiki-tile-name">{c.name}</span>
              {c.stars ? <StarTag stars={c.stars} /> : c.category === "items" ? <span className="wiki-tier">{c.group.replace(/ items$/, "")}</span> : c.category === "perks" ? <span className="wiki-tier">{PERK_GROUP_ONE[c.group] ?? c.group}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The option visually next to `from` in an arrow key's direction, or null. Edge-based, aligned candidates first. */
function nearest(items: HTMLElement[], from: HTMLElement, key: string): HTMLElement | null {
  const dir = ({ ArrowRight: "r", ArrowLeft: "l", ArrowDown: "d", ArrowUp: "u" } as Record<string, string>)[key];
  if (!dir) return null;
  const a = from.getBoundingClientRect();
  const across = dir === "r" || dir === "l";
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  let bestAligned = false;
  for (const el of items) {
    if (el === from || !el.checkVisibility()) continue;
    const b = el.getBoundingClientRect();
    const gap = dir === "r" ? b.left - a.right : dir === "l" ? a.left - b.right : dir === "d" ? b.top - a.bottom : a.top - b.bottom;
    if (gap < -1) continue;
    const aligned = across ? b.top < a.bottom && b.bottom > a.top : b.left < a.right && b.right > a.left;
    const off = across ? Math.abs(b.top + b.bottom - a.top - a.bottom) / 2 : Math.abs(b.left + b.right - a.left - a.right) / 2;
    const score = aligned ? gap + off / 1000 : gap + 2 * off;
    if ((aligned && !bestAligned) || (aligned === bestAligned && score < bestScore)) {
      best = el;
      bestScore = score;
      bestAligned = aligned;
    }
  }
  return best;
}

/* ---------------- List (sortable table) ---------------- */

function ListView({ cards, selected, sort, onSort, onOpen, label }: { cards: Card[]; selected?: Card; sort: Sort; onSort: (k: SortKey) => void; onOpen: (c: Card) => void; label: string }) {
  const capId = useDomId();
  const th = (key: SortKey, text: string, num = false) => (
    <th scope="col" className={num ? "num" : undefined} aria-sort={sort.key === key ? sort.dir : undefined}>
      <button type="button" onClick={() => onSort(key)}>
        {text}
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2.5 4 5 1.5 7.5 4M2.5 6 5 8.5 7.5 6" />
        </svg>
      </button>
    </th>
  );
  return (
    <div className="wiki-table-wrap" role="region" aria-labelledby={capId} tabIndex={0}>
      <table className="wiki-table">
        <caption id={capId} className="wiki-sr">
          {label}
        </caption>
        <thead>
          <tr>
            {th("name", "Name")}
            {th("rarity", "Rarity")}
            <th scope="col">Obtained from</th>
            {th("chance", "Best chance per draw", true)}
            <th scope="col">Owned</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.id} data-on={c.id === selected?.id || undefined}>
              <th scope="row" data-label="Name">
                <button type="button" className="wiki-row-link" aria-pressed={c.id === selected?.id} onClick={() => onOpen(c)}>
                  <Swatch card={c} small />
                  <span>{c.name}</span>
                </button>
              </th>
              <td data-label="Rarity">{c.stars ? <StarTag stars={c.stars} /> : <span className="wiki-tier">{c.group.replace(/ items$/, "")}</span>}</td>
              <td data-label="Obtained from" className={c.chance > 0 ? undefined : "wiki-muted"}>
                {c.entry.obtainedFrom}
              </td>
              <td data-label="Chance" className="num">
                {c.chance > 0 ? pct(c.chance) : "–"}
              </td>
              <td data-label="Owned">{c.total > 1 ? `${c.owned}/${c.total}` : c.owned ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Details ---------------- */

function Detail({
  card,
  onOpenDraw,
  onOpenPerks,
  onShowcase,
  headingId,
}: {
  card: Card;
  onOpenDraw: () => void;
  onOpenPerks?: () => void;
  onShowcase: () => void;
  headingId: string;
}) {
  const e = card.entry;
  const kind = !!card.members;
  const perk = card.category === "perks";
  const facts = e.facts.map(([k, v]): [string, string] =>
    (k === "Owned" || k === "Taken") && kind ? [k, `${card.owned} of ${card.total}`] : k === "Class" && kind && perk ? ["In classes", [...new Set(card.members!.map((m) => m.obtainedFrom.replace("Skill tree · ", "")))].join(", ")] : [k, v],
  );
  // The first section repeats the summary; keep only what it adds (the status note).
  const [first, ...rest] = e.sections;
  const extra = first?.blocks.slice(1) ?? [];
  const sound = e.swatch.kind === "item" && e.swatch.item === "alert-sound";
  return (
    <div className="wiki-d">
      <div className="wiki-d-art">
        <Swatch card={card} big />
      </div>
      <div className="wiki-d-head">
        <h3 id={headingId}>{card.name}</h3>
        <p>
          {card.stars && <StarTag stars={card.stars} />}
          <span>{e.type}</span>
          {e.status && e.status !== "usable" && <StatusChip status={e.status} />}
          {card.featured && (
            <span className="wiki-chip" data-tone="accent">
              Featured now
            </span>
          )}
        </p>
      </div>
      <p className="wiki-d-sum">{e.summary}</p>
      {extra.map((b, i) => (
        <Block key={i} block={b} />
      ))}
      {e.tags && <TagPills tags={e.tags} />}
      <dl className="wiki-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {kind && perk && (
        <p className="wiki-d-note">{card.total} of these in the tree, each worth the effect above. They add up.</p>
      )}
      {kind && !perk && (
        <section className="wiki-d-sec" aria-label={`Every ${card.name}`}>
          <h4>
            {card.total} to collect{card.chance > 0 ? ", each at the chance below" : ""}
          </h4>
          <ul className="wiki-members">
            {card.members!.map((m) => (
              <li key={m.id} data-owned={m.owned || undefined}>
                <span>{m.name}</span>
                {m.owned && <span className="wiki-own static">Owned</span>}
                {sound && (
                  <button type="button" className="wiki-icon-btn" aria-label={`Play ${m.name}`} onClick={() => playAlertPreview(m.id.slice("item:".length))}>
                    <Volume2 aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {rest.map((s) => (
        <section key={s.title} className="wiki-d-sec">
          <h4>{s.title}</h4>
          {s.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </section>
      ))}
      {perk && onOpenPerks && (
        <div className="wiki-d-acts">
          <button type="button" className="wiki-action" onClick={onOpenPerks}>
            Open skill tree
          </button>
        </div>
      )}
      {card.category !== "mechanics" && !perk && (
        <div className="wiki-d-acts">
          <button type="button" className="wiki-action" onClick={onShowcase}>
            Showcase
          </button>
          <button type="button" className="wiki-action" onClick={onOpenDraw}>
            Open Draw
          </button>
        </div>
      )}
    </div>
  );
}

/** A Wiki tile as a Showcase card. A card skin you own can be put on from there. */
function toShowcase(card: Card, equipped: string | null, onOpenDraw: () => void): ShowcaseItem {
  const e = card.entry;
  const s = e.swatch;
  const owned = card.owned > 0;
  const facts = e.facts.map(([k, v]): [string, string] => (k === "Owned" && card.members ? ["Owned", `${card.owned} of ${card.total}`] : [k, v]));
  const ItemIcon = s.kind === "item" ? ITEM_ICON[s.item] : BookOpen;
  const art: ShowcaseItem["art"] =
    s.kind === "look"
      ? { kind: "look", look: s.look }
      : s.kind === "skin"
        ? { kind: "skin", id: s.id }
        : s.kind === "widget"
          ? { kind: "widget", id: s.id }
          : { kind: "icon", icon: <ItemIcon strokeWidth={1.3} /> };
  let action: ShowcaseItem["action"];
  if (!owned) action = { label: "Open Draw", onClick: onOpenDraw };
  else if (s.kind === "skin") action = equipped === s.id ? { label: "Equipped", onClick: () => {}, disabled: true } : { label: "Equip", onClick: () => equipSkin(s.id) };
  return { id: card.id, name: card.name, stars: card.stars, type: e.type, owned, art, effect: e.summary, facts, action };
}

function Block({ block }: { block: WikiBlock }) {
  const capId = useDomId();
  if (block.t === "p") return <p>{block.text}</p>;
  if (block.t === "list")
    return (
      <ul className="wiki-list">
        {block.items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    );
  if (!block.rows.length) return null;
  const last = block.head.length - 1;
  return (
    <div className="wiki-table-wrap plain" role="region" aria-labelledby={capId} tabIndex={0}>
      <table className="wiki-table">
        <caption id={capId}>{block.caption}</caption>
        <thead>
          <tr>
            {block.head.map((h, i) => (
              <th key={h} scope="col" className={i === last && i > 0 ? "num" : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r) => (
            <tr key={r.join("|")}>
              {r.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row" data-label={block.head[0]}>
                    {c}
                  </th>
                ) : (
                  <td key={i} data-label={block.head[i]} className={i === last ? "num" : undefined}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusChip({ status }: { status: WikiStatus }) {
  return (
    <span className="wiki-chip" data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** A card's picture: the theme's own colours, a card skin sample, or an icon for items and rules. */
function Swatch({ card, small = false, big = false }: { card: Card; small?: boolean; big?: boolean }) {
  const s = card.entry.swatch;
  if (s.kind === "look") {
    if (big) return <LookCard look={s.look} className="wiki-look" />;
    const p = s.look.palette;
    return (
      <span className={`wiki-swatch look${small ? " small" : ""}`} aria-hidden="true" style={p ? { background: p.bg, color: p.text, borderColor: p.border } : undefined}>
        <b style={p ? { color: p.accent } : undefined}>Aa</b>
        {!small && (
          <span className="wiki-dots">
            <i style={{ background: p?.accent }} />
            <i style={{ background: p?.caution }} />
            <i style={{ background: p?.alert }} />
          </span>
        )}
      </span>
    );
  }
  if (s.kind === "widget")
    return big ? (
      <WidgetSample id={s.id} />
    ) : (
      <span className={`wiki-swatch widget${small ? " small" : ""}`} aria-hidden="true">
        <b>{s.name.slice(0, 2)}</b>
      </span>
    );
  if (s.kind === "skin") return big ? <SkinSample id={s.id} /> : <span className={`wiki-swatch skin-swatch skin-swatch-mini${small ? " small" : ""}`} data-skin={s.id} aria-hidden="true" />;
  if (s.kind === "perk")
    return (
      <span className={`wiki-swatch perk${small ? " small" : ""}${big ? " big" : ""}`} data-shape={s.shape} style={{ "--rc": s.color } as CSSProperties} aria-hidden="true">
        <span className="wiki-perk-badge">
          <svg viewBox="0 0 24 24">
            <use href={`#pki-${s.icon}`} />
          </svg>
        </span>
      </span>
    );
  const Icon = s.kind === "item" ? ITEM_ICON[s.item] : BookOpen;
  return (
    <span className={`wiki-swatch icon${small ? " small" : ""}${big ? " big" : ""}`} data-tier={card.group} aria-hidden="true">
      <Icon strokeWidth={1.5} />
    </span>
  );
}
