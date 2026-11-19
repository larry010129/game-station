import { StarTag, ThemeCardPreview, starsOfTheme } from "../components/ThemeCardPreview";
import { useMemo, useState } from "react";
import {
  createTheme,
  duplicateTheme,
} from "../lib/catalogFactory";
import { LineTabs } from "@/components/ui/line-tabs";
import { Switch } from "@/components/ui/switch";
import { useDraft } from "../state/DraftContext";
import {
  brandPoolOf,
  COUNTRIES,
  regionShort,
  REGIONS,
  type CmsTheme,
  type PackTag,
  type ThemeGroup,
  type ThemeStatus,
  type ThemeTags,
  withWikiHidden,
} from "../types/draft";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
  Swatch,
  TableShell,
  Td,
  Th,
} from "../ui/primitives";

const STATUSES: ThemeStatus[] = ["Hidden", "Available", "Archived"];
const GROUPS: ThemeGroup[] = ["Regular", "Brand"];
const PALETTE_KEYS = [
  "bg",
  "card",
  "text",
  "muted",
  "accent",
  "caution",
  "alert",
  "border",
  "radius",
] as const;

type SortKey = "name" | "stars" | "group" | "status" | "tags" | "accent" | "id";
const SORT_COLUMNS: [SortKey, string][] = [
  ["name", "Name"],
  ["stars", "Rarity"],
  ["group", "Group"],
  ["status", "Status"],
  ["tags", "Tags"],
  ["accent", "Accent"],
  ["id", "Id"],
];
const STATUS_ORDER: Record<string, number> = { Available: 0, Hidden: 1, Archived: 2 };

/** Hue (0–360) of a #hex, rgb() or hsl() colour, so the Accent column sorts as a colour wheel. Grey sorts last. */
function hueOf(color: string | undefined): number {
  const c = (color ?? "").trim().toLowerCase();
  const hsl = c.match(/^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%/);
  if (hsl) return Number(hsl[2]) < 8 ? 400 : ((Number(hsl[1]) % 360) + 360) % 360;
  let rgb: number[] | null = null;
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((x) => x + x).join("") : hex[1];
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    const m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    if (m) rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  if (!rgb) return 500;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d < 0.06) return 400;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** What each column sorts by: the text it shows (Tags as its line), Status in workflow order, Accent by hue. */
type SortContext = { back: ReadonlySet<string>; rainbow: ReadonlySet<string> };
const SORT_VALUE: Record<SortKey, (t: CmsTheme, ctx: SortContext) => string | number> = {
  name: (t) => t.name,
  stars: (t, { rainbow }) => starsOfTheme(t, rainbow.has(t.id)),
  group: (t) => t.group,
  status: (t) => STATUS_ORDER[t.status] ?? 9,
  tags: (t, { back }) =>
    t.tags
      ? [t.tags.packs.includes("brand") ? "Brand" : "", t.tags.packs.includes("region") ? "Region" : "", back.has(t.id) ? "Regular" : "", t.tags.country, t.tags.region].join(" ")
      : "￿" /* untagged rows sort last */,
  accent: (t) => hueOf(t.palette?.accent),
  id: (t) => t.id,
};

