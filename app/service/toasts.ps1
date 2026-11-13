# Prints one JSON line of the toasts currently in Windows Action Center.
# Text only: app name, title, and message. No launch arguments.
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType=WindowsRuntime]
$null = [Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus, Windows.UI.Notifications, ContentType=WindowsRuntime]
$null = [Windows.UI.Notifications.NotificationKinds, Windows.UI.Notifications, ContentType=WindowsRuntime]
$null = [Windows.UI.Notifications.KnownNotificationBindings, Windows.UI.Notifications, ContentType=WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
}) | Select-Object -First 1

function Await-WinRt($op, $resultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($resultType)
  $netTask = $asTask.Invoke($null, @($op))
  $netTask.Wait(-1) | Out-Null
  return $netTask.Result
}

function Clip([string]$s) {
  if (-not $s) { return "" }
  $s = $s -replace "[\r\n\t]+", " "
  $s = $s.Trim()
  if ($s.Length -gt 180) { return $s.Substring(0, 180) }
  return $s
}

function Emit($access, $items, $error) {
  $parts = foreach ($item in @($items)) { $item | ConvertTo-Json -Compress -Depth 4 }
  $err = if ($error) { $error | ConvertTo-Json -Compress } else { "null" }
  $json = '{"access":' + ($access | ConvertTo-Json -Compress) + ',"items":[' + ($parts -join ",") + '],"error":' + $err + '}'
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

$listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
$listType = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]

while ($true) {
  try {
    $access = Await-WinRt ($listener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus])
    $name = $access.ToString().ToLower()
    if ($name -ne "allowed") {
      Emit $name @() $null
    } else {
      $list = @(Await-WinRt ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) $listType)
      $items = foreach ($n in $list) {
        $app = ""
        try { $app = [string]$n.AppInfo.DisplayInfo.DisplayName } catch {}
        if (-not $app) {
          try { $app = [string]$n.AppInfo.AppUserModelId } catch {}
        }
        $texts = @()
        try {
          $binding = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
          if ($binding) { $texts = @($binding.GetTextElements() | ForEach-Object { Clip $_.Text } | Where-Object { $_ }) }
        } catch {}
        $title = if ($texts.Count -gt 0) { $texts[0] } else { "" }
        $body = if ($texts.Count -gt 1) { ($texts | Select-Object -Skip 1) -join " " } else { "" }
        if (-not $app -and -not $title -and -not $body) { continue }
        $ms = 0
        try { $ms = [int64]([DateTimeOffset]$n.CreationTime).ToUnixTimeMilliseconds() } catch { $ms = 0 }
        [pscustomobject]@{ id = ((Clip $app) + ":" + [string]$n.Id + ":" + $ms); app = (Clip $app); title = $title; body = $body; t = $ms }
      }
      $items = @($items | Sort-Object t -Descending | Select-Object -First 40)
      Emit "allowed" $items $null
    }
  } catch {
    Emit "error" @() (Clip $_.Exception.Message)
  }
  Start-Sleep -Seconds 4
}
