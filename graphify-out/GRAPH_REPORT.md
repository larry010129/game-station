# Graph Report - game station  (2026-11-17)

## Corpus Check
- 323 files · ~599,599 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4201 nodes · 11382 edges · 163 communities (150 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 223 edges (avg confidence: 0.85)
- Token cost: 1,264,046 input · 0 output

## Community Hubs (Navigation)
- Brag Video Builder
- Calendar Card & Page
- Animated Sidebar UI
- Extra Cards (Discord, Library, Cost)
- Brand Unlock & Card Showcase
- Boot Signals & Chart Cards
- Draw Stage & Pack Contents
- CMS App Shell & Banner Art
- Counterwatch Meta Service
- Frontend API Client
- Notifications & Hardware Tiles
- CMS Content Tests
- Quests Engine & Page
- Card Pack & Credit Art
- Hardware & Network Stats
- Gacha Engine Core
- Dashboard Grid & Card Picker
- Painter Scene & Theme
- Service Entry (index.mjs)
- Check-in Board
- Season Pass
- AI & Feed Panels
- Economy Fixes & Card Skins
- Service Config Loader
- Featured Run Queue
- Signed Release Apply
- Perk Tree Code
- Apex Meta Service
- Overwatch Cards
- App Dependencies
- Theme Card Preview & Tabs
- App Dev Dependencies
- Boot Screen
- Draw Badges
- Vault Settings & Backup
- CMS Pool Order & Odds Chart
- Themes Page & Theme Tune
- News Feed Service
- Remotion Project Config
- AI Engine Service
- CMS Release HTTP API
- Repeat Rewards & Calendar Events
- Patreon Service
- Top Bar & Patron Menu
- Split Pane Layout
- Palette & Color Tokens
- Game Mode & Sessions
- Boot Steps
- Desktop Build Scripts
- Profile & Ranks
- Alert Sound Preview & Banners
- Game Constants
- Tauri Sidecar Shell (Rust)
- CMS Content API & Scheduler
- CMS UI Primitives
- App Root & Pages
- Perk Node Icon Sheet
- Scheduled Release Fetch
- Tool & World Clock Cards
- Monitor Placement
- Round-5 Review Reports
- Card Dev Guide: Core
- Look Access & Theme Panel
- News Page & Read State
- Widget Pack & Locking
- Theme Catalog
- App Tauri Config
- App Entry & Styles
- Achievements
- Layout Sharing
- Alert Sounds
- Dev Docs: Service & Stack
- Library, Live & Media Service
- Leak Season & Game Events
- Dashboard State Store
- App TS Config
- Release Signing Keys
- CMS Tauri Config
- CMS TS Config
- Boot Screen & Next Plans (docs)
- Painter Canvas Primitives
- CMS Dependencies
- Media Child Process
- Perk Regions & Keystones
- Card Dev Guide: Component
- Game Mode Profile Lock
- Nav & Vault Pages
- CMS Release Timeline
- Gacha Odds: Regular & Rainbow
- Perk Notables (Specialist)
- Card Definitions & Widget Cost
- Players Map
- Discord RPC Client
- Wave Link Client
- Theme Shipping Docs
- Creator Codes
- Cleanup Plan & Reviews
- Looks & Credits Spec
- Gacha Odds: Brand Pack
- Card Gallery Build
- Release Store & Keys Docs
- Draw Animation Plan
- Remotion TS Config
- Card Styling & Skins Docs
- Service Routes & Memclean
- Creator Support (BMC, Patreon)
- Credits Roll Page
- Celebrations & Rank Watch
- Item Inventory
- Card Gallery Report
- Brand & Region Packs
- CMS Standalone Server
- Error Boundaries
- Shared Release Types
- Brand Pity Fixes
- Remotion Draw Theme
- Unlockables & Collection Math
- Gallery Puppeteer Test
- Adding Content Docs
- Credits & Data Sources Docs
- Vite Build Config
- Release Manifest 10
- Release Manifest 11
- Release Manifest 6
- Release Manifest 7
- Release Manifest 8
- Release Manifest 9
- CMS npm Scripts
- Soft Pity Editor
- App npm Scripts
- Release Manifest 1
- Release Manifest 2
- Release Manifest 3
- Release Manifest 4
- Release Manifest 5
- Signed CMS Release Docs
- Perk Streak Keystones
- Service HTTP Server
- Webview Memory Probe
- Gacha Remotion Docs
- CMS Store Tests
- World Clock Designs
- Perk Loot & Fragments
- Feed E2E Test
- App Tauri Capabilities
- CMS App Icon
- CMS Tauri Capabilities
- Perk Season Pass Region
- App Icon
- BMC Extract Script
- Card Error Boundary
- Schema Dump Script
- Vite Package
- command-cms Package
- command-station Package

## God Nodes (most connected - your core abstractions)
1. `DrawPage()` - 89 edges
2. `cn()` - 85 edges
3. `cn()` - 48 edges
4. `Card()` - 47 edges
5. `Empty()` - 43 edges
6. `OddsPage()` - 43 edges
7. `api()` - 40 edges
8. `readString()` - 37 edges
9. `ThemesPage()` - 37 edges
10. `writeJson()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Logic fixes round 5 draft (Section 1 up for review)` --semantically_similar_to--> `Logic, data-connection and UI-state fixes (round 5)`  [INFERRED] [semantically similar]
  design_draft.md → docs/designs/logic-fixes-round5.md
- `react-dom@19.3.1` --declares--> `react-dom`  [EXTRACTED]
  gacha-remotion/package.json → app/package.json
- `@types/react@19.3.0` --declares--> `@types/react`  [EXTRACTED]
  gacha-remotion/package.json → app/package.json
- `typescript@5.9.3` --declares--> `typescript`  [EXTRACTED]
  gacha-remotion/package.json → app/package.json
- `Cleanup Plan: what is left to clean and fix` --references--> `Boot screen as cover over the real dashboard`  [INFERRED]
  CLEANUP PLAN.md → docs-archive/BOOT SCREEN PLAN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **EGM review stages 5-9 on logic-fixes-round5 design** — docs_designs_logic_fixes_round5, zoom_out_report, comprehension_report, critic_report, intermediate_zoom_out_report, implementation_readiness_report [EXTRACTED 1.00]
- **Goldfish review loop rounds 1-4 driving the cleanup plan** — docs_archive_goldfish_review_round1, docs_archive_goldfish_review_round2, docs_archive_goldfish_review_round3, goldfish_review_report, cleanup_plan, cleanup_plan_review_loop [EXTRACTED 1.00]
- **Gacha pity, caps and repeat-currency economy** — gacha_redesign_look_pity, gacha_redesign_brand_pity, gacha_redesign_ten_draw_guarantee, gacha_redesign_weekly_pick_cap, gacha_redesign_crystals, gacha_redesign_brand_prisms, gacha_redesign_streak_freeze [INFERRED 0.85]
- **New card wiring: definition, view registry, widget cost, CMS catalog, storage reset** — app_docs_card_dev_01_card_definition_carddef, app_docs_card_dev_03_registry_and_context_card_views, app_docs_adding_content_widget_cost, app_docs_adding_content_widget_catalog, app_docs_card_dev_05_storage_and_reset_storage_keys, app_docs_card_dev_05_storage_and_reset_card_keys [EXTRACTED 1.00]
- **Signed CMS content release pipeline** — app_docs_content_updates_signed_content_release, app_docs_content_updates_release_contract, app_docs_content_updates_canonical_json_signature, app_docs_content_updates_dev_public_key, app_docs_content_updates_release_types, app_src_content_fixtures_readme_release_v2_fixtures [EXTRACTED 1.00]
- **Card polling discipline (shared pollers, quiet mode, star cost)** — app_docs_card_dev_04_data_and_polling_use_api, app_docs_card_dev_04_data_and_polling_use_every, app_docs_card_dev_04_data_and_polling_no_own_polling, app_docs_card_dev_08_widget_pack_and_locking_star_rule, app_readme_app_cost_budget [INFERRED 0.85]
- **GACHA ODDS workbook version lineage (v1 to v5)** — graphify_out_converted_gacha_odds_83698a34_gacha_odds_workbook, graphify_out_converted_gacha_odds_v2_af3a1779_gacha_odds_workbook, graphify_out_converted_gacha_odds_v3_1ecd1007_gacha_odds_workbook, graphify_out_converted_gacha_odds_v4_0db93990_gacha_odds_workbook, graphify_out_converted_gacha_odds_v5_b36732f1_gacha_odds_workbook [INFERRED 0.95]
- **Rainbow 5-star tier mechanics (tier, pity, 50/50, draw-only)** — graphify_out_converted_gacha_odds_v4_0db93990_rainbow_tier, graphify_out_converted_gacha_odds_v4_0db93990_rainbow_pity, graphify_out_converted_gacha_odds_v4_0db93990_rainbow_draw_only_rule, graphify_out_converted_gacha_odds_v5_b36732f1_rainbow_50_50, graphify_out_converted_gacha_odds_v5_b36732f1_brand_rainbow_pity [EXTRACTED 1.00]
- **Perk Tree Sample keystones: rule changes with a cost** — graphify_out_converted_perk_tree_sample_e6c36f10_marathon, graphify_out_converted_perk_tree_sample_e6c36f10_crunch, graphify_out_converted_perk_tree_sample_e6c36f10_ritual, graphify_out_converted_perk_tree_sample_e6c36f10_scavenger, graphify_out_converted_perk_tree_sample_e6c36f10_specialist, graphify_out_converted_perk_tree_sample_e6c36f10_silent_running, graphify_out_converted_perk_tree_sample_e6c36f10_grinder, graphify_out_converted_perk_tree_sample_e6c36f10_fast_lane, graphify_out_converted_perk_tree_sample_e6c36f10_iron_streak, graphify_out_converted_perk_tree_sample_e6c36f10_gambler, graphify_out_converted_perk_tree_sample_e6c36f10_contractor, graphify_out_converted_perk_tree_sample_e6c36f10_monk_mode [EXTRACTED 1.00]
- **CMS signed publish pipeline** — cms_readme_edit_publish_flow, cms_readme_api_contracts, cms_readme_signed_release_host, cms_data_keys_readme_ed25519_signing_keys, cms_data_releases_readme_release_store [EXTRACTED 1.00]
- **Perk tree design set (template, data, icon sheets)** — design_perk_tree_sample_template, design_perk_tree_sample_perk_tree_sample_data, design_perk_tree_sample_perk_node_icons_icons, design_perk_tree_sample_perk_node_icons_v1_icons [INFERRED 0.85]
- **World clock card design exploration** — design_world_clock_options_card_designs, design_world_clock_cards_world_clock_looks, preview_cards_world_clock_looks [INFERRED 0.85]

## Communities (163 total, 13 thin omitted)

### Community 0 - "Brag Video Builder"
Cohesion: 0.05
Nodes (52): brush_state(), card_image(), clamp(), draw_caption(), draw_char(), draw_modal(), draw_page(), draw_tile() (+44 more)

### Community 1 - "Calendar Card & Page"
Cohesion: 0.05
Nodes (71): CalendarCard, DAY, DOW, MONTH, atLocal(), CalendarPage(), CalEvent, calFocus (+63 more)

### Community 2 - "Animated Sidebar UI"
Cohesion: 0.05
Nodes (81): AnimatedSidebar, AnimatedSidebarClose, AnimatedSidebarCloseProps, AnimatedSidebarContent, AnimatedSidebarContext, AnimatedSidebarContextValue, AnimatedSidebarFooter, AnimatedSidebarGroup (+73 more)

### Community 3 - "Extra Cards (Discord, Library, Cost)"
Cohesion: 0.07
Nodes (75): ago(), clean(), CostCard, DiscordCard, DiscordGuild, DiscordNotes(), iconFor(), LibraryCard (+67 more)

### Community 4 - "Brand Unlock & Card Showcase"
Cohesion: 0.05
Nodes (76): BrandUnlock(), contrast(), luminance(), markColour(), Art(), CardShowcase(), LookArt(), NOT_LIVE (+68 more)

### Community 5 - "Boot Signals & Chart Cards"
Cohesion: 0.08
Nodes (69): failCount(), fails, listeners, onSignal(), seen, Signal, signal(), signalled() (+61 more)

### Community 6 - "Draw Stage & Pack Contents"
Cohesion: 0.07
Nodes (73): FragmentMark(), brandHolds(), DrawStage(), landedAt(), previewKind(), cardSections(), itemName(), PackContents() (+65 more)

### Community 7 - "CMS App Shell & Banner Art"
Cohesion: 0.10
Nodes (51): index.html (Game Station CMS entry), uploadBannerArt(), App(), BootGate(), BannerArtPreview(), bannerArtUrl(), num(), PackSettingsPanels() (+43 more)

### Community 8 - "Counterwatch Meta Service"
Cohesion: 0.09
Nodes (58): ARTIFACT, createCounterwatch(), artifactHeaders(), endpoint(), ensureModeSlice(), fillPicks(), heroCacheKey(), heroDetail() (+50 more)

### Community 9 - "Frontend API Client"
Cohesion: 0.06
Nodes (55): apiBase, applyStep(), emptySample(), failure(), get(), liveAvailable(), loadMachine(), loadProfiles() (+47 more)

### Community 10 - "Notifications & Hardware Tiles"
Cohesion: 0.04
Nodes (59): DiscordToasts, NotificationCenter(), Row(), AlertsPanel, DeviceProps, DeviceTile(), LoadMeter(), LoadTile() (+51 more)

### Community 11 - "CMS Content Tests"
Cohesion: 0.09
Nodes (37): ZONES, owned, resetContent(), setContent(), brandPoolOf(), cardPackToGacha(), collectAssetPaths(), draftToContentBundle() (+29 more)

### Community 12 - "Quests Engine & Page"
Cohesion: 0.08
Nodes (56): perHour(), QuestsPage(), resetIn(), Row(), SECTIONS, hourBonus(), addMinutes(), canClaim() (+48 more)

### Community 13 - "Card Pack & Credit Art"
Cohesion: 0.05
Nodes (48): CREDIT_ART, CreditArt, creditArtFor(), BRAND_LOGOS, BrandLogo, BRAND_TAGS, COUNTRIES, idsTagged() (+40 more)

### Community 14 - "Hardware & Network Stats"
Cohesion: 0.07
Nodes (49): createCost(), refresh(), STANDING, createNetStats(), tick(), parseWifi(), REGIONS, summarize() (+41 more)

### Community 15 - "Gacha Engine Core"
Cohesion: 0.08
Nodes (57): owned(), RAINBOW, withRainbow(), labels(), Tile(), softLine(), applyCardResults(), BRAND_THEME_IDS (+49 more)

### Community 16 - "Dashboard Grid & Card Picker"
Cohesion: 0.06
Nodes (47): react-grid-layout@^1.5.4, instanceKeys(), resetKeys(), SHARED, GROUPS, matchesQuery(), Props, Cell (+39 more)

### Community 17 - "Painter Scene & Theme"
Cohesion: 0.07
Nodes (50): PainterMode, Props, CAPS, { fontFamily }, LAYER_ORDER, Layers, Sparkles(), ACC (+42 more)

### Community 18 - "Service Entry (index.mjs)"
Cohesion: 0.04
Nodes (42): ai, config, cost, discord, feedApex, feedOw, gameMode, library (+34 more)

### Community 19 - "Check-in Board"
Cohesion: 0.10
Nodes (45): run(), BoxState, CheckinBoard(), ItemMark(), PACK_NAMES, packsTaking(), plural(), prizeText() (+37 more)

### Community 20 - "Season Pass"
Cohesion: 0.10
Nodes (47): base(), NOW, CreditIcon(), ITEM_ICON, PassPage(), RewardArt(), rewardName(), anchor() (+39 more)

### Community 21 - "AI & Feed Panels"
Cohesion: 0.08
Nodes (42): AiResearchCard, Items(), LEAK_LOAD_LINES, LeakFeedLoading(), SEASON_LOAD_LINES, untilWord(), FeedPanel, GameModeProps (+34 more)

### Community 22 - "Economy Fixes & Card Skins"
Cohesion: 0.09
Nodes (38): CardSkinPicker(), SkinSample(), toShowcase(), CARD_SKIN_IDS, CARD_SKINS, cardSkinById(), CardSkinDef, CardStars (+30 more)

### Community 23 - "Service Config Loader"
Cohesion: 0.09
Nodes (38): DEFAULTS, isHttpUrl(), isObj(), isStr(), listKey(), loadConfig(), mergeBuiltInList(), pruneRetired() (+30 more)

### Community 24 - "Featured Run Queue"
Cohesion: 0.09
Nodes (35): FeaturedQueue(), addRun(), eligible(), randomFill(), setQueue(), mergePast(), RunCard(), RunState (+27 more)

### Community 25 - "Signed Release Apply"
Cohesion: 0.10
Nodes (35): contentText, root, signed, ApplyResult, applySignedRelease(), changelogFromBundle(), normalizeThemes(), AppliedRelease (+27 more)

### Community 26 - "Perk Tree Code"
Cohesion: 0.11
Nodes (40): DEC, NOV, ICON, NodeState, PerkSection(), ROOT, SPOT, activePerks() (+32 more)

### Community 27 - "Apex Meta Service"
Cohesion: 0.09
Nodes (36): imgCache, proxyApexImg(), archetypeForClass(), buildLegends(), CACHE_FILE, CLASS_ARCHETYPE, createApexMeta(), gunsList() (+28 more)

### Community 28 - "Overwatch Cards"
Cohesion: 0.09
Nodes (36): easternEvening(), easternLabel(), fmt(), hourStats(), hourWord(), isYmd(), NotesLink(), officialPatchUrl() (+28 more)

### Community 29 - "App Dependencies"
Cohesion: 0.07
Nodes (41): dependencies, clsx@^2.1.1, @fontsource/barlow-condensed@^5.3.0, @fontsource-variable/inter@^5.3.0, @fontsource-variable/jetbrains-mono@^5.3.0, @fontsource-variable/lora@^5.3.0, @fontsource-variable/plus-jakarta-sans@^5.3.0, @fontsource-variable/space-grotesk@^5.3.0 (+33 more)

### Community 30 - "Theme Card Preview & Tabs"
Cohesion: 0.07
Nodes (31): FONT_STACKS, fontOf(), starsOfTheme(), StarTag(), ThemeCardPreview(), LineTab, LineTabs(), createTheme() (+23 more)

### Community 31 - "App Dev Dependencies"
Cohesion: 0.07
Nodes (40): devDependencies, autoprefixer@^10.6.2, postcss@^8.5.33, tailwindcss@^3.4.19, @tauri-apps/cli@^2.5.0, @types/node@^24.19.2, @types/react@^18.3.12, @types/react-dom@^18.3.1 (+32 more)

### Community 32 - "Boot Screen"
Cohesion: 0.08
Nodes (30): BootDemo(), CELLS, STEPS, BootScreen(), headline(), reducedMotion(), STATUS_WORD, SystemsList() (+22 more)

### Community 33 - "Draw Badges"
Cohesion: 0.08
Nodes (36): Band(), barcode(), bestRarity(), DROPS, Finish(), FLIP_MS, FRONT_TONE, FrontKind (+28 more)

### Community 34 - "Vault Settings & Backup"
Cohesion: 0.10
Nodes (34): AlertSettings(), Backup, BackupSettings(), GameModeSettings(), keepOnRestore(), msg(), ProgramList(), STEP_NAMES (+26 more)

### Community 35 - "CMS Pool Order & Odds Chart"
Cohesion: 0.06
Nodes (38): BrandPoolOrder(), Row(), shuffled(), OddsPieChart(), Slice, SLICE_COLORS, slicesFrom(), CARD_SKIN_CATALOG (+30 more)

### Community 36 - "Themes Page & Theme Tune"
Cohesion: 0.12
Nodes (36): ShimmerButton(), Props, ThemeTune(), getWhatsNewEntries(), gachaBannerIsNew(), BLANK, DICE_FACES, DICE_PIPS (+28 more)

### Community 37 - "News Feed Service"
Cohesion: 0.15
Nodes (31): createFeed(), fetchText(), items(), pull(), refresh(), resolveYouTube(), start(), sleep() (+23 more)

### Community 38 - "Remotion Project Config"
Cohesion: 0.06
Nodes (35): allowScripts, esbuild, dependencies, react@19.3.1, react-dom@19.3.1, remotion@4.0.543, @remotion/cli@4.0.543, @remotion/google-fonts@^4.0.543 (+27 more)

### Community 39 - "AI Engine Service"
Cohesion: 0.10
Nodes (33): AUTH_ERROR, AUTO_FILE, buildPrompt(), commandExists(), createAi(), execute(), defaultEngineId(), downgradeSpeculative() (+25 more)

### Community 40 - "CMS Release HTTP API"
Cohesion: 0.18
Nodes (32): CMS draft/publish API contracts (/api/draft, /api/validate, /api/publish, /api/releases, /api/rollback), isCmsDraft(), createReleaseMiddleware(), readBody(), readRawBody(), sendBuf(), sendJson(), sendText() (+24 more)

### Community 41 - "Repeat Rewards & Calendar Events"
Cohesion: 0.13
Nodes (30): CrystalKey, RepeatRewards(), ROWS, whole(), addDays(), calendarEntries(), CalendarEntry, CalendarKind (+22 more)

### Community 42 - "Patreon Service"
Cohesion: 0.09
Nodes (21): APP_FILE, AUTH(), base(), createPatreon(), accessToken(), check(), tokenRequest(), CREATOR (+13 more)

### Community 43 - "Top Bar & Patron Menu"
Cohesion: 0.10
Nodes (29): Icon(), IconName, PATHS, GameModePanel, msg(), PatronMenu(), Clock(), Props (+21 more)

### Community 44 - "Split Pane Layout"
Cohesion: 0.12
Nodes (30): StationOption, TABS, addPane(), clampRatio(), cleanSplit(), closePane(), focusPane(), initialSplit() (+22 more)

### Community 45 - "Palette & Color Tokens"
Cohesion: 0.12
Nodes (33): alphaOf(), APPLIED, applyPalette(), asPalette(), browserColor(), contrast(), cssVars(), flatten() (+25 more)

### Community 46 - "Game Mode & Sessions"
Cohesion: 0.11
Nodes (26): CONFIG_FILE, DATA_DIR, FEED_CACHE_FILE, JOURNAL_FILE, readJsonStrict(), writeJson(), avg(), createSessions() (+18 more)

### Community 47 - "Boot Steps"
Cohesion: 0.10
Nodes (28): CONTENT, CONTENT_STEP, CORE, HARDWARE, PROFILES, StepDef, STEPS, stepsFor() (+20 more)

### Community 48 - "Desktop Build Scripts"
Cohesion: 0.06
Nodes (26): dest, outDir, root, serviceSrc, stage, { version }, loadEnv(), Theme seed / import (npm run seed) (+18 more)

### Community 49 - "Profile & Ranks"
Cohesion: 0.17
Nodes (26): nextRankLine(), ProfileEmblem(), ProfilePanel(), SHORTCUTS, ProfilePage(), Row(), Section, SECTIONS (+18 more)

### Community 50 - "Alert Sound Preview & Banners"
Cohesion: 0.12
Nodes (24): getAlertPreviewSrc(), localPreviewByItemId, onStopped, PreviewButton(), toggle(), setLocalAlertPreview(), stopActive(), createItem() (+16 more)

### Community 51 - "Game Constants"
Cohesion: 0.15
Nodes (26): APEX_APP_ID, OVERWATCH_APP_ID, APEX_FEED_DEFAULTS, feedCacheFileFor(), feedConfigFor(), GAME_IDS, normalizeGame(), playersFileFor() (+18 more)

### Community 52 - "Tauri Sidecar Shell (Rust)"
Cohesion: 0.13
Nodes (15): kill_sidecar(), plain(), run(), Sidecar, start_service(), home_dir(), kill_sidecar(), plain() (+7 more)

### Community 53 - "CMS Content API & Scheduler"
Cohesion: 0.15
Nodes (27): getPersistMode(), listReleases(), loadDraft(), loadLocalReleases(), PersistMode, publishDraft(), saveDraft(), tryFetch() (+19 more)

### Community 54 - "CMS UI Primitives"
Cohesion: 0.15
Nodes (24): Button, ButtonProps, buttonVariants, CheckItem, CheckList(), CheckStatus, MARK, BarTone (+16 more)

### Community 55 - "App Root & Pages"
Cohesion: 0.14
Nodes (27): AchievementsPage, App(), BuyCreditsPage, CreditsPage, DrawPage, MemoDashboard, MODE_LABEL, NewsPage (+19 more)

### Community 56 - "Perk Node Icon Sheet"
Cohesion: 0.09
Nodes (24): Perk Node Icons sheet (shaded, current), Fragment icon (F4 two stacked floppy disks), Draw Ticket icon (T5 pass on a lanyard), ICONS (25 effect icons + keystone mark), node() (perk node renderer), REGIONS (Credits, Season Pass, Check-in, Draws, Quests, Station), Perk Node Icons sheet v1 (line icons), ICONS v1 (24 line icons) (+16 more)

### Community 57 - "Scheduled Release Fetch"
Cohesion: 0.15
Nodes (19): contentV2, fixtures, signedV2, currentReleaseNumber(), hydrateContentFromStore(), readAppliedRelease(), fetchChangedFiles(), fetchCurrentNumber() (+11 more)

### Community 58 - "Tool & World Clock Cards"
Cohesion: 0.11
Nodes (22): DEFAULT_LIST, isItems(), isText(), Item, NotesCard, City, DEFAULT_CITIES, Headline() (+14 more)

### Community 59 - "Monitor Placement"
Cohesion: 0.15
Nodes (23): labelFor(), Listed, listMonitors(), MONITOR_KEY, MonitorChoice, MonitorPref, placeOnPreferredMonitor(), preferredMonitorPosition() (+15 more)

### Community 60 - "Round-5 Review Reports"
Cohesion: 0.12
Nodes (24): Stage 6 Comprehension Test report (logic-fixes-round5), 'Pending' term overload (scheduled release, pending push, hardware lookup), Stage 7 Critic Review report (round 1), CR-1 Approve overwrites newer draft edits, Logic, data-connection and UI-state fixes (round 5), A4 later Push makes scheduled release go live early, B10 saved Patreon tier expires after 14-day grace, B1 unlock cap deletes looks past 50 (fixed, no cap) (+16 more)

### Community 61 - "Card Dev Guide: Core"
Cohesion: 0.12
Nodes (22): CardInstance (id, type, look, locked), CARD_VIEWS registry (app/src/layout/registry.tsx), CardCtx (info, store, players, feed, events, gm, stopped, toasts, callbacks), Guide 3: Registry and context, Per-copy vs shared storage keys, Card looks (CLOCK_LOOKS, defaultLook, onLook), Guide 6: Looks, Guide 9: Preview and testing (+14 more)

### Community 62 - "Look Access & Theme Panel"
Cohesion: 0.13
Nodes (21): Props, ThemePanel(), FREE_LOOK_COUNT, isLookLocked(), lockedIdsOf(), Palette, CHARCOAL, applySavedTheme() (+13 more)

### Community 63 - "News Page & Read State"
Cohesion: 0.17
Nodes (22): CardCtxContext, Board, Entry, fromNotice(), fromStory(), Hero(), kindLabel(), NewsPage() (+14 more)

### Community 64 - "Widget Pack & Locking"
Cohesion: 0.16
Nodes (21): LOCKED, LockedCard(), BUNDLED_WIDGET_PACK, DEFAULT_CARD_BUY, WidgetStatus, widgetStatus(), isWidgetId(), isWidgetLocked() (+13 more)

### Community 65 - "Theme Catalog"
Cohesion: 0.09
Nodes (23): ThemeStatus, BUNDLED_BY_ID, catalogListeners, COMPANY, DEMO_AVAILABLE_BRAND_IDS, FONT_BY_GROUP, FONT_BY_ID, FONT_KEYS (+15 more)

### Community 66 - "App Tauri Config"
Cohesion: 0.08
Nodes (25): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+17 more)

