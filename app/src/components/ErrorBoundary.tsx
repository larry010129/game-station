import { Component, useEffect, useLayoutEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { readString, removeKey } from "../lib/storage";
import { applySavedTheme } from "../state/useTheme";

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

/** The last-resort screen: the station mark, what happened, and a way back. Also drawn by `?errorPreview=1`. */
export function AppErrorScreen({ message }: { message?: string }) {
  // Preview and a crash before App mounts never run useTheme; paint the saved look here.
  useLayoutEffect(() => {
    applySavedTheme();
  }, []);
  return (
    <main className="app-error" role="alert">
      <section className="app-error-panel">
        <svg className="app-error-mark" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M16 30 V16 H30 M70 16 H84 V30 M16 70 V84 H30 M70 84 H84 V70" />
          <circle cx="50" cy="50" r="18" />
          <path d="M50 28 V40 M50 60 V72 M28 50 H40 M60 50 H72" />
        </svg>
        <h1>Something went wrong</h1>
        <p className="app-error-msg">{message || "The app hit an unexpected error."}</p>
        <button
          type="button"
          className="eb-btn primary"
          onClick={() => {
            // Fresh launch: drop the error preview flag and the short-boot mark so the start screen runs again.
            try {
              sessionStorage.removeItem("cs.booted");
            } catch {
              // Boot still runs; only the short path may stay.
            }
            const url = new URL(window.location.href);
            if (url.searchParams.has("errorPreview")) {
              url.searchParams.delete("errorPreview");
              window.location.assign(url.pathname + url.search + url.hash);
            } else {
              window.location.reload();
            }
          }}
        >
          Reload
        </button>
      </section>
    </main>
  );
}

/** Last resort around the whole app: a message and a reload instead of a blank window. */
export function AppBoundary({ children }: { children: ReactNode }) {
  // Dev only: after a hot update the old error is stale (a changed hook list throws "Rendered more hooks…"), so draw the app fresh.
  const [hot, setHot] = useState(0);
  useEffect(() => {
    const h = import.meta.hot;
    if (!h) return;
    const bump = () => setHot((n) => n + 1);
    h.on("vite:afterUpdate", bump);
    return () => h.off("vite:afterUpdate", bump);
  }, []);
  return (
    <ErrorBoundary resetKey={String(hot)} fallback={(error) => <AppErrorScreen message={error.message} />}>
      {children}
    </ErrorBoundary>
  );
}
