import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, CalendarCheck, Check, Clock } from "lucide-react";
import { CreditBalance, CreditIcon } from "../components/CreditIcon";
import { useToast } from "../state/Toast";
import { formatCredits, useStationCredits } from "../state/stationCredits";
import {
  canClaim,
  isClaimed,
  INCOME_PER_HOUR,
  isComplete,
  nextReset,
  progress,
  visibleQuests,
  type Period,
  type QuestDef,
  type QuestState,
} from "../state/questEngine";
import { claimQuest, useQuests } from "../state/useQuests";
import { usePerks } from "../state/perkStore";
import { useCheckinReady } from "../state/useCheckinBoard";
import { spanText, useLang, useT, type Lang } from "../lib/i18n";

/**
 * Quests, laid out after a game's pass "Missions" window (layout only): the periods as tabs down the left, each with
 * its reset time and how many quests are ready; a Payroll strip across the top with today's progress and Claim all;
 * and one wide row per quest with its progress, its pay and an action column (Claim, Go, or done).
 */

const PERIODS: { period: Period }[] = [{ period: "daily" }, { period: "weekly" }, { period: "monthly" }, { period: "once" }];

/** Where a quest's "Go" button leads, for quests the player finishes by doing something in another place. */
function goTo(q: QuestDef): string | null {
  if (q.metric === "armed") return "gamemode";
  if (q.metric !== "event") return null;
  if (q.event === "calendar") return "calendar";
  if (q.event === "vault") return "vault";
  return "themes";
}

/** "5h 12m" / "5 小時 12 分": how long until a period resets. */
function resetIn(period: Period, now: Date, lang: Lang): string | null {
  const at = nextReset(period, now);
  if (!at) return null;
  return spanText(lang, Math.max(1, Math.round((at.getTime() - now.getTime()) / 60_000)));
}

function QuestRow({
  q,
  state,
  now,
  onNav,
  onOpenThemes,
}: {
  q: QuestDef;
  state: QuestState;
  now: Date;
  onNav?: (tab: string) => void;
  onOpenThemes?: () => void;
}) {
  const toast = useToast();
  const T = useT();
  const got = progress(state, q, now);
  const shown = Math.min(got, q.target);
  const done = isComplete(state, q, now);
  const paid = isClaimed(state, q, now);
  const unit = q.metric === "minutes" ? T("q.unitMin") : "";
  const look = q.id === "weeklook";
  const go = !done ? goTo(q) : null;
  const status = paid ? "paid" : done ? "ready" : "open";

  const claim = () => {
    const credits = claimQuest(q.id);
    if (credits == null) return;
    toast(look ? T("q.pickEarned") : `+${formatCredits(credits)}`);
  };

  return (
    <li className="qs-row" data-state={status}>
      <div className="qs-text">
        <strong>{T(`quest.${q.id}.title`, undefined, q.title)}</strong>
        <span className="qs-blurb">{T(`quest.${q.id}.blurb`, undefined, q.blurb)}</span>
        <span className="qs-prog">
          <span className="qs-bar" aria-hidden="true">
            <i style={{ width: `${(shown / q.target) * 100}%` }} />
          </span>
          <span className="qs-count" aria-label={T("q.progress", { a: shown, b: q.target, unit })}>
            {shown} / {q.target}
            {unit}
          </span>
        </span>
        {look && state.looksWaiting > 0 && onOpenThemes && (
          <button type="button" className="qs-link" onClick={onOpenThemes}>
            {state.looksWaiting === 1 ? T("q.pickOne") : T("q.pickMany", { n: state.looksWaiting })}
          </button>
        )}
      </div>

      <span className="qs-pay" aria-label={look ? T("q.paysPick") : T("q.paysIncome", { n: q.credits })}>
        {look ? (
          <span className="qs-pay-word">{T("q.themePick")}</span>
        ) : (
          <>
            <CreditIcon gain={q.credits} className="qs-pay-ic" />
            <span className="qs-pay-num">{q.credits}</span>
          </>
        )}
      </span>

      <span className="qs-act">
        {paid ? (
          <span className="qs-done" title={T("q.claimed")}>
            <Check aria-hidden="true" />
            <span className="qs-sr">{T("q.claimed")}</span>
          </span>
        ) : done ? (
          <button type="button" className="qs-claim" onClick={claim}>
            {T("q.claim")}
          </button>
        ) : go && onNav ? (
          <button type="button" className="qs-go" onClick={() => onNav(go)}>
            {T(`q.go.${go}`)}
            <ArrowRight aria-hidden="true" />
          </button>
        ) : (
          <span className="qs-wait">{T("q.inProgress")}</span>
        )}
      </span>
    </li>
  );
}

