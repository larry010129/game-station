# Changes inventory (2026-11-18)

Every area of the 330+ uncommitted changes (`git status`), and where it is documented. Nothing here is committed yet.

| Area | Files (examples) | What changed | Documented in |
|---|---|---|---|
| **Daily check-in page** | `app/src/pages/CheckinPage.tsx`, `styles/checkin.css`, `state/useCheckinBoard.ts` (`useCheckinReady`), `layout/layouts.ts`, `App.tsx`, `components/ProfilePanel.tsx` | Check-in is its own tab (Travel Log pattern), with a ready dot; Quests only links to it | `UI REFERENCE PLAN.md` slice 8, `PLAN.md` (Daily check-in board), `app/README.md` (Pages) |
| **Check-in CMS control** | `state/checkinBoard.ts`, `state/gachaContent.ts` (`checkinPrizes`, `checkinEvent`), `cms/src/pages/CalendarPage.tsx`, `cms/src/lib/calendarEvents.ts` | Per-day prizes (tickets or items) and an optional dated event | `app/docs/content-updates.md`, `PLAN.md` |
| **Quests UI** | `pages/QuestsPage.tsx`, `styles/quests.css` (redesigned after the pass Missions screen: Payroll strip with Claim all, period tabs, quest bands with Claim / Go), `state/questEngine.ts`, `components/CreditIcon.tsx`, `currencyArt.ts` | Payroll header, Income icon, Theme pick wording, no ranks (flat 10 Income an hour) | `UI REFERENCE PLAN.md` (Quests page update, Ranks removed), `PLAN.md`, `app/README.md` |
| **Wiki: Skill tree** | `app/src/state/perkWiki.ts`, `app/service/test/perk-wiki.test.mjs`; `pages/WikiPage.tsx`, `state/wikiData.ts`, `components/CollectionHub.tsx`, `styles/hub.css`, `App.tsx` | New section and hub node: rules page, classes, every named node, grouped small nodes; taken nodes count as collected | `app/README.md`, `UI REFERENCE PLAN.md` |
| **Wiki** | `pages/WikiPage.tsx`, `state/wikiData.ts`, `components/CollectionHub.tsx`, `CardShowcase.tsx`, `SkinSample.tsx`, `WidgetSample.tsx`, `service/test/wiki-data.test.mjs` | Built from the live release; hub, odds, Showcase, `wikiHiddenIds` | `UI REFERENCE PLAN.md` (slices 1, 3, Wiki update), `app/README.md` |
| **News board** | `pages/NewsPage.tsx`, `state/newsRead.ts`, `useNewsRead.ts`, `styles/news.css` | News / Notices with unread dots on the tab | `UI REFERENCE PLAN.md` slice 2 |
| **Celebrate overlay** | `state/Celebrate.tsx`, `components/BrandUnlock.tsx` | Full-screen unlock moments | `UI REFERENCE PLAN.md` slice 1 |
| **Profile and Achievements** | `pages/ProfilePage.tsx`, `AchievementsPage.tsx`, `components/ProfilePanel.tsx`, `state/profile.ts`, `achievements.ts` | Station ID, totals, 22 achievements | `UI REFERENCE PLAN.md` slices 4, 5 |
| **Season Pass** | `pages/PassPage.tsx`, `state/seasonPass.ts`, `useSeasonPass.ts`, `styles/pass.css` | 30 levels, free and Patreon rows, 8000 XP weekly cap | `UI REFERENCE PLAN.md` slice 6 |
| **Perk tree and player levels** | `pages/PerksPage.tsx`, `components/PerkTree.tsx`, `state/perks.ts`, `perkStore.ts`, `playerLevel.ts`, generated `content/perkTreeData.ts`, `perkIcons.ts`, `playerLevelData.ts`, `design/perk-tree-sample/` | Branching tree, Perk Points from player level, band VI | `UI REFERENCE PLAN.md` slice 7 and later sections, `PERK TREE GUIDE.md`, `NEXT SESSION.md` |
| **Draw, items, card and widget packs** | `pages/DrawPage.tsx`, `state/gachaEngine.ts`, `cardEngine.ts`, `cardSkins.ts`, `items.ts`, `itemNames.ts`, `widgetStore.ts`, `components/CardSkinPicker.tsx`, `PackContents.tsx`, `styles/cardskins.css`, `cms/src/pages/CardsPage.tsx`, `WidgetsPage.tsx` | Card Pack skins, Widget Pack cards, ticket draws, odds | `PLAN.md` (Gacha), `GACHA REDESIGN.md`, `app/docs/ADDING-CONTENT.md` |
| **Themes and Patreon** | `pages/ThemesPage.tsx`, `state/themeCatalog.ts`, `patreon.ts`, `components/PatreonSection.tsx`, `PatronMenu.tsx`, `CreatorSettings.tsx`, `ThemeTune.tsx` (the old Corners / Glass blur / Opacity sliders were removed) | 30 free looks, locks, Patreon tiers, creator access | `PLAN.md`, `app/README.md` (Patreon sign-in) |
| **Boot screen** | `app/src/boot/BootStyleStages.tsx`, `bootStyles.ts`, `bootStyleList.ts`, `scriptedBoot.ts`, `BootScreen.tsx`, `components/BootStylePicker.tsx`, `styles/bootstyles.css` | `BootScreen` draws the equipped boot style (read once, the first paint) or the plain stage; a picker chooses it. Verified in the diff | `app/docs/ADDING-CONTENT.md`, `app/docs/card-dev/` |
| **Service** | `service/routes.mjs`, `gamemode.mjs`, `media.mjs`, `apex-meta.mjs`, `constants.mjs`, 24 files in `service/test/` | `/api/gamemode/active` waits for crash recovery (`recovering`); tests grew to 452 | `app/README.md` (Pages, Service API) |
| **CMS (Command CMS)** | `cms/server/*`, `cms/src/*`, `cms/src-tauri/`, `cms/scripts/*` | Desktop build, standalone server, cards and widgets pages, check-in controls | `START HERE.txt`, `cms/README.md`, `app/docs/content-updates.md` |
| **Command CMS desktop build** | `cms/src-tauri/`, `cms/server/standalone.mjs`, `cms/scripts/prepare-desktop.mjs`, `cms/app-icon.svg` | Own Tauri app serving on 127.0.0.1:1430; data in `%APPDATA%\CommandCMS\`. `cms/package.json` stays 0.1.0 | `START HERE.txt` |
| **Desktop shell and version** | `app/package.json`, `src-tauri/tauri.conf.json`, `Cargo.*` | Version 0.2.0 to 0.3.0 | `README.md` (badge), `START HERE.txt` |
| **Docs and plans** | `README.md`, `app/README.md`, `app/docs/*`, `PLAN.md`, `UI REFERENCE PLAN.md`, `NEXT SESSION.md`, `PERK TREE GUIDE.md`, `CHANGES INVENTORY.md` | Brought in line with the above | this table |
| **Traditional Chinese** | `app/src/lib/i18n.ts`, `app/src/i18n/en.ts`, `app/src/i18n/zhTW.ts`, `app/service/test/i18n.test.mjs`; wired in `App.tsx`, `TopBar.tsx`, `VaultPage.tsx`, `CheckinPage.tsx`, `CheckinBoard.tsx`, `QuestsPage.tsx`, `stationCredits.ts` (`formatCredits`) | Language switch (Vault), Taiwan-usage strings for the top bar, tabs, Check-in and Quests; other pages still English | `app/README.md` (Languages), `README.md` |
| **Reference screenshots** | `design/reference/honkai-star-rail/` (64 PNGs, 31 MB, plus `README.md`) | Every Honkai: Star Rail screenshot from interfaceingame, for layout reference only; not in git-ignore yet | `UI REFERENCE PLAN.md` (Source), the folder's `README.md` |
| **Generated or scratch (not documented, not source)** | `graphify-out/` (129 files), `cms/.vite/deps/`, `*_report.md`, `previews/`, `screenshots/`, `~$GACHA ODDS v5.xlsx` (deleted lock file) | Tool output and review reports | Consider adding to `.gitignore` before committing |

Wording used everywhere: the currency is **Income** (paid by **Payroll**); "Credits" is the thank-you roll; a locked look is a **theme**; Special tickets and 5-star items are rainbow, not gold.

Counts: the perk tree has 2,953 nodes (counted in `perkTreeData.ts`; older notes said 2,545 and 2,761, now corrected). Service tests: 452 pass.

## Verified by reading the code (2026-11-18)

Themes page now hosts the card-skin picker and the boot-style picker (12 boot styles, boot-01 to boot-12, won from packs or the pass), wording moved to theme / Income / fragments; `patreon.ts` stores `checkedAt` and a saved tier lapses after 14 days with no fresh answer (same as the service's grace). CMS Cards and Widgets pages run the Card Pack and Widget Pack (status, stars, price, ticket, pity) through the shared `PackSettingsPanels`.

## Behaviour changes in modified files (read from the diffs, 2026-11-18)

Read from `git diff` of every modified source file under `app/src`, `app/service`, `cms/src` and `cms/server` (74 files, +4,489 / -1,020 lines; the CSS is covered separately below).

**Service (`app/service`)**
- `gamemode.mjs`, `routes.mjs`: start-up crash recovery can be waited on (`whenRecovered`); `/api/gamemode/active` answers `recovering` instead of claiming game mode is on while it is being undone. Without Overwatch installed, the steps that need it are left out so closing apps (never undone) does not strand a half profile.
- `media.mjs`: the PowerShell helper forgets its last track when nothing plays, so the same track resuming sends its art again.
- `apex-meta.mjs`: hourly check, re-scrape once data is a day old; a specific Apex rank answers empty rather than the all-ranks list under its name.
- Tests extended to match: `gamemode`, `routes`, `media`, `apex-meta`, `gacha` (company-pack pity counts toward a featured theme, local-noon fortnights), `scheduled-release` (a scheduled release below a live one is not named; binary blobs byte for byte).

**App state and logic (`app/src/state`)**
- `gachaContent.ts`: new release fields `wikiHiddenIds`, a cash-bundle threshold for large gains, `cardPack`, `widgetPack`, `checkinEvent`, `checkinPrizes`; `DEFAULT_PACK_TICKETS` is Special for every pack.
- `gachaEngine.ts`: Card Pack and Widget Pack results and their own pity counters; weekly-unlock picks past the waiting cap become a streak freeze; `isRainbow` result helper.
- `questEngine.ts`, `useQuests.ts`: flat `MINUTES_PER_INCOME = 6` (`INCOME_PER_HOUR = 10`); `visibleQuests(period)`; perk bonuses on play and quests; session length uses awake (counted) time.
- `stationCredits.ts`: display names Income and Payroll; a damaged balance is copied to `cs.stationCredits.bad` before re-seeding.
- `patreon.ts`: saved entitlement lapses after 14 days with no fresh answer (`ENTITLEMENT_GRACE_MS`); `creatorAccess.ts`: `isCreatorUnlocked()` for non-React code; `items.ts`: `grantItem` reports a refused write.
- `useCheckinBoard.ts`, `checkinBoard.ts`: item prizes, event window, `grantTickets`, `useCheckinReady`.
- `useFeed.ts`: a slow answer for the previous game is dropped after a game switch, so its stories are not announced as new.

**App UI (`app/src`)**
- `App.tsx`: equipped Card Pack skin on the page root, free-placed cards recorded as owned, pages get the card context, new tabs and watchers, Check-in tab dot.
- `components/BrandUnlock.tsx` and `DrawBadges.tsx`: one shared 5-star moment for a first Brand or rainbow theme, 5-star card skin or dashboard card. `PackContents.tsx`: Card Pack and Widget Pack contents.
- `ThemeTune.tsx`: Fine-tune is locked ("Coming soon"); the sliders are out for now.
- `lib/previewSound.ts`: 20 synthesized alert sounds (Web Audio, no files). `lib/useSpotlight.ts`: spotlight sets only the cards' own variables (the perk tree made `<html>` updates cost ~130 ms a frame). `content/fetchRelease.ts`: release files fetched as raw bytes.
- `layout/*`: locked cards show why and how to get them; Hidden cards are not listed unless owned; per-game hero keys; `cardKeys.ts`.
- `pages/DrawPage.tsx`: Draw shell, odds rows, repeat pay in fragments, featured pool helpers, saved-state change signal.
- `boot/BootScreen.tsx`, `BootDemo.tsx`: boot styles (`&style=boot-07`, `&picker=1` demo switches).

**CMS (`cms/src`, `cms/server`)**
- `convert.mjs`, `validate.mjs`, `types/draft.ts`: Card Pack, Widget Pack, `checkinEvent`, `checkinPrizes`, `wikiHiddenIds` are validated on publish and converted to the app's shape.
- `store.mjs`: atomic writes (temp file then rename); blobs reused only if their hash still matches. `paths.mjs`: `COMMAND_CMS_DATA` moves the data folder. `http.mjs`: a bad path such as `//` no longer stops the standalone server.
- `CalendarPage.tsx`, `calendarEvents.ts`: check-in event and prize editors, a `checkin` calendar kind. `PushScheduler.tsx`, `schedule.ts`: warn when a push would overtake a still-scheduled release. `DashboardPage.tsx`: publish checks for the packs and the event.

**Styles, read from the added comment blocks of the diffs (`app.css`, `gacha-stage.css`, `station-ui.css`):** the Wiki page (section tabs, group rail, prize grid and details, narrow-width dialog, odds tables, collection tally); top-bar restructure (Income balance next to status chrome, one capsule of tool buttons, name and clock leave first at narrow widths); Income and Draw Ticket icon art (`CreditIcon`, `CurrencyIcon`, `CreditBalance`); the check-in ticket tones (Special is rainbow); the four 5-star reveal moments (Brand, rainbow theme, card skin, dashboard card); a locked "Coming soon" Fine-tune panel; light-theme fixes (deeper green, theme-coloured dim overlay); resize handles on every card edge and corner; Leak feed loading ring; Spotify card that drops rows as it shrinks; calendar page and game-event tints.

**Styles (file-level):** `app/src/styles/app.css` (+1,260 / -260), `gacha-stage.css`, `station-ui.css` and the new `checkin.css`, `pass.css`, `news.css`, `hub.css`, `profile.css`, `achievements.css`, `showcase.css`, `cardskins.css`, `bootstyles.css`: see the headers in Appendix B.

## Appendix: every changed file, by area (from `git status -uall`, 398 entries)

Status: M modified, ?? new, D deleted. Generated and scratch groups are counted, not listed.

### Generated (graphify) (129)
Tool output; not source and not documented individually. Regenerate or ignore.

### State engines and hooks (34)
- `app/src/state/checkinBoard.ts` (M)
- `app/src/state/creatorAccess.ts` (M)
- `app/src/state/gachaContent.ts` (M)
- `app/src/state/gachaEngine.ts` (M)
- `app/src/state/items.ts` (M)
- `app/src/state/patreon.ts` (M)
- `app/src/state/questEngine.ts` (M)
- `app/src/state/stationCredits.ts` (M)
- `app/src/state/themeCatalog.ts` (M)
- `app/src/state/useCheckinBoard.ts` (M)
- `app/src/state/useFeed.ts` (M)
- `app/src/state/useQuests.ts` (M)
- `app/src/state/useTheme.ts` (M)
- `app/src/state/Celebrate.tsx` (??)
- `app/src/state/achievements.ts` (??)
- `app/src/state/cardEngine.ts` (??)
- `app/src/state/cardSkinStore.ts` (??)
- `app/src/state/cardSkins.ts` (??)
- `app/src/state/itemFace.ts` (??)
- `app/src/state/itemNames.ts` (??)
- `app/src/state/newsRead.ts` (??)
- `app/src/state/perkStore.ts` (??)
- `app/src/state/perks.ts` (??)
- `app/src/state/playerLevel.ts` (??)
- `app/src/state/profile.ts` (??)
- `app/src/state/seasonPass.ts` (??)
- `app/src/state/unlocks.ts` (??)
- `app/src/state/useAchievements.ts` (??)
- `app/src/state/useNewsRead.ts` (??)
- `app/src/state/usePlayerLevel.ts` (??)
- `app/src/state/useSeasonPass.ts` (??)
- `app/src/state/widgetStore.ts` (??)
- `app/src/state/widgets.ts` (??)
- `app/src/state/wikiData.ts` (??)

### CMS (Command CMS) content tools (29)
- `cms/README.md` (M)
- `cms/data/draft.json` (M)
- `cms/data/releases/current.json` (M)
- `cms/package-lock.json` (M)
- `cms/package.json` (M)
- `cms/server/convert.mjs` (M)
- `cms/server/http.mjs` (M)
- `cms/server/paths.mjs` (M)
- `cms/server/store.mjs` (M)
- `cms/server/validate.mjs` (M)
- `cms/shared/releaseTypes.ts` (M)
- `cms/src/App.tsx` (M)
- `cms/src/components/PushScheduler.tsx` (M)
- `cms/src/components/RepeatRewards.tsx` (M)
- `cms/src/components/ThemeCardPreview.tsx` (M)
- `cms/src/components/ui/sidebar-nav.tsx` (M)
- `cms/src/lib/calendarEvents.ts` (M)
- `cms/src/lib/schedule.ts` (M)
- `cms/src/pages/CalendarPage.tsx` (M)
- `cms/src/pages/DashboardPage.tsx` (M)
- `cms/src/pages/ItemsPage.tsx` (M)
- `cms/src/pages/OddsPage.tsx` (M)
- `cms/src/pages/PreviewPage.tsx` (M)
- `cms/src/pages/ThemesPage.tsx` (M)
- `cms/src/types/draft.ts` (M)
- `cms/app-icon.svg` (??)
- `cms/src/components/PackSettingsPanels.tsx` (??)
- `cms/src/pages/CardsPage.tsx` (??)
- `cms/src/pages/WidgetsPage.tsx` (??)

### CMS desktop build (27)
- `cms/server/standalone.mjs` (??)
- `cms/src-tauri/.gitignore` (??)
- `cms/src-tauri/Cargo.lock` (??)
- `cms/src-tauri/Cargo.toml` (??)
- `cms/src-tauri/build.rs` (??)
- `cms/src-tauri/capabilities/default.json` (??)
- `cms/src-tauri/icons/128x128.png` (??)
- `cms/src-tauri/icons/128x128@2x.png` (??)
- `cms/src-tauri/icons/32x32.png` (??)
- `cms/src-tauri/icons/64x64.png` (??)
- `cms/src-tauri/icons/Square107x107Logo.png` (??)
- `cms/src-tauri/icons/Square142x142Logo.png` (??)
- `cms/src-tauri/icons/Square150x150Logo.png` (??)
- `cms/src-tauri/icons/Square284x284Logo.png` (??)
- `cms/src-tauri/icons/Square30x30Logo.png` (??)
- `cms/src-tauri/icons/Square310x310Logo.png` (??)
- `cms/src-tauri/icons/Square44x44Logo.png` (??)
- `cms/src-tauri/icons/Square71x71Logo.png` (??)
- `cms/src-tauri/icons/Square89x89Logo.png` (??)
- `cms/src-tauri/icons/StoreLogo.png` (??)
- `cms/src-tauri/icons/icon.icns` (??)
- `cms/src-tauri/icons/icon.ico` (??)
- `cms/src-tauri/icons/icon.png` (??)
- `cms/src-tauri/splash/index.html` (??)
- `cms/src-tauri/src/lib.rs` (??)
- `cms/src-tauri/src/main.rs` (??)
- `cms/src-tauri/tauri.conf.json` (??)

### Service tests (24)
- `app/service/test/apex-meta.test.mjs` (M)
- `app/service/test/checkin-board.test.mjs` (M)
- `app/service/test/cms-tickets.test.mjs` (M)
- `app/service/test/gacha.test.mjs` (M)
- `app/service/test/gamemode.test.mjs` (M)
- `app/service/test/media.test.mjs` (M)
- `app/service/test/quest-spec.test.mjs` (M)
- `app/service/test/routes.test.mjs` (M)
- `app/service/test/scheduled-release.test.mjs` (M)
- `app/service/test/achievements.test.mjs` (??)
- `app/service/test/card-pack.test.mjs` (??)
- `app/service/test/cms-cards.test.mjs` (??)
- `app/service/test/cms-store.test.mjs` (??)
- `app/service/test/cms-widgets.test.mjs` (??)
- `app/service/test/credit-big-amount.test.mjs` (??)
- `app/service/test/economy-fixes.test.mjs` (??)
- `app/service/test/news-read.test.mjs` (??)
- `app/service/test/perks.test.mjs` (??)
- `app/service/test/player-level.test.mjs` (??)
- `app/service/test/profile.test.mjs` (??)
- `app/service/test/rotation-local-day.test.mjs` (??)
- `app/service/test/season-pass.test.mjs` (??)
- `app/service/test/widget-pack.test.mjs` (??)
- `app/service/test/wiki-data.test.mjs` (??)

### Design pages (23)
- `design/perk-tree-sample/Perk Tree Item List.xlsx` (??)
- `design/perk-tree-sample/Perk Tree Sample.xlsx` (??)
- `design/perk-tree-sample/band-vi-constellations.html` (??)
- `design/perk-tree-sample/build.py` (??)
- `design/perk-tree-sample/class-nodes-preview.png` (??)
- `design/perk-tree-sample/class-shape-variants.html` (??)
- `design/perk-tree-sample/class-zodiac-variants.html` (??)
- `design/perk-tree-sample/constellations.py` (??)
- `design/perk-tree-sample/inner-spacing-preview.png` (??)
- `design/perk-tree-sample/level-curve.html` (??)
- `design/perk-tree-sample/new_bands.py` (??)
- `design/perk-tree-sample/node-sizes-preview.png` (??)
- `design/perk-tree-sample/perk-classes.html` (??)
- `design/perk-tree-sample/perk-node-icons.html` (??)
- `design/perk-tree-sample/perk-node-icons.v1.html` (??)
- `design/perk-tree-sample/perk-stats.html` (??)
- `design/perk-tree-sample/perk-tree-constellations-preview.html` (??)
- `design/perk-tree-sample/perk-tree-sample.html` (??)
- `design/perk-tree-sample/player-level-xp.html` (??)
- `design/perk-tree-sample/proposed_bands.py` (??)
- `design/perk-tree-sample/reference_pages.py` (??)
- `design/perk-tree-sample/template.html` (??)
- `design/perk-tree-sample/tree_content.py` (??)

### Components (21)
- `app/src/components/BrandUnlock.tsx` (M)
- `app/src/components/CheckinBoard.tsx` (M)
- `app/src/components/CreatorSettings.tsx` (M)
- `app/src/components/DrawBadges.tsx` (M)
- `app/src/components/PackContents.tsx` (M)
- `app/src/components/PatreonSection.tsx` (M)
- `app/src/components/PatronMenu.tsx` (M)
- `app/src/components/StarTag.tsx` (M)
- `app/src/components/ThemeTune.tsx` (M)
- `app/src/components/TopBar.tsx` (M)
- `app/src/components/CardShowcase.tsx` (??)
- `app/src/components/CardSkinPicker.tsx` (??)
- `app/src/components/CollectionHub.tsx` (??)
- `app/src/components/CreditIcon.tsx` (??)
- `app/src/components/CurrencyIcon.tsx` (??)
- `app/src/components/PerkTree.tsx` (??)
- `app/src/components/ProfilePanel.tsx` (??)
- `app/src/components/SkinSample.tsx` (??)
- `app/src/components/WidgetSample.tsx` (??)
- `app/src/components/creditArt.ts` (??)
- `app/src/components/currencyArt.ts` (??)

### Docs (19)
- `app/docs/DEVELOPMENT.md` (M)
- `app/docs/content-updates.md` (M)
- `app/docs/ADDING-CONTENT.md` (??)
- `app/docs/card-dev/01-card-definition.md` (??)
- `app/docs/card-dev/02-card-component.md` (??)
- `app/docs/card-dev/03-registry-and-context.md` (??)
- `app/docs/card-dev/04-data-and-polling.md` (??)
- `app/docs/card-dev/05-storage-and-reset.md` (??)
- `app/docs/card-dev/06-looks.md` (??)
- `app/docs/card-dev/07-styling-themes-skins.md` (??)
- `app/docs/card-dev/08-widget-pack-and-locking.md` (??)
- `app/docs/card-dev/09-preview-and-testing.md` (??)
- `app/docs/card-dev/10-submission.md` (??)
- `app/docs/card-dev/11-worked-example.md` (??)
- `app/docs/card-dev/CARD-REFERENCE.md` (??)
- `app/docs/card-dev/README.md` (??)
- `app/docs/card-dev/card-spec.template.md` (??)
- `app/docs/icon-options.html` (??)
- `docs/designs/logic-fixes-round5.md` (??)

### Generated (Vite cache) (17)
Tool output; not source and not documented individually. Regenerate or ignore.

### Styles (12)
- `app/src/styles/app.css` (M)
- `app/src/styles/gacha-stage.css` (M)
- `app/src/styles/station-ui.css` (M)
- `app/src/styles/achievements.css` (??)
- `app/src/styles/bootstyles.css` (??)
- `app/src/styles/cardskins.css` (??)
- `app/src/styles/checkin.css` (??)
- `app/src/styles/hub.css` (??)
- `app/src/styles/news.css` (??)
- `app/src/styles/pass.css` (??)
- `app/src/styles/profile.css` (??)
- `app/src/styles/showcase.css` (??)

### Pages (11)
- `app/src/pages/BuyCreditsPage.tsx` (M)
- `app/src/pages/DrawPage.tsx` (M)
- `app/src/pages/QuestsPage.tsx` (M)
- `app/src/pages/ThemesPage.tsx` (M)
- `app/src/pages/AchievementsPage.tsx` (??)
- `app/src/pages/CheckinPage.tsx` (??)
- `app/src/pages/NewsPage.tsx` (??)
- `app/src/pages/PassPage.tsx` (??)
- `app/src/pages/PerksPage.tsx` (??)
- `app/src/pages/ProfilePage.tsx` (??)
- `app/src/pages/WikiPage.tsx` (??)

### Docs and plans (9)
- `GACHA REDESIGN.md` (M)
- `PLAN.md` (M)
- `README.md` (M)
- `START HERE.txt` (M)
- `CHANGES INVENTORY.md` (??)
- `NEXT SESSION.md` (??)
- `PERK TREE GUIDE.md` (??)
- `Start Localhost.bat` (??)
- `UI REFERENCE PLAN.md` (??)

### Boot screen (7)
- `app/src/boot/BootDemo.tsx` (M)
- `app/src/boot/BootScreen.tsx` (M)
- `app/src/boot/BootStyleStages.tsx` (??)
- `app/src/boot/bootStyleList.ts` (??)
- `app/src/boot/bootStyles.ts` (??)
- `app/src/boot/scriptedBoot.ts` (??)
- `app/src/components/BootStylePicker.tsx` (??)

### Review report (scratch) (6)
- `comprehension_report.md` (??)
- `critic_report.md` (??)
- `design_draft.md` (??)
- `implementation_readiness_report.md` (??)
- `intermediate_zoom_out_report.md` (??)
- `zoom_out_report.md` (??)

### Service (5)
- `app/service/apex-meta.mjs` (M)
- `app/service/constants.mjs` (M)
- `app/service/gamemode.mjs` (M)
- `app/service/media.mjs` (M)
- `app/service/routes.mjs` (M)

### Content data (generated tree/levels) (4)
- `app/src/content/fetchRelease.ts` (M)
- `app/src/content/perkIcons.ts` (??)
- `app/src/content/perkTreeData.ts` (??)
- `app/src/content/playerLevelData.ts` (??)

### Layout and tabs (4)
- `app/src/layout/CardPicker.tsx` (M)
- `app/src/layout/cardKeys.ts` (M)
- `app/src/layout/layouts.ts` (M)
- `app/src/layout/registry.tsx` (M)

### CMS desktop build / seed (4)
- `cms/scripts/seed-draft.mjs` (M)
- `cms/scripts/prepare-desktop.mjs` (??)
- `cms/scripts/wallpapers/gen.html` (??)
- `cms/scripts/wallpapers/render.mjs` (??)

### Other (3)
- `.claude/launch.json` (M)
- `~$GACHA ODDS v5.xlsx` (D)
- `.graphifyignore` (??)

### App config (3)
- `app/README.md` (M)
- `app/package.json` (M)
- `app/tsconfig.json` (M)

### Desktop shell / version (3)
- `app/src-tauri/Cargo.lock` (M)
- `app/src-tauri/Cargo.toml` (M)
- `app/src-tauri/tauri.conf.json` (M)

### App shell (2)
- `app/src/App.tsx` (M)
- `app/src/main.tsx` (M)

### Lib (2)
- `app/src/lib/previewSound.ts` (M)
- `app/src/lib/useSpotlight.ts` (M)

## Appendix B: what each source file is, read from the file itself

One line per file, taken from the file's own header comment, its first heading or its test names (tests also list how many cases). Generated groups are covered by the check below instead.

| File | St | What it says it is |
|---|---|---|
| `.claude/launch.json` | M | adds a `frontend-alt-port` dev server on 1421 (diff read) |
| `GACHA REDESIGN.md` | M | Gacha drop redesign (Draw Theme) |
| `PLAN.md` | M | Looks |
| `README.md` | M | Command Station |
| `START HERE.txt` | M | adds the Command CMS desktop build and install steps and its `%APPDATA%\CommandCMS\` data folder (diff read) |
| `app/README.md` | M | Command Station |
| `app/docs/DEVELOPMENT.md` | M | Development |
| `app/docs/content-updates.md` | M | Content updates (Phase 3) |
| `app/package.json` | M | version 0.2.0 to 0.3.0 (diff read) |
| `app/service/apex-meta.mjs` | M | * Apex Legends meta pack shaped like Counterwatch's MetaData so the same cards can swap. Legend pick rates are scraped live from Apex Legends Status.  |
| `app/service/constants.mjs` | M | The one port the service listens on. The dashboard (live.ts) and the Tauri CSP are fixed to it, so it is not configurable. |
| `app/service/gamemode.mjs` | M | * Validates a step sent by a client and keeps only what we use: id, label, before, after (strings, length-capped) and an optional entryId. Throws an E |
| `app/service/media.mjs` | M | Kills a wedged helper; the next command starts a fresh one. |
| `app/service/routes.mjs` | M | * The service's HTTP routes, keyed "METHOD /path". 'd' carries the modules and a few lookups that index.mjs owns ('machine()' and 'port()' are functio |
| `app/service/test/apex-meta.test.mjs` | M | 8 tests: slugifyLegend hyphenates Mad Maggie; parseAlsPickRates reads pick %, 7d delta, avg rank; weapon catalog covers full BR floor arsenal … |
| `app/service/test/checkin-board.test.mjs` | M | 12 tests: a run pays only Special Tickets: 1 a day, 2 on Day 3 and 3 o; a claim needs today; one box per local day, and the next opens at local midnight … |
| `app/service/test/cms-tickets.test.mjs` | M | 3 tests: a draft without ticket or add-back settings publishes the de; ticket choices and Brand looks added back to Regular reach t; the CMS rejects a bad ticket kind, an unknown pack and an un |
| `app/service/test/gacha.test.mjs` | M | 32 tests: prices: Regular 100/900, Brand 150/1350, chosen look 120; default content equals the redesign plan and validates; invalid content is rejected and bundled content is kept … |
| `app/service/test/gamemode.test.mjs` | M | 36 tests: write-ahead: a pending entry is on disk before the system ch; failed apply is undone best-effort and removed; crash mid-recovery: entries are removed one at a time, only  … |
| `app/service/test/media.test.mjs` | M | 9 tests: 3 silent commands in a row recycle the helper; the next comm; late output from a recycled helper never reaches the new hel; a helper that exits answers every waiting command at once … |
| `app/service/test/quest-spec.test.mjs` | M | 14 tests: periods reset at local midnight, Monday 00:00 and the 1st; every spec quest exists with the spec reward and target; there are no ranks: play pays one flat rate, 1 Income per 6  … |
| `app/service/test/routes.test.mjs` | M | 4 tests: health reports the journal and the diag reads the live port; a game-mode step is recorded in the session history, and an ; the route table has no duplicate-shaped or non-function entr … |
| `app/service/test/scheduled-release.test.mjs` | M | 8 tests: mm/dd/yy hh:mm is read as local 24-hour time, and impossible; a push needs a go-live time that has not passed; a release without a go-live time is live at once … |
| `app/src-tauri/Cargo.lock` | M | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `app/src-tauri/Cargo.toml` | M | version 0.2.0 to 0.3.0 (diff read) |
| `app/src-tauri/tauri.conf.json` | M | 43 lines |
| `app/src/App.tsx` | M | The dashboard grid, memoised so it redraws only when its own inputs change (cards read ctx from context, not from props). |
| `app/src/boot/BootDemo.tsx` | M | * Design preview only: /?boot=demo plays the boot screen on a scripted timeline, no service needed. Add &fail=1 for the no-signal state, &short=1 for  |
| `app/src/boot/BootScreen.tsx` | M | * Full loading work surface over the dashboard ghost. Frames assemble underneath; this layer reports real boot work; on ready it peels away and the ex |
| `app/src/components/BrandUnlock.tsx` | M | Relative luminance of a #rgb / #rrggbb colour, or null when it is not a hex value. |
| `app/src/components/CheckinBoard.tsx` | M | * The Draw Ticket mark: a pass on a lanyard. Regular is silver; Special is the 5-star rainbow and shows a star. The drawing and its tones live in Curr |
| `app/src/components/CreatorSettings.tsx` | M | Vault section: one code field. The right code turns the local creator unlock on or off. |
| `app/src/components/DrawBadges.tsx` | M | The packs a reveal can come from: the three theme packs and the Card Pack. |
| `app/src/components/PackContents.tsx` | M | An item row's swatch: its kind's icon (a wallpaper, a bell for a sound); other rows keep the plain swatch. |
| `app/src/components/PatreonSection.tsx` | M | The public tiers. Prices and benefits are set on Patreon; the app only turns on Basic and Brand. |
| `app/src/components/PatronMenu.tsx` | M | * The Patreon sign-in, in the top bar. The button shows who is signed in at a glance; its panel holds log in, check again and log out. The person sign |
| `app/src/components/StarTag.tsx` | M | * Theme rarity. 5★ is a rainbow look: a company look (Brand or Region) or a rainbow Regular theme; 4★ is a standard Regular theme (the gold badge). A  |
| `app/src/components/ThemeTune.tsx` | M | What the active theme itself uses, shown until a slider is moved. |
| `app/src/components/TopBar.tsx` | M | Opens the profile panel. |
| `app/src/content/fetchRelease.ts` | M | Raw bytes: release files are hashed byte for byte, and a banner image is not text. |
| `app/src/layout/CardPicker.tsx` | M | Offer every card, not just the ones that belong to this tab by default. |
| `app/src/layout/cardKeys.ts` | M | Storage keys that belong to one copy of a card. They go away when that copy is removed. |
| `app/src/layout/layouts.ts` | M | Every card the dashboard can show. 'size' is [width, height] in 24-column grid units; 'min' is the smallest readable size. |
| `app/src/layout/registry.tsx` | M | What the cards need from the app around them. Each card picks out only what it shows. |
| `app/src/lib/previewSound.ts` | M | * The 20 alert sounds ('alert-sound-01' to 'alert-sound-20'). Each is a hand-made recipe synthesized with Web Audio, so the app needs no sound files.  |
| `app/src/lib/useSpotlight.ts` | M | * Cursor spotlight for the dashboard cards: a soft glow and a lit edge that follow the mouse. Each card gets the pointer position relative to itself ( |
| `app/src/main.tsx` | M | Voices a theme can switch the UI into. Declared up front but only fetched when a |
| `app/src/pages/BuyCreditsPage.tsx` | M | Official yellow mark: https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png |
| `app/src/pages/DrawPage.tsx` | M | Same-tab change signal for the saved gacha state (storage events only reach other windows). |
| `app/src/pages/QuestsPage.tsx` | M | "5 h 12 min", "2 days", "40 min": how long until a period resets. |
| `app/src/pages/ThemesPage.tsx` | M | Pip centres on a 24-unit die face, and which of them each face (1-6) shows. |
| `app/src/state/checkinBoard.ts` | M | * The 7-day check-in board. Pure rules over a plain state object (no storage, React or clock of its own), so every rule is tested by passing a state a |
| `app/src/state/creatorAccess.ts` | M | * Turns the local creator unlock on. The reset code is only recognised here: wiping the install is a factory reset (see factoryReset.ts), which the ca |
| `app/src/state/gachaContent.ts` | M | * Bundled gacha tables, items and prices (Phase 1). Data only — no React, storage or draws. Equals GACHA REDESIGN.md; Brand Pack Common is 57% (not th |
| `app/src/state/gachaEngine.ts` | M | * Gacha rules as plain functions (no React or storage). Regular, Brand and Region packs, items, pity, crystals. The Region Pack is a fork of the Brand |
| `app/src/state/items.ts` | M | * Item store: owned one-time set + stackable counts, persisted locally. * Apply path (GachaModal / other agents — do not call from draw logic here): - |
| `app/src/state/patreon.ts` | M | What the service reports about the Patreon sign-in (see service/patreon.mjs). |
| `app/src/state/questEngine.ts` | M | * Quest rules. Pure functions over a plain state object, with no storage, React or clock of their own, so every rule can be tested by passing a state  |
| `app/src/state/stationCredits.ts` | M | Vite's env, or undefined when this module runs outside Vite (the service tests import it under plain Node). |
| `app/src/state/themeCatalog.ts` | M | * Local demo: the first two Brand looks, and two Taiwan Region looks (an East Asia week), are Available so the Brand and Region Packs can be exercised |
| `app/src/state/useCheckinBoard.ts` | M | The check-in board and Draw Tickets, saved on this PC (a 'cs.' key, so factory reset clears it). |
| `app/src/state/useFeed.ts` | M | After the first cache hit, re-read soon so a background refresh can paint. |
| `app/src/state/useQuests.ts` | M | Quest progress, saved on this PC. |
| `app/src/state/useTheme.ts` | M | Before the wallpaper moved to IndexedDB, the whole picture lived here. |
| `app/src/styles/app.css` | M | Command Station, Vexto-style look. Charcoal glass tiles, thin light type, hairline white charts. Orange marks cautions and drops; red is kept for aler |
| `app/src/styles/gacha-stage.css` | M | ---- Draw Theme: a viewport stage of badges. Motion comes from the clock in DrawBadges.tsx. ---- |
| `app/src/styles/station-ui.css` | M | ---- Patron button + panel in the top bar ---- |
| `app/tsconfig.json` | M | excludes the abandoned `CardGallery.tsx` from the build (diff read) |
| `cms/README.md` | M | Game Station CMS |
| `cms/data/draft.json` | M | 6254 lines |
| `cms/data/releases/current.json` | M | current release 11 to 12, published 2026-11-17 (diff read) |
| `cms/package-lock.json` | M | 3225 lines |
| `cms/package.json` | M | version 0.0.1 to 0.1.0; adds `tauri`, `prepare:desktop`, `desktop:build`, `serve` scripts (diff read) |
| `cms/scripts/seed-draft.mjs` | M | * Rebuild cms/data/draft.json from app themeCatalog look()/brand() + brandTags.ts + gacha defaults. Run: node cms/scripts/seed-draft.mjs [out.json]    |
| `cms/server/convert.mjs` | M | * CmsDraft (UI, weights as %) ↔ content bundle (app, weights as 0–1 fractions). |
| `cms/server/http.mjs` | M | * Connect/Vite middleware: handles /api/* and /releases*. |
| `cms/server/paths.mjs` | M | cms/ package root |
| `cms/server/store.mjs` | M | * Written to a temp file first, then renamed over the target, so a crash or kill mid-write cannot leave a half-written draft, manifest or current.json |
| `cms/server/validate.mjs` | M | * Publish-gate validation — same spirit as app validateContent (gachaContent.ts) and cms/src/types/draft.ts validateDraftForPublish: drop tables total |
| `cms/shared/releaseTypes.ts` | M | * Shared content-release types for CMS + app (dev host at localhost:1430/releases). App agent: copy or import; trust the CMS test public key in dev on |
| `cms/src/App.tsx` | M | 63 lines |
| `cms/src/components/PushScheduler.tsx` | M | Fired after a push so lists (the Releases page) can reload. |
| `cms/src/components/RepeatRewards.tsx` | M | What a repeat of each kind is worth. A featured theme pays Special crystals; everything else pays Regular crystals. |
| `cms/src/components/ThemeCardPreview.tsx` | M | The app's font stacks by palette key (app: FONTS in state/palette.ts). Faces the CMS has not loaded fall back. |
| `cms/src/components/ui/sidebar-nav.tsx` | M | * The CMS sidebar, built on the Animated Sidebar (beui.dev): it folds to an icon rail, becomes a drawer on a phone, glides one highlight between rows, |
| `cms/src/lib/calendarEvents.ts` | M | * Calendar entries read straight from the draft: banners, Brand Pack featured runs, the Region week and release go-lives. Nothing here is stored; the  |
| `cms/src/lib/schedule.ts` | M | * Go-live times for a Push, typed as 'mm/dd/yy hh:mm' (24-hour, the owner's local time). Pure helpers, no React. |
| `cms/src/pages/CalendarPage.tsx` | M | * Calendar: every dated setting in the draft on one sideways-scrolling timeline, each bar as long as it runs. Built live from the draft (banners, Bran |
| `cms/src/pages/DashboardPage.tsx` | M | The same rules the publish step enforces (see validateDraftForPublish), one row per rule. |
| `cms/src/pages/ItemsPage.tsx` | M | Bumps when a local blob preview is attached so Play picks it up. |
| `cms/src/pages/OddsPage.tsx` | M | 0.67%, 0.33%, 13%: a share of draws as the app's Published odds show it. |
| `cms/src/pages/PreviewPage.tsx` | M | 110 lines |
| `cms/src/pages/ThemesPage.tsx` | M | Hue (0–360) of a #hex, rgb() or hsl() colour, so the Accent column sorts as a colour wheel. Grey sorts last. |
| `cms/src/types/draft.ts` | M | CMS draft shape — mirrors app gachaContent + themeCatalog for editors. |
| `~$GACHA ODDS v5.xlsx` | D | (deleted) |
| `.graphifyignore` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `CHANGES INVENTORY.md` | ?? | Changes inventory (2026-11-18) |
| `NEXT SESSION.md` | ?? | Next session: design (written 2026-11-18) |
| `PERK TREE GUIDE.md` | ?? | Perk tree and player levels: data reference |
| `Start Localhost.bat` | ?? | 57 lines |
| `UI REFERENCE PLAN.md` | ?? | UI reference plan: ten screens from interfaceingame.com (Honkai: Star Rail) |
| `app/docs/ADDING-CONTENT.md` | ?? | Adding content: cards, themes, card skins, items |
| `app/docs/card-dev/01-card-definition.md` | ?? | 1. Card definition |
| `app/docs/card-dev/02-card-component.md` | ?? | 2. Card component |
| `app/docs/card-dev/03-registry-and-context.md` | ?? | 3. Registry and context |
| `app/docs/card-dev/04-data-and-polling.md` | ?? | 4. Data and polling |
| `app/docs/card-dev/05-storage-and-reset.md` | ?? | 5. Storage and reset |
| `app/docs/card-dev/06-looks.md` | ?? | 6. Looks |
| `app/docs/card-dev/07-styling-themes-skins.md` | ?? | 7. Styling, themes and skins |
| `app/docs/card-dev/08-widget-pack-and-locking.md` | ?? | 8. Widget Pack and locking |
| `app/docs/card-dev/09-preview-and-testing.md` | ?? | 9. Preview and testing |
| `app/docs/card-dev/10-submission.md` | ?? | 10. Submission (planned) |
| `app/docs/card-dev/11-worked-example.md` | ?? | 11. Worked example: "Ping goal" card |
| `app/docs/card-dev/CARD-REFERENCE.md` | ?? | Card reference |
| `app/docs/card-dev/README.md` | ?? | Card developer guide |
| `app/docs/card-dev/card-spec.template.md` | ?? | Card spec: '<your-card-id>' |
| `app/docs/icon-options.html` | ?? | Currency icon options |
| `app/service/test/achievements.test.mjs` | ?? | 7 tests: every achievement has a unique id, a known category and a po; the first check seeds quietly; later ones announce; nothing new returns the same object … |
| `app/service/test/card-pack.test.mjs` | ?? | 13 tests: bundled Card Pack: 12 four-star and 6 five-star skins, odds ; a 4-star-or-better skin comes at least every 10 draws; a 5-star skin is forced on the 70th draw since the last one, … |
| `app/service/test/cms-cards.test.mjs` | ?? | 6 tests: a draft without a Card Pack or check-in event publishes the ; a Card Pack and a check-in window from the CMS reach the app; publish is blocked by Card Pack odds that miss 100%, a pack  … |
| `app/service/test/cms-store.test.mjs` | ?? | 5 tests: A5: a crash while saving the draft leaves the previous draft; A5: a crash while publishing leaves current.json pointing at; A6: a damaged blob is rewritten by the next publish that use … |
| `app/service/test/cms-widgets.test.mjs` | ?? | 6 tests: the CMS card list is the app; a draft without a Widget Pack publishes none, so every card ; the default Widget Pack (every card Free) publishes and keep … |
| `app/service/test/credit-big-amount.test.mjs` | ?? | 7 tests: a gain is big only above the amount, never at it; bundled content uses the default, and today; an older release without the field still loads and falls bac … |
| `app/service/test/economy-fixes.test.mjs` | ?? | 10 tests: B1: more than 50 earned looks survive a load (no numeric cap; B2: a pick won while the waiting-picks slots are full become; B3: a corrupt balance is kept aside before the 200 re-seed,  … |
| `app/service/test/news-read.test.mjs` | ?? | 6 tests: a fresh install treats only the last few days as new; a notice with no date stays unread until read; markRead adds once and returns the same object when nothing  … |
| `app/service/test/perks.test.mjs` | ?? | 22 tests: the generated tree is whole: one core, eight classes each wi; every stat the app applies is on the tree; points come from the player level: 4 to start, banded after, … |
| `app/service/test/player-level.test.mjs` | ?? | 10 tests: the table covers levels 1 to 300 and the real MapleStory num; every level earns between 0.5% and 4.2% of itself per 10 min; pacing: level 100 in about a season at 31 h a week, level 25 … |
| `app/service/test/profile.test.mjs` | ?? | 1 tests: labels |
| `app/service/test/rotation-local-day.test.mjs` | ?? | 1 tests: B6: the Brand pair changes at local Monday 00:00 in ${tz} |
| `app/service/test/season-pass.test.mjs` | ?? | 15 tests: seasons run SEASON_DAYS from the anchor; the first sync only records the totals; XP comes from new minutes and tasks, and nothing changes wit … |
| `app/service/test/widget-pack.test.mjs` | ?? | 7 tests: every dashboard card has a cost row, and its Wiki key never ; bundled content: every card is Free, nothing is locked, and ; lock rule: status × owned × Patreon / creator … |
| `app/service/test/wiki-data.test.mjs` | ?? | 2 tests: wiki chances follow the bundled tables; CMS draft → release → app: wikiHiddenIds keeps prizes off th |
| `app/src/boot/BootStyleStages.tsx` | ?? | * The stage of each boot style: what draws the work while the shell (BootScreen) keeps the backdrop, the exit timer, the screen-reader list and the re |
| `app/src/boot/bootStyleList.ts` | ?? | * The twelve boot screen styles. The ids are the catalog item ids ('boot-01' to 'boot-12') that the packs and the season pass already hand out, so the |
| `app/src/boot/bootStyles.ts` | ?? | The boot screen this PC starts with (a 'cs.' key: factory reset clears it). |
| `app/src/boot/scriptedBoot.ts` | ?? | * A boot played on a timer, with no service behind it: the dev demo (/?boot=demo) and the boot style preview on the Themes page both use it. 'fail' en |
| `app/src/components/BootStylePicker.tsx` | ?? | * Boot screens on the Themes page. Each style is a one-time item (boot-01 to boot-12) won from the packs or the season pass; the plain screen is free. |
| `app/src/components/CardShowcase.tsx` | ?? | What the card shows in its window. |
| `app/src/components/CardSkinPicker.tsx` | ?? | * Card skins on the Themes page. Skins start locked: the player wins them from the Card Pack or buys one outright (the CMS sets the price per tier; a  |
| `app/src/components/CollectionHub.tsx` | ?? | "owned" for prizes, "pages" for reading such as the draw rules (no owned count). |
| `app/src/components/CreditIcon.tsx` | ?? | Which drawing a Credits amount gets: the coins, or the cash bundle for one gain above the CMS amount. |
| `app/src/components/CurrencyIcon.tsx` | ?? | * A shaded currency icon: the Draw Ticket (a pass on a lanyard) or the fragment (two floppy disks). Regular is silver and Special is the 5-star rainbo |
| `app/src/components/PerkTree.tsx` | ?? | Node sizes in tree units. |
| `app/src/components/ProfilePanel.tsx` | ?? | The player's monogram in rings. |
| `app/src/components/SkinSample.tsx` | ?? | * A stand-in dashboard card wearing a card skin: a header, one reading and two bars. The skin's look comes from styles/cardskins.css through 'data-ski |
| `app/src/components/WidgetSample.tsx` | ?? | A dashboard card as a Widget Pack prize: its name, group and what it does, in a card frame, plus what it costs to run. |
| `app/src/components/creditArt.ts` | ?? | * Drawings for the Credits icon: a coin heap (the icon itself) and a cash bundle (one big gain). Generated from app/docs/icon-options.html (options M4 |
| `app/src/components/currencyArt.ts` | ?? | * Drawings for the currency icons: the Draw Ticket (a pass on a lanyard) and the fragment (two floppy disks). Generated from app/docs/icon-options.htm |
| `app/src/content/perkIcons.ts` | ?? | Generated by design/perk-tree-sample/build.py from perk-node-icons.html. Do not edit by hand. |
| `app/src/content/perkTreeData.ts` | ?? | Generated by design/perk-tree-sample/build.py from the perk tree workbook. Do not edit by hand: |
| `app/src/content/playerLevelData.ts` | ?? | Generated by design/perk-tree-sample/build.py from player-level-xp.html. Do not edit by hand: |
| `app/src/pages/AchievementsPage.tsx` | ?? | * Achievements: a row of category plaques (the chosen one lifted to the front), a medal tally, and the chosen category's milestones with how far along |
| `app/src/pages/CheckinPage.tsx` | ?? | "5h 12m" / "2d 4h" until 'to'. |
| `app/src/pages/NewsPage.tsx` | ?? | One tile on the board: a story from the feed, or a station notice. |
| `app/src/pages/PassPage.tsx` | ?? | * The Season Pass: the level badge, time left and XP up top; a track of levels, each with a Free and a Patreon reward; and the last Patreon reward on  |
| `app/src/pages/PerksPage.tsx` | ?? | The perk tree as a page of its own in the top bar: the tree, with its details panel on the right. |
| `app/src/pages/ProfilePage.tsx` | ?? | * The profile page: sections down the left, your station card in the middle (wearing your card skin), and the chosen section's numbers on the right. |
| `app/src/pages/WikiPage.tsx` | ?? | The hub puts the biggest collection in the middle, then the rest around it. |
| `app/src/state/Celebrate.tsx` | ?? | * A moment worth stopping for: a new rank, a first card, an achievement, a pass level. One at a time, in order. Everyday news (a claimed day, a saved  |
| `app/src/state/achievements.ts` | ?? | * Achievements: milestones read from what the station already records (play time, tasks, draws, the collection, settings). Data and plain functions on |
| `app/src/state/cardEngine.ts` | ?? | * Card Pack rules as plain functions (no React or storage): dashboard card skins at 4 and 5 stars, with items on the other rows. Its pity lives in Gac |
| `app/src/state/cardSkinStore.ts` | ?? | Card skins won from the Card Pack and the one the dashboard wears, saved on this PC (a 'cs.' key: factory reset clears it). |
| `app/src/state/cardSkins.ts` | ?? | * Dashboard card skins: the prizes of the Card Pack. A skin restyles every dashboard card (frame, surface, edge light) on top of the active theme, so  |
| `app/src/state/itemFace.ts` | ?? | The icon for each item kind, shared by Draw, the Season Pass and the Wiki. Names live in itemNames.ts. |
| `app/src/state/itemNames.ts` | ?? | * What a drawn item is called: its own name ("Dawn Bell", "Sweep", "Night Grid") and its kind ("Alert sound · Chime"). Plain data, no React: the Wiki  |
| `app/src/state/newsRead.ts` | ?? | * Which news stories and notices the player has read. Data and plain functions only (no React or storage), so the Node tests can load it. * A story co |
| `app/src/state/perkStore.ts` | ?? | * Perk storage and the effects in force. Reads the player level straight from storage (not through its hook), so the quest timer and the pass watcher  |
| `app/src/state/perks.ts` | ?? | * The Station perk tree. Data and plain functions only (no React or storage), so the Node tests can load it. * The tree itself (about 1,500 nodes in e |
| `app/src/state/playerLevel.ts` | ?? | * Player levels (decided 2026-11-18). Data and plain functions only (no React or storage), so the Node tests can load it. * - The time the app is runn |
| `app/src/state/profile.ts` | ?? | * The player's profile in numbers: lifetime totals and small labels. Data and plain functions only (no React or storage), so the Node tests can load i |
| `app/src/state/seasonPass.ts` | ?? | * The Season Pass. Pure rules over a plain state object (no storage, React or clock of its own), so the Node tests can drive every rule with a state a |
| `app/src/state/unlocks.ts` | ?? | * Saved look unlocks ('cs.themeUnlocks'): a list of theme ids. Junk and repeats are dropped, but never a real id: this list is saved straight back, so |
| `app/src/state/useAchievements.ts` | ?? | The stores whose changes can unlock something. Theme unlocks and the name have no event; the timer covers them. |
| `app/src/state/useNewsRead.ts` | ?? | Reads the saved state; the first run's 'since' is saved straight away so it never moves. |
| `app/src/state/usePlayerLevel.ts` | ?? | Player level storage and its clock. The level is saved as the level plus the XP inside it. |
| `app/src/state/useSeasonPass.ts` | ?? | Hands one reward out. False when a store refused it, so the claim is not saved. |
| `app/src/state/widgetStore.ts` | ?? | Dashboard cards owned (won from the Widget Pack, or placed while Free), saved on this PC (a 'cs.' key). |
| `app/src/state/widgets.ts` | ?? | * Dashboard cards as Widget Pack prizes: each card's default stars and what it costs to run, plus the lock rules. Data and plain functions only (no Re |
| `app/src/state/wikiData.ts` | ?? | * The Draw Wiki: every drawable prize and draw rule as a wiki page, built from the live release (never from GACHA REDESIGN.md, whose numbers are older |
| `app/src/styles/achievements.css` | ?? | Achievements: a row of category plaques under a soft spotlight, a medal tally, and the chosen category's list. Medal colours are fixed metals (like th |
| `app/src/styles/bootstyles.css` | ?? | Boot styles (boot-01 to boot-12): the stage each style draws inside .boot-work. The plain screen (boot.css) is untouched; everything here is scoped un |
| `app/src/styles/cardskins.css` | ?? | * Dashboard card skins (Card Pack prizes). A skin is a set of variables laid over the active theme's own card, so it reads on every theme: surface lay |
| `app/src/styles/checkin.css` | ?? | Daily check-in page: title block with a kicker chip and countdown, the board inside one raised panel. Layout pattern only; every colour is a :root tok |
| `app/src/styles/hub.css` | ?? | Collection hub: the Wiki's front page. Collections sit as emblems on orbit lines; the ring round each emblem fills with the share you own. Theme token |
| `app/src/styles/news.css` | ?? | News board: News and Notices. One big tile for the chosen story, a column of wide tiles for the rest, and an unread dot. Each kind has its own hue (-- |
| `app/src/styles/pass.css` | ?? | Season Pass: badge, XP and actions on top; a two-row level track; the top Patreon reward on show at the right. Theme tokens only, apart from the fixed |
| `app/src/styles/profile.css` | ?? | Profile panel (from the top bar) and Profile page. The emblem's ring fills toward the next rank; the station card on the page wears the equipped card  |
| `app/src/styles/showcase.css` | ?? | Celebrate overlay and Card Showcase. Both share one motif: thin concentric rings around the thing that matters. Every colour is a theme token, so both |
| `cms/app-icon.svg` | ?? | 10 lines |
| `cms/scripts/prepare-desktop.mjs` | ?? | Prepares what Tauri bundles into Command CMS.exe: |
| `cms/scripts/wallpapers/gen.html` | ?? | wp |
| `cms/scripts/wallpapers/render.mjs` | ?? | node render.mjs <outDir> <id>:<style>:<seed>[:<hex,hex,...>] ... |
| `cms/server/standalone.mjs` | ?? | Static UI: real files from dist/, anything else (client routes like /themes, /releases) gets index.html. |
| `cms/src-tauri/.gitignore` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/Cargo.lock` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/Cargo.toml` | ?? | Tauri shell crate for Command CMS |
| `cms/src-tauri/build.rs` | ?? | 3 lines |
| `cms/src-tauri/capabilities/default.json` | ?? | 7 lines |
| `cms/src-tauri/icons/128x128.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/128x128@2x.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/32x32.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/64x64.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square107x107Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square142x142Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square150x150Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square284x284Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square30x30Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square310x310Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square44x44Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square71x71Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/Square89x89Logo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/StoreLogo.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/icon.icns` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/icon.ico` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/icons/icon.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `cms/src-tauri/splash/index.html` | ?? | Command CMS |
| `cms/src-tauri/src/lib.rs` | ?? | Command CMS desktop shell. The CMS UI talks to same-origin /api, /releases and /uploads routes, |
| `cms/src-tauri/src/main.rs` | ?? | Stops an extra console window from opening on Windows in release builds. |
| `cms/src-tauri/tauri.conf.json` | ?? | Command CMS window and NSIS bundle config |
| `cms/src/components/PackSettingsPanels.tsx` | ?? | * The settings the Card Pack and the Widget Pack share: buy prices, draw price and ticket, row chances, pity and repeat rewards. 'noun' names the priz |
| `cms/src/pages/CardsPage.tsx` | ?? | * The Card Pack: dashboard card skins at 4 and 5 stars. The skins' art ships in the app, so this page switches each one on (Available), keeps it for o |
| `cms/src/pages/WidgetsPage.tsx` | ?? | Status labels: the stored "Available" reads as "Drawable" here, since a Free card is available too. |
| `comprehension_report.md` | ?? | Stage 6 — Comprehension Test report |
| `critic_report.md` | ?? | Stage 7 — Critic Review report (round 1) |
| `design/perk-tree-sample/Perk Tree Item List.xlsx` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `design/perk-tree-sample/Perk Tree Sample.xlsx` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `design/perk-tree-sample/band-vi-constellations.html` | ?? | Band VI constellations |
| `design/perk-tree-sample/build.py` | ?? | --------------------------------------------------------------------------------------------------------------- |
| `design/perk-tree-sample/class-nodes-preview.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `design/perk-tree-sample/class-shape-variants.html` | ?? | Tycoon shape variants |
| `design/perk-tree-sample/class-zodiac-variants.html` | ?? | Constellation class layouts |
| `design/perk-tree-sample/constellations.py` | ?? | 258 lines |
| `design/perk-tree-sample/inner-spacing-preview.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `design/perk-tree-sample/level-curve.html` | ?? | Player Level Curve |
| `design/perk-tree-sample/new_bands.py` | ?? | ---- Band VI: each class draws a constellation from class-zodiac-variants.html ---------------------------------------- |
| `design/perk-tree-sample/node-sizes-preview.png` | ?? | image, icon, lockfile or spreadsheet: not text, identified by name and folder only |
| `design/perk-tree-sample/perk-classes.html` | ?? | Perk classes |
| `design/perk-tree-sample/perk-node-icons.html` | ?? | Perk Node Icons |
| `design/perk-tree-sample/perk-node-icons.v1.html` | ?? | Perk Node Icons |
| `design/perk-tree-sample/perk-stats.html` | ?? | Perk stats, explained |
| `design/perk-tree-sample/perk-tree-constellations-preview.html` | ?? | Perk tree |
| `design/perk-tree-sample/perk-tree-sample.html` | ?? | Perk Tree Sample |
| `design/perk-tree-sample/player-level-xp.html` | ?? | Player Level and XP |
| `design/perk-tree-sample/proposed_bands.py` | ?? | Band VI small nodes: each path's own name and stat, leading into that path's mid and keystone (a, b, c in VI order). |
| `design/perk-tree-sample/reference_pages.py` | ?? | Conditional words: a stat whose label has one of these only applies while that holds (same list as the simulator). |
| `design/perk-tree-sample/template.html` | ?? | Perk Tree Sample |
| `design/perk-tree-sample/tree_content.py` | ?? | stat key -> (label in the totals panel, unit: "%" / "" / "×", earned by) |
| `design_draft.md` | ?? | Logic, data-connection and UI-state fixes (round 5) |
| `docs/designs/logic-fixes-round5.md` | ?? | Logic, data-connection and UI-state fixes (round 5) |
| `implementation_readiness_report.md` | ?? | Stage 9 — Implementation Readiness report |
| `intermediate_zoom_out_report.md` | ?? | Stage 8 — Intermediate Zoom Out report |
| `zoom_out_report.md` | ?? | Stage 5 — Initial Zoom Out report |

### Generated groups, checked

- `graphify-out/` (129 files): output of the graphify knowledge-graph tool (see `~/.claude/skills/graphify`); `.graphifyignore` is new in this change set. Regenerated on demand, not source.
- `cms/.vite/deps/` (17 files): Vite's dependency pre-bundle cache for the CMS dev server; safe to delete and add to `.gitignore`.

## Appendix C: new files, read for their structure (2026-11-18)

For each new source file: its exported names (or every test name, or the CSS rule count and section comments), pulled by reading the whole file.

- `app/service/test/achievements.test.mjs` (84 lines, 7 tests): every achievement has a unique id, a known category and a positive tar; the first check seeds quietly; later ones announce; nothing new returns the same object; an unlock stays when the number drops; progress is capped at the target; tallies count by tier and category; cleanAchievements drops unknown ids and junk
- `app/service/test/card-pack.test.mjs` (171 lines, 13 tests): bundled Card Pack: 12 four-star and 6 five-star skins, odds sum to 100; a 4-star-or-better skin comes at least every 10 draws; a 5-star skin is forced on the 70th draw since the last one, and prefe; a 4-star skin resets only the 4-star counter; anything else moves both; repeat skins pay Regular crystals (2 for 4-star, 5 for 5-star) and car; Hidden skins never drop; with no 5-star skin on, there is no 5-star ro; the pack is exhausted when switched off, or when every skin and one-ti; releases: a bad Card Pack or check-in window is refused; older release; the check-in window is local time, start inclusive and end exclusive; ; the 4-star guarantee is 4-star or better: during soft pity it keeps th; with every 4-star skin Hidden its row is shared by the other rows in p; buying: 4-star skins cost 300 Credits by default, 5-star are draw-only; Regular crystals unlock a 4-star skin only when the CMS allows it
- `app/service/test/cms-cards.test.mjs` (128 lines, 6 tests): a draft without a Card Pack or check-in event publishes the app defaul; a Card Pack and a check-in window from the CMS reach the app as set; publish is blocked by Card Pack odds that miss 100%, a pack with no sk; the server checks a Card Pack release as strictly as the app does; per-day check-in prizes set in the CMS reach the app; bad ones block p; buy settings and the CMS lock survive the trip; a bad buy price blocks
- `app/service/test/cms-store.test.mjs` (97 lines, 5 tests): A5: a crash while saving the draft leaves the previous draft readable; A5: a crash while publishing leaves current.json pointing at the previ; A6: a damaged blob is rewritten by the next publish that uses it; A8: a request whose URL cannot be parsed gets a 400 instead of crashin; A9: /releases/current includes effectiveAt
- `app/service/test/cms-widgets.test.mjs` (109 lines, 6 tests): the CMS card list is the app's dashboard cards, with the same names an; a draft without a Widget Pack publishes none, so every card stays Free; the default Widget Pack (every card Free) publishes and keeps every ca; a Widget Pack from the CMS reaches the app as set; a Widget Pack that is off with a Drawable card blocks publish, as a dr; a broken Widget Pack is refused by the CMS
- `app/service/test/credit-big-amount.test.mjs` (75 lines, 7 tests): a gain is big only above the amount, never at it; bundled content uses the default, and today's rewards (5 to 20) stay u; an older release without the field still loads and falls back to the d; the app rejects an amount that is not a number of 0 or more; the amount set in the CMS reaches the app, and takes effect when the r; a draft that never set the amount publishes the default; the CMS rejects a negative or non-number amount
- `app/service/test/economy-fixes.test.mjs` (166 lines, 10 tests): B1: more than 50 earned looks survive a load (no numeric cap, duplicat; B2: a pick won while the waiting-picks slots are full becomes a streak; B3: a corrupt balance is kept aside before the 200 re-seed, and a miss; B3: a spend whose save fails reports null and leaves the balance; B4: a long gap between ticks (PC asleep) is not paid as play time; nor; B10: the dashboard's saved Patreon unlocks expire after the same offli; B10: an older saved tier is stamped once at load, so its grace does no; B7 (D1): the forced pity draw in a company pack always gives a feature; B7 (D1): a rainbow Regular theme in a company pack does not reset that; B7 (D1): with no featured looks the company pity holds instead of forc
- `app/service/test/news-read.test.mjs` (55 lines, 6 tests): a fresh install treats only the last few days as new; a notice with no date stays unread until read; markRead adds once and returns the same object when nothing changes; the read list keeps only the newest marks; unreadCount counts stories and notices; cleanNewsRead repairs junk and keeps a valid state
- `app/service/test/perks.test.mjs` (419 lines, 22 tests): the generated tree is whole: one core, eight classes each with a Seaso; every stat the app applies is on the tree; points come from the player level: 4 to start, banded after, nothing p; taking a node takes the shortest path to it and makes its class a star; too few points: nothing is taken; after two starting regions the core's other links close; the Season Key opens Pass levels 46 to 60, and only one Key can be hel; effects add up the live stats; points below what was spent: the newest nodes stop counting, oldest fi; cleanPerks keeps only nodes joined to the core and real starts; one free reset a month gives every point and both starts back; hour bonus pays for each whole counted hour crossed; percent bonuses carry their fraction so small payments add up; squares: every class has a Season Key and eleven Specials, all free; pentagons: five per class, free, and a player holds at most three; each class's Season Key opens levels 46 to 60 and has its own extra; a player holds at most eight squares; a ninth is refused, and cleanPer; player level pacing keeps the decided timing for this tree: one full c; bands IV and V open only in a class you started in; trade-off notables: a smaller downside on a different theme, only on n; a downside only counts while its gain is in force, and totals never dr; band VI: three paths per class, each ending on its own keystone; one p
- `app/service/test/player-level.test.mjs` (131 lines, 10 tests): the table covers levels 1 to 300 and the real MapleStory numbers are k; every level earns between 0.5% and 4.2% of itself per 10 minutes; pacing: level 100 in about a season at 31 h a week, level 250 in 11.2 ; Perk Points by level: 4 to start, 12 a level to level 50, level 250 pa; level 250 is the first level that pays for everything a player can tak; counted time adds XP inside a level and carries over levels; the level stops at 300 and XP does not pile up there; a long gap between ticks (sleep) counts only the clamp; time going bac; saved state is cleaned: bad input starts over, levels are bounded, xp ; xpLabel shortens big numbers
- `app/service/test/profile.test.mjs` (14 lines, 1 tests): labels
- `app/service/test/rotation-local-day.test.mjs` (26 lines, 1 tests): B6: the Brand pair changes at local Monday 00:00 in ${tz}
- `app/service/test/season-pass.test.mjs` (182 lines, 15 tests): seasons run SEASON_DAYS from the anchor; the first sync only records the totals; XP comes from new minutes and tasks, and nothing changes without them; the weekly cap holds within a week and resets the next; XP stops at the last level once the perk opens it; a new season starts over; claims: reached levels only, Patreon row only for patrons, once each; every level has two rewards and Patreon rewards are never Credits or T; cleanPass repairs junk; every Patreon reward is a real item or skin, and one-time items are ne; a new season banks the levels reached, for the lifetime count; perk mods raise XP and the weekly cap; the pass stops at level 45 until a Season Key opens 46 to 60; all 60 levels take 8 to 10 weeks at the weekly cap, with no boosts; rewards: card skins at 30, 45 and 60, and three Special Tickets at the
- `app/service/test/widget-pack.test.mjs` (120 lines, 7 tests): every dashboard card has a cost row, and its Wiki key never clashes wi; bundled content: every card is Free, nothing is locked, and the pack h; lock rule: status × owned × Patreon / creator; a card placed while Free is recorded as owned; one placed after its lo; release validation: Free is a Widget Pack status, bad rows are refused; draws: widgets drop with pity, repeats pay Regular crystals, and the C; buying: only Available cards have a price, by stars; the 4-star crysta
- `app/service/test/wiki-data.test.mjs` (60 lines, 2 tests): wiki chances follow the bundled tables; CMS draft → release → app: wikiHiddenIds keeps prizes off the wiki, dr
- `app/src/boot/BootStyleStages.tsx` (431 lines): exports StageProps, STYLE_STAGES
- `app/src/boot/bootStyleList.ts` (20 lines): exports BOOT_STYLES
- `app/src/boot/bootStyles.ts` (63 lines): exports BootStyleId, isBootStyleId, bootStyleById, BOOT_STYLE_KEY, usableBootStyles, readBootStyle, equipBootStyle, useBootStyles
- `app/src/boot/scriptedBoot.ts` (73 lines): exports useScriptedBoot, sampleBootState
- `app/src/components/BootStylePicker.tsx` (146 lines): exports BootStylePicker
- `app/src/components/CardShowcase.tsx` (291 lines): exports ShowcaseArt, ShowcaseItem, ShowcaseSet, CardShowcase
- `app/src/components/CardSkinPicker.tsx` (121 lines): exports CardSkinPicker
- `app/src/components/CollectionHub.tsx` (76 lines): exports HubNode, CollectionHub
- `app/src/components/CreditIcon.tsx` (45 lines): exports creditArtFor, CreditIcon, CreditBalance
- `app/src/components/CurrencyIcon.tsx` (24 lines): exports CurrencyIcon, FragmentMark
- `app/src/components/PerkTree.tsx` (961 lines): exports PerkSection
- `app/src/components/ProfilePanel.tsx` (129 lines): exports ProfileEmblem, ProfilePanel
- `app/src/components/SkinSample.tsx` (24 lines): exports SkinSample
- `app/src/components/WidgetSample.tsx` (18 lines): exports WidgetSample
- `app/src/components/creditArt.ts` (14 lines): exports CreditArt, CREDIT_ART
- `app/src/components/currencyArt.ts` (17 lines): exports CurrencyArt, CURRENCY_ART
- `app/src/content/perkIcons.ts` (3 lines): exports PERK_ICON_SYMBOLS
- `app/src/content/perkTreeData.ts` (6589 lines): exports PERK_TREE
- `app/src/content/playerLevelData.ts` (4 lines): exports PLAYER_LEVELS
- `app/src/pages/AchievementsPage.tsx` (141 lines): exports AchievementsPage
- `app/src/pages/CheckinPage.tsx` (62 lines): exports CheckinPage
- `app/src/pages/NewsPage.tsx` (210 lines): exports NewsPage
- `app/src/pages/PassPage.tsx` (311 lines): exports rewardName, PassPage
- `app/src/pages/PerksPage.tsx` (10 lines): exports PerksPage
- `app/src/pages/ProfilePage.tsx` (243 lines): exports ProfilePage
- `app/src/pages/WikiPage.tsx` (830 lines): exports WikiPage
- `app/src/state/Celebrate.tsx` (97 lines): exports Celebration, CelebrateProvider, useCelebrate
- `app/src/state/achievements.ts` (128 lines): exports Tier, AchievementCategory, AchievementSnapshot, AchievementDef, CATEGORIES, ACHIEVEMENTS, ACHIEVEMENTS_KEY, AchievementState, emptyAchievements, cleanAchievements, evaluate, progressOf, tierTally, categoryTally
- `app/src/state/cardEngine.ts` (243 lines): exports CardPackKind, CardPity, CardOwned, cardPriceOf, cardFiveChanceAt, drawCards, applyCardResults, cardsExhausted, cardOddsRows, spendCrystalsOnSkin
- `app/src/state/cardSkinStore.ts` (78 lines): exports CARD_SKINS_KEY, CardSkinState, cleanCardSkins, readCardSkins, grantSkin, equipSkin, useCardSkins, useApplyCardSkin
- `app/src/state/cardSkins.ts` (47 lines): exports CardStars, CardSkinDef, CARD_SKINS, CARD_SKIN_IDS, cardSkinById, isCardSkinId
- `app/src/state/itemFace.ts` (20 lines): exports ITEM_ICON, itemIcon
- `app/src/state/itemNames.ts` (56 lines): exports KIND_NAME, itemTitle, itemKindLine, itemFullName
- `app/src/state/newsRead.ts` (52 lines): exports NEWS_READ_KEY, MAX_READ, FIRST_RUN_WINDOW_MS, NewsReadState, freshNewsRead, cleanNewsRead, isUnread, markRead, unreadCount
- `app/src/state/perkStore.ts` (98 lines): exports PerkContext, readPerkContext, readPerkEffects, perkIncomeBonus, usePerks
- `app/src/state/perks.ts` (457 lines): exports PerkNodeType, PerkNode, PerkRegion, PerkPoints, PerkPacing, PerkTreeData, TREE, POINTS, MAX_STARTS, MAX_SQUARES, MAX_PENTAGONS, NODES, nodeById, START_ID …
- `app/src/state/playerLevel.ts` (117 lines): exports PLAYER_LEVEL_KEY, MAX_LEVEL, ALL_PAID_LEVEL, LAST_POINT_LEVEL, PlayerLevelState, emptyLevel, xpToNext, xpPerHour, hoursForLevel, levelProgress, countedGapMs, addCountedMs, pointsAtLevel, pointsPerLevelAt …
- `app/src/state/profile.ts` (27 lines): exports hoursLabel, checkinDays, initialsOf, PROFILE_SECTION_KEY
- `app/src/state/seasonPass.ts` (226 lines): exports SEASON_DAYS, SEASON_ANCHOR, LEVELS, BASE_LEVEL_CAP, XP_PER_LEVEL, XP_PER_MINUTE, XP_PER_TASK, WEEKLY_CAP, MAX_XP, PassRow, PassReward, FEATURED_SKIN, PASS_LEVELS, Season …
- `app/src/state/unlocks.ts` (8 lines): exports cleanUnlocks
- `app/src/state/useAchievements.ts` (84 lines): exports readAchievementSnapshot, useAchievements, AchievementWatcher
- `app/src/state/useNewsRead.ts` (51 lines): exports useNewsRead, Notice, listNotices
- `app/src/state/usePlayerLevel.ts` (71 lines): exports readPlayerLevel, usePlayerLevel, PlayerLevelWatcher
- `app/src/state/useSeasonPass.ts` (122 lines): exports PASS_KEY, usePassPatron, useSeasonPass, PassWatcher
- `app/src/state/widgetStore.ts` (80 lines): exports WIDGETS_KEY, WidgetState, cleanWidgets, readWidgets, grantWidget, buyWidget, recordFreePlaced, useWidgets, useWidgetLock
- `app/src/state/widgets.ts` (101 lines): exports WidgetCost, WIDGET_COST, WIDGET_IDS, isWidgetId, drawableWidgets, widgetPackOn, widgetBuyOf, widgetPrice, isWidgetLocked, widgetsToRecord
- `app/src/state/wikiData.ts` (705 lines): exports WikiCategory, WikiStatus, WikiSwatch, WikiBlock, WikiSection, WikiEntry, STATUS_LABEL, CATEGORY_NAME, ITEM_INFO, pct, WikiInput, buildWiki
- `app/src/styles/achievements.css` (78 lines, ~53 rules): 
- `app/src/styles/bootstyles.css` (449 lines, ~250 rules): The alert carries the problem; the status line would only re; ---------- 01 Log ----------; ---------- 02 Sweep ----------; ---------- 03 Hairline ----------; Rides the tip, but slides from left-aligned at 0% to right-a; ---------- 04 Bus ----------
- `app/src/styles/cardskins.css` (358 lines, ~99 rules): ------------------------------------------------------------; ------------------------------------------------------------; The ring is written on ::after itself: --sk-angle animates t; ------------------------------------------------------------; Small swatches: reveal badges, the pack list and the Themes ; A sample card on the Card Pack poster and in previews.
- `app/src/styles/checkin.css` (13 lines, ~13 rules): 
- `app/src/styles/hub.css` (64 lines, ~52 rules): The way back from a section to the hub.; Narrow: the map turns into a two-column list of emblems.
- `app/src/styles/news.css` (96 lines, ~68 rules): List on the left, the big tile on the right.; The big tile.; Shared bits.; The column of wide tiles.; The unread count on the top bar's News tab.
- `app/src/styles/pass.css` (98 lines, ~82 rules): Levels above the open cap: sealed until a Season Key is take
- `app/src/styles/profile.css` (298 lines, ~234 rules): ---- Emblem ----; ---- Top bar name ----; ---- Panel ----; ---- Page ----; The perk tree's own page: the tree and its details panel, no; Full page: the tree covers the whole app window (under toast
- `app/src/styles/showcase.css` (173 lines, ~126 rules): ---------------- Celebrate ----------------; The page stays visible but steps back: dim plus a real blur,; A hairline running through the emblem to the edges of the st; ---------------- Card Showcase ----------------; Left: the set, one thumbnail per prize.; Middle: the card, standing in its rings.
- `cms/server/standalone.mjs` (112 lines): exports no named exports
- `cms/src/components/PackSettingsPanels.tsx` (165 lines): exports PackSettingsPanels
- `cms/src/pages/CardsPage.tsx` (177 lines): exports CardsPage
- `cms/src/pages/WidgetsPage.tsx` (274 lines): exports WidgetsPage
