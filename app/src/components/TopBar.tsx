import { memo } from "react";
import { clockTime } from "../lib/format";
import type { GameId } from "../lib/games";
import { useStationCredits } from "../state/stationCredits";
import { useClock } from "../state/useEnvironment";
import type { TabId } from "../layout/layouts";
import { CreditIcon } from "./CreditIcon";
import { Icon } from "./Icon";
import { PatronMenu } from "./PatronMenu";
import { useT } from "../lib/i18n";
import { Segmented } from "./Segmented";

interface Props {
  tab: TabId;
  tabs: readonly { id: TabId; label: string; count?: number }[];
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
  /** Opens the profile panel. */
  onProfile: () => void;
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

export const TopBar = memo(function TopBar({ tab, tabs, onTab, game, games, onGame, displayName, modeLabel, calm, onCalm, stopped, onKill, editing, onEdit, onTheme, onVault, onProfile, onBuyCredits, onSplit, panes, maxPanes, onTrim, trimming }: Props) {
  const name = displayName.trim();
  const T = useT();
  const shown = name || T("top.yourName");
  const credits = useStationCredits();
  return (
    <header className="top">
      <div className="brand">
        <b>Command</b> Station
      </div>
      <div className="game-switch">
        <Segmented
          label={T("top.game")}
          value={game}
          options={games.map((g) => ({ value: g.id, label: g.label }))}
          onChange={onGame}
        />
      </div>
      <nav className="nav" aria-label={T("top.pages")}>
        {tabs.map((s) => (
          <button key={s.id} type="button" aria-current={tab === s.id ? "page" : undefined} onClick={() => onTab(s.id)}>
            {s.label}
            {s.count ? (
              <span className="nav-count" aria-label={T("top.unread", { n: s.count })}>
                {s.count > 99 ? "99+" : s.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>
      <div className="sp" />
      <div className="top-credits" role="group" aria-label={T("top.balance")}>
        <span className="top-credits-bal">
          <CreditIcon className="" />
          {credits}
        </span>
        <button
          type="button"
          className="top-credits-add"
          aria-pressed={tab === "buy-credits"}
          title={T("top.supportTitle")}
          onClick={onBuyCredits}
        >
          {T("top.support")}
        </button>
      </div>
      <PatronMenu />
      <span className="meta">
        <button type="button" className={`meta-name${name ? "" : " name-ph"}`} aria-haspopup="dialog" title={T("top.openProfile")} onClick={onProfile}>
          {shown}
        </button>{" "}
        · <b>{modeLabel}</b>
      </span>
      <div className="status">
        <span className="meta">
          <Clock />
        </span>
      </div>
      <button className="pill-btn edit-toggle" aria-pressed={editing} onClick={onEdit}>
        <Icon name="layout" small />
        {editing ? T("top.done") : T("top.editLayout")}
      </button>
      <div className="tools" role="toolbar" aria-label={T("top.tools")}>
      <button
        className="ib"
        aria-busy={trimming}
        aria-label={T("top.trim")}
        title={T("top.trim")}
        disabled={trimming}
        onClick={onTrim}
      >
        <Icon name="clean" />
      </button>
      <button
        className="ib split-add"
        aria-label={panes < maxPanes ? T("top.splitOpen", { n: panes, max: maxPanes }) : T("top.splitFull", { max: maxPanes })}
        title={panes < maxPanes ? T("top.splitOpen", { n: panes, max: maxPanes }) : T("top.splitFull", { max: maxPanes })}
        disabled={panes >= maxPanes}
        onClick={onSplit}
      >
        <Icon name="split" />
      </button>
      <button className="ib" aria-haspopup="dialog" aria-label={T("top.profile")} title={T("top.profile")} onClick={onProfile}>
        <Icon name="user" />
      </button>
      <button
        className="ib"
        data-theme-toggle
        aria-pressed={tab === "themes"}
        aria-label={T("top.themes")}
        title={T("top.themes")}
        onClick={onTheme}
      >
        <Icon name="palette" />
      </button>
      <button
        className="ib"
        aria-pressed={tab === "vault"}
        aria-label={T("top.vault")}
        title={T("top.vault")}
        onClick={onVault}
      >
        <Icon name="settings" />
      </button>
      <button
        className="ib"
        role="switch"
        aria-checked={calm}
        aria-label={T("top.calm")}
        title={T("top.calm")}
        onClick={onCalm}
      >
        <Icon name="motion" />
      </button>
      <button
        className="ib kill"
        aria-pressed={stopped}
        aria-label={stopped ? T("top.resume") : T("top.kill")}
        title={stopped ? T("top.resume") : T("top.killShort")}
        onClick={onKill}
      >
        <Icon name="power" />
      </button>
      </div>
    </header>
  );
});
