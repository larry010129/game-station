import { BookMarked, CalendarCheck, Clock, ScrollText, Ticket, type LucideIcon } from "lucide-react";
import { CheckinBoard } from "../components/CheckinBoard";
import { BOARD_DAYS, shownClaimed } from "../state/checkinBoard";
import { checkinOpen, getContent, localStamp } from "../state/gachaContent";
import { canClaimBoard } from "../state/checkinBoard";
import { checkedInToday, useCheckinBoard } from "../state/useCheckinBoard";
import { spanText, useLang, useT, type Lang } from "../lib/i18n";
import { useQuests } from "../state/useQuests";

/** "5h 12m" / "5 小時 12 分" until a moment `ms` away. */
const span = (lang: Lang, ms: number) => spanText(lang, Math.ceil(ms / 60_000));

/** Local stamp "YYYY-MM-DDTHH:mm" to a Date. */
function fromStamp(stamp: string): Date {
  const [d, t] = stamp.split("T");
  const [y, mo, day] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new Date(y, mo - 1, day, h, mi);
}

/** One event in the Station log rail: a picture tile (the event's icon, large and faint, over an accent wash) with its
 * name along the bottom. The open event is outlined; a badge marks one that needs you. */
function RailTile({ icon: Icon, label, current = false, badge, onClick }: { icon: LucideIcon; label: string; current?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <li>
      <button type="button" className="ckp-tile" aria-current={current ? "page" : undefined} onClick={current ? undefined : onClick}>
        <Icon className="ckp-tile-art" aria-hidden="true" />
        <span className="ckp-tile-name">{label}</span>
        {badge && <span className="ckp-tile-badge">{badge}</span>}
      </button>
    </li>
  );
}

/**
 * Daily check-in as its own page. The layout borrows the pattern of a game's "login rewards" window: a title block
 * and a countdown on the right, and the seven boxes below (six in two rows, a tall Day 7).
 * The countdown is the event's end when the CMS runs the board as an event, otherwise the next local midnight,
 * when the next box opens.
 */
export function CheckinPage({ onOpenDraw, onNav }: { onOpenDraw?: () => void; onNav?: (tab: string) => void }) {
  const { now } = useQuests();
  const T = useT();
  const lang = useLang();
  const board = useCheckinBoard();
  const done = shownClaimed(board, now);
  const event = getContent().checkinEvent ?? null;
  const open = checkinOpen(now);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const countdown = !open
    ? null
    : event && localStamp(now) < event.end
      ? T("ck.eventEndsIn", { t: span(lang, fromStamp(event.end).getTime() - now.getTime()) })
      : T("ck.newDayIn", { t: span(lang, midnight.getTime() - now.getTime()) });

  const ready = canClaimBoard(board, checkedInToday(now), now, open);

  return (
    <section className="ckp" aria-label={T("ck.title")}>
      <nav className="ckp-rail" aria-label={T("ck.log")}>
        <p className="ckp-rail-title">
          <BookMarked aria-hidden="true" />
          {T("ck.log")}
        </p>
        <ol className="ckp-tiles">
          <RailTile icon={CalendarCheck} label={T("ck.tile.checkin")} current badge={ready ? T("ck.ready") : undefined} />
          {onNav && <RailTile icon={ScrollText} label={T("ck.tile.quests")} onClick={() => onNav("quests")} />}
          {onNav && <RailTile icon={Ticket} label={T("ck.tile.pass")} onClick={() => onNav("pass")} />}
        </ol>
      </nav>
      <div className="ckp-main">
        <header className="ckp-head">
          <h2>{open ? T("ck.title") : T("ck.resting")}</h2>
          <div className="ckp-meta">
            {countdown && (
              <span className="ckp-time">
                <Clock aria-hidden="true" />
                {countdown}
              </span>
            )}
            <span className="ckp-day" aria-label={T("ck.daysClaimed", { done, total: BOARD_DAYS })}>
              <strong>{done}</strong> {T("ck.daysOf", { total: BOARD_DAYS })}
            </span>
          </div>
        </header>
        <div className="ckp-panel">
          <CheckinBoard now={now} onOpenDraw={onOpenDraw} hideTitle />
        </div>
      </div>
    </section>
  );
}
