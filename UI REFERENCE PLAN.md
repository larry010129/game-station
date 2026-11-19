# UI reference plan: ten screens from interfaceingame.com (Honkai: Star Rail)

Source: https://interfaceingame.com/games/honkai-star-rail/ (News, Celebration, Achievements, Battle Pass,
Character Menu, Character Details, Data Bank, Light Cone, Traces/skill tree, Travel Log).

All 64 screenshots from that page are saved in `design/reference/honkai-star-rail/` (see its `README.md`). The site has two
Travel Log screens: the Daily Check-In event and a level-milestone event in the same rail, so in the game Travel Log is a
hub of several login and progress events.

**Rule for every slice:** borrow the *layout pattern only*. No names, art, icons, gold-on-navy palette or wording
from the game. Every new screen uses the `:root` tokens in `app/src/styles/app.css`, so it must keep working when a
theme (`state/palette.ts`) or card skin (`styles/cardskins.css`) changes. Plain CSS keyframes only, no animation
library. Keep the work additive (new files where possible), because the tree has many uncommitted changes.

## How each reference screen maps onto Command Station

| Reference screen | Pattern taken | Becomes in our app | Builds on |
|---|---|---|---|
| Celebration ("New feature available", "New song") | Dimmed full-screen overlay, kicker line, big title, emblem in concentric rings, one line under it, "click anywhere to close" | **`Celebrate` overlay + queue**, used for rank-ups, new cards, achievements, pass levels | `components/BrandUnlock.tsx` (keeps its Brand flood), `state/Toast.tsx` |
| Light Cone (card display) | Left thumbnail rail, a tilted collectible card in the centre, right info panel (name, type, level/stars, stats, effect, flavour text), bottom action | **`CardShowcase`** for all four prize kinds: dashboard cards (the real live card, e.g. Spotify), card skins, themes, items | `WikiPage` detail, `SkinSample`, `LookCard`, the card renderer in `CardGallery.tsx`, `wikiData.ts` |
| News | Window with News / Notices tabs; one tall hero tile and a column of wide banner tiles, each with a red dot when unread | **News board** page: News (feed) / Notices (release "What's new", events), unread dots | `state/useFeed.ts`, `FeedItem`, CMS banners |
| Data Bank | Star-map of category emblems, each with owned/total | **Collection hub**: Dashboard cards, Card skins, Themes, Items, Achievements as nodes with owned/total; click opens the Wiki category | `pages/WikiPage.tsx` `collected()`, `wikiData.ts` |
| Character Menu | Side panel: avatar, name, level + XP bar, a grid of shortcut tiles, an icon rail | **Profile panel** off the top bar: display name, rank + progress, Credits, shortcut grid (Quests, Draw, Wiki, Themes, Vault, Achievements) | `TopBar.tsx`, `questEngine.ts` RANKS |
| Character Details | Left section rail (Details / Card / Traces), big subject centre, stats panel right, primary action | **Profile page**: Details (stats from session/playhistory), Showcase (equipped card), Perks (skill tree) | session/playhistory cards' data |
| Achievements | Horizontal carousel of category plaques (count each), bronze/silver/gold tally at the bottom | **Achievements**: categories (Play, Collection, Draw, Station, Streaks), tiers, new engine | new `state/achievements.ts` + `useAchievements.ts` + test |
| Battle Pass | Season level badge, "ends in", XP bar + weekly cap, two reward rows per level (free / locked), featured reward on the right | **Season Pass**: free row for everyone, row 2 unlocked by Patreon tier. No "buy level" button (Credits are never sold) | `checkinBoard.ts`, `questEngine.ts`, `patreon.ts`, CMS `checkinEvent` |
| Travel Log ("Daily Check-In") | Title block with a kicker chip and a countdown, then a board of six day boxes in two rows and a tall Day 7; claimed boxes dim with a tick, the next one is lit | **Check-in page**: the 7-day board as its own tab, with the countdown, days claimed and ticket wallet | `components/CheckinBoard.tsx`, `checkinBoard.ts`, CMS `checkinPrizes` / `checkinEvent` |
| Traces (skill tree) | Central trunk with branching nodes, locks, level labels, detail panel | **Station perk tree**: Perk Points from ranks and pass levels, spent on a trunk (Credit rate) and branches (streak-freeze slots, layout slots, alert sounds, fonts) | `questEngine.ts` ranks, `items.ts` kinds. New currency: needs its own engine + test |

