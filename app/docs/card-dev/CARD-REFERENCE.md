# Card reference

Every built-in dashboard card (36, the keys of `CARDS` in `app/src/layout/layouts.ts`). Use this to find a card like yours and copy its pattern.

- **Size / min** are `[width, height]` in grid units on the 24-column desktop grid.
- **Props** are what `CARD_VIEWS` in `app/src/layout/registry.tsx` passes. "none" means the card reads everything itself.
- **Data** and **stars** come from `WIDGET_COST` in `app/src/state/widgets.ts`.
- **Storage** keys are from `app/src/lib/storageKeys.ts` and `app/src/layout/cardKeys.ts`. `<id>` means one key per copy.

## Good examples to copy

| If your card… | Read |
| --- | --- |
| Shows one number from an endpoint | [`wifi`](#wifi) → `WifiCard` in `cards/NetCards.tsx` |
| Has a button that does something | [`memory`](#memory) → `MemoryCard` in `cards/PcCards.tsx` |
| Saves user input per copy | [`notes`](#notes) → `NotesCard` in `cards/ToolCards.tsx` |
| Has a user preference | [`verdict`](#verdict) → `VerdictCard` in `cards/NetCards.tsx` |
| Has more than one look | [`clocks`](#clocks) → `WorldClockCard` in `cards/WorldClockCard.tsx` |
| Follows the live sensor sample | [`power`](#power) → `PowerView` in `layout/registry.tsx` |
| Uses data the app already shares | [`trend`](#trend) → `TrendCard` in `cards/OverwatchCards.tsx` |

## Overview

| id | Name | Group → tab | Size / min | On at install | Stars |
| --- | --- | --- | --- | --- | --- |
| [gpu](#gpu) | GPU | This PC → Station | 6×4 / 3×4 | yes | 4 |
| [load](#load) | Load | This PC → Station | 3×5 / 3×5 | yes | 4 |
| [uplink](#uplink) | Uplink | Connection → Station | 3×4 / 3×4 | yes | 4 |
| [chart](#chart) | Players online | Overwatch → Overwatch | 12×22 / 8×10 | yes | 5 |
| [alerts](#alerts) | Alerts and events | This PC → Station | 6×9 / 4×6 | yes | 4 |
| [gamemode](#gamemode) | Game mode | Game → Game mode | 6×11 / 5×9 | yes | 4 |
| [feed](#feed) | Overwatch feed | Overwatch → Overwatch | 6×9 / 5×6 | yes | 4 |
| [media](#media) | Now playing | Media → Station | 6×9 / 4×7 | yes | 5 |
| [calendar](#calendar) | Calendar | Tools → Station | 6×12 / 4×9 | | 4 |
| [spotify](#spotify) | Spotify control | Media → Station | 6×12 / 4×9 | | 5 |
| [wavelink](#wavelink) | Wave Link | Media → Station | 6×24 / 4×12 | | 5 |
| [memory](#memory) | Memory | This PC → Station | 6×8 / 4×7 | | 4 |
| [power](#power) | Power and battery | This PC → Station | 6×8 / 4×7 | | 4 |
| [regionping](#regionping) | Ping by region | Connection → Station | 6×8 / 4×7 | | 4 |
| [jitter](#jitter) | Jitter and packet loss | Connection → Station | 6×8 / 4×7 | | 4 |
| [wifi](#wifi) | Wi-Fi signal | Connection → Station | 6×7 / 4×6 | | 4 |
| [verdict](#verdict) | Connection verdict | Connection → Station | 6×9 / 4×7 | | 4 |
| [trend](#trend) | Player trend | Overwatch → Overwatch | 6×8 / 4×7 | | 4 |
| [patch](#patch) | Patch summary | Overwatch → Overwatch | 6×9 / 4×7 | | 4 |
| [season](#season) | Season countdown | Overwatch → Overwatch | 6×6 / 4×5 | | 4 |
| [steam](#steam) | Steam news | Overwatch → Overwatch | 6×9 / 4×7 | | 4 |
| [queue](#queue) | Best time to play | Overwatch → Overwatch | 6×8 / 4×7 | | 4 |
| [airesearch](#airesearch) | Leak feed | Overwatch → Overwatch | 6×20 / 4×10 | yes | 5 |
| [tierlist](#tierlist) | Hero tier list | Meta → Overwatch | 6×20 / 4×9 | yes | 4 |
| [mappicks](#mappicks) | Map hero picks | Meta → Overwatch | 6×20 / 4×9 | yes | 4 |
| [bestpicks](#bestpicks) | Best pick per role | Meta → Overwatch | 6×11 / 4×8 | | 4 |
| [heroprofile](#heroprofile) | Hero profile | Meta → Overwatch | 12×22 / 6×16 | yes | 5 |
| [session](#session) | Session timer | Game → Game mode | 6×6 / 4×5 | | 4 |
| [playhistory](#playhistory) | Play history | Game → Game mode | 6×8 / 4×7 | | 4 |
| [report](#report) | Session report | Game → Game mode | 6×8 / 4×7 | | 4 |
| [gmhistory](#gmhistory) | Game mode history | Game → Game mode | 6×8 / 4×7 | | 4 |
| [clocks](#clocks) | World clock | Tools → Station | 6×11 / 4×8 | yes | 4 |
| [cost](#cost) | App cost | This PC → Station | 6×8 / 4×7 | | 4 |
| [library](#library) | Game library | Game → Game mode | 6×12 / 4×8 | | 4 |
| [discord](#discord) | Discord | Media → Station | 6×16 / 4×11 | | 5 |
| [notes](#notes) | Pre-game checklist | Tools → Station | 6×9 / 4×7 | | 4 |

---

## This PC

### gpu
**GPU**: temperature with a limit gauge.
- **View:** `DeviceTile` in `components/Tiles.tsx`, through `GpuView` in `registry.tsx`
- **Props:** `store` (reads `gpuTemp` with `useSample`), `model` from `info.machine.gpu`
- **Data:** the station's own sensor sample; no polling of its own
- **Storage:** none

### load
**Load**: CPU and GPU load.
- **View:** `LoadTile` in `components/Tiles.tsx`, through `LoadView`
- **Props:** `store` (reads `cpuLoad`, `gpuLoad`, `stale`)
- **Data:** sensor sample; no polling of its own
- **Storage:** none

### alerts
**Alerts and events**: what happened this session.
- **View:** `AlertsPanel` in `components/Panels.tsx`
- **Props:** `events` from `CardCtx`
- **Data:** this session's events, built in the app; no polling
- **Storage:** none

### memory
**Memory**: RAM used and the top apps using it.
- **View:** `MemoryCard` in `cards/PcCards.tsx`
- **Props:** none
- **Data:** `GET /api/system` every 5 s, 30 s during a game. Action: `POST /api/memory/clean`
- **Storage:** none
- **Pattern:** action button with busy state and a toast

### power
**Power and battery**: battery, charge watts, unplugged warning.
- **View:** `PowerCard` in `cards/PcCards.tsx`, through `PowerView`
- **Props:** `game` (from the sensor sample)
- **Data:** `GET /api/system` every 10 s, 60 s during a game
- **Storage:** none

### cost
**App cost**: how much CPU and memory this app uses, against its budget.
- **View:** `CostCard` in `cards/ExtraCards.tsx`
- **Props:** none
- **Data:** `GET /api/cost` every 15 s, 30 s during a game
- **Storage:** none

## Connection

### uplink
**Uplink**: ping to the region and your router.
- **View:** `UplinkTile` in `components/Tiles.tsx`, through `UplinkView`
- **Props:** `store` (whole sample)
- **Data:** sensor sample; no polling of its own
- **Storage:** none

### regionping
**Ping by region**: Americas, Europe and Asia side by side.
- **View:** `RegionPingCard` in `cards/NetCards.tsx`
- **Props:** none
- **Data:** `GET /api/net` every 2 s, shared by the four network cards; stops during a game
- **Storage:** none

### jitter
**Jitter and packet loss**: last 60 seconds of ping spread and drops.
- **View:** `JitterCard` in `cards/NetCards.tsx`
- **Props:** none
- **Data:** `GET /api/net` (shared, as above)
- **Storage:** none
- **Pattern:** `Sparkline` with drop markers

### wifi
**Wi-Fi signal**: strength, band and network name.
- **View:** `WifiCard` in `cards/NetCards.tsx`
- **Props:** none
- **Data:** `GET /api/net` (shared, as above). Parsed from `netsh wlan show interfaces` by `parseWifi` in `service/netstats.mjs`
- **Storage:** none
- **Pattern:** the simplest full example: loading, not-on-Wi-Fi and data states

### verdict
**Connection verdict**: ranked-ready status from the metrics you pick.
- **View:** `VerdictCard` in `cards/NetCards.tsx`
- **Props:** none
- **Data:** `GET /api/net` (shared, as above)
- **Storage:** `cs.verdict.metrics` (shared): the metrics the user chose
- **Pattern:** a user preference saved with `readJson` / `writeJson`

## Media

### media
**Now playing**: Spotify and other media: title, art, play, skip.
- **View:** `MediaCard` in `cards/MediaCard.tsx`
- **Props:** none
- **Data:** `GET /api/media` every 2 s, 15 s during a game. Also `GET /api/media/art`, `POST /api/media/control`
- **Storage:** none

### spotify
**Spotify control**: play, skip, volume, shuffle and device for any Spotify account.
- **View:** `SpotifyCard` in `cards/SpotifyCard.tsx`
- **Props:** none
- **Data:** `GET /api/spotify` every 3 s through the Spotify Web API, 20 s during a game. Sign-in and control through `/api/spotify/*`
- **Storage:** none in the dashboard (the service keeps the sign-in)

### wavelink
**Wave Link**: Elgato Wave Link 3: mic mute, mix and channel volumes.
- **View:** `WaveLinkCard` in `cards/WaveLinkCard.tsx`
- **Props:** none
- **Data:** `GET /api/wavelink` every 2 s, 4 s during a game (never stops). Action: `POST /api/wavelink/set`
- **Storage:** `cs.wavelink.view` (shared, not in `KEYS`): the chosen view

### discord
**Discord**: who is in your voice channel, and your Discord notifications.
- **View:** `DiscordCard` in `cards/ExtraCards.tsx`
- **Props:** `toasts` from `CardCtx`
- **Data:** `GET /api/discord` every 3 s through Discord RPC, 10 s during a game. Setup through `/api/discord/*`
- **Storage:** `cs.discordRead` (shared): which notifications were read

## Tools

### calendar
**Calendar**: month at a glance and what is next. Click to open the calendar.
- **View:** `CalendarCard` in `cards/CalendarCard.tsx`
- **Props:** `onOpen` = `onOpenCalendar` from `CardCtx`
- **Data:** your saved calendar and game events; no fast polling
- **Storage:** none of its own; reads the Calendar page's saved events (`cs.calendar`) through `readEvents` in `cards/CalendarPage.tsx`

### clocks
**World clock**: time where your teammates are, in five looks you can switch.
- **View:** `WorldClockCard` in `cards/WorldClockCard.tsx`, through `ClockView`
- **Props:** `look` = `inst.look`, `onLook` (bound to the copy's id)
- **Looks:** `rulers`, `ring`, `curve`, `levels`, `headline` (`CLOCK_LOOKS`)
- **Data:** ticks every second on this PC, 15 s during a game
- **Storage:** `cs.clocks` (shared): the city list
- **Pattern:** the only card with looks

### notes
**Pre-game checklist**: checklist and notes saved on this PC.
- **View:** `NotesCard` in `cards/ToolCards.tsx`
- **Props:** `instanceId` = `inst.id`
- **Data:** none; no polling
- **Storage:** per copy `cs.checklist.<id>`, `cs.note.<id>`; legacy shared `cs.checklist`, `cs.note` (migrated into the first copy)
- **Pattern:** the reference for per-copy storage with validation and migration

## Overwatch

### chart
**Players online**: hourly players and the world map.
- **View:** `PlayersMap` in `components/PlayersMap.tsx`
- **Props:** `data`, `failed` from `players` in `CardCtx`
- **Data:** player data every 10 minutes (shared, owned by the app) plus a live world-map render (d3-geo and the world atlas)
- **Storage:** none

### feed
**Overwatch feed**: news, patch notes and leaks.
- **View:** `FeedPanel` in `components/Panels.tsx`
- **Props:** `items`, `error`, `checking`, `onCheck` from `feed` in `CardCtx`
- **Data:** the shared news feed, checked every 5 minutes; no polling of its own
- **Storage:** none

### trend
**Player trend**: peak, low and the busiest hour.
- **View:** `TrendCard` in `cards/OverwatchCards.tsx`
- **Props:** `players` = `players.data`
- **Data:** the shared player data; no polling of its own
- **Storage:** none
- **Pattern:** a card that only re-draws data the app already has

### patch
**Patch summary**: latest patch, buffs against nerfs.
- **View:** `PatchCard` in `cards/OverwatchCards.tsx`
- **Props:** `items` = `feed.items`
- **Data:** the shared news feed; no polling of its own
- **Storage:** none

### season
**Season countdown**: days left in the season.
- **View:** `SeasonCard` in `cards/OverwatchCards.tsx`
- **Props:** none
- **Data:** meta data every 10 minutes; stops during a game
- **Storage:** `cs.season.end` (shared)

### steam
**Steam news**: latest Overwatch posts on Steam.
- **View:** `SteamNewsCard` in `cards/OverwatchCards.tsx`
- **Props:** none
- **Data:** `GET /api/steam` every 10 minutes; stops during a game
- **Storage:** none

### queue
**Best time to play**: busy and quiet hours in your time zone.
- **View:** `QueueCard` in `cards/OverwatchCards.tsx`
- **Props:** `players` = `players.data`
- **Data:** the shared player data; no polling of its own
- **Storage:** none

### airesearch
**Leak feed**: hourly leak headlines from Google News, Reddit and YouTube.
- **View:** `AiResearchCard` in `cards/AiCards.tsx`
- **Props:** none
- **Data:** the service scrapes leaks hourly; the card reads them from `GET /api/feed` (and `POST /api/feed/refresh`), plus `GET /api/meta`
- **Storage:** `cs.leak.hourly` (shared, not in `KEYS`)

## Meta

### tierlist
**Hero tier list**: S to F tiers from Counterwatch, by role.
- **View:** `TierListCard` in `cards/meta/TierListCard.tsx`
- **Props:** none
- **Data:** meta data every 10 minutes (`/api/meta`); stops during a game
- **Storage:** shares the rank and mode preferences (`cs.meta.rank`, `cs.meta.mode`) with the other meta cards

### mappicks
**Map hero picks**: pick a map: most played and best win-rate heroes.
- **View:** `MapPicksCard` in `cards/meta/MapPicksCard.tsx`
- **Props:** none
- **Data:** meta data every 10 minutes; stops during a game
- **Storage:** `cs.meta.map.<game>` (one per game): the chosen map; legacy shared `cs.meta.map`

### bestpicks
**Best pick per role**: the strongest hero for tank, damage and support.
- **View:** `BestPicksCard` in `cards/meta/BestPicksCard.tsx`
- **Props:** none
- **Data:** meta data every 10 minutes; stops during a game
- **Storage:** none of its own

### heroprofile
**Hero profile**: OW: poke/rush/dive · Apex: poke/dive/sustain + ALS pick rate.
- **View:** `HeroProfileCard` in `cards/meta/HeroProfileCard.tsx`
- **Props:** `instanceId` = `inst.id`
- **Data:** per-hero meta fetches and scrapes (Counterwatch, ALS) whenever you pick a hero (`/api/meta/hero`)
- **Storage:** per game and copy `cs.meta.hero.<game>.<id>`; legacy `cs.meta.hero.<id>` and shared `cs.meta.hero`
- **Pattern:** per-copy keys that also vary by game; `cardKeys.ts` registers one key per game from `GAME_IDS`

## Game

### gamemode
**Game mode**: one-tap game mode with undo.
- **View:** `GameModePanel` in `components/Panels.tsx`
- **Props:** `profiles`, `profile`, `onProfile`, `phase`, `status`, `onStart`, `onStop` from `gm`; `disabled` = `stopped`
- **Data:** runs only when pressed: `POST /api/step/apply`, `POST /api/step/restore`
- **Storage:** none in the card (the app owns the profile choice)

### session
**Session timer**: how long you have played, with a break reminder.
- **View:** `SessionCard` in `cards/GameCards.tsx`
- **Props:** none
- **Data:** `GET /api/sessions` every 10 s, 60 s during a game
- **Storage:** `cs.break.hours` (shared): the break reminder

### playhistory
**Play history**: hours per day this week.
- **View:** `PlayHistoryCard` in `cards/GameCards.tsx`
- **Props:** none
- **Data:** `GET /api/sessions` every 10 s, 60 s during a game
- **Storage:** none

### report
**Session report**: ping, load and temperature of your last session.
- **View:** `ReportCard` in `cards/GameCards.tsx`
- **Props:** none
- **Data:** `GET /api/sessions` every 10 s, 60 s during a game
- **Storage:** none

### gmhistory
**Game mode history**: past runs and what they changed.
- **View:** `GameModeHistoryCard` in `cards/GameCards.tsx`
- **Props:** none
- **Data:** `GET /api/gamemode/history` every 15 s; stops during a game
- **Storage:** none

### library
**Game library**: installed Steam games and Battle.net, one-tap play.
- **View:** `LibraryCard` in `cards/ExtraCards.tsx`
- **Props:** none
- **Data:** `GET /api/library` every 60 s; stops during a game. Action: `POST /api/library/launch`
- **Storage:** none
