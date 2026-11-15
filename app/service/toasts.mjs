/**
 * Windows Action Center toasts (Discord, LINE, and any other app), via the user's own listener.
 *
 * The listener runs on the media helper's PowerShell (`read` is its `toasts` command), so the app keeps one
 * PowerShell alive instead of two. This asks for the list every few seconds; the helper answers "unchanged" when
 * the set of toasts is the same, and the last list is kept.
 */
export function createToasts(log, deps = {}) {
  const platform = deps.platform ?? process.platform;
  const read = deps.read; // (force: boolean) => Promise<object | null>
  // Frontend polls /api/toasts; this backup only keeps the list from going fully stale if the UI is idle.
  const everyMs = deps.everyMs ?? 60_000;
  let snapshot = { access: "pending", items: [], error: null };
  let timer = null;
  let stopped = false;
  let busy = false;
  let failing = false;

  const failed = (msg) => {
    if (!failing) log(`toasts: ${msg}`);
    failing = true;
    snapshot = { access: "error", items: [], error: msg };
  };

  async function tick() {
    if (busy || stopped) return;
    busy = true;
    try {
      // While the last answer was not a good one, ask for the whole list so a stale "unchanged" can never hide it.
      const force = snapshot.access !== "allowed";
      const d = await read(force);
      if (stopped) return;
      if (!d || d.toasts !== true) {
        failed("The notification helper did not answer. Trying again.");
        return;
      }
      failing = false;
      if (d.unchanged) return;
      const items = Array.isArray(d.items) ? d.items : d.items ? [d.items] : [];
      snapshot = {
        access: typeof d.access === "string" ? d.access : "error",
        items: items.slice(0, 40),
        error: d.error ?? null,
      };
    } catch (e) {
      failed(`could not read notifications (${String(e?.message ?? e).slice(0, 120)})`);
    } finally {
      busy = false;
    }
  }

  return {
    start() {
      if (stopped || timer) return;
      if (platform !== "win32" || !read) {
        snapshot = { access: "unsupported", items: [], error: null };
        return;
      }
      void tick();
      timer = setInterval(() => void tick(), everyMs);
      timer.unref?.();
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      timer = null;
    },
    snapshot() {
      return snapshot;
    },
  };
}
