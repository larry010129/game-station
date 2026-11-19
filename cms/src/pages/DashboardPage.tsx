import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Image,
  Package,
  Palette,
  Rocket,
} from "lucide-react";
import { listReleases } from "../api/contentApi";
import { buttonVariants } from "@/components/ui/button";
import { CheckList, type CheckItem } from "@/components/ui/check-list";
import { IndicatorStack, MainCard, MetricWidget, PackWidget } from "@/components/ui/widgets";
import { useDraft } from "../state/DraftContext";
import {
  cardAndCheckinErrors,
  checkinPrizeErrors,
  cardPackOf,
  nearly100,
  packWeightSum,
  type CmsDraft,
  type PackDraft,
  type ReleaseMeta,
} from "../types/draft";
import { Badge, PageHeader } from "../ui/primitives";
import { cn } from "@/lib/utils";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** The same rules the publish step enforces (see validateDraftForPublish), one row per rule. */
function readiness(draft: CmsDraft, saved: { ok: boolean; note: string }): CheckItem[] {
  const packs: PackDraft[] = [draft.packs.regular, draft.packs.brand];
  const items: CheckItem[] = [];

  for (const p of packs) {
    const sum = packWeightSum(p.weights);
    items.push({
      id: `${p.id}-chances`,
      label: `${cap(p.id)} pack chances add up to 100%`,
      status: nearly100(sum) ? "ok" : "fail",
      value: `${sum.toFixed(1)}%`,
      note: `The six row chances sum to ${sum.toFixed(2)}%. Adjust them on Odds until they total 100.`,
    });
  }
  for (const p of packs) {
    const bi = p.betterInner;
    const ci = p.commonInner;
    const better = bi.wallpaper + bi.boot + bi.layout;
    const common = ci.streakFreeze + ci.alert + ci.font + ci.flair;
    const ok = Math.abs(better - 100) <= 0.05 && Math.abs(common - 100) <= 0.05;
    items.push({
      id: `${p.id}-inner`,
      label: `${cap(p.id)} pack item splits add up to 100%`,
      status: ok ? "ok" : "fail",
      value: ok ? undefined : `${better.toFixed(0)}% / ${common.toFixed(0)}%`,
      note: "Better items and Common items each need their inner weights to total 100%.",
    });
  }
  items.push({
    id: "prices",
    label: "Pack prices are set",
    status: packs.every((p) => p.priceOne > 0 && p.priceTen > 0) ? "ok" : "fail",
    note: "Every pack needs a price above zero for one draw and for ten.",
  });
  items.push({
    id: "look-cost",
    label: "Theme cost is set",
    status: draft.economy.lookCost > 0 ? "ok" : "fail",
    value: draft.economy.lookCost > 0 ? `${draft.economy.lookCost}` : undefined,
    note: "The cost to unlock one theme must be above zero.",
  });
  // Card Pack and check-in event: the same rules publish enforces (cardAndCheckinErrors), one row each.
  const cardErrors = cardAndCheckinErrors(draft);
  const card = cardErrors.filter((e) => e.startsWith("Card Pack"));
  const checkin = [...cardErrors.filter((e) => e.startsWith("Check-in")), ...checkinPrizeErrors(draft)];
  const cp = cardPackOf(draft);
  items.push({
    id: "card-pack",
    label: "Card Pack is ready",
    status: card.length ? "fail" : "ok",
    value: cp.enabled ? undefined : "Off",
    note: card.length ? `${card.join(". ")}. Fix it on Cards.` : "Odds total 100%, prices and pity are set, and at least one skin is Available.",
  });
  items.push({
    id: "checkin-event",
    label: "Check-in dates and prizes are valid",
    status: checkin.length ? "fail" : "ok",
    value: draft.checkinEvent ? undefined : "Always on",
    note: checkin.length ? `${checkin.join(". ")}. Fix it on Calendar.` : "With no dates the daily check-in board is always on.",
  });
  items.push({
    id: "saved",
    label: "Draft is saved",
    status: saved.ok ? "ok" : "warn",
    note: saved.note,
  });
  return items;
}

export function DashboardPage() {
  const { draft, persistMode, dirty, saving, publishErrors } = useDraft();
  const [releases, setReleases] = useState<ReleaseMeta[]>([]);

  useEffect(() => {
    let alive = true;
    void listReleases().then((r) => alive && setReleases(r));
    return () => {
      alive = false;
    };
  }, []);

  if (!draft) return null;

  const total = draft.themes.length;
  const available = draft.themes.filter((t) => t.status === "Available").length;
  const availablePct = total ? (available / total) * 100 : 0;
  const regular = draft.packs.regular;
  const brand = draft.packs.brand;
  const regularSum = packWeightSum(regular.weights);
  const brandSum = packWeightSum(brand.weights);

  const savedOk = persistMode === "api" && !dirty && !saving;
  const checks = readiness(draft, {
    ok: savedOk,
    note:
      persistMode !== "api"
        ? "The CMS server is not reachable, so changes are only in this browser. Start it with npm run dev."
        : "Changes are being saved. This clears in a moment.",
  });
  const failing = checks.filter((c) => c.status === "fail").length;
  const recent = [...releases].sort((a, b) => b.number - a.number).slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Check that the draft is ready, then publish a release."
        actions={
          <Badge tone={persistMode === "api" ? "ok" : "warn"}>
            {persistMode === "api" ? "Saving to draft.json" : "Browser storage only"}
          </Badge>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MetricWidget
          title="Themes available"
          icon={CircleCheck}
          amount={String(available)}
          unit={`of ${total}`}
          percentLabel={`${Math.round(availablePct)}%`}
          percent={availablePct}
          barLabel={`${available} of ${total} themes available`}
        />
        {[
          { pack: regular, sum: regularSum, tone: "brand2" as const },
          { pack: brand, sum: brandSum, tone: "brand1" as const },
        ].map(({ pack, sum, tone }) => {
          const ok = nearly100(sum);
          return (
            <MetricWidget
              key={pack.id}
              title={`${cap(pack.id)} pack odds`}
              icon={ok ? CircleCheck : CircleAlert}
              iconTone={ok ? "ok" : "danger"}
              amount={`${sum.toFixed(1)}%`}
              percentLabel={ok ? "Balanced" : "Needs 100%"}
              percent={sum}
              tone={ok ? tone : "danger"}
              barLabel={`${cap(pack.id)} pack chances total ${sum.toFixed(1)} percent`}
            />
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <MainCard
          flush
          title="Publish readiness"
          subheader={
            failing
              ? `${failing} check${failing === 1 ? "" : "s"} must be fixed before you can publish.`
              : publishErrors.length === 0
                ? "Every check passes. The draft can be published."
                : "Resolve the items below, then publish."
          }
          secondary={
            <Link
              to={failing ? "/odds" : "/releases"}
              className={buttonVariants({ variant: failing ? "outline" : "default", size: "sm" })}
            >
              {failing ? "Fix on Odds" : "Go to Releases"}
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" aria-hidden />
            </Link>
          }
          className="xl:col-span-2"
        >
          <CheckList items={checks} />
        </MainCard>

        <IndicatorStack
          items={[
            { icon: Palette, tone: "ok", value: total, label: "Total themes" },
            { icon: Package, tone: "primary", value: draft.items.length, label: "Total items" },
            { icon: Image, tone: "muted", value: draft.banners.length, label: "Banners" },
            { icon: Rocket, tone: "primary", value: releases.length, label: "Releases published" },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[regular, brand].map((p) => {
          const themeRows = p.weights.regularTheme + p.weights.brandTheme;
          const itemRows = p.weights.better + p.weights.common;
          return (
            <PackWidget
              key={p.id}
              icon={Package}
              iconTone={p.id === "brand" ? "ok" : "primary"}
              title={`${cap(p.id)} pack`}
              big={`${p.priceOne} / ${p.priceTen}`}
              caption="Price for 1 draw / 10 draws"
              stats={[
                { label: "Theme rows", value: `${themeRows.toFixed(1)}%`, percent: themeRows, tone: "brand1" },
                { label: "Item rows", value: `${itemRows.toFixed(1)}%`, percent: itemRows, tone: "brand2" },
              ]}
              footer={
                <Link to="/odds" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Edit odds
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </Link>
              }
            />
          );
        })}

        <MainCard
          flush
          title="Recent releases"
          className="md:col-span-2 xl:col-span-1"
          footer={
            <Link to="/releases" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Open Releases
              <ChevronRight className="h-3 w-3" aria-hidden />
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Nothing published yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((r) => (
                <li key={r.number} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums text-foreground">
                    #{r.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-[13px]", r.notes ? "text-foreground" : "text-muted")}>
                      {r.notes || "No notes"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{r.publishedAt ? when(r.publishedAt) : "Date not recorded"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </MainCard>
      </div>
    </div>
  );
}
