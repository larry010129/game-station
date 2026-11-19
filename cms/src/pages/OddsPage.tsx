import { useState } from "react";
import { SoftPityEditor, type SoftPityDraft } from "../components/SoftPityEditor";
import { useDraft } from "../state/DraftContext";
import {
  COUNTRIES,
  nearly100,
  packWeightSum,
  regionName,
  regionPackOf,
  REGIONS,
  type CmsDraft,
  type PackDraft,
  type RegionWeekDraft,
  WEIGHT_KEYS,
  WEIGHT_LABELS,
  type PackId,
  type PackWeightsPct,
  ticketOf,
  DEFAULT_PACK_TICKETS,
  type TicketKind,
  specialQueueOf,
  runEndIso,
} from "../types/draft";
import { OddsPieChart } from "../components/OddsPieChart";
import { FeaturedQueue } from "../components/FeaturedQueue";
import { RepeatRewards } from "../components/RepeatRewards";
import { mdy, runLastDay } from "../lib/schedule";
import { Switch } from "@/components/ui/switch";
import {
  Badge,
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  Swatch,
  Tabs,
  TableShell,
  Td,
  Th,
} from "../ui/primitives";

const pad = (n: number) => String(n).padStart(2, "0");

/** 0.67%, 0.33%, 13%: a share of draws as the app's Published odds show it. */
const fmtPct = (n: number) => `${Math.round(n * 100) / 100}%`;

/** Local-calendar Monday of the week containing `d`, as YYYY-MM-DD (the app's quest weeks). */
function mondayOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** A pack's table; the Region Pack starts as a copy of the Brand table. */
function packOf(d: CmsDraft, pack: PackId): PackDraft {
  return pack === "region" ? regionPackOf(d) : d.packs[pack];
}

function mondayOfIso(iso: string, plusDays = 0): string {
  const [y, m, d] = iso.split("-").map(Number);
  return mondayOf(new Date(y, m - 1, d + plusDays));
}

type PastSortKey = "name" | "from" | "end";
const PAST_COLUMNS: [PastSortKey, string][] = [
  ["name", "Theme"],
  ["from", "From"],
  ["end", "End"],
];

export function OddsPage() {
  const { draft, setDraft, publishErrors } = useDraft();
  const [pack, setPack] = useState<PackId>("regular");
  /** Which weekly-special slot is open for picking a Brand theme (0 | 1), or closed. */
  /** Past featured table sort. Clicks cycle ascending, descending, then back to newest run first. */
  const [pastSort, setPastSort] = useState<{ key: PastSortKey; dir: 1 | -1 } | null>(null);
  function togglePastSort(key: PastSortKey) {
    setPastSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));
  }

  if (!draft) return null;

  const table = packOf(draft, pack);
  const sum = packWeightSum(table.weights);
  const ok = nearly100(sum);
  // 5-star pity for this tab: the Regular Pack's own, or the one the Brand and Region packs share.
  const softKey = pack === "regular" ? "regular" : "company";
  const pityAfter = pack === "regular" ? (draft.economy.rainbowPityAfter ?? 89) : draft.economy.brandPityAfter;
  const fiveBasePct = (Number(table.weights.brandTheme) || 0) + (pack === "regular" ? 0 : Number(table.weights.rainbowRegular) || 0);

  function setSoft(value: SoftPityDraft | null) {
    setDraft((d) => {
      const next = { ...(d.economy.softPity ?? {}) };
      if (value) next[softKey] = value;
      else delete next[softKey];
      return { ...d, economy: { ...d.economy, softPity: next } };
    });
  }

  function setWeight(key: keyof PackWeightsPct, value: number) {
    setDraft((d) => ({
      ...d,
      packs: {
        ...d.packs,
        [pack]: {
          ...packOf(d, pack),
          weights: { ...packOf(d, pack).weights, [key]: value },
        },
      },
    }));
  }

  function setPrice(field: "priceOne" | "priceTen" | "lookCost", value: number) {
    if (field === "lookCost") {
      setDraft((d) => ({
        ...d,
        economy: { ...d.economy, lookCost: value },
      }));
      return;
    }
    setDraft((d) => ({
      ...d,
      packs: {
        ...d.packs,
        [pack]: { ...packOf(d, pack), [field]: value },
      },
    }));
  }

  function setPity(field: "lookPityAfter" | "brandPityAfter" | "rainbowPityAfter", value: number) {
    setDraft((d) => ({
      ...d,
      economy: { ...d.economy, [field]: value },
    }));
  }

  function setInner(
    group: "betterInner" | "commonInner",
    key: string,
    value: number,
  ) {
    setDraft((d) => ({
      ...d,
      packs: {
        ...d.packs,
        [pack]: {
          ...packOf(d, pack),
          [group]: { ...packOf(d, pack)[group], [key]: value },
        },
      },
    }));
  }

  const thisWeek = mondayOf(new Date());
  const pastFeatured = draft.brandFeaturedPast ?? [];

  function removeFromPast(themeId: string) {
    setDraft((d) => ({
      ...d,
      brandFeaturedPast: (d.brandFeaturedPast ?? []).filter((id) => id !== themeId),
    }));
  }

  const regionWeek = draft.regionWeek ?? null;
  const regionThemes = draft.themes.filter((t) => t.group === "Brand" && t.tags?.packs.includes("region"));
  const usedCountries = [...new Set(regionThemes.map((t) => t.tags!.country))].sort((a, b) =>
    (COUNTRIES[a] ?? a).localeCompare(COUNTRIES[b] ?? b),
  );
  const inFocus = regionWeek
    ? regionThemes.filter((t) => (regionWeek.kind === "region" ? t.tags!.region === regionWeek.value : t.tags!.country === regionWeek.value))
    : [];
  const focusAvailable = inFocus.filter((t) => t.status === "Available");

  function setRegionWeek(next: RegionWeekDraft | null) {
    setDraft((d) => ({ ...d, regionWeek: next }));
  }

  /** Region Pack on/off. Absent counts as on; the week and odds stay as they are while it is off. */
  const regionOn = draft.regionPackEnabled !== false;
  /** Which check-in Draw Ticket this pack takes. The default is stored as absent, so older releases read the same. */
  function setTicket(kind: TicketKind) {
    setDraft((d) => {
      const next = { ...(d.packTickets ?? {}) };
      if (kind === DEFAULT_PACK_TICKETS[pack]) delete next[pack];
      else next[pack] = kind;
      return { ...d, packTickets: Object.keys(next).length ? next : undefined };
    });
  }
  function setRegionOn(on: boolean) {
    setDraft((d) => ({ ...d, regionPackEnabled: on }));
  }

  const bi = table.betterInner;
  const ci = table.commonInner;
  const biSum = bi.wallpaper + bi.boot + bi.layout;
  const ciSum = ci.streakFreeze + ci.alert + ci.font + ci.flair;

  return (
    <div>
      <PageHeader
        title="Odds & prices"
        description="Pack row chances must total 100%. Publish is blocked until both packs and inner tables are valid."
        actions={
          ok && publishErrors.length === 0 ? (
            <Badge tone="ok">Ready to publish</Badge>
          ) : (
            <Badge tone="danger">Fix before publish</Badge>
          )
        }
      />

      <Tabs
        tabs={[
          { id: "regular", label: "Regular Pack" },
          { id: "brand", label: "Brand Pack" },
          { id: "region", label: "Region Pack" },
        ]}
        value={pack}
        onChange={(id) => setPack(id as PackId)}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Row chances (%)</h2>
            <Badge tone={ok ? "ok" : "danger"}>
              Sum {sum.toFixed(2)}%
            </Badge>
          </div>
          <div className="mb-4">
            <OddsPieChart weights={table.weights} />
          </div>
          <TableShell>
            <thead>
              <tr>
                <Th>Outcome</Th>
                <Th className="w-28">Chance %</Th>
              </tr>
            </thead>
            <tbody>
              {WEIGHT_KEYS.filter((key) => key !== "rainbowRegular" || pack !== "regular").map((key) => (
                <tr key={key}>
                  <Td>
                    {key === "brandTheme"
                      ? pack === "regular"
                        ? "Rainbow Regular theme (5-star)"
                        : pack === "region"
                          ? "Featured company theme (5-star)"
                          : "Featured Brand theme (5-star)"
                      : key === "rainbowRegular"
                        ? "Rainbow Regular theme (5-star)"
                        : WEIGHT_LABELS[key]}
                    {key === "brandTheme" && pack !== "regular" ? (
                      <span className="block text-xs text-muted">{fmtPct((Number(table.weights.brandTheme) || 0) / 2)} each of the 2 featured</span>
                    ) : null}
                  </Td>
                  <Td>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      value={table.weights[key] ?? 0}
                      onChange={(e) =>
                        setWeight(key, Number(e.target.value) || 0)
                      }
                      className="w-24 tabular-nums"
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          {!ok ? (
            <p className="mt-2 text-xs text-destructive-foreground">
              Row chances must equal 100% (±0.05).
            </p>
          ) : null}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Prices (Income)</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="One draw">
                <Input
                  type="number"
                  min={1}
                  value={table.priceOne}
                  onChange={(e) =>
                    setPrice("priceOne", Number(e.target.value) || 0)
                  }
                />
              </Field>
              <Field label="Ten draws">
                <Input
                  type="number"
                  min={1}
                  value={table.priceTen}
                  onChange={(e) =>
                    setPrice("priceTen", Number(e.target.value) || 0)
                  }
                />
              </Field>
              <Field
                label="Draw Ticket"
                hint="Check-in ticket that pays one draw here instead of Income"
              >
                <Select
                  value={ticketOf(draft, pack)}
                  onChange={(e) => setTicket(e.target.value as TicketKind)}
                >
                  <option value="regular">Regular Ticket</option>
                  <option value="special">Special Ticket</option>
                </Select>
              </Field>
              <Field label="Chosen theme cost" hint="Shared across packs">
                <Input
                  type="number"
                  min={1}
                  value={draft.economy.lookCost}
                  onChange={(e) =>
                    setPrice("lookCost", Number(e.target.value) || 0)
                  }
                />
              </Field>
              <Field
                label="Big Income amount"
                hint="One Income reward above this shows the cash bundle in the app, not the coins. Shared across packs"
              >
                <Input
                  type="number"
                  min={0}
                  value={draft.economy.creditBigAmount ?? 100}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      economy: { ...d.economy, creditBigAmount: Math.max(0, Number(e.target.value) || 0) },
                    }))
                  }
                />
              </Field>
            </div>
          </Panel>

          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Pity constants</h2>
            <div className="mb-3">
              <SoftPityEditor
                title={pack === "regular" ? "5-star pity · Regular Pack" : "5-star pity · Brand and Region packs (shared)"}
                basePct={fiveBasePct}
                guaranteedAt={pityAfter + 1}
                soft={draft.economy.softPity?.[softKey] ?? null}
                onGuaranteedAt={(n) => setPity(pack === "regular" ? "rainbowPityAfter" : "brandPityAfter", n - 1)}
                onSoft={setSoft}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Theme pity after"
                hint="Force Regular theme on next draw"
              >
                <Input
                  type="number"
                  min={0}
                  value={draft.economy.lookPityAfter}
                  onChange={(e) =>
                    setPity("lookPityAfter", Number(e.target.value) || 0)
                  }
                />
              </Field>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Better item inner %</h2>
            <Badge tone={nearly100(biSum) ? "ok" : "danger"}>
              {biSum.toFixed(1)}%
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["wallpaper", "boot", "layout"] as const).map((k) => (
              <Field key={k} label={k}>
                <Input
                  type="number"
                  value={bi[k]}
                  onChange={(e) =>
                    setInner("betterInner", k, Number(e.target.value) || 0)
                  }
                />
              </Field>
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Common item inner %</h2>
            <Badge tone={nearly100(ciSum) ? "ok" : "danger"}>
              {ciSum.toFixed(1)}%
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["streakFreeze", "streak freeze"],
                ["alert", "alert"],
                ["font", "font"],
                ["flair", "flair"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <Input
                  type="number"
                  value={ci[k]}
                  onChange={(e) =>
                    setInner("commonInner", k, Number(e.target.value) || 0)
                  }
                />
              </Field>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <RepeatRewards />
      </div>

      {pack === "region" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Switch
                  checked={regionOn}
                  onCheckedChange={setRegionOn}
                  aria-labelledby="region-pack-switch-label"
                  title={regionOn ? "Region Pack is on in the app" : "Region Pack is off: the app hides it"}
                />
                <h2 id="region-pack-switch-label" className="text-sm font-semibold">
                  Region week
                </h2>
              </div>
              {!regionOn ? (
                <Badge tone="neutral">Pack off</Badge>
              ) : !regionWeek ? (
                <Badge tone="neutral">Automatic rotation</Badge>
              ) : regionWeek.weekOf > thisWeek ? (
                <Badge tone="info">Scheduled for {regionWeek.weekOf}</Badge>
              ) : mondayOfIso(regionWeek.weekOf, 7 * (regionWeek.weeks ?? 1)) > thisWeek ? (
                <Badge tone="ok">Live until {runLastDay(regionWeek.weekOf, regionWeek.weeks ?? 1)}</Badge>
              ) : (
                <Badge tone="warn">Ended, rotation is back</Badge>
              )}
            </div>
            {!regionOn ? (
              <p className="mb-3 text-xs text-muted">
                The Region Pack is off: the app hides its tab and nobody can draw from it. The week below and the odds
                above are kept for when you switch it back on.
              </p>
            ) : null}
            <fieldset disabled={!regionOn} className={"m-0 min-w-0 border-0 p-0 " + (regionOn ? "" : "opacity-50")}>
            <p className="mb-3 text-xs text-muted">
              Pick what the Region Pack features and for how long: a region (a continent, with Europe and Asia split in
              four) or a single country, from a Monday for 1 to 8 weeks. The pack shows the same two Available companies
              for the whole run. Without one set, it rotates through the regions by itself, week by week.
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(
                [
                  ["region", "Region week"],
                  ["country", "Country week"],
                ] as const
              ).map(([kind, label]) => (
                <Button
                  key={kind}
                  type="button"
                  variant={regionWeek?.kind === kind ? "primary" : "ghost"}
                  onClick={() =>
                    setRegionWeek({
                      weekOf: regionWeek?.weekOf ?? thisWeek,
                      kind,
                      value: kind === "region" ? "asia-east" : (usedCountries[0] ?? "TW"),
                    })
                  }
                >
                  {label}
                </Button>
              ))}
              <Button variant="ghost" type="button" disabled={!regionWeek} onClick={() => setRegionWeek(null)}>
                Clear (use rotation)
              </Button>
            </div>
            {regionWeek ? (
              <div className="flex flex-wrap items-end gap-3">
                <Field label={regionWeek.kind === "region" ? "Region" : "Country"}>
                  <select
                    className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                    value={regionWeek.value}
                    onChange={(e) => setRegionWeek({ ...regionWeek, value: e.target.value })}
                  >
                    {regionWeek.kind === "region"
                      ? REGIONS.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.name}
                          </option>
                        ))
                      : usedCountries.map((c) => (
                          <option key={c} value={c}>
                            {COUNTRIES[c] ?? c} ({c})
                          </option>
                        ))}
                  </select>
                </Field>
                <Field label="Starts (Monday)">
                  <Input
                    type="date"
                    value={regionWeek.weekOf}
                    onChange={(e) => e.target.value && setRegionWeek({ ...regionWeek, weekOf: mondayOfIso(e.target.value) })}
                    className="w-44"
                  />
                </Field>
                <Field label="Duration">
                  <Select
                    value={regionWeek.weeks ?? 1}
                    onChange={(e) => {
                      const weeks = Number(e.target.value);
                      setRegionWeek({ ...regionWeek, weeks: weeks > 1 ? weeks : undefined });
                    }}
                    className="w-32"
                  >
                    {Array.from({ length: 8 }, (_, k) => k + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} week{n === 1 ? "" : "s"}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button variant="ghost" type="button" onClick={() => setRegionWeek({ ...regionWeek, weekOf: thisWeek })}>
                  This week
                </Button>
                <Button variant="ghost" type="button" onClick={() => setRegionWeek({ ...regionWeek, weekOf: mondayOfIso(thisWeek, 7) })}>
                  Next week
                </Button>
              </div>
            ) : null}
            </fieldset>
          </Panel>

          <Panel className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {regionWeek ? (regionWeek.kind === "region" ? regionName(regionWeek.value) : (COUNTRIES[regionWeek.value] ?? regionWeek.value)) : "This week's pool"}
              </h2>
              {regionWeek ? (
                <Badge tone={focusAvailable.length >= 2 ? "ok" : "warn"}>
                  {focusAvailable.length} Available of {inFocus.length}
                </Badge>
              ) : null}
            </div>
            {!regionWeek ? (
              <p className="text-xs text-muted">Set a region or country week to see which companies it can feature.</p>
            ) : inFocus.length === 0 ? (
              <p className="text-xs text-muted">No company themes are tagged for this yet. Tag some on the Themes page.</p>
            ) : (
              <>
                {focusAvailable.length < 2 ? (
                  <p className="mb-2 text-xs text-destructive-foreground">
                    Make at least 2 of these Available on the Themes page, or the week features fewer than two.
                  </p>
                ) : null}
                <ul className="m-0 flex max-h-56 list-none flex-wrap gap-1.5 overflow-y-auto p-0">
                  {inFocus.map((t) => (
                    <li key={t.id} className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 py-1 text-xs">
                      <Swatch color={t.palette?.accent} />
                      <span>{t.name}</span>
                      {t.status !== "Available" ? <span className="text-[10px] uppercase tracking-wide text-muted">{t.status}</span> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </div>
      ) : null}

      {pack === "brand" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FeaturedQueue />

          <Panel className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Past featured</h2>
              <Badge tone="neutral">{pastFeatured.length}</Badge>
            </div>
            <p className="mb-3 text-xs text-muted">
              Themes already featured in a run. Random skips these; remove one to allow it in random again. Manual pick can still choose them.
            </p>
            {pastFeatured.length === 0 ? (
              <p className="text-xs text-muted">None yet: a run's themes are added here once both are picked.</p>
            ) : (
              (() => {
                // Dates come from the theme's latest run in the featured queue. A run removed with "Clear ended"
                // takes its dates with it, so those rows show a dash.
                const runs = specialQueueOf(draft);
                const rows = pastFeatured
                  .map((id) => {
                    const run = runs
                      .filter((r) => r.brandIds.includes(id))
                      .sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];
                    const theme = draft.themes.find((t) => t.id === id);
                    return { id, theme, run, name: theme?.name ?? id, from: run?.weekOf ?? "", end: run ? runEndIso(run) : "" };
                  })
                  .sort((a, b) => {
                    if (!pastSort) return b.from.localeCompare(a.from) || a.name.localeCompare(b.name);
                    const { key, dir } = pastSort;
                    // Rows with no dates (their run was cleared) stay at the bottom either way.
                    if (key !== "name" && !a[key] !== !b[key]) return a[key] ? -1 : 1;
                    return dir * a[key].localeCompare(b[key], undefined, { sensitivity: "base" }) || a.name.localeCompare(b.name);
                  });
                return (
                  <TableShell>
                    <thead>
                      <tr>
                        {PAST_COLUMNS.map(([key, label]) => {
                          const dir = pastSort?.key === key ? pastSort.dir : 0;
                          const words = key === "name" ? ["A to Z", "Z to A"] : ["oldest first", "newest first"];
                          return (
                            <Th key={key} sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : "none"}>
                              <button
                                type="button"
                                onClick={() => togglePastSort(key)}
                                data-on={dir !== 0}
                                title={
                                  dir === 1
                                    ? `Sorted by ${label}, ${words[0]}. Click for ${words[1]}.`
                                    : dir === -1
                                      ? `Sorted by ${label}, ${words[1]}. Click for the default order.`
                                      : `Sort by ${label}`
                                }
                                className="-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[on=true]:text-foreground"
                              >
                                {label}
                                <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className={dir === 0 ? "opacity-35" : ""}>
                                  <path d="M6 1.5 9 5H3Z" fill="currentColor" opacity={dir === -1 ? 0.3 : 1} />
                                  <path d="M6 10.5 3 7h6Z" fill="currentColor" opacity={dir === 1 ? 0.3 : 1} />
                                </svg>
                              </button>
                            </Th>
                          );
                        })}
                        <Th className="w-10">
                          <span className="sr-only">Remove</span>
                        </Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ id, theme, run }) => (
                        <tr key={id}>
                          <Td>
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <Swatch color={theme?.palette?.accent} />
                              <span className="truncate">{theme?.name ?? id}</span>
                            </span>
                          </Td>
                          <Td className="whitespace-nowrap tabular-nums">
                            {run ? mdy(run.weekOf) : <span className="text-muted" title="Its run was cleared from the queue">—</span>}
                          </Td>
                          <Td className="whitespace-nowrap tabular-nums">
                            {run ? runLastDay(run.weekOf, run.weeks ?? 1) : <span className="text-muted" title="Its run was cleared from the queue">—</span>}
                          </Td>
                          <Td>
                            <button
                              type="button"
                              className="rounded px-1.5 text-muted hover:bg-background hover:text-foreground"
                              aria-label={`Remove ${theme?.name ?? id} from past featured`}
                              onClick={() => removeFromPast(id)}
                            >
                              ×
                            </button>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                );
              })()
            )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
