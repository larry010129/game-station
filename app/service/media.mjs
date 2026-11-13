import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./paths.mjs";

// Talks to Windows' own media session (the one the keyboard media keys use), so it
// works for Spotify and for anything else that is playing. No login, no key.
// One long-lived PowerShell reads a command per line and answers with one JSON line.
const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + "`" + String.raw`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$lastKey = ''
while (($line = [Console]::In.ReadLine()) -ne $null) {
  $cmd = $line.Trim()
  try {
    $s = $mgr.GetCurrentSession()
    if (-not $s) { Write-Output '{"available":false}'; continue }
    if ($cmd -eq 'playpause') { Await ($s.TryTogglePlayPauseAsync()) ([bool]) | Out-Null }
    elseif ($cmd -eq 'next') { Await ($s.TrySkipNextAsync()) ([bool]) | Out-Null }
    elseif ($cmd -eq 'previous') { Await ($s.TrySkipPreviousAsync()) ([bool]) | Out-Null }
    elseif ($cmd -like 'seek:*') { $ms = [double]($cmd.Substring(5)); Await ($s.TryChangePlaybackPositionAsync([long]($ms * 10000))) ([bool]) | Out-Null }
    $p = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $pb = $s.GetPlaybackInfo()
    $tl = $s.GetTimelineProperties()
    $key = "$($p.Artist)|$($p.Title)|$($p.AlbumTitle)"
    $art = $null
    if ($key -ne $lastKey) {
      $lastKey = $key
      try {
        if ($p.Thumbnail) {
          $st = Await ($p.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
          $asRead = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1
          $net = $asRead.Invoke($null, @($st))
          $ms2 = New-Object System.IO.MemoryStream
          $net.CopyTo($ms2)
          $bytes = $ms2.ToArray()
          $art = 'data:' + $st.ContentType + ';base64,' + [Convert]::ToBase64String($bytes)
        }
      } catch { $artErr = $_.Exception.Message }
    }
    $o = [ordered]@{
      available = $true
      app = $s.SourceAppUserModelId
      title = $p.Title
      artist = $p.Artist
      album = $p.AlbumTitle
      status = [int]$pb.PlaybackStatus
      positionMs = [int64]$tl.Position.TotalMilliseconds
      durationMs = [int64]($tl.EndTime.TotalMilliseconds - $tl.StartTime.TotalMilliseconds)
      key = $key
      art = $art
      artErr = $artErr
    }
    Write-Output ($o | ConvertTo-Json -Compress)
  } catch {
    Write-Output ('{"available":false,"error":' + (($_.Exception.Message) | ConvertTo-Json -Compress) + '}')
  }
}
`;

const ACTIONS = new Set(["status", "playpause", "next", "previous"]);

export function createMedia(log) {
  let child = null;
  let buf = "";
  const waiting = []; // FIFO of { resolve, timer }
  let artKey = "";
  let artData = null;
  let artVersion = 0;
  let stopped = false;

  function ensure() {
    if (child || stopped) return;
    const file = path.join(DATA_DIR, "media.ps1");
    fs.writeFileSync(file, SCRIPT, "utf8");
    child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        const w = waiting.shift();
        if (w) {
          clearTimeout(w.timer);
          w.resolve(line);
        }
      }
    });
    child.stderr.on("data", () => {});
    child.on("exit", () => {
      child = null;
      buf = "";
      while (waiting.length) {
        const w = waiting.shift();
        clearTimeout(w.timer);
        w.resolve("");
      }
    });
    child.on("error", (e) => {
      log(`media helper failed: ${e.message}`);
      child = null;
    });
  }

  let chain = Promise.resolve();
  function send(cmd) {
    const job = chain.then(
      () =>
        new Promise((resolve) => {
          ensure();
          if (!child) return resolve("");
          const w = { resolve, timer: setTimeout(() => resolve(""), 6000) };
          waiting.push(w);
          child.stdin.write(cmd + "\n");
        }),
    );
    chain = job.catch(() => {});
    return job;
  }

  async function command(cmd) {
    const raw = await send(cmd);
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      return { available: false, error: raw ? "unreadable" : "no answer" };
    }
    if (d.available) {
      if (d.art) {
        artKey = d.key;
        artData = d.art.replace(/^data:;base64,(iVBOR)?/, (m, png) => (png ? "data:image/png;base64,iVBOR" : "data:image/jpeg;base64,"));
        artVersion += 1;
      }
      // The picture is large, so it is served separately and only re-fetched when artId changes.
      delete d.art;
      delete d.artErr;
      d.artId = d.key === artKey && artData ? artVersion : 0;
      d.playing = d.status === 4;
      delete d.key;
    }
    return d;
  }

  return {
    status: () => command("status"),
    art: () => ({ art: artData }),
    control(action, ms) {
      if (action === "seek") {
        const n = Number(ms);
        if (!Number.isFinite(n) || n < 0 || n > 24 * 3600_000) throw Object.assign(new Error("Bad seek position"), { status: 400 });
        return command(`seek:${Math.round(n)}`);
      }
      if (!ACTIONS.has(action) || action === "status") throw Object.assign(new Error("Unknown media action"), { status: 400 });
      return command(action);
    },
    stop() {
      stopped = true;
      try {
        child?.kill();
      } catch {
        // already gone
      }
    },
  };
}
