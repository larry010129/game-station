import os from "node:os";
import { powershell } from "./system.mjs";

// One PowerShell call gathers the top memory users and the battery's charge rate.
const SCRIPT = String.raw`
$top = Get-Process | Group-Object ProcessName | ForEach-Object { [pscustomobject]@{ n = $_.Name; mb = [int](($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1MB) } } | Sort-Object mb -Descending | Select-Object -First 6
$bs = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1
$b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
$o = [ordered]@{
  top = @($top)
  battery = if ($b) { [ordered]@{ pct = $b.EstimatedChargeRemaining; status = $b.BatteryStatus; minutes = $b.EstimatedRunTime;
    chargeMw = if ($bs) { $bs.ChargeRate } else { $null }; dischargeMw = if ($bs) { $bs.DischargeRate } else { $null };
    online = if ($bs) { $bs.PowerOnline } else { $null }; charging = if ($bs) { $bs.Charging } else { $null }; discharging = if ($bs) { $bs.Discharging } else { $null } } } else { $null }
}
$o | ConvertTo-Json -Compress -Depth 4
`;

/** Memory and power details, refreshed at most every 10 seconds and only when a card asks. */
export function createSysStats(log) {
  let slow = { top: [], battery: null, at: 0 };
  let refreshing = false;

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const out = await powershell(SCRIPT, { timeout: 12000 });
      const d = JSON.parse(out);
      slow = { top: Array.isArray(d.top) ? d.top : d.top ? [d.top] : [], battery: d.battery ? { ...d.battery, minutes: d.battery.minutes > 100000 ? null : d.battery.minutes } : null, at: Date.now() };
    } catch (e) {
      log(`system stats: ${e.message}`);
      slow.at = Date.now();
    } finally {
      refreshing = false;
    }
  }

  return {
    async snapshot() {
      if (Date.now() - slow.at > 10_000) {
        // First call waits so the card has something to show; later calls return the last reading.
        const p = refresh();
        if (!slow.at) await p;
      }
      const total = os.totalmem();
      const free = os.freemem();
      return {
        mem: { totalMb: Math.round(total / 1048576), usedMb: Math.round((total - free) / 1048576), top: slow.top },
        battery: slow.battery,
      };
    },
  };
}
