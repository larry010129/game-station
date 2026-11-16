import { CheckinBoard } from "../components/CheckinBoard";
import { useToast } from "../state/Toast";
import { formatCredits, useStationCredits } from "../state/stationCredits";
import {
  isClaimed,
  isComplete,
  nextRank,
  nextReset,
  progress,
  rankOf,
  visibleQuests,
  type Period,
  type QuestDef,
  type QuestState,
} from "../state/questEngine";
import { claimQuest, useQuests } from "../state/useQuests";

const SECTIONS: { period: Period; title: string }[] = [
  { period: "daily", title: "Daily" },
  { period: "weekly", title: "Weekly" },
  { period: "monthly", title: "Monthly" },
  { period: "once", title: "One-time" },
];

/** "5 h 12 min", "2 days", "40 min": how long until a period resets. */
function resetIn(period: Period, now: Date): string | null {
  const at = nextReset(period, now);
  if (!at) return null;
  const min = Math.max(1, Math.round((at.getTime() - now.getTime()) / 60_000));
  if (min >= 2 * 24 * 60) return `${Math.floor(min / (24 * 60))} days`;
  if (min >= 60) return `${Math.floor(min / 60)} h ${min % 60} min`;
  return `${min} min`;
}

const perHour = (perCredit: number) => Math.round(60 / perCredit);

function Row({ q, state, now, onOpenThemes }: { q: QuestDef; state: QuestState; now: Date; onOpenThemes?: () => void }) {
  const toast = useToast();
  const got = progress(state, q, now);
  const shown = Math.min(got, q.target);
  const done = isComplete(state, q, now);
  const paid = isClaimed(state, q, now);
  const unit = q.metric === "minutes" ? " min" : "";
  const look = q.id === "weeklook";

  const claim = () => {
    const credits = claimQuest(q.id);
    if (credits == null) return;
    toast(look ? "Look pick earned. Choose it on the Themes page." : `+${formatCredits(credits)}`);
  };

  return (
    <li className="q-row" data-state={paid ? "paid" : done ? "ready" : "open"}>
      <div className="q-main">
        <strong>{q.title}</strong>
        <span>{q.blurb}</span>
      </div>
      <span className="q-prog" aria-label={`Progress ${shown} of ${q.target}${unit}`}>
        {q.target > 1 ? (
          <>
            <span className="q-bar" aria-hidden="true">
              <i style={{ width: `${(shown / q.target) * 100}%` }} />
            </span>
            {shown} / {q.target}
            {unit}
          </>
        ) : done ? (
          "Done"
        ) : (
          "Not yet"
        )}
      </span>
      <span className="q-pay">{look ? "Look pick" : `+${q.credits}`}</span>
      {paid ? (
        <span className="q-done">Claimed</span>
      ) : (
        <button type="button" className={`pill-btn q-claim${done ? " ready" : ""}`} disabled={!done} onClick={claim}>
          Claim
        </button>
      )}
      {look && state.looksWaiting > 0 && onOpenThemes && (
        <button type="button" className="q-pick" onClick={onOpenThemes}>
          {state.looksWaiting === 1 ? "1 look pick waiting. Choose it" : `${state.looksWaiting} look picks waiting. Choose one`}
        </button>
      )}
    </li>
  );
}

/** Quests: what each earns, how far along it is, and an explicit Claim. Progress resets on a schedule; a claim pays once. */
export function QuestsPage({ onOpenThemes, onOpenDraw }: { onOpenThemes?: () => void; onOpenDraw?: () => void }) {
  const { state, now } = useQuests();
  const balance = useStationCredits();
  const rank = rankOf(state);
  const next = nextRank(rank);

  return (
    <section className="quests" aria-label="Quests">
      <header className="quests-head">
        <h2>Quests</h2>
        <p>Credits are earned on this PC by using the station. Claim a finished quest to be paid once.</p>
      </header>

      <div className="q-rank" role="group" aria-label="Rank">
        <div>
          <strong>{rank.name}</strong>
          <span>
            {perHour(rank.perCredit)} Credits per counted hour · balance {formatCredits(balance)}
          </span>
        </div>
        {next ? (
          <p>
            Next, {next.name}: {Math.min(state.minutesTotal, next.minutes)} of {next.minutes} counted minutes and {Math.min(state.tasksClaimed, next.tasks)} of {next.tasks} claimed tasks
          </p>
        ) : (
          <p>Top rank reached.</p>
        )}
      </div>

      <CheckinBoard now={now} onOpenDraw={onOpenDraw} />

      {SECTIONS.map(({ period, title }) => {
        const list = visibleQuests(state, period);
        if (!list.length) return null;
        const reset = resetIn(period, now);
        return (
          <div className="q-section" key={period}>
            <header>
              <h3>{title}</h3>
              {reset && <small>Resets in {reset}</small>}
            </header>
            <ul>
              {list.map((q) => (
                <Row key={q.id} q={q} state={state} now={now} onOpenThemes={onOpenThemes} />
              ))}
            </ul>
          </div>
        );
      })}

      <p className="q-note">A counted minute is a minute while a watched game is running. A session under 60 seconds adds nothing.</p>
    </section>
  );
}
