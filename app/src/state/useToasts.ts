import { useCallback, useEffect, useMemo, useState } from "react";
import type { Provider } from "../lib/types";

export interface AppToast {
  id: string;
  app: string;
  title: string;
  body: string;
  t: number;
}

interface ToastPayload {
  access: string;
  items?: AppToast[];
}

/** Toasts other apps have sent to Windows, from the local service. */
export function useToasts(provider: Provider) {
  const [access, setAccess] = useState("pending");
  const [items, setItems] = useState<AppToast[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const data = await provider.api<ToastPayload>("/api/toasts");
        if (!alive) return;
        setAccess(data.access || "error");
        const next = Array.isArray(data.items) ? data.items : [];
        // Keep the same list when nothing changed, so a poll does not re-render the dashboard.
        setItems((prev) => (prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next));
      } catch {
        if (alive) setAccess((prev) => (prev === "pending" ? "error" : prev));
      }
    };
    void tick();
    const timer = window.setInterval(tick, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [provider]);

  const shown = useMemo(() => items.filter((item) => !hidden.has(item.id)), [items, hidden]);

  const dismiss = useCallback((id: string) => {
    setHidden((prev) => new Set(prev).add(id));
  }, []);

  const clear = useCallback(() => {
    setHidden((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(item.id);
      return next;
    });
  }, [items]);

  return useMemo(() => ({ access, items: shown, dismiss, clear }), [access, shown, dismiss, clear]);
}
