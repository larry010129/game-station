# Command Station: what to do next

Written 12 November 2026. This follows on from `PROJECT SUMMARY.md`, which records what was built. This file is only about what is left.

Done since this plan was first drafted: the `Start Command Station.bat` launcher was removed. The browser version now starts with `npm run live` in `app`, and every doc points there instead.

## State it starts from

Checked against the code on 12 Nov 2026:

- Typecheck clean (`tsc --noEmit`, 0 errors).
- Service tests green: 46 passing in 328 ms.
- `GET /api/meta/hero` exists in `service/index.mjs`, so the hero profile card has a backend.
- `dragDropEnabled` is `true` and the shell stages `binaries/node` as a sidecar.
- **The shipped build is behind the source.** `CommandStation-v0.2\command-station.exe` is from 18:06 and the NSIS installer from 17:36, but seven source files are newer (18:08 to 18:10): `App.tsx`, `cards/MetaCards.tsx`, `layout/layouts.ts`, `lib/types.ts`, `providers/mockApi.ts`, `service/counterwatch.mjs` and its test. The hero profile card is in none of the builds.

The order below follows one rule: do not build new features on a build that cannot be reproduced.
## Phase 1: ship the source that already works (about 30 minutes, plus one manual run)

The single most valuable item on this list. Everything built in the last session, including the hero profile card, is sitting outside the app you actually launch.

1. Confirm the sidecar is present: `npm run prepare:sidecar` in `app/` (writes `src-tauri/binaries/node.exe`). It is generated rather than kept in the source tree, so run it after any fresh copy that lacks it.
2. Build: `npm run tauri build -- --bundles nsis`. Smart App Control must be off, and the Rust and VS C++ build tools must be installed, or the build scripts are blocked.
3. Launch the built exe and confirm, in order:
   - the window opens and the service comes up within a few seconds (watch `%APPDATA%\CommandStation\service.log`);
   - "Starting the local service" clears and real readings appear (GPU temp, load, ping);
   - the **hero profile** card can be added from the card list and renders a hero's page;
   - dragging a card tile from the card picker onto the dashboard works inside the exe, not just in the browser. This is the one behaviour that was never verified after `dragDropEnabled` was set to `true`. If it fails, the + button is the fallback and the drag path gets a follow-up ticket.
4. Copy the new exe into `CommandStation-v0.2\` **and refresh `service\` beside it**. The release folder runs its own copy of `service/`, so replacing only the exe leaves the old service code in place and the hero card will call an endpoint that copy does not have.
5. Run `Command Station_0.2.0_x64-setup.exe` end to end once: install, launch from the Start menu, verify the service starts, uninstall. This has never been done on this PC and is the only check that the installer is sound.
6. Bump `version` to `0.2.1` in `app/package.json` and `src-tauri/tauri.conf.json` before building if this is going to be handed to anyone else, so the installer filename distinguishes it from 0.2.0.

**Done when:** the exe and the installer both contain the hero card, and the installer has been round-tripped once.

## Phase 2: make the docs tell the truth (about 20 minutes)

`PROJECT SUMMARY.md` is accurate. `app/README.md` has drifted and will actively mislead the next person, including you in a month.

1. **Status table:** delete the claim that the dashboard "falls back to sample data". It does not. `src/providers/index.ts` retries the live service forever and never returns mock.
2. **`/api/sample` row:** it still promises `fps`, `temps` and `clocks`. Frame rate was removed, and CPU temperature was removed.
3. **"AI leak search" section:** this describes a card that asks Claude or Gemini on demand. The shipped card is the hourly leak feed. Rewrite it, and keep the honest warning about AI-sourced leaks if the underlying `service/ai.mjs` still backs it.
4. **Add the hero profile card** to the card groups and to the API table: `GET /api/meta/hero?slug=…&force=1`.
5. **Remove the "being reworked in parallel" sentence** under the step ids. The security checks and journal are covered by tests (`no Origin is allowed`, `foreign Host header is rejected`, 16 gamemode tests) and that line no longer describes reality.
6. **Tests line:** says "not re-run when this doc was written". Replace with "46 tests, passing" and the command.
7. In `PROJECT SUMMARY.md`, refresh "Checks at last build" after Phase 1 so it names the actual build time and what was verified in the exe.

**Done when:** every claim in `app/README.md` matches behaviour you can point at in the code, and no doc sends anyone to the removed batch launcher.

## Phase 3: decide the loose ends (each is a small piece of work, but first a choice)

These are not bugs. Each is a half-finished feature or a lie in the UI, and each needs one decision before any code.

| Item | What is there now | The choice |
| --- | --- | --- |
| **Vault** | A nav item in `TopBar.tsx` that prevents default and toasts "The settings vault arrives in Phase 2." | Build it (export/import `config.json`, the layout, and a reset-my-data button) or delete the nav item. Shipping a link that apologises is worse than either. My pick: **delete it now**, build it later if you miss it. |
| **Hero profile hero** | All hero cards share one hero in `cs.meta.hero`, so two cards cannot show two heroes. | Store the hero per card id, the way checklist and notes already do (`cs.checklist.<id>`). Small, and it removes the strangest remaining limit. My pick: **do it**. |
| **OBS step** | `service/gamemode.mjs` returns `{ kind: "obs" }` from the apply path, so the step is listed in profiles and does nothing. | Either wire it to OBS's WebSocket API (needs OBS running with the websocket plugin and a password in config) or drop the step from the default profile. My pick: **drop it from the default profile** until it can do something, then rebuild it properly. |
| **Stream Deck** | `DeckPanel.tsx` is an on-screen mock. | Real hardware means an SDK/driver link, which is a project of its own. My pick: **leave as preview**, but label it "preview" in the card header so it is not mistaken for a live panel. |
| **Dead mock code** | `providers/mock.ts` and `mockApi.ts` are unreachable; nothing imports them. | Delete, or keep as the dev-only path for working on the UI without the service. My pick: **keep**, gated behind an explicit `?mock=1`, because it is genuinely useful when the service is being changed. |

## Phase 4: prove the resource budget (needs you at the keyboard)

The summary sets a budget of **under 1% CPU and under 150 MB** with Overwatch running, and it has never been measured. It is the only claim in the project that is currently unverified rather than merely unfinished.

1. Start Overwatch, put it in a match, and leave Command Station on a second monitor for ten minutes.
2. Read CPU and memory for the app process **and** `node.exe` from Task Manager (Details tab, add the CPU and Working set columns), or `Get-Process command-station,node | Select Name,CPU,WS`.
3. Write the real numbers into `PROJECT SUMMARY.md`. If it is over budget, the sample interval in `useStation.ts` (1 s, 3 s in game mode, 5 s hidden) and the chart history length are the two dials.

## What I would do first

Phase 1, as one sitting. It is small, it removes the risk that makes every later change harder (a desktop app that does not match its source), and it ends with a working installer you can actually use. Phase 2 is worth doing while the diff is fresh. Phase 3 wants your decisions, not my guesses. Phase 4 wants an evening with the game running.

## Not on this plan, on purpose

- New cards or new data sources. There are already more cards than most people will use.
- A cloud sync, accounts or telemetry. The app is local by design and the summary's whole security posture is built around that.
- Rewriting the service or the layout engine. Both work and both are tested.
