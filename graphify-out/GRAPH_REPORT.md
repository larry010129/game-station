# Graph Report - game station  (2026-11-15)

## Corpus Check
- 333 files · ~224,050 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 9, (none) 4, .example 1)

## Summary
- 2459 nodes · 6818 edges · 101 communities (92 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App State & Pages
- Cards & State
- CMS Server Store
- UI Components
- Brag Video Build
- Counterwatch Parser
- Dashboard Cards A
- Dashboard Cards B
- Boot Screen
- Themes & Pages State
- Service Config & Tests
- CMS Package
- Service Library & Sidecar
- Service Index
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 93
- Community 94
- Community 100

## God Nodes (most connected - your core abstractions)
1. `cn()` - 48 edges
2. `StationApp()` - 46 edges
3. `Card()` - 46 edges
4. `Empty()` - 43 edges
5. `api()` - 42 edges
6. `writeJson()` - 41 edges
7. `cn()` - 40 edges
8. `GachaModal()` - 36 edges
9. `readString()` - 36 edges
10. `readJson()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `feedOf()` --calls--> `normalizeGame()`  [EXTRACTED]
  app/service/index.mjs → app/service/games.mjs
- `ensure()` --indirect_call--> `log()`  [INFERRED]
  app/service/media.mjs → app/service/index.mjs
- `recycle()` --indirect_call--> `log()`  [INFERRED]
  app/service/media.mjs → app/service/index.mjs
- `CardBoundary()` --indirect_call--> `removeKey()`  [INFERRED]
  app/src/components/ErrorBoundary.tsx → app/src/lib/storage.ts
- `GachaModal()` --indirect_call--> `getThemeCatalogVersion()`  [INFERRED]
  app/src/components/GachaModal.tsx → app/src/state/themeCatalog.ts

## Import Cycles
- None detected.

## Communities (101 total, 9 thin omitted)

### Community 0 - "App State & Pages"
Cohesion: 0.06
Nodes (78): JoinPatreonButton(), PatreonSection(), TIERS, writeJson(), BuyCreditsPage(), displayUrl(), SupportConfirmDialog(), perHour() (+70 more)

### Community 1 - "Cards & State"
Cohesion: 0.05
Nodes (65): CalendarCard, DAY, DOW, MONTH, atLocal(), CalendarPage(), CalEvent, calFocus (+57 more)

### Community 2 - "CMS Server Store"
Cohesion: 0.07
Nodes (62): collectAssetPaths(), draftToContentBundle(), isCmsDraft(), packToGacha(), pctMap(), WEIGHT_KEYS, draftApiPlugin(), releaseHostPlugin (+54 more)

### Community 3 - "UI Components"
Cohesion: 0.08
Nodes (48): Badge(), BadgeProps, badgeVariants, Button, ButtonProps, buttonVariants, Card, CardContent (+40 more)

### Community 4 - "Brag Video Build"
Cohesion: 0.08
Nodes (39): brush_state(), card_image(), clamp(), draw_caption(), draw_char(), draw_modal(), draw_page(), draw_tile() (+31 more)

### Community 5 - "Counterwatch Parser"
Cohesion: 0.09
Nodes (59): ARTIFACT, createCounterwatch(), artifactHeaders(), endpoint(), ensureModeSlice(), fillPicks(), heroCacheKey(), heroDetail() (+51 more)

### Community 6 - "Dashboard Cards A"
Cohesion: 0.13
Nodes (53): Signal, signal(), BestPicksCard, CmpBar(), Dots(), ApexProfileBody(), HeroProfileCard, MatchupList() (+45 more)

### Community 7 - "Dashboard Cards B"
Cohesion: 0.11
Nodes (52): ago(), clean(), CostCard, DiscordCard, DiscordGuild, DiscordNotes(), iconFor(), LibraryCard (+44 more)

### Community 8 - "Boot Screen"
Cohesion: 0.07
Nodes (46): BootDemo(), CELLS, STEPS, BootScreen(), headline(), reducedMotion(), STATUS_WORD, SystemsList() (+38 more)

### Community 9 - "Themes & Pages State"
Cohesion: 0.07
Nodes (46): ShimmerButton(), BLANK, DICE_FACES, DICE_PIPS, FIELDS, LockedThemeCard(), Look, paint() (+38 more)

### Community 10 - "Service Config & Tests"
Cohesion: 0.09
Nodes (39): DEFAULTS, isHttpUrl(), isObj(), isStr(), listKey(), loadConfig(), mergeBuiltInList(), pruneRetired() (+31 more)

### Community 11 - "CMS Package"
Cohesion: 0.06
Nodes (43): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, lucide-react@^1.73.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.0, tailwind-merge@^3.7.0 (+35 more)

### Community 12 - "Service Library & Sidecar"
Cohesion: 0.08
Nodes (28): dest, outDir, root, serviceSrc, stage, { version }, defaultLaunch(), BNET (+20 more)

### Community 13 - "Service Index"
Cohesion: 0.05
Nodes (36): ai, config, cost, discord, feedApex, feedOf(), feedOw, gameMode (+28 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (40): AiResearchCardM, AlertsPanelM, BestPicksCardM, CalendarCardM, CARD_VIEWS, CardCtxContext, CardView(), CostCardM (+32 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (35): APEX_APP_ID, OVERWATCH_APP_ID, VERSION, APEX_FEED_DEFAULTS, feedCacheFileFor(), feedConfigFor(), GAME_IDS, normalizeGame() (+27 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (27): BannerArtPreview(), bannerArtUrl(), BannersPage(), add(), newBanner(), ItemsPage(), PreviewPage(), ReleasesPage() (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (26): Badge(), BadgeProps, badgeVariants, Button, ButtonProps, buttonVariants, Card, CardContent (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (33): archetypeForClass(), buildLegends(), CACHE_FILE, CLASS_ARCHETYPE, createApexMeta(), gunsList(), pull(), pullLegends() (+25 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (30): contentText, root, signed, ApplyResult, applySignedRelease(), changelogFromBundle(), normalizeThemes(), AppliedRelease (+22 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (34): alphaOf(), APPLIED, applyPalette(), asPalette(), browserColor(), contrast(), cssVars(), flatten() (+26 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (21): APP_FILE, AUTH(), base(), createPatreon(), accessToken(), check(), tokenRequest(), CREATOR (+13 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (29): GameModeProps, STEP_WORD, PATH, PLATFORM_NAME, PlatformIcon(), platformOf(), builtinRows(), Kind (+21 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (28): createItem(), createTheme(), defaultItemName(), defaultPalette(), duplicateItem(), duplicateTheme(), ITEM_KINDS, nextItemId() (+20 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (26): apiBase, applyStep(), failure(), get(), loadMachine(), loadProfiles(), post(), readFeed() (+18 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (22): createCost(), refresh(), STANDING, bad(), exeList(), createSysStats(), refresh(), SCRIPT (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (26): BUNDLED_CONTENT, itemsOfKind(), brandDaysLeft(), cleanGacha(), drawMany(), DrawOwned, DrawPity, emptyGacha() (+18 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (24): VaultPage, DiscordToasts, Icon(), IconName, PATHS, NavSettings(), NavTabsApi, NotificationCenter() (+16 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (29): devDependencies, autoprefixer@^10.6.2, postcss@^8.5.33, tailwindcss@^3.4.19, @tauri-apps/cli@^2.5.0, @types/node@^24.19.2, @types/react@^18.3.12, @types/react-dom@^18.3.1 (+21 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (24): DEFAULT_LIST, isItems(), isText(), Item, NotesCard, City, DEFAULT_CITIES, Headline() (+16 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (24): Box, Props, StationOption, addPane(), clampRatio(), cleanSplit(), closePane(), focusPane() (+16 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (26): DENSITIES, Props, ROWS, Slide, ThemeTune(), download(), LayoutManager(), Props (+18 more)

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (29): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, lucide-react@^1.73.0, @radix-ui/react-dialog@^1.3.1, @radix-ui/react-dropdown-menu@^2.2.1, @radix-ui/react-label@^2.1.17, @radix-ui/react-select@^2.4.1 (+21 more)

### Community 33 - "Community 33"
Cohesion: 0.20
Nodes (24): createFeed(), fetchText(), pull(), refresh(), resolveYouTube(), start(), sleep(), sourceKey() (+16 more)

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (24): BuyCreditsPage, CreditsPage, MemoDashboard, MODE_LABEL, QuestsPage, StationApp(), TabBody(), ThemesPage (+16 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (25): App(), isTauri, labelFor(), Listed, listMonitors(), MONITOR_KEY, MonitorChoice, MonitorPref (+17 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (27): APEX_ARCH_AXES, ARCH_COLORS, ArchetypeRadar(), CombatRadar(), OW_ARCH_AXES, polar(), poly(), STAT_ROWS (+19 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (22): AiResearchCard, Items(), LEAK_LOAD_LINES, LeakFeedLoading(), SEASON_LOAD_LINES, untilWord(), FeedPanel, useInterval() (+14 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (24): AUTH_ERROR, AUTO_FILE, buildPrompt(), commandExists(), createAi(), execute(), defaultEngineId(), downgradeSpeculative() (+16 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (24): gachaBannerIsNew(), Props, ThemePanel(), useNav(), readJson(), removeKey(), getThemeCatalogVersion(), subscribeThemeCatalog() (+16 more)

### Community 40 - "Community 40"
Cohesion: 0.17
Nodes (25): closeColumnGaps(), COLS, DEFAULT_LAYOUTS, defaultInstances(), defaultLook(), mins(), newBox(), packBoxes() (+17 more)

### Community 41 - "Community 41"
Cohesion: 0.08
Nodes (25): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+17 more)

### Community 42 - "Community 42"
Cohesion: 0.09
Nodes (16): @fontsource/outfit@^5.1.0, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/lora@^5.3.0, @fontsource-variable/plus-jakarta-sans@^5.3.0, @fontsource-variable/space-grotesk@^5.3.0, Pending, ToastContext (+8 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (20): Options, GROUPS, NavTab, GROUPS, matchesQuery(), Props, Props, CARD_MIME (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.19
Nodes (21): BANNER, featuredDrawableIds(), GachaModal(), lookOf(), MainTab, markBannerSeen(), oddsRows(), Phase (+13 more)

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (20): getPersistMode(), listReleases(), loadDraft(), loadLocalReleases(), PersistMode, publishDraft(), saveDraft(), tryFetch() (+12 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (18): react-grid-layout@^1.5.4, BOTTOM, Box, BuiltinTabId, CARD_NAMES, CORE, DEFAULT_ON, EXTRA (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.24
Nodes (18): at(), buildGameEvents(), dayOf(), estimateUpcoming(), isNotable(), median(), pad(), plusDays() (+10 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+12 more)

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (19): num(), parseGateway(), parseNvidiaLine(), parsePingMs(), parseTypeperfLine(), createSensors(), applyStreams(), cpuLoadFallback() (+11 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (16): instanceKeys(), resetKeys(), SHARED, Cell, Dashboard(), Grid, revealCard(), BREAKPOINTS (+8 more)

### Community 51 - "Community 51"
Cohesion: 0.20
Nodes (17): BAR, capsuleTint(), GachaStage(), labels(), px(), SCAN, Slot(), Tile() (+9 more)

### Community 52 - "Community 52"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+11 more)

### Community 53 - "Community 53"
Cohesion: 0.16
Nodes (7): CRASH_WINDOW_MS, createLifecycle(), MAX_CRASHES, shortStack(), setup(), mk(), createToasts()

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (15): msg(), PatronMenu(), cache, checkPatreon(), Entitlement, listeners, NONE, patreonLogin() (+7 more)

### Community 55 - "Community 55"
Cohesion: 0.21
Nodes (15): DEV_CONTENT_PUBLIC_KEY_PEM, DEV_CONTENT_PUBLIC_KEY_SPKI_B64, canonicalJson(), ContentBundle, ContentReleaseManifest, CurrentReleaseInfo, SignedManifest, sortKeys() (+7 more)

### Community 56 - "Community 56"
Cohesion: 0.20
Nodes (11): OddsPieChart(), Slice, SLICE_COLORS, slicesFrom(), OddsPage(), nearly100(), PackId, PackWeightsPct (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.24
Nodes (16): easternEvening(), easternLabel(), fmt(), hourStats(), hourWord(), isYmd(), NotesLink(), officialPatchUrl() (+8 more)

### Community 58 - "Community 58"
Cohesion: 0.16
Nodes (14): d3-geo@^3.1.2, topojson-client@^3.1.0, world-atlas@^2.0.2, CENTER, Crowd, CROWD, crowdLevel(), fmt() (+6 more)

### Community 59 - "Community 59"
Cohesion: 0.23
Nodes (12): bad(), buildCall(), createClient(), createWaveLink(), read(), decodeFrames(), encodeFrame(), num() (+4 more)

### Community 60 - "Community 60"
Cohesion: 0.24
Nodes (13): Clock(), Props, TopBar, GAME_IDS, GameId, GamePack, GAMES, isGameId() (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (9): imgCache, proxyApexImg(), WEAPON_ALS_ICONS, cleanStep(), cleanMemory(), fail(), SCRIPT, createRoutes() (+1 more)

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (13): createDiscord(), authenticate(), connect(), openPipe(), read(), send(), token(), decodeFrames() (+5 more)

### Community 63 - "Community 63"
Cohesion: 0.25
Nodes (14): attempt(), createGameMode(), applyLocked(), describeProfiles(), ensureOverwatch(), locked(), perform(), recoverIfNeeded() (+6 more)

### Community 64 - "Community 64"
Cohesion: 0.20
Nodes (14): fig(), pingTone(), readVerdictMetrics(), toneClass(), useVerdictMetrics(), verdict(), VERDICT_DEFAULT, VERDICT_IDS (+6 more)

### Community 65 - "Community 65"
Cohesion: 0.30
Nodes (13): DeviceProps, DeviceTile(), LoadMeter(), LoadTile(), StatMeter(), StatRing(), UplinkTile(), dash() (+5 more)

### Community 66 - "Community 66"
Cohesion: 0.13
Nodes (13): BRAND_THEME_IDS, CrystalValues, ItemDef, ItemKind, ITEMS, ItemTier, nearly(), oneTimeItemsForPack() (+5 more)

### Community 67 - "Community 67"
Cohesion: 0.21
Nodes (5): kill_sidecar(), plain(), run(), Sidecar, start_service()

### Community 68 - "Community 68"
Cohesion: 0.27
Nodes (10): App(), BootGate(), CMS_NAV, CmsNavItem, PersistFooterBadges(), SidebarBrand(), SidebarNav(), SidebarNavLink() (+2 more)

### Community 69 - "Community 69"
Cohesion: 0.23
Nodes (10): createNetStats(), tick(), parseWifi(), REGIONS, summarize(), tcpMs(), closePolitely(), getGpuPreference() (+2 more)

### Community 70 - "Community 70"
Cohesion: 0.26
Nodes (10): bad(), createSpotify(), accessToken(), call(), playlists(), readStatus(), status(), tokenRequest() (+2 more)

### Community 71 - "Community 71"
Cohesion: 0.24
Nodes (6): fakeChild(), fakeSpawner(), flush(), mk(), timeoutOnce(), mk()

### Community 72 - "Community 72"
Cohesion: 0.31
Nodes (9): BUNDLED_RELEASE_NUMBER, fetchChangedFiles(), fetchCurrentNumber(), fetchSignedManifest(), getText(), joinUrl(), ContentUpdateStatus, lastStatus (+1 more)

### Community 73 - "Community 73"
Cohesion: 0.27
Nodes (12): cleanItems(), emptyItems(), grantInto(), grantItem(), isNum(), isRecord(), ITEMS_KEY, ItemsState (+4 more)

### Community 74 - "Community 74"
Cohesion: 0.15
Nodes (11): brandThemeIds, DEMO, __dirname, draft, items, outDir, outFile, root (+3 more)

### Community 75 - "Community 75"
Cohesion: 0.23
Nodes (11): TrackedSource, crawlSeconds(), CreditHalf(), CreditsPage(), MADE_BY, Source, SOURCES, THANKS_INFO (+3 more)

### Community 76 - "Community 76"
Cohesion: 0.25
Nodes (6): AppBoundary(), AppErrorScreen(), CardBoundary(), ErrorBoundary, Props, State

### Community 77 - "Community 77"
Cohesion: 0.18
Nodes (10): ContentBundle, ContentReleaseManifest, CurrentReleaseInfo, GachaContentLike, ItemDefLike, PackTableLike, PublishResult, ReleaseFileEntry (+2 more)

### Community 78 - "Community 78"
Cohesion: 0.38
Nodes (8): addSource(), bundleItems(), isX(), RANK, sameUrl(), similar(), STOP, tokens()

### Community 79 - "Community 79"
Cohesion: 0.31
Nodes (8): items(), list, hostOf(), matches(), norm(), trustedMatch(), trustNote(), X_HOSTS

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (8): emptySample(), readSample(), NewEvent, useEvents(), createStore(), Options, staleSample(), useStation()

### Community 81 - "Community 81"
Cohesion: 0.22
Nodes (9): scripts, build, dev, live, prepare:sidecar, preview, service, tauri (+1 more)

### Community 82 - "Community 82"
Cohesion: 0.39
Nodes (8): appName(), MediaCard, mmss(), Next(), Pause(), Play(), Prev(), MediaStatus

### Community 83 - "Community 83"
Cohesion: 0.28
Nodes (7): getAlertPreviewSrc(), localPreviewByItemId, onStopped, PreviewButton(), toggle(), setLocalAlertPreview(), stopActive()

### Community 84 - "Community 84"
Cohesion: 0.39
Nodes (4): createServer(), DEFAULT_ORIGINS, readBody(), send()

### Community 85 - "Community 85"
Cohesion: 0.39
Nodes (6): css(), page, ps(), settle(), step(), webviewMem()

### Community 86 - "Community 86"
Cohesion: 0.43
Nodes (6): StatCard(), StatCardGroup(), StatCardProps, DashboardPage(), LINKS, packWeightSum()

### Community 87 - "Community 87"
Cohesion: 0.62
Nodes (7): createMedia(), command(), ensure(), failWaiting(), raw(), recycle(), send()

### Community 88 - "Community 88"
Cohesion: 0.60
Nodes (5): ago(), atomEntry(), fakeFetch(), rss(), rssItem()

### Community 89 - "Community 89"
Cohesion: 0.53
Nodes (3): FREE_LOOK_COUNT, isLookLocked(), lockedIdsOf()

### Community 90 - "Community 90"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 91 - "Community 91"
Cohesion: 0.40
Nodes (4): h, idx, interesting, urls

## Knowledge Gaps
- **1 isolated node(s):** `command-station`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 618 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `removeKey()` connect `Community 39` to `Cards & State`, `Community 34`, `Community 40`, `Community 43`, `Community 76`, `Community 19`, `Community 57`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `command-station` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `App State & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05745658835546476 - nodes in this community are weakly interconnected._
- **Why does `getCatalog()` connect `Themes & Pages State` to `Community 19`, `Community 39`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Cards & State` be split into smaller, more focused modules?**
  _Cohesion score 0.05160662122687439 - nodes in this community are weakly interconnected._
- **Why does `hydrateContentFromStore()` connect `Community 19` to `Community 72`, `Community 42`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `CMS Server Store` be split into smaller, more focused modules?**
  _Cohesion score 0.06997408367271381 - nodes in this community are weakly interconnected._