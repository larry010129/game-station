import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarClock, Save, Send, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useDraft } from "../state/DraftContext";
import { Button } from "../ui/primitives";
import { formatMdyHm, maskMdyHm, overtakenReleases, parseMdyHm, schedulePresets, untilText } from "../lib/schedule";
import { listReleases } from "../api/contentApi";
import type { ReleaseMeta } from "../types/draft";
import { cn } from "@/lib/utils";

/** Fired after a push so lists (the Releases page) can reload. */
export const RELEASES_CHANGED = "cms-releases-changed";

/** "Release 12 (scheduled for …) has not gone live yet. …" for the releases a push would overtake. */
function overtakenWarning(numbers: readonly number[], releases: readonly ReleaseMeta[]): string {
  const named = numbers
    .map((n) => {
      const r = releases.find((x) => x.number === n);
      return r?.effectiveAt ? `${n} (scheduled for ${longTime(new Date(r.effectiveAt))})` : String(n);
    })
    .join(", ");
  const one = numbers.length === 1;
  return `Release ${named} ${one ? "has" : "have"} not gone live yet. This push carries the whole draft, so ${
    one ? "its" : "their"
  } scheduled changes go live with it, earlier than planned.`;
}

const longTime = (d: Date) =>
  d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

/**
 * Save and Push for the top bar. Save writes the draft now (it also autosaves). Push always asks when the release goes
 * live, typed as mm/dd/yy hh:mm in local time; the app keeps its current content until then and switches at that time.
 * After the 21st.dev Post Scheduler: the action opens a date and time row and a line saying when it will go out.
 */
