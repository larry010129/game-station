import { useEffect, useId, useRef } from "react";
import { Check, Gift, Lock, Sparkles } from "lucide-react";
import { CreditIcon } from "../components/CreditIcon";
import { SkinSample } from "../components/SkinSample";
import { cardSkinById } from "../state/cardSkins";
import { itemById, TICKET_NAME } from "../state/gachaContent";
import { ITEM_ICON, itemFullName } from "../state/itemFace";
import {
  canClaim,
  claimable,
  FEATURED_SKIN,
  LEVELS,
  levelOf,
  PASS_LEVELS,
  seasonAt,
  timeLeft,
  WEEKLY_CAP,
  type PassReward,
  type PassRow,
} from "../state/seasonPass";
import { useSeasonPass } from "../state/useSeasonPass";
import { useToast } from "../state/Toast";
import { usePerks } from "../state/perkStore";
import { TicketMark } from "../components/CheckinBoard";


export function rewardName(r: PassReward): string {
  switch (r.kind) {
    case "credits":
      return `${r.n} Income`;
    case "ticket":
      return `${r.n} ${TICKET_NAME[r.ticket]}${r.n > 1 ? "s" : ""}`;
    case "item":
      return r.n > 1 ? `${r.n} × ${itemFullName(r.id)}` : itemFullName(r.id);
    case "skin":
      return `${cardSkinById(r.id)?.name ?? r.id} card skin`;
  }
}

function RewardArt({ r }: { r: PassReward }) {
  if (r.kind === "skin")
    return (
      <span
        className="pass-art skin-swatch skin-swatch-mini"
        data-skin={r.id}
      />
    );
  if (r.kind === "ticket")
    return (
      <span className="pass-art" data-kind="ticket">
        <TicketMark kind={r.ticket} className="tk-mark pass-tk" />
      </span>
    );
  if (r.kind === "credits")
    return (
      <span className="pass-art" data-kind="credits">
        <CreditIcon gain={r.n} className="" />
      </span>
    );
  const Icon = ITEM_ICON[itemById(r.id)?.kind ?? "wallpaper"];
  return (
    <span className="pass-art" data-kind={r.kind}>
      <Icon strokeWidth={1.4} />
    </span>
  );
}

/**
 * The Season Pass: the level badge, time left and XP up top; a track of levels, each with a Free and a Patreon
 * reward; and the last Patreon reward on show beside it. Levels come from play and quests only; none can be bought.
 */
