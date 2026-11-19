import type { CSSProperties } from "react";
import { BOARD_DAYS, canClaimBoard, claimedToday, shownClaimed, type CheckinPrize, type TicketKind } from "../state/checkinBoard";
import { cardPackOf, checkinOpen, checkinPrizesOf, getContent, localStamp, regionPackOn, TICKET_KINDS, TICKET_NAME, ticketFor, type PackId } from "../state/gachaContent";
import { itemFullName as itemDisplayName } from "../state/itemNames";
import { useToast } from "../state/Toast";
import { checkedInToday, claimBoardToday, useCheckinBoard } from "../state/useCheckinBoard";
import { CurrencyIcon } from "./CurrencyIcon";
import { useLang, useT, type Lang, type T as Tfn } from "../lib/i18n";

/**
 * The Draw Ticket mark: a pass on a lanyard. Regular is silver; Special is the 5-star rainbow and shows a star.
 * The drawing and its tones live in CurrencyIcon; `className` still sets the size.
 */
export function TicketMark({ kind, className = "tk-mark" }: { kind: TicketKind; className?: string }) {
  return (
    <CurrencyIcon art={`ticket-${kind}`} className={className} />
  );
}

const PACK_IDS: readonly PackId[] = ["regular", "brand", "region"];

/** "the Regular Pack", "the Brand, Region and Card packs" / 「一般、品牌與卡片卡池」: the packs that take this ticket now. */
function packsTaking(kind: TicketKind, T: Tfn): string {
  const content = getContent();
  const on = PACK_IDS.filter((p) => (p !== "region" || regionPackOn(content)) && ticketFor(p) === kind);
  const names = on.map((p) => T(`pack.${p}`));
  const cards = cardPackOf(content);
  if (cards.enabled && cards.ticket === kind) names.push(T("pack.cards"));
  if (names.length === 0) return T("pack.none");
  return names.length === 1
    ? T("pack.one", { name: names[0] })
    : T("pack.many", { names: names.slice(0, -1).join(T("pack.join")), last: names[names.length - 1] });
}

/** "2 Special Tickets", "3 Streak Freeze" / 「2 張特殊抽卡券」: what a box pays, in words. Item names stay as the catalog has them. */
const prizeText = (p: CheckinPrize, T: Tfn) =>
  p.kind === "item"
    ? T("ck.prizeItem", { n: p.count, item: itemDisplayName(p.id) })
    : T(p.count === 1 ? "ck.prizeTickets1" : "ck.prizeTickets", { n: p.count, ticket: T(`ticket.${p.kind}`, undefined, TICKET_NAME[p.kind]) });

/** An item prize on the board: a small gift box, coloured like the app accent. */
function ItemMark({ className }: { className: string }) {
  return (
    <svg className={className} data-ticket="item" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 10h15v9.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" />
      <path d="M3.5 7h17v3h-17ZM12 7v13.5" />
      <path d="M12 7c-1.5-3-5-3.2-5-1.2C7 7 9.5 7 12 7Zm0 0c1.5-3 5-3.2 5-1.2C17 7 14.5 7 12 7Z" />
    </svg>
  );
}

type BoxState = "claimed" | "ready" | "later";

