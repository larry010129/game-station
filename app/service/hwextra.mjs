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

/** What this app costs while you play: the service, the desktop shell and its web view. */
export function createCost(log) {
  const cores = os.cpus().length || 1;
  let prev = null;
  let last = null;
  let busy = null;
  const SCRIPT = String.raw`
$all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name
$roots = @($all | Where-Object { $_.Name -eq 'command-station.exe' } | ForEach-Object { $_.ProcessId })
$ids = New-Object System.Collections.Generic.HashSet[int]
foreach ($r in $roots) { [void]$ids.Add([int]$r) }
$grew = $true
while ($grew) { $grew = $false; foreach ($p in $all) { if ($ids.Contains([int]$p.ParentProcessId) -and $ids.Add([int]$p.ProcessId)) { $grew = $true } } }
$rows = @()
if ($ids.Count) { $rows = @(Get-Process -Id @($ids) -ErrorAction SilentlyContinue | Select-Object Id, Name, @{n='cpu';e={[double]$_.CPU}}, @{n='mb';e={[int]($_.WorkingSet64/1MB)}}) }
ConvertTo-Json -Compress -Depth 3 @($rows)`;

  async function refresh() {
    const now = Date.now();
    const self = process.cpuUsage();
    const mem = process.memoryUsage();
    let shell = [];
    try {
      const out = await powershell(SCRIPT, { timeout: 10000 });
      const d = JSON.parse(out.trim() || "[]");
      shell = Array.isArray(d) ? d : [d];
    } catch (e) {
      log(`app cost: ${e.message}`);
    }
    const shellCpu = shell.reduce((a, p) => a + (p.cpu || 0), 0);
    let cpuPct = null;
    let svcPct = null;
    if (prev) {
      const dt = (now - prev.at) / 1000;
      if (dt > 0.5) {
        svcPct = ((self.user + self.system - prev.self) / 1e6 / dt / cores) * 100;
        if (shell.length) cpuPct = ((shellCpu - prev.shellCpu) / dt / cores) * 100;
      }
    }
    prev = { at: now, self: self.user + self.system, shellCpu };
    const shellMb = shell.reduce((a, p) => a + (p.mb || 0), 0);
    last = {
      at: now,
      service: { cpuPct: svcPct == null ? null : Math.max(0, +svcPct.toFixed(2)), mb: Math.round(mem.rss / 1048576) },
      shell: shell.length ? { cpuPct: cpuPct == null ? null : Math.max(0, +cpuPct.toFixed(2)), mb: shellMb, processes: shell.length } : null,
      budget: { cpuPct: 1, mb: 150 },
    };
  }

  return {
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