export function PassPage({ onNav }: { onNav: (tab: string) => void }) {
  const { state, patron, claim, claimAll } = useSeasonPass();
  const perks = usePerks();
  const weeklyCap = WEEKLY_CAP + perks.effects.passCapBonus;
  /** 45, or 60 once any Season Key is taken in the perk tree. */
  const levelCap = perks.effects.passLevelCap;
  const openPerks = () => onNav("perks");
  const toast = useToast();
  const now = new Date();
  const season = seasonAt(now);
  const { level, into, need } = levelOf(state.xp);
  const open = claimable(state, patron);
  const headingId = useId();
  const track = useRef<HTMLDivElement>(null);

  // Start the track at the current level.
  useEffect(() => {
    const el = track.current?.querySelector<HTMLElement>(
      `[data-level="${Math.max(1, level)}"]`,
    );
    if (el && track.current)
      track.current.scrollLeft = el.offsetLeft - track.current.clientWidth / 3;
  }, [level]);

  const onClaim = (lv: number, row: PassRow, r: PassReward) => {
    if (claim(lv, row)) toast(`Claimed: ${rewardName(r)}`);
    else toast("That reward could not be claimed. Try again.", { alert: true });
  };
  const onClaimAll = () => {
    const n = claimAll();
    toast(n === 1 ? "Claimed 1 reward" : `Claimed ${n} rewards`);
  };

  const featured = cardSkinById(FEATURED_SKIN);

  return (
    <section className="pass" aria-labelledby={headingId}>
      <header className="pass-head">
        <span className="pass-badge" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" />
            <circle cx="50" cy="50" r="38" />
          </svg>
          <b>{level}</b>
        </span>
        <div className="pass-meta">
          <h2 id={headingId}>
            Season Pass <span>Season {season.number}</span>
          </h2>
          <p className="pass-ends">Ends in {timeLeft(now, season.end)}</p>
          <div className="pass-xp">
            <span
              className="pass-bar"
              role="progressbar"
              aria-label="XP to the next level"
              aria-valuemin={0}
              aria-valuemax={need}
              aria-valuenow={into}
            >
              <i style={{ inlineSize: `${(100 * into) / need}%` }} />
            </span>
            <span className="pass-nums">
              {level >= LEVELS
                ? "Max level"
                : level >= levelCap
                  ? `Level ${levelCap} cap`
                  : `${into}/${need} XP`}
              <small>
                Weekly XP {state.weekXp}/{weeklyCap}
              </small>
            </span>
          </div>
        </div>
        <div className="pass-actions">
          <button
            type="button"
            className="pass-claim-all"
            disabled={!open.length}
            onClick={onClaimAll}
          >
            {open.length ? `Claim all (${open.length})` : "Nothing to claim"}
          </button>
          <button
            type="button"
            className="eb-btn"
            onClick={() => onNav("quests")}
          >
            Earn XP in Quests
          </button>
        </div>
      </header>

      {levelCap < LEVELS && (
        <p className="pass-cap" data-hit={level >= levelCap || undefined}>
          <Lock aria-hidden="true" strokeWidth={1.8} />
          <span>
            {level >= levelCap
              ? `You've reached level ${levelCap}. `
              : `The pass stops at level ${levelCap}. `}
            Take a <b>Season Key</b> in the perk tree to open levels{" "}
            {levelCap + 1} to {LEVELS}. Every class has one.
          </span>
          <button type="button" className="eb-btn" onClick={openPerks}>
            Open Perks
          </button>
        </p>
      )}

      <div className="pass-body">
        <div className="pass-board">
          <div className="pass-rows" aria-hidden="true">
            <span className="pass-rowname">
              <Gift strokeWidth={1.3} />
              Free
            </span>
            <span className="pass-rowname" data-locked={!patron || undefined}>
              {patron ? (
                <Sparkles strokeWidth={1.3} />
              ) : (
                <Lock strokeWidth={1.3} />
              )}
              Patreon
            </span>
          </div>
          <div
            className="pass-track"
            ref={track}
            role="list"
            aria-label="Pass levels"
          >
            {PASS_LEVELS.map((l) => {
              const reached = l.level <= level;
              const sealed = l.level > levelCap;
              return (
                <div
                  key={l.level}
                  role="listitem"
                  className="pass-col"
                  data-level={l.level}
                  data-reached={reached || undefined}
                  data-current={l.level === level || undefined}
                  data-sealed={sealed || undefined}
                >
                  <span
                    className="pass-lv"
                    title={
                      sealed
                        ? "Needs a Season Key from the perk tree"
                        : undefined
                    }
                  >
                    {sealed && <Lock aria-hidden="true" strokeWidth={2} />}Lv.{" "}
                    {l.level}
                  </span>
                  {(["free", "patron"] as const).map((row) => {
                    const r = row === "free" ? l.free : l.patron;
                    const done = state.claimed[row].includes(l.level);
                    const can = canClaim(state, l.level, row, patron);
                    const locked = row === "patron" && !patron;
                    const name = rewardName(r);
                    return (
                      <button
                        key={row}
                        type="button"
                        className="pass-tile"
                        data-row={row}
                        data-state={
                          done
                            ? "done"
                            : can
                              ? "ready"
                              : locked
                                ? "locked"
                                : reached
                                  ? "reached"
                                  : "ahead"
                        }
                        disabled={!can}
                        title={name}
                        aria-label={`Level ${l.level} ${row === "free" ? "Free" : "Patreon"}: ${name}${done ? ", claimed" : can ? ", claim" : sealed ? ", needs a Season Key from the perk tree" : locked ? ", Patreon only" : reached ? "" : ", not reached"}`}
                        onClick={() => onClaim(l.level, row, r)}
                      >
                        <RewardArt r={r} />
                        <span className="pass-n">
                          {r.kind === "credits" || r.kind === "ticket"
                            ? r.n
                            : r.kind === "item" && r.n > 1
                              ? r.n
                              : ""}
                        </span>
                        {done && (
                          <Check
                            className="pass-mark"
                            aria-hidden="true"
                            strokeWidth={2.4}
                          />
                        )}
                        {locked && !done && (
                          <Lock
                            className="pass-mark"
                            aria-hidden="true"
                            strokeWidth={2}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="pass-featured" aria-label="Top Patreon reward">
          <span className="pass-feat-lv">Level {LEVELS} · Patreon</span>
          <div className="pass-feat-card">
            <SkinSample id={FEATURED_SKIN} />
          </div>
          <b>{featured?.name ?? FEATURED_SKIN}</b>
          <small>{featured?.blurb}</small>
          {!patron && (
            <button
              type="button"
              className="pass-unlock"
              onClick={() => onNav("buy-credits")}
            >
              Unlock the Patreon row
            </button>
          )}
        </aside>
      </div>

      <p className="pass-rules">
        Each counted minute of play earns 10 XP and each claimed quest 100 XP,
        up to {weeklyCap.toLocaleString()} XP a week. Levels cannot be bought.
        Rewards not claimed by the end of the season are gone.
      </p>
    </section>
  );
}
