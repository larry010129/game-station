import { useMemo, useState } from "react";
import { Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PackSettingsPanels } from "../components/PackSettingsPanels";
import { useDraft } from "../state/DraftContext";
import {
  DEFAULT_WIDGET_PACK,
  WIDGET_CATALOG,
  defaultWidgetStars,
  widgetPackErrors,
  widgetPackOf,
  widgetWikiKey,
  type WidgetPackDraft,
  type WidgetStatus,
  withWikiHidden,
} from "../types/draft";
import { Badge, Button, EmptyState, Input, PageHeader, Panel, Select, TableBody, TableHeader, TableRow, TableShell, Td, Th } from "../ui/primitives";

/** Status labels: the stored "Available" reads as "Drawable" here, since a Free card is available too. */
const STATUS: { value: WidgetStatus; label: string; tone: "neutral" | "ok" | "info" | "warn" }[] = [
  { value: "Free", label: "Free", tone: "neutral" },
  { value: "Available", label: "Drawable", tone: "ok" },
  { value: "Hidden", label: "Hidden", tone: "info" },
  { value: "Archived", label: "Archived", tone: "warn" },
];

const OTHER = "__other__";

/**
 * The Widget Pack: the dashboard cards themselves (Spotify control, Discord, Leak feed…) as 4- and 5-star prizes.
 * Every card starts Free; switch one to Drawable to make players win it from the pack. A card the pack does not list
 * is Free in the app. The card's code ships in the app, so a new id only works once the app knows it. The first edit
 * copies the default pack (every card listed, Free) into the draft.
 */
