import { useState } from "react";
import { Icon, type IconName } from "../components/Icon";
import { Segmented } from "../components/Segmented";
import { StationSelect } from "../components/StationSelect";
import { CreatorSettings } from "../components/CreatorSettings";
import { NavSettings, type NavTabsApi } from "../components/NavSettings";
import { SourcesSettings } from "../components/SourcesSettings";
import { NotificationCenter } from "../components/NotificationCenter";
import { AlertSettings, BackupSettings, GameModeSettings } from "../components/VaultExtras";

import type { useMonitor } from "../state/useMonitor";
import type { useTheme } from "../state/useTheme";
import type { useToasts } from "../state/useToasts";
import type { WindowView } from "../state/useWindowView";

const WINDOW_VIEWS: { value: WindowView; label: string }[] = [
  { value: "window", label: "Window" },
  { value: "borderless", label: "Borderless" },
  { value: "fullscreen", label: "Full screen" },
];

const MOVE_MODES: { value: "snap" | "free"; label: string }[] = [
  { value: "snap", label: "Snap to order" },
  { value: "free", label: "Free move" },
];

const SECTIONS: { id: string; label: string; hint: string; icon: IconName }[] = [
  { id: "pc", label: "This PC", hint: "Name, window, card moving", icon: "layout" },
  { id: "nav", label: "Navigation", hint: "Top-bar pages and their cards", icon: "motion" },
  { id: "sources", label: "Sources", hint: "Accounts and sites you trust", icon: "sources" },
  { id: "alerts", label: "Alerts", hint: "Smart alerts and notifications", icon: "clean" },
  { id: "game", label: "Game mode", hint: "Steps and profiles", icon: "power" },
  { id: "look", label: "Appearance", hint: "Theme, colour, wallpaper", icon: "palette" },
  { id: "backup", label: "Backup", hint: "Export and restore", icon: "out" },
  { id: "creator", label: "Creator", hint: "Codes for this PC", icon: "unlock" },
];
const KEY = "station.vault.section";

function initialSection(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v && SECTIONS.some((s) => s.id === v)) return v;
  } catch {
    /* storage can be blocked; start on the first section */
  }
  return SECTIONS[0].id;
}

interface Props {
  /** Reads the game mode profiles again after a settings change. */
  onProfilesChanged: () => Promise<void>;
  look: ReturnType<typeof useTheme>;
  windowView: { view: WindowView; choose: (view: WindowView) => void };
  monitor: ReturnType<typeof useMonitor>;
  displayName: string;
  onDisplayName: (next: string) => void;
  freeMove: boolean;
  onMoveMode: (mode: "snap" | "free") => void;
  toasts: ReturnType<typeof useToasts>;
  navTabs: NavTabsApi;
  onOpenThemes: () => void;
}

/** Settings for this PC. A section rail on the left, one flat panel on the right. */
export function VaultPage({ onProfilesChanged, look, windowView, monitor, displayName, onDisplayName, freeMove, onMoveMode, toasts, navTabs, onOpenThemes }: Props) {
  const [section, setSection] = useState(initialSection);
  const choose = (id: string) => {
    setSection(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* not saved; the choice still applies this session */
    }
  };
  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  return (
    <section className="vault" aria-label="Vault">
      <nav className="vault-rail" aria-label="Settings sections">
        <h2>Vault</h2>
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" aria-current={s.id === current.id ? "page" : undefined} onClick={() => choose(s.id)}>
            <Icon name={s.icon} small />
            <span>
              <b>{s.label}</b>
              <small>{s.hint}</small>
            </span>
          </button>
        ))}
      </nav>
      <div className="vault-panel" key={current.id}>
        {current.id === "pc" && (
          <section className="vault-card" aria-label="This PC">
            <h3>This PC</h3>
            <div className="vault-row">
              <div>
                <h3>Display name</h3>
                <p className="hint">Saved on this PC. Leave it blank to show Your name.</p>
              </div>
              <label className="vault-field">
                <strong>{displayName.trim() || "Your name"}</strong>
                <input value={displayName} placeholder="Your name" maxLength={40} aria-label="Display name" onChange={(e) => onDisplayName(e.target.value)} />
              </label>
            </div>
            <div className="vault-row">
              <div>
                <h3>Window view</h3>
                <p className="hint">How this app is shown.</p>
              </div>
              <div className="vault-field">
                <Segmented label="Window view" value={windowView.view} options={WINDOW_VIEWS} onChange={windowView.choose} />
              </div>
            </div>
            {monitor.options.length > 0 && (
              <div className="vault-row">
                <div>
                  <h3>Monitor</h3>
                  <p className="hint">Which screen this app opens on.</p>
                </div>
                <div className="vault-field">
                  <StationSelect label="Monitor" value={monitor.value} options={monitor.options} onChange={monitor.choose} />
                </div>
              </div>
            )}
            <div className="vault-row">
              <div>
                <h3>Moving cards</h3>
                <p className="hint">Snap keeps cards packed in order. Free move leaves a card exactly where you drop it, gaps included.</p>
              </div>
              <div className="vault-field">
                <Segmented label="Moving cards" value={freeMove ? "free" : "snap"} options={MOVE_MODES} onChange={onMoveMode} />
              </div>
            </div>
          </section>
        )}
        {current.id === "nav" && <NavSettings api={navTabs} />}
        {current.id === "sources" && <SourcesSettings />}
        {current.id === "alerts" && (
          <>
            <AlertSettings />
            <NotificationCenter items={toasts.items} access={toasts.access} onDismiss={toasts.dismiss} onClear={toasts.clear} />
          </>
        )}
        {current.id === "game" && <GameModeSettings onSaved={onProfilesChanged} />}
        {current.id === "look" && (
          <section className="vault-card" aria-label="Appearance">
            <h3>Appearance</h3>
            <div className="vault-row">
              <div>
                <h3>{look.active.name}</h3>
                <p className="hint">Colour, corners, and wallpaper live on the Themes page.</p>
              </div>
              <div className="vault-field">
                <button type="button" className="pill-btn" onClick={onOpenThemes}>
                  Open theme store
                </button>
              </div>
            </div>
          </section>
        )}
        {current.id === "backup" && <BackupSettings />}
        {current.id === "creator" && <CreatorSettings />}
      </div>
    </section>
  );
}
