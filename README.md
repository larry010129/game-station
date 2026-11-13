# Command Station

A Windows desktop dashboard (Tauri 2 + React + TypeScript) backed by a small local Node service. It started as an Overwatch dashboard and is now a general game-station: real readings from this PC, one-tap game mode with an undo journal, Overwatch news and meta, media and calendar cards, and a card layout you arrange yourself.

Only real data is shown. If the service is not up yet the dashboard says so and retries; there is no sample-data fallback.

## Run it

From `app\`:

```bash
npm install
npm run live        # service + browser version at http://localhost:1420
npm run test:service
npm run build       # typecheck + vite build
```

The desktop build needs Rust, the VS C++ Build Tools and Smart App Control off (`npm run tauri build`). The shell starts the bundled `node.exe` against `service\index.mjs` on `127.0.0.1:8787` and stops it on exit.

## Layout of the repo

| Path | What |
| --- | --- |
| `app/src` | Dashboard: `cards/`, `components/`, `layout/` (grid, card registry), `state/` hooks, `boot/`, `pages/`, `providers/` |
| `app/service` | Local service: one module per concern, wired in `index.mjs`. Tests in `service/test` |
| `app/src-tauri` | Desktop shell |
| `app/docs` | `SETUP.md`, `TROUBLESHOOTING.md` |
| `app/README.md` | API table (kept in sync by a test) and service config |
| `design/` | Design reference pages |
| `docs-archive/` | Superseded plans (project summary, next plan, boot screen plan) and review reports rounds 1 to 3 |
| `goldfish_review_report.md` | Latest code review findings |

Your data lives in `%APPDATA%\CommandStation\` (config, journal, caches, `service.log`).

## Security model

The service binds to localhost, checks an Origin allowlist and Host header, and accepts only JSON POSTs with a 1 MB cap.

## Scope

Not decided yet: the Discord, Spotify, game library, toasts, memory-clean, cost, world clock and calendar features all grew beyond the original Overwatch scope. See `goldfish_review_report.md` (Z1) before adding more.
