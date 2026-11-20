import { Suspense, lazy, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BootScreen } from "./boot/BootScreen";
import { useBoot } from "./boot/useBoot";
import type { BootState } from "./boot/types";
import { appVersionOf } from "./content/contentSettings";
import { useExeUpdate } from "./state/useExeUpdate";
import { useContentStatus, useUpdateGate } from "./state/useUpdateGate";
import { runContentUpdate } from "./content/updateContent";
import { CONTENT } from "./boot/bootSteps";
import { openNewsBoard } from "./state/useNewsRead";
import { Dashboard } from "./layout/Dashboard";
import { EditBar } from "./layout/EditBar";
import { LayoutManager } from "./layout/LayoutManager";
import { TABS, instancesForTab, layoutsFor, layoutsForTab, pageNote, tabCardTypes, tabOf, type CardId, type CardInstance, type PageTabId, type TabId } from "./layout/layouts";
import { CardPicker } from "./layout/CardPicker";
import { CardCtxContext, CardView, type CardCtx } from "./layout/registry";
import { StationContext } from "./state/useApi";
import { useSpotlight } from "./lib/useSpotlight";
import { readString, removeKey, writeString } from "./lib/storage";
import { CalendarPage, calFocus } from "./cards/CalendarPage";
// These three pages are opened rarely, so they load when first opened rather than at start-up.
const CreditsPage = lazy(() => import("./pages/CreditsPage").then((m) => ({ default: m.CreditsPage })));
const QuestsPage = lazy(() => import("./pages/QuestsPage").then((m) => ({ default: m.QuestsPage })));
const BuyCreditsPage = lazy(() => import("./pages/BuyCreditsPage").then((m) => ({ default: m.BuyCreditsPage })));
const ThemesPage = lazy(() => import("./pages/ThemesPage").then((m) => ({ default: m.ThemesPage })));
const DrawPage = lazy(() => import("./pages/DrawPage").then((m) => ({ default: m.DrawPage })));
const VaultPage = lazy(() => import("./pages/VaultPage").then((m) => ({ default: m.VaultPage })));
const WikiPage = lazy(() => import("./pages/WikiPage").then((m) => ({ default: m.WikiPage })));
const NewsPage = lazy(() => import("./pages/NewsPage").then((m) => ({ default: m.NewsPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage").then((m) => ({ default: m.AchievementsPage })));
const CheckinPage = lazy(() => import("./pages/CheckinPage").then((m) => ({ default: m.CheckinPage })));
const PassPage = lazy(() => import("./pages/PassPage").then((m) => ({ default: m.PassPage })));
const PerksPage = lazy(() => import("./pages/PerksPage").then((m) => ({ default: m.PerksPage })));
import { useSmartAlerts } from "./state/useSmartAlerts";
import { useDashboard } from "./layout/useDashboard";
import { SplitView } from "./layout/SplitView";
import { MAX_PANES, type Pane } from "./layout/split";
import { useSplit } from "./layout/useSplit";
import { useNav } from "./layout/useNav";
import { Backdrop } from "./components/Backdrop";
import { usePlayers } from "./state/usePlayers";
import { TopBar } from "./components/TopBar";
import { refreshPatreon } from "./state/patreon";
import { trackQuest, useQuestTracking } from "./state/useQuests";
import { ProfilePanel } from "./components/ProfilePanel";
import { UpdateBanner, UpdateGate, WhatsNewBanner } from "./components/UpdateGate";
import { AchievementWatcher } from "./state/useAchievements";
import { PassWatcher } from "./state/useSeasonPass";
import { PlayerLevelWatcher } from "./state/usePlayerLevel";
import { listNotices, useNewsRead } from "./state/useNewsRead";
import { unreadCount } from "./state/newsRead";
import { useCheckinReady } from "./state/useCheckinBoard";
import { useLang, useT } from "./lib/i18n";
import { useToast } from "./state/Toast";
import { isQuiet, usePerformanceGate, useStoredFlag } from "./state/useEnvironment";
import { useEvents, type NewEvent } from "./state/useEvents";
import { useFeed } from "./state/useFeed";
import { PLATFORM_NAME, platformOf } from "./components/PlatformIcon";
import { useActiveGame } from "./state/useActiveGame";
import { useGameMode, type Phase } from "./state/useGameMode";
import { useSample, useStation } from "./state/useStation";
import { useLeakAlerts } from "./state/useLeakAlerts";
import { useTheme } from "./state/useTheme";
import { useToasts } from "./state/useToasts";
import { NoticeBar } from "./components/NoticeBar";
import { useMonitor } from "./state/useMonitor";
import { useWindowView } from "./state/useWindowView";
import type { FeedItem, StationInfo } from "./lib/types";
import { GAME_IDS, GAMES } from "./lib/games";
import { api } from "./lib/api";
import { useApplyCardSkin } from "./state/cardSkinStore";
import { recordFreePlaced } from "./state/widgetStore";

const MODE_LABEL: Record<Phase, string> = {
  off: "Standby",
  applying: "Applying",
  on: "Game mode",
  restoring: "Restoring",
};

export function App() {
  const [info, setInfo] = useState<StationInfo | null>(null);
  const [cards, setCards] = useState<CardId[] | null>(null);
  const [covered, setCovered] = useState(true);
  const look = useTheme();
  const windowView = useWindowView();
  const onInfo = useCallback((p: StationInfo) => setInfo(p), []);
  const boot = useBoot({ cards, onInfo });

  // A release went live: the loading screen comes back and runs the update (the app is not loaded in meanwhile).
  // When it is installed the button only restarts the app. A new exe (the other update) has its own popup and wins.
  const T = useT();
  const gate = useUpdateGate();
  const exe = useExeUpdate();
  const { status } = useContentStatus();
  const updating = gate.mustReload && !exe.blocking;
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (updating) void runContentUpdate();
  }, [updating, tries]);
  const installed = gate.installed;
  const failedUpdate = !installed && (status.state === "failed" || status.state === "rejected");
  const version = gate.number != null ? appVersionOf(gate.number) : null;
  const cover: BootState = updating
    ? {
        ...boot,
        phase: "update",
        progress: installed ? 1 : 0.6,
        problem: null,
        steps: boot.steps.map((st) => (st.id === CONTENT ? { ...st, status: installed ? "online" : failedUpdate ? "failed" : "linking" } : st)),
        update: {
          line: installed ? (version ? `${T("update.title")} · ${T("update.badge", { n: version })}` : T("update.title")) : failedUpdate ? T("update.failed") : T("update.applying"),
          hint: installed ? T("update.restartBody") : failedUpdate ? T("update.failedHint") : T("update.applyingHint"),
          action: installed
            ? { label: T("update.restart"), onClick: () => window.location.reload() }
            : failedUpdate
              ? { label: T("update.retry"), onClick: () => setTries((n) => n + 1) }
              : undefined,
        },
      }
    : boot;

  // The dashboard mounts as soon as the start-up info exists and fills in under the cover.
  const under = useRef<HTMLDivElement>(null);
  const locked = covered || updating;
  useLayoutEffect(() => {
    if (under.current) under.current.inert = locked;
  }, [locked, info]);

  return (
    <>
      {info && (
        <div ref={under} className={covered ? "boot-under" : "boot-reveal"} aria-hidden={locked || undefined}>
          <StationApp info={info} look={look} windowView={windowView} onCards={setCards} />
        </div>
      )}
      {(covered || updating) && <BootScreen state={cover} image={look.image} onExited={() => setCovered(false)} />}
    </>
  );
}

const NAME_KEY = "cs.displayName";
const FREE_KEY = "cs.freeMove";

/** The dashboard grid, memoised so it redraws only when its own inputs change (cards read ctx from context, not from props). */
const MemoDashboard = memo(Dashboard);

function StationApp({
  info,
  look,
  windowView,
  onCards,
}: {
  info: StationInfo;
  look: ReturnType<typeof useTheme>;
  windowView: ReturnType<typeof useWindowView>;
  /** The card types on the current tab, for the boot checklist. */
  onCards?: (types: CardId[]) => void;
}) {
  const [displayName, setDisplayName] = useState(() => readString(NAME_KEY) ?? "");
  const gate = usePerformanceGate();
  const toast = useToast();
  const [calm, setCalm] = useStoredFlag("cs.reduceMotion", false);
  // The equipped Card Pack skin goes on the page root, where styles/cardskins.css dresses every dashboard card.
  useApplyCardSkin();
  const [stopped, setStopped] = useState(false);

  const seedEvents = useMemo<NewEvent[]>(() => [{ kind: "info", text: "Sensors linked (this pc), sampling every 1 s", t: Date.now() - 2_000 }], []);
  const { events, add } = useEvents(seedEvents);
  const toasts = useToasts();
  const gm = useGameMode(info, add);

  // Slower polling while a game is running, slowest while the window is hidden.
  const intervalMs = gate.hidden ? 5000 : gm.phase === "on" ? 3000 : 1000;
  const store = useStation({ stopped, intervalMs, onEvent: add });
  // Tell the service so nvidia-smi / typeperf match: pause on kill switch, slow when hidden.
  useEffect(() => {
    void api("/api/pace", { paused: stopped, slow: gate.hidden }).catch(() => {});
  }, [stopped, gate.hidden]);
  // Only the running game is read here; the rest of each reading is picked up by the cards that show it.
  const game = useSample(store, (s) => s.game);
  useQuestTracking(game);
  // Mirror the Patreon unlocks (the service re-checks Patreon on its own schedule).
  useEffect(() => {
    void refreshPatreon();
    const id = window.setInterval(() => void refreshPatreon(), 5 * 60_000);
    return () => window.clearInterval(id);
  }, []);
  const activeGame = useActiveGame();
  const onNewStories = useCallback(
    (fresh: FeedItem[]) => {
      const stories = fresh.filter((s) => s.kind !== "leak");
      if (!stories.length) return;
      for (const s of stories.slice(0, 3)) add({ kind: "info", text: `New on ${PLATFORM_NAME[platformOf(s)]}: ${s.title}`, ...(s.url ? { url: s.url } : {}) });
      const name = activeGame.pack.label;
      toast(stories.length === 1 ? `1 new ${name} story` : `${stories.length} new ${name} stories`);
    },
    [add, toast, activeGame.pack.label],
  );
  const feed = useFeed(gm.phase === "on" || gate.hidden, onNewStories, activeGame.game);
  const players = usePlayers(gm.phase === "on" || gate.hidden, activeGame.game);
  useLeakAlerts(gm.phase === "on" || gate.hidden, (fresh) => {
    for (const l of fresh.slice(0, 3)) add({ kind: "info", text: `New leak: ${l.title}`, ...(l.url ? { url: l.url } : {}) });
    toast(fresh.length === 1 ? "1 new leak found" : `${fresh.length} new leaks found`);
  }, activeGame.game);

  useSmartAlerts(store, stopped, (text) => {
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
  const nav = useNav();
  // Home is the page the app opens on. In split view `tab` is the focused pane's page.
  const known = useMemo(() => new Set([...TABS.map((t) => t.id), ...nav.custom.map((c) => c.id)]), [nav.custom]);
  const split = useSplit(known);
  const tab = split.activeTab;
  // Opening Calendar or the Vault is a one-time starter quest.
  useEffect(() => {
    if (tab === "calendar") trackQuest.once("calendar");
    if (tab === "vault") trackQuest.once("vault");
  }, [tab]);
  const [freeMove, setFreeMove] = useState(() => readString(FREE_KEY) === "1");
  const chooseMove = useCallback((mode: "snap" | "free") => {
    setFreeMove(mode === "free");
    writeString(FREE_KEY, mode === "free" ? "1" : "0");
  }, []);
  const monitor = useMonitor();
  useSpotlight();
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [layoutsOpen, setLayoutsOpen] = useState(false);
  // Each pane has its own width; only the focused pane's decides whether the layout can be edited.
  const [phones, setPhones] = useState<Record<number, boolean>>({});
  const phoneWidth = !!phones[split.active];
  const onBreakpoint = useCallback((paneId: number, bp: string) => setPhones((p) => (!!p[paneId] === (bp === "sm") ? p : { ...p, [paneId]: bp === "sm" })), []);
  useEffect(() => {
    if (phoneWidth) setEditing(false);
  }, [phoneWidth]);

  // Undo only ever reverses this editing session, so it starts empty each time.
  const { clearHistory, undo, redo } = dash;
  useEffect(() => {
    if (editing) clearHistory();
    else setLayoutsOpen(false);
  }, [editing, clearHistory]);

  useEffect(() => {
    if (!editing) return;
    // An Escape that already closed a dropdown is not also a request to leave editing.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) return setEditing(false);
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "z") (e.shiftKey ? redo : undo)();
      else if (k === "y") redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, undo, redo]);

  /** The top bar's page tabs change the focused pane's page. */
  const selectTab = useCallback(
    (next: TabId) => {
      split.setTab(split.active, next);
      if (pageNote(next)) {
        setEditing(false);
        setPicking(false);
      }
      window.scrollTo(0, 0);
    },
    [split.setTab, split.active],
  );
  const focusPane = useCallback(
    (id: number) => {
      split.focus(id);
      // A page has no card layout to edit.
      if (pageNote(split.panes.find((p) => p.id === id)?.tab ?? "")) {
        setEditing(false);
        setPicking(false);
      }
    },
    [split.focus, split.panes],
  );
  const setPaneTab = useCallback(
    (id: number, next: TabId) => {
      split.setTab(id, next);
      if (pageNote(next)) {
        setEditing(false);
        setPicking(false);
      }
    },
    [split.setTab],
  );

  const [profileOpen, setProfileOpen] = useState(false);
  const openProfile = useCallback(() => setProfileOpen(true), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const newsRead = useNewsRead();
  const notices = useMemo(listNotices, []);
  const newsUnread = unreadCount(newsRead.state, feed.items) + unreadCount(newsRead.state, notices);
  const checkinReady = useCheckinReady();
  const T = useT();
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /** Card tabs, the tabs the user added, then the page tabs. Game tab label follows the active game. */
  const tabs = useMemo(
    () =>
      [...TABS.filter((t) => t.kind === "cards"), ...nav.custom, ...TABS.filter((t) => t.kind === "page" && t.id !== "themes" && t.id !== "vault" && t.id !== "buy-credits" && t.id !== "profile" && t.id !== "achievements")].map(({ id, label }) => ({
        id,
        label: id === "overwatch" ? activeGame.pack.tabLabel : T(`tab.${id}`, undefined, label),
        ...(id === "news" ? { count: newsUnread } : {}),
        ...(id === "checkin" ? { count: checkinReady ? 1 : 0 } : {}),
      })),
    [nav.custom, activeGame.pack.tabLabel, newsUnread, checkinReady, T],
  );
  // A pane can show any page, including Themes, Vault, and Support, which the top bar reaches by control.
  const paneOptions = useMemo(
    () =>
      [...tabs, ...TABS.filter((t) => t.id === "themes" || t.id === "vault" || t.id === "buy-credits" || t.id === "profile" || t.id === "achievements").map(({ id, label }) => ({ id, label: T(`tab.${id}`, undefined, label) }))].map((t) => ({
        value: t.id,
        label: t.label,
      })),
    [tabs, T],
  );
  const openPane = useCallback(() => split.add(tabs.map((t) => t.id)), [split.add, tabs]);
  const removeNavTab = useCallback(
    (id: string) => {
      nav.removeTab(id);
      dash.dropTab(id);
      if (tab === id) selectTab("home");
    },
    [nav.removeTab, dash.dropTab, tab, selectTab],
  );
  // The card types each tab shows now, for the Vault's tab lists.
  const typesOn = useCallback((id: TabId) => tabCardTypes(id, dash.instances, nav.cards[id]), [dash.instances, nav.cards]);
  const setTabCard = useCallback(
    (id: TabId, type: CardId, on: boolean) => {
      const now = typesOn(id);
      if (on) {
        // A card that was never added has no copy to show yet.
        if (!dash.instances.some((i) => i.type === type)) dash.add(type);
        nav.setCards(id, [...now, type]);
      } else {
        nav.setCards(id, now.filter((t) => t !== type));
      }
    },
    [typesOn, dash.instances, dash.add, nav.setCards],
  );
  /** A card added from the Cards list (or dropped on a pane) lands on that tab and is remembered as one of its cards. */
  const addCard = useCallback(
    (tab: TabId, type: CardId, at?: { x: number; y: number }, bp: "lg" | "md" = "lg") => {
      const own = tab !== "home" && !pageNote(tab);
      dash.add(type, at, bp, own ? tab : undefined);
      if (!own) return;
      const chosen = nav.cards[tab];
      if (chosen ? !chosen.includes(type) : tabOf(type) !== tab) nav.setCards(tab, [...tabCardTypes(tab, dash.instances, chosen), type]);
    },
    [dash.add, dash.instances, nav.cards, nav.setCards],
  );

  const [trimming, setTrimming] = useState(false);
  const trimMemory = useCallback(async () => {
    setTrimming(true);
    try {
      const r = (await api("/api/cost/trim", {})) as { beforeMb?: number; afterMb?: number; freedMb?: number } | undefined;
      const freed = r?.freedMb ?? 0;
      toast(freed > 0 ? `App memory cleaned: ${r?.beforeMb} MB down to ${r?.afterMb} MB.` : "App memory is already lean.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      // A 404 means an older copy of the service is still running and answering on the same port.
      toast(/not found/i.test(msg) ? "An older Command Station service is still running. Close every copy of the app, then open it again." : msg || "Couldn't clean the app's memory.");
    } finally {
      setTrimming(false);
    }
  }, [toast]);

  const openCalendar = useCallback(
    (date?: string) => {
      calFocus.date = date ?? null;
      selectTab("calendar");
    },
    [selectTab],
  );

  const openDraw = useCallback(() => selectTab("draw"), [selectTab]);
  // A card placed while it is Free counts as owned, so a later Widget Pack lock in the CMS never takes it away.
  useEffect(() => {
    recordFreePlaced(dash.instances.map((i) => i.type));
  }, [dash.instances]);

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

  const ctx = useMemo<CardCtx>(
    () => ({
      info,
      store,
      players: { data: players.data, failed: players.failed },
      feed: { items: feed.items, error: feed.error, checking: feed.checking, checkNow: feed.checkNow },
      events,
      gm: { profiles: gm.profiles, profile: gm.profile, setProfileId: gm.setProfileId, phase: gm.phase, status: gm.status, start: gm.start, stop: gm.stop },
      stopped,
      toasts,
      onOpenCalendar: openCalendar,
      onOpenDraw: openDraw,
      onLook: dash.setLook,
    }),
    [store, players.data, players.failed, feed.items, feed.error, feed.checking, feed.checkNow, events, gm.profiles, gm.profile, gm.setProfileId, gm.phase, gm.status, gm.start, gm.stop, stopped, toasts, openCalendar, openDraw, dash.setLook],
  );
  // The grid gets a render function that never changes; each card reads `ctx` from context (see CardView).
  const renderCard = useCallback((inst: CardInstance): ReactNode => <CardView inst={inst} />, []);

  const quiet = isQuiet(gate, game);
  const splitting = split.panes.length > 1;
  const rootClass = ["page", quiet && "quiet", calm && "calm", splitting && "splitting"].filter(Boolean).join(" ");
  const stationValue = useMemo(
    () => ({ info, quiet: quiet || gm.phase === "on" || gate.hidden, game: activeGame.game, pack: activeGame.pack }),
    [quiet, gm.phase, gate.hidden, activeGame.game, activeGame.pack],
  );

  const renderPane = (p: Pane): ReactNode => (
    <TabBody
      key={p.id}
      tab={p.tab}
      paneId={p.id}
      active={p.id === split.active}
      editing={editing}
      free={freeMove}
      inPane={splitting}
      ctx={ctx}
      dash={dash}
      navCards={nav.cards}
      addCard={addCard}
      onBreakpoint={onBreakpoint}
      onCards={onCards}
      renderCard={renderCard}
      page={(id) => pages[id]()}
    />
  );

  // Each page tab is drawn by its own component. Only the open one is built.
  const pages: Record<PageTabId, () => ReactNode> = {
    vault: () => (
      <VaultPage
        onProfilesChanged={gm.refreshProfiles}
        look={look}
        windowView={windowView}
        monitor={monitor}
        displayName={displayName}
        onDisplayName={saveDisplayName}
        freeMove={freeMove}
        onMoveMode={chooseMove}
        toasts={toasts}
        navTabs={{ tabs: [...TABS.filter((t) => t.kind === "cards"), ...nav.custom].map(({ id, label }) => ({ id, label, custom: !TABS.some((t) => t.id === id) })), typesOn, setTabCard, addTab: nav.addTab, renameTab: nav.renameTab, removeTab: removeNavTab, resetCards: nav.resetCards, canAdd: nav.canAdd }}
        onOpenThemes={() => selectTab("themes")}
      />
    ),
    themes: () => <ThemesPage look={look} onOpenDraw={() => selectTab("draw")} />,
    draw: () => <DrawPage owned={look.unlocks} onWin={(id) => look.unlock(id)} />,
    wiki: () => <WikiPage owned={look.unlocks} onOpenDraw={() => selectTab("draw")} onOpenAchievements={() => selectTab("achievements")} onOpenPerks={() => selectTab("perks")} />,
    news: () => <NewsPage />,
    achievements: () => <AchievementsPage />,
    pass: () => <PassPage onNav={selectTab} />,
    perks: () => <PerksPage />,
    profile: () => <ProfilePage displayName={displayName} look={look.active} unlocked={look.unlocks.length} onNav={selectTab} />,
    calendar: () => <CalendarPage />,
    credits: () => <CreditsPage />,
    "buy-credits": () => <BuyCreditsPage />,
    quests: () => <QuestsPage onOpenThemes={() => selectTab("themes")} onOpenCheckin={() => selectTab("checkin")} onNav={selectTab} />,
    checkin: () => <CheckinPage onOpenDraw={() => selectTab("draw")} onNav={selectTab} />,
  };

  return (
    <StationContext.Provider value={stationValue}>
      <AchievementWatcher />
      <PassWatcher />
      <PlayerLevelWatcher />
      <UpdateGate />
      {profileOpen && <ProfilePanel displayName={displayName} newsUnread={newsUnread} onNav={selectTab} onClose={closeProfile} />}
      <Backdrop image={look.image} />
      <div className={rootClass}>
        <UpdateBanner />
        <TopBar
          tab={tab}
          tabs={tabs}
          onTab={selectTab}
          game={activeGame.game}
          games={GAME_IDS.map((id) => ({ id, label: GAMES[id].label }))}
          onGame={activeGame.setGame}
          displayName={displayName}
          modeLabel={stopped ? T("mode.stopped") : T(`mode.${gm.phase}`, undefined, MODE_LABEL[gm.phase])}
          calm={calm}
          onCalm={() => setCalm(!calm)}
          stopped={stopped}
          onKill={toggleKill}
          editing={editing}
          onEdit={toggleEdit}
          onTheme={() => selectTab("themes")}
          onVault={() => selectTab("vault")}
          onProfile={openProfile}
          onBuyCredits={() => selectTab("buy-credits")}
          onSplit={openPane}
          panes={split.panes.length}
          maxPanes={MAX_PANES}
          onTrim={trimMemory}
          trimming={trimming}
        />
        <WhatsNewBanner onOpen={() => { openNewsBoard("notices"); selectTab("news"); }} />
        {stopped && (
          <NoticeBar tone="alert">Monitoring is stopped. Nothing is being sampled until you press the power button again.</NoticeBar>
        )}

        {splitting ? (
          <SplitView
            panes={split.panes}
            active={split.active}
            cols={split.cols}
            rows={split.rows}
            options={paneOptions}
            onFocus={focusPane}
            onClose={split.close}
            onTab={setPaneTab}
            onResize={split.resize}
            render={renderPane}
          />
        ) : (
          renderPane(split.panes[0])
        )}
      </div>
      {editing && (
        <EditBar
          customised={tab === "home" ? dash.customised : dash.tabLayouts[tab] != null}
          hasSavedDefault={dash.hasSavedDefault}
          onSaveDefault={dash.saveAsDefault}
          onClearDefault={dash.clearDefault}
          onReset={() => {
            if (tab === "home") dash.reset();
            else dash.resetTab(tab);
            toast(tab === "home" ? "Layout reset to the default." : "This tab's layout reset.");
          }}
          onDone={() => {
            setEditing(false);
            setPicking(false);
          }}
          onCards={() => setPicking((p) => !p)}
          cardsOpen={picking}
          canUndo={dash.canUndo}
          canRedo={dash.canRedo}
          onUndo={dash.undo}
          onRedo={dash.redo}
          layoutName={dash.layoutSets.list.find((l) => l.id === dash.layoutSets.active)?.name}
          layoutsOpen={layoutsOpen}
          onLayouts={() => setLayoutsOpen((o) => !o)}
        />
      )}
      {editing && layoutsOpen && (
        <LayoutManager
          layouts={dash.layoutSets}
          snapshot={dash.snapshot}
          theme={{ active: look.active, tweaks: look.tweaks }}
          onSave={dash.saveLayoutAs}
          onSwitch={dash.switchLayout}
          onDelete={dash.deleteLayout}
          onTheme={look.applyShared}
          onClose={() => setLayoutsOpen(false)}
        />
      )}
      {editing && picking && <CardPicker tab={tab} all={tab in nav.cards || nav.custom.some((c) => c.id === tab)} instances={dash.instances} onAdd={(t) => addCard(tab, t)} onClose={() => setPicking(false)} />}
    </StationContext.Provider>
  );
}

/** One pane's page: the card grid for a card tab, or the page component. Edit mode reaches only the focused pane. */
function TabBody({
  tab,
  paneId,
  active,
  editing,
  free,
  inPane,
  ctx,
  dash,
  navCards,
  addCard,
  onBreakpoint,
  onCards,
  renderCard,
  page,
}: {
  tab: TabId;
  paneId: number;
  active: boolean;
  editing: boolean;
  free: boolean;
  inPane: boolean;
  ctx: CardCtx;
  dash: ReturnType<typeof useDashboard>;
  navCards: Record<string, CardId[]>;
  addCard: (tab: TabId, type: CardId, at?: { x: number; y: number }, bp?: "lg" | "md") => void;
  onBreakpoint: (paneId: number, bp: string) => void;
  onCards?: (types: CardId[]) => void;
  renderCard: (inst: CardInstance) => ReactNode;
  page: (id: PageTabId) => ReactNode;
}) {
  const isPage = pageNote(tab) != null;
  const shown = useMemo(() => instancesForTab(tab, dash.instances, dash.hidden, navCards[tab]), [dash.instances, dash.hidden, navCards, tab]);
  useEffect(() => {
    // Pages like Vault and Calendar have no cards to wait on.
    if (active) onCards?.(isPage ? [] : shown.map((inst) => inst.type));
  }, [active, isPage, shown, onCards]);
  const shownLayouts = useMemo(
    () => (tab === "home" ? layoutsFor(shown, dash.layouts) : layoutsForTab(shown, dash.layouts, dash.tabLayouts[tab])),
    [dash.layouts, dash.tabLayouts, shown, tab],
  );
  // The first time a tab opens it takes its own copy of the layout, so Home and the other tabs stop sharing positions.
  const ownLayout = tab === "home" || isPage ? true : dash.tabLayouts[tab] != null;
  useEffect(() => {
    if (!ownLayout) dash.updateTab(tab, shownLayouts, shown);
  }, [ownLayout, tab, shownLayouts, shown, dash.updateTab]);

  const updateVisible = dash.updateVisible;
  const onLayouts = useCallback(
    (next: Parameters<typeof updateVisible>[0]) => (tab === "home" ? updateVisible(next, shown) : dash.updateTab(tab, next, shown)),
    [updateVisible, dash.updateTab, shown, tab],
  );
  const onBp = useCallback((bp: string) => onBreakpoint(paneId, bp), [onBreakpoint, paneId]);
  const onDropCard = useCallback((type: CardId, at: { x: number; y: number }, bp: "lg" | "md") => addCard(tab, type, at, bp), [addCard, tab]);

  // Pages get the card context too, so a page can show a live dashboard card (the Wiki's showcase does).
  if (isPage)
    return (
      <CardCtxContext.Provider value={ctx}>
        <Suspense fallback={null}>{page(tab as PageTabId)}</Suspense>
      </CardCtxContext.Provider>
    );
  return (
    <div>
      {shown.length === 0 && (
        <NoticeBar>No cards on this page. Press Edit layout, then add the ones that belong here.</NoticeBar>
      )}
      <CardCtxContext.Provider value={ctx}>
        <MemoDashboard
          editing={editing && active}
          free={free}
          inPane={inPane}
          layouts={shownLayouts}
          onLayouts={onLayouts}
          onBreakpoint={onBp}
          instances={shown}
          render={renderCard}
          onRemove={dash.remove}
          onLook={dash.setLook}
          onLock={dash.setLocked}
          onDuplicate={(id, at, bp) => dash.duplicate(id, at, bp, tab === "home" ? undefined : tab)}
          onDropCard={onDropCard}
        />
      </CardCtxContext.Provider>
    </div>
  );
}
