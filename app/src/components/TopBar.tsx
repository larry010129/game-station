import { memo } from "react";
import { clockTime } from "../lib/format";
import { useClock } from "../state/useEnvironment";
import { TABS, type TabId } from "../layout/layouts";
import { Icon } from "./Icon";

interface Props {
  tab: TabId;
  onTab: (tab: TabId) => void;
  displayName: string;
  modeLabel: string;
  calm: boolean;
  onCalm: () => void;
  stopped: boolean;
  onKill: () => void;
  editing: boolean;
  onEdit: () => void;
  onTheme: () => void;
}

/** The per-second clock lives here so only this label re-renders each second. */
function Clock() {
  const now = useClock();
  return <b>{clockTime(now)}</b>;
}

export const TopBar = memo(function TopBar({ tab, onTab, displayName, modeLabel, calm, onCalm, stopped, onKill, editing, onEdit, onTheme }: Props) {
  const name = displayName.trim();
  const shown = name || "Your name";
  return (
    <header className="top">
      <div className="brand">
        <b>Command</b> Station
      </div>
      <nav className="nav" aria-label="Pages">
        {TABS.map((s) => (
          <button key={s.id} type="button" aria-current={tab === s.id ? "page" : undefined} onClick={() => onTab(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>
      <div className="sp" />
      <span className="meta">
        <span className={name ? undefined : "name-ph"}>{shown}</span> · <b>{modeLabel}</b>
      </span>
      <div className="status">
        <span className="meta">
          <Clock />
        </span>
      </div>
      <button className="pill-btn edit-toggle" aria-pressed={editing} onClick={onEdit}>
        <Icon name="layout" small />
        {editing ? "Done" : "Edit layout"}
      </button>
      <button
        className="ib"
        data-theme-toggle
        aria-pressed={tab === "themes"}
        aria-label="Themes"
        title="Themes"
        onClick={onTheme}
      >
        <Icon name="palette" />
      </button>
      <button
        className="ib"
        role="switch"
        aria-checked={calm}
        aria-label="Reduce motion"
        title="Reduce motion"
        onClick={onCalm}
      >
        <Icon name="motion" />
      </button>
      <button
        className="ib kill"
        aria-pressed={stopped}
        aria-label={stopped ? "Resume monitoring" : "Kill switch: stop all monitoring"}
        title={stopped ? "Resume monitoring" : "Kill switch"}
        onClick={onKill}
      >
        <Icon name="power" />
      </button>
    </header>
  );
});
