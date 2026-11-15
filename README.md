<div align="center">

# Command Station

**Windows desktop dashboard for Overwatch and your PC**

[![Windows](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4?logo=windows&logoColor=white)](#install)
[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![Version](https://img.shields.io/badge/version-0.2.0-informational)](app/src-tauri/tauri.conf.json)

Live thermals and load · one-tap game mode with undo · Overwatch news & free leak feed · Counterwatch meta · media · calendar · Vault

</div>

---

## Table of contents

- [Features](#features)
- [Install](#install)
- [How to use](#how-to-use)
- [Configuration](#configuration)
- [Docs](#docs)
- [Credits / license](#credits--license)

## Preview

No screenshot asset is checked into the repo yet. For UI reference, see [`design/command-station-redesign.html`](design/command-station-redesign.html).

## Features

| Area | What you get |
| --- | --- |
| **This PC** | GPU/CPU load and temps, memory, battery, ping by region, Wi-Fi |
| **Game mode** | One-tap profile steps with an on-disk undo journal; leftovers restored on service start |
| **Overwatch feed** | News, patch notes, Steam posts, community items (non-AI) |
| **Leak feed** | Free hourly headlines (Google News, Reddit, YouTube, Blizzard); Check now / hourly refresh |
| **Sources** | Official / Leak / News tags; default X handles when `xRssUrl` is set |
| **Meta** | Counterwatch hero tiers, map picks, best pick per role (cached locally) |
| **Calendar** | Full-page Event Manager (month / week / day / list) |
| **Media** | Windows now-playing, optional Spotify, Elgato Wave Link when running |
| **Vault** | Sources, alerts, game-mode lists, appearance, backup/restore |
| **Layout** | Arrange and resize cards; Home starts with a first-run set |

## Install

1. Get the **Command Station** Windows installer (`.exe`, NSIS).
2. Run the installer and follow the prompts.
3. Open **Command Station** from the Start menu.

The desktop shell starts a bundled Node service and stops it when you quit. You do not open a browser or a localhost URL to use the app.

**Requirements:** Windows 10 or 11.

**Optional hardware helpers:**

- NVIDIA GPU + `nvidia-smi` for GPU temperature

## How to use

### Dashboard

Cards show live samples from the local service the app manages. Use **Edit layout** to move/resize cards and **Cards** to add or remove types. Layout is saved per width (desktop / tablet).

### Feeds and leaks

- **Overwatch feed** — Blizzard news/patches, Reddit, YouTube, optional X, Steam — no AI.
- **Leak feed** — Google News searches, leak-tagged Reddit/YouTube, and related sources. Service refresh ~30 minutes; the card’s hourly / **Check now** actions refresh the feed. This path does **not** call Claude or Antigravity.

### Sources (Vault → Sources)

Track X, YouTube, Reddit, or websites with Official / Leak / News tags. Built-in X defaults: PlayOverwatch (official), wiki_ow and SkaVorah (leak), OWCavalry and OmnicPost (news). X posts appear only when `feed.xRssUrl` in config is a bridge URL containing `{handle}`.

### Calendar

Open the **Calendar** tab for the Event Manager. Add your own events; dated game/news items from the feed stay read-only.

### Vault

Top-bar vault icon: This PC, Navigation, Sources, Alerts, Game mode, Appearance, Backup. Backup exports layout/theme/calendar/notes and game-mode lists — not Spotify or Discord sign-ins.

### Game mode

Start a profile from the Game mode card. Steps (power plan, close apps, memory trim, GPU preference, launch, priority, …) are journaled before apply and undone on restore or next service start. Edit lists under Vault → Game mode.

### Optional AI engines

The service can talk to Claude or Antigravity CLIs if those tools are installed. Hourly AI leak check is **off by default**. The Leak feed card uses the free Google News / Reddit / YouTube path, not the AI engines.

## Configuration

Data folder: `%APPDATA%\CommandStation\`  
(usually `C:\Users\<you>\AppData\Roaming\CommandStation`)

| File | Purpose |
| --- | --- |
| `config.json` | Settings (feed sources, close apps, games, …) |
| `journal.json` | Game-mode undo journal |
| `feed-cache.json` | Last feed pull |
| `counterwatch.json` | Cached meta stats |
| `sessions.json`, `gamemode-history.json`, `players.json` | Play/session history |
| `discord.json`, `spotify.json` | App credentials / tokens (never in backups) |
| `service.log` | Service log |

Edit `config.json`, then quit and reopen the app. Full key list and defaults: [app/README.md](app/README.md#config). Override the folder with `COMMAND_STATION_DATA` if needed.

Do not delete `journal.json` while game mode is on, or undo is lost.

## Docs

| Doc | Contents |
| --- | --- |
| [app/docs/SETUP.md](app/docs/SETUP.md) | Prerequisites, live run, desktop build |
| [app/docs/TROUBLESHOOTING.md](app/docs/TROUBLESHOOTING.md) | Ports, CORS, journal, empty feed, Rollup / SAC |
| [app/README.md](app/README.md) | Service API, config keys, data folder, cards |
| [app/docs/DEVELOPMENT.md](app/docs/DEVELOPMENT.md) | Contributor scripts, build, repo layout |

For developers, see [DEVELOPMENT.md](app/docs/DEVELOPMENT.md).

## Credits / license

In-app **Credits** lists data sources (Counterwatch, Steam, Blizzard, feed accounts you track, and more).

No project license file is present in the repo yet.
