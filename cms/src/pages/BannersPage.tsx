import { useRef, useState } from "react";
import { uploadBannerArt } from "../api/contentApi";
import { BannerArtPreview, bannerArtUrl } from "../components/BannerArtPreview";
import { useDraft } from "../state/DraftContext";
import {
  HONEST_ODDS_DISCLAIMER,
  type CmsBanner,
  type PackId,
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
  TableShell,
  Td,
  Textarea,
  Th,
} from "../ui/primitives";

function newBanner(): CmsBanner {
  const id = `banner-${Date.now().toString(36)}`;
  return {
    id,
    title: "New banner",
    subtitle: "",
    pack: "regular",
    start: new Date().toISOString().slice(0, 10),
    end: "",
    featuredIds: [],
    priority: 1,
    body: "",
    art: "",
  };
}

export function BannersPage() {
  const { draft, setDraft } = useDraft();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!draft) return null;

  const banners = [...draft.banners].sort((a, b) => b.priority - a.priority);
  const selected = banners.find((b) => b.id === selectedId) ?? null;

  function update(id: string, patch: Partial<CmsBanner>) {
    setDraft((d) => ({
      ...d,
      banners: d.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }

  function add() {
    const b = newBanner();
    setDraft((d) => ({ ...d, banners: [b, ...d.banners] }));
    setSelectedId(b.id);
  }

  function remove(id: string) {
    setDraft((d) => ({
      ...d,
      banners: d.banners.filter((b) => b.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }

  async function onArtSelected(file: File | undefined) {
    if (!selected || !file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadBannerArt(file);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }
      update(selected.id, {
        art: result.url,
        imageUrl: undefined,
        assetPath: undefined,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <PageHeader
        title="Banners"
        description="Display-only cards for the Draw Theme strip. Never change odds."
        actions={
          <Button type="button" onClick={add}>
            Add banner
          </Button>
        }
      />

      <Panel className="mb-4 px-4 py-3">
        <p className="text-xs font-medium text-muted">Honest-odds disclaimer (fixed)</p>
        <p className="mt-1 text-sm text-ink">{HONEST_ODDS_DISCLAIMER}</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <TableShell>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Pack</Th>
              <Th>Dates</Th>
              <Th>Priority</Th>
              <Th>Featured</Th>
            </tr>
          </thead>
          <tbody>
            {banners.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-muted" colSpan={5}>
                  No banners yet.
                </td>
              </tr>
            ) : (
              banners.map((b) => (
                <tr
                  key={b.id}
                  className={[
                    "cursor-pointer transition-colors duration-150 hover:bg-edge/40",
                    selectedId === b.id ? "bg-edge/50" : "",
                  ].join(" ")}
                  onClick={() => setSelectedId(b.id)}
                >
                  <Td className="font-medium">{b.title}</Td>
                  <Td>
                    <Badge tone={b.pack === "brand" ? "warn" : "neutral"}>
                      {b.pack}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-muted">
                    {b.start || "—"} → {b.end || "—"}
                  </Td>
                  <Td className="tabular-nums">{b.priority}</Td>
                  <Td className="text-xs text-muted">
                    {b.featuredIds.length
                      ? b.featuredIds.join(", ")
                      : "—"}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>

        <Panel className="p-4">
          {selected ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Edit banner</h2>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => remove(selected.id)}
                >
                  Delete
                </Button>
              </div>

              <BannerArtPreview banner={selected} />

              <Field label="Banner art" hint="png / jpg / webp / gif · saved under data/uploads/banners">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
                    className="block w-full text-xs text-muted file:mr-2 file:rounded file:border file:border-edge file:bg-bg file:px-2 file:py-1 file:text-xs file:text-ink"
                    disabled={uploading}
                    onChange={(e) => void onArtSelected(e.target.files?.[0])}
                  />
                  {bannerArtUrl(selected) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={uploading}
                      onClick={() =>
                        update(selected.id, {
                          art: "",
                          imageUrl: undefined,
                          assetPath: undefined,
                        })
                      }
                    >
                      Clear art
                    </Button>
                  ) : null}
                </div>
                {uploading ? (
                  <p className="mt-1 text-xs text-muted">Uploading…</p>
                ) : null}
                {uploadError ? (
                  <p className="mt-1 text-xs text-[var(--cms-danger)]">{uploadError}</p>
                ) : null}
              </Field>

              <Field label="Title">
                <Input
                  value={selected.title}
                  onChange={(e) =>
                    update(selected.id, { title: e.target.value })
                  }
                />
              </Field>
              <Field label="Subtitle">
                <Input
                  value={selected.subtitle}
                  onChange={(e) =>
                    update(selected.id, { subtitle: e.target.value })
                  }
                />
              </Field>
              <Field label="Pack">
                <Select
                  value={selected.pack}
                  onChange={(e) =>
                    update(selected.id, { pack: e.target.value as PackId })
                  }
                >
                  <option value="regular">regular</option>
                  <option value="brand">brand</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start">
                  <Input
                    type="date"
                    value={selected.start}
                    onChange={(e) =>
                      update(selected.id, { start: e.target.value })
                    }
                  />
                </Field>
                <Field label="End">
                  <Input
                    type="date"
                    value={selected.end}
                    onChange={(e) =>
                      update(selected.id, { end: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field
                label="Featured ids"
                hint="Comma-separated theme or item ids"
              >
                <Input
                  value={selected.featuredIds.join(", ")}
                  onChange={(e) =>
                    update(selected.id, {
                      featuredIds: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Priority">
                <Input
                  type="number"
                  value={selected.priority}
                  onChange={(e) =>
                    update(selected.id, {
                      priority: Number(e.target.value) || 0,
                    })
                  }
                />
              </Field>
              <Field label="Body line">
                <Textarea
                  value={selected.body}
                  onChange={(e) =>
                    update(selected.id, { body: e.target.value })
                  }
                />
              </Field>
              <p className="rounded border border-edge bg-bg px-2 py-1.5 text-xs text-muted">
                Always shown: {HONEST_ODDS_DISCLAIMER}
              </p>
            </div>
          ) : (
            <EmptyState
              title="Select a banner"
              body="Or add one to announce featured themes and items."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
