import { Switch } from "@/components/ui/switch";
import { SoftPityEditor } from "./SoftPityEditor";
import { DEFAULT_CARD_BUY, cardOddsTotal100, type PackSettingsDraft, type TicketKind } from "../types/draft";
import { Badge, Field, Input, Panel, Select } from "../ui/primitives";

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

type RowKey = keyof PackSettingsDraft["weights"];

/**
 * The settings the Card Pack and the Widget Pack share: buy prices, draw price and ticket, row chances, pity and
 * repeat rewards. `noun` names the prize ("skin", "card") in labels; the prize list stays on each page.
 */
export function PackSettingsPanels<T extends PackSettingsDraft>({
  pack,
  update,
  noun,
  buyWhere,
  regularCrystalCost,
}: {
  pack: T;
  update: (fn: (p: T) => T) => void;
  noun: string;
  /** Where players buy a prize outright, for the hint ("on the Themes page"). */
  buyWhere: string;
  regularCrystalCost: number;
}) {
  const rows: { key: RowKey; label: string; hint: string }[] = [
    { key: "five", label: `5-star ${noun}`, hint: `Split evenly across Available 5-star ${noun}s` },
    { key: "four", label: `4-star ${noun}`, hint: `Split evenly across Available 4-star ${noun}s` },
    { key: "better", label: "Better item", hint: "Wallpapers, boot screens, layout slots (Regular Pack mix)" },
    { key: "common", label: "Common item", hint: "Streak freeze, alert sounds, fonts, flairs (Regular Pack mix)" },
  ];
  const sum = rows.reduce((s, r) => s + (Number(pack.weights[r.key]) || 0), 0);
  const buy = pack.buy ?? DEFAULT_CARD_BUY;

  return (
    <div className="flex flex-col gap-4">
      <Panel className="p-4">
        <h2 className="mb-1 text-sm font-semibold">Buying {noun}s</h2>
        <p className="mb-3 text-xs text-muted">
          Players can buy an Available {noun} they do not own {buyWhere}. Leave a price empty to make that tier draw-only.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["fourPrice", "fivePrice"] as const).map((k) => (
            <Field key={k} label={`${k === "fourPrice" ? "4-star" : "5-star"} ${noun} (Income)`} hint={buy[k] == null ? "Draw-only" : undefined}>
              <Input
                type="number"
                min={1}
                placeholder="Draw-only"
                value={buy[k] ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  update((c) => ({ ...c, buy: { ...(c.buy ?? DEFAULT_CARD_BUY), [k]: v === "" ? null : Math.round(num(v)) } }));
                }}
              />
            </Field>
          ))}
          <label className="col-span-2 flex items-center justify-between gap-3 text-sm text-foreground">
            <span>
              Regular crystals can unlock a 4-star {noun}
              <span className="block text-xs text-muted">Same cost as a Regular theme pick ({regularCrystalCost} crystals)</span>
            </span>
            <Switch
              checked={buy.crystalPick}
              onCheckedChange={(on) => update((c) => ({ ...c, buy: { ...(c.buy ?? DEFAULT_CARD_BUY), crystalPick: on } }))}
              aria-label={`Regular crystals can unlock a 4-star ${noun}`}
            />
          </label>
        </div>
      </Panel>

      <Panel className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Price and ticket</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="One draw (Income)">
            <Input type="number" min={1} value={pack.priceOne} onChange={(e) => update((c) => ({ ...c, priceOne: num(e.target.value) }))} />
          </Field>
          <Field label="Ten draws (Income)">
            <Input type="number" min={1} value={pack.priceTen} onChange={(e) => update((c) => ({ ...c, priceTen: num(e.target.value) }))} />
          </Field>
          <Field label="Draw Ticket" hint="Check-in ticket that pays one draw here" className="col-span-2">
            <Select value={pack.ticket} onChange={(e) => update((c) => ({ ...c, ticket: e.target.value as TicketKind }))}>
              <option value="special">Special Ticket</option>
              <option value="regular">Regular Ticket</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Row chances</h2>
          <Badge tone={cardOddsTotal100(sum) ? "ok" : "danger"}>{Number(sum.toFixed(4))}% of 100%</Badge>
        </div>
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Field key={r.key} label={`${r.label} (%)`} hint={r.hint}>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={pack.weights[r.key]}
                onChange={(e) => update((c) => ({ ...c, weights: { ...c.weights, [r.key]: num(e.target.value) } }))}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Pity</h2>
        <Field label={`4-star ${noun} or better at least every`} hint={`Draws in a row; the last one is always a ${noun}`}>
          <Input
            type="number"
            min={2}
            value={pack.fourPityAfter + 1}
            onChange={(e) => update((c) => ({ ...c, fourPityAfter: Math.max(1, Math.round(num(e.target.value)) - 1) }))}
          />
        </Field>
        <div className="mt-4">
          <SoftPityEditor
            title={`5-star ${noun} pity`}
            basePct={pack.weights.five}
            guaranteedAt={pack.fivePityAfter + 1}
            soft={pack.softPity ?? null}
            onGuaranteedAt={(n) =>
              update((c) => {
                const fivePityAfter = Math.max(1, n - 1);
                // A soft pity that would now start at or after the guaranteed draw is off: drop it rather than
                // keep a start the publish check refuses.
                const softPity = c.softPity && c.softPity.from <= fivePityAfter ? c.softPity : undefined;
                return { ...c, fivePityAfter, softPity };
              })
            }
            onSoft={(soft) => update((c) => ({ ...c, softPity: soft ?? undefined }))}
          />
        </div>
      </Panel>

      <Panel className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Repeat rewards</h2>
        <p className="mb-3 text-xs text-muted">A {noun} the player already owns pays Regular crystals instead.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Repeat 4-star">
            <Input
              type="number"
              min={0}
              value={pack.crystalValues.four}
              onChange={(e) => update((c) => ({ ...c, crystalValues: { ...c.crystalValues, four: Math.round(num(e.target.value)) } }))}
            />
          </Field>
          <Field label="Repeat 5-star">
            <Input
              type="number"
              min={0}
              value={pack.crystalValues.five}
              onChange={(e) => update((c) => ({ ...c, crystalValues: { ...c.crystalValues, five: Math.round(num(e.target.value)) } }))}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
}
