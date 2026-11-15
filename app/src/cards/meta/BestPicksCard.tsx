import { memo } from "react";
import { Card, Empty } from "../ui";
import { pct, hotWin, useGameMeta, useMetaMode, ModeSelect, useMeta, Stamp, Portrait, Waiting, Foot } from "./shared";

export const BestPicksCard = memo(function BestPicksCard() {
  const { mode, pick: pickMode } = useMetaMode();
  const { game, pack, SITE, cards, characters } = useGameMeta();
  const m = useMeta(mode);
  const meta = m.meta;
  const ready = !!meta && meta.picks.length > 0;
  const empty = !!meta && meta.picks.length === 0 && mode === "6v6";
  const picksHref =
    game === "apex"
      ? "https://apexlegendsstatus.com/algs/weapons-meta"
      : mode === "6v6"
        ? `${SITE}/best-onetricks/6v6`
        : `${SITE}/best-onetricks`;
  const sub =
    game === "apex"
      ? `Weapon classes players climb with · ${mode}`
      : `Strong and steady across maps · ${mode}`;
  return (
    <Card title={cards.bestpicks} sub={sub} right={<Stamp m={m} />}>
      <div className="mfilters">
        <ModeSelect value={mode} onChange={pickMode} />
      </div>
      <Waiting m={m} ready={ready || empty} />
      {empty && <Empty>No 6v6 best-pick stats loaded yet. Press reload, or check {pack.metaSiteLabel}.</Empty>}
      {meta && ready && (
        <>
          <ul className="mpicks">
            {meta.picks.map((p) =>
              p.top ? (
                <li key={p.role}>
                  <small className="mrole">{p.role}</small>
                  <div className="mtop">
                    <Portrait hero={p.top} size={40} />
                    <div>
                      <b>{p.top.name}</b>
                      <span>
                        {game === "apex" ? (
                          <>
                            <em>{pct(p.top.pickRate)}</em> ALGS usage
                          </>
                        ) : (
                          <>
                            <em className={hotWin(p.top.winRate) ? "hi" : undefined}>{pct(p.top.winRate)}</em> win rate
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  {p.top.why && p.top.why.length > 0 && <p className="mwhy">{p.top.why.join(" · ")}</p>}
                  {p.others.length > 0 && <p className="mothers">Also good: {p.others.map((o) => o.name).join(", ")}</p>}
                </li>
              ) : null,
            )}
          </ul>
          {game === "apex" && (
            <p className="mfoot">
              ALGS usage by weapon class (ALS weaponsmeta) · same shell as {characters.toLowerCase()} role picks on Overwatch.
            </p>
          )}
          <Foot meta={meta} href={picksHref} />
        </>
      )}
    </Card>
  );
});
