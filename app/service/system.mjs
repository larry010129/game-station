import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseSteamManifest, parseVdfLibraries } from "./parsers.mjs";

/** Runs a program with no shell. Resolves with stdout; rejects with stderr on a non-zero exit. */
export function run(file, args = [], { timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024, encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else resolve(stdout);
    });
  });
}

// Windows PowerShell 5 writes a pipe in the OEM code page (Big5 here). Node reads UTF-8.
const UTF8_OUT =
  "$csUtf8 = New-Object System.Text.UTF8Encoding $false; [Console]::InputEncoding = $csUtf8; [Console]::OutputEncoding = $csUtf8; $OutputEncoding = $csUtf8; ";

export function powershell(script, opts) {
  return run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", UTF8_OUT + script], opts);
}

const GUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const OVERLAY_TYPE = `
using System; using System.Runtime.InteropServices;
public static class CsPower {
  [DllImport("powrprof.dll")] public static extern uint PowerGetEffectiveOverlayScheme(out Guid g);
  [DllImport("powrprof.dll")] public static extern uint PowerSetActiveOverlayScheme(Guid g);
}`;

export const OVERLAYS = {
  "00000000-0000-0000-0000-000000000000": "Balanced",
  "961cc777-2547-4f9d-8174-7d86181b8a7a": "Best power efficiency",
  "3af9b8d9-7c97-431d-ad78-34a8bfea439f": "Better performance",
  "ded574b5-45a0-4f42-8737-46345c09c238": "Best performance",
};
export const BEST_PERFORMANCE = "ded574b5-45a0-4f42-8737-46345c09c238";

/**
 * Compiling the C# type costs about a second per PowerShell start. The first
 * call compiles it to a small DLL in %TEMP%; later calls just load that DLL.
 * If the DLL cannot be written or loaded, it falls back to compiling in memory.
 */
const OVERLAY_PRELUDE = `$src=@'
${OVERLAY_TYPE}
'@
$d=Join-Path $env:TEMP 'command-station-power-v1.dll'
$ok=$false
try{Add-Type -Path $d -ErrorAction Stop;$ok=$true}catch{}
if(-not $ok){try{Add-Type -TypeDefinition $src -OutputAssembly $d -ErrorAction Stop;Add-Type -Path $d -ErrorAction Stop;$ok=$true}catch{}}
if(-not $ok){Add-Type -TypeDefinition $src}
`;

/** The Windows "power mode" slider: Settings > System > Power. */
export async function getPowerOverlay() {
  const out = await powershell(
    `${OVERLAY_PRELUDE}$g=[Guid]::Empty; [void][CsPower]::PowerGetEffectiveOverlayScheme([ref]$g); $g.ToString()`,
  );
  return out.trim().toLowerCase();
}

/** Windows answered the set call with a non-zero code: it ran and changed nothing. Any other failure (timeout, kill) is unverified. */
export class PowerRefusedError extends Error {
  constructor(code) {
    super(`Windows refused the power mode change (code ${code})`);
    this.name = "PowerRefusedError";
    this.code = "POWER_REFUSED";
  }
}

export async function setPowerOverlay(guid) {
  if (!GUID.test(guid)) throw new Error("Not a power mode id");
  const out = await powershell(`${OVERLAY_PRELUDE}[CsPower]::PowerSetActiveOverlayScheme([Guid]'${guid}')`);
  const code = out.trim();
  if (code === "0") return;
  // Only a numeric Windows result code proves the call ran and was refused; anything else (empty, garbled) is unverified.
  if (/^\d+$/.test(code)) throw new PowerRefusedError(code);
  throw new Error(`The power mode change gave an unreadable answer (${code.slice(0, 80) || "no output"})`);
}

const GPU_KEY = "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences";
export const GPU_WORDS = { 0: "Let Windows decide", 1: "Power saving", 2: "High performance" };

/**
 * The per-app graphics setting, the same one as Settings > System > Display > Graphics.
 * Returns null only when the value is genuinely absent (reg exit code 1); any other
 * failure throws, so a failed read is never mistaken for "no previous value".
 */
export async function getGpuPreference(exe) {
  let out;
  try {
    out = await run("reg", ["query", GPU_KEY, "/v", exe]);
  } catch (e) {
    if (e?.code === 1) return null;
    throw e;
  }
  const line = out.split(/\r?\n/).find((l) => /REG_SZ/.test(l));
  return line ? line.replace(/^\s*.*?\s+REG_SZ\s+/, "") : null;
}

/** A null value deletes the setting; anything else is written exactly as given. */
export async function setGpuPreference(exe, value) {
  if (value == null) {
    try {
      await run("reg", ["delete", GPU_KEY, "/v", exe, "/f"]);
    } catch (e) {
      if (e?.code !== 1) throw e; // exit code 1: already absent
    }
  } else {
    await run("reg", ["add", GPU_KEY, "/v", exe, "/t", "REG_SZ", "/d", value, "/f"]);
  }
}

export function gpuWord(value) {
  const m = /GpuPreference=(\d)/.exec(value ?? "");
  return GPU_WORDS[m ? Number(m[1]) : 0] ?? "Let Windows decide";
}

/** Process image names that game mode will never close, whatever the config says. */
const NEVER_CLOSE =
  /^(system|idle|registry|smss|csrss|wininit|winlogon|services|lsass|svchost|dwm|explorer|fontdrvhost|sihost|taskhostw|ctfmon|searchhost|startmenuexperiencehost|shellexperiencehost|runtimebroker|audiodg|msmpeng|nissrv|securityhealthservice|steam|steamwebhelper|battle\.net|agent|overwatch|easyanticheat.*|battleye.*|vgc|vanguard.*|faceit.*|esea.*|nvcontainer|nvdisplay\.container|command-station|node|powershell|cmd|conhost|claude)$/i;

export function isProtected(name) {
  return NEVER_CLOSE.test(name.replace(/\.exe$/i, ""));
}

export function validProcessName(name) {
  return /^[A-Za-z0-9][\w .-]{0,60}$/.test(name);
}

/** Running processes by image name, with their executable path when readable. */
export async function findProcesses(names) {
  const safe = names.filter(validProcessName).filter((n) => !isProtected(n));
  if (!safe.length) return [];
  const list = safe.map((n) => `'${n.replace(/\.exe$/i, "")}'`).join(",");
  const out = await powershell(
    `$p=Get-Process -Name ${list} -ErrorAction SilentlyContinue | Select-Object Name,Path; if($p){ConvertTo-Json -Compress @($p)}else{'[]'}`,
  );
  try {
    return JSON.parse(out.trim() || "[]");
  } catch {
    return [];
  }
}

/** Graceful close request, the same as clicking the window's close button. Never a force kill. */
export async function closePolitely(name) {
  try {
    await run("taskkill", ["/IM", `${name.replace(/\.exe$/i, "")}.exe`]);
    return true;
  } catch {
    return false;
  }
}

const PRIORITIES = ["Idle", "BelowNormal", "Normal", "AboveNormal", "High"];

/** The Windows priority class of a running program (the first copy), or null when it is not running. */
export async function getProcessPriority(imageName) {
  if (!validProcessName(imageName)) return null;
  const name = imageName.replace(/\.exe$/i, "");
  const out = await powershell(`$p=Get-Process -Name '${name}' -ErrorAction SilentlyContinue | Select-Object -First 1; if($p){$p.PriorityClass.ToString()}`);
  const v = out.trim();
  return PRIORITIES.includes(v) ? v : null;
}

/** Sets a running program's priority class. Only the listed classes are allowed; Realtime never is. */
export async function setProcessPriority(imageName, level) {
  if (!validProcessName(imageName) || !PRIORITIES.includes(level)) throw new Error("Invalid priority request");
  const name = imageName.replace(/\.exe$/i, "");
  await powershell(`Get-Process -Name '${name}' -ErrorAction Stop | ForEach-Object { $_.PriorityClass = '${level}' }`);
}

export async function isRunning(imageName) {
  try {
    const out = await run("tasklist", ["/FI", `IMAGENAME eq ${imageName}`, "/FO", "CSV", "/NH"]);
    return out.toLowerCase().includes(imageName.toLowerCase());
  } catch {
    return false;
  }
}

/** Steam's install folder and every `steamapps` directory of its libraries. null when Steam is not installed. */
export async function steamLibraries() {
  try {
    const out = await run("reg", ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"]);
    const root = /SteamPath\s+REG_SZ\s+(.+)/.exec(out)?.[1]?.trim().replace(/\//g, "\\");
    if (!root) return null;
    const libs = new Set([root]);
    const vdf = path.join(root, "steamapps", "libraryfolders.vdf");
    if (fs.existsSync(vdf)) parseVdfLibraries(fs.readFileSync(vdf, "utf8")).forEach((l) => libs.add(l));
    // Steam can list one library under two spellings; the caller de-duplicates games by app id.
    const dirs = [...libs].map((l) => path.join(l, "steamapps")).filter((d) => fs.existsSync(d));
    return { root, dirs };
  } catch {
    return null; // Steam not installed
  }
}

/** Finds the Steam install of Overwatch: executable path and Steam app id. */
export async function detectOverwatch() {
  const steam = await steamLibraries();
  if (!steam) return null;
  try {
    for (const apps of steam.dirs) {
      for (const f of fs.readdirSync(apps)) {
        if (!/^appmanifest_\d+\.acf$/.test(f)) continue;
        const m = parseSteamManifest(fs.readFileSync(path.join(apps, f), "utf8"));
        if (!m) continue;
        const exe = path.join(apps, "common", m.installDir, "Overwatch.exe");
        if (fs.existsSync(exe)) return { exe, appId: m.appId };
      }
    }
  } catch {
    // unreadable library folder
  }
  return null;
}
