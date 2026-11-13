import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Dashboard } from "./layout/Dashboard";
import { EditBar } from "./layout/EditBar";
import { CARD_IDS, TABS, tabOf, type CardId, type CardInstance, type TabId } from "./layout/layouts";
import { CardPicker } from "./layout/CardPicker";
import { StationContext } from "./state/useApi";
import { MediaCard } from "./cards/MediaCard";
import { MemoryCard, PowerCard } from "./cards/PcCards";
import { JitterCard, RegionPingCard, VerdictCard, WifiCard } from "./cards/NetCards";
import { LeaksCard, PatchCard, QueueCard, SeasonCard, SteamNewsCard, TrendCard } from "./cards/OverwatchCards";
import { GameModeHistoryCard, PlayHistoryCard, ReportCard, SessionCard } from "./cards/GameCards";
import { AiResearchCard } from "./cards/AiCards";
import { BestPicksCard, HeroProfileCard, MapPicksCard, TierListCard } from "./cards/MetaCards";
import { DeckMapCard, NotesCard } from "./cards/ToolCards";
import { useDashboard } from "./layout/useDashboard";
import { WorldClockCard } from "./cards/WorldClockCard";
import { Backdrop } from "./components/Backdrop";
import { PlayersMap } from "./components/PlayersMap";
import { usePlayers } from "./state/usePlayers";
import { AlertsPanel, FeedPanel, GameModePanel } from "./components/Panels";
import { DeckPanel } from "./components/DeckPanel";
import { DeviceTile, LoadTile, UplinkTile } from "./components/Tiles";
import { TopBar } from "./components/TopBar";
import { createProvider } from "./providers";
import { useToast } from "./state/Toast";
import { isQuiet, useClock, usePerformanceGate, useStoredFlag } from "./state/useEnvironment";
import { useEvents, type NewEvent } from "./state/useEvents";
import { useFeed } from "./state/useFeed";
import { PLATFORM_NAME, platformOf } from "./components/PlatformIcon";
import { useGameMode, type Phase } from "./state/useGameMode";
import { useStation } from "./state/useStation";
import { useLeakAlerts } from "./state/useLeakAlerts";
import { useTheme } from "./state/useTheme";
import { ThemePanel } from "./components/ThemePanel";
import type { FeedItem, Provider } from "./lib/types";

const MODE_LABEL: Record<Phase, string> = {
  off: "Standby",
  applying: "Applying",
  on: "Game mode",
  restoring: "Restoring",
};

