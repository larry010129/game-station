import type { CSSProperties } from "react";
import { BOARD_DAYS, BOARD_PRIZES, canClaimBoard, claimedToday, shownClaimed, type TicketKind } from "../state/checkinBoard";
import { getContent, regionPackOn, TICKET_KINDS, TICKET_NAME, ticketFor, type PackId } from "../state/gachaContent";
import { useToast } from "../state/Toast";
import { checkedInToday, claimBoardToday, useCheckinBoard } from "../state/useCheckinBoard";

/**
 * The Draw Ticket mark: a ticket stub with notched sides and a perforation line. The Special Ticket adds a star on
 * the stub. Its colour comes from `data-ticket` in CSS (cool for Regular, gold for Special).
 */
export function TicketMark({ kind, className = "tk-mark" }: { kind: TicketKind; className?: string }) {
  return (
    <svg className={className} data-ticket={kind} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-2a2.5 2.5 0 0 0 0-5Z" />
      <path d="M15 6.5v2M15 11v2M15 15.5v2" />
      {kind === "special" ? <path className="tk-star" d="m9 9.2.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L6.1 11.3l2-.3Z" /> : null}
    </svg>
  );
}

const PACK_NAMES: Record<PackId, string> = { regular: "Regular", brand: "Brand", region: "Region" };

/** "the Regular Pack", "the Brand and Region packs": the packs that take this ticket now. */
function packsTaking(kind: TicketKind): string {
  const on = (Object.keys(PACK_NAMES) as PackId[]).filter((p) => (p !== "region" || regionPackOn(getContent())) && ticketFor(p) === kind);
  if (on.length === 0) return "no pack right now";
  const names = on.map((p) => PACK_NAMES[p]);
  return names.length === 1 ? `the ${names[0]} Pack` : `the ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} packs`;
}

const plural = (n: number, kind: TicketKind) => `${TICKET_NAME[kind]}${n === 1 ? "" : "s"}`;

type BoxState = "claimed" | "ready" | "later";

/**
 * Seven boxes, one per check-in day. Opening the station checks you in; each check-in day claims the next box.
 * A missed day only pauses the board. Day 7 is the tall box and pays the most.
 */
export function CheckinBoard({ now, onOpenDraw }: { now: Date; onOpenDraw?: () => void }) {
  const toast = useToast();
  const board = useCheckinBoard();
  const done = shownClaimed(board, now);
  const ready = canClaimBoard(board, checkedInToday(now), now);
  const todayDone = claimedToday(board, now);
  const held = board.tickets.regular + board.tickets.special;

  const claim = () => {
    const r = claimBoardToday();
    if (!r) return;
    toast(`Day ${r.day} claimed: +${r.count} ${plural(r.count, r.kind)}`);
  };

  const status = ready
    ? `Day ${done + 1} is ready to claim.`
    : done >= BOARD_DAYS
      ? "All 7 days claimed. The board starts again tomorrow."
      : todayDone
        ? `Day ${done + 1} opens tomorrow.`
        : "Open the station on another day to claim the next box.";

  return (
    <div className="ck" role="group" aria-labelledby="ck-title">
      <header className="ck-head">
        <div>
          <h3 id="ck-title">Daily check-in</h3>
          <p>
            {status} A missed day does not reset the board. Regular Tickets draw in {packsTaking("regular")}, Special
            Tickets in {packsTaking("special")}.
          </p>
        </div>
        <div className="ck-held" aria-label="Draw Tickets held">
          {TICKET_KINDS.map((k) => (
            <span key={k} className="ck-wallet" title={TICKET_NAME[k]}>
              <TicketMark kind={k} />
              <strong>{board.tickets[k]}</strong>
              <span>{k === "regular" ? "Regular" : "Special"}</span>
            </span>
          ))}
          {onOpenDraw && held > 0 && (
            <button type="button" className="ck-use" onClick={onOpenDraw}>
              Use on Draw
            </button>
          )}
        </div>
      </header>

      <ol className="ck-grid">
        {BOARD_PRIZES.map(({ kind, count }, i) => {
          const s: BoxState = i < done ? "claimed" : i === done && ready ? "ready" : "later";
          const last = i === BOARD_DAYS - 1;
          const label = `Day ${i + 1}, ${count} ${plural(count, kind)}, ${s === "claimed" ? "claimed" : s === "ready" ? "ready to claim" : "awaiting check-in"}`;
          const body = (
            <>
              <span className="ck-day">Day {i + 1}</span>
              <span className="ck-prize">
                <TicketMark kind={kind} className="tk-mark ck-ticket" />
                <span className="ck-count">×{count}</span>
              </span>
              <span className="ck-kind" data-ticket={kind}>
                {kind === "regular" ? "Regular" : "Special"}
              </span>
              <span className="ck-state">
                {s === "claimed" ? (
                  <>
                    <svg className="ck-check" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="m3.5 8.5 3 3 6-7" />
                    </svg>
                    Claimed
                  </>
                ) : s === "ready" ? (
                  "Claim"
                ) : (
                  "Awaiting check-in"
                )}
              </span>
            </>
          );
          return (
            <li key={i} className={`ck-box${last ? " ck-last" : ""}`} data-state={s} style={{ "--i": i } as CSSProperties}>
              {s === "ready" ? (
                <button type="button" className="ck-hit" onClick={claim} aria-label={`Claim ${label}`}>
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
    </div>
  );
}
