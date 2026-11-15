import { memo, useState } from "react";
import { FEED_KIND_LABEL } from "../lib/feedKind";
import { age, clockTime } from "../lib/format";
import type { FeedItem, StationEvent } from "../lib/types";
import type { Phase, StepStatus } from "../state/useGameMode";
import { useToast } from "../state/Toast";
import { openLink } from "../lib/openLink";
import { Icon } from "./Icon";
import { PLATFORM_NAME, PlatformIcon, platformOf } from "./PlatformIcon";
import { xBadge, xSource } from "../lib/xSource";
import { useStationCtx } from "../state/useApi";
import { Segmented } from "./Segmented";
import { StationSelect } from "./StationSelect";

export const AlertsPanel = memo(function AlertsPanel({ events }: { events: StationEvent[] }) {
  const [filter, setFilter] = useState<"all" | "alert">("all");
  const shown = filter === "all" ? events : events.filter((e) => e.kind === "alert");
  return (
    <section className="t" id="log" aria-label="Alerts and events">
      <div className="th">
        <h2>Alerts and events</h2>
        <Segmented
          label="Filter events"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "alert", label: "Alerts" },
          ]}
        />
      </div>
      <div className="alist" aria-live="polite">
        {shown.length === 0 && <p className="empty">No alerts in this session.</p>}
        {shown.map((e) => {
          const className = `al${e.kind === "alert" ? "" : " info"}`;
          const href = e.url && /^https?:\/\//i.test(e.url) ? e.url : undefined;
          const body = (
            <>
              <i />
              <span>{e.text}</span>
              <time dateTime={new Date(e.t).toISOString()}>{clockTime(e.t)}</time>
            </>
          );
          if (!href) {
            return (
              <div key={e.id} className={className}>
                {body}
              </div>
            );
          }
          return (
            <a
              key={e.id}
              className={className}
              href={href}
              rel="noreferrer"
              aria-label={`Open ${e.text}`}
              title={href}
              onClick={(ev) => {
                ev.preventDefault();
                void openLink(href);
              }}
            >
              {body}
            </a>
          );
        })}
      </div>
    </section>
  );
});

const STEP_WORD: Record<StepStatus, string> = {
  waiting: "Waiting",
  running: "Running",
  done: "Done",
  failed: "Failed",
};

interface GameModeProps {
  profiles: { id: string; name: string }[];
  profile: { id: string; steps: { id: string; label: string; before: string }[] };
  onProfile: (id: string) => void;
  phase: Phase;
  status: Record<string, StepStatus>;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
}

export const GameModePanel = memo(function GameModePanel({ profiles, profile, onProfile, phase, status, onStart, onStop, disabled }: GameModeProps) {
  const busy = phase === "applying" || phase === "restoring";
  const label =
    phase === "applying" ? "Applying…" : phase === "restoring" ? "Restoring…" : phase === "on" ? "Game mode on · restore" : "Start game mode";
  return (
    <section className="t" id="gm" aria-label="Game mode">
      <div className="th">
        <div>
          <h2>Game mode</h2>
          <small>Every change can be undone</small>
        </div>
      </div>
      <button
        className="go"
        aria-pressed={phase === "on"}
        disabled={busy || disabled}
        title={disabled ? "Monitoring is stopped. Resume it to use game mode." : undefined}
        onClick={phase === "on" ? onStop : onStart}
      >
        <span className="go-band" aria-hidden="true" />
        <span className="go-rim" aria-hidden="true" />
        <Icon name="power" />
        <span className="go-label">{label}</span>
      </button>
      <label className="pick">
        Profile
        <StationSelect
          variant="pill"
          label="Profile"
          value={profile.id}
          onChange={onProfile}
          disabled={phase !== "off"}
          options={profiles.map((p) => ({ value: p.id, label: p.name }))}
        />
      </label>
      <div className="scroll">
        {profile.steps.map((s) => {
          const st = status[s.id] ?? (phase === "on" ? "done" : "waiting");
          return (
            <div key={s.id} className={`step ${st}`}>
              <span>{s.label}</span>
              <span>{st === "waiting" && phase === "off" ? s.before : STEP_WORD[st]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export const FeedPanel = memo(function FeedPanel({
  items,
  error,
  checking,
  onCheck,
}: {
  items: FeedItem[];
  error: string | null;
  checking: boolean;
  onCheck: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "official" | "leak" | "news" | "video">("all");
  const toast = useToast();
  const { pack } = useStationCtx();
  const hasLeaks = items.some((i) => i.kind === "leak");
  const hasNews = items.some((i) => i.kind === "news");
  const active = (filter === "leak" && !hasLeaks) || (filter === "news" && !hasNews) ? "all" : filter;
  const shown = items.filter((i) =>
    active === "all"
      ? true
      : active === "leak"
        ? i.kind === "leak"
        : active === "news"
          ? i.kind === "news"
          : active === "video"
            ? i.kind === "video"
            : i.kind === "official" || i.kind === "patch",
  );
  return (
    <section className="t" id="feed" aria-label={pack.cards.feed}>
      <div className="th">
        <h2>{pack.label}</h2>
        <button type="button" className="chk" onClick={onCheck} disabled={checking} aria-label="Check for new stories now" title="Check for new stories now">
          {checking ? "Checking…" : "Check now"}
        </button>
        <Segmented
          label="Filter stories"
          value={active}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "official", label: "Official" },
            { value: "video", label: "Video" },
            ...(hasNews ? [{ value: "news" as const, label: "News" }] : []),
            ...(hasLeaks ? [{ value: "leak" as const, label: "Leaks" }] : []),
          ]}
        />
      </div>
      <div className="scroll">
      {error && <p className="empty">{error}</p>}
      {!error && shown.length === 0 && <p className="empty">Nothing here yet. The feed checks again every 5 minutes.</p>}
      {shown.map((i) => {
        const platform = platformOf(i);
        const x = i.kind === "leak" || i.kind === "news" || platform === "x" ? xSource(i) : null;
        const kindLabel = FEED_KIND_LABEL[i.kind];
        return (
          <a
            key={i.id}
            className="story"
            href={i.url ?? "#feed"}
            onClick={(e) => {
              e.preventDefault();
              if (i.url) void openLink(i.url);
              else toast("Sample story. In the app this opens the original post in your browser.");
            }}
            title={i.url ? `Open on ${PLATFORM_NAME[platform]}` : undefined}
            rel="noreferrer"
          >
            <PlatformIcon platform={platform} size={18} />
            <div className="sb">
              <h3>{i.title}</h3>
              <p>
                {i.isNew && <em className="newdot">New</em>}
                <strong className={`kindbadge kind-${i.kind}`}>{kindLabel}</strong>
                {" · "}
                {i.source} · {age(i.publishedAt)}
                {x && <strong className="xbadge"> · {xBadge(x, i.source)}</strong>}
                {i.trusted && (
                  <strong className="trustbadge" title={i.trusted}>
                    {" "}
                    · ✓ Trusted
                  </strong>
                )}
                {i.summary && i.kind === "patch" ? ` · ${i.summary}` : ""}
              </p>
            </div>
          </a>
        );
      })}
      </div>
    </section>
  );
});
