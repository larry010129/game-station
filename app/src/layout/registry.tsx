import { createContext, memo, useContext, type ReactNode } from "react";
import type { FeedItem, PlayersData, StationEvent, StationInfo } from "../lib/types";
import { MediaCard } from "../cards/MediaCard";
import { SpotifyCard } from "../cards/SpotifyCard";
import { CalendarCard } from "../cards/CalendarCard";
import { MemoryCard, PowerCard } from "../cards/PcCards";
import { JitterCard, RegionPingCard, VerdictCard, WifiCard } from "../cards/NetCards";
import { PatchCard, QueueCard, SeasonCard, SteamNewsCard, TrendCard } from "../cards/OverwatchCards";
import { GameModeHistoryCard, PlayHistoryCard, ReportCard, SessionCard } from "../cards/GameCards";
import { AiResearchCard } from "../cards/AiCards";
import { BestPicksCard } from "../cards/meta/BestPicksCard";
import { HeroProfileCard } from "../cards/meta/HeroProfileCard";
import { MapPicksCard } from "../cards/meta/MapPicksCard";
import { TierListCard } from "../cards/meta/TierListCard";
import { CostCard, DiscordCard, LibraryCard, type DiscordToasts } from "../cards/ExtraCards";
import { NotesCard } from "../cards/ToolCards";
import { WorldClockCard } from "../cards/WorldClockCard";
import { WaveLinkCard } from "../cards/WaveLinkCard";
import { PlayersMap } from "../components/PlayersMap";
import { AlertsPanel, FeedPanel, GameModePanel } from "../components/Panels";
import { DeviceTile, LoadTile, UplinkTile } from "../components/Tiles";
import type { Phase, StepStatus } from "../state/useGameMode";
import { useSample, type StationStore } from "../state/useStation";
import type { CardId, CardInstance } from "./layouts";

/** What the cards need from the app around them. Each card picks out only what it shows. */
export interface CardCtx {
  info: StationInfo;
  store: StationStore;
  players: { data: PlayersData | null; failed: boolean };
  feed: { items: FeedItem[]; error: string | null; checking: boolean; checkNow: () => void };
  events: StationEvent[];
  gm: {
    profiles: { id: string; name: string }[];
    profile: { id: string; steps: { id: string; label: string; before: string }[] };
    setProfileId: (id: string) => void;
    phase: Phase;
    status: Record<string, StepStatus>;
    start: () => void;
    stop: () => void;
  };
  stopped: boolean;
  toasts: DiscordToasts;
  onOpenCalendar: (date?: string) => void;
  onLook: (id: string, look: string) => void;
}

// Cards that follow the sensor readings subscribe themselves, so a new reading re-renders them alone.
const GpuView = memo(function GpuView({ store, model }: { store: StationStore; model: string }) {
  const temp = useSample(store, (s) => s.gpuTemp);
  return <DeviceTile kind="gpu" title="GPU" model={model} temp={temp} selected />;
});

const LoadView = memo(function LoadView({ store }: { store: StationStore }) {
  const cpu = useSample(store, (s) => s.cpuLoad);
  const gpu = useSample(store, (s) => s.gpuLoad);
  const stale = useSample(store, (s) => s.stale === true);
  return <LoadTile cpu={cpu} gpu={gpu} stale={stale} />;
});

const UplinkView = memo(function UplinkView({ store }: { store: StationStore }) {
  const sample = useSample(store, (s) => s);
  return <UplinkTile sample={sample} />;
});

const PowerView = memo(function PowerView({ store }: { store: StationStore }) {
  const game = useSample(store, (s) => s.game);
  return <PowerCard game={game} />;
});

const ClockView = memo(function ClockView({ id, look, onLook }: { id: string; look: string | undefined; onLook: (id: string, look: string) => void }) {
  return <WorldClockCard look={look} onLook={(l) => onLook(id, l)} />;
});