export function WidgetsPage() {
  const { draft, setDraft } = useDraft();
  const wp = draft ? widgetPackOf(draft) : DEFAULT_WIDGET_PACK;
  const edited = draft?.widgetPack != null;
  const [pick, setPick] = useState("");
  const [otherId, setOtherId] = useState("");

  const update = (fn: (w: WidgetPackDraft) => WidgetPackDraft) => setDraft((d) => ({ ...d, widgetPack: fn(widgetPackOf(d)) }));

  const counts = useMemo(() => {
    const on = wp.widgets.filter((w) => w.status === "Available");
    return { five: on.filter((w) => w.stars === 5).length, four: on.filter((w) => w.stars === 4).length };
  }, [wp.widgets]);
  const unlisted = WIDGET_CATALOG.filter((c) => !wp.widgets.some((w) => w.id === c.id));

  if (!draft) return null;

  const errors = widgetPackErrors(draft);
  const wikiHidden = new Set(draft.wikiHiddenIds ?? []);

  const perCard = (stars: 4 | 5) => {
    const n = stars === 5 ? counts.five : counts.four;
    const share = stars === 5 ? wp.weights.five : wp.weights.four;
    return n > 0 ? `${(share / n).toFixed(3).replace(/\.?0+$/, "")}% each` : "none drawable";
  };

  const addId = (pick === OTHER ? otherId : pick).trim();
  const addBlocked = !addId ? "Pick a card" : wp.widgets.some((w) => w.id === addId) ? "Already listed" : null;
  const add = () => {
    if (addBlocked) return;
    update((w) => ({ ...w, widgets: [...w.widgets, { id: addId, stars: defaultWidgetStars(addId), status: "Free" }] }));
    setPick("");
    setOtherId("");
  };

  return (
    <div>
      <PageHeader
        title="Widgets"
        description="The Widget Pack in the app's Draw tab: the dashboard cards themselves. Every card starts Free; make one Drawable to have players win it."
        actions={
          <>
            <Badge tone="info">
              {counts.five} five-star · {counts.four} four-star drawable
            </Badge>
            {edited ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Remove the Widget Pack from the draft? Every card is Free again once this is published.")) {
                    setDraft((d) => ({ ...d, widgetPack: undefined }));
                  }
                }}
              >
                Reset (all Free)
              </Button>
            ) : (
              <Badge tone="neutral">Not published yet · all Free</Badge>
            )}
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Switch checked={wp.enabled} onCheckedChange={(on) => update((w) => ({ ...w, enabled: on }))} aria-label="Widget Pack on" />
              {wp.enabled ? "Pack on" : "Pack off"}
            </label>
          </>
        }
      />

      {errors.length ? (
        <Panel className="mb-4 border-destructive/40 p-3">
          <p className="text-sm font-medium text-destructive-foreground">Publish is blocked</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <TableShell>
            <TableHeader>
              <TableRow>
                <Th>Card</Th>
                <Th>Group</Th>
                <Th>Stars</Th>
                <Th>Status</Th>
                <Th>Chance per draw</Th>
                <Th>
                  <span title="Off: the app's Draw Wiki leaves it out (search, lists, Featured now), so it is not spoiled. It can still drop.">Wiki</span>
                </Th>
                <Th className="w-24">
                  <span className="sr-only">Lock and remove</span>
                </Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wp.widgets.map((w) => {
                const cat = WIDGET_CATALOG.find((c) => c.id === w.id);
                const name = cat?.name ?? w.id;
                const setWidget = (patch: Partial<typeof w>) =>
                  update((p) => ({ ...p, widgets: p.widgets.map((x) => (x.id === w.id ? { ...x, ...patch } : x)) }));
                // A locked row cannot change stars or status, or be removed, until it is unlocked.
                const isLocked = w.locked === true;
                const st = STATUS.find((s) => s.value === w.status);
                return (
                  <TableRow key={w.id}>
                    <Td>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">{name}</span>
                          {cat ? null : (
                            <span title="This id is not in the CMS card list: the app must ship this card's code before it can be drawn.">
                              <Badge tone="warn">Needs app update</Badge>
                            </span>
                          )}
                        </div>
                        <div className="truncate font-mono text-xs text-muted">{w.id}</div>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-sm text-muted">{cat?.group ?? "—"}</span>
                    </Td>
                    <Td>
                      <Select disabled={isLocked} aria-label={`${name} stars`} value={w.stars} onChange={(e) => setWidget({ stars: Number(e.target.value) === 5 ? 5 : 4 })}>
                        <option value={4}>4-star</option>
                        <option value={5}>5-star</option>
                      </Select>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Select disabled={isLocked} aria-label={`${name} status`} value={w.status} onChange={(e) => setWidget({ status: e.target.value as WidgetStatus })}>
                          {STATUS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </Select>
                        <span className="hidden sm:inline">
                          <Badge tone={st?.tone ?? "neutral"}>{st?.label ?? w.status}</Badge>
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span className="tabular-nums text-sm text-muted">{w.status === "Available" ? perCard(w.stars) : "—"}</span>
                    </Td>
                    <Td>
                      <Switch
                        checked={!wikiHidden.has(widgetWikiKey(w.id))}
                        onCheckedChange={(on) => setDraft((d) => withWikiHidden(d, widgetWikiKey(w.id), !on))}
                        aria-label={`Show ${name} in the Wiki`}
                      />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-pressed={isLocked}
                          aria-label={isLocked ? `Unlock ${name} for editing` : `Lock ${name} against edits`}
                          title={isLocked ? "Locked: click to allow edits" : "Lock this row against edits"}
                          onClick={() => setWidget({ locked: isLocked ? undefined : true })}
                          className={
                            isLocked
                              ? "grid size-8 place-items-center rounded-md bg-warning/15 text-warning transition-colors hover:bg-warning/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              : "grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          }
                        >
                          {isLocked ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
                        </button>
                        <button
                          type="button"
                          disabled={isLocked}
                          aria-label={`Remove ${name} from the pack`}
                          title={isLocked ? "Unlock the row to remove it" : "Remove from the pack (the card is Free again)"}
                          onClick={() => update((p) => ({ ...p, widgets: p.widgets.filter((x) => x.id !== w.id) }))}
                          className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-destructive/15 hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </Td>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableShell>
          {wp.widgets.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No cards listed" body="Every card is Free. Add one below to set its stars and status." />
            </div>
          ) : null}

          <Panel className="mt-4 p-4">
            <h2 className="mb-1 text-sm font-semibold">Add a card</h2>
            <p className="mb-3 text-xs text-muted">
              Pick an app card the pack does not list yet, or type the id of a card a coming app update adds.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Select aria-label="Card to add" value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-56">
                <option value="">Choose a card…</option>
                {unlisted.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.group})
                  </option>
                ))}
                <option value={OTHER}>Other id…</option>
              </Select>
              {pick === OTHER ? (
                <Input
                  aria-label="Card id"
                  placeholder="card id"
                  value={otherId}
                  onChange={(e) => setOtherId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") add();
                  }}
                  className="w-44 font-mono"
                />
              ) : null}
              <Button type="button" onClick={add} disabled={addBlocked != null} title={addBlocked ?? undefined}>
                <Plus className="size-4" aria-hidden /> Add
              </Button>
              {pick === OTHER && addId && !WIDGET_CATALOG.some((c) => c.id === addId) ? <Badge tone="warn">Needs app update</Badge> : null}
            </div>
          </Panel>

          <p className="mt-3 max-w-2xl text-xs text-muted">
            Free cards are on every dashboard with no draw. Drawable cards are locked until a player wins (or buys) them from
            the Widget Pack. Archived cards leave the pack but owners keep them; Hidden cards are not shown at all. Removing a
            row makes that card Free again. 5-star cards are the resource-hungry ones. A card's code ships with the app: this
            page only decides who gets it, so a new card needs an app update first.
          </p>
        </div>

        <PackSettingsPanels pack={wp} update={update} noun="card" buyWhere="in the app" regularCrystalCost={draft.economy.regularCrystalCost} />
      </div>
    </div>
  );
}
