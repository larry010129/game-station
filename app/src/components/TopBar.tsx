import { clockTime } from "../lib/format";
import type { Machine } from "../lib/types";
import { TABS, type TabId } from "../layout/layouts";
import { Icon } from "./Icon";

interface Props {
  tab: TabId;
  onTab: (tab: TabId) => void;
  machine: Machine;
  modeLabel: string;
  now: number;
  sourceLabel: string;
  calm: boolean;
  onCalm: () => void;
  stopped: boolean;
  onKill: () => void;
  editing: boolean;
  onEdit: () => void;
  onTheme: () => void;
}

export function TopBar({ tab, onTab, machine, modeLabel, now, sourceLabel, calm, onCalm, stopped, onKill, editing, onEdit, onTheme }: Props) {
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
        {machine.name.replace(/^ASUS /, "")} · {machine.gpu} · <b>{modeLabel}</b>
      </span>
      <span className="meta">
        <b>{clockTime(now)}</b> · {sourceLabel.toLowerCase()}
      </span>
      <button className="pill-btn edit-toggle" aria-pressed={editing} onClick={onEdit}>
        <Icon name="layout" small />
        {editing ? "Done" : "Edit layout"}
      </button>
      <button
        className="ib"
        data-theme-toggle
        aria-pressed={tab === "vault"}
        aria-label="Appearance, on the Vault page"
        title="Appearance"
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
}
