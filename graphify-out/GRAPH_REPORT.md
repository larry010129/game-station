# Graph Report - game station  (2026-11-12)

## Corpus Check
- Corpus is ~28,008 words - fits in a single context window. You may not need a graph.

## Summary
- 574 nodes · 1144 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dashboard App Shell
- Feed Service (app)
- Feed Service (portable copy)
- Setup and Troubleshooting Docs
- Config Loader (portable copy)
- Sidecar and Config (app)
- Deck and Device Tiles
- Grid Layout
- Tauri Config
- Package Manifest
- TypeScript Config
- Runtime Dependencies
- Rust Desktop Shell
- Players Map and Icons
- Game Mode Engine
- npm Scripts
- HTTP Server
- Tauri Capabilities
- Vite Build
- Rollup Override
- Project Root

## God Nodes (most connected - your core abstractions)
1. `StationApp()` - 25 edges
2. `createSensors()` - 18 edges
3. `react` - 18 edges
4. `createSensors()` - 18 edges
5. `createGameMode()` - 16 edges
6. `Provider` - 15 edges
7. `compilerOptions` - 15 edges
8. `createGameMode()` - 14 edges
9. `start()` - 13 edges
10. `createFeed()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Game mode panel with stepped apply and restore` --semantically_similar_to--> `Game mode with undo journal`  [INFERRED] [semantically similar]
  design/command-station-redesign.html → app/README.md
- `Overwatch feed panel (official and leak filters)` --semantically_similar_to--> `Overwatch news and leak feed`  [INFERRED] [semantically similar]
  design/command-station-redesign.html → app/README.md
- `Stream Deck + key panel mock` --semantically_similar_to--> `Stream Deck panel (preview only)`  [INFERRED] [semantically similar]
  design/command-station-redesign.html → app/README.md
- `Sample data tick simulator (JS)` --semantically_similar_to--> `Provider interface (live vs mock)`  [INFERRED] [semantically similar]
  design/command-station-redesign.html → app/README.md
- `CPU and GPU temperature tiles with tick scale` --conceptually_related_to--> `Command Station (Windows Overwatch dashboard)`  [AMBIGUOUS]
  design/command-station-redesign.html → app/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Live data sources feeding the local service** — app_readme_local_node_service, app_readme_presentmon, app_readme_nvidia_smi, app_readme_players_online, app_readme_overwatch_feed [EXTRACTED 1.00]
- **Command Station onboarding and support docs** — start_here_start_here_guide, app_readme_command_station, app_docs_setup_setup_guide, app_docs_troubleshooting_troubleshooting_guide [EXTRACTED 1.00]
- **Redesign prototype dashboard panels** — design_command_station_redesign_frame_rate_tile, design_command_station_redesign_thermal_tiles, design_command_station_redesign_alerts_events_log, design_command_station_redesign_game_mode_panel, design_command_station_redesign_overwatch_feed_panel, design_command_station_redesign_stream_deck_panel [EXTRACTED 1.00]

## Communities (23 total, 4 thin omitted)

### Community 0 - "Dashboard App Shell"
Cohesion: 0.06
Nodes (56): App(), MODE_LABEL, StationApp(), Backdrop(), AlertsPanel(), FeedPanel(), GameModePanel(), GameModeProps (+48 more)

### Community 1 - "Feed Service (app)"
Cohesion: 0.08
Nodes (48): createFeed(), fetchText(), items(), refresh(), start(), sleep(), decodeEntities(), FrameWindow (+40 more)

### Community 2 - "Feed Service (portable copy)"
Cohesion: 0.07
Nodes (45): createFeed(), fetchText(), items(), refresh(), start(), sleep(), decodeEntities(), FrameWindow (+37 more)

### Community 3 - "Setup and Troubleshooting Docs"
Cohesion: 0.06
Nodes (48): LibreHardwareMonitor (CPU temperature, not used), PresentMon setup (admin rights, console build), Start Command Station.bat quick start, Setup guide, Tauri build toolchain (Rust, MSVC build tools), Journal recovery on service restart, Port conflict (8787 and 1420), PresentMon health states (missing, error, idle, live) (+40 more)

