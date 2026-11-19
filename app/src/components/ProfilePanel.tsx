import { useEffect, useId, useRef, type CSSProperties } from "react";
import { BookOpen, CalendarCheck, CalendarDays, GitFork, Newspaper, Palette, ScrollText, Settings, Sparkles, Ticket, Trophy, X, type LucideIcon } from "lucide-react";
import { useQuests } from "../state/useQuests";
import { useStationCredits } from "../state/stationCredits";
import { CreditBalance } from "./CreditIcon";
import { hoursLabel, initialsOf } from "../state/profile";

/** The player's monogram in rings. */
export function ProfileEmblem({ name, size = 64 }: { name: string; size?: number }) {
  return (
    <span className="pf-emblem" style={{ "--s": `${size}px` } as CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <circle className="pf-emblem-track" cx="50" cy="50" r="47" />
        <circle className="pf-emblem-core" cx="50" cy="50" r="38" />
      </svg>
      <b>{initialsOf(name)}</b>
    </span>
  );
}

const SHORTCUTS: readonly { id: string; label: string; icon: LucideIcon }[] = [
  { id: "news", label: "News", icon: Newspaper },
  { id: "quests", label: "Quests", icon: ScrollText },
  { id: "checkin", label: "Check-in", icon: CalendarCheck },
  { id: "pass", label: "Pass", icon: Ticket },
  { id: "perks", label: "Perks", icon: GitFork },
  { id: "draw", label: "Draw", icon: Sparkles },
  { id: "wiki", label: "Wiki", icon: BookOpen },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "vault", label: "Vault", icon: Settings },
  { id: "achievements", label: "Achievements", icon: Trophy },
];

/**
 * The profile panel: who you are on this station, your totals, and a shortcut to every page. It slides
 * in from the right; a click outside, Escape or the close button puts it away.
 */
export function ProfilePanel({ displayName, newsUnread, onNav, onClose }: { displayName: string; newsUnread: number; onNav: (tab: string) => void; onClose: () => void }) {
  const { state } = useQuests();
  const credits = useStationCredits();
  const name = displayName.trim();
  const headingId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      before?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  const go = (tab: string) => {
    onClose();
    onNav(tab);
  };

  return (
    <div className="pf-scrim" onClick={onClose}>
      <div className="pf-panel" role="dialog" aria-modal="true" aria-labelledby={headingId} ref={panel} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <header className="pf-head">
          <ProfileEmblem name={name} />
          <div className="pf-who">
            <h2 id={headingId} className={name ? undefined : "pf-noname"}>
              {name || "No name yet"}
            </h2>
          </div>
          <button type="button" className="pf-x" aria-label="Close profile" onClick={onClose}>
            <X aria-hidden="true" strokeWidth={1.5} />
          </button>
        </header>

        <dl className="pf-stats">
          <div>
            <dt>Balance</dt>
            <dd>
              <CreditBalance amount={credits} bare />
            </dd>
          </div>
          <div>
            <dt>Counted time</dt>
            <dd>{hoursLabel(state.minutesTotal)}</dd>
          </div>
          <div>
            <dt>Tasks claimed</dt>
            <dd>{state.tasksClaimed}</dd>
          </div>
        </dl>

        <nav className="pf-grid" aria-label="Go to">
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            const count = s.id === "news" ? newsUnread : 0;
            return (
              <button key={s.id} type="button" className="pf-tile" onClick={() => go(s.id)}>
                <Icon aria-hidden="true" strokeWidth={1.4} />
                <span>{s.label}</span>
                {count > 0 && (
                  <span className="pf-tile-count" aria-label={`${count} unread`}>
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <footer className="pf-foot">
          <button type="button" className="pf-primary" onClick={() => go("profile")}>
            Open profile
          </button>
          {!name && (
            <button type="button" className="eb-btn" onClick={() => go("vault")}>
              Set your name
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
