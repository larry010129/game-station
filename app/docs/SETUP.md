# Setup

Steps marked (unverified) were not run while writing this guide.

## Prerequisites

- Windows 10 or 11, and Node.js with npm (a recent version; Vite 6 needs it, exact minimum unverified).
- Nothing else for the dashboard and service.

## Start it

```bash
cd app
npm install      # first run only
npm run live     # service (8787) + dashboard on http://localhost:1420
```

`npm run live` runs the service and the Vite dev server from one command, and Ctrl+C stops both. That is the browser version, and it is meant for working on the dashboard. The `Start Command Station.bat` launcher was removed: it opened the service in a second, minimized window that outlived the dashboard and left the ports blocked.

The desktop app is the normal way to run it, see "Desktop app" below. To serve a production build in a browser instead, run `npm run build`, then `npx vite preview --port 1420 --strictPort` with `npm run service` running separately.

If port 1420 or 8787 is busy, see TROUBLESHOOTING.md.

## Frame rate: PresentMon

The service looks for `PresentMon.exe` in `C:\Program Files\PresentMon\`, `C:\Program Files\Intel\PresentMon\` and `%LOCALAPPDATA%\Programs\PresentMon\`, or at `presentMonPath` in config.json.

1. Download the PresentMon console application from https://github.com/GameTechDev/PresentMon/releases (unverified: pick the console build, not the GUI).
2. Put it in one of the folders above, or set `presentMonPath` in `%APPDATA%\CommandStation\config.json`.
3. Reading frames needs administrator rights (or membership of the "Performance Log Users" group). Start the service from an administrator terminal: `cd app`, then `npm run service` (unverified).
4. Start Overwatch. `GET /api/health` shows `presentMon` as `live` once frames arrive. `missing` means not found, `error` means it could not read frames.

The default arguments run PresentMon against `Overwatch.exe` with output on stdout. Flags differ between PresentMon versions; change `presentMonArgs` if yours rejects them.

## Temperatures

GPU temperature comes from `nvidia-smi` and needs nothing extra. CPU temperature is not shown (it would need LibreHardwareMonitor).

## Desktop app

Built and run on this PC. Needs Rust (https://rustup.rs, MSVC toolchain), Visual Studio Build Tools with "Desktop development with C++", and Smart App Control off. In `app`: `npm run tauri build -- --bundles nsis`. Installer output: `src-tauri\target\release\bundle\nsis\`. The shell starts the bundled `node.exe` against `service\` itself and stops it on exit; its log is `%APPDATA%\CommandStation\service.log`. `npm run tauri dev` uses `npm run live` for the service instead.

## Prebuilt Phase 1 build

`CommandStation\` (and the zip beside it) holds an unsigned Windows x64 build made on Linux: `command-station.exe` plus `WebView2Loader.dll`, which must stay together. SmartScreen warns: More info, Run anyway. It predates the current service, so use the quick start for the full feature set.

## Data and config

Everything lives in `%APPDATA%\CommandStation\` (config.json, journal.json, feed-cache.json). Edit config.json and restart the service. Key list: see `../README.md`.

## Tests

`npm run test:service` runs the parser tests (not run when writing this guide).
