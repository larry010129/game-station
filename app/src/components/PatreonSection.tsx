import { openLink } from "../lib/openLink";

/** The public tiers. Prices and benefits are set on Patreon; the app only turns on Basic and Brand. */
const TIERS = [
  { name: "Bronze", price: "$2.99", gives: "Basic Theme: every preset look" },
  { name: "Silver", price: "$5.99", gives: "Basic and Brand Theme, Discord" },
  { name: "Gold", price: "$9.99", gives: "Everything in Silver, plus a channel to request a design or update" },
  { name: "Diamond", price: "$11.99", gives: "Everything in Gold, plus early access to the beta" },
];

/** Membership checkout. The app only opens this page; Patreon takes the payment. */
const PATREON_JOIN_URL = "https://www.patreon.com/17138057/join";

function JoinPatreonButton() {
  return (
    <button type="button" className="pill-btn" onClick={() => void openLink(PATREON_JOIN_URL)}>
      Join on Patreon
    </button>
  );
}

/**
 * The tiers and the join link. Signing in lives in the top bar (PatronMenu). Only Basic (all preset looks) and
 * Brand (the brand-colour editor) are checked by the app. No tier adds Credits, and cancelling removes these two
 * on the next check while earned looks stay.
 */
export function PatreonSection() {
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

      <div className="patreon-actions">
        <JoinPatreonButton />
        <span className="khint">Already a patron? Use Log in at the top of the page.</span>
      </div>
    </section>
  );
}
