import { memo, useState } from "react";
import { openLink } from "../../lib/openLink";
import { Segmented } from "../../components/Segmented";
import { Card } from "../ui";
import { SITE, pct, hotWin, ROLES, RoleFilter, useMetaRank, useMetaMode, RankSelect, ModeSelect, useRankStats, rankStatus, useMeta, Stamp, Portrait, Waiting, Foot } from "./shared";

export const TierListCard = memo(function TierListCard() {
  const { mode, pick: pickMode } = useMetaMode();
  const m = useMeta(mode);
  const { rank, label, pick } = useMetaRank();
  const stats = useRankStats(rank, mode);
  const [role, setRole] = useState<RoleFilter>("All");
  const meta = m.meta;
  const ready = !!meta && meta.tiers.length > 0;
  const tiers = rank === "All" ? (meta?.tiers ?? []) : stats.data && !stats.data.empty ? stats.data.tiers : [];
  const note = rankStatus(rank, stats.data, stats.state, tiers.length > 0);
  const rankBit = rank === "All" ? "all ranks" : label;
  const modeHref = mode === "6v6" ? `${SITE}/tier-list/6v6` : `${SITE}/tier-list`;
  return (
    <Card title="Hero tier list" sub={meta?.season ? `${meta.season.name} · ${mode} · ${rankBit}` : `${mode} · ${rankBit}`} right={<Stamp m={m} />}>
      <div className="mfilters">
        <ModeSelect value={mode} onChange={pickMode} />
        {meta && ready && (
          <>
            <Segmented label="Role" value={role} options={ROLES.map((r) => ({ value: r, label: r }))} onChange={setRole} />
            <RankSelect value={rank} onChange={pick} />
          </>
        )}
      </div>
      <Waiting m={m} ready={ready} />
      {meta && ready && (
        <>
          {note ? (
            <p className="mmapinfo">{note}</p>
          ) : (
          <div className="mtiers">
            {tiers.map((t) => {
              const list = t.heroes.filter((h) => role === "All" || h.role === role);
              if (!list.length) return null;
              return (
                <div key={t.tier} className="mtier">
                  <b className={`mbadge t${t.tier.toLowerCase()}`}>{t.tier}</b>
                  <div className="mchips">
                    {list.map((h) => (
                      <button
                        key={h.id}
                        className="mchip"
                        onClick={() => h.slug && openLink(`${SITE}/heroes/${h.slug}`)}
                        title={`${h.name}: ${pct(h.winRate)} win rate, ${pct(h.pickRate)} pick rate. Open on Counterwatch.`}
                      >
                        <Portrait hero={h} size={26} />
                        <span>{h.name}</span>
                        <small className={hotWin(h.winRate) ? "hi" : undefined}>{pct(h.winRate, 0)}</small>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}
          <Foot meta={meta} href={modeHref} />
        </>
      )}
    </Card>
  );
});
