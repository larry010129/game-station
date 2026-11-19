import { useMemo, useState } from "react";
import {
  PreviewButton,
  getAlertPreviewSrc,
  setLocalAlertPreview,
} from "../components/PreviewButton";
import {
  ITEM_KINDS,
  PROTECTED_ITEM_IDS,
  createItem,
  duplicateItem,
  stackableForKind,
  tierForKind,
} from "../lib/catalogFactory";
import { useDraft } from "../state/DraftContext";
import { withWikiHidden, type CmsItem, type ItemKind, type ItemTier } from "../types/draft";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  TableShell,
  Td,
  Th,
} from "../ui/primitives";

const KINDS = ITEM_KINDS;

export function ItemsPage() {
  const { draft, setDraft } = useDraft();
  const [kindFilter, setKindFilter] = useState<"all" | ItemKind>("all");
  const [newKind, setNewKind] = useState<ItemKind>("wallpaper");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Bumps when a local blob preview is attached so Play picks it up. */
  const [previewTick, setPreviewTick] = useState(0);

  const items = draft?.items ?? [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (kindFilter !== "all" && it.kind !== kindFilter) return false;
      if (!needle) return true;
      return (
        it.name.toLowerCase().includes(needle) ||
        it.id.toLowerCase().includes(needle)
      );
    });
  }, [items, kindFilter, q]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) map[it.kind] = (map[it.kind] ?? 0) + 1;
    return map;
  }, [items]);

  function updateItem(id: string, patch: Partial<CmsItem>) {
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }

  function addItem() {
    const kind = kindFilter !== "all" ? kindFilter : newKind;
    const item = createItem(
      kind,
      items.map((i) => i.id),
    );
    setDraft((d) => ({ ...d, items: [...d.items, item] }));
    setSelectedId(item.id);
    setQ("");
  }

  function dupItem(source: CmsItem) {
    const copy = duplicateItem(
      source,
      items.map((i) => i.id),
    );
    setDraft((d) => ({ ...d, items: [...d.items, copy] }));
    setSelectedId(copy.id);
  }

  function removeItem(id: string) {
    if (PROTECTED_ITEM_IDS.has(id)) {
      window.alert(
        `Cannot delete “${id}”: publish validation requires this catalog row.`,
      );
      return;
    }
    if (!window.confirm(`Delete item “${id}”? This cannot be undone.`)) return;
    setDraft((d) => ({
      ...d,
      items: d.items.filter((i) => i.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }

  if (!draft) return null;

  return (
    <div>
      <PageHeader
        title="Items"
        description="Wallpapers, boots, sounds, fonts, flairs, streak freeze, custom upload. Kind sets stackable vs one-time defaults."
        actions={
          <>
            <Badge tone="info">{items.length} items</Badge>
            {kindFilter === "all" ? (
              <Select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as ItemKind)}
                aria-label="Kind for new item"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button type="button" onClick={addItem}>
              Add item
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() =>
              setKindFilter((cur) => (cur === k ? "all" : k))
            }
            className={[
              "rounded-md border px-2 py-1 text-xs transition-colors duration-150",
              kindFilter === k
                ? "border-primary/40 bg-primary/15 text-foreground"
                : "border-border text-muted hover:text-foreground",
            ].join(" ")}
          >
            {k} ({counts[k] ?? 0})
          </button>
        ))}
      </div>

      <div className="mb-3">
        <Input
          placeholder="Filter by name or id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <TableShell>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Kind</Th>
              <Th>Stack</Th>
              <Th>Tier</Th>
              <Th>Preview</Th>
              <Th>Id</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr
                key={it.id}
                data-state={selectedId === it.id ? "selected" : undefined}
                className="cursor-pointer transition-colors duration-150 hover:bg-secondary/60 data-[state=selected]:bg-secondary"
                onClick={() => setSelectedId(it.id)}
              >
                <Td className="font-medium">{it.name}</Td>
                <Td className="text-muted">{it.kind}</Td>
                <Td>
                  <Badge tone={it.stackable ? "ok" : "neutral"}>
                    {it.stackable ? "stackable" : "one-time"}
                  </Badge>
                </Td>
                <Td>
                  <Badge
                    tone={
                      it.tier === "better"
                        ? "info"
                        : it.tier === "brand"
                          ? "warn"
                          : "neutral"
                    }
                  >
                    {it.tier}
                  </Badge>
                </Td>
                <Td>
                  {it.kind === "alert-sound" ? (
                    <PreviewButton
                      key={`${it.id}-${previewTick}`}
                      src={getAlertPreviewSrc(it)}
                    />
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </Td>
                <Td className="font-mono text-xs text-muted">{it.id}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>

        <Panel className="p-4">
          {selected ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{selected.name}</h2>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => dupItem(selected)}
                  >
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => removeItem(selected.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs" title="Off: the app's Draw Wiki leaves it out (search, lists, Featured now), so it is not spoiled. It can still drop.">
                <input
                  type="checkbox"
                  checked={!(draft?.wikiHiddenIds ?? []).includes(selected.id)}
                  onChange={(e) => setDraft((d) => withWikiHidden(d, selected.id, !e.target.checked))}
                />
                Show in Wiki
              </label>
              <Field label="Name">
                <Input
                  value={selected.name}
                  onChange={(e) =>
                    updateItem(selected.id, { name: e.target.value })
                  }
                />
              </Field>
              <Field label="Kind">
                <Select
                  value={selected.kind}
                  onChange={(e) => {
                    const kind = e.target.value as ItemKind;
                    updateItem(selected.id, {
                      kind,
                      stackable: stackableForKind(kind),
                      tier: tierForKind(kind),
                    });
                  }}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ownership">
                <Select
                  value={selected.stackable ? "stackable" : "one-time"}
                  onChange={(e) =>
                    updateItem(selected.id, {
                      stackable: e.target.value === "stackable",
                    })
                  }
                >
                  <option value="stackable">stackable</option>
                  <option value="one-time">one-time</option>
                </Select>
              </Field>
              <Field label="Tier">
                <Select
                  value={selected.tier}
                  onChange={(e) =>
                    updateItem(selected.id, {
                      tier: e.target.value as ItemTier,
                    })
                  }
                >
                  <option value="common">common</option>
                  <option value="better">better</option>
                  <option value="brand">brand</option>
                </Select>
              </Field>
              <Field
                label="Asset path / URL"
                hint={
                  selected.kind === "alert-sound"
                    ? "Same-origin path or absolute URL for preview. Publish strips this field."
                    : "Optional string for later; not uploaded by the CMS yet."
                }
              >
                <Input
                  value={selected.assetPath ?? ""}
                  placeholder={
                    selected.kind === "alert-sound"
                      ? "/assets/alert-sound-01.mp3"
                      : "assets/wallpapers/…"
                  }
                  onChange={(e) =>
                    updateItem(selected.id, { assetPath: e.target.value })
                  }
                />
              </Field>
              {selected.kind === "alert-sound" ? (
                <div className="flex flex-col gap-2 border-t border-edge pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted">
                      Alert preview
                    </span>
                    <PreviewButton
                      key={`${selected.id}-panel-${previewTick}`}
                      src={getAlertPreviewSrc(selected)}
                    />
                  </div>
                  <Field
                    label="Local file"
                    hint="Session preview only — blob URL is not saved into the draft."
                  >
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLocalAlertPreview(selected.id, file);
                        setPreviewTick((n) => n + 1);
                        e.target.value = "";
                      }}
                    />
                  </Field>
                </div>
              ) : null}
              <p className="text-xs text-muted">
                Id is stable for the app inventory:{" "}
                <span className="font-mono text-ink">{selected.id}</span>
              </p>
            </div>
          ) : (
            <EmptyState
              title="Select an item"
              body="Filter by kind, Add item for the next id, then edit name and tier."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
