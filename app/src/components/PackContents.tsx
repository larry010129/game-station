import { useEffect, useRef } from "react";
import type { ThemeDef } from "../state/palette";
import { getContent, itemsOfKind, packTable, type ItemDef, type PackId } from "../state/gachaEngine";
import { StarTag, type Stars } from "./StarTag";
import { cardPackOf, drawableSkins, itemById, widgetPackOf } from "../state/gachaContent";
import { drawableWidgets } from "../state/widgets";
import { CARDS, type CardId } from "../layout/layouts";
import { cardSkinById } from "../state/cardSkins";
import { itemTitle, ITEM_ICON } from "../state/itemFace";

/** An item row's swatch: its kind's icon (a wallpaper, a bell for a sound); other rows keep the plain swatch. */
function PoolItemIcon({ id }: { id: string }) {
  const kind = itemById(id)?.kind;
  const Icon = kind ? ITEM_ICON[kind] : null;
  return <span className="warp-pool-swatch item" aria-hidden="true">{Icon && <Icon width={14} height={14} strokeWidth={1.75} />}</span>;
}

/** One thing a pack can give. `look` draws a theme swatch, `skin` a card skin swatch. */
type Row = { id: string; name: string; chance: number; owned: boolean; look?: ThemeDef; skin?: string };
export type Section = { title: string; total: number; rows: Row[]; stars?: Stars };


/** Every outcome a pack can give, with its chance per draw: each category's odds split evenly across its entries. */
export function packSections(
  pack: PackId,
  regularLooks: readonly ThemeDef[],
  rainbowLooks: readonly ThemeDef[],
  companyLooks: readonly ThemeDef[],
  ownedLooks: readonly string[],
  ownedItems: readonly string[],
): Section[] {
  const content = getContent();
  const table = packTable(pack, content);
  const w = table.weights;
  const lookRows = (looks: readonly ThemeDef[], total: number): Row[] =>
    looks.map((look) => ({ id: look.id, name: look.name, chance: (total * 100) / Math.max(1, looks.length), owned: ownedLooks.includes(look.id), look }));
  const itemRows = (kinds: { kind: ItemDef["kind"]; w: number }[], total: number): Row[] =>
    kinds.flatMap(({ kind, w: share }) => {
      const items = itemsOfKind(kind, content);
      return items.map((item) => ({
        id: item.id,
        name: itemTitle(item.id),
        chance: (total * share * 100) / Math.max(1, items.length),
        owned: !item.stackable && ownedItems.includes(item.id),
      }));
    });
  const sections: Section[] = [];
  // The 5-star rows. Regular Pack: one row of rainbow Regular themes. Company packs: featured looks and rainbow Regular
  // themes, each its own row.
  {
    const company = pack !== "regular";
    const featuredShare = company && companyLooks.length > 0 ? w.brandTheme : 0;
    if (featuredShare > 0) {
      sections.push({ title: pack === "region" ? "Featured company themes" : "Featured Brand themes", stars: 5, total: featuredShare * 100, rows: lookRows(companyLooks, featuredShare) });
    }
    const rainbowShare = company ? (w.rainbowRegular ?? 0) : w.brandTheme;
    if (rainbowShare > 0 && rainbowLooks.length > 0) {
      sections.push({
        title: "Rainbow Regular themes",
        stars: 5,
        total: rainbowShare * 100,
        rows: lookRows(rainbowLooks, rainbowShare),
      });
    }
  }
  if (w.regularTheme > 0) sections.push({ title: "Regular themes", stars: 4, total: w.regularTheme * 100, rows: lookRows(regularLooks, w.regularTheme) });
  const bi = table.betterInner;
  if (w.better > 0) {
    sections.push({
      title: "Better items",
      total: w.better * 100,
      rows: itemRows([{ kind: "wallpaper", w: bi.wallpaper }, { kind: "boot", w: bi.boot }, { kind: "layout-slot", w: bi.layout }], w.better),
    });
  }
  const ci = table.commonInner;
  if (w.common > 0) {
    sections.push({
      title: "Common items",
      total: w.common * 100,
      rows: itemRows(
        [{ kind: "streak-freeze", w: ci.streakFreeze }, { kind: "alert-sound", w: ci.alert }, { kind: "font", w: ci.font }, { kind: "name-flair", w: ci.flair }],
        w.common,
      ),
    });
  }
  const extras: Row[] = [];
  if (w.pick > 0) extras.push({ id: "pick", name: "Weekly unlock pick", chance: w.pick * 100, owned: false });
  if (w.customUpload > 0) {
    extras.push({ id: "custom-upload", name: "Custom upload unlock", chance: w.customUpload * 100, owned: ownedItems.includes("custom-upload") });
  }
  if (extras.length) sections.push({ title: "Other", total: extras.reduce((s, r) => s + r.chance, 0), rows: extras });
  return sections;
}

