# Troubleshooting

Fixes marked (unverified) were not tried on a live system.

**Dashboard shows sample data.** The service is not running or not reachable. Open http://127.0.0.1:8787/api/health. If it fails, run `npm run service` in `app` and read the output. The dashboard only talks to port 8787, so do not change `port`.

**Port already in use (8787 or 1420).** An old copy is still running, usually an earlier `npm run live` whose terminal was closed instead of stopped with Ctrl+C. End the leftover `node.exe` in Task Manager, then start again. Both the service and the dashboard keep fixed ports, so a stale copy blocks the new one instead of moving aside.

**Requests blocked, or a CORS error in the browser.** The service accepts only the origins `http://localhost:1420` and `http://127.0.0.1:1420`. Open the dashboard at one of those addresses, not another host or port.

**FPS shows a dash.** Check `presentMon` in `GET /api/health`:
- `missing`: PresentMon.exe not found. Put it in a standard folder or set `presentMonPath`.
- `error`: usually permissions. Run the service as administrator (unverified). The dashboard hint carries PresentMon's own message.
- `idle`: Overwatch is not running yet.

**Game mode left things changed (power plan, closed apps, GPU preference).** Restart the service: it reads `%APPDATA%\CommandStation\journal.json` and undoes leftover steps on start. Apps that were closed are not necessarily relaunched (unverified; see `service/gamemode.mjs`). If the journal is stuck, back it up and delete it.

**News feed empty.** Needs internet. The last good result is cached in `feed-cache.json`. Reddit requests are spaced `feed.redditGapMs` apart, so the first load is slow.

**`npm install` or the build fails with a Rollup native module or Application Control error.** Smart App Control blocks the native `.node` file. `package.json` already swaps in `@rollup/wasm-node`; re-run `npm install`.

**Edited config and nothing changed.** Restart the service. If config.json is invalid JSON the service falls back to defaults.

**Prebuilt exe will not open.** SmartScreen: More info, Run anyway. Keep `WebView2Loader.dll` next to the exe. It likely needs the WebView2 runtime (unverified). Otherwise use the quick start.

**`npm run tauri ...` fails (cargo or link.exe not found).** Rust or the VS C++ Build Tools are not installed. See SETUP.md.

**Stream Deck panel does nothing.** It is a preview only; there is no hardware connection yet.
