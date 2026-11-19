import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, Gem, House, ListChecks, Medal, Sparkles, type LucideIcon } from "lucide-react";
import { ACHIEVEMENTS, CATEGORIES, categoryTally, progressOf, tierTally, type AchievementCategory, type Tier } from "../state/achievements";
import { useAchievements } from "../state/useAchievements";

const ICON: Record<AchievementCategory, LucideIcon> = { play: Clock, tasks: ListChecks, draw: Sparkles, collection: Gem, station: House };
const TIER_NAME: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
const TIERS: readonly Tier[] = ["gold", "silver", "bronze"];
const dateOf = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/**
 * Achievements: a row of category plaques (the chosen one lifted to the front), a medal tally, and the chosen
 * category's milestones with how far along each one is.
 */
export function AchievementsPage() {
  const { state, snap } = useAchievements();
  const [cat, setCat] = useState<AchievementCategory>(CATEGORIES[0].id);
  const plaques = useRef<(HTMLButtonElement | null)[]>([]);
  const headingId = useId();
  const tabBase = useId();
  const tally = tierTally(state);
  const total = Object.values(state.unlocked).length;
  const index = CATEGORIES.findIndex((c) => c.id === cat);

  const choose = (i: number, focus = false) => {
    const c = CATEGORIES[(i + CATEGORIES.length) % CATEGORIES.length];
    setCat(c.id);
    const el = plaques.current[CATEGORIES.indexOf(c)];
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    if (focus) el?.focus({ preventScroll: true });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") choose(index + 1, true);
    else if (e.key === "ArrowLeft") choose(index - 1, true);
    else if (e.key === "Home") choose(0, true);
    else if (e.key === "End") choose(CATEGORIES.length - 1, true);
    else return;
    e.preventDefault();
  };

  const list = ACHIEVEMENTS.filter((a) => a.category === cat)
    .map((a) => ({ a, at: state.unlocked[a.id], p: progressOf(a, snap) }))
    // Unlocked first (newest first), then the closest to done.
    .sort((x, y) => (x.at && y.at ? y.at - x.at : x.at ? -1 : y.at ? 1 : y.p.share - x.p.share));
  const meta = CATEGORIES[index];

  return (
    <section className="ach" aria-labelledby={headingId}>
      <header className="ach-head">
        <h2 id={headingId}>Achievements</h2>
        <p>
          {total} of {ACHIEVEMENTS.length} unlocked
        </p>
      </header>

      <div className="ach-stage">
        <button type="button" className="ach-nav" aria-label="Previous category" onClick={() => choose(index - 1)}>
          <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
        </button>
        <div className="ach-plaques" role="tablist" aria-label="Categories" onKeyDown={onKey}>
          {CATEGORIES.map((c, i) => {
            const Icon = ICON[c.id];
            const t = categoryTally(state, c.id);
            return (
              <button
                key={c.id}
                ref={(el) => {
                  plaques.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${tabBase}-${c.id}`}
                aria-selected={c.id === cat}
                tabIndex={c.id === cat ? 0 : -1}
                className="ach-plaque"
                data-done={t.have === t.of || undefined}
                onClick={() => choose(i)}
              >
                <span className="ach-crest" aria-hidden="true">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" />
                    <circle cx="50" cy="50" r="34" />
                  </svg>
                  <Icon strokeWidth={1.3} />
                </span>
                <span className="ach-plaque-count">
                  {t.have}/{t.of}
                </span>
                <span className="ach-plaque-name">{c.name}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="ach-nav" aria-label="Next category" onClick={() => choose(index + 1)}>
          <ChevronRight aria-hidden="true" strokeWidth={1.5} />
        </button>
      </div>

      <div className="ach-tally" aria-label="Medals">
        <span>Achievements unlocked</span>
        <b>{total}</b>
        {TIERS.map((t) => (
          <span key={t} className="ach-medal" data-tier={t}>
            <Medal aria-hidden="true" strokeWidth={1.6} />
            <span className="ach-sr">{TIER_NAME[t]}</span>
            {tally[t]}
          </span>
        ))}
      </div>

      <div className="ach-list-wrap" role="tabpanel" aria-labelledby={`${tabBase}-${cat}`}>
        <p className="ach-blurb">{meta.blurb}</p>
        <ul className="ach-list">
          {list.map(({ a, at, p }) => (
            <li key={a.id} className="ach-row" data-done={at ? true : undefined}>
              <span className="ach-row-medal" data-tier={a.tier} aria-label={TIER_NAME[a.tier]} role="img">
                {at ? <Check aria-hidden="true" strokeWidth={2.2} /> : <Medal aria-hidden="true" strokeWidth={1.6} />}
              </span>
              <span className="ach-row-text">
                <b>{a.name}</b>
                <small>{a.how}</small>
              </span>
              {at ? (
                <span className="ach-row-when">Unlocked {dateOf(at)}</span>
              ) : (
                <span className="ach-row-prog">
                  <span className="ach-bar" aria-hidden="true">
                    <i style={{ inlineSize: `${p.share * 100}%` }} />
                  </span>
                  <small>
                    {p.have} / {a.target}
                  </small>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
