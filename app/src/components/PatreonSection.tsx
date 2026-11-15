import { useState } from "react";
import { openLink } from "../lib/openLink";
import { checkPatreon, patreonLogin, patreonLogout, usePatreonStatus } from "../state/patreon";

/** The public tiers. Prices and benefits are set on Patreon; the app only turns on Basic and Brand. */
const TIERS = [
  { name: "Bronze", price: "$2.99", gives: "Basic Theme: every preset look" },
  { name: "Silver", price: "$5.99", gives: "Basic and Brand Theme, Discord" },
  { name: "Gold", price: "$9.99", gives: "Everything in Silver, plus a channel to request a design or update" },
  { name: "Diamond", price: "$11.99", gives: "Everything in Gold, plus early access to the beta" },
];

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/**
 * Log in with Patreon. The person signs in on the Patreon site and the app asks which tier the account pays.
 * Only Basic (all preset looks) and Brand (the brand-colour editor) are checked by the app. No tier adds Credits,
 * and cancelling removes these two on the next check while earned looks stay.
 */
export function PatreonSection() {
  const status = usePatreonStatus();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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
      setNote("Finish signing in on Patreon, then come back here.");
    }, "Could not start the Patreon sign-in.");

  return (
    <section className="patreon" aria-labelledby="patreon-title">
      <header className="patreon-head">
        <h3 id="patreon-title">Patreon</h3>
        <p>Paid tiers unlock looks and the brand-colour editor. They never add Credits.</p>
      </header>

      <ul className="patreon-tiers">
        {TIERS.map((t) => (
          <li key={t.name}>
            <span className="patreon-tier-name">{t.name}</span>
            <span className="patreon-tier-price">{t.price} / month</span>
            <span className="patreon-tier-gives">{t.gives}</span>
          </li>
        ))}
      </ul>

      {status == null ? (
        <p className="patreon-state" role="status">
          Reading Patreon sign-in…
        </p>
      ) : status === "unavailable" ? (
        <p className="patreon-state" role="status">
          The station service did not answer the Patreon check. If you just updated Command Station, close it fully and open it again so the new service starts.
        </p>
      ) : !status.configured ? (
        <p className="patreon-state" role="status">
          Patreon sign-in is not set up in this build, so no tier can be checked here yet.
        </p>
      ) : !status.signedIn ? (
        <div className="patreon-actions">
          <button type="button" className="pill-btn" aria-pressed="true" disabled={busy} onClick={() => void login()}>
            Log in with Patreon
          </button>
          <span className="khint">You sign in on the Patreon site. Internet is needed to check your tier.</span>
        </div>
      ) : (
        <div className="patreon-actions">
          <p className="patreon-state" role="status">
            {status.name ? `${status.name}: ` : ""}
            {status.tierName ? `${status.tierName} tier.` : "No active paid tier."} {status.basic ? "Preset looks unlocked." : "No Patreon unlocks."}{" "}
            {status.brand ? "Brand editor unlocked." : ""}
            {status.stale ? " Patreon could not be reached for a while, so the unlocks are off until it can be." : ""}
          </p>
          <button type="button" className="pill-btn" disabled={busy} onClick={() => void run(checkPatreon, "Could not check Patreon.")}>
            Check again
          </button>
          <button type="button" className="pill-btn" disabled={busy} onClick={() => void run(patreonLogout, "Could not log out.")}>
            Log out
          </button>
        </div>
      )}
      {note && (
        <p className="khint" role="status">
          {note}
        </p>
      )}
    </section>
  );
}