// Memoised so a context change only re-renders the cards whose own props changed.
const AiResearchCardM = memo(AiResearchCard);
const AlertsPanelM = memo(AlertsPanel);
const BestPicksCardM = memo(BestPicksCard);
const CalendarCardM = memo(CalendarCard);
const CostCardM = memo(CostCard);
const DiscordCardM = memo(DiscordCard);
const FeedPanelM = memo(FeedPanel);
const GameModeHistoryCardM = memo(GameModeHistoryCard);
const GameModePanelM = memo(GameModePanel);
const HeroProfileCardM = memo(HeroProfileCard);
const JitterCardM = memo(JitterCard);
const LibraryCardM = memo(LibraryCard);
const MapPicksCardM = memo(MapPicksCard);
const MediaCardM = memo(MediaCard);
const MemoryCardM = memo(MemoryCard);
const NotesCardM = memo(NotesCard);
const PatchCardM = memo(PatchCard);
const PlayHistoryCardM = memo(PlayHistoryCard);
const PlayersMapM = memo(PlayersMap);
const QueueCardM = memo(QueueCard);
const RegionPingCardM = memo(RegionPingCard);
const ReportCardM = memo(ReportCard);
const SeasonCardM = memo(SeasonCard);
const SessionCardM = memo(SessionCard);
const SpotifyCardM = memo(SpotifyCard);
const SteamNewsCardM = memo(SteamNewsCard);
const TierListCardM = memo(TierListCard);
const TrendCardM = memo(TrendCard);
const VerdictCardM = memo(VerdictCard);
const WaveLinkCardM = memo(WaveLinkCard);
const WifiCardM = memo(WifiCard);

/** Every card's view, by id. A view is built only when its card is on the page being drawn. */
export const CARD_VIEWS: Record<CardId, (c: CardCtx, inst: CardInstance) => ReactNode> = {
  gpu: (c) => <GpuView store={c.store} model={c.info.machine.gpu} />,
  load: (c) => <LoadView store={c.store} />,
  uplink: (c) => <UplinkView store={c.store} />,
  chart: (c) => <PlayersMapM data={c.players.data} failed={c.players.failed} />,
  alerts: (c) => <AlertsPanelM events={c.events} />,
  gamemode: (c) => (
    <GameModePanelM
      profiles={c.gm.profiles}
      profile={c.gm.profile}
      onProfile={c.gm.setProfileId}
      phase={c.gm.phase}
      status={c.gm.status}
      onStart={c.gm.start}
      onStop={c.gm.stop}
      disabled={c.stopped}
    />
  ),
  feed: (c) => <FeedPanelM items={c.feed.items} error={c.feed.error} checking={c.feed.checking} onCheck={c.feed.checkNow} />,
  media: () => <MediaCardM />,
  spotify: () => <SpotifyCardM />,
  calendar: (c) => <CalendarCardM onOpen={c.onOpenCalendar} />,
  wavelink: () => <WaveLinkCardM />,
  memory: () => <MemoryCardM />,
  power: (c) => <PowerView store={c.store} />,
  regionping: () => <RegionPingCardM />,
  jitter: () => <JitterCardM />,
  wifi: () => <WifiCardM />,
  verdict: () => <VerdictCardM />,
  trend: (c) => <TrendCardM players={c.players.data} />,
  patch: (c) => <PatchCardM items={c.feed.items} />,
  season: () => <SeasonCardM />,
  steam: () => <SteamNewsCardM />,
  queue: (c) => <QueueCardM players={c.players.data} />,
  airesearch: () => <AiResearchCardM />,
  tierlist: () => <TierListCardM />,
  mappicks: () => <MapPicksCardM />,
  bestpicks: () => <BestPicksCardM />,
  heroprofile: (_c, inst) => <HeroProfileCardM instanceId={inst.id} />,
  session: () => <SessionCardM />,
  playhistory: () => <PlayHistoryCardM />,
  report: () => <ReportCardM />,
  gmhistory: () => <GameModeHistoryCardM />,
  clocks: (c, inst) => <ClockView id={inst.id} look={inst.look} onLook={c.onLook} />,
  cost: () => <CostCardM />,
  library: () => <LibraryCardM />,
  discord: (c) => <DiscordCardM toasts={c.toasts} />,
  notes: (_c, inst) => <NotesCardM instanceId={inst.id} />,
};

export const renderCardView = (inst: CardInstance, ctx: CardCtx): ReactNode => CARD_VIEWS[inst.type](ctx, inst);

/**
 * The cards get their ctx through context instead of through the grid's `render` prop. The grid's props then
 * stay the same when a reading or an event arrives, and only the card views re-render.
 */
export const CardCtxContext = createContext<CardCtx | null>(null);

export function CardView({ inst }: { inst: CardInstance }) {
  const ctx = useContext(CardCtxContext);
  return ctx ? <>{renderCardView(inst, ctx)}</> : null;
}