### Community 67 - "App Entry & Styles"
Cohesion: 0.09
Nodes (9): index.html (Command Station app entry), @fontsource/outfit@^5.1.0, rootElement, World clock cards (five looks), parts() (time zone breakdown), rel() (hour offset label), tick(), World clock looks (Rulers, 24-hour ring, Day curve, Offset levels, Headline tile) (+1 more)

### Community 68 - "Achievements"
Cohesion: 0.15
Nodes (20): zero, AchievementsPage(), dateOf(), ICON, TIER_NAME, TIERS, AchievementCategory, AchievementDef (+12 more)

### Community 69 - "Layout Sharing"
Cohesion: 0.16
Nodes (20): download(), LayoutManager(), Props, buildShare(), MAX_SHARE_BYTES, parseShare(), SHARE_KIND, Shared (+12 more)

### Community 70 - "Alert Sounds"
Cohesion: 0.13
Nodes (20): ALERT_SOUNDS, AlertSoundFamily, AlertSoundInfo, AlertSoundMood, bell(), blip(), env(), glass() (+12 more)

### Community 71 - "Dev Docs: Service & Stack"
Cohesion: 0.17
Nodes (16): Adding a service endpoint (module, index.mjs, routes.mjs createRoutes, type, test, boot step), Built with: React, Vite, Tauri, react-grid-layout, d3-geo, topojson, world-atlas, Outfit, Lucide, Development (contributor notes), npm run prepare:sidecar (stage node.exe and service/), Setup guide, Troubleshooting guide, Origin allowlist (localhost:1420, 127.0.0.1:1420, tauri.localhost, tauri://localhost), Command Station app README (+8 more)

### Community 72 - "Library, Live & Media Service"
Cohesion: 0.16
Nodes (17): BNET, createLibrary(), get(), scan(), kids, root, run(), stop() (+9 more)

### Community 73 - "Leak Season & Game Events"
Cohesion: 0.23
Nodes (19): at(), buildGameEvents(), dayOf(), estimateUpcoming(), isNotable(), median(), pad(), plusDays() (+11 more)

### Community 74 - "Dashboard State Store"
Cohesion: 0.22
Nodes (21): defaultInstances(), defaultLook(), mins(), newBox(), sanitize(), cleanHidden(), cleanInstances(), cleanSnap() (+13 more)

### Community 75 - "App TS Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+12 more)

### Community 76 - "Release Signing Keys"
Cohesion: 0.14
Nodes (19): canonicalJson(), ensureKeypair(), loadKeypair(), publicKeyPem(), signManifest(), sortKeys(), verifyManifest(), BANNERS_UPLOAD_DIR (+11 more)

### Community 77 - "CMS Tauri Config"
Cohesion: 0.10
Nodes (20): app, security, windows, build, beforeBuildCommand, beforeDevCommand, frontendDist, bundle (+12 more)

### Community 78 - "CMS TS Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+12 more)

### Community 79 - "Boot Screen & Next Plans (docs)"
Cohesion: 0.12
Nodes (20): Boot screen plan: Command Station startup, Boot screen as cover over the real dashboard, Startup steps checklist (required vs optional rows), Next plan: what to do next (12 Nov 2026), Resource budget (<1% CPU, <150 MB with Overwatch), Project summary: what was built, Hero profile card (GET /api/meta/hero), Players online (Steam GetNumberOfCurrentPlayers + world map) (+12 more)

### Community 80 - "Painter Canvas Primitives"
Cohesion: 0.22
Nodes (20): Painter(), Caption(), CardFull(), CardPainting(), Modal(), PageView(), Scene(), Sketch() (+12 more)

### Community 81 - "CMS Dependencies"
Cohesion: 0.11
Nodes (19): class-variance-authority@^0.7.1, lucide-react@^1.73.0, react-dom@^18.3.1, tailwind-merge@^3.7.0, class-variance-authority, lucide-react, react-dom, tailwind-merge (+11 more)

### Community 82 - "Media Child Process"
Cohesion: 0.18
Nodes (11): createMedia(), command(), ensure(), failWaiting(), raw(), recycle(), send(), fakeChild() (+3 more)

### Community 83 - "Perk Regions & Keystones"
Cohesion: 0.15
Nodes (13): Check-in region (+5% bonus Regular Ticket chance), Credits region (+3% Credits from play), Crosswalk ring (links neighbouring regions), Perk Tree Item List workbook, Quests region (+3% Credits from quests), Regular Ticket / Special Ticket, Station region (+1% to all Credits), Welcome Back notable (+50% Credits after 3+ days away) (+5 more)

### Community 84 - "Card Dev Guide: Component"
Cohesion: 0.18
Nodes (15): CardBoundary error boundary, Card shell (app/src/cards/ui.tsx), Guide 2: Card component, Shared card parts (Empty, Bar, Sparkline, span, gb, StatMeter, useToast), useSample live sensor subscription, api(path, body) POST helper (app/src/lib/api.ts), Guide 4: Data and polling, useApi (shared poller per path, off-screen pause) (+7 more)

### Community 85 - "Game Mode Profile Lock"
Cohesion: 0.21
Nodes (15): attempt(), createGameMode(), applyLocked(), describeProfiles(), ensureOverwatch(), locked(), perform(), recoverIfNeeded() (+7 more)

### Community 86 - "Nav & Vault Pages"
Cohesion: 0.16
Nodes (14): GROUPS, NavSettings(), NavTab, NavTabsApi, TabId, initialSection(), MOVE_MODES, Props (+6 more)

### Community 87 - "CMS Release Timeline"
Cohesion: 0.16
Nodes (12): DAY_W, dayIndex(), isLight(), MONTH, packRows(), pad(), parse(), Timeline() (+4 more)

### Community 88 - "Gacha Odds: Regular & Rainbow"
Cohesion: 0.21
Nodes (12): Regular theme outcome (15% share), AJ Cybernetics (rainbow theme), Claymorphism (rainbow theme), Emerald Dark (rainbow theme), GACHA ODDS workbook v4, Neon Magenta (rainbow theme), Pine Terminal (rainbow theme), Purple Rain (rainbow theme) (+4 more)

### Community 89 - "Perk Notables (Specialist)"
Cohesion: 0.15
Nodes (11): Auto-Claim notable (play-time quests claim themselves), Crosswalk inner ring and Bridges between regions, Busy Hands notable (+50 Pass XP per claimed quest), Crosswalk ring nodes, earned_by split and Summary sheet, hook column: Exists vs New work, Perk node types (start, small, notable, keystone, ring, bridge), Perk Tree Sample workbook (Command Station) (+3 more)

### Community 90 - "Card Definitions & Widget Cost"
Cohesion: 0.19
Nodes (14): WIDGET_CATALOG (cms/src/types/draft.ts), WIDGET_COST (app/src/state/widgets.ts), CardDef / CARDS (app/src/layout/layouts.ts), Grid units (lg 24 cols, md 12, sm 1; ROW_HEIGHT 20, MARGIN 12), Groups to tabs (tabOf, TAB_OF_GROUP), Guide 1: Card definition, Size presets S/M/L (presetBox), Guide 8: Widget Pack and locking (+6 more)

### Community 91 - "Players Map"
Cohesion: 0.16
Nodes (14): d3-geo@^3.1.2, topojson-client@^3.1.0, world-atlas@^2.0.2, CENTER, Crowd, CROWD, crowdLevel(), fmt() (+6 more)

### Community 92 - "Discord RPC Client"
Cohesion: 0.23
Nodes (13): createDiscord(), authenticate(), connect(), openPipe(), read(), send(), token(), decodeFrames() (+5 more)

### Community 93 - "Wave Link Client"
Cohesion: 0.23
Nodes (12): bad(), buildCall(), createClient(), createWaveLink(), read(), decodeFrames(), encodeFrame(), num() (+4 more)

### Community 94 - "Theme Shipping Docs"
Cohesion: 0.20
Nodes (13): Bundled themes: LOOKS, BRAND_TAGS, RAINBOW_THEME_IDS, Adding a theme via CMS (Hidden / Available / Archived, Rainbow, Brand/Region packs), Brand Pack rotation (gacha.brandThemeIds, 68 ids = 34 fortnights), canonicalJson manifest signature (sorted keys, no whitespace), devPublicKey.ts (mirrors cms ed25519-public.pem), Content updates (Phase 3), Region Pack (gacha.packs.region, regionWeek, regionPackEnabled), CMS release HTTP contract (/releases/current, manifest.json, content.json, blobs, public-key) (+5 more)

### Community 95 - "Creator Codes"
Cohesion: 0.28
Nodes (11): CreatorSettings(), applyCreatorCode(), listeners, publish(), subscribe(), useCreatorUnlock(), classifyCreatorCode(), CREATOR_RESET_CODE (+3 more)

### Community 96 - "Cleanup Plan & Reviews"
Cohesion: 0.18
Nodes (13): Cleanup Plan: what is left to clean and fix, A1 Tauri shell hard-kills the service (piped stdin fix), Z3 Provider interface replaced by plain lib/api.ts, Logic fixes round 5 draft (Section 1 up for review), Goldfish Review Report round 1, Dead mock provider (F7/Z2), F1 light-theme dark-on-dark controls (--on-text token), Goldfish Review Report round 2 (+5 more)

### Community 97 - "Looks & Credits Spec"
Cohesion: 0.20
Nodes (14): Nightsteel unlockable look (120 Credits), Support page (BuyCreditsPage, Buy Me a Coffee button), Theme and Credits spec (14 Nov 2026), PLAN.md: Looks, Gacha, Patreon, Earn spec, Brand Theme (brand-color editor), Buy Me a Coffee (tip only), Creator access (hidden gifted Creator tier), Credits (earned on this PC, never sold, never a prize) (+6 more)

### Community 98 - "Gacha Odds: Brand Pack"
Cohesion: 0.23
Nodes (13): Box (earlier proposal, dropped), Brand Pack, Brand theme rotation (2 featured of 28, every 14 days), Brand theme outcome (featured, 1%), Chosen Regular look costs 120 Credits, Crystals (repeat currency), GACHA ODDS workbook (v1), Regular Pack (+5 more)

### Community 99 - "Card Gallery Build"
Cohesion: 0.15
Nodes (14): gallery.html (Command Station Card Gallery entry), Card Gallery build (placeholder cards), Dashboard card registry (32 cards), Default card layouts (desktop, two-column, stacked), Card Gallery build (dev, live cards), Live card gallery (switch over card keys with mock data), Game mode card (undoable steps), Overwatch feed card (+6 more)

### Community 100 - "Release Store & Keys Docs"
Cohesion: 0.16
Nodes (13): Test signing keys README (dev only), Ed25519 dev signing keys (ed25519-private.pem / ed25519-public.pem), Local release store README, Local release store layout (current.json, by-number/<n>/, blobs/<sha256>), Game Station CMS README, CMS admin routes (Dashboard, Themes, Items, Odds, Banners, Preview, Releases), Command CMS desktop app (Command CMS.exe), Draft autosave (PUT /api/draft to data/draft.json, ~800ms) (+5 more)

### Community 101 - "Draw Animation Plan"
Cohesion: 0.19
Nodes (14): B2 pick past waiting cap becomes streak freeze (DrawOwned.pickRoom), Draw animation plan: scribble, pull, badge, Badge rail with lanyard pull, pendulum drop and flip, Ink pad scribble (cosmetic only, never changes result), Gacha drop redesign (Draw Theme), Capsule machine reveal (replaced), Card Pack (dashboard card skins, 4-star/5-star), Coupon migration (v1 coupons to 15 Credits each, GachaState v2) (+6 more)

### Community 102 - "Remotion TS Config"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution, noEmit (+5 more)

### Community 103 - "Card Styling & Skins Docs"
Cohesion: 0.21
Nodes (10): Card skins: CARD_SKINS and cardskins.css, Own CSS prefixed and scoped per card (extras.css), Theme colour tokens (--text, --accent, --good, --glass, ...), Guide 7: Styling, themes and skins, Accent-derived tone mixing (color-mix --c toward light/dark), Credits across eleven catalog themes, Credits icon options (M1-M5 coins, K1-K18 explorations), Currency icon options page (+2 more)

### Community 104 - "Service Routes & Memclean"
Cohesion: 0.21
Nodes (7): VERSION, cleanStep(), cleanMemory(), fail(), SCRIPT, createRoutes(), runStep()

### Community 105 - "Creator Support (BMC, Patreon)"
Cohesion: 0.24
Nodes (9): Buy Me a Coffee Button (default yellow), Buy Me a Coffee (creator donation platform), Creator support / tip call-to-action, JoinPatreonButton(), PatreonSection(), TIERS, BuyCreditsPage(), displayUrl() (+1 more)

### Community 106 - "Credits Roll Page"
Cohesion: 0.23
Nodes (11): TrackedSource, crawlSeconds(), CreditHalf(), CreditsPage(), MADE_BY, Source, SOURCES, THANKS_INFO (+3 more)

### Community 107 - "Celebrations & Rank Watch"
Cohesion: 0.26
Nodes (10): CelebrateContext, CelebrateOverlay(), CelebrateProvider(), Celebration, useCelebrate(), readPerkEffects(), indexOf(), RANK_SEEN_KEY (+2 more)

### Community 108 - "Item Inventory"
Cohesion: 0.30
Nodes (11): cleanItems(), emptyItems(), grantInto(), grantItem(), isNum(), isRecord(), ItemsState, knownIds() (+3 more)

### Community 109 - "Card Gallery Report"
Cohesion: 0.24
Nodes (12): Command Station Card Gallery Report, Card gallery (preview/cards.html single-file build), 33 dashboard cards in 7 groups (This PC, Connection, Overwatch, Meta, Game, Media, Tools), Daily check-in event (Special Tickets, CMS start/end window), Daily check-in board (7 boxes, BOARD_PRIZES), Draw Tickets (Regular and Special), UI reference plan: nine screens from Honkai: Star Rail, Achievements engine (22 achievements, bronze/silver/gold) (+4 more)

### Community 110 - "Brand & Region Packs"
Cohesion: 0.23
Nodes (12): Brand Pack rotation, Company theme tags (Brand Pack, Region Pack, country ISO code, region), Region Pack (Region week / Country week), Brand unlock preview (all 150 brand looks), Brand unlock animation (flood, trace, fill, ring, rise), con() (contrast ratio), Brand look DATA (150 brands), go() (+4 more)

### Community 111 - "CMS Standalone Server"
Cohesion: 0.21
Nodes (10): DATA_DIR, DRAFT_PATH, api, DIST, here, MIME, PORT, sendFile() (+2 more)

### Community 112 - "Error Boundaries"
Cohesion: 0.25
Nodes (6): AppBoundary(), AppErrorScreen(), CardBoundary(), ErrorBoundary, Props, State

### Community 113 - "Shared Release Types"
Cohesion: 0.18
Nodes (10): ContentBundle, ContentReleaseManifest, CurrentReleaseInfo, GachaContentLike, ItemDefLike, PackTableLike, PublishResult, ReleaseFileEntry (+2 more)

### Community 114 - "Brand Pity Fixes"
Cohesion: 0.27
Nodes (10): CR-2 D1 pity reset bug (counter never resets when featured empty), B6 rotations use local calendar day instead of UTC, Brand Pack (150 / 1,350 Credits), Brand pity (Brand theme within 70 draws), Brand prisms (separate currency, 5 = 1 Brand pick), Brand rotation: 2 Brand themes per fortnight (featuredBrand), Look pity (forced Regular theme after 9 draws, per pack), Regular Pack (100 / 900 Credits) (+2 more)

### Community 115 - "Remotion Draw Theme"
Cohesion: 0.27
Nodes (8): DrawTheme(), DrawThemeProps, RemotionRoot(), DURATION_S, FPS, H, W, remotion

### Community 116 - "Unlockables & Collection Math"
Cohesion: 0.22
Nodes (10): Alert sound unlocks (~20), Better item tier, Boot screen style unlocks (10-15), Common item tier, Font unlock, Layout slot, Name flair, Wallpaper unlocks (20-30) (+2 more)

### Community 117 - "Gallery Puppeteer Test"
Cohesion: 0.20
Nodes (6): devDependencies, puppeteer@^25.17.0, puppeteer, __dirname, __filename, htmlPath

### Community 118 - "Adding Content Docs"
Cohesion: 0.22
Nodes (9): CMS widget status (Free / Drawable / Hidden) and Credit prices, Adding content: cards, themes, card skins, items, Item kinds: ItemKind, ITEMS, ITEM_INFO, Checks before publishing (test:service, tsc for app and cms), recordFreePlaced (widgetStore.ts), gacha.wikiHiddenIds / Show in Wiki switch, LockedCard / useWidgetLock in CardView, isWidgetLocked (Free/Available/Hidden/Archived x owned) (+1 more)

### Community 119 - "Credits & Data Sources Docs"
Cohesion: 0.22
Nodes (10): Meta cards (tierlist, mappicks, bestpicks, heroprofile), 21st.dev (front-end special thanks), Command Station credits roll (draft), Data sources: Counterwatch, Steam, Blizzard, Reddit, YouTube, Google News, X, Local integrations: Discord, Spotify, Windows media session, nvidia-smi, PresentMon, LibreHardwareMonitor, Project Charcoal team (Mochi, Biscuit, Pebble, Pudding), Yuzi Studio (鈺梓燒工作室), Command Station (Overwatch PC dashboard) (+2 more)

### Community 120 - "Vite Build Config"
Cohesion: 0.29
Nodes (4): vite-plugin-singlefile@^2.3.4, draftApiPlugin(), releaseHostPlugin, vite-plugin-singlefile

### Community 121 - "Release Manifest 10"
Cohesion: 0.20
Nodes (9): alg, manifest, contentHash, effectiveAt, files, notes, number, publishedAt (+1 more)

### Community 122 - "Release Manifest 11"
Cohesion: 0.20
Nodes (9): alg, manifest, contentHash, effectiveAt, files, notes, number, publishedAt (+1 more)

### Community 123 - "Release Manifest 6"
Cohesion: 0.20
Nodes (9): alg, manifest, contentHash, effectiveAt, files, notes, number, publishedAt (+1 more)

### Community 124 - "Release Manifest 7"
Cohesion: 0.20
Nodes (9): alg, manifest, contentHash, effectiveAt, files, notes, number, publishedAt (+1 more)

### Community 125 - "Release Manifest 8"
Cohesion: 0.20
Nodes (9): alg, manifest, contentHash, effectiveAt, files, notes, number, publishedAt (+1 more)

### Community 126 - "Release Manifest 9"
Cohesion: 0.20
Nodes (9): alg, manifest, contentHash, effectiveAt, files, notes, number, publishedAt (+1 more)

### Community 127 - "CMS npm Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, desktop:build, dev, prepare:desktop, preview, publish:check, seed (+2 more)

### Community 128 - "Soft Pity Editor"
Cohesion: 0.38
Nodes (8): curveOf(), pct(), sliderOf(), SoftPityEditor(), chanceAt(), CURVE_MAX, CURVE_MIN, SoftPityDraft

### Community 129 - "App npm Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, live, prepare:sidecar, preview, service, tauri (+1 more)

### Community 130 - "Release Manifest 1"
Cohesion: 0.22
Nodes (8): alg, manifest, contentHash, files, notes, number, publishedAt, signature

### Community 131 - "Release Manifest 2"
Cohesion: 0.22
Nodes (8): alg, manifest, contentHash, files, notes, number, publishedAt, signature

### Community 132 - "Release Manifest 3"
Cohesion: 0.22
Nodes (8): alg, manifest, contentHash, files, notes, number, publishedAt, signature

### Community 133 - "Release Manifest 4"
Cohesion: 0.22
Nodes (8): alg, manifest, contentHash, files, notes, number, publishedAt, signature

### Community 134 - "Release Manifest 5"
Cohesion: 0.22
Nodes (8): alg, manifest, contentHash, files, notes, number, publishedAt, signature

### Community 135 - "Signed CMS Release Docs"
Cohesion: 0.28
Nodes (9): A1 binary release files hashed as text (hash mismatch), Gacha banners (display only, never change odds), Signed CMS content release (manifest + hashed assets), Local CMS testing (app 1420, CMS 1430, test signing key), Past themes showcase, Start-up content update flow and What's new panel, Theme statuses: Hidden, Available, Archived, Command CMS desktop app (127.0.0.1:1430, %APPDATA%\CommandCMS) (+1 more)

### Community 136 - "Perk Streak Keystones"
Cohesion: 0.25
Nodes (4): Streak freeze, Background region (app running beside the game), Lights On notable (+1 streak freeze monthly), Outer band: hexagon wheels, outer notable paths, grand keystone

### Community 137 - "Service HTTP Server"
Cohesion: 0.39
Nodes (4): createServer(), DEFAULT_ORIGINS, readBody(), send()

### Community 138 - "Webview Memory Probe"
Cohesion: 0.39
Nodes (6): css(), page, ps(), settle(), step(), webviewMem()

### Community 139 - "Gacha Remotion Docs"
Cohesion: 0.36
Nodes (6): Remotion (React video framework), Remotion company license terms, Gacha Remotion video project, npx remotion render, GACHA ODDS workbook v5, Region Pack (planned)

### Community 140 - "CMS Store Tests"
Cohesion: 0.29
Nodes (3): draft, repoDraft, tmp

### Community 141 - "World Clock Designs"
Cohesion: 0.29
Nodes (6): World clock options (five card designs), World clock card designs (List, Analog, Day and night map, 24-hour timeline, Your time + others), LAND (world land SVG path), night() (day/night terminator), parts() (time zone breakdown), tick()

### Community 142 - "Perk Loot & Fragments"
Cohesion: 0.43
Nodes (5): Draws region (+3% fragments from repeats), Fragments (repeat currency), Second Look notable (+1 Regular fragment per repeat), Loot region (Tickets, fragments, items from play), Salvage notable (+1 Regular fragment per repeat)

### Community 143 - "Feed E2E Test"
Cohesion: 0.60
Nodes (5): ago(), atomEntry(), fakeFetch(), rss(), rssItem()

### Community 144 - "App Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 145 - "CMS App Icon"
Cohesion: 0.47
Nodes (6): Game Station CMS application, Stacked content entry rows motif, Dark monochrome icon palette (#0a0a0b / #1c1c1e / #efefef), Dashed empty row (add-new placeholder), CMS App Icon (stacked content rows), Orange accent dot (#f0893a) marking active entry

### Community 146 - "CMS Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 147 - "Perk Season Pass Region"
Cohesion: 0.47
Nodes (4): Season Pass region (+3% Pass XP), Extra Shift notable (+1,000 weekly Pass XP cap), Season Pass region (Pass XP), Study Group notable (+10% Pass XP)

### Community 148 - "App Icon"
Cohesion: 0.60
Nodes (5): Dark Monochrome Icon Palette, Dashed Reference Baseline, Game Station App Icon, Orange Accent Dot (#f0893a), Zigzag Trend Line Motif

### Community 149 - "BMC Extract Script"
Cohesion: 0.40
Nodes (4): h, idx, interesting, urls

## Ambiguous Edges - Review These
- `PatreonSection.tsx` → `Creator support / tip call-to-action`  [AMBIGUOUS]
  app/src/assets/bmc-default-yellow.png · relation: conceptually_related_to

## Knowledge Gaps
- **60 isolated node(s):** `command-station`, `command-cms`, `Command Station Card Gallery Report`, `Nightsteel unlockable look (120 Credits)`, `Ten-draw guarantee (at least one Regular theme)` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1128 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-grid-layout` connect `Dashboard Grid & Card Picker` to `Dashboard State Store`, `App Dependencies`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `DrawPage()` (e.g. with `tick()` and `gachaBannerIsNew()`) actually correct?**
  _`DrawPage()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `command-station`, `command-cms`, `Command Station Card Gallery Report` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Brag Video Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.051425899953249185 - nodes in this community are weakly interconnected._
- **Why does `Boot screen as cover over the real dashboard` connect `Boot Screen & Next Plans (docs)` to `Cleanup Plan & Reviews`, `Overwatch Cards`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `Calendar Card & Page` be split into smaller, more focused modules?**
  _Cohesion score 0.05446727185857621 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `PatreonSection.tsx` and `Creator support / tip call-to-action`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._