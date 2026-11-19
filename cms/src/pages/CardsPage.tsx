import { useMemo } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PackSettingsPanels } from "../components/PackSettingsPanels";
import { useDraft } from "../state/DraftContext";
import {
  CARD_SKIN_CATALOG,
  DEFAULT_CARD_PACK,
  cardPackOf,
  type CardPackDraft,
  type CardSkinStatus,
  withWikiHidden,
} from "../types/draft";
import { Badge, Button, PageHeader, Select, StatusBadge, TableBody, TableHeader, TableRow, TableShell, Td, Th } from "../ui/primitives";

/**
 * The Card Pack: dashboard card skins at 4 and 5 stars. The skins' art ships in the app, so this page switches each
 * one on (Available), keeps it for owners only (Archived) or hides it, sets its stars, and runs the pack's price,
 * ticket, odds, pity and repeat rewards. The first edit copies the app's bundled pack into the draft.
 */
export function CardsPage() {
  const { draft, setDraft } = useDraft();
  const cp = draft ? cardPackOf(draft) : DEFAULT_CARD_PACK;
  const edited = draft?.cardPack != null;

  const update = (fn: (c: CardPackDraft) => CardPackDraft) =>
    setDraft((d) => ({ ...d, cardPack: fn(cardPackOf(d)) }));

  const counts = useMemo(() => {
    const on = cp.skins.filter((s) => s.status === "Available");
    return { five: on.filter((s) => s.stars === 5).length, four: on.filter((s) => s.stars === 4).length };
  }, [cp.skins]);

  if (!draft) return null;

  const perSkin = (stars: 4 | 5) => {
    const n = stars === 5 ? counts.five : counts.four;
    const share = stars === 5 ? cp.weights.five : cp.weights.four;
    return n > 0 ? `${(share / n).toFixed(3).replace(/\.?0+$/, "")}% each` : "none drawable";
  };

  return (
    <div>
      <PageHeader
        title="Cards"
        description="The Card Pack in the app's Draw tab: skins that restyle every dashboard card. Switch skins on, set their stars, and tune the pack."
        actions={
          <>
            <Badge tone="info">
              {counts.five} five-star · {counts.four} four-star on
            </Badge>
            {edited ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (window.confirm("Put the Card Pack back to the app's bundled settings?")) setDraft((d) => ({ ...d, cardPack: undefined }));
                }}
              >
                Reset to bundled
              </Button>
            ) : (
              <Badge tone="neutral">Bundled settings</Badge>
            )}
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Switch checked={cp.enabled} onCheckedChange={(on) => update((c) => ({ ...c, enabled: on }))} aria-label="Card Pack on" />
              {cp.enabled ? "Pack on" : "Pack off"}
            </label>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <TableShell>
            <TableHeader>
              <TableRow>
                <Th>Skin</Th>
                <Th>Stars</Th>
                <Th>Status</Th>
                <Th>Chance per draw</Th>
                <Th>
                  <span title="Off: the app's Draw Wiki leaves it out (search, lists, Featured now), so it is not spoiled. It can still drop.">Wiki</span>
                </Th>
                <Th className="w-12">
                  <span className="sr-only">Lock</span>
                </Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cp.skins.map((s) => {
                const cat = CARD_SKIN_CATALOG.find((c) => c.id === s.id);
                const setSkin = (patch: Partial<typeof s>) =>
                  update((c) => ({ ...c, skins: c.skins.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) }));
                // A locked row cannot change stars or status until it is unlocked, so a stray click cannot move it.
                const isLocked = s.locked === true;
                return (
                  <TableRow key={s.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="h-8 w-11 shrink-0 rounded-md border border-border/80 shadow-sm"
                          style={{ background: cat?.tint ?? "var(--secondary)" }}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{cat?.name ?? s.id}</div>
                          <div className="truncate font-mono text-xs text-muted">{s.id}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Select disabled={isLocked} aria-label={`${cat?.name ?? s.id} stars`} value={s.stars} onChange={(e) => setSkin({ stars: Number(e.target.value) === 5 ? 5 : 4 })}>
                        <option value={4}>4-star</option>
                        <option value={5}>5-star</option>
                      </Select>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Select
                          disabled={isLocked}
                          aria-label={`${cat?.name ?? s.id} status`}
                          value={s.status}
                          onChange={(e) => setSkin({ status: e.target.value as CardSkinStatus })}
                        >
                          <option value="Available">Available</option>
                          <option value="Hidden">Hidden</option>
                          <option value="Archived">Archived</option>
                        </Select>
                        <span className="hidden sm:inline">
                          <StatusBadge status={s.status} />
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span className="tabular-nums text-sm text-muted">{s.status === "Available" ? perSkin(s.stars) : "—"}</span>
                    </Td>
                    <Td>
                      <Switch
                        checked={!(draft?.wikiHiddenIds ?? []).includes(s.id)}
                        onCheckedChange={(on) => setDraft((d) => withWikiHidden(d, s.id, !on))}
                        aria-label={`Show ${cat?.name ?? s.id} in the Wiki`}
                      />
                    </Td>
                    <Td>
                      <button
                        type="button"
                        aria-pressed={isLocked}
                        aria-label={isLocked ? `Unlock ${cat?.name ?? s.id} for editing` : `Lock ${cat?.name ?? s.id} against edits`}
                        title={isLocked ? "Locked: click to allow edits" : "Lock this row against edits"}
                        onClick={() => setSkin({ locked: isLocked ? undefined : true })}
                        className={
                          isLocked
                            ? "grid size-8 place-items-center rounded-md bg-warning/15 text-warning transition-colors hover:bg-warning/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            : "grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        }
                      >
                        {isLocked ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
                      </button>
                    </Td>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableShell>
          <p className="mt-3 max-w-2xl text-xs text-muted">
            Available skins can be drawn or bought. Archived skins leave the pack but owners keep them. Hidden skins are not
            shown at all, so release skins over time by switching them to Available. Lock a row to stop its stars and status
            from being changed by mistake. Skin art ships with the app, so a new skin needs an app update first.
          </p>
        </div>

        <PackSettingsPanels pack={cp} update={update} noun="skin" buyWhere="on the Themes page" regularCrystalCost={draft.economy.regularCrystalCost} />
      </div>
    </div>
  );
}
