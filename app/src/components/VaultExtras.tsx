import { useEffect, useRef, useState } from "react";
import type { Provider, SettingsData } from "../lib/types";
import { readString, restoreRemove, restoreWrite, setRestoring } from "../lib/storage";
import { deletePicture, loadPicture, savePicture } from "../state/imageStore";
import { useToast } from "../state/Toast";
import { BG_ID, IMG_REF_KEY } from "../state/useTheme";
import { DEFAULT_RULES, RULE_IDS, RULE_INFO, readRules, writeRules, type AlertRule, type RuleId } from "../state/useSmartAlerts";

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/* ---------- Smart alerts ---------- */

export function AlertSettings() {
  const [rules, setRules] = useState(readRules);
  const change = (id: RuleId, patch: Partial<AlertRule>) => {
    const next = { ...rules, [id]: { ...rules[id], ...patch } };
    setRules(next);
    writeRules(next);
  };
  return (
    <section className="vault-card" aria-label="Smart alerts">
      <h3>Smart alerts</h3>
      <p className="hint vault-intro">Each alert shows in Alerts and events and as a message. After one fires it stays quiet for five minutes.</p>
      {RULE_IDS.map((id) => {
        const info = RULE_INFO[id];
        const rule = rules[id];
        return (
          <div className="vault-row" key={id}>
            <div>
              <h3>{info.name}</h3>
              <p className="hint">{info.blurb}</p>
            </div>
            <div className="vault-field rule">
              <label className="switch">
                <input type="checkbox" checked={rule.on} onChange={(e) => change(id, { on: e.target.checked })} aria-label={`${info.name} on`} />
                <span>{rule.on ? "On" : "Off"}</span>
              </label>
              <input
                type="range"
                min={info.min}
                max={info.max}
                step={info.step}
                value={rule.limit}
                disabled={!rule.on}
                aria-label={`${info.name} limit`}
                onChange={(e) => change(id, { limit: Number(e.target.value) })}
              />
              <strong className="rule-val">
                {rule.limit} {info.unit}
              </strong>
            </div>
          </div>
        );
      })}
      <div className="vault-row">
        <div />
        <div className="vault-field">
          <button
            className="eb-btn"
            type="button"
            onClick={() => {
              setRules({ ...DEFAULT_RULES });
              writeRules({ ...DEFAULT_RULES });
            }}
          >
            Back to defaults
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Game mode editor ---------- */

const STEP_NAMES: Record<string, string> = {
  power: "Power mode to Best performance",
  close: "Close background apps",
  gpu: "Run Overwatch on the high-performance GPU",
  poll: "Slow live stats while playing",
  launch: "Launch Overwatch",
  obs: "OBS scene (not linked yet)",
};

function ProgramList({ label, hint, items, onChange }: { label: string; hint: string; items: string[]; onChange: (next: string[]) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const run = async (next: string[]) => {
    setBusy(true);
    try {
      await onChange(next);
      setDraft("");
    } catch (e) {
      toast(msg(e, "Couldn't save that."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="vault-row">
      <div>
        <h3>{label}</h3>
        <p className="hint">{hint}</p>
      </div>
      <div className="vault-field plist">
        <ul>
          {items.map((n) => (
            <li key={n}>
              <span>{n}</span>
              <button type="button" className="cell-x-inline" aria-label={`Remove ${n}`} disabled={busy} onClick={() => run(items.filter((x) => x !== n))}>
                ×
              </button>
            </li>
          ))}
          {!items.length && <li className="hint">Nothing in the list.</li>}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void run([...items, draft.trim()]);
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Program, e.g. Discord.exe" aria-label={`Add to ${label}`} maxLength={60} />
          <button className="eb-btn" type="submit" disabled={busy || !draft.trim()}>
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

export function GameModeSettings({ provider, onSaved }: { provider: Provider; onSaved: () => Promise<void> }) {
  const [data, setData] = useState<SettingsData | null>(null);
  const [failed, setFailed] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    provider
      .api<SettingsData>("/api/settings")
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [provider]);

  /** Saves a change, then reloads the game-mode profiles so the panel shows the new steps straight away. */
  const save = async (patch: Partial<SettingsData>) => {
    const next = await provider.api<SettingsData>("/api/settings", patch);
    setData(next);
    try {
      await onSaved();
    } catch {
      // the new list applies after a restart
    }
  };

  if (!data) {
    return (
      <section className="vault-card" aria-label="Game mode">
        <h3>Game mode</h3>
        <p className="hint vault-intro">{failed ? "The local service did not answer, so these settings can't be read." : "Reading settings…"}</p>
      </section>
    );
  }
  const off = new Set(data.disabledSteps);
  return (
    <section className="vault-card" aria-label="Game mode">
      <h3>Game mode</h3>
      <p className="hint vault-intro">Saved to config.json on this PC. System programs and anti-cheat can never be added to the close list.</p>
      <div className="vault-row">
        <div>
          <h3>Steps</h3>
          <p className="hint">Untick a step to skip it in every profile.</p>
        </div>
        <div className="vault-field steps">
          {data.steps.map((id) => (
            <label key={id} className="switch">
              <input
                type="checkbox"
                checked={!off.has(id)}
                onChange={(e) => {
                  const next = e.target.checked ? data.disabledSteps.filter((s) => s !== id) : [...data.disabledSteps, id];
                  save({ disabledSteps: next }).catch((err) => toast(msg(err, "Couldn't save that.")));
                }}
              />
              <span>{STEP_NAMES[id] ?? id}</span>
            </label>
          ))}
        </div>
      </div>
      <ProgramList label="Close list" hint="Closed politely when game mode starts. Never force-killed." items={data.closeApps} onChange={(closeApps) => save({ closeApps })} />
      <ProgramList label="Game programs" hint="Programs treated as the game for session timing and stats." items={data.games} onChange={(games) => save({ games })} />
    </section>
  );
}

/* ---------- Backup ---------- */

const FORMAT = "command-station-backup";

/** Keys that are never replaced by a restore: this session's own state and anything that is a sign-in. */
const keepOnRestore = (k: string) => k === "cs.booted" || /token|auth|sign-?in|session/i.test(k);

/** Every `cs.` key currently in local storage. */
function storedKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("cs.")) keys.push(k);
    }
  } catch {
    // nothing readable
  }
  return keys;
}

interface Backup {
  app: typeof FORMAT;
  version: 1;
  savedAt: string;
  local: Record<string, string>;
  /** The wallpaper, as a data URL. It lives in IndexedDB, so it is not among `local`. Absent when there is none. */
  picture?: string | null;
  service: Partial<SettingsData> | null;
}

export function BackupSettings({ provider }: { provider: Provider }) {
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const collect = async (): Promise<Backup> => {
    const local: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cs.")) {
          const v = localStorage.getItem(k);
          if (v != null) local[k] = v;
        }
      }
    } catch {
      // nothing readable
    }
    let picture: string | null = null;
    if (readString(IMG_REF_KEY) === BG_ID) {
      try {
        picture = await loadPicture(BG_ID);
      } catch {
        // The wallpaper could not be read: the rest of the backup is still worth keeping.
      }
    }
    let service: Backup["service"] = null;
    try {
      const s = await provider.api<SettingsData>("/api/settings");
      service = { closeApps: s.closeApps, games: s.games, disabledSteps: s.disabledSteps };
    } catch {
      // service not reachable: save the dashboard side only
    }
    return { app: FORMAT, version: 1, savedAt: new Date().toISOString(), local, picture, service };
  };

  const exportFile = async () => {
    setBusy(true);
    try {
      const data = await collect();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `command-station-backup-${data.savedAt.slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`Saved ${Object.keys(data.local).length} settings.`);
    } catch (e) {
      toast(msg(e, "Couldn't save the backup file."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(await collect()));
      toast("Backup copied. Paste it into a text file to keep it.");
    } catch {
      toast("Couldn't copy. Use Export to a file instead.");
    }
  };

  const importFile = async (f: File) => {
    setBusy(true);
    try {
      if (f.size > 25 * 1024 * 1024) throw new Error("That file is too big to be a backup.");
      const data = JSON.parse(await f.text()) as Partial<Backup>;
      if (data?.app !== FORMAT || data.version !== 1 || typeof data.local !== "object" || data.local == null) throw new Error("That is not a Command Station backup.");
      const entries = Object.entries(data.local).filter(([k, v]) => k !== IMG_REF_KEY && !keepOnRestore(k) && k.startsWith("cs.") && typeof v === "string") as [string, string][];
      if (!window.confirm(`Restore ${entries.length} settings from this backup? This replaces what is saved here now and reloads the app.`)) return;
      // Restore replaces: what is saved here goes first, except the keys that belong to this session or a sign-in.
      // The current values are kept so a failed restore can put them back, and ordinary writes are paused so a
      // live effect cannot overwrite restored values before the reload.
      const snapshot = new Map<string, string>();
      for (const k of storedKeys()) {
        const v = readString(k);
        if (v != null) snapshot.set(k, v);
      }
      const oldWallpaperRef = readString(IMG_REF_KEY);
      setRestoring(true);
      for (const k of storedKeys()) {
        if (k !== IMG_REF_KEY && !keepOnRestore(k)) restoreRemove(k);
      }
      let n = 0;
      const failed: string[] = [];
      for (const [k, v] of entries) {
        if (restoreWrite(k, v)) n++;
        else failed.push(k);
      }
      if (failed.length) {
        // Not all of it could be saved: put everything back as it was and stay on the current settings.
        for (const k of storedKeys()) {
          if (k !== IMG_REF_KEY && !keepOnRestore(k)) restoreRemove(k);
        }
        for (const [k, v] of snapshot) {
          if (k !== IMG_REF_KEY && !keepOnRestore(k)) restoreWrite(k, v);
        }
        setRestoring(false);
        toast(`Could not save ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}. Nothing was changed.`, { alert: true });
        return;
      }
      // A marker without a picture would leave the app looking for a wallpaper that is not there.
      // A backup made before pictures were included has no `picture` key and leaves the current wallpaper alone.
      let wallpaper = false;
      if (typeof data.picture === "string" && data.picture.startsWith("data:image/")) {
        try {
          await savePicture(BG_ID, data.picture);
          wallpaper = restoreWrite(IMG_REF_KEY, BG_ID);
        } catch {
          wallpaper = false;
        }
        if (!wallpaper) failed.push("wallpaper");
      } else if (data.picture === null) {
        restoreRemove(IMG_REF_KEY);
        await deletePicture(BG_ID).catch(() => {});
      }
      if (failed.length && oldWallpaperRef != null) restoreWrite(IMG_REF_KEY, oldWallpaperRef);
      let serviceFailed: string | null = null;
      if (data.service) {
        try {
          await provider.api("/api/settings", data.service);
        } catch (e) {
          serviceFailed = msg(e, "Game-mode settings were not restored.");
        }
      }
      // One summary, then the reload, so the result is on screen before the page restarts.
      const parts = [failed.length ? `Restored ${n} of ${n + failed.length} settings. Could not save: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}.` : `Restored ${n} settings${wallpaper ? " and the wallpaper" : ""}.`];
      if (serviceFailed) parts.push(`Dashboard settings are back, but ${serviceFailed.charAt(0).toLowerCase()}${serviceFailed.slice(1)}`);
      // An alert shows at once instead of queueing, and the reload waits until it has been on screen for a full read.
      toast(`${parts.join(" ")} Reloading…`, { alert: true });
      window.setTimeout(() => window.location.reload(), 3600);
    } catch (e) {
      setRestoring(false);
      toast(msg(e, "Couldn't read that backup."));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <section className="vault-card" aria-label="Backup">
      <h3>Backup</h3>
      <p className="hint vault-intro">Layout, cards, theme, wallpaper, alerts, calendar, notes and game-mode lists in one file. Sign-ins (Spotify, Discord) are never included.</p>
      <div className="vault-row">
        <div>
          <h3>Export</h3>
          <p className="hint">Save everything to a file.</p>
        </div>
        <div className="vault-field btns">
          <button className="eb-btn primary" type="button" onClick={exportFile} disabled={busy}>
            Export to file
          </button>
          <button className="eb-btn" type="button" onClick={copy} disabled={busy}>
            Copy instead
          </button>
        </div>
      </div>
      <div className="vault-row">
        <div>
          <h3>Restore</h3>
          <p className="hint">Replaces everything saved here with the file's settings. An older backup with no wallpaper entry keeps the current one.</p>
        </div>
        <div className="vault-field btns">
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          <button className="eb-btn" type="button" onClick={() => file.current?.click()} disabled={busy}>
            Choose a backup…
          </button>
        </div>
      </div>
    </section>
  );
}