/** "Mon, Dec 1, 10:00" from a local "YYYY-MM-DDTHH:mm" stamp. */
function whenText(stamp: string, lang: Lang): string {
  const [d, t] = stamp.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  return new Date(y, m - 1, day, h, min).toLocaleString(lang, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Seven boxes, one per check-in day. Opening the station checks you in; each check-in day claims the next box.
 * A missed day only pauses the board. Day 7 is the tall box and pays the most.
 */
export function CheckinBoard({ now, onOpenDraw, hideTitle = false }: { now: Date; onOpenDraw?: () => void; hideTitle?: boolean }) {
  const toast = useToast();
  const T = useT();
  const lang = useLang();
  const board = useCheckinBoard();
  const done = shownClaimed(board, now);
  const ready = canClaimBoard(board, checkedInToday(now), now, checkinOpen(now));
  const todayDone = claimedToday(board, now);
  const held = board.tickets.regular + board.tickets.special;
  // The CMS can run the board as an event. Outside it the boxes are hidden; held tickets stay usable.
  const event = getContent().checkinEvent ?? null;
  const open = checkinOpen(now);
  const upcoming = event != null && !open && localStamp(now) < event.start;
  // What each day pays (CMS). A ticket kind shows in the wallet when a box pays it or some are held.
  const prizes = checkinPrizesOf(getContent());
  const kinds = TICKET_KINDS.filter((k) => board.tickets[k] > 0 || prizes.some((p) => p.kind === k));

  const claim = () => {
    const r = claimBoardToday();
    if (!r) return;
    toast(T("ck.claimedToast", { n: r.day, prize: prizeText(r.prize, T) }));
  };

  const status = ready
    ? T("ck.statusReady", { n: done + 1 })
    : done >= BOARD_DAYS
      ? T("ck.statusAll")
      : todayDone
        ? T("ck.statusTomorrow", { n: done + 1 })
        : T("ck.statusOther");

  return (
    <div className="ck" role="group" aria-labelledby="ck-title">
      <header className="ck-head">
        <div>
          <h3 id="ck-title" className={hideTitle ? "sr-only" : undefined}>{T("ck.title")}</h3>
          {open ? (
            <p>
              {status} {T("ck.missed")}
              {event ? ` ${T("ck.eventEnds", { when: whenText(event.end, lang) })}` : ""}{" "}
              {kinds.map((k) => T("ck.drawIn", { kind: T(`ticket.short.${k}`), packs: packsTaking(k, T) })).join(lang === "en" ? "; " : "；")}
              {lang === "en" ? "." : "。"}
            </p>
          ) : (
            <p role="status">
              {upcoming ? T("ck.nextEvent", { when: whenText(event!.start, lang) }) : T("ck.noEvent")} {T("ck.stillWork")}
            </p>
          )}
        </div>
        <div className="ck-held" aria-label={T("ck.held")}>
          {kinds.map((k) => (
            <span key={k} className="ck-wallet" title={T(`ticket.${k}`, undefined, TICKET_NAME[k])}>
              <TicketMark kind={k} />
              <strong>{board.tickets[k]}</strong>
              <span>{T(`ticket.short.${k}`)}</span>
            </span>
          ))}
          {onOpenDraw && held > 0 && (
            <button type="button" className="ck-use" onClick={onOpenDraw}>
              {T("ck.useOnDraw")}
            </button>
          )}
        </div>
      </header>

      {open ? (
      <ol className="ck-grid">
        {prizes.map((prize, i) => {
          const s: BoxState = i < done ? "claimed" : i === done && ready ? "ready" : "later";
          const last = i === BOARD_DAYS - 1;
          const stateWord = s === "claimed" ? T("ck.claimed") : s === "ready" ? T("ck.readyToClaim") : T("ck.awaiting");
          const label = T("ck.boxLabel", { n: i + 1, prize: prizeText(prize, T), state: stateWord });
          const body = (
            <>
              <span className="ck-day">{T("ck.day", { n: i + 1 })}</span>
              <span className="ck-prize">
                {prize.kind === "item" ? <ItemMark className="tk-mark ck-ticket" /> : <TicketMark kind={prize.kind} className="tk-mark ck-ticket" />}
                <span className="ck-count">×{prize.count}</span>
              </span>
              <span className="ck-kind" data-ticket={prize.kind}>
                {prize.kind === "item" ? itemDisplayName(prize.id) : T(`ticket.short.${prize.kind}`)}
              </span>
              <span className="ck-state">
                {s === "claimed" ? (
                  <>
                    <svg className="ck-check" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="m3.5 8.5 3 3 6-7" />
                    </svg>
                    {T("ck.claimed")}
                  </>
                ) : s === "ready" ? (
                  T("ck.claim")
                ) : (
                  T("ck.awaiting")
                )}
              </span>
            </>
          );
          return (
            <li key={i} className={`ck-box${last ? " ck-last" : ""}`} data-state={s} style={{ "--i": i } as CSSProperties}>
              {s === "ready" ? (
                <button type="button" className="ck-hit" onClick={claim} aria-label={T("ck.claimLabel", { label })}>
                  {body}
                </button>
              ) : (
                <div className="ck-hit" aria-label={label} role="img">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      ) : null}
    </div>
  );
}