## Slices (one per round, verified before the next)

1. **Celebrate overlay + Card Showcase**: these reuse the most existing code. **Done (2026-11-17).**
   - `state/Celebrate.tsx` (provider, queue, overlay) + `state/useRankCelebration.ts` (first trigger: rank-up).
     The rank-up trigger was removed with the ranks on 2026-11-17.
   - `components/CardShowcase.tsx` opened from Wiki details ("Showcase"). Owned dashboard cards run live; Notes
     (Pre-game checklist) shows a sample because it saves data per placed copy.
   - Styles: `styles/showcase.css`.
   - Open: items still use one icon per kind (no per-item name or art yet). The narrow Wiki dialog path is fixed in
     code but untested.
2. **News board**: the News/Notices window. **Done (2026-11-17).**
   - New page tab `news` (`pages/NewsPage.tsx`, `styles/news.css`) with an unread count on the top-bar tab.
   - Read state: `state/newsRead.ts` (pure, tested in `service/test/news-read.test.mjs`) + `state/useNewsRead.ts`.
     A fresh install counts only the last 3 days as new.
   - Notices are the last release's What's-new rows (or the bundled changelog).
   - Feed items and CMS banners carry no images, so the tiles are typographic. Images need a field added to the feed
     service or to CMS banners.
3. **Collection hub (Data)**: the star map that links to the Wiki. **Done (2026-11-17).**
   - `components/CollectionHub.tsx` + `styles/hub.css`; the Wiki opens on it (`hub` state in `WikiPage.tsx`).
     Picking a collection opens its section, "Collection" goes back, and typing a search leaves the hub.
   - Achievements join the map as a node once slice 5 exists.
4. **Profile panel + Profile page**: covers both character screens. **Done (2026-11-17).**
   - `components/ProfilePanel.tsx`: opened by the new Profile icon in the top bar's tools (always visible) or by
     clicking your name (hidden at narrower widths).
   - `pages/ProfilePage.tsx`: page tab `profile`, kept off the nav like Themes and Vault. Its sections are Details
     and Equipped, around a station ID card that wears the equipped card skin. Perks joins as a section in slice 7.
   - Numbers: `state/profile.ts` (pure, tested in `service/test/profile.test.mjs`).
5. **Achievements**: engine, hook, test, carousel, and Celebrate on unlock. **Done (2026-11-17).**
   - Engine `state/achievements.ts` (22 achievements in 5 categories, bronze/silver/gold; tested in
     `service/test/achievements.test.mjs`). Achievements give no Credits; they are a record.
   - `state/useAchievements.ts`: `AchievementWatcher` (mounted in App) checks on store events and every 30 s, saves
     to `cs.achievements` and celebrates each new unlock. The first check on an install unlocks quietly.
   - `pages/AchievementsPage.tsx` (page tab `achievements`, off the nav): category plaques, medal tally, and
     progress for each milestone. It is reached from the Profile panel, the Profile page and the Wiki hub.
6. **Season Pass**: pass engine (XP from quests and play), two rows, Patreon gate, Celebrate on level-up. **Done (2026-11-17).**
   - Engine `state/seasonPass.ts` (tested in `service/test/season-pass.test.mjs`):
     - 42-day seasons from 2 Nov 2026 and 30 levels of 1000 XP.
     - 10 XP per counted minute and 100 per claimed quest, with an 8000 XP weekly cap.
   - Rewards: the Free row is Credits and Draw Tickets; the Patreon row is cosmetic only (items, with the Aurora
     Drift skin at level 30). There is no way to buy levels.
   - `state/useSeasonPass.ts`: `PassWatcher` turns quest totals into XP and celebrates level-ups; claims grant through
     the existing stores (`addCredits`, the new `grantTickets`, `grantItem`, `grantSkin`). The Patreon row opens for any
     paid tier (or the creator test unlock).
   - `pages/PassPage.tsx`: new nav tab "Pass".
   - Not yet in the CMS: seasons and rewards are set in code. Moving them into a release is a follow-up.
