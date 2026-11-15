import os from "node:os";
import { parseLhm } from "./parsers.mjs";
import { powershell } from "./system.mjs";

/**
 * CPU temperature. Windows does not expose it without a driver, so this reads
 * LibreHardwareMonitor's web server when it is running, and otherwise tries the
 * ACPI thermal zone (works on some laptops, usually only as administrator).
 */
export function createCpuTemp(config, log) {
  let last = { temp: null, source: null, at: 0, hint: null };
  let busy = null;

  async function fromLhm() {
    const res = await fetch(config.lhmUrl, { signal: AbortSignal.timeout(1200) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseLhm(await res.json());
  }

  async function fromAcpi() {
    const out = await powershell(
      "$t=Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -First 1; [math]::Round($t.CurrentTemperature/10-273.15)",
      { timeout: 6000 },
    );
    const n = Number(out.trim());
    return Number.isFinite(n) && n > 0 && n < 130 ? n : null;
  }

  async function refresh() {
    let temp = null;
    let source = null;
    try {
      temp = await fromLhm();
      if (temp != null) source = "LibreHardwareMonitor";
    } catch {
      // not running
    }
    if (temp == null) {
      try {
        temp = await fromAcpi();
        if (temp != null) source = "ACPI thermal zone";
      } catch {
        // needs admin or not supported
      }
    }
    last = {
      temp,
      source,
      at: Date.now(),
      hint: temp == null ? "Install LibreHardwareMonitor, run it as administrator and turn on Options > Remote Web Server." : null,
    };
  }

  return {
    async snapshot() {
      if (Date.now() - last.at > 4000) {
        busy ??= refresh()
          .catch((e) => log(`cpu temp: ${e.message}`))
          .finally(() => (busy = null));
        if (!last.at) await busy;
      }
      return { temp: last.temp, source: last.source, hint: last.hint, at: last.at };
    },
  };
}

const STANDING = new Set(["powershell", "nvidia-smi", "typeperf", "conhost"]);

/** What this app costs while you play: the service, the desktop shell and its web view. */
export function createCost(log) {
  const cores = os.cpus().length || 1;
  let prev = null;
  let last = null;
  let busy = null;
  // Two groups. "helper": everything this service started (its PowerShell helper, nvidia-smi, typeperf). "window": the
  // desktop shell and its web view, without the service itself. Memory is private bytes, which does not count the
  // pages that Chromium's processes share (working set counts them once per process and overstates the total).
  const makeScript = (servicePid) => String.raw`
$all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name
function Tree($roots) {
  $ids = New-Object System.Collections.Generic.HashSet[int]
  foreach ($r in $roots) { [void]$ids.Add([int]$r) }
  $grew = $true
  while ($grew) { $grew = $false; foreach ($p in $all) { if ($ids.Contains([int]$p.ParentProcessId) -and $ids.Add([int]$p.ProcessId)) { $grew = $true } } }
  return ,$ids
}
$svc = ${servicePid}
$helperIds = Tree @($svc)
[void]$helperIds.Remove($svc)
# This script runs in a PowerShell of its own (a child of the service): it is the measuring tape, not part of the cost.
[void]$helperIds.Remove([int]$PID)
foreach ($p in $all) { if ($p.ParentProcessId -eq $PID) { [void]$helperIds.Remove([int]$p.ProcessId) } }
$winRoots = @($all | Where-Object { $_.Name -eq 'command-station.exe' } | ForEach-Object { $_.ProcessId })
$winIds = if ($winRoots.Count) { Tree $winRoots } else { New-Object System.Collections.Generic.HashSet[int] }
[void]$winIds.Remove($svc)
foreach ($h in $helperIds) { [void]$winIds.Remove($h) }
$rows = @()
foreach ($set in @(@('helper', $helperIds), @('window', $winIds))) {
  if ($set[1].Count) { $rows += @(Get-Process -Id @($set[1]) -ErrorAction SilentlyContinue | Select-Object Id, Name, @{n="role";e={$set[0]}}, @{n='cpu';e={[double]$_.CPU}}, @{n='mb';e={[int]($_.PrivateMemorySize64/1MB)}}, @{n='age';e={ try { [int]((Get-Date) - $_.StartTime).TotalSeconds } catch { 9999 } }}) }
}
ConvertTo-Json -Compress -Depth 3 @($rows)`;

  async function refresh() {
    const now = Date.now();
    const self = process.cpuUsage();
    const mem = process.memoryUsage();
    let rows = [];
    try {
      const out = await powershell(makeScript(process.pid), { timeout: 10000 });
      const d = JSON.parse(out.trim() || "[]");
      rows = Array.isArray(d) ? d : [d];
    } catch (e) {
      log(`app cost: ${e.message}`);
    }
    if (process.env.CS_DEBUG_COST) log(`app cost rows: ${JSON.stringify(rows)}`);
    // Only the standing helpers (the PowerShell helper, nvidia-smi, typeperf and their consoles), and only once they have been
    // alive a while. The service also starts short PowerShell jobs and, now and then, an AI CLI for the leak check; counting
    // one of those while it runs would make the figure jump by hundreds of MB.
    const helpers = rows.filter((p) => p.role === "helper" && STANDING.has(String(p.Name).toLowerCase()) && (p.age ?? 9999) >= 20);
    const shell = rows.filter((p) => p.role === "window");
    const sum = (list, k) => list.reduce((a, p) => a + (p[k] || 0), 0);
    const shellCpu = sum(shell, "cpu");
    const helperCpu = sum(helpers, "cpu");
    let cpuPct = null;
    let svcPct = null;
    if (prev) {
      const dt = (now - prev.at) / 1000;
      if (dt > 0.5) {
        // The service's own time plus its helpers': the PowerShell helper is part of what the service costs.
        svcPct = ((self.user + self.system - prev.self) / 1e6 / dt / cores) * 100 + ((helperCpu - prev.helperCpu) / dt / cores) * 100;
        if (shell.length) cpuPct = ((shellCpu - prev.shellCpu) / dt / cores) * 100;
      }
    }
    prev = { at: now, self: self.user + self.system, shellCpu, helperCpu };
    last = {
      at: now,
      // Memory of the service is its own (resident) plus its helpers' private memory.
      service: { cpuPct: svcPct == null ? null : Math.max(0, +svcPct.toFixed(2)), mb: Math.round(mem.rss / 1048576) + sum(helpers, "mb") },
      shell: shell.length ? { cpuPct: cpuPct == null ? null : Math.max(0, +cpuPct.toFixed(2)), mb: sum(shell, "mb"), processes: shell.length } : null,
      // CPU: service, helpers and window together. Memory: the service and its helpers only; the window is a Chromium
      // web view (a few hundred MB on its own), shown for reference and not held to this number.
      budget: { cpuPct: 1, mb: 200 },
    };
  }

  return {
    /** Forget the last reading so the next one is measured fresh (after a memory clean-up). */
    invalidate() {
      if (last) last = { ...last, at: 0 };
    },
    async snapshot() {
      // Walking every process is the heaviest poll in the service, so it is refreshed at most every 15 s.
      if (!last || Date.now() - last.at > 15_000) {
        busy ??= refresh().finally(() => (busy = null));
        if (!last) await busy;
      }
      return last;
    },
  };
}
