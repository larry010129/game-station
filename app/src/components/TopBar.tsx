import { memo } from "react";
import { clockTime } from "../lib/format";
import type { GameId } from "../lib/games";
import { formatCredits, useStationCredits } from "../state/stationCredits";
import { useClock } from "../state/useEnvironment";
import type { TabId } from "../layout/layouts";
import { Icon } from "./Icon";
import { Segmented } from "./Segmented";

interface Props {
  tab: TabId;
  tabs: readonly { id: TabId; label: string }[];
  onTab: (tab: TabId) => void;
  game: GameId;
  games: readonly { id: GameId; label: string }[];
  onGame: (game: GameId) => void;
  displayName: string;
  modeLabel: string;
  calm: boolean;
  onCalm: () => void;
  stopped: boolean;
  onKill: () => void;
  editing: boolean;
  onEdit: () => void;
  onTheme: () => void;
  onVault: () => void;
  /** Opens the Support page. A tip does not change Credits. */
  onBuyCredits: () => void;
  /** Opens another pane beside this one. */
  onSplit: () => void;
  /** How many panes are open, out of the most allowed. */
  panes: number;
  maxPanes: number;
  /** Frees this app's own memory. */
  onTrim: () => void;
  trimming: boolean;
}

/** The per-second clock lives here so only this label re-renders each second. */
function Clock() {
  const now = useClock();
  return <b>{clockTime(now)}</b>;
}

export const TopBar = memo(function TopBar({ tab, tabs, onTab, game, games, onGame, displayName, modeLabel, calm, onCalm, stopped, onKill, editing, onEdit, onTheme, onVault, onBuyCredits, onSplit, panes, maxPanes, onTrim, trimming }: Props) {
  const name = displayName.trim();
  const shown = name || "Your name";
  const credits = useStationCredits();
  return (
    <header className="top">
      <div className="brand">
        <b>Command</b> Station
      </div>
      <div className="game-switch">
        <Segmented
          label="Game"
          value={game}
          options={games.map((g) => ({ value: g.id, label: g.label }))}
          onChange={onGame}
        />
      </div>
      <nav className="nav" aria-label="Pages">
        {tabs.map((s) => (
          <button key={s.id} type="button" aria-current={tab === s.id ? "page" : undefined} onClick={() => onTab(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>
      <div className="sp" />
      <div className="top-credits" role="group" aria-label="Credits balance">
        <span className="top-credits-bal">{formatCredits(credits)}</span>
        <button
          type="button"
          className="top-credits-add"
          aria-pressed={tab === "buy-credits"}
          title="Support. Credits stay the same."
          onClick={onBuyCredits}
        >
          Support
        </button>
      </div>
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
      <div className="tools" role="toolbar" aria-label="Tools">
      <button
        className="ib"
        aria-busy={trimming}
        aria-label="Clean up this app's memory"
        title="Clean up this app's memory"
        disabled={trimming}
        onClick={onTrim}
      >
        <Icon name="clean" />
      </button>
      <button
        className="ib split-add"
        aria-label={panes < maxPanes ? `Split view: open another pane (${panes} of ${maxPanes})` : `Split view is full (${maxPanes} panes)`}
        title={panes < maxPanes ? `Split view: open another pane (${panes} of ${maxPanes})` : `Split view is full (${maxPanes} panes)`}
        disabled={panes >= maxPanes}
        onClick={onSplit}
      >
        <Icon name="split" />
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
        aria-pressed={tab === "vault"}
        aria-label="Vault settings"
        title="Vault settings"
        onClick={onVault}
      >
        <Icon name="settings" />
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
      </div>
    </header>
  );
});
