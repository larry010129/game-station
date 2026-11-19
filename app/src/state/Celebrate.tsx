import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";

/**
 * A moment worth stopping for: a new rank, a first card, an achievement, a pass level. One at a time, in order.
 * Everyday news (a claimed day, a saved setting) stays a toast; this is for the few things worth a full screen.
 */
export interface Celebration {
  /** What was earned, in a few words: "Veteran", "Spotify card". */
  title: string;
  /** One sentence under the title: what it means or what changed. */
  line: string;
  icon?: LucideIcon;
  /** Optional picture under the line, such as a LookCard or a SkinSample. */
  art?: ReactNode;
  /** Runs once the player has seen it and moved on (not when the app closes first). */
  onDone?: () => void;
}

const CelebrateContext = createContext<(c: Celebration) => void>(() => {});

/** More than this waiting and the newest are dropped: nobody wants to click through ten screens. */
const MAX_WAITING = 4;

export function CelebrateProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<(Celebration & { key: number })[]>([]);
  const next = useRef(1);

  const celebrate = useCallback((c: Celebration) => {
    setQueue((q) => (q.length > MAX_WAITING ? q : [...q, { ...c, key: next.current++ }]));
  }, []);
  const head = queue[0];
  const done = useCallback(() => {
    head?.onDone?.();
    setQueue((q) => q.slice(1));
  }, [head]);

  return (
    <CelebrateContext.Provider value={celebrate}>
      {children}
      {head ? <CelebrateOverlay key={head.key} c={head} remaining={queue.length - 1} onDone={done} /> : null}
    </CelebrateContext.Provider>
  );
}

export const useCelebrate = () => useContext(CelebrateContext);

/**
 * The overlay: the page behind goes soft and dark, rings open around the emblem, the title and one line rise under
 * it. A click anywhere, Enter, Space or Escape moves on.
 */
function CelebrateOverlay({ c, remaining, onDone }: { c: Celebration; remaining: number; onDone: () => void }) {
  const go = useRef<HTMLButtonElement>(null);
  const Icon = c.icon ?? Sparkles;

  useEffect(() => {
    const id = window.setTimeout(() => go.current?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onDone();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onDone]);

  return (
    <div className="cel" role="dialog" aria-modal="true" aria-labelledby="cel-title" aria-describedby="cel-line" onClick={onDone}>
      <div className="cel-stage">
        <div className="cel-emblem" aria-hidden="true">
          <span className="cel-axis" />
          <svg className="cel-rings" viewBox="0 0 200 200">
            <circle className="cel-ring-out" cx="100" cy="100" r="94" pathLength={100} />
            <circle className="cel-ring-mid" cx="100" cy="100" r="74" />
            <circle className="cel-ring-in" cx="100" cy="100" r="52" />
          </svg>
          <span className="cel-icon">
            <Icon strokeWidth={1.4} />
          </span>
        </div>
        <h2 id="cel-title" className="cel-title">
          {c.title}
        </h2>
        <p id="cel-line" className="cel-line">
          {c.line}
        </p>
        {c.art ? <div className="cel-art">{c.art}</div> : null}
      </div>
      <button ref={go} type="button" className="cel-go">
        {remaining > 0 ? `Next (${remaining} more)` : "Click anywhere to close"}
      </button>
    </div>
  );
}
