import { useMemo, useState, useEffect, Component, type ReactNode } from "react";
import { createMockProvider } from "../providers/mock";
import { StationContext } from "../state/useApi";
import { CARDS, CARD_IDS, type CardId } from "../layout/layouts";

// Error boundary to catch rendering errors
class CardErrorBoundary extends Component<
  { cardName: string; children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { cardName: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`Error rendering card "${this.props.cardName}":`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'var(--orange)', fontSize: '13px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 400 }}>Error rendering card</div>
          <div style={{ color: 'var(--dim)', fontSize: '11px' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Import all card components
import { MediaCard } from "../cards/MediaCard";
import { MemoryCard, PowerCard } from "../cards/PcCards";
import { JitterCard, RegionPingCard, VerdictCard, WifiCard } from "../cards/NetCards";
import { LeaksCard, PatchCard, QueueCard, SeasonCard, SteamNewsCard, TrendCard } from "../cards/OverwatchCards";
import { GameModeHistoryCard, PlayHistoryCard, ReportCard, SessionCard } from "../cards/GameCards";
import { AiResearchCard } from "../cards/AiCards";
import { BestPicksCard, HeroProfileCard, MapPicksCard, TierListCard } from "../cards/MetaCards";
import { DeckMapCard, NotesCard } from "../cards/ToolCards";
import { WorldClockCard } from "../cards/WorldClockCard";
import { Backdrop } from "./Backdrop";
import { PlayersMap } from "./PlayersMap";
import { AlertsPanel, FeedPanel, GameModePanel } from "./Panels";
import { DeckPanel } from "./DeckPanel";
import { DeviceTile, LoadTile, UplinkTile } from "./Tiles";
import type { Sample, FeedItem, Profile, GameModeStep } from "../lib/types";

// Stub Tauri APIs and other browser-only APIs
if (typeof window !== "undefined") {
  if (!(window as any).__TAURI__) {
    (window as any).__TAURI__ = {
      invoke: () => Promise.resolve(),
      event: {
        listen: () => Promise.resolve(() => {}),
        emit: () => Promise.resolve(),
      },
    };
  }
  
  // Stub openLink to prevent errors
  (window as any).openLink = () => {};
}

// Sample data for cards
function createSampleData() {
  const now = Date.now();
  const HOUR = 3600_000;

  const sample: Sample = {
    t: now,
    fps: 165,
    frameTimeMs: 6.1,
    gpuTemp: 72,
    cpuLoad: 58,
    gpuLoad: 92,
    cpuClockGhz: 4.7,
    gpuPowerW: 105,
    pingRegionMs: 42,
    pingRouterMs: 4,
    batteryPct: 81,
    onAc: true,
    game: "Overwatch.exe",
  };

  const history = Array.from({ length: 60 }, (_, i) => ({
    ...sample,
    t: now - (59 - i) * 1000,
  }));

  const feedItems: FeedItem[] = [
    {
      id: "patch-1",
      kind: "patch" as const,
      title: "Overwatch Retail Patch Notes, November 5, 2026",
      source: "Blizzard",
      publishedAt: now - 7 * 24 * HOUR,
      summary: "Sample support healing 60 → 65",
      isNew: true,
      heroChanges: [
        { name: "Mercy", up: 1, down: 0 },
        { name: "Ana", up: 0, down: 1 },
        { name: "Moira", up: 1, down: 1 },
      ],
    },
    {
      id: "leak-1",
      kind: "leak" as const,
      title: "New hero teaser spotted in latest trailer",
      source: "Reddit",
      publishedAt: now - 3 * HOUR,
      summary: "Community found hints about upcoming hero",
      isNew: true,
    },
    {
      id: "official-1",
      kind: "official" as const,
      title: "Director's Take: 5v5 and 6v6, Better Together",
      source: "Blizzard",
      publishedAt: now - 24 * HOUR,
      summary: "The game director on running both team formats",
    },
  ];

  const step = (id: string, label: string, before: string, after: string): GameModeStep => ({
    id,
    label,
    before,
    after,
  });

  const profiles: Profile[] = [
    {
      id: "ow-ranked",
      name: "Overwatch ranked",
      steps: [
        step("power", "Power plan to High performance", "Balanced", "High performance"),
        step("close", "Close Spotify, OneDrive, Armoury Crate", "3 running", "Closed"),
        step("gpu", "Run Overwatch on the RTX 5060", "Let Windows decide", "High performance GPU"),
        step("poll", "Slow live stats to every 3 s", "Every 1 s", "Every 3 s"),
        step("launch", "Launch Overwatch", "Not running", "Running"),
      ],
    },
  ];

  return { sample, history, feedItems, profiles };
}

export function CardGallery() {
  const provider = useMemo(() => createMockProvider(), []);
  const { sample, history, feedItems, profiles } = useMemo(() => createSampleData(), []);
  const [players, setPlayers] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      provider.readPlayers(),
    ]).then(([playersData]) => {
      setPlayers(playersData);
      setReady(true);
    });
  }, [provider]);

  if (!ready) {
    return (
      <>
        <Backdrop image={null} />
        <div className="page" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--dim)', fontSize: '16px' }}>Loading gallery...</p>
        </div>
      </>
    );
  }

  // Group cards by their group
  const cardGroups = useMemo(() => {
    const groups = new Map<string, CardId[]>();
    CARD_IDS.forEach((id) => {
      const card = CARDS[id];
      if (!groups.has(card.group)) {
        groups.set(card.group, []);
      }
      groups.get(card.group)!.push(id);
    });
    return groups;
  }, []);

  const renderCard = (id: CardId) => {
    switch (id) {
      case "gpu":
        return <DeviceTile kind="gpu" title="GPU" model="RTX 5060" temp={sample.gpuTemp} selected />;
      case "load":
        return <LoadTile cpu={sample.cpuLoad} gpu={sample.gpuLoad} />;
      case "uplink":
        return <UplinkTile sample={sample} />;
      case "chart":
        return <PlayersMap data={players} failed={false} />;
      case "alerts":
        return (
          <AlertsPanel
            events={[
              { id: 1, t: Date.now() - 5000, kind: "info" as const, text: "Game mode activated" },
              { id: 2, t: Date.now() - 10000, kind: "alert" as const, text: "GPU temperature reached 85°C", marker: "!" },
            ]}
          />
        );
      case "gamemode":
        return (
          <GameModePanel
            profiles={profiles}
            profile={profiles[0]}
            onProfile={() => {}}
            phase="off"
            status={{}}
            onStart={() => {}}
            onStop={() => {}}
            disabled={false}
          />
        );
      case "feed":
        return <FeedPanel items={feedItems} error={null} checking={false} onCheck={() => {}} />;
      case "media":
        return <MediaCard />;
      case "memory":
        return <MemoryCard />;
      case "power":
        return <PowerCard game="Overwatch.exe" />;
      case "regionping":
        return <RegionPingCard />;
      case "jitter":
        return <JitterCard />;
      case "wifi":
        return <WifiCard />;
      case "verdict":
        return <VerdictCard />;
      case "trend":
        return <TrendCard players={players} />;
      case "patch":
        return <PatchCard items={feedItems} />;
      case "leaks":
        return <LeaksCard items={feedItems} />;
      case "season":
        return <SeasonCard />;
      case "steam":
        return <SteamNewsCard />;
      case "queue":
        return <QueueCard players={players} />;
      case "airesearch":
        return <AiResearchCard />;
      case "tierlist":
        return <TierListCard />;
      case "mappicks":
        return <MapPicksCard />;
      case "bestpicks":
        return <BestPicksCard />;
      case "heroprofile":
        return <HeroProfileCard />;
      case "session":
        return <SessionCard />;
      case "playhistory":
        return <PlayHistoryCard />;
      case "report":
        return <ReportCard />;
      case "gmhistory":
        return <GameModeHistoryCard />;
      case "clocks":
        return <WorldClockCard onLook={() => {}} />;
      case "notes":
        return <NotesCard instanceId="gallery-notes" />;
      case "deckmap":
        return <DeckMapCard />;
      case "deck":
        return (
          <DeckPanel
            history={history}
            gameModeOn={false}
            hasNews={true}
            stopped={false}
            profileName="Overwatch ranked"
          />
        );
      default:
        return null;
    }
  };

  return (
    <StationContext.Provider value={{ provider, quiet: false }}>
      <Backdrop image={null} />
      <div className="page gallery-page">
        <div className="gallery-header">
          <h1>Command Station Dashboard Cards</h1>
          <p>All {CARD_IDS.length} cards rendered with sample data</p>
        </div>

        {Array.from(cardGroups.entries()).map(([group, cards]) => (
          <div key={group} className="gallery-group">
            <h2 className="gallery-group-title">{group}</h2>
            <div className="gallery-grid">
              {cards.map((id) => (
                <div key={id} className="gallery-item">
                  <div className="gallery-item-name">{CARDS[id].name}</div>
                  <div className="gallery-item-card">
                    <CardErrorBoundary cardName={CARDS[id].name}>
                      {renderCard(id)}
                    </CardErrorBoundary>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StationContext.Provider>
  );
}