7. **Station perk tree**: Perk Points engine + test, tree UI, perks applied to the existing systems. **Done (2026-11-17).**
   - **Replaced (2026-11-17) by the big branching tree** from `design/perk-tree-sample`. Now (2026-11-18) 2,953 (older notes said 2,545 and 2,761; the generated `perkTreeData.ts` is the count)
     nodes in five bands per class, each ending in a "V" grand keystone, with longer outer bridges between classes (it began as 1,505 nodes in eight
     classes around Station Core, each class with a Season Key and two Specials).
     - The tree is generated: `python build.py` in `design/perk-tree-sample` writes `app/src/content/perkTreeData.ts`
       and `perkIcons.ts` from the workbook. Do not edit those two files by hand.
     - Engine: `state/perks.ts`, tested in `service/test/perks.test.mjs`. Saved under `cs.perkTree`; the old
       `cs.perks` key is no longer read.
   - Squares (the diamonds) cost no points, but a player holds at most 6 (Points sheet B17); a Season Key uses a
     slot. Each class has 7: its own Season Key and six Specials, each on a different branch (56 in all).
     - Every Key opens Pass levels 46 to 60 and adds a class extra (`stat2`/`value2`). Six extras use live effects;
       the Prospector's and Gearhead Keys' extras come later.
     - The 48 Specials are class features, not applied in the app yet.
   - Points: 2 to start and 1 per lifetime Pass level, up to 150 (the rank-up points went with the ranks). If
     points fall below spent, the
     newest nodes pause.
   - Taking nodes: click a node to see its path and cost, then click it again to take the whole path. The first 2
     paths out of the core set your starting classes. Nodes are never given back one at a time.
   - Reset: one free reset per calendar month, which also frees the starting classes.
   - Effects the app applies (`LIVE_STATS`): Income per counted hour, % Income from play, % Income from quests,
     % on all Income (play, quests and Pass rewards), % Pass XP, weekly Pass XP cap, and the Season Key (Pass
     levels 46 to 60).
     - Percent bonuses carry their fractions in `cs.perkCarry`.
     - Every other node can be taken but says "Not active yet".
     - The check-in ticket perks are gone: the new tree has no check-in nodes.
   - UI: `components/PerkTree.tsx`, under Profile → Perks.
     - The tree is drawn in SVG. Pan and zoom are written straight to the DOM; only the label layers read the zoom.
     - The side panel is information only.
   - Not yet in the CMS or the Wiki: these perk rules live in code and the workbook.

