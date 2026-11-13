import { clockTime } from "../lib/format";
import type { AppToast } from "../state/useToasts";

/** Messages other apps have pushed to Windows, such as Discord or LINE. */
export function NotificationCenter({
  items,
  access,
  onDismiss,
  onClear,
}: {
  items: AppToast[];
  access: string;
  onDismiss: (id: string) => void;
  onClear: () => void;
}) {
  const waiting = access === "pending";
  const blocked = access === "denied" || access === "unspecified";
  const empty = waiting
    ? "Reading Windows notifications…"
    : blocked
      ? "Windows has not allowed reading notifications."
      : access === "error"
        ? "Notifications could not be read."
        : "No app notifications right now.";

  return (
    <section className="nc" aria-label="Notifications">
      <header className="nc-h">
        <div>
          <h3>
            Notifications
            {items.length > 0 && <span className="nc-count">{items.length}</span>}
          </h3>
          <p>From apps on this PC</p>
        </div>
        {items.length > 0 && (
          <button type="button" className="nc-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </header>
      <ul className="nc-list" aria-live="polite">
        {items.length === 0 && <li className="nc-empty">{empty}</li>}
        {items.map((item) => (
          <Row key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </ul>
    </section>
  );
}

function Row({ item, onDismiss }: { item: AppToast; onDismiss: (id: string) => void }) {
  // App name, then the message that app pushed.
  const headline = item.title || item.body;
  const message = item.body && item.body !== item.title ? item.body : "";
  const when = item.t > 0 ? item.t : undefined;
  return (
    <li className="nc-row">
      <i className="nc-dot" aria-hidden="true" />
      <span className="nc-text">
        {item.app && <b className="nc-app">{item.app}</b>}
        {headline && <span className="nc-title">{headline}</span>}
        {message && <span className="nc-body">{message}</span>}
      </span>
      {when ? <time dateTime={new Date(when).toISOString()}>{clockTime(when)}</time> : <time />}
      <button
        type="button"
        className="nc-x"
        aria-label={`Dismiss ${item.app || "notification"}`}
        onClick={() => onDismiss(item.id)}
      >
        ×
      </button>
    </li>
  );
}
