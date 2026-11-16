import { useEffect, useState } from "react";
import { Lock, LockOpen, Plus, Search, Shuffle, Trash2 } from "lucide-react";
import { useDraft } from "../state/DraftContext";
import { runEndIso, specialQueueOf, type CmsDraft, type CmsTheme, type SpecialRunDraft } from "../types/draft";
import { mdy, mondayOf, mondayOfIso, runLastDay } from "../lib/schedule";
import { Badge, Button, Field, Input, Panel, Select, Swatch } from "../ui/primitives";

const MAX_WEEKS = 8;

type RunState = "now" | "next" | "later" | "ended";

function stateOf(run: SpecialRunDraft, thisWeek: string): RunState {
  if (runEndIso(run) <= thisWeek) return "ended";
  return run.weekOf <= thisWeek ? "now" : "later";
}

function mergePast(prev: readonly string[] | undefined, ids: readonly string[]): string[] {
  const merged = [...(prev ?? [])];
  for (const id of ids) if (id && !merged.includes(id)) merged.push(id);
  return merged;
}

/**
 * The Brand Pack's featured queue. Each run features 2 Brand themes from a start Monday for 1 to 8 weeks; the run
 * covering today is live, the rest wait their turn, and between runs the fortnight rotation is back. A filled run's
 * themes join Past featured, which Random skips.
 */
export function FeaturedQueue() {
  const { draft, setDraft } = useDraft();
  if (!draft) return null;
  const thisWeek = mondayOf(new Date());
  const queue = specialQueueOf(draft);
  const brandThemes = draft.themes.filter((t) => t.group === "Brand");
  const pastFeatured = draft.brandFeaturedPast ?? [];
  const availableBrand = draft.brandThemeIds
    .map((id) => draft.themes.find((t) => t.id === id))
    .filter((t): t is CmsTheme => !!t && t.group === "Brand" && t.status === "Available");

  /** Writes the queue (dropping the old single weekly special) and records filled runs in Past featured. */
  function setQueue(f: (q: SpecialRunDraft[]) => SpecialRunDraft[]) {
    setDraft((d: CmsDraft) => {
      const next = f(specialQueueOf(d).map((r) => ({ ...r, brandIds: [...r.brandIds] })));
      let past = d.brandFeaturedPast ?? [];
      for (const r of next) if (r.brandIds.length === 2) past = mergePast(past, r.brandIds);
      return { ...d, specialQueue: next, weeklySpecial: null, brandFeaturedPast: past };
    });
  }
  const setRun = (i: number, patch: Partial<SpecialRunDraft>) => setQueue((q) => q.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  /** Brand themes Random may pick for run `i`: Available, never featured before, not already in any queued run. */
  function eligible(i: number, exclude: readonly string[] = []): CmsTheme[] {
    const used = new Set([...pastFeatured, ...exclude, ...queue.flatMap((r, k) => (k === i ? [] : r.brandIds))]);
    return availableBrand.filter((t) => !used.has(t.id));
  }
  const pick = (pool: CmsTheme[]) => (pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null);

  function randomFill(i: number) {
    const ids = [...queue[i].brandIds];
    while (ids.length < 2) {
      const id = pick(eligible(i, ids));
      if (!id) break;
      ids.push(id);
    }
    setRun(i, { brandIds: ids });
  }

  function addRun() {
    const lastEnd = queue.reduce((m, r) => (runEndIso(r) > m ? runEndIso(r) : m), thisWeek);
    setQueue((q) => [...q, { weekOf: mondayOfIso(lastEnd), weeks: 1, brandIds: [] }]);
  }

  // Shown in start order; `index` stays the run's place in the saved list.
  const shown = queue.map((run, index) => ({ run, index, state: stateOf(run, thisWeek) })).sort((a, b) => a.run.weekOf.localeCompare(b.run.weekOf));
  const live = shown.find((s) => s.state === "now") ?? null;
  const upcoming = shown.filter((s) => s.state === "later");
  const ended = shown.filter((s) => s.state === "ended");
  const overlaps = (i: number) => {
    const r = queue[i];
    return queue.some((o, k) => k !== i && r.weekOf < runEndIso(o) && o.weekOf < runEndIso(r));
  };
  const nameOf = (id: string) => draft.themes.find((t) => t.id === id)?.name ?? id;

  const card = ({ run, index, state }: { run: SpecialRunDraft; index: number; state: RunState }, upNext = false) => (
    <RunCard
      key={index}
      run={run}
      state={state}
      upNext={upNext}
      overlap={overlaps(index)}
      brandThemes={brandThemes}
      pastFeatured={pastFeatured}
      canRandom={run.brandIds.length < 2 && eligible(index, run.brandIds).length > 0}
      onChange={(patch) => setRun(index, patch)}
      onRandom={() => randomFill(index)}
      onRemove={() => setQueue((q) => q.filter((_, k) => k !== index))}
    />
  );

  return (
    <Panel className="overflow-visible p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Featured queue</h2>
        {live ? (
          <Badge tone="ok">
            Live: {live.run.brandIds.map(nameOf).join(" & ") || "2 themes needed"} until {runLastDay(live.run.weekOf, live.run.weeks)}
          </Badge>
        ) : (
          <Badge tone="neutral">Fortnight rotation now</Badge>
        )}
      </div>
      <p className="mb-4 text-xs text-muted">
        Line up the 2 Brand themes the Brand Pack features and for how long. Each run starts on a Monday and lasts 1 to {MAX_WEEKS} weeks;
        between runs the fortnight rotation is back. Random picks Available themes that were never featured and are not already queued.
      </p>

      <section aria-label="Happening now" className="mb-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Happening now</h3>
        {live ? card(live) : <p className="rounded-md border border-dashed border-border/60 px-3 py-3 text-xs text-muted">Nothing featured this week: the Brand Pack uses the fortnight rotation.</p>}
      </section>

      <section aria-label="Up next">
        <h3 className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted">
          <span>Up next {upcoming.length ? `· ${upcoming.length}` : ""}</span>
        </h3>
        <div className="flex flex-col gap-2">
          {upcoming.map((s, k) => card(s, k === 0))}
          <Button type="button" variant="ghost" className="justify-center gap-1.5 border border-dashed border-border/70" onClick={addRun}>
            <Plus aria-hidden className="size-4" />
            Add to queue
          </Button>
        </div>
      </section>

      {ended.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted">
          <span>
            {ended.length} ended run{ended.length === 1 ? "" : "s"}: {ended.map((s) => `${mdy(s.run.weekOf)} (${s.run.brandIds.map(nameOf).join(" & ")})`).join(", ")}
          </span>
          <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setQueue((q) => q.filter((r) => stateOf(r, thisWeek) !== "ended"))}>
            Clear ended
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}

function RunCard({
  run,
  state,
  upNext,
  overlap,
  brandThemes,
  pastFeatured,
  canRandom,
  onChange,
  onRandom,
  onRemove,
}: {
  run: SpecialRunDraft;
  state: RunState;
  upNext: boolean;
  overlap: boolean;
  brandThemes: CmsTheme[];
  pastFeatured: readonly string[];
  canRandom: boolean;
  onChange: (patch: Partial<SpecialRunDraft>) => void;
  onRandom: () => void;
  onRemove: () => void;
}) {
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  // Picker search: cleared each time the picker opens.
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  useEffect(() => {
    setQuery("");
    setActive(0);
  }, [picking]);
  // The live run is locked against edits until its lock is clicked; it locks again when you leave the page.
  const lockable = state === "now";
  const [unlocked, setUnlocked] = useState(false);
  const locked = lockable && !unlocked;
  useEffect(() => {
    if (locked) setPicking(null);
  }, [locked]);
  const weeks = run.weeks ?? 1;
  const ids = run.brandIds;

  function setSlot(index: 0 | 1, id: string | null) {
    const next = [...ids];
    if (id === null) next.splice(index, 1);
    else if (index < next.length) next[index] = id;
    else next.push(id);
    onChange({ brandIds: next });
    setPicking(null);
  }

  return (
    <div className={"rounded-lg border p-3 " + (state === "now" ? "border-success/50 bg-success/5" : "border-border/70 bg-background/40")}>
      <div className="mb-2.5 flex flex-wrap items-end gap-2.5">
        <div className="mr-auto flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2">
            {state === "now" ? <Badge tone="ok">Now</Badge> : upNext ? <Badge tone="info">Next</Badge> : <Badge tone="neutral">Queued</Badge>}
            <span className="text-xs tabular-nums text-foreground">
              {mdy(run.weekOf)} – {runLastDay(run.weekOf, weeks)}
            </span>
          </span>
          {overlap ? <span className="text-xs text-destructive-foreground">Overlaps another run. Move its start or shorten it.</span> : null}
        </div>
        {lockable ? (
          <Button
            type="button"
            variant="ghost"
            aria-pressed={unlocked}
            onClick={() => setUnlocked((u) => !u)}
            title={locked ? "The live run is locked. Click to edit it." : "Lock the live run again"}
            aria-label={locked ? "Locked. Click to edit the live run" : "Editing. Click to lock the live run"}
            className={
              // Same border width in both states so the row never shifts; only the button's look changes.
              "h-8 min-w-[5.5rem] justify-center gap-1.5 border px-2.5 text-xs " +
              (locked ? "border-transparent text-muted hover:text-foreground" : "border-warning/60 text-warning hover:text-warning")
            }
          >
            {locked ? <Lock aria-hidden className="size-3.5" /> : <LockOpen aria-hidden className="size-3.5" />}
            {locked ? "Locked" : "Editing"}
          </Button>
        ) : null}
        <Field label="Starts (Monday)">
          <Input
            type="date"
            value={run.weekOf}
            disabled={locked}
            onChange={(e) => e.target.value && onChange({ weekOf: mondayOfIso(e.target.value) })}
            className="h-8 w-40"
          />
        </Field>
        <Field label="Duration">
          <Select value={weeks} disabled={locked} onChange={(e) => onChange({ weeks: Number(e.target.value) })} className="h-8 disabled:cursor-not-allowed disabled:opacity-50">
            {Array.from({ length: MAX_WEEKS }, (_, k) => k + 1).map((n) => (
              <option key={n} value={n}>
                {n} week{n === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="button" variant="ghost" className="h-8 gap-1.5 px-2.5 text-xs" disabled={!canRandom || locked} onClick={onRandom} title="Fill empty slots at random">
          <Shuffle aria-hidden className="size-3.5" />
          Random
        </Button>
        <Button type="button" variant="ghost" className="h-8 px-2 text-muted hover:text-destructive-foreground" disabled={locked} onClick={onRemove} aria-label={`Remove the run starting ${mdy(run.weekOf)}`}>
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {([0, 1] as const).map((index) => {
            const id = ids[index];
            const theme = id ? brandThemes.find((t) => t.id === id) : null;
            const open = picking === index;
            return id ? (
              <div key={index} className="flex items-center gap-2.5 rounded-md border border-border/60 bg-card px-2.5 py-2 text-sm">
                <Swatch color={theme?.palette?.accent} />
                <button
                  type="button"
                  disabled={locked}
                  className="min-w-0 flex-1 truncate text-left enabled:hover:underline disabled:cursor-not-allowed"
                  aria-expanded={open}
                  onClick={() => setPicking(open ? null : index)}
                >
                  {theme?.name ?? id}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  className="shrink-0 rounded px-1.5 text-muted enabled:hover:bg-background enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Remove ${theme?.name ?? id}`}
                  onClick={() => setSlot(index, null)}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                key={index}
                type="button"
                aria-expanded={open}
                disabled={locked}
                onClick={() => setPicking(open ? null : (ids.length as 0 | 1))}
                className="flex min-h-[40px] disabled:cursor-not-allowed disabled:opacity-50 items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-card px-2.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                <Plus aria-hidden className="size-4" />
                Add Brand theme
              </button>
            );
          })}
        </div>
        {picking !== null
          ? (() => {
              const q = query.trim().toLowerCase();
              const options = brandThemes
                .filter((t) => t.id !== ids[picking === 0 ? 1 : 0])
                .filter((t) => !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
              const at = Math.min(active, Math.max(0, options.length - 1));
              const listId = `brand-pick-${run.weekOf}-${picking}`;
              return (
                // Opens upward, above the slots; the search box sits at the bottom, next to the slot you clicked.
                <div className="absolute bottom-full left-0 right-0 z-20 mb-1.5 flex flex-col rounded-md border border-border bg-card p-1 shadow-card">
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-xs font-medium text-muted">
                      Brand themes{q ? ` · ${options.length} match${options.length === 1 ? "" : "es"}` : ""}
                    </span>
                    <button type="button" className="text-xs text-muted hover:text-foreground" onClick={() => setPicking(null)}>
                      Cancel
                    </button>
                  </div>
                  <ul id={listId} role="listbox" aria-label="Brand themes" className="m-0 max-h-56 list-none overflow-y-auto p-0">
                    {options.length === 0 ? (
                      <li className="px-2.5 py-3 text-sm text-muted">No Brand theme matches “{query.trim()}”.</li>
                    ) : (
                      options.map((t, i) => (
                        <li key={t.id} role="option" aria-selected={i === at}>
                          <button
                            type="button"
                            tabIndex={-1}
                            ref={i === at ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                            onMouseEnter={() => setActive(i)}
                            className={
                              "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm hover:bg-background " +
                              (i === at || ids[picking] === t.id ? "bg-background" : "")
                            }
                            onClick={() => setSlot(picking, t.id)}
                          >
                            <Swatch color={t.palette?.accent} />
                            <span className="min-w-0 flex-1 truncate">{t.name}</span>
                            {t.status !== "Available" ? <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">{t.status}</span> : null}
                            {pastFeatured.includes(t.id) ? <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">past</span> : null}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                  <label className="mt-1 flex items-center gap-2 rounded border border-border/70 bg-background px-2.5 focus-within:border-ring">
                    <Search aria-hidden className="size-3.5 shrink-0 text-muted" />
                    <input
                      autoFocus
                      type="search"
                      role="combobox"
                      aria-expanded
                      aria-controls={listId}
                      aria-label="Search Brand themes"
                      placeholder="Search Brand themes"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                          e.preventDefault();
                          if (options.length) setActive((at + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          if (options[at]) setSlot(picking, options[at].id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setPicking(null);
                        }
                      }}
                      className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                    />
                  </label>
                </div>
              );
            })()
          : null}
      </div>
      {ids.length !== 2 ? <p className="mt-2 text-xs text-destructive-foreground">Pick 2 themes before pushing.</p> : null}
    </div>
  );
}
