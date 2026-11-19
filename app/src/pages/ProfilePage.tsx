import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { CreditBalance } from "../components/CreditIcon";
import { IdCard, Shirt } from "lucide-react";
import { readJson } from "../lib/storage";
import { LookCard } from "../components/LookCard";
import { ProfileEmblem } from "../components/ProfilePanel";
import { SkinSample } from "../components/SkinSample";
import { CARD_SKINS, cardSkinById } from "../state/cardSkins";
import { useCardSkins } from "../state/cardSkinStore";
import { cleanGacha } from "../state/gachaEngine";
import { readItems } from "../state/items";
import type { ThemeDef } from "../state/palette";
import { checkinDays, hoursLabel, PROFILE_SECTION_KEY } from "../state/profile";
import { useStationCredits } from "../state/stationCredits";
import { INCOME_PER_HOUR } from "../state/questEngine";
import { useQuests } from "../state/useQuests";
import { useWidgetLock } from "../state/widgetStore";
import { ACHIEVEMENTS } from "../state/achievements";
import { useAchievements } from "../state/useAchievements";
import { usePerks } from "../state/perkStore";
import { WIDGET_IDS } from "../state/widgets";

type Section = "details" | "equipped";
const SECTIONS: readonly { id: Section; label: string; icon: typeof IdCard }[] =
  [
    { id: "details", label: "Details", icon: IdCard },
    { id: "equipped", label: "Equipped", icon: Shirt },
  ];

/**
 * The profile page: sections down the left, your station card in the middle (wearing your card skin), and the
 * chosen section's numbers on the right.
 */
export function ProfilePage({
  displayName,
  look,
  unlocked,
  onNav,
}: {
  displayName: string;
  look: ThemeDef;
  unlocked: number;
  onNav: (tab: string) => void;
}) {
  // Another page can ask to open a section.
  const [section, setSection] = useState<Section>(() => {
    try {
      const want = sessionStorage.getItem(PROFILE_SECTION_KEY);
      if (want === "equipped") return want;
    } catch {
      // Storage blocked: start on Details.
    }
    return "details";
  });
  // The request is used once. Cleared after mounting, not while reading it (dev mode reads state twice).
  useEffect(() => {
    try {
      sessionStorage.removeItem(PROFILE_SECTION_KEY);
    } catch {
      // Nothing to clear.
    }
  }, []);
  const { state } = useQuests();
  const credits = useStationCredits();
  const skins = useCardSkins();
  const achievements = useAchievements();
  const perks = usePerks();
  const isLocked = useWidgetLock();
  const usableCards = WIDGET_IDS.filter((id) => !isLocked(id)).length;
  const gacha = useMemo(
    () => cleanGacha(readJson<unknown>("cs.gacha", null)),
    [],
  );
  const items = useMemo(readItems, []);
  const name = displayName.trim();
  const headingId = useId();
  const skin = skins.equipped ? cardSkinById(skins.equipped) : undefined;

  return (
    <section className="pfp" aria-labelledby={headingId}>
      <nav className="pfp-rail" aria-label="Profile sections">
        <h2 id={headingId} className="pfp-title">
          Profile
        </h2>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              className="pfp-sec"
              aria-current={section === s.id || undefined}
              onClick={() => setSection(s.id)}
            >
              <Icon aria-hidden="true" strokeWidth={1.4} />
              {s.label}
            </button>
          );
        })}
      </nav>

      <div className="pfp-stage">
        <svg className="pfp-floor" viewBox="0 0 600 160" aria-hidden="true">
          <ellipse cx="300" cy="80" rx="290" ry="60" />
          <ellipse cx="300" cy="80" rx="200" ry="40" />
          <ellipse cx="300" cy="80" rx="110" ry="22" />
        </svg>
        <div
          className="pfp-card skin-swatch"
          data-skin={skins.equipped ?? undefined}
        >
          <span className="pfp-card-top">
            <span>Command Station</span>
          </span>
          <ProfileEmblem name={name} size={132} />
          <b className="pfp-card-name">{name || "No name yet"}</b>
          <span className="pfp-card-facts">
            <span>
              <small>Counted</small>
              {hoursLabel(state.minutesTotal)}
            </span>
            <span>
              <small>Tasks</small>
              {state.tasksClaimed}
            </span>
            <span>
              <small>Draws</small>
              {gacha.draws}
            </span>
          </span>
        </div>
      </div>

      <aside
        className="pfp-panel"
        aria-label={section === "details" ? "Details" : "Equipped"}
      >
        {section === "details" ? (
          <>
            <div className="pfp-head">
              <h3>{name || "No name yet"}</h3>
            </div>
            <h4 className="pfp-sub">Play</h4>
            <dl className="pfp-list">
              <Row k="Counted time" v={hoursLabel(state.minutesTotal)} />
              <Row k="Tasks claimed" v={String(state.tasksClaimed)} />
              <Row k="Check-in days (recent)" v={String(checkinDays(state))} />
              <Row
                k="Income per counted hour"
                v={String(INCOME_PER_HOUR + perks.effects.creditsPerHour)}
              />
              <Row
                k="Achievements"
                v={`${Object.keys(achievements.state.unlocked).length} of ${ACHIEVEMENTS.length}`}
              />
            </dl>
            <h4 className="pfp-sub">Draw and collection</h4>
            <dl className="pfp-list">
              <Row k="Balance" v={<CreditBalance amount={credits} />} />
              <Row k="Draws made" v={String(gacha.draws)} />
              <Row k="Regular fragments" v={String(gacha.crystals)} />
              <Row k="Special fragments" v={String(gacha.prisms)} />
              <Row k="Themes unlocked" v={String(unlocked)} />
              <Row
                k="Card skins"
                v={`${skins.owned.length} of ${CARD_SKINS.length}`}
              />
              <Row
                k="Dashboard cards"
                v={`${usableCards} of ${WIDGET_IDS.length}`}
              />
              <Row
                k="Items kept"
                v={String(
                  items.owned.length + Object.keys(items.stacks).length,
                )}
              />
            </dl>
            <div className="pfp-acts">
              <button
                type="button"
                className="pfp-action"
                onClick={() => onNav("quests")}
              >
                Open Quests
              </button>
              <button
                type="button"
                className="eb-btn"
                onClick={() => onNav("achievements")}
              >
                Achievements
              </button>
            </div>
          </>
        ) : (
          <>
            <h4 className="pfp-sub">Theme</h4>
            <LookCard look={look} className="pfp-look" />
            <h4 className="pfp-sub">Card skin</h4>
            {skin ? (
              <>
                <SkinSample id={skin.id} className="pfp-skin" />
                <p className="pfp-note">
                  <b>{skin.name}</b> · {skin.blurb}
                </p>
              </>
            ) : (
              <p className="pfp-note">
                None. Your dashboard cards use the theme&apos;s own look.
              </p>
            )}
            <div className="pfp-acts">
              <button
                type="button"
                className="pfp-action"
                onClick={() => onNav("themes")}
              >
                Change in Themes
              </button>
              <button
                type="button"
                className="eb-btn"
                onClick={() => onNav("wiki")}
              >
                Open collection
              </button>
            </div>
          </>
        )}
      </aside>
    </section>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
