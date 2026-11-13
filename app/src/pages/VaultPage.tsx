import { Segmented } from "../components/Segmented";
import { StationSelect } from "../components/StationSelect";
import { NotificationCenter } from "../components/NotificationCenter";
import { AlertSettings, BackupSettings, GameModeSettings } from "../components/VaultExtras";
import type { Provider } from "../lib/types";
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

interface Props {
  provider: Provider;
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
  onOpenThemes: () => void;
}

/** Settings for this PC: name, window, card moving, alerts, game mode, backup, look and notifications. */
export function VaultPage({ provider, onProfilesChanged, look, windowView, monitor, displayName, onDisplayName, freeMove, onMoveMode, toasts, onOpenThemes }: Props) {
  return (
    <section className="vault" aria-label="Vault">
      <header className="vault-head">
        <h2>Vault</h2>
        <p>Look of this station, saved on this PC.</p>
      </header>
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
      <AlertSettings />
      <GameModeSettings provider={provider} onSaved={onProfilesChanged} />
      <BackupSettings provider={provider} />
      <div className="vault-pair">
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
        <NotificationCenter items={toasts.items} access={toasts.access} onDismiss={toasts.dismiss} onClear={toasts.clear} />
      </div>
    </section>
  );
}