### Community 4 - "Config Loader (portable copy)"
Cohesion: 0.07
Nodes (40): DEFAULTS, isStr(), loadConfig(), readUserConfig(), strList(), createGameMode(), applyLocked(), describeProfiles() (+32 more)

### Community 5 - "Sidecar and Config (app)"
Cohesion: 0.06
Nodes (35): dest, outDir, root, DEFAULTS, isStr(), loadConfig(), readUserConfig(), strList() (+27 more)

### Community 6 - "Deck and Device Tiles"
Cohesion: 0.11
Nodes (27): DeckPanel(), Props, ART, DeviceProps, DeviceTile(), LoadTile(), Ticks(), UplinkTile() (+19 more)

### Community 7 - "Grid Layout"
Cohesion: 0.12
Nodes (23): react-grid-layout@^1.5.4, Dashboard(), Grid, Props, Box, BREAKPOINTS, CARD_IDS, CARD_NAMES (+15 more)

### Community 8 - "Tauri Config"
Cohesion: 0.10
Nodes (20): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+12 more)

### Community 9 - "Package Manifest"
Cohesion: 0.14
Nodes (19): devDependencies, @tauri-apps/cli@^2.5.0, @types/node@^24.19.2, @types/react@^18.3.12, @types/react-dom@^18.3.1, @types/react-grid-layout@^1.3.6, @types/topojson-specification@^1.0.5, typescript@^5.6.3 (+11 more)

### Community 10 - "TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 11 - "Runtime Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @fontsource/outfit@^5.1.0, react@^18.3.1, react-dom@^18.3.1, topojson-client@^3.1.0, @types/d3-geo@^3.1.1, @types/geojson@^7946.0.16, @types/topojson-client@^3.1.5 (+8 more)

### Community 12 - "Rust Desktop Shell"
Cohesion: 0.21
Nodes (5): kill_sidecar(), plain(), run(), Sidecar, start_service()

### Community 13 - "Players Map and Icons"
Cohesion: 0.22
Nodes (10): d3-geo@^3.1.2, Icon(), IconName, PATHS, CENTER, fmt(), hourLabel(), PlayersMap() (+2 more)

### Community 14 - "Game Mode Engine"
Cohesion: 0.31
Nodes (12): createGameMode(), applyLocked(), describeProfiles(), ensureOverwatch(), locked(), perform(), recoverIfNeeded(), restoreLocked() (+4 more)

### Community 15 - "npm Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, live, prepare:sidecar, preview, service, tauri (+1 more)

### Community 16 - "HTTP Server"
Cohesion: 0.33
Nodes (4): createServer(), DEFAULT_ORIGINS, readBody(), send()

### Community 17 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 18 - "Vite Build"
Cohesion: 0.40
Nodes (4): vite@^6.0.0, @vitejs/plugin-react@^4.3.4, vite, @vitejs/plugin-react

## Ambiguous Edges - Review These
- `Command Station (Windows Overwatch dashboard)` → `CPU and GPU temperature tiles with tick scale`  [AMBIGUOUS]
  design/command-station-redesign.html · relation: conceptually_related_to

## Knowledge Gaps
- **11 isolated node(s):** `command-station`, `Players online (Steam public API)`, `Edit layout (draggable card grid)`, `OBS scene switching (stub, not linked)`, `Browser version backup (localhost:1420)` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 171 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Dashboard App Shell` to `Deck and Device Tiles`, `Grid Layout`, `Package Manifest`, `Runtime Dependencies`, `Players Map and Icons`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createSensors()` (e.g. with `sample()` and `start()`) actually correct?**
  _`createSensors()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `command-station`, `Players online (Steam public API)`, `Edit layout (draggable card grid)` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.05747126436781609 - nodes in this community are weakly interconnected._
- **Why does `createGameMode()` connect `Game Mode Engine` to `Feed Service (app)`, `Sidecar and Config (app)`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createSensors()` (e.g. with `sample()` and `start()`) actually correct?**
  _`createSensors()` has 3 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Command Station (Windows Overwatch dashboard)` and `CPU and GPU temperature tiles with tick scale`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._