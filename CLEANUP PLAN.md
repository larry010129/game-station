# Command Station: what is left to clean and fix

Status after four review rounds: all approved findings applied; 130 service tests, `tsc` and `vite build` pass; nothing run in a real browser or the desktop shell; nothing committed. Review loop: 0 of 2 clean rounds (cap 5, round 5 remaining).

## Progress, 15 November 2026

- Phase 0.1 done: four commits, no secrets found (`.tmp-*`, `unlock-codes/` scratch scripts and `screenshot-cards.mjs` left untracked on purpose).
- Phase 0.2 done: dashboard calls to `127.0.0.1:8787` return 200 in a real browser, console clean. 194 service tests, `tsc` and `vite build` pass.
- Done in Phase 2: B15 (Spotify 429 backoff), V (`version.json` staged into the bundle), B10 partly (memclean runs a private temp copy; JSON-only POSTs already force a CORS preflight; an elevated child still cannot be killed from the service).
- Phase 1 decisions made 15 November 2026: old builds deleted, `screenshot-cards.mjs` and `playwright` removed, `cputemp` card/endpoint/alert rule/`lhmUrl` removed. Z1 scope cut: no features chosen, so Z3, Z5 (rest) and Z10 stay open. Also done: A1 (shell closes the service stdin; needs an installed-build check), mobile tab strip, wallpaper rollback.
- Z3, Z5 and Z10 done 15 November 2026: the `Provider` interface is gone (plain `lib/api.ts` functions; `StationInfo` carries machine and profiles; one boot signal in `useStation`), `routes.mjs` holds the route table, and the boot screen no longer measures the dashboard. Checked in a real browser (boot, polling at 1 per second, Vault sections, all calls 200); the frontend still has no automated tests.
- Design pass: detector clean, every button labelled; no UI changes needed. Not done: 0.3 theme click-through, 0.4 game mode, 0.5 installer build, Phase 1 decisions, R-wall, Z3/Z5/Z10.

## Phase 0: make it safe and prove it works (do first, about an hour)

| # | Step | Why |
|---|------|-----|
| 0.1 | Commit the current state in logical chunks (backend fixes, frontend fixes, docs, tests). Check `git status` for secrets first (`discord.json`/`spotify.json` live in `%APPDATA%`, not the repo; confirm nothing similar is staged) | About 60 changed files and one commit: no rollback point |
| 0.2 | Run `npm run live`, open http://localhost:1420, open DevTools Network: dashboard calls to `127.0.0.1:8787` must return 200 (confirms the cross-site Blocker fix) | Fix is test-covered but never seen in a real browser |
| 0.3 | Click through: edit layout, add and remove cards, switch a light theme and a dark theme (check editbar, picker, toasts, selects, Spotify card, hero radar), Vault backup then restore (confirmation, summary toast, wallpaper), force a card error | Visual and runtime changes were verified by reading code only |
| 0.4 | Game mode: start and stop on a safe profile, confirm power mode restores; kill the service mid-game-mode and restart, confirm the journal recovers | Journal and power-step logic changed twice |
| 0.5 | `npm run prepare:sidecar` then `npm run tauri build -- --bundles nsis`; install and launch; check the log `%APPDATA%\CommandStation\service.log` | Bundle now stages `service/` without tests and refuses non-x64 |

## Phase 1: decisions only you can make

| ID | Decision | Options | My recommendation |
|----|----------|---------|-------------------|
| A1 | Desktop shell hard-kills the service (`child.kill()` = TerminateProcess), so `shutdown()` never runs in the shipped app and children (nvidia-smi, typeperf, PowerShell helpers, AI tree) are orphaned | Piped stdin: Rust keeps a pipe open, service shuts down on stdin end; or a Windows job object with kill-on-close | Piped stdin (small, testable). Needs a Rust build to verify |
| A4/M5 | Old builds `CommandStation/`, the Phase 1 zip, `CommandStation-v0.2/` (stale 18-file service) | Delete (permanent, they are not in git), move to `release/`, or leave | Rebuild once (0.5), then delete all three |
| M6 | `app/screenshot-cards.mjs` (untracked, unused) and the `playwright` devDependency | Delete both, or move to `scripts/` and wire `npm run shots` | Delete unless you use it |
| Z1 | Scope: Discord, Spotify, game library, toasts, memory clean, cost, world clock, calendar, themes, credits all grew past "Overwatch dashboard" | Keep all and put extras behind an `integrations/` boundary; or cut unused ones | Cut whatever you have not used in a month. Do this before more refactors |
| Z6 | `cputemp` card and `/api/cputemp` (needs LibreHardwareMonitor) | Keep, or remove card, endpoint, `lhmUrl` | Remove if you do not run LHM |

## Phase 2: remaining code work (after Phase 1 decisions)

### Correctness and safety
| ID | Item | Notes |
|----|------|-------|
| B10 | Memory clean: elevated PowerShell child outlives the 120 s timeout; any Origin-less local caller can pop a UAC prompt | Require a custom header on POSTs (forces CORS preflight); copy script to a restricted temp path before elevating |
| B15 | Spotify: no 429 backoff (two calls per tick keep polling) | Honour `Retry-After` |
| R-wall | Restore: wallpaper image is not snapshotted; a failed save restores the old reference but not the old picture | Snapshot via `loadPicture` before restore |
| H5b | Untested: `prepare-sidecar` staging filter, background recovery in `main()` | Export the filter, test on a temp dir |
| V | Bundled service has no `package.json`, so `VERSION` falls back to `0.2.0` | Ship `package.json` in the Tauri resources or stage a version file |
| X | Remaining raw `execFile`/`spawn` outside `spawn.mjs` (`system.mjs`, `memclean.mjs`, `ai.mjs` where-probe, `live.mjs`) are documented as exempt | Revisit only if one starts long-running work |

### Structure and simplification
| ID | Item | Notes |
|----|------|-------|
| Z3 | Replace the `Provider` interface (one implementation) with a plain `api.ts`; move sample, feed and players onto `useApi`; one polling path and one boot signal | About 25 cards plus 3 hooks touch it. Do after Z1 shrinks the card set |
| Z5 | `index.mjs` composition root: modules export `routes`/`start`/`stop` and `index.mjs` loops | Makes cutting a feature a one-line removal |
| Z6b | Merge one-purpose modules (`sysstats`, `steam`, `hwextra`) into `system.mjs` | Optional |
| Z10 | Boot screen is larger than its job (about 770 lines plus CSS) | Keep the readiness gate, simplify the surface |
| F14 | Two notification systems (single toast and persistent centre); one event can appear three times | One notifier with severity, persistence and toast preview |
| M7 | Card registry vs `layouts.ts` metadata vs card files: a new card still touches 2 to 3 files | Add a comment, or merge after Z1 |

### Polish (low priority)
| ID | Item |
|----|------|
| G7 | Edit mode is pointer-only: add Move up/down in the card picker |
| G3 | First paint on light themes: inline script in `index.html` (currently `useLayoutEffect`) |
| cs. | Centralise the `cs.` storage-key prefix |
| Q5 | Restore result via `sessionStorage` instead of delayed reload |
| St | `useStoredJson` accepts a stored `null` with no `validate`; Toast flashes the previous text for one frame |
| JS | Main bundle is 520 kB: dynamic `import()` for pages (Vault, Themes, Credits) or `manualChunks` |
| T | The three default tokens `--glass-hi`, `--edge`, `--edge-2` still use white alpha |

## Phase 3: close out the review loop

1. After Phase 0 and Phase 1 decisions, run round 5. Reviewers re-audit the changed code.
2. A round is clean when no unsettled Blocker or Major remains. Two clean rounds in a row ends the loop.
3. If round 5 still finds Majors (likely), the skill stops at the cap: list the open findings by severity and choose to accept, continue, or return to drafting.
4. Update `goldfish_review_report.md`, then archive it into `docs-archive/`.

## Suggested order

1. Phase 0 (commit, run, click through, build). Fix anything it exposes before any review.
2. Phase 1 decisions, especially Z1 and A4/M5.
3. Phase 2 safety items (B10, B15, R-wall, V), then Z3/Z5/Z10 after the scope cut.
4. Polish as time allows.
5. Round 5.

## Already done (for reference)

- Backend: spawn safety helpers, crash and shutdown handling, config corrupt/locked/validated handling, journal corruption guard, power-step downgrade fixes, media helper framing, Discord and AI leaks, non-blocking `/api/meta`, locale-independent Wi-Fi and ping parsing, cross-site guard (Blocker fixed), step-id validation, fixed port, `COMMAND_STATION_DATA` override, tests 68 to 130, `counterwatch.mjs` split.
- Frontend: light-theme tokens (`--on-text`, `--wash`), contrast guards, modern color import, sensor store with stale and no-signal state, per-card error boundaries, memoised cards, wallpaper in IndexedDB, restore replaces with confirmation and rollback, `lib/storage.ts` everywhere, `MetaCards` and `App.tsx` split, dead mock/FPS code removed.
- Docs: root README, trimmed `app/README.md`, `SETUP.md`, `TROUBLESHOOTING.md`, `START HERE.txt`, archived plans and review reports.

## Theme and Credits

Written 14 November 2026. This section is the spec for a later build. Quests, the 120 Credit look price as a general rule, Patreon sign-in, Creator access, the gacha, and the quest page are plan-only. The cleanup phases above stay as they are.

Credits are earned on this PC. A plain Buy Me a Coffee tip leaves the Credit balance unchanged.

### Already shipped

- **Support page.** Tab `buy-credits`, `BuyCreditsPage`. It shows the Credit balance, then the official yellow Buy Me a Coffee button (`bmc-default-yellow.png`). A confirm dialog opens the URL. After the browser opens, the page says the balance is unchanged.
- **URL.** `VITE_BUY_ME_A_COFFEE_URL` in `app/.env` is `https://buymeacoffee.com/yuzishaostudio`. Leave `app/.env` and `app/.env.example` unchanged.
- **Balance.** `STARTING_CREDITS = 200` and `NIGHTSTEEL_COST = 120` are already in `app/src/state/stationCredits.ts`. The top bar shows the balance.
- **Looks today.** `themeCatalog.ts` ships a free `CATALOG` and one unlockable, Nightsteel. The Nightsteel dialog is a checkbox ("I opened Themes and picked any unlocked look") plus a 120 Credit spend, and `nightsteelUnlocked` is still hardcoded `false`. That checkbox is a placeholder. This spec replaces it.

### Counted minutes

A counted minute is a minute while a watched game is the running session. A session under 60 seconds adds nothing. Leftover minutes bank until they make 1 Credit.

### Ranks

Ranks are earned. They are not sold. A rank sets Credits per counted minute. It grants no look, and the look price stays 120 at every rank.

| Rank | Reach | Credits per counted minute |
| --- | --- | --- |
| Recruit | Start | 1 per 6 minutes (10/hour) |
| Regular | 180 counted minutes and 5 claimed tasks | 1 per 5 minutes (12/hour) |
| Veteran | 600 counted minutes and 15 claimed tasks | 1 per 3 minutes (20/hour) |
| Night | 1,500 counted minutes and 40 claimed tasks | 1 per 2 minutes (30/hour) |

### Quests

Claim is explicit. A claim pays once.

- Daily resets at local midnight.
- Weekly resets Monday 00:00 local.
- Monthly resets on the 1st at 00:00 local.

The quest page goes in the nav between Calendar and the film Credits crawl: `calendar`, then the quest page, then `credits`.

#### Daily, all ranks

| Quest | Credits | Completes when |
| --- | --- | --- |
| Station check-in | 5 | Once per local day |
| Thirty on the clock | 8 | 30 counted minutes that day |
| Arm game mode | 6 | Game mode phase on that day |

#### Daily, higher ranks

| Quest | Rank | Credits | Completes when |
| --- | --- | --- | --- |
| Long watch | Veteran | 12 | One finished session that day of at least 45 minutes |
| Night watch | Night | 15 | 90 counted minutes that day |

#### Weekly

| Quest | Credits | Completes when |
| --- | --- | --- |
| Weekly look | 0 | Check-in on 5 different days that week, then the user picks 1 locked preset look to unlock free |
| Three-hour week | 12 | 180 counted minutes that week |
| Armed three times | 8 | Game mode on, on 3 different days that week |

Weekly look replaced the old four-day credit quest. It pays 0 Credits. Unclaimed unlocks stay waiting. A new 5-day week can add another. A week with 4 check-in days grants no look.

#### Monthly

| Quest | Credits | Completes when |
| --- | --- | --- |
| Half the month | 20 | Check-in on 12 different days |
| Ten-hour month | 20 | 600 counted minutes |
| Eight armed days | 15 | Game mode on, on 8 different days |

#### One-time starters

| Quest | Credits | Completes when |
| --- | --- | --- |
| Apply a look | 15 | Apply a look |
| Open Calendar | 10 | Open Calendar |
| Open Vault | 10 | Open Vault |
| Star a theme | 12 | Star a theme. Available at Regular. It pays Credits and leaves Nightsteel and every other look locked. |

Start balance is `STARTING_CREDITS = 200`.

### Looks

- The first 30 looks are free and owned. Every look after those 30 is locked.
- Every locked preset look costs the same: 120 Credits. The user chooses which locked look to buy. That purchase is the chosen look. Random draws are in Gacha below.
- Weekly look (5 check-ins) also lets the user choose 1 locked preset. That claim spends no Credits.
- Spending 120 leaves any weekly unlock still waiting. A weekly unlock spends no Credits.
- Brand colors (the custom color editor) stay closed to Credits, to weekly claims, and to Bronze. Silver, Gold, and Diamond open the brand-color editor.

The first 30 looks in `themeCatalog.ts` are free. Every look after those 30 is locked. This spec does not name those looks. The catalog currently leaves only Nightsteel locked. Leave the catalog as it is.

### Gacha

The gacha spends earned Credits. Credits stay unbuyable. A plain tip adds none. Patreon sign-in adds none.

Choosing a specific locked preset still costs 120 Credits. The user picks the look. That buy is separate from a draw.

| Purchase | Cost |
| --- | --- |
| One random draw | 100 Credits |
| Ten random draws | 900 Credits, paid as one purchase of 10 draws |

A draw can award one random locked preset the user does not already own, or no theme. A no-theme result awards a placeholder coupon (or a similar future item) that can be redeemed later. Drop rates are not set yet. Coupon values and a redeem shop are unset.

Draws roll preset looks only. Brand colors stay out of the gacha. Paid preset looks and brand colors come from Patreon sign-in.

When the user owns every preset, a draw awards the coupon placeholder.

Duplicate protection beyond “a theme the user does not already own, or no theme” is not decided.

The gacha is not in the build order below.

### Patreon sign-in

Paid unlock is Patreon sign-in. There are no redeem codes. This is plan-only. It is not built.

Buy Me a Coffee stays the tip button only. The button is already on the Support page. A tip does not add Credits. A tip does not unlock looks or brand colors.

The exe has Log in with Patreon. The person signs in on Patreon's website. The exe asks Patreon which tier that account is paying. Internet is required for the check.

Four monthly tiers. No posts are required. No tier adds Credits.

The creator does not run a server. Patreon is the account check.

| Tier | Price | Benefits |
| --- | --- | --- |
| Bronze | $2.99 / month | Unlock Basic Theme |
| Silver | $5.99 / month | Unlock Basic Theme, unlock Brand Theme, Discord access |
| Gold | $9.99 / month | Everything in Silver, plus an exclusive channel to request a design or update |
| Diamond | $11.99 / month | Everything in Gold, plus early access to the beta test version |

Basic Theme means all preset looks, including the locked ones after the first 30 free. Brand Theme means the brand-color editor.

The exe checks the Patreon tier on sign-in. Bronze turns on Basic. Silver, Gold, and Diamond turn on Basic and Brand.

Discord, the design-request channel, and beta access are Patreon benefits. The exe does not enforce them in this plan.

If they cancel, the next check removes the Patreon theme unlocks. The 30 free looks, weekly picks, Credit unlocks, and gacha unlocks stay.

### Creator access

Creator access is plan-only. It is not built.

The complete version means all preset looks (Basic Theme, including the locked looks after the first 30 free) and the brand-color editor (Brand Theme). It does not include the Discord design-request channel or beta access unless the owner also invites them on Patreon.

There is no public free tier. A $0 Join button would let everyone in.

The owner adds a Creator tier that is not shown on the public Patreon page. The owner gifts that membership to an approved creator. The creator pays nothing. There is no redeem code. The owner does not run a server. Patreon stays the account check.

The creator uses the same Log in with Patreon button as paying members. The exe sees the Creator tier and turns on Basic and Brand, the same theme unlock as Silver and above. The Creator tier adds no Credits.

If the gift ends, the next check removes those Patreon unlocks. The 30 free looks, weekly picks, Credit unlocks, and gacha unlocks stay.

Who gets it: a creator the owner approves (a streamer, video maker, or artist showing the app). The plan does not build an application form. Approval is the owner gifting the tier.

Buy Me a Coffee stays a tip only.

The four public tiers stay Bronze $2.99 / month, Silver $5.99 / month, Gold $9.99 / month, and Diamond $11.99 / month. The first 30 looks stay free.

### Build order

Build later, in this order:

1. The three dailies every rank has (Station check-in, Thirty on the clock, Arm game mode) and the quest page. The one-time starters live on that page. Star a theme stays hidden until Regular can be reached, which needs the counted-minute timer in step 4.
2. Weekly quests, including Weekly look.
3. Monthly quests.
4. Rank dailies (Long watch, Night watch) and the per-minute timer.
