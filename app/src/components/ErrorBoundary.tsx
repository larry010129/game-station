import { Component, type ErrorInfo, type ReactNode } from "react";
import { readString, removeKey } from "../lib/storage";

interface Props {
  /** The failure screen. Gets the error and a way to try again. */
  fallback: (error: Error, retry: () => void) => ReactNode;
  /** Changing this value clears a caught error (a different card, or the data was reset). */
  resetKey?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches errors thrown while drawing its children, so one broken part does not blank the whole window. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("A part of the app failed to draw:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  retry = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.retry) : this.props.children;
  }
}

/** One card's cell: if the card breaks, a small tile takes its place and the rest of the page keeps working. */
export function CardBoundary({ name, keys, children }: { name: string; keys: string[]; children: ReactNode }) {
  // Changes when any of the card's saved values change, so a card that failed on bad data tries again once it is fixed.
  const dataVersion = keys.map((k) => readString(k) ?? "").join("");
  const canReset = keys.length > 0;
  return (
    <ErrorBoundary
      resetKey={dataVersion}
      fallback={(_error, retry) => (
        <section className="t kcard card-error" role="alert" aria-label={`${name} hit an error`}>
          <div className="th">
            <div>
              <h2>This card hit an error</h2>
              <small>{name}</small>
            </div>
          </div>
          <div className="kbody">
            <p className="hint">{canReset ? "It could not be drawn. Its saved data may be damaged." : "It could not be drawn. This card keeps no saved data, so trying again may be enough."}</p>
            <button
              type="button"
              className="eb-btn"
              onClick={() => {
                keys.forEach(removeKey);
                retry();
              }}
            >
              {canReset ? "Reset this card's data" : "Try again"}
            </button>
          </div>
        </section>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/** Last resort around the whole app: a plain message and a reload instead of a blank window. */
export function AppBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <main className="app-error" role="alert">
          <h1>Something went wrong</h1>
          <p>{error.message || "The app hit an unexpected error."}</p>
          <button type="button" className="eb-btn primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </main>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