export function App() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const look = useTheme();

  useEffect(() => {
    let alive = true;
    createProvider().then((p) => {
      if (alive) setProvider(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!provider) {
    return (
      <>
        <Backdrop image={look.image} />
        <div className="page">
          <p className="stopped" role="status">
            Starting the local service… The dashboard only shows real readings from this PC, so it waits for it.
          </p>
        </div>
      </>
    );
  }

  return <StationApp provider={provider} look={look} />;
}

const TAB_KEY = "cs.tab";

function readTab(): TabId {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    if (TABS.some((t) => t.id === saved)) return saved as TabId;
  } catch {
    // Storage blocked: start on Station.
  }
  return "station";
}

function StationApp({ provider, look }: { provider: Provider; look: ReturnType<typeof useTheme> }) {
  const [tab, setTab] = useState<TabId>(readTab);
  const now = useClock();
  const gate = usePerformanceGate();
  const toast = useToast();
  const [calm, setCalm] = useStoredFlag("cs.reduceMotion", false);
  const [stopped, setStopped] = useState(false);

  const seedEvents = useMemo<NewEvent[]>(() => {
    const started = Date.now();
    if (provider.id === "live") {
      return [{ kind: "info", text: `Sensors linked (${provider.label.toLowerCase()}), sampling every 1 s`, t: started - 2_000 }];
    }
    return [
      { kind: "info", text: `Sensors linked (${provider.label.toLowerCase()}), sampling every 1 s`, t: started - 58_000 },
      { kind: "info", text: "New patch notes on file: November 5, 2026", t: started - 40_000 },
    ];
  }, [provider.id, provider.label]);
  const { events, add } = useEvents(seedEvents);
  const gm = useGameMode(provider, add);

  // Slower polling while a game is running, slowest while the window is hidden.
  const intervalMs = gate.hidden ? 5000 : gm.phase === "on" ? 3000 : 1000;
  const { history, latest } = useStation(provider, { stopped, intervalMs, onEvent: add });
  const onNewStories = useCallback(
    (fresh: FeedItem[]) => {
      for (const s of fresh.slice(0, 3)) add({ kind: "info", text: `New on ${PLATFORM_NAME[platformOf(s)]}: ${s.title}` });
      toast(fresh.length === 1 ? "1 new Overwatch story" : `${fresh.length} new Overwatch stories`);
    },
    [add, toast],
  );
  const feed = useFeed(provider, gm.phase === "on" || gate.hidden, onNewStories);
  const players = usePlayers(provider, gm.phase === "on" || gate.hidden);
  useLeakAlerts(provider, gm.phase === "on" || gate.hidden, (fresh) => {
    for (const l of fresh.slice(0, 3)) add({ kind: "info", text: `New ${l.status === "confirmed" ? "confirmed news" : l.status}: ${l.title}` });
    toast(fresh.length === 1 ? "1 new leak found" : `${fresh.length} new leaks found`);
  });

  const toggleKill = useCallback(() => {
    setStopped((s) => {
      const next = !s;
      add(
        next
          ? { kind: "alert", text: "Kill switch pressed, nothing is being sampled" }
          : { kind: "info", text: "Monitoring resumed" },
      );
      toast(next ? "Monitoring stopped. Press the power button again to resume." : "Monitoring resumed.");
      return next;
    });
  }, [add, toast]);

  const dash = useDashboard();
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phoneWidth, setPhoneWidth] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEditing(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const selectTab = (next: TabId) => {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      // It still switches until the app closes.
    }
    if (next === "vault") {
      setEditing(false);
      setPicking(false);
    }
    window.scrollTo(0, 0);
  };

  const toggleEdit = () => {
    if (tab === "vault") {
      toast("Vault is settings, not a card layout.");
      return;
    }
    if (phoneWidth) {
      toast("The layout is fixed at phone width. Use a wider window to rearrange cards.");
      return;
    }
    setEditing((e) => !e);
  };

  const shown = useMemo(() => dash.instances.filter((inst) => tabOf(inst.type) === tab), [dash.instances, tab]);
  const shownLayouts = useMemo(
    () => ({
      lg: (dash.layouts.lg ?? []).filter((item) => shown.some((inst) => inst.id === item.i)),
      md: (dash.layouts.md ?? []).filter((item) => shown.some((inst) => inst.id === item.i)),
      sm: (dash.layouts.sm ?? []).filter((item) => shown.some((inst) => inst.id === item.i)),
    }),
    [dash.layouts, shown],
  );

  const cards: Partial<Record<CardId, ReactNode>> = {
    gpu: <DeviceTile kind="gpu" title="GPU" model={provider.machine.gpu} temp={latest.gpuTemp} selected />,
    load: <LoadTile cpu={latest.cpuLoad} gpu={latest.gpuLoad} />,
    uplink: <UplinkTile sample={latest} />,
    chart: <PlayersMap data={players.data} failed={players.failed} />,
    alerts: <AlertsPanel events={events} />,
    gamemode: (
      <GameModePanel
        profiles={gm.profiles}
        profile={gm.profile}
        onProfile={gm.setProfileId}
        phase={gm.phase}
        status={gm.status}
        onStart={gm.start}
        onStop={gm.stop}
        disabled={stopped}
      />
    ),
    feed: <FeedPanel items={feed.items} error={feed.error} checking={feed.checking} onCheck={feed.checkNow} />,
    media: <MediaCard />,
    memory: <MemoryCard />,
    power: <PowerCard game={latest.game} />,
    regionping: <RegionPingCard />,
    jitter: <JitterCard />,
    wifi: <WifiCard />,
    verdict: <VerdictCard />,
    trend: <TrendCard players={players.data} />,
    patch: <PatchCard items={feed.items} />,
    leaks: <LeaksCard items={feed.items} />,
    season: <SeasonCard />,
    steam: <SteamNewsCard />,
    queue: <QueueCard players={players.data} />,
    airesearch: <AiResearchCard />,
    tierlist: <TierListCard />,
    mappicks: <MapPicksCard />,
    bestpicks: <BestPicksCard />,
    heroprofile: <HeroProfileCard />,
    session: <SessionCard />,
    playhistory: <PlayHistoryCard />,
    report: <ReportCard />,
    gmhistory: <GameModeHistoryCard />,
    clocks: <WorldClockCard onLook={() => undefined} />,
    notes: <NotesCard instanceId="notes" />,
    deckmap: <DeckMapCard />,
    deck: <DeckPanel history={history} gameModeOn={gm.phase === "on"} hasNews={feed.items.some((i) => i.isNew)} stopped={stopped} profileName={gm.profile.name} />,
  };

  const renderCard = (inst: CardInstance): ReactNode => {
    if (inst.type === "clocks") return <WorldClockCard look={inst.look} onLook={(l) => dash.setLook(inst.id, l)} />;
    if (inst.type === "notes") return <NotesCard instanceId={inst.id} />;
    return cards[inst.type];
  };

  const quiet = isQuiet(gate, latest.game, provider.id === "live");
  const rootClass = ["page", quiet && "quiet", calm && "calm"].filter(Boolean).join(" ");

  return (
    <StationContext.Provider value={{ provider, quiet: quiet || gm.phase === "on" || gate.hidden }}>
      <Backdrop image={look.image} />
      <div className={rootClass}>
        <TopBar
          tab={tab}
          onTab={selectTab}
          machine={provider.machine}
          modeLabel={stopped ? "Stopped" : MODE_LABEL[gm.phase]}
          now={now}
          sourceLabel={provider.label}
          calm={calm}
          onCalm={() => setCalm(!calm)}
          stopped={stopped}
          onKill={toggleKill}
          editing={editing}
          onEdit={toggleEdit}
          onTheme={() => selectTab("vault")}
        />
        {stopped && (
          <p className="stopped" role="status">
            Monitoring is stopped. Nothing is being sampled until you press the power button again.
          </p>
        )}

        {tab === "vault" ? (
          <section className="vault" aria-label="Vault">
            <h2>Vault</h2>
            <p>Card colour and the background picture, saved on this PC. Each other tab keeps its own cards.</p>
            <ThemePanel
              embedded
              theme={look.theme}
              image={look.image}
              imageSaved={look.imageSaved}
              onTint={look.setTint}
              onDim={look.setDim}
              onImage={look.setImage}
              onReset={look.reset}
              onClose={() => selectTab("station")}
            />
          </section>
        ) : (
          <div id={tab}>
            {shown.length === 0 && (
              <p className="stopped" role="status">
                No cards on this page. Press Edit layout, then add the ones that belong here.
              </p>
            )}
            <Dashboard
              editing={editing}
              layouts={shownLayouts}
              onLayouts={(next) => dash.updateVisible(next, shown.map((inst) => inst.id))}
              onBreakpoint={(bp) => {
                setPhoneWidth(bp === "sm");
                if (bp === "sm") setEditing(false);
              }}
              instances={shown}
              render={renderCard}
              onRemove={dash.remove}
              onLook={dash.setLook}
              onDropCard={dash.add}
            />
          </div>
        )}
      </div>
      {editing && (
        <EditBar
          customised={dash.customised}
          hasSavedDefault={dash.hasSavedDefault}
          onSaveDefault={dash.saveAsDefault}
          onClearDefault={dash.clearDefault}
          onReset={() => {
            dash.reset();
            toast("Layout reset to the default.");
          }}
          onDone={() => {
            setEditing(false);
            setPicking(false);
          }}
          onCards={() => setPicking((p) => !p)}
          cardsOpen={picking}
        />
      )}
      {editing && picking && (
        <CardPicker tab={tab} instances={dash.instances} ready={CARD_IDS.filter((id) => id === "clocks" || cards[id] != null)} onAdd={(t) => dash.add(t)} onClose={() => setPicking(false)} />
      )}
    </StationContext.Provider>
  );
}
