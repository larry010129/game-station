import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BootScreen } from "./boot/BootScreen";
import { signal } from "./boot/bootSignals";
import { useBoot } from "./boot/useBoot";
import { Dashboard } from "./layout/Dashboard";
import { EditBar } from "./layout/EditBar";
import { instancesForTab, layoutsFor, pageNote, type CardId, type CardInstance, type PageTabId, type TabId } from "./layout/layouts";
import { CardPicker } from "./layout/CardPicker";
import { CardCtxContext, CardView, type CardCtx } from "./layout/registry";
import { StationContext } from "./state/useApi";
import { useSpotlight } from "./lib/useSpotlight";
import { readString, removeKey, writeString } from "./lib/storage";
import { CalendarPage, calFocus } from "./cards/CalendarPage";
import { CreditsPage } from "./pages/CreditsPage";
import { ThemesPage } from "./pages/ThemesPage";
import { VaultPage } from "./pages/VaultPage";
import { useSmartAlerts } from "./state/useSmartAlerts";
import { useDashboard } from "./layout/useDashboard";
import { Backdrop } from "./components/Backdrop";
import { usePlayers } from "./state/usePlayers";
import { TopBar } from "./components/TopBar";
import { useToast } from "./state/Toast";
import { isQuiet, usePerformanceGate, useStoredFlag } from "./state/useEnvironment";
import { useEvents, type NewEvent } from "./state/useEvents";
import { useFeed } from "./state/useFeed";
import { PLATFORM_NAME, platformOf } from "./components/PlatformIcon";
import { useGameMode, type Phase } from "./state/useGameMode";
import { useSample, useStation } from "./state/useStation";
import { useLeakAlerts } from "./state/useLeakAlerts";
import { useTheme } from "./state/useTheme";
import { useToasts } from "./state/useToasts";
import { StationAlert } from "./components/StationAlert";
import { useMonitor } from "./state/useMonitor";
import { useWindowView } from "./state/useWindowView";
import type { FeedItem, Provider } from "./lib/types";

const MODE_LABEL: Record<Phase, string> = {
  off: "Standby",
  applying: "Applying",
  on: "Game mode",
  restoring: "Restoring",
};

/** Reports the first live sample (or failures) to the boot screen. */
const withSampleSignal = (p: Provider): Provider => ({
  ...p,
  readSample: () =>
    p.readSample().then(
      (s) => {
        signal("/api/sample", "ok");
        return s;
      },
      (e: unknown) => {
        signal("/api/sample", "error");
        throw e;
      },
    ),
});

export function App() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [cards, setCards] = useState<CardId[] | null>(null);
  const [covered, setCovered] = useState(true);
  const look = useTheme();
  const windowView = useWindowView();
  const onProvider = useCallback((p: Provider) => setProvider(withSampleSignal(p)), []);
  const boot = useBoot({ cards, onProvider });

  // The dashboard mounts as soon as the provider exists and fills in under the cover.
  const under = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (under.current) under.current.inert = covered;
  }, [covered, provider]);

  return (
    <>
      {provider && (
        <div ref={under} className={covered ? "boot-under" : "boot-reveal"} aria-hidden={covered || undefined}>
          <StationApp provider={provider} look={look} windowView={windowView} onCards={setCards} />
        </div>
      )}
      {covered && <BootScreen state={boot} image={look.image} onExited={() => setCovered(false)} />}
    </>
  );
}

const NAME_KEY = "cs.displayName";
const FREE_KEY = "cs.freeMove";

/** The dashboard grid, memoised so it redraws only when its own inputs change (cards read ctx from context, not from props). */
const MemoDashboard = memo(Dashboard);

