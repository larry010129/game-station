# Boot screen plan: "Command Station" startup

The goal is to replace the "Starting the local service…" text with an animated, command-centre-style boot screen. It hides the real startup work: starting the service, reading the hardware, and filling every card. When the screen fades out, the dashboard is already full.

Visual references: the spinning ring with a title and subtitle (21st "Loader") and the segmented progress bar with a tip line (21st "8-bit loading screen"). Both get restyled to the app's own look: near-black background, frosted glass, the Outfit font, and the orange accent `#f0893a`.

---

## 1. How it works (the key idea)

The boot screen isn't a fake timer. It's a cover over the real dashboard.

1. The app opens and shows the boot screen straight away.
2. It waits for the local service to answer (`/api/health`).
3. As soon as the service answers, the **real dashboard mounts underneath, hidden**. Every card starts its normal fetches through `useApi`.
4. The boot screen watches the shared `useApi` cache (`entries` in `src/state/useApi.ts`). Each startup step ticks off when its endpoint's first data actually arrives.
5. When the required steps are done, the screen plays its exit and the dashboard is revealed already filled in, with no blank cards.

Nothing is fetched twice, because the cards themselves do the loading and the boot screen only reports on it.

---

## 2. Startup steps (what the checklist shows)

Each row is one real thing being prepared. Rows are **required** (they must finish before the reveal) or **optional** (the reveal waits up to a time limit, then goes ahead and the card fills in later).

| # | Row label | Ticks off when | Type |
|---|---|---|---|
| 1 | Core service | `/api/health` answers | required |
| 2 | Hardware scan | `/api/machine` returns | required |
| 3 | Profiles | `/api/profiles` returns | required |
| 4 | Live telemetry | first `/api/sample` with a real reading | required |
| 5 | Network uplink | `/api/net` returns | optional |
| 6 | Players online | `/api/players` returns (the "Players online" card: hourly player counts and the world map) | optional |
| 7 | Intel feed | `/api/feed` returns | optional |
| 8 | Overwatch meta | `/api/meta` returns | optional |
| 9 | Media and Spotify | `/api/media` / `/api/spotify` return | optional |
| 10 | System extras | `/api/system`, `/api/cputemp`, `/api/cost` return | optional |

