import { useState } from "react";
import { useDraft } from "../state/DraftContext";
import {
  HONEST_ODDS_DISCLAIMER,
  WEIGHT_KEYS,
  WEIGHT_LABELS,
  regionPackOf,
  type PackId,
} from "../types/draft";
import { Badge, PageHeader, Panel, Tabs } from "../ui/primitives";

export function PreviewPage() {
  const { draft } = useDraft();
  const [pack, setPack] = useState<PackId>("regular");

  if (!draft) return null;

  const table = pack === "region" ? regionPackOf(draft) : draft.packs[pack];
  const banner =
    draft.banners
      .filter((b) => b.pack === pack)
      .sort((a, b) => b.priority - a.priority)[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Preview"
        description="Simple mock of the draw odds table as the app would show it."
      />

      <div className="mx-auto max-w-lg">
        <Panel className="overflow-hidden">
          <div className="border-b border-edge bg-bg px-4 py-3">
            <p className="text-xs text-muted">Draw Theme · mock</p>
            <Tabs
              tabs={[
                { id: "regular", label: "Regular" },
                { id: "brand", label: "Brand" },
                { id: "region", label: "Region" },
              ]}
              value={pack}
              onChange={(id) => setPack(id as PackId)}
            />
          </div>

          {banner ? (
            <div className="border-b border-edge px-4 py-3">
              {(banner.art || banner.imageUrl || banner.assetPath) ? (
                <img
                  src={banner.art || banner.imageUrl || banner.assetPath}
                  alt=""
                  className="mb-2 aspect-[16/7] w-full rounded object-cover"
                />
              ) : null}
              <p className="text-sm font-semibold">{banner.title}</p>
              {banner.subtitle ? (
                <p className="mt-0.5 text-xs text-muted">{banner.subtitle}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-muted">
                {HONEST_ODDS_DISCLAIMER}
              </p>
            </div>
          ) : null}

          <div className="px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="info">{table.priceOne} Income</Badge>
              <Badge tone="neutral">10 draws · {table.priceTen}</Badge>
              <Badge tone="neutral">
                Look pity after {draft.economy.lookPityAfter}
              </Badge>
              {pack === "brand" ? (
                <Badge tone="warn">
                  Rainbow pity after {draft.economy.brandPityAfter} (Brand / Region), {draft.economy.rainbowPityAfter ?? 89} (Regular) · soft pity from {draft.economy.softPity?.company?.from ?? "off"} (Brand / Region), {draft.economy.softPity?.regular?.from ?? "off"} (Regular)
                </Badge>
              ) : null}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Outcome</th>
                  <th className="pb-2 text-right font-medium">Chance</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHT_KEYS.filter((k) => (table.weights[k] ?? 0) > 0 && (k !== "rainbowRegular" || pack !== "regular")).map((k) => (
                  <tr key={k} className="border-t border-edge/60">
                    <td className="py-2">{k === "brandTheme" && pack === "regular" ? "Rainbow Regular 5-star" : WEIGHT_LABELS[k]}</td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {Number(table.weights[k]).toFixed(
                        Number.isInteger(table.weights[k]) ? 0 : 1,
                      )}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 text-xs text-muted">
              Chosen look still costs {draft.economy.lookCost} Income. Odds
              shown are the current draft — publish to push to the app.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