/** Everything the Card Pack can give: 5-star and 4-star skins, then the item rows (Regular Pack inner weights). */
export function cardSections(ownedSkins: readonly string[], ownedItems: readonly string[], kind: "skins" | "widgets" = "skins"): Section[] {
  const content = getContent();
  const w = (kind === "widgets" ? widgetPackOf(content) : cardPackOf(content)).weights;
  const sections: Section[] = [];
  for (const stars of [5, 4] as const) {
    const ids = kind === "widgets" ? drawableWidgets(stars, content) : drawableSkins(stars, content);
    const share = stars === 5 ? w.five : w.four;
    if (share > 0 && ids.length > 0) {
      sections.push({
        title: kind === "widgets" ? `${stars}-star dashboard cards` : `${stars}-star card skins`,
        stars,
        total: share * 100,
        rows: ids.map((id) => ({
          id,
          name: kind === "widgets" ? (CARDS[id as CardId]?.name ?? id) : (cardSkinById(id)?.name ?? id),
          chance: (share * 100) / ids.length,
          owned: ownedSkins.includes(id),
          ...(kind === "skins" ? { skin: id } : {}),
        })),
      });
    }
  }
  // Item rows use the Regular Pack's inner mixes (as the engine does), scaled by the Card Pack's own row chances.
  const reg = packTable("regular", content);
  const itemRows = (kinds: { kind: ItemDef["kind"]; w: number }[], total: number): Row[] =>
    kinds.flatMap(({ kind, w: share }) => {
      const items = itemsOfKind(kind, content);
      return items.map((item) => ({
        id: item.id,
        name: itemTitle(item.id),
        chance: (total * share * 100) / Math.max(1, items.length),
        owned: !item.stackable && ownedItems.includes(item.id),
      }));
    });
  const bi = reg.betterInner;
  const ci = reg.commonInner;
  if (w.better > 0) {
    sections.push({
      title: "Better items",
      total: w.better * 100,
      rows: itemRows([{ kind: "wallpaper", w: bi.wallpaper }, { kind: "boot", w: bi.boot }, { kind: "layout-slot", w: bi.layout }], w.better),
    });
  }
  if (w.common > 0) {
    sections.push({
      title: "Common items",
      total: w.common * 100,
      rows: itemRows(
        [{ kind: "streak-freeze", w: ci.streakFreeze }, { kind: "alert-sound", w: ci.alert }, { kind: "font", w: ci.font }, { kind: "name-flair", w: ci.flair }],
        w.common,
      ),
    });
  }
  return sections;
}

const pct = (n: number) => (n < 0.01 ? "<0.01%" : `${n >= 1 ? n.toFixed(1).replace(/\.0$/, "") : n.toFixed(2)}%`);

/** A scrollable list of everything in a pack and its chance per draw. Escape, the close button or the backdrop closes it. */
export function PackContents({ title, sections, onClose }: { title: string; sections: Section[]; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const count = sections.reduce((s, x) => s + x.rows.length, 0);
  return (
    <div className="warp-shade" onClick={onClose}>
      <div className="warp-pool" role="dialog" aria-modal="true" aria-labelledby="warp-pool-title" onClick={(e) => e.stopPropagation()}>
        <header className="warp-pool-head">
          <div>
            <h3 id="warp-pool-title">{title}</h3>
            <p>
              {count} things you can draw, with each one&apos;s chance per draw. Pity can bring a rarer prize sooner.
            </p>
          </div>
          <button ref={closeRef} type="button" className="warp-close" aria-label="Close list" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </header>
        <div className="warp-pool-list">
          {sections.map((sec) => (
            <section key={sec.title} aria-label={`${sec.stars ? `${sec.stars} star, ` : ""}${sec.title}, ${pct(sec.total)} in all`}>
              <h4>
                <span className="warp-pool-title">
                  {sec.stars ? <StarTag stars={sec.stars} /> : null}
                  {sec.title}
                </span>
                <span>
                  {sec.rows.length} · {pct(sec.total)}
                </span>
              </h4>
              <ul>
                {sec.rows.map((row) => (
                  <li key={row.id}>
                    {row.skin ? (
                      <span className="warp-pool-swatch skin-swatch skin-swatch-mini" data-skin={row.skin} aria-hidden="true" />
                    ) : row.look ? (
                      <span
                        className="warp-pool-swatch"
                        aria-hidden="true"
                        style={{ background: row.look.palette?.bg, color: row.look.palette?.accent, borderColor: row.look.palette?.border }}
                      >
                        Aa
                      </span>
                    ) : (
                      <PoolItemIcon id={row.id} />
                    )}
                    <span className="warp-pool-name">{row.name}</span>
                    {row.owned ? <em>Owned</em> : null}
                    <b>{pct(row.chance)}</b>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