8. **Daily check-in page** (2026-11-18). **Done.**
   - Reference: the site has no screen named check-in; the "Daily Check-In" window sits inside the Travel Log screen
     (honkai-star-rail-travel-log). Its pattern is the board layout this app already used, now given a page.
   - New tab `checkin` (`pages/CheckinPage.tsx`, `styles/checkin.css`), placed after Quests and in the Profile panel
     shortcuts. `CheckinBoard` is reused with `hideTitle`; the page owns the title, countdown and days-claimed count.
   - The tab carries a dot (`useCheckinReady`) while today's box can be claimed, like News does for unread items.
   - Layout (after a subagent compared it with the Travel Log screenshot): a **Station log** rail on the left, like the Travel Log rail: a heading with an icon, a thin line down its edge, and picture tiles (the event's icon large and faint over an accent wash, its name along the bottom). The open tile is outlined and steps right; a "Ready" badge marks a claimable box (the reference's "New"). Tiles: Daily check-in, then links to Quests and Season Pass. A second real event (for example a player-level milestone track, as in `travel-log-2.png`) is not built: it needs rewards decided.
   - Right side: and on the right a kicker chip, a big right-aligned title, a clock countdown, days claimed and the board panel. At 760px and below the rail becomes a row above the page.
   - Not copied: the character art, the parchment frame and the bronze box colour (no game art, and the app's tokens apply).
   - Quests no longer shows the board; a Daily check-in entry under its period tabs opens this page.
   - Claim rules are unchanged; prizes and the event window come from the CMS (see `PLAN.md`, Daily check-in board).

## Quests page update (2026-11-18)

**Redesigned (later on 2026-11-18)** after the pass Missions screen (`design/reference/honkai-star-rail/honkai-star-rail-battle-pass-2.png`),
chosen by the user over the Quest Log screen. Layout only; `pages/QuestsPage.tsx` and the new `styles/quests.css` (the old `.q-*` rules in
`app.css` are gone).
- **Payroll strip** across the top: the Income rate per counted hour (and the perk share), today's claimed count with a bar, the balance,
  and **Claim all (n)**, which claims every ready quest in every period with one summary toast.
- **Period tabs** down the left (Today, This week, This month, One-time), each with its reset time and a count of ready quests. A real
  vertical tab list (arrow keys move between tabs). The page opens on the first period with something to claim. Below the tabs, a
  Daily check-in entry links to the Check-in page and shows a dot when a box is ready.
- **Quest bands:** title, description and a progress bar on the left, the Income pay in its own cell, and an action column: **Claim**
  when done, **Go** (Game mode, Calendar, Vault or Themes) for a quest finished somewhere else, "In progress" otherwise, and a tick once
  claimed. A ready band takes the accent.
- Phone width: the tabs become a scrolling row above the bands, and each band puts its pay and action under the text (44px buttons).
- The Check-in page lost its small label chip above the title (the craft rules ban an eyebrow over a heading); its title is now
  "Daily check-in".

Earlier on the same day:

- Header is a **Payroll** block: Income per counted hour (10, plus any perk bonus) and the balance. The rank line is gone.
- Pay cells use the Income icon (`CreditIcon`); "look pick" became **Theme pick** everywhere on the page.
- Visible quests no longer depend on a rank (`visibleQuests(period)`).

## Wiki update (2026-11-18)

- **Skill tree section (later the same day):** a new Wiki section and hub node, built by `state/perkWiki.ts` from the tree
  data: a rules page, the 8 classes, every named node, and the small nodes grouped by name (609 tiles for 2,953 nodes).
  Taken nodes count as collected (the hub shows taken / total). Node tiles draw the node's own icon in its class colour,
  in its shape (circle, diamond, pentagon, hexagon). The Wiki's title is now "Wiki", since it covers more than draws.
  - "How it works" is a page, not a tile: picked in the rail it fills the panel (header with Open skill tree, a row of
    the tree's numbers, sections in two columns, real tables).
  - Sorting: the skill tree sorts by Kind, Class, Cost or Name; every section has a reverse button; a sort a section does
    not offer resets when you switch sections (it used to stay hidden and make the menu look broken).
  - Small-node tiles no longer show a taken counter.

- The Wiki opens on the collection hub and is built from the live release (`wikiData.ts`), so odds and prizes match the Draw page.
- Prize details open a Showcase (slice 1). Pages now receive the card context, so the Showcase runs a real dashboard card.
- `wikiHiddenIds` in a release keeps a prize off the Wiki; `service/test/wiki-data.test.mjs` covers the data.
- Achievements are a hub node and open their own page (slice 5).

## Checks for every slice

- `npx tsc --noEmit` in `app/`, plus `npm run test:service` when service or shared code changes.
- Vite preview: open the screen and screenshot it under at least two themes (one dark, one light) and one 5-star card skin.
- Keyboard: Escape closes overlays, focus lands on the primary action, Tab order follows the layout.

## Ranks removed (2026-11-17)

The station ranks (Recruit, Regular, Veteran, Night) are gone until a Patreon-based replacement is designed.
- Play pays one flat rate for everyone: 1 Income per 6 counted minutes, 10 an hour (`MINUTES_PER_INCOME` and
  `INCOME_PER_HOUR` in `questEngine.ts`).
- Long watch, Night watch and Star a theme no longer wait for a rank.
- Removed: the rank-up celebration, the rank lines on the Profile panel, Profile page and Quests page, the three
  rank achievements, and the Perk Points per rank-up.
- `PLAN.md` and `CLEANUP PLAN.md` still describe ranks as they were first specified.

## Player levels (built 2026-11-18)

Perk Points now come from the player level, not from Season Pass levels. Tune it on `design/perk-tree-sample/player-level-xp.html`
(the numbers live in its `DEF`, `MAPLE`, `BANDS` and `DEF_BANDS`), then run `python build.py` in that folder: it writes
`app/src/content/playerLevelData.ts`. Do not edit that file by hand.

- **Engine:** `state/playerLevel.ts` (pure, tested in `service/test/player-level.test.mjs`); `state/usePlayerLevel.ts`
  (`PlayerLevelWatcher` ticks every 15 s and celebrates each level; saved under `cs.playerLevel` as level plus XP inside it).
- **What counts:** time the app is running, open or minimized, no daily cap. A long gap between ticks (sleep) counts only
  up to 3 minutes, and the last tick is kept in memory, so a closed app earns nothing. Whether a locked or idle PC counts
  is still open: today it counts.
- **XP needed:** the MapleStory level table (Namu Wiki, the Korean server, not confirmed for TMS), levels 1 to 300, halved
  from level 200.
- **Earn:** MapleStory hunting rates by level (below 200: 10億 XP an hour, an assumption), held between 0.5% and 4.2% of a
  level per 10 minutes, with a boost fitted so the reference player (56 h a week) pays everything reachable in 11.2 months.
- **Perk Points:** 4 to start, then 12 (levels 2 to 50), 10 (51 to 100), 9 (101 to 150), 7 (151 to 200), 5 (201 to 240),
  4 (241 to 250), none after. Level 250 pays all 2,131 points a player can take (every class to band III, plus bands IV and V
  in the 2 starting classes); the whole tree is 2,992.
- **Checks (90-day season):** at 31 h a week level 100 takes 89 days and level 250 about 6.8 seasons; at 56 h a week level 250
  takes 11.2 months and level 300 18 months.
- **Placeholder UI:** only a text line on the Perks section (level, progress, next level's points). Where the level and XP bar
  live is still to design. Perk effects do not boost player XP.
- **Testers:** points now follow the level, so a tester's newest perk nodes pause until their level catches up.

### Earlier flat model (superseded)

How fast player levels came in the first design (flat XP per level, 11 points a level). Kept for the record; the app
no longer uses it, though `PERK_TREE.pacing` still carries its numbers. The design was fixed by its **timing**, not by its numbers.

**The rules (the design):**
- **What counts:** the time the app is running. No daily cap: every hour the app runs counts.
- **Reference player:** the app runs 8 hours a day, 7 days a week (56 hours a week).
- **Target:** the reference player completes one full class (every node of one class) in **1 month**.
- **Quick start:** the first 10 levels take 30 counted minutes each, so the first session shows progress.
- **After that:** every level costs the same XP (a flat curve), so the level bar never stalls.
- **XP rate:** 30 XP per counted minute.
- **Points:** 11 Perk Points per level, 4 to start.
- **Max level:** the first multiple of 10 at or past the level where the whole tree is paid for.

**The numbers follow the tree.** `design/perk-tree-sample/build.py` (`PACING`, `pacing()`) works them out from the tree's
real costs on every build and writes them to the app's tree data (`pacing`) and the level curve page ("Decided design").
Adding or removing nodes changes XP per level and max level, never the timing. `service/test/perks.test.mjs` fails if
the first class drifts from one month.

**Numbers for the tree as first designed** (2,545 nodes, since grown to 2,953; costs small 1, notable 2, keystone 3, squares free):
- Whole tree 2,864 points; one full class 358 points; top of a class (its "V" keystone) 64 points.
- Flat XP per level: 18,650 (about 10.4 counted hours). Max level 270 (the tree is paid for at level 261).

| Player | Counted hours a week | First class | Second class | Whole tree |
|---|---|---|---|---|
| 8 h a day, every day (reference) | 56 | 1 month (4.3 weeks) | 2.4 months | 10.7 months |
| Average PC player | 9.7 | 5.8 months | 13.6 months | 5.1 years |
| Lightest player | 4 | 14 months | 2.8 years | 12.4 years |
| App never closed | 168 | 1.4 weeks | 3.4 weeks | 3.6 months |

**Note for the future build: what "app running" means.** Nothing is built yet.
- Counts: the window open, or minimized. A system tray would count the same, but the app has none today (closing the
  window quits it); close-to-tray would be its own feature.
- Does not count: the PC asleep or hibernating, or the app closed.
- Open question: whether a locked PC, or one untouched for a long time (say 30+ minutes with no input), still counts.
  Leaving it out is what keeps "app never closed" (168 h a week) close to real use.
- Measure elapsed clock time, not timer ticks: Windows slows timers in a minimized app. The current play clock
  (`tickPlayClock`) already works this way and leaves sleep out.

**Known trade-off:** with no cap, players are as far apart as their app time (about 17 to 1 between 4 hours a week and
an app never closed). Event boosts speed everyone up equally; item boosts (a fixed number of boosted hours) help
light players most and are the lever for closing that gap.

## Trade-off notables (built 2026-11-18)

About a third of the notables (96 of 280, in all five bands) give a stronger bonus and take a smaller one away on another theme,
for example "+20% Income from sessions longer than 1 hour, −5% Income from quests".
- **Where:** `TRADEOFFS` in `design/perk-tree-sample/tree_content.py`; `apply_tradeoffs()` in `build.py` applies it on every build. The
  downside is the node's second effect (`stat2`, negative `value2`). The gain is about 1.35 times a plain notable; the downside about
  a quarter of the gain, growing with the band. Point cost is unchanged. Small circles, squares and pentagons stay plus only.
- **Not in the workbook:** like the Passive lines, it is applied after the workbook is read, and a notable that already has a second
  effect in the workbook is left alone.
- **App:** a downside counts only while its gain is in force (`statTotals`), and `effectsOf` floors every total at base, so the tree can
  never make a player earn less than one with no perks. Today none of the 96 gains are live, so no downside applies yet.
- **Display:** the downside is on its own line in red in the tooltip and side panel; in the simulator's "What you took" a header shows
  the net (+412% and -15% is +397%) and anything negative is red.

## Redesigned outer bands (2026-11-18)

Bands IV and V of every class have unique notables, and every class has a band VI past its band V grand keystone.
- **Content:** `design/perk-tree-sample/proposed_bands.py` (unique names); `new_bands.py` applies it on every build and the result goes to
  the simulator, the app's tree data and the class and stats pages. Bands IV and V replace the six outer notables of each band.
- **Band VI shape:** three paths along a constellation figure's lines, 8 nodes each so they cost the same (12) but each has its own shape (an opening notable with a passive, 5 small with the path's own stat, one mid notable, then that path's own band VI keystone with its own rule, named `VI●name`)
  (ids `payroll-b6-a1 … a4`, `am` for the mid, `ak` for the keystone, then `b…`, `c…`). 18 nodes per class. One path costs
  4 smalls + a mid (2) + its keystone (3) = 9 points. Every mid node carries a downside and a passive (a test enforces it).
  Each class draws a constellation from `class-zodiac-variants.html` (42 designs): `BAND_SIX_FIGURES` in `new_bands.py`, picked at
  random from the best fits (most stars used, no crossing links), laid out by `band_six_paths()` in `constellations.py`.
  Tycoon Scorpio, Climber Aquarius, Sentinel Aries, Devotee Leo, Prospector Libra, Mercenary Delphinus, Phantom Cancer, Gearhead
  Corona Borealis. Preview: `band-vi-constellations.html`.
- **Band VI rule:** a player can take band VI in only one class, and in it only one path. The first node taken closes the other two
  paths (and their keystones) and every other class's band VI (`bandLocked`, `bandSixOwner`, `chosenBranch` in `state/perks.ts`,
  also in the simulator). A saved file holding two is cleaned to the first. Giving back is only by the monthly reset.
- **Points:** level 250 still pays bands I to V (2,131). Levels after 250 give 1 point each until the dearest band VI path is paid (251 to 262, 12 points; the build sets it); no
  points after that (`lastPointLevel` in the generated level table).
- **Effects:** all the new stats are "not yet" in the app, like most of the tree; their downsides only count while their gain is live.