- Only show rows for cards that are on the **current tab's layout**, so there are no rows for cards that aren't there.
- Each row moves through: `STANDBY` → `LINKING` (small spinner) → `ONLINE` (orange tick) / `OFFLINE` (dimmed, when the source failed or isn't set up, such as Spotify not connected).
- An optional row that's still loading at the time limit shows `DEFERRED` and keeps loading behind the dashboard.

---

## 3. Screen layout and animation

A centred glass panel over the existing `Backdrop`.

**Phase A: Ignition (0–0.6 s)**
- Black screen. The backdrop fades in blurred, an orange scan line sweeps across once, and the panel fades up.

**Phase B: Boot (until the required steps are done)**
- **Core ring** (from reference 1): a thick ring with a motion-blurred trailing arc, plus a thin inner ring turning the other way. Grey with an orange leading edge. A small station mark sits in the centre.
- **Title:** "Command Station", with a short decode-style flicker as it first appears.
- **Subtitle:** the current step in plain words ("Scanning hardware…", "Linking telemetry…"), cross-fading as steps change.
- **Systems checklist:** the rows from section 2, in small caps, with status on the right.
- **Segmented progress bar** (from reference 2): about 24 segments that light up orange, with a percentage. Progress is weighted by step, required steps counting more. It only moves forward and never jumps back.
- **Tip line:** rotating every 4 s with real app tips (keyboard shortcuts, game mode, layout editing).

**Phase C: Handoff (about 0.8 s)**
- The bar finishes at 100% and the status reads "All systems online".
- The ring pulses once in orange, then collapses.
- The panel blurs and fades out, and the dashboard cards reveal in a quick stagger (top-left to bottom-right).

**Timing rules**
- **Minimum on screen: 1.2 s**, so it never flashes and vanishes.
- **Optional steps time limit: 4 s** after the required steps finish.
- **Warm restart** (for example a page reload while the service is already up): play a short version (~0.6 s) with Phase A skipped.

---

## 4. When things go wrong

- **Service not answering after 10 s:** "Core service" turns red (`NO SIGNAL`), and a line appears: "The local service hasn't started. It may still be launching, or it may have stopped." Add a **Retry** button and keep checking in the background. It recovers on its own when the service comes up.
- **Required step fails** (service answers but `/api/machine` errors): show that row in red with a Retry. Don't reveal a broken dashboard.
- **Optional step fails:** dim it as `OFFLINE`, carry on, and the card shows its own empty state later.

---

## 5. Accessibility and performance

- `prefers-reduced-motion`: no spinning or sweeping; the ring becomes a soft pulse and steps cross-fade.
- The screen is a `role="status"` region; the current step is read out once per change, not every frame.
- Use CSS animation only (transform and opacity): no canvas and no new animation library. The boot screen must stay cheap because it runs while the PC is busy starting things.
- Match the existing "quiet" behaviour: no heavy blur if the performance gate says so.

---

## 6. Files to add or change

**New**
- `app/src/boot/bootSteps.ts`: the step list (id, label, endpoint, required or optional, weight) and which card each step belongs to.
- `app/src/boot/useBoot.ts`: runs the health check, watches the `useApi` cache, tracks step states, progress, the time limit, the minimum time, and errors, and decides when to reveal.
- `app/src/boot/BootScreen.tsx`: the ring, title, subtitle, checklist, bar, tips, and the error and retry state.
- `app/src/styles/boot.css`: all boot styles and keyframes, using the existing tokens (`--glass`, `--edge`, `--orange`, `--ui`, `--ease`).

**Changed**
- `app/src/state/usePlayers.ts` and `app/src/state/useFeed.ts`: these load on their own, not through `useApi`, so they also need to report "first data arrived" to the boot screen.
- `app/src/state/useApi.ts`: add a small read-only way to see when an endpoint first has data, such as `onFirstData(path)` or a subscribe helper. Polling stays as it is.
- `app/src/App.tsx`: replace the "Starting the local service…" block. Mount `StationApp` underneath once the service answers, and render `BootScreen` on top until `useBoot` says ready.
- `app/src/providers/index.ts`: report "service reached" and "provider ready" separately, so steps 1–3 tick off at the right moments.
- `app/service/live.mjs`: already fixed so the service keeps port 8787. Commit it with this work.

---

## 7. Build order

1. **Readiness wiring:** add the `useApi` first-data hook and `useBoot`, with no visuals yet; log step changes to the console to check they match reality.
2. **Mount behind the cover:** change `App.tsx` so the dashboard loads underneath while a plain placeholder covers it. Check the cards are full on reveal.
3. **Boot screen visuals:** the ring, title, checklist, bar, and tips with the real step states.
4. **Handoff animation:** the exit and the card stagger.
5. **Error states:** no signal, failed step, Retry.
6. **Reduced motion and quiet mode.**
7. **Check in the desktop app (Tauri)**, where the service starts as a sidecar and startup is slowest.

---

## 8. How to test it

- **Normal start:** `npm run live` and watch every step tick off in order.
- **Slow service:** start only the frontend, then start the service ~15 s later. You should see `NO SIGNAL`, then automatic recovery.
- **Missing source:** with Spotify not connected, its row should show `OFFLINE` without blocking the reveal.
- **Replay switch:** add `?boot=replay` to the URL to force the full sequence on a warm start, for design checks.
- **Reduced motion:** turn on the OS setting and check that nothing spins.

---

## Open questions for you

1. Should the checklist show **every** row, or only the required four plus a single "Loading extras" row?
2. Should the tips be gameplay tips (Overwatch) or app tips (shortcuts, features)?
3. Should the warm-restart short version exist, or should the boot screen always play in full?