export function SaveAndPush() {
  const { dirty, saving, save, publish, publishErrors, draft } = useDraft();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"schedule" | "now" | null>(null);
  // Push now takes two clicks: the first arms it, the second pushes. Arming lapses after a few seconds.
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Wraps the Push button (the shared Button does not forward refs): outside-click test and focus return.
  const triggerRef = useRef<HTMLSpanElement>(null);
  const titleId = useId();
  const hintId = useId();

  // Releases already pushed, to warn when this push would overtake one that is still scheduled.
  const [releases, setReleases] = useState<ReleaseMeta[]>([]);
  // A push that overtakes a scheduled release takes a second click on "Schedule push" too.
  const [earlyArmed, setEarlyArmed] = useState(false);

  const at = parseMdyHm(text);
  const past = at != null && at.getTime() < now.getTime() - 60_000;
  const blocked = publishErrors.length > 0;
  const canPush = at != null && !past && !blocked && !busy;
  const canPushNow = !blocked && !busy;
  const overtakenLater = at != null && !past ? overtakenReleases(at, releases, now) : [];
  const overtakenNow = overtakenReleases(now, releases, now);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void listReleases()
      .then((list) => alive && setReleases(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => setEarlyArmed(false), [text]);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4_000);
    return () => window.clearTimeout(id);
  }, [armed]);

  // Keep "in 3 h 5 min" honest while the panel is open.
  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, [open]);

  // Escape or a click outside closes the panel; focus returns to Push.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const close = () => {
      setOpen(false);
      triggerRef.current?.querySelector("button")?.focus();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  function openPanel() {
    setError(null);
    setDone(null);
    if (!text) setText(formatMdyHm(schedulePresets()[1].at));
    setOpen(true);
  }

  /** Schedules the push for the typed time, or with `now` set, makes it live at once. */
  async function push(now = false) {
    const when = now ? new Date() : at;
    if (!now) {
      if (!at) return setError("Type the go-live time as mm/dd/yy hh:mm, for example 11/17/26 09:00.");
      if (past) return setError("That time has passed. Pick now or a later time.");
      if (overtakenLater.length && !earlyArmed) return setEarlyArmed(true);
    }
    setEarlyArmed(false);
    if (!when) return;
    setBusy(now ? "now" : "schedule");
    setArmed(false);
    setError(null);
    try {
      const result = await publish(undefined, when.toISOString());
      if (!result || result.errors?.length) {
        setError(result?.errors?.join(" · ") ?? "Push is blocked: fix the publish checks first.");
        return;
      }
      setDone(now ? `Release ${result.number} is live now.` : `Release ${result.number} goes live ${longTime(when)}.`);
      window.dispatchEvent(new Event(RELEASES_CHANGED));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Push failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        className="h-8 gap-1.5 px-2.5 text-xs"
        disabled={saving || !dirty}
        onClick={() => void save()}
        title={dirty ? "Save the draft now (it also autosaves)" : "Everything is saved"}
      >
        <Save aria-hidden className="size-3.5" />
        {saving ? "Saving…" : dirty ? "Save" : "Saved"}
      </Button>
      <span ref={triggerRef} className="contents">
        <Button
          type="button"
          className="h-8 gap-1.5 px-3 text-xs"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => (open ? setOpen(false) : openPanel())}
        >
          <Send aria-hidden className="size-3.5" />
          Push
        </Button>
      </span>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-labelledby={titleId}
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(360px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)]"
          >
            <div className="flex flex-col gap-3 p-4">
              <div>
                <h2 id={titleId} className="text-sm font-semibold">
                  Push the draft
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Choose when it goes live. Apps keep their current content until then, then switch on their own.
                </p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Goes live · mm/dd/yy hh:mm (24-hour, your time)</span>
                <span className="relative flex items-center">
                  <CalendarClock aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-muted" />
                  <input
                    ref={inputRef}
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="11/17/26 09:00"
                    aria-describedby={hintId}
                    aria-invalid={text.length > 0 && (at == null || past) ? true : undefined}
                    value={text}
                    onChange={(e) => {
                      setText(maskMdyHm(e.target.value));
                      setError(null);
                      setDone(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canPush) void push();
                    }}
                    className={cn(
                      "h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 font-mono text-sm tabular-nums tracking-wide text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
                      "aria-[invalid=true]:border-destructive",
                    )}
                  />
                </span>
              </label>

              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick times">
                {schedulePresets(now).map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setText(formatMdyHm(p.at));
                      setError(null);
                      setDone(null);
                    }}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted transition-colors duration-150 hover:border-ring/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <p className="line-clamp-2 text-xs text-muted">
                <span className="text-foreground">Notes:</span> {draft?.releaseNotes?.trim() || "none yet"} ·{" "}
                <Link to="/releases" className="underline underline-offset-2 hover:text-foreground" onClick={() => setOpen(false)}>
                  edit
                </Link>
              </p>

              {blocked ? (
                <p className="rounded-md bg-destructive/15 px-2.5 py-2 text-xs text-destructive-foreground">
                  Push is blocked: {publishErrors[0]}
                  {publishErrors.length > 1 ? ` (+${publishErrors.length - 1} more on Releases)` : ""}
                </p>
              ) : null}
              {(armed ? overtakenNow : overtakenLater).length ? (
                <p role="alert" className="rounded-md bg-warning/15 px-2.5 py-2 text-xs text-foreground">
                  {overtakenWarning(armed ? overtakenNow : overtakenLater, releases)}
                  {earlyArmed ? " Click Schedule push again to push anyway." : ""}
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="rounded-md bg-destructive/15 px-2.5 py-2 text-xs text-destructive-foreground">
                  {error}
                </p>
              ) : null}
              {done ? (
                <p role="status" className="rounded-md bg-success/15 px-2.5 py-2 text-xs text-foreground">
                  {done}
                </p>
              ) : null}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={armed ? "danger" : "ghost"}
                  className="mr-auto h-8 gap-1.5 px-3 text-xs"
                  disabled={!canPushNow || done != null}
                  aria-live="polite"
                  title="Skip the schedule: the release goes live for everyone right away"
                  onClick={() => (armed ? void push(true) : setArmed(true))}
                >
                  <Zap aria-hidden className="size-3.5" />
                  {busy === "now" ? "Pushing…" : armed ? "Confirm push now" : "Push now"}
                </Button>
                <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setOpen(false)}>
                  {done ? "Close" : "Cancel"}
                </Button>
                <Button type="button" className="h-8 gap-1.5 px-3 text-xs" disabled={!canPush || done != null} onClick={() => void push()}>
                  <CalendarClock aria-hidden className="size-3.5" />
                  {busy === "schedule" ? "Scheduling…" : earlyArmed ? "Push anyway" : "Schedule push"}
                </Button>
              </div>
              {armed ? <p className="-mt-1 text-xs text-muted">Click again to make it live for everyone now.</p> : null}
            </div>

            {/* The line under the card, as in the Post Scheduler: when it will go out. */}
            <div id={hintId} className="border-t border-border bg-background/60 px-4 py-2.5 text-xs text-muted" aria-live="polite">
              {at == null
                ? text.length === 14
                  ? "That date or time does not exist. Check the month, day and 24-hour time."
                  : text
                    ? "Keep typing: mm/dd/yy hh:mm."
                    : "Type a time or pick one above."
                : past
                  ? "That time has passed."
                  : (
                    <>
                      Goes live <span className="text-foreground">{longTime(at)}</span> · {untilText(at, now)}
                    </>
                  )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
