import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./paths.mjs";
import { killTree, spawnSafe } from "./spawn.mjs";

// Talks to Windows' own media session (the one the keyboard media keys use), so it
// works for Spotify and for anything else that is playing. No login, no key.
// One long-lived PowerShell reads a command per line and answers with one JSON line.
const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
# Windows PowerShell writes a redirected pipe in the OEM code page (Big5 on this PC).
# Node reads that pipe as UTF-8, so Traditional Chinese becomes U+FFFD unless this is UTF-8.
$csUtf8 = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $csUtf8
[Console]::OutputEncoding = $csUtf8
$OutputEncoding = $csUtf8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + "`" + String.raw`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$lastKey = ''

# Windows Action Center toasts (Discord, LINE and any other app) are read on this same helper, so the app runs one
# PowerShell instead of two (each costs about 75 MB). The list is only built and sent when it has changed.
$toastReady = $false
$granted = $false
$toastSig = ''
function Clip([string]$s) {
  if (-not $s) { return '' }
  $s = ($s -replace '[\r\n\t]+', ' ').Trim()
  if ($s.Length -gt 180) { return $s.Substring(0, 180) }
  return $s
}
function ToastJson($access, $items, $err) {
  $parts = foreach ($item in @($items)) { $item | ConvertTo-Json -Compress -Depth 4 }
  $e = if ($err) { $err | ConvertTo-Json -Compress } else { 'null' }
  return '{"toasts":true,"access":' + ($access | ConvertTo-Json -Compress) + ',"items":[' + ($parts -join ',') + '],"error":' + $e + '}'
}
function Toasts($force) {
  if (-not $script:toastReady) {
    $null = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType=WindowsRuntime]
    $null = [Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus, Windows.UI.Notifications, ContentType=WindowsRuntime]
    $null = [Windows.UI.Notifications.NotificationKinds, Windows.UI.Notifications, ContentType=WindowsRuntime]
    $null = [Windows.UI.Notifications.KnownNotificationBindings, Windows.UI.Notifications, ContentType=WindowsRuntime]
    $script:listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
    $script:listType = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]
    $script:toastReady = $true
  }
  if (-not $script:granted) {
    $access = Await ($script:listener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus])
    $name = $access.ToString().ToLower()
    $script:granted = ($name -eq 'allowed')
  } else { $name = 'allowed' }
  if ($name -ne 'allowed') {
    if (-not $force -and $name -eq $script:toastSig) { return '{"toasts":true,"unchanged":true}' }
    $script:toastSig = $name
    return (ToastJson $name @() $null)
  }
  $list = @(Await ($script:listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) $script:listType)
  $sig = 'allowed:' + ((@($list | ForEach-Object { [string]$_.Id })) -join ',')
  if (-not $force -and $sig -eq $script:toastSig) { return '{"toasts":true,"unchanged":true}' }
  $script:toastSig = $sig
  $items = foreach ($n in $list) {
    $app = ''
    try { $app = [string]$n.AppInfo.DisplayInfo.DisplayName } catch {}
    if (-not $app) { try { $app = [string]$n.AppInfo.AppUserModelId } catch {} }
    $texts = @()
    try {
      $binding = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
      if ($binding) { $texts = @($binding.GetTextElements() | ForEach-Object { Clip $_.Text } | Where-Object { $_ }) }
    } catch {}
    $title = if ($texts.Count -gt 0) { $texts[0] } else { '' }
    $body = if ($texts.Count -gt 1) { ($texts | Select-Object -Skip 1) -join ' ' } else { '' }
    if (-not $app -and -not $title -and -not $body) { continue }
    $ms = 0
    try { $ms = [int64]([DateTimeOffset]$n.CreationTime).ToUnixTimeMilliseconds() } catch { $ms = 0 }
    [pscustomobject]@{ id = ((Clip $app) + ':' + [string]$n.Id + ':' + $ms); app = (Clip $app); title = $title; body = $body; t = $ms }
  }
  $items = @($items | Sort-Object t -Descending | Select-Object -First 40)
  return (ToastJson 'allowed' $items $null)
}

while (($line = [Console]::In.ReadLine()) -ne $null) {
  $cmd = $line.Trim()
  if ($cmd -eq 'toasts' -or $cmd -eq 'toasts:force') {
    try { Write-Output (Toasts ($cmd -eq 'toasts:force')) }
    catch {
      $granted = $false
      $toastSig = ''
      Write-Output (ToastJson 'error' @() (Clip $_.Exception.Message))
    }
    continue
  }
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

export function createMedia(log, deps = {}) {
  const spawn = deps.spawnSafe ?? spawnSafe; // tests inject a fake spawner
  const writeScript = deps.writeScript ?? ((file) => fs.writeFileSync(file, SCRIPT, "utf8"));
  let child = null;
  const waiting = []; // FIFO of { resolve, timer }
  let artKey = "";
  let artData = null;
  let artVersion = 0;
  let stopped = false;
  // Consecutive commands that got no answer in time. A helper that stays silent is wedged, so it is replaced.
  let timeouts = 0;
  const MAX_TIMEOUTS = 3;

  /** Kills a wedged helper; the next command starts a fresh one. */
  function recycle() {
    log(`media helper stopped answering (${MAX_TIMEOUTS} timeouts in a row); restarting it`);
    const c = child;
    child = null;
    timeouts = 0;
    killTree(c, log);
    failWaiting();
  }

  /** Answers every waiting command with "" (no answer) so callers never hang on a dead helper. */
  function failWaiting() {
    while (waiting.length) {
      const w = waiting.shift();
      clearTimeout(w.timer);
      w.resolve("");
    }
  }

  function ensure() {
    if (child || stopped) return;
    const file = path.join(DATA_DIR, "media.ps1");
    writeScript(file);
    const c = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      log,
      "media helper",
    );
    if (!c) return;
    child = c;
    c.stdout.setEncoding("utf8");
    // The framing buffer belongs to this helper: a recycled helper's late bytes must never reach the next one.
    let buf = "";
    c.stdout.on("data", (d) => {
      if (child !== c) return;
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        timeouts = 0; // any answer, even a late one, proves the helper is alive
        const w = waiting.shift();
        if (w) {
          clearTimeout(w.timer);
          w.resolve(line);
        }
      }
    });
    c.stderr.on("data", () => {});
    // A write to a helper that has died is an EPIPE "error" on stdin; without a listener it would crash the service.
    c.stdin.on("error", (e) => {
      log(`media helper stdin: ${e.message}`);
      if (child === c) failWaiting();
    });
    const gone = () => {
      // A recycled helper exits after its replacement may already hold waiters: leave those alone.
      if (child !== c) return;
      child = null;
      failWaiting();
    };
    c.on("exit", gone);
    c.on("error", gone);
  }

  let chain = Promise.resolve();
  function send(cmd) {
    const job = chain.then(
      () =>
        new Promise((resolve) => {
          ensure();
          if (!child) return resolve("");
          // A timed-out waiter stays queued on purpose: the helper answers in order, so its late reply must land here.
          const w = {
            resolve,
            timer: setTimeout(() => {
              resolve("");
              if (++timeouts >= MAX_TIMEOUTS) recycle();
            }, 6000),
          };
          waiting.push(w);
          try {
            if (!child.stdin.writable) throw new Error("helper is not accepting commands");
            child.stdin.write(cmd + "\n");
          } catch (e) {
            log(`media helper write failed: ${e.message}`);
            failWaiting();
          }
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
    // Valid JSON that is not an object ("null", "1", "[]") would throw below.
    if (!d || typeof d !== "object" || Array.isArray(d)) return { available: false, error: "unreadable" };
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
    } else {
      // Drop album art when nothing is playing so the helper is not holding a large base64 string.
      artKey = "";
      artData = null;
    }
    return d;
  }

  /** One command whose answer is a plain JSON object (not a media reading), or null when there is no usable answer. */
  async function raw(cmd) {
    const out = await send(cmd);
    if (!out) return null;
    try {
      const d = JSON.parse(out);
      return d && typeof d === "object" && !Array.isArray(d) ? d : null;
    } catch {
      return null;
    }
  }

  return {
    status: () => command("status"),
    /** The Action Center toasts, read on this helper. `force` asks for the full list even if nothing changed. */
    toasts: (force = false) => raw(force ? "toasts:force" : "toasts"),
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
      killTree(child);
      child = null;
      failWaiting();
    },
  };
}
