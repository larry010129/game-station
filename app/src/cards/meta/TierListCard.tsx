import { memo, useEffect, useMemo, useState } from "react";
import { openLink } from "../../lib/openLink";
import { Segmented } from "../../components/Segmented";
import { Card } from "../ui";
import { pct, hotWin, useGameMeta, RoleFilter, useMetaRank, useMetaMode, RankSelect, ModeSelect, useRankStats, rankStatus, useMeta, Stamp, Portrait, Waiting, Foot } from "./shared";

type ApexFocus = "legends" | "guns";

export const TierListCard = memo(function TierListCard() {
  const { mode, pick: pickMode } = useMetaMode();
  const { game, SITE, SITE_LABEL, ROLES, cards, characters } = useGameMeta();
  const m = useMeta(mode);
  const { rank, label, pick } = useMetaRank();
  const stats = useRankStats(rank, mode);
  const [role, setRole] = useState<RoleFilter>("All");
  const [focus, setFocus] = useState<ApexFocus>("legends");
  useEffect(() => {
    setRole("All");
    setFocus("legends");
  }, [game]);
  const meta = m.meta;
  const gunTiers = meta?.gunTiers ?? [];
  const showingGuns = game === "apex" && focus === "guns";
  const legendReady = !!meta && meta.tiers.length > 0;
  const gunReady = gunTiers.length > 0;
  const ready = showingGuns ? gunReady : legendReady;

  const legendTiers = rank === "All" ? (meta?.tiers ?? []) : stats.data && !stats.data.empty ? stats.data.tiers : [];
  const tiers = showingGuns ? gunTiers : legendTiers;
  const note = showingGuns ? null : rankStatus(rank, stats.data, stats.state, legendTiers.length > 0);
  const rankBit = rank === "All" ? "all ranks" : label;

  const classFilters = useMemo(() => {
    if (!showingGuns) return ROLES;
    const classes = [...new Set(gunTiers.flatMap((t) => t.heroes.map((h) => h.role)).filter(Boolean))].sort();
    return ["All", ...classes];
  }, [showingGuns, gunTiers, ROLES]);

  useEffect(() => {
    if (!classFilters.includes(role)) setRole("All");
  }, [classFilters, role]);

  const title = showingGuns ? "Gun tier list" : cards.tierlist;
  const sub = showingGuns
    ? meta?.season
      ? `${meta.season.name} · weapons · ${mode}`
      : `Weapons · ${mode}`
    : meta?.season
      ? `${meta.season.name} · ${mode} · ${rankBit}`
      : `${mode} · ${rankBit}`;
  const modeHref = showingGuns
    ? meta?.weaponsUrl || "https://apexlegendsstatus.com/algs/weapons-meta"
    : game === "apex"
      ? SITE
      : mode === "6v6"
        ? `${SITE}/tier-list/6v6`
        : `${SITE}/tier-list`;
  const filterLabel = showingGuns ? "Class" : "Role";
  const openHref = (slug: string | null | undefined) => {
    if (showingGuns) return modeHref;
    if (game === "apex") return SITE;
    return slug ? `${SITE}/heroes/${slug}` : SITE;
  };

  return (
    <Card title={title} sub={sub} right={<Stamp m={m} />}>
      {game === "apex" && (legendReady || gunReady) && (
        <div className="mfocus" role="group" aria-label="Tier list focus">
          <span className="mfocus-label">Show</span>
          <Segmented
            label="Tier focus"
            value={focus}
            options={[
              { value: "legends", label: characters },
              { value: "guns", label: "Guns" },
            ]}
            onChange={setFocus}
          />
        </div>
      )}
      <div className="mfilters">
        <ModeSelect value={mode} onChange={pickMode} />
        {meta && ready && (
          <>
            <Segmented
              label={filterLabel}
              value={classFilters.includes(role) ? role : "All"}
              options={classFilters.map((r) => ({ value: r, label: r }))}
              onChange={setRole}
            />
            {!showingGuns && <RankSelect value={rank} onChange={pick} />}
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
                      {list.map((h) => {
                        const apexLegends = game === "apex" && !showingGuns;
                        const apexGuns = game === "apex" && showingGuns;
                        // Legends + guns both show pick/usage share from ALS; OW still shows win rate.
                        const rate = apexLegends || apexGuns ? h.pickRate : h.winRate;
                        const title = apexLegends
                          ? `${h.name}: ${pct(h.pickRate)} pick rate (ALS). Open on ${SITE_LABEL}.`
                          : apexGuns
                            ? `${h.name}: ${pct(h.pickRate)} ALGS usage share, ${pct(h.winRate)} encounter WR (ALS weaponsmeta — not pub BR). Open weapons meta.`
                            : `${h.name}: ${pct(h.winRate)} win rate, ${pct(h.pickRate)} pick rate. Open on ${SITE_LABEL}.`;
                        return (
                        <button
                          key={h.id}
                          className={`mchip${showingGuns ? " gun" : ""}`}
                          onClick={() => openLink(openHref(h.slug))}
                          title={title}
                        >
                          <Portrait hero={h} size={showingGuns ? 30 : 38} />
                          <span>{h.name}</span>
                          <small className={!apexLegends && !apexGuns && hotWin(h.winRate) ? "hi" : undefined}>{pct(rate, apexLegends || apexGuns ? 1 : 0)}</small>
                        </button>
                        );
                      })}
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
