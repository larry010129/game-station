import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
/** Official yellow mark: https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png */
import bmcButton from "../assets/bmc-default-yellow.png";
import { PatreonSection } from "../components/PatreonSection";
import { openLink } from "../lib/openLink";
import {
  BUY_ME_A_COFFEE_URL,
  CREDIT_NAME,
  formatCredits,
  useStationCredits,
} from "../state/stationCredits";

/**
 * Support / Credits page — tips go to Buy Me a Coffee (no Stripe, no auto-credit).
 * Station Credits stay local for quests and unlock spends.
 */
export function BuyCreditsPage() {
  const balance = useStationCredits();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [opened, setOpened] = useState(false);

  const openSupport = async () => {
    await openLink(BUY_ME_A_COFFEE_URL);
    setOpened(true);
    setConfirmOpen(false);
  };

  return (
    <section className="buy-credits" aria-label="Support">
      <header className="buy-credits-head">
        <h2>Support</h2>
        <p>
          Station {CREDIT_NAME} stay on this PC. Quests earn them. A tip does not add {CREDIT_NAME}.
        </p>
      </header>

      <div className="buy-credits-cta">
        <p className="buy-credits-bal">
          Balance <strong>{formatCredits(balance)}</strong>
        </p>
        <button
          type="button"
          className="buy-credits-bmc"
          aria-label="Support on Buy Me a Coffee"
          aria-haspopup="dialog"
          onClick={() => setConfirmOpen(true)}
        >
          <img src={bmcButton} alt="" width={545} height={153} />
        </button>
      </div>

      {opened && (
        <p className="buy-credits-ok" role="status">
          Thanks — Buy Me a Coffee opened in your browser. Your {CREDIT_NAME} balance is unchanged.
        </p>
      )}

      <PatreonSection />

      <SupportConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => void openSupport()} />
    </section>
  );
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

function SupportConfirmDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.getClientRects().length > 0)
        : [];
    const first = focusables()[0] ?? panel;
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="buy-pay-root"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="buy-pay"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
      >
        <header className="buy-pay-head">
          <div>
            <h2 id={titleId}>Support on Buy Me a Coffee</h2>
            <p id={descId}>
              Opens your browser to tip the project. Your {CREDIT_NAME} balance does not change.
            </p>
          </div>
          <button type="button" className="buy-pay-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="buy-pay-summary" aria-label="Support link">
          <div className="buy-pay-summary-top">
            <h3>Buy Me a Coffee</h3>
          </div>
          <p>{displayUrl(BUY_ME_A_COFFEE_URL)}</p>
        </div>

        <div className="buy-pay-actions">
          <button type="button" className="pill-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="pill-btn" aria-pressed="true" onClick={onConfirm}>
            Open Buy Me a Coffee
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
