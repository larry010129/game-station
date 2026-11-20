# Exe updates (update type 2)

Two kinds of update:

| Type | What | Who | How it reaches players |
|---|---|---|---|
| 1. Content | odds, prices, themes, banners, notes | you, in the web CMS (Publish) | Cloudflare release host, popup "Version 1.n", Reload |
| 2. Exe | screens, logic, fixes (app code) | you, build a new exe | GitHub Releases, forced popup, downloads, installs, restarts |

Type 2 is **in-game only**: no manual download path. Restart is forced.

**Type 2 only moves on a MAJOR version** (1.x -> 2.x). A newer minor or patch exe on GitHub is ignored by the app; those changes ship as content releases (type 1). Shown version = `<exe major>.<release number>`, for example exe 1.0.0 + release 5 = `1.5`.

## What the app does

1. At start (installed app only, not a browser) it reads
   `https://github.com/larry010129/game-station/releases/latest/download/latest.json`.
2. `latest.version` has a higher **major** than the running exe (1.x -> 2.x)? A popup opens that cannot be closed (Escape and Tab are held).
3. It downloads the installer (about 25 MB), checks the signature against the public key in `tauri.conf.json`,
   installs (passive mode) and restarts itself.
4. The download fails? The popup stays with **Retry**. The check itself fails (offline)? Nothing blocks: the app runs on
   the current exe.

Content releases can name the oldest exe they work with: `manifest.minAppVersion` (only its major counts, e.g. `"2.0"`).
An exe with a lower major does **not** apply that release; it updates itself first (type 2), then comes back for the content.

Code: `src/content/exeUpdate.ts` (rules and state machine), `src/state/useExeUpdate.ts`, popup in
`src/components/UpdateGate.tsx`, content check in `src/content/updateContent.ts`, Rust plugins in `src-tauri/src/lib.rs`.

## Keys (do once)

- Private key: `C:\Users\e1253\.tauri\command-station-updater.key` (no password). **Never commit it, never share it.**
  Lose it = installed apps can never update again (they only trust the matching public key).
- Public key: inside `src-tauri/tauri.conf.json` -> `plugins.updater.pubkey`. Safe to publish.
- This key is not the content-release key (that one signs Cloudflare releases).

## Ship a new exe

```powershell
# 1. Major bump only (e.g. 1.0.0 -> 2.0.0), same version in all three
#    src-tauri/tauri.conf.json  "version"
#    package.json               "version"  (and package-lock.json)
#    src-tauri/Cargo.toml       version
# 2. Build, signed
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\Users\e1253\.tauri\command-station-updater.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npm run tauri build
# 3. Make latest.json and list the files to upload
npm run release:exe -- "What changed"
```

Then on GitHub (`larry010129/game-station`): Releases -> Draft a new release -> tag `v2.0.0` -> upload the three files
the script printed (installer, `.sig`, `latest.json`) -> Publish. The release must be the **latest** one (not a pre-release),
and the repo must stay **public**.

`release:exe` stops with a message if the three versions differ or the build was not signed.

## Check it works

1. Install the old exe, publish a newer release, open the old exe: the popup shows, downloads, restarts on the new version.
2. Turn off the network and open the exe: no popup, the app runs.
3. Tests: `npm run test:service` (`service/test/exe-update.test.mjs` covers versions and the state machine).

## Notes

- Windows may warn (SmartScreen) because the exe is not code-signed. A code-signing certificate fixes that (paid, later).
- Updating restarts the app and its Node service; nothing else is touched. Player data stays in the browser storage of the app.
- The updater downloads from GitHub's CDN, so the app's web security list (`connect-src`) does not need GitHub.
