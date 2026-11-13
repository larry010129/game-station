import { useState } from "react";
import { age, clockTime } from "../lib/format";
import type { FeedItem, StationEvent } from "../lib/types";
import type { Phase, StepStatus } from "../state/useGameMode";
import { useToast } from "../state/Toast";
import { openLink } from "../lib/openLink";
import { Icon } from "./Icon";
import { PLATFORM_NAME, PlatformIcon, platformOf } from "./PlatformIcon";
import { Segmented } from "./Segmented";

export function AlertsPanel({ events }: { events: StationEvent[] }) {
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
        {shown.map((e) => (
          <div key={e.id} className={`al${e.kind === "alert" ? "" : " info"}`}>
            <i />
            <span>{e.text}</span>
            <time dateTime={new Date(e.t).toISOString()}>{clockTime(e.t)}</time>
          </div>
        ))}
      </div>
    </section>
  );
}

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

export function GameModePanel({ profiles, profile, onProfile, phase, status, onStart, onStop, disabled }: GameModeProps) {
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
        <Icon name="power" />
        <span>{label}</span>
      </button>
      <label className="pick">
        Profile
        <select value={profile.id} onChange={(e) => onProfile(e.target.value)} disabled={phase !== "off"}>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
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
}

const KIND: Record<FeedItem["kind"], string> = {
  patch: "Patch",
  official: "Official",
  leak: "Unconfirmed leak",
  video: "Video",
  community: "Community",
};

export function FeedPanel({
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
  const [filter, setFilter] = useState<"all" | "official" | "leak" | "video">("all");
  const toast = useToast();
  const hasLeaks = items.some((i) => i.kind === "leak");
  const active = filter === "leak" && !hasLeaks ? "all" : filter;
  const shown = items.filter((i) =>
    active === "all"
      ? true
      : active === "leak"
        ? i.kind === "leak"
        : active === "video"
          ? i.kind === "video"
          : i.kind === "official" || i.kind === "patch",
  );
  return (
    <section className="t" id="feed" aria-label="Overwatch feed">
      <div className="th">
        <h2>Overwatch</h2>
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
            ...(hasLeaks ? [{ value: "leak" as const, label: "Leaks" }] : []),
          ]}
        />
      </div>
      <div className="scroll">
      {error && <p className="empty">{error}</p>}
      {!error && shown.length === 0 && <p className="empty">Nothing here yet. The feed checks again every 5 minutes.</p>}
      {shown.map((i) => {
        const platform = platformOf(i);
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
                {i.kind === "leak" ? <b>{KIND[i.kind]}</b> : KIND[i.kind]} · {i.source} · {age(i.publishedAt)}
                {i.summary && i.kind === "patch" ? ` · ${i.summary}` : ""}
              </p>
            </div>
          </a>
        );
      })}
      </div>
    </section>
  );
}
