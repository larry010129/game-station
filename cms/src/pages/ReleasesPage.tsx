import { useEffect, useState } from "react";
import { RELEASES_CHANGED } from "../components/PushScheduler";
import { formatMdyHm } from "../lib/schedule";
import { listReleases } from "../api/contentApi";
import { useDraft } from "../state/DraftContext";
import type { ReleaseMeta } from "../types/draft";
import {
  Badge,
  Field,
  PageHeader,
  Panel,
  TableShell,
  Td,
  Textarea,
  Th,
} from "../ui/primitives";

/** mm/dd/yy hh:mm in local time, the format a Push is scheduled in. */
const fmt = (iso: string | null | undefined) => (iso && Number.isFinite(Date.parse(iso)) ? formatMdyHm(new Date(iso)) : "—");

export function ReleasesPage() {
  const { draft, setDraft, publishErrors, persistMode, dirty, saving } = useDraft();
  const [releases, setReleases] = useState<ReleaseMeta[]>([]);
  const [now, setNow] = useState(() => Date.now());

  async function refresh() {
    setReleases(await listReleases());
  }

  useEffect(() => {
    void refresh();
    // A Push from the top bar adds a release; scheduled ones turn Live on their own, so re-read the clock.
    const onPushed = () => void refresh();
    window.addEventListener(RELEASES_CHANGED, onPushed);
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.removeEventListener(RELEASES_CHANGED, onPushed);
      window.clearInterval(id);
    };
  }, []);

  // The release apps run now: the newest one whose go-live time has passed.
  const liveNumber = releases.find((r) => Date.parse(r.effectiveAt ?? r.publishedAt) <= now)?.number ?? null;

  if (!draft) return null;

  return (
    <div>
      <PageHeader
        title="Releases"
        description="Push (top bar) publishes the draft as a numbered release that goes live at the time you choose. Apps keep their current content until then. Dev apps fetch from the local host."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={persistMode === "api" ? "ok" : "warn"}>
              {persistMode === "api" ? "API · draft.json" : "localStorage stub"}
            </Badge>

          </div>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <Field label="Release notes (What's new)">
            <Textarea
              value={draft.releaseNotes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, releaseNotes: e.target.value }))
              }
            />
          </Field>
          <p className="mt-2 text-xs text-muted">
            Draft updated {draft.updatedAt}
            {dirty || saving ? " · saving…" : " · saved"}
          </p>
        </Panel>
        <Panel className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Publish checks</h2>
          {publishErrors.length === 0 ? (
            <p className="text-sm text-success">All checks passed.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-sm text-destructive-foreground">
              {publishErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">
            POST <code className="text-ink">/api/publish</code> → writes{" "}
            <code className="text-ink">cms/data/releases/</code> and{" "}
            <code className="text-ink">cms/data/public-releases/</code>. If the
            API agent replaces the stub, keep the same path.
          </p>
        </Panel>
      </div>


      <TableShell>
        <thead>
          <tr>
            <Th>#</Th>
            <Th>Goes live</Th>
            <Th>Published</Th>
            <Th>Notes</Th>
            <Th>File</Th>
          </tr>
        </thead>
        <tbody>
          {releases.length === 0 ? (
            <tr>
              <Td className="text-muted">No releases yet.</Td>
              <Td />
              <Td />
              <Td />
              <Td />
            </tr>
          ) : (
            releases.map((r) => (
              <tr key={r.number}>
                <Td className="font-mono tabular-nums">{r.number}</Td>
                <Td className="whitespace-nowrap text-xs">
                  <span className="flex items-center gap-2">
                    {fmt(r.effectiveAt ?? r.publishedAt)}
                    {Date.parse(r.effectiveAt ?? r.publishedAt) > now ? (
                      <Badge tone="info">Scheduled</Badge>
                    ) : r.number === liveNumber ? (
                      <Badge tone="ok">Live</Badge>
                    ) : null}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-xs text-muted">{fmt(r.publishedAt)}</Td>
                <Td>{r.notes || "—"}</Td>
                <Td className="font-mono text-xs text-muted">
                  {r.file ?? "localStorage"}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
