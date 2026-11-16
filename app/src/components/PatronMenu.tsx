import { useEffect, useId, useRef, useState } from "react";
import { openLink } from "../lib/openLink";
import { checkPatreon, patreonLogin, patreonLogout, refreshPatreon, type PatreonStatus } from "../state/patreon";
import { Icon } from "./Icon";

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/**
 * The Patreon sign-in, in the top bar. The button shows who is signed in at a glance; its panel holds log in,
 * check again and log out. The person signs in on the Patreon site, so this only opens it and then re-reads the tier.
 */
export function PatronMenu() {
  const [status, setStatus] = useState<PatreonStatus | "unavailable" | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Slow while idle; fast while the panel is open or a sign-in is finishing in the browser.
  useEffect(() => {
    let alive = true;
    const load = () => void refreshPatreon().then((s) => alive && setStatus(s ?? "unavailable"));
    load();
    const id = window.setInterval(load, open || waiting ? 3000 : 60000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [open, waiting]);

  useEffect(() => {
    if (status && status !== "unavailable" && status.signedIn) setWaiting(false);
  }, [status]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLElement>(".patron-btn")?.focus();
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const run = async (f: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setNote(null);
    try {
      await f();
    } catch (e) {
      setNote(msg(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  const login = () =>
    run(async () => {
      const { url } = await patreonLogin();
      await openLink(url).catch(() => {});
      setWaiting(true);
      setNote("Finish signing in on Patreon, then come back here.");
    }, "Could not start the Patreon sign-in.");

  const ready = status != null && status !== "unavailable" && status.configured;
  const signedIn = ready && status.signedIn;
  const tier = signedIn ? status.tierName : null;
  const label = signedIn ? tier || "Patron" : "Log in";

  return (
    <div className="patron" ref={rootRef} data-state={signedIn ? "in" : "out"}>
      <button
        type="button"
        className="patron-btn"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={signedIn ? `Patreon: signed in${tier ? `, ${tier} tier` : ""}` : "Log in with Patreon"}
        title={signedIn ? "Patreon account" : "Log in with Patreon"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="patron-avatar" aria-hidden="true">
          {signedIn && status.name ? status.name.trim().charAt(0).toUpperCase() : <Icon name="user" small />}
        </span>
        <span className="patron-label">{label}</span>
        <Icon name="chevron" small />
      </button>

      {open && (
        <div className="patron-panel" id={panelId} role="dialog" aria-label="Patreon account">
          {status == null ? (
            <p className="patron-text" role="status">
              Reading Patreon sign-in…
            </p>
          ) : status === "unavailable" ? (
            <p className="patron-text" role="status">
              The station service did not answer. Close Command Station fully and open it again so the new service starts.
            </p>
          ) : !status.configured ? (
            <p className="patron-text" role="status">
              Patreon sign-in is not set up in this build, so no tier can be checked here yet.
            </p>
          ) : !status.signedIn ? (
            <>
              <p className="patron-title">Patreon</p>
              <p className="patron-text">Log in to open the looks and tools your tier includes. You sign in on the Patreon site, and internet is needed to check your tier.</p>
              <button type="button" className="pill-btn patron-primary" disabled={busy} onClick={() => void login()}>
                Log in with Patreon
              </button>
            </>
          ) : (
            <>
              <p className="patron-title">{status.name || "Patron"}</p>
              <p className="patron-text">
                {status.tierName ? `${status.tierName} tier.` : "No active paid tier."} {status.basic ? "Preset looks unlocked." : "No Patreon unlocks."}{" "}
                {status.brand ? "Brand editor unlocked." : ""}
                {status.stale ? " Patreon could not be reached for a while, so the unlocks are off until it can be." : ""}
              </p>
              <div className="patron-actions">
                <button type="button" className="pill-btn" disabled={busy} onClick={() => void run(checkPatreon, "Could not check Patreon.")}>
                  Check again
                </button>
                <button type="button" className="pill-btn" disabled={busy} onClick={() => void run(patreonLogout, "Could not log out.")}>
                  Log out
                </button>
              </div>
            </>
          )}
          {note && (
            <p className="patron-text" role="status">
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