/** Quests: what each earns, how far along it is, and an explicit Claim. Progress resets on a schedule; a claim pays once. */
export function QuestsPage({ onOpenThemes, onOpenCheckin, onNav }: { onOpenThemes?: () => void; onOpenCheckin?: () => void; onNav?: (tab: string) => void }) {
  const toast = useToast();
  const T = useT();
  const lang = useLang();
  const { state, now } = useQuests();
  const balance = useStationCredits();
  const perkBonus = usePerks().effects.creditsPerHour;
  const checkinReady = useCheckinReady();

  const lists = useMemo(() => PERIODS.map((p) => ({ ...p, quests: visibleQuests(p.period) })).filter((p) => p.quests.length > 0), []);
  const ready = (qs: readonly QuestDef[]) => qs.filter((q) => canClaim(state, q, now));
  const allReady = lists.flatMap((p) => ready(p.quests));

  // Opens on the first period with something to claim, else Today.
  const [tab, setTab] = useState<Period>(() => lists.find((p) => ready(p.quests).length > 0)?.period ?? "daily");
  const current = lists.find((p) => p.period === tab) ?? lists[0];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const today = lists.find((p) => p.period === "daily")?.quests ?? [];
  const todayPaid = today.filter((q) => isClaimed(state, q, now)).length;

  const claimAll = () => {
    let income = 0;
    let picks = 0;
    for (const q of allReady) {
      const got = claimQuest(q.id);
      if (got == null) continue;
      if (q.id === "weeklook") picks += 1;
      else income += got;
    }
    if (income || picks) toast([income ? `+${formatCredits(income)}` : "", picks ? T("q.pickEarnedShort") : ""].filter(Boolean).join(" · "));
  };

  // Up and Down move between the period tabs (Left and Right too, for the row form on narrow screens).
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + lists.length) % lists.length;
    setTab(lists[next].period);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="qs" aria-label={T("q.title")}>
      <header className="qs-head">
        <h2>{T("q.title")}</h2>
        <p>{T("q.intro")}</p>
      </header>

      <div className="qs-strip" role="group" aria-label={T("q.payroll")}>
        <div className="qs-rate">
          <span className="qs-rate-num">{INCOME_PER_HOUR + perkBonus}</span>
          <span className="qs-rate-unit">
            {T("q.perHour")}
            {perkBonus ? <small>{T("q.fromPerks", { n: perkBonus })}</small> : null}
          </span>
        </div>
        <div className="qs-today">
          <span className="qs-today-line">
            <span>{T("q.today")}</span>
            <span className="qs-today-num">{T("q.claimedOf", { a: todayPaid, b: today.length })}</span>
          </span>
          <span className="qs-bar qs-bar-wide" aria-hidden="true">
            <i style={{ width: `${today.length ? (todayPaid / today.length) * 100 : 0}%` }} />
          </span>
          <span className="qs-balance">
            {T("q.balance")} <CreditBalance amount={balance} />
          </span>
        </div>
        <button type="button" className="qs-claim-all" onClick={claimAll} disabled={allReady.length === 0}>
          {allReady.length ? T("q.claimAll", { n: allReady.length }) : T("q.nothing")}
        </button>
      </div>

      <div className="qs-board">
        <div className="qs-rail">
          <div role="tablist" aria-label={T("q.periods")} aria-orientation="vertical" className="qs-tabs">
            {lists.map((p, i) => {
              const n = ready(p.quests).length;
              const reset = resetIn(p.period, now, lang);
              const selected = p.period === current.period;
              return (
                <button
                  key={p.period}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`qs-tab-${p.period}`}
                  aria-selected={selected}
                  aria-controls="qs-panel"
                  tabIndex={selected ? 0 : -1}
                  className="qs-tab"
                  onClick={() => setTab(p.period)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  <span className="qs-tab-name">{T(`q.period.${p.period}`)}</span>
                  {reset && (
                    <span className="qs-tab-reset">
                      <Clock aria-hidden="true" />
                      {reset}
                    </span>
                  )}
                  {n > 0 && (
                    <span className="qs-tab-badge" aria-label={T("q.readyCount", { n })}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {onOpenCheckin && (
            <button type="button" className="qs-tab qs-tab-link" onClick={onOpenCheckin}>
              <span className="qs-tab-name">
                <CalendarCheck aria-hidden="true" />
                {T("q.checkin")}
              </span>
              <span className="qs-tab-reset">{checkinReady ? T("q.checkinReady") : T("q.checkinOwn")}</span>
              {checkinReady && <span className="qs-tab-badge qs-tab-dot" aria-hidden="true" />}
            </button>
          )}
        </div>

        <div className="qs-panel" role="tabpanel" id="qs-panel" aria-labelledby={`qs-tab-${current.period}`}>
          <ul className="qs-list">
            {current.quests.map((q) => (
              <QuestRow key={q.id} q={q} state={state} now={now} onNav={onNav} onOpenThemes={onOpenThemes} />
            ))}
          </ul>
        </div>
      </div>

      <p className="qs-note">{T("q.note")}</p>
    </section>
  );
}
