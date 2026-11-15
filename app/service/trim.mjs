import v8 from "node:v8";
import vm from "node:vm";
import { powershell } from "./system.mjs";

// Finds this app's processes (the desktop shell, its web view, and this service) and hands their
// unused memory back to Windows. Only processes of this app are touched, and no administrator
// rights are needed. It reports the total working set before and after.
const SCRIPT = String.raw`
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class CsTrim {
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("psapi.dll")] static extern bool EmptyWorkingSet(IntPtr h);
  public static bool Trim(int pid) {
    IntPtr h = OpenProcess(0x0100 | 0x0400, false, pid); // set quota | query information
    if (h == IntPtr.Zero) return false;
    try { return EmptyWorkingSet(h); } finally { CloseHandle(h); }
  }
}
'@
$all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name
$ids = New-Object System.Collections.Generic.HashSet[int]
foreach ($r in @($all | Where-Object { $_.Name -eq 'command-station.exe' })) { [void]$ids.Add([int]$r.ProcessId) }
[void]$ids.Add([int]$PID_SELF)
$grew = $true
while ($grew) { $grew = $false; foreach ($p in $all) { if ($ids.Contains([int]$p.ParentProcessId) -and $p.ProcessId -ne $PID -and $ids.Add([int]$p.ProcessId)) { $grew = $true } } }
$ids.Remove([int]$PID) | Out-Null
function Total { [int]((Get-Process -Id @($ids) -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum / 1MB) }
$before = Total
$n = 0
foreach ($i in @($ids)) { if ([CsTrim]::Trim($i)) { $n++ } }
Start-Sleep -Milliseconds 400
$after = Total
ConvertTo-Json -Compress @{ beforeMb = $before; afterMb = $after; processes = $n }`;

/** Runs a garbage collection if the runtime can be asked to. Returns false when it cannot. */
export function collectGarbage() {
  try {
    v8.setFlagsFromString("--expose-gc");
    const gc = vm.runInNewContext("gc");
    gc();
    return true;
  } catch {
    return false;
  }
}

/**
 * Cleans up this app's memory: the service collects garbage, drops whatever it can rebuild (`release`
 * callbacks), then Windows takes back the unused memory of the shell, web view and service.
 * Resolves with { beforeMb, afterMb, freedMb, processes }.
 */
export function createTrim({ log, release = [], run = powershell, platform = process.platform, collect = collectGarbage }) {
  let running = null;
  async function trim() {
    for (const f of release) {
      try {
        f();
      } catch (e) {
        log(`trim: ${e.message}`);
      }
    }
    collect();
    if (platform !== "win32") {
      const mb = Math.round(process.memoryUsage().rss / 1048576);
      return { beforeMb: mb, afterMb: mb, freedMb: 0, processes: 0 };
    }
    const out = await run(SCRIPT.replace("$PID_SELF", String(process.pid)), { timeout: 20000 });
    const r = JSON.parse(String(out).trim());
    return { beforeMb: r.beforeMb, afterMb: r.afterMb, freedMb: Math.max(0, r.beforeMb - r.afterMb), processes: r.processes };
  }
  return {
    /** One run at a time: a second press while one is running gets the same result. */
    run() {
      running ??= trim().finally(() => (running = null));
      return running;
    },
  };
}
