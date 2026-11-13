import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** `alert` messages jump the queue: they replace the one showing instead of waiting behind it. */
export interface ToastOptions {
  alert?: boolean;
}

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {});

const SHOW_MS = 3200;
/** More than this waiting and the oldest ones are dropped. */
const MAX_WAITING = 5;

interface Pending {
  id: number;
  text: string;
  alert: boolean;
}

/**
 * Shows one message at a time. A message sent while another is showing waits its turn, except an
 * alert, which replaces a plain message that is showing and goes ahead of the ones waiting.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Pending[]>([]);
  // The last text stays in place while the toast fades out.
  const [text, setText] = useState("");
  const [isAlert, setIsAlert] = useState(false);
  const nextId = useRef(1);

  const show = useCallback((message: string, options?: ToastOptions) => {
    const item: Pending = { id: nextId.current++, text: message, alert: options?.alert === true };
    setQueue((q) => {
      if (q[q.length - 1]?.text === message) return q;
      const [head, ...waiting] = q;
      if (!head) return [item];
      if (item.alert) {
        if (!head.alert) return [item, ...waiting.slice(0, MAX_WAITING)];
        // Behind the alerts already lined up, ahead of everything else.
        const at = waiting.findIndex((p) => !p.alert);
        const next = at < 0 ? [...waiting, item] : [...waiting.slice(0, at), item, ...waiting.slice(at)];
        return [head, ...next.slice(-MAX_WAITING)];
      }
      // Only the waiting part is trimmed, so the message on screen is never cut short.
      return [head, ...[...waiting, item].slice(-MAX_WAITING)];
    });
  }, []);

  const head = queue[0];
  useEffect(() => {
    if (!head) return;
    setText(head.text);
    setIsAlert(head.alert);
    const timer = window.setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [head]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Two always-present live regions: a screen reader announces an alert at once, a plain message politely. */}
      <div className={`toast${head && !head.alert ? " show" : ""}`} role="status" aria-live="polite">
        {!isAlert && text}
      </div>
      <div className={`toast alert${head?.alert ? " show" : ""}`} role="alert" aria-live="assertive">
        {isAlert && text}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