export function ThemesPage() {
  // The card preview stays open while you click through themes, so palette edits can be watched live.
  const [previewOpen, setPreviewOpen] = useState(false);
  const { draft, setDraft } = useDraft();
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | ThemeGroup>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ThemeStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [packFilter, setPackFilter] = useState<"all" | PackTag | "untagged">("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  const themes = draft?.themes ?? [];
  const brandPool = draft ? brandPoolOf(draft) : [];
  const backInRegular = new Set(draft?.regularExtraIds ?? []);
  const rainbowSet = new Set(draft?.rainbowThemeIds ?? []);
  const wikiHidden = new Set(draft?.wikiHiddenIds ?? []);

  /** Marks a Regular theme rainbow (5-star, draw-only), or back to standard (`rainbowThemeIds`). */
  function setRainbow(id: string, on: boolean) {
    setDraft((d) => {
      const now = (d.rainbowThemeIds ?? []).filter((x) => x !== id);
      return { ...d, rainbowThemeIds: on ? [...now, id] : now };
    });
  }

  /** Adds a Brand theme back into the Regular Pack pool (`regularExtraIds`), or takes it out again. */
  function setBackInRegular(id: string, on: boolean) {
    setDraft((d) => {
      const now = (d.regularExtraIds ?? []).filter((x) => x !== id);
      const next = on ? [...now, id] : now;
      return { ...d, regularExtraIds: next.length ? next : undefined };
    });
  }
  // Column sort: click a header for A→Z, again for Z→A, a third time for the draft order.
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));
  }
  const regionCount = (key: string) => themes.filter((t) => t.tags?.region === key && t.tags.packs.includes("region")).length;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return themes.filter((t) => {
      if (groupFilter !== "all" && t.group !== groupFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (packFilter === "untagged" && (t.group !== "Brand" || t.tags)) return false;
      if (packFilter !== "all" && packFilter !== "untagged" && !t.tags?.packs.includes(packFilter)) return false;
      if (regionFilter !== "all" && t.tags?.region !== regionFilter) return false;
      if (!needle) return true;
      return (
        t.name.toLowerCase().includes(needle) ||
        t.id.toLowerCase().includes(needle)
      );
    });
  }, [themes, q, groupFilter, statusFilter, packFilter, regionFilter]);
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const value = SORT_VALUE[sort.key];
    return [...filtered].sort((a, b) => {
      const ctx = { back: backInRegular, rainbow: rainbowSet };
      const x = value(a, ctx);
      const y = value(b, ctx);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
      return (c || a.name.localeCompare(b.name)) * sort.dir;
    });
  }, [filtered, sort, backInRegular, rainbowSet]);

  const selected = themes.find((t) => t.id === selectedId) ?? null;

  function updateTheme(id: string, patch: Partial<CmsTheme>) {
    setDraft((d) => ({
      ...d,
      themes: d.themes.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        // A theme moved into Brand gets starter tags (Region Pack only) so it can be placed right away.
        if (next.group === "Brand" && !next.tags) next.tags = { packs: ["region"], country: "US", region: "na" };
        return next;
      }),
    }));
  }

  function updateTags(id: string, patch: Partial<ThemeTags>) {
    setDraft((d) => ({
      ...d,
      themes: d.themes.map((t) =>
        t.id === id ? { ...t, tags: { packs: [], country: "US", region: "na", ...t.tags, ...patch } } : t,
      ),
    }));
  }

  function togglePack(theme: CmsTheme, pack: PackTag, on: boolean) {
    const now = theme.tags?.packs ?? [];
    const packs = on ? [...now.filter((p) => p !== pack), pack] : now.filter((p) => p !== pack);
    updateTags(theme.id, { packs: (["brand", "region"] as PackTag[]).filter((p) => packs.includes(p)) });
  }

  function updatePalette(id: string, key: string, value: string) {
    setDraft((d) => ({
      ...d,
      themes: d.themes.map((t) => {
        if (t.id !== id) return t;
        if (!t.palette) {
          return {
            ...t,
            palette: {
              bg: "#111",
              card: "#1a1a1a",
              text: "#fff",
              muted: "#888",
              accent: "#5b8def",
              caution: "#f0b429",
              alert: "#e5484d",
              border: "#333",
              radius: "0.5rem",
              [key]: value,
            },
          };
        }
        return { ...t, palette: { ...t.palette, [key]: value } };
      }),
    }));
  }

  function addTheme() {
    const theme = createTheme(themes.map((t) => t.id));
    setDraft((d) => ({ ...d, themes: [...d.themes, theme] }));
    setSelectedId(theme.id);
    setStatusFilter("all");
    setGroupFilter("all");
    setQ("");
  }

  function dupTheme(source: CmsTheme) {
    const copy = duplicateTheme(
      source,
      themes.map((t) => t.id),
    );
    setDraft((d) => ({ ...d, themes: [...d.themes, copy] }));
    setSelectedId(copy.id);
  }

  function removeTheme(id: string) {
    if (!window.confirm(`Delete theme “${id}”? This cannot be undone.`)) return;
    setDraft((d) => ({
      ...d,
      themes: d.themes.filter((t) => t.id !== id),
      brandThemeIds: d.brandThemeIds.filter((x) => x !== id),
      regularExtraIds: d.regularExtraIds?.filter((x) => x !== id),
      rainbowThemeIds: d.rainbowThemeIds?.filter((x) => x !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }

  const untagged = themes.filter((t) => t.group === "Brand" && !t.tags).length;

  if (!draft) return null;

  return (
    <div>
      <PageHeader
        title="Themes"
        description="Name, group, status, palette and pack tags. New themes start Hidden and autosave into the draft. Company (Brand-group) themes join the Brand Pack or the Region Pack through their tags."
        actions={
          <>
            <Badge tone="info">{themes.length} themes</Badge>
            <Badge tone={brandPool.length >= 2 ? "info" : "warn"}>Brand Pack {brandPool.length}</Badge>
            <Badge tone="info">
              Region Pack {themes.filter((t) => t.tags?.packs.includes("region")).length}
            </Badge>
            {untagged ? <Badge tone="warn">{untagged} Brand untagged</Badge> : null}
            <Button type="button" onClick={addTheme}>
              Add theme
            </Button>
          </>
        }
      />

      <Panel className="mb-4 p-4">
        <div>
          <h2 className="mb-1 text-sm font-semibold">Region Pack companies by region</h2>
          <p className="mb-2 text-xs text-muted">Click a region to list its themes. Plan region and country weeks on Odds &amp; prices.</p>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setGroupFilter("all");
                  setPackFilter("region");
                  setRegionFilter(regionFilter === r.key ? "all" : r.key);
                }}
                className={
                  "rounded-md border px-2 py-1 text-xs transition-colors " +
                  (regionFilter === r.key ? "border-border bg-secondary text-foreground" : "border-border/60 text-muted hover:text-foreground")
                }
              >
                {r.name} ({r.short}) <span className="tabular-nums">{regionCount(r.key)}</span>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <LineTabs
        label="Theme type"
        className="mb-3"
        value={groupFilter}
        onChange={setGroupFilter}
        tabs={[
          { id: "all", label: "All themes", count: themes.length },
          ...GROUPS.map((g) => ({ id: g, label: g, count: themes.filter((t) => t.group === g).length })),
        ]}
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          placeholder="Filter by name or id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-56"
        />
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | ThemeStatus)
          }
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={packFilter} onChange={(e) => setPackFilter(e.target.value as typeof packFilter)}>
          <option value="all">All packs</option>
          <option value="brand">Brand Pack</option>
          <option value="region">Region Pack</option>
          <option value="untagged">Brand, untagged</option>
        </Select>
        <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
          <option value="all">All regions</option>
          {REGIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <TableShell scroll>
          <thead>
            <tr>
              {SORT_COLUMNS.map(([key, label]) => {
                const dir = sort?.key === key ? sort.dir : 0;
                return (
                  <Th key={key} sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : "none"}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[on=true]:text-foreground"
                      data-on={dir !== 0}
                      title={dir === 1 ? `Sorted by ${label}, A to Z. Click for Z to A.` : dir === -1 ? `Sorted by ${label}, Z to A. Click for the draft order.` : `Sort by ${label}`}
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
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr
                key={t.id}
                data-state={selectedId === t.id ? "selected" : undefined}
                className="cursor-pointer transition-colors duration-150 hover:bg-secondary/60 data-[state=selected]:bg-secondary"
                onClick={() => setSelectedId(t.id)}
              >
                <Td className="font-medium">{t.name}</Td>
                <Td>
                  <StarTag stars={starsOfTheme(t, rainbowSet.has(t.id))} />
                </Td>
                <Td>
                  <Badge tone={t.group === "Brand" ? "warn" : "neutral"}>
                    {t.group}
                  </Badge>
                </Td>
                <Td>
                  {t.status === "Archived" ? (
                    <StatusBadge status={t.status} />
                  ) : (
                    // On = Available, off = Hidden, straight from the table. Archiving stays in the side panel.
                    <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={t.status === "Available"}
                        onCheckedChange={(on) => updateTheme(t.id, { status: on ? "Available" : "Hidden" })}
                        aria-label={`${t.name}: ${t.status === "Available" ? "Available, switch to hide" : "Hidden, switch to make available"}`}
                      />
                      <span className={"text-xs " + (t.status === "Available" ? "text-success" : "text-muted")}>{t.status}</span>
                    </span>
                  )}
                </Td>
                <Td className="text-xs text-muted">
                  {t.tags
                    ? [
                        t.tags.packs.includes("brand") ? "Brand" : null,
                        t.tags.packs.includes("region") ? "Region" : null,
                        backInRegular.has(t.id) ? "Regular" : null,
                        `${t.tags.country} · ${regionShort(t.tags.region)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : t.group === "Brand"
                      ? "untagged"
                      : ""}
                </Td>
                <Td>
                  <Swatch color={t.palette?.accent} />
                </Td>
                <Td className="font-mono text-xs text-muted">{t.id}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>

        <Panel className="p-4 lg:sticky lg:top-[calc(var(--cms-header-height)+1rem)] lg:max-h-[calc(100dvh-var(--cms-header-height)-2rem)] lg:overflow-auto lg:overscroll-contain">
          {selected ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <StarTag stars={starsOfTheme(selected, rainbowSet.has(selected.id))} />
                  {selected.name}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    aria-pressed={previewOpen}
                    aria-controls="theme-card-preview"
                    onClick={() => setPreviewOpen((o) => !o)}
                  >
                    {previewOpen ? "Hide preview" : "Preview"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => dupTheme(selected)}
                  >
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => removeTheme(selected.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {previewOpen ? (
                <div id="theme-card-preview" className="rounded-md border border-edge bg-background/40 p-3">
                  <ThemeCardPreview theme={selected} rainbow={rainbowSet.has(selected.id)} />
                </div>
              ) : null}
              <Field label="Name">
                <Input
                  value={selected.name}
                  onChange={(e) =>
                    updateTheme(selected.id, { name: e.target.value })
                  }
                />
              </Field>
              <p className="text-xs text-muted">
                Id (from name at create):{" "}
                <span className="font-mono text-ink">{selected.id}</span>
              </p>
              <Field label="Group">
                <Select
                  value={selected.group}
                  onChange={(e) =>
                    updateTheme(selected.id, {
                      group: e.target.value as ThemeGroup,
                    })
                  }
                >
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={selected.status}
                  onChange={(e) =>
                    updateTheme(selected.id, {
                      status: e.target.value as ThemeStatus,
                    })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="inline-flex items-center gap-1.5 text-xs" title="Off: the app's Draw Wiki leaves it out (search, lists, Featured now), so it is not spoiled. It can still drop.">
                <input type="checkbox" checked={!wikiHidden.has(selected.id)} onChange={(e) => setDraft((d) => withWikiHidden(d, selected.id, !e.target.checked))} />
                Show in Wiki
              </label>
              {selected.group !== "Brand" ? (
                <label
                  className="inline-flex items-center gap-1.5 text-xs"
                  title="Rainbow Regular themes are rarer: the Regular Pack's rainbow row and a missed 50/50 in the Brand or Region Pack. Never sold for Income, weekly unlocks or Regular crystals."
                >
                  <input type="checkbox" checked={rainbowSet.has(selected.id)} onChange={(e) => setRainbow(selected.id, e.target.checked)} />
                  Rainbow (5-star), draw only
                </label>
              ) : null}
              {selected.group === "Brand" ? (
                <div className="border-t border-edge pt-3">
                  <p className="mb-2 text-xs font-medium text-muted">Tags</p>
                  <div className="mb-2 flex flex-wrap gap-3 text-xs">
                    {(
                      [
                        ["brand", "Brand Pack"],
                        ["region", "Region Pack"],
                      ] as const
                    ).map(([pack, label]) => (
                      <label key={pack} className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={!!selected.tags?.packs.includes(pack)}
                          onChange={(e) => togglePack(selected, pack, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                    <label className="inline-flex items-center gap-1.5" title="Drops from the Regular theme row in every pack and can be picked with Regular crystals. Still never sold for Income.">
                      <input
                        type="checkbox"
                        checked={backInRegular.has(selected.id)}
                        onChange={(e) => setBackInRegular(selected.id, e.target.checked)}
                      />
                      Back in Regular Pack
                    </label>
                  </div>
                  {backInRegular.has(selected.id) && selected.status !== "Available" ? (
                    <p className="mb-2 text-xs text-muted">Only drops once its status is Available.</p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Country">
                      <Select
                        value={selected.tags?.country ?? ""}
                        onChange={(e) => updateTags(selected.id, { country: e.target.value })}
                      >
                        {!selected.tags?.country || COUNTRIES[selected.tags.country] ? null : (
                          <option value={selected.tags.country}>{selected.tags.country}</option>
                        )}
                        {Object.entries(COUNTRIES)
                          .sort((a, b) => a[1].localeCompare(b[1]))
                          .map(([code, name]) => (
                            <option key={code} value={code}>
                              {name} ({code})
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <Field label="Region">
                      <Select
                        value={selected.tags?.region ?? ""}
                        onChange={(e) => updateTags(selected.id, { region: e.target.value })}
                      >
                        {REGIONS.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.name} ({r.short})
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  {selected.tags ? (
                    <p className="mt-2 text-xs text-muted">
                      Tag shows: <span className="font-mono text-ink">{selected.tags.country} · {regionShort(selected.tags.region)}</span>
                    </p>
                  ) : null}
                  {!selected.tags ? (
                    <p className="mt-2 text-xs text-muted">Untagged: this theme is in neither pack until you tick one.</p>
                  ) : null}
                </div>
              ) : null}
              <div className="border-t border-edge pt-3">
                <p className="mb-2 text-xs font-medium text-muted">Palette</p>
                {selected.palette == null ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted">
                      Charcoal uses the built-in station palette (null).
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        updatePalette(selected.id, "accent", "#5b8def")
                      }
                    >
                      Attach editable palette
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {PALETTE_KEYS.map((key) => (
                      <Field key={key} label={key}>
                        <div className="flex items-center gap-1.5">
                          {key !== "radius" ? (
                            <Swatch color={selected.palette?.[key]} />
                          ) : null}
                          <Input
                            value={String(selected.palette?.[key] ?? "")}
                            onChange={(e) =>
                              updatePalette(selected.id, key, e.target.value)
                            }
                          />
                        </div>
                      </Field>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Select a theme"
              body="Click a row to edit, or Add theme for a new Hidden entry."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