function StationApp({
  provider,
  look,
  windowView,
  onCards,
}: {
  provider: Provider;
  look: ReturnType<typeof useTheme>;
  windowView: ReturnType<typeof useWindowView>;
  /** The card types on the current tab, for the boot checklist. */
  onCards?: (types: CardId[]) => void;
}) {
  // Home is the page the app opens on.
  const [tab, setTab] = useState<TabId>("home");
  const [displayName, setDisplayName] = useState(() => readString(NAME_KEY) ?? "");
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
  const toasts = useToasts(provider);
  const gm = useGameMode(provider, add);

  // Slower polling while a game is running, slowest while the window is hidden.
  const intervalMs = gate.hidden ? 5000 : gm.phase === "on" ? 3000 : 1000;
  const store = useStation(provider, { stopped, intervalMs, onEvent: add });
  // Only the running game is read here; the rest of each reading is picked up by the cards that show it.
  const game = useSample(store, (s) => s.game);
  const onNewStories = useCallback(
    (fresh: FeedItem[]) => {
      for (const s of fresh.slice(0, 3)) add({ kind: "info", text: `New on ${PLATFORM_NAME[platformOf(s)]}: ${s.title}`, ...(s.url ? { url: s.url } : {}) });
      toast(fresh.length === 1 ? "1 new Overwatch story" : `${fresh.length} new Overwatch stories`);
    },
    [add, toast],
  );
  const feed = useFeed(provider, gm.phase === "on" || gate.hidden, onNewStories);
  const players = usePlayers(provider, gm.phase === "on" || gate.hidden);
  useLeakAlerts(provider, gm.phase === "on" || gate.hidden, (fresh) => {
    for (const l of fresh.slice(0, 3)) add({ kind: "info", text: `New ${l.status === "confirmed" ? "confirmed news" : l.status}: ${l.title}`, ...(l.url ? { url: l.url } : {}) });
    toast(fresh.length === 1 ? "1 new leak found" : `${fresh.length} new leaks found`);
  });

  useSmartAlerts(provider, store, stopped, (text) => {
    add({ kind: "alert", text });
    toast(text, { alert: true });
  });

  // The state change and its side effects are separate steps: an updater function must stay pure.
  const toggleKill = useCallback(() => {
    const next = !stopped;
    setStopped(next);
    add(next ? { kind: "alert", text: "Kill switch pressed, nothing is being sampled" } : { kind: "info", text: "Monitoring resumed" });
    toast(next ? "Monitoring stopped. Press the power button again to resume." : "Monitoring resumed.");
  }, [stopped, add, toast]);

  const dash = useDashboard();
  const [freeMove, setFreeMove] = useState(() => readString(FREE_KEY) === "1");
  const chooseMove = useCallback((mode: "snap" | "free") => {
    setFreeMove(mode === "free");
    writeString(FREE_KEY, mode === "free" ? "1" : "0");
  }, []);
  const monitor = useMonitor();
  useSpotlight();
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phoneWidth, setPhoneWidth] = useState(false);

  useEffect(() => {
    if (!editing) return;
    // An Escape that already closed a dropdown is not also a request to leave editing.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && setEditing(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const selectTab = useCallback((next: TabId) => {
    setTab(next);
    if (pageNote(next)) {
      setEditing(false);
      setPicking(false);
    }
    window.scrollTo(0, 0);
  }, []);

  const openCalendar = useCallback(
    (date?: string) => {
      calFocus.date = date ?? null;
      selectTab("calendar");
    },
    [selectTab],
  );

  const saveDisplayName = useCallback((next: string) => {
    const clipped = next.slice(0, 40);
    setDisplayName(clipped);
    if (clipped) writeString(NAME_KEY, clipped);
    else removeKey(NAME_KEY);
  }, []);

  const toggleEdit = () => {
    const note = pageNote(tab);
    if (note) {
      toast(note);
      return;
    }
    if (phoneWidth) {
      toast("The layout is fixed at phone width. Use a wider window to rearrange cards.");
      return;
    }
    setEditing((e) => !e);
  };

  const shown = useMemo(() => instancesForTab(tab, dash.instances, dash.hidden), [dash.instances, dash.hidden, tab]);
  useEffect(() => {
    // Pages like Vault and Calendar have no cards to wait on.
    onCards?.(pageNote(tab) ? [] : shown.map((inst) => inst.type));
  }, [shown, tab, onCards]);
  const shownLayouts = useMemo(
    () =>
      tab === "home"
        ? layoutsFor(shown, dash.layouts)
        : {
            lg: (dash.layouts.lg ?? []).filter((item) => shown.some((inst) => inst.id === item.i)),
            md: (dash.layouts.md ?? []).filter((item) => shown.some((inst) => inst.id === item.i)),
            sm: (dash.layouts.sm ?? []).filter((item) => shown.some((inst) => inst.id === item.i)),
          },
    [dash.layouts, shown, tab],
  );

  const ctx = useMemo<CardCtx>(
    () => ({
      provider,
      store,
      players: { data: players.data, failed: players.failed },
      feed: { items: feed.items, error: feed.error, checking: feed.checking, checkNow: feed.checkNow },
      events,
      gm: { profiles: gm.profiles, profile: gm.profile, setProfileId: gm.setProfileId, phase: gm.phase, status: gm.status, start: gm.start, stop: gm.stop },
      stopped,
      toasts,
      onOpenCalendar: openCalendar,
      onLook: dash.setLook,
    }),
    [provider, store, players.data, players.failed, feed.items, feed.error, feed.checking, feed.checkNow, events, gm.profiles, gm.profile, gm.setProfileId, gm.phase, gm.status, gm.start, gm.stop, stopped, toasts, openCalendar, dash.setLook],
  );
  // The grid gets a render function that never changes; each card reads `ctx` from context (see CardView).
  const renderCard = useCallback((inst: CardInstance): ReactNode => <CardView inst={inst} />, []);

  const updateVisible = dash.updateVisible;
  const onLayouts = useCallback(
    (next: Parameters<typeof updateVisible>[0]) => updateVisible(next, shown.map((inst) => inst.id)),
    [updateVisible, shown],
  );
  const onBreakpoint = useCallback((bp: string) => {
    setPhoneWidth(bp === "sm");
    if (bp === "sm") setEditing(false);
  }, []);

  const quiet = isQuiet(gate, game, provider.id === "live");
  const rootClass = ["page", quiet && "quiet", calm && "calm"].filter(Boolean).join(" ");
  const stationValue = useMemo(() => ({ provider, quiet: quiet || gm.phase === "on" || gate.hidden }), [provider, quiet, gm.phase, gate.hidden]);

  // Each page tab is drawn by its own component. Only the open one is built.
  const pages: Record<PageTabId, () => ReactNode> = {
    vault: () => (
      <VaultPage
        provider={provider}
        onProfilesChanged={gm.refreshProfiles}
        look={look}
        windowView={windowView}
        monitor={monitor}
        displayName={displayName}
        onDisplayName={saveDisplayName}
        freeMove={freeMove}
        onMoveMode={chooseMove}
        toasts={toasts}
        onOpenThemes={() => selectTab("themes")}
      />
    ),
    themes: () => <ThemesPage look={look} />,
    calendar: () => <CalendarPage />,
    credits: () => <CreditsPage />,
  };

  return (
    <StationContext.Provider value={stationValue}>
      <Backdrop image={look.image} />
      <div className={rootClass}>
        <TopBar
          tab={tab}
          onTab={selectTab}
          displayName={displayName}
          modeLabel={stopped ? "Stopped" : MODE_LABEL[gm.phase]}
          calm={calm}
          onCalm={() => setCalm(!calm)}
          stopped={stopped}
          onKill={toggleKill}
          editing={editing}
          onEdit={toggleEdit}
          onTheme={() => selectTab("themes")}
        />
        {stopped && (
          <StationAlert tone="alert" role="status">
            Monitoring is stopped. Nothing is being sampled until you press the power button again.
          </StationAlert>
        )}

        {pageNote(tab) ? (
          pages[tab as PageTabId]()
        ) : (
          <div id={tab}>
            {shown.length === 0 && (
              <StationAlert tone="notice" role="status">
                No cards on this page. Press Edit layout, then add the ones that belong here.
              </StationAlert>
            )}
            <CardCtxContext.Provider value={ctx}>
              <MemoDashboard
                editing={editing}
                free={freeMove}
                layouts={shownLayouts}
                onLayouts={onLayouts}
                onBreakpoint={onBreakpoint}
                instances={shown}
                render={renderCard}
                onRemove={dash.remove}
                onLook={dash.setLook}
                onDropCard={dash.add}
              />
            </CardCtxContext.Provider>
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
      {editing && picking && <CardPicker tab={tab} instances={dash.instances} onAdd={(t) => dash.add(t)} onClose={() => setPicking(false)} />}
    </StationContext.Provider>
  );
}
