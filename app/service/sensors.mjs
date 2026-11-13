import os from "node:os";
import { tcpMs as tcpMsReal } from "./netstats.mjs";
import { parseGateway, parseNvidiaLine, parsePingMs, parseTypeperfLine } from "./parsers.mjs";
import { run as runCmd, powershell as powershellCmd, isRunning as isRunningCmd } from "./system.mjs";
import { killTree, spawnSafe } from "./spawn.mjs";

/**
 * Reads this PC. Each source is optional: when one is missing its value stays
 * null and `notes` says why, so the dashboard never shows an invented number.
 */
export function createSensors(config, log, deps = {}) {
  // `deps` (tests only) swaps the child-process spawner and the system probes for fakes.
  const spawn = deps.spawnSafe ?? spawnSafe;
  const run = deps.run ?? runCmd;
  const powershell = deps.powershell ?? powershellCmd;
  const isRunning = deps.isRunning ?? isRunningCmd;
  const tcpMs = deps.tcpMs ?? tcpMsReal;
  const s = {
    gpu: { at: 0 },
    cpu: { at: 0, utility: null, performance: null },
    cpuTimes: null,
    ping: { region: null, router: null },
    battery: { pct: null, onAc: null },
    game: null,
    gateway: null,
    gpuName: null,
    slow: false,
    // Per-source health: "pending" | "live" | "unavailable". `detail` is a user-facing hint.
    sources: {
      nvidia: { state: "pending", detail: "" },
      typeperf: { state: "pending", detail: "" },
    },
  };
  const children = new Set();
  let gpuNameReady = Promise.resolve();
  const timers = new Set();
  let stopping = false;

  function every(fn, normalMs, slowMs = normalMs) {
    const pick = (ms) => (typeof ms === "function" ? ms() : ms);
    let handle;
    const loop = async () => {
      try {
        await fn();
      } catch (e) {
        log(`sensor poll failed: ${e.message}`);
      }
      if (!stopping) handle = setTimeout(loop, pick(s.slow ? slowMs : normalMs));
    };
    handle = setTimeout(loop, 0);
    timers.add({ clear: () => clearTimeout(handle) });
  }

  /**
   * A long-running child whose stdout is consumed line by line. If it dies it is
   * restarted with exponential backoff (5s .. 5min, reset after a healthy run).
   * A missing executable is reported once through `onMissing` and retried only
   * at the slowest backoff, so a PC without the tool never spams the log.
   */
  function stream(name, file, args, onLine, { restart = true, onMissing, onExit } = {}) {
    let delay = 5000;
    const MAX_DELAY = 5 * 60 * 1000;
    let missingReported = false;
    const schedule = () => {
      if (!restart || stopping) return;
      // Drop the entry when it fires, or every restart would leave a dead handle in the set for the life of the service.
      const entry = { clear: () => clearTimeout(t) };
      const t = setTimeout(() => {
        timers.delete(entry);
        start();
      }, delay);
      timers.add(entry);
      delay = Math.min(delay * 2, MAX_DELAY);
    };
    const start = () => {
      if (stopping) return null;
      const startedAt = Date.now();
      // spawnSafe keeps a start failure from becoming an uncaught exception. Its own logging is silenced
      // because the "error" handler below owns the message (a missing tool is reported only once).
      const child = spawn(file, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }, () => {}, name);
      if (!child) {
        log(`${name} could not start`);
        schedule();
        return null;
      }
      children.add(child);
      let buf = "";
      let failed = false;
      child.stdout.on("data", (d) => {
        buf += d.toString();
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          onLine(buf.slice(0, i).replace(/\r$/, ""));
          buf = buf.slice(i + 1);
        }
      });
      child.stderr.on("data", () => {});
      child.on("error", (e) => {
        failed = true;
        if (e.code === "ENOENT") {
          if (!missingReported) {
            missingReported = true;
            log(`${name} not found; its readings will show as unavailable`);
          }
          delay = MAX_DELAY;
          onMissing?.(e);
        } else {
          log(`${name} could not start: ${e.message}`);
        }
      });
      child.on("close", () => {
        children.delete(child);
        onExit?.(child);
        if (!failed && Date.now() - startedAt > 30000) delay = 5000;
        schedule();
      });
      return child;
    };
    return start();
  }

  function start() {
    // GPU: NVIDIA's own driver tool, one reading a second.
    gpuNameReady = run("nvidia-smi", ["--query-gpu=name", "--format=csv,noheader"])
      .then((n) => (s.gpuName = n.trim()))
      .catch(() => {});
    stream(
      "nvidia-smi",
      "nvidia-smi",
      ["--query-gpu=temperature.gpu,utilization.gpu,clocks.gr,power.draw", "--format=csv,noheader,nounits", "-l", "1"],
      (line) => {
        const g = parseNvidiaLine(line);
        if (g) {
          s.gpu = { ...g, at: Date.now() };
          s.sources.nvidia = { state: "live", detail: "" };
        }
      },
      {
        onMissing: () => (s.sources.nvidia = { state: "unavailable", detail: "nvidia-smi was not found. GPU readings need an NVIDIA GPU with its driver installed." }),
      },
    );

    // CPU load and clock: Windows performance counters.
    stream(
      "typeperf",
      "typeperf",
      ["\\Processor Information(_Total)\\% Processor Utility", "\\Processor Information(_Total)\\% Processor Performance", "-si", "1"],
      (line) => {
        const c = parseTypeperfLine(line);
        if (c) {
          s.cpu = { ...c, at: Date.now() };
          s.sources.typeperf = { state: "live", detail: "" };
        }
      },
      {
        onMissing: () => (s.sources.typeperf = { state: "unavailable", detail: "typeperf was not found, so CPU clock is unavailable and load uses a basic estimate." }),
      },
    );

    // Which game is running.
    every(async () => {
      let found = null;
      for (const g of config.games) {
        if (await isRunning(g)) {
          found = g;
          break;
        }
      }
      if (found !== s.game) {
        s.game = found;
        log(found ? `game started: ${found}` : "game closed");
      }
    }, 3000, 5000);

    // Network.
    every(async () => {
      if (!s.gateway) {
        try {
          s.gateway = parseGateway(await run("route", ["print", "-4", "0.0.0.0"]));
        } catch {
          // No route table available.
        }
      }
      if (s.gateway) {
        try {
          s.ping.router = parsePingMs(await run("ping", ["-n", "1", "-w", "1000", s.gateway]));
        } catch (e) {
          s.ping.router = parsePingMs(e.stdout ?? "");
        }
      }
      s.ping.region = await tcpMs(config.regionHost, 443, 2000);
    }, 5000, 15000);

    // Battery and charger.
    every(async () => {
      const out = await powershell(
        "$b=Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1; if($b){\"$($b.EstimatedChargeRemaining),$($b.BatteryStatus)\"}",
      );
      const m = /^(\d+),(\d+)/.exec(out.trim());
      if (m) {
        s.battery = { pct: Number(m[1]), onAc: [2, 3, 6, 7, 8, 9].includes(Number(m[2])) };
      }
    }, 30000, 60000);
  }

  function cpuLoadFallback() {
    const times = os.cpus().map((c) => c.times);
    const sum = (t) => t.user + t.nice + t.sys + t.idle + t.irq;
    let load = null;
    if (s.cpuTimes) {
      let total = 0;
      let idle = 0;
      times.forEach((t, i) => {
        const p = s.cpuTimes[i];
        total += sum(t) - sum(p);
        idle += t.idle - p.idle;
      });
      if (total > 0) load = Math.round((1 - idle / total) * 100);
    }
    s.cpuTimes = times;
    return load;
  }

  function sample() {
    const now = Date.now();
    const fresh = (at, ms = 5000) => now - at < ms;
    const cpuOk = fresh(s.cpu.at);
    const fallbackLoad = cpuOk ? null : cpuLoadFallback();
    if (cpuOk) s.cpuTimes = os.cpus().map((c) => c.times);
    return {
      t: now,
      gpuTemp: fresh(s.gpu.at) && s.gpu.temp != null ? Math.round(s.gpu.temp) : null,
      cpuLoad: cpuOk && s.cpu.utility != null ? Math.min(100, Math.round(s.cpu.utility)) : fallbackLoad,
      gpuLoad: fresh(s.gpu.at) ? s.gpu.load ?? null : null,
      pingRegionMs: s.ping.region,
      pingRouterMs: s.ping.router,
      batteryPct: s.battery.pct,
      onAc: s.battery.onAc,
      game: s.game,
    };
  }

  function stop() {
    stopping = true;
    timers.forEach((t) => t.clear());
    children.forEach((c) => killTree(c));
  }

  return {
    start,
    stop,
    sample,
    setSlow: (v) => (s.slow = v),
    state: s,
    /** Pending restart/poll timers (for tests). */
    timerCount: () => timers.size,
    machine: async () => {
      const cs = await powershell("$c=Get-CimInstance Win32_ComputerSystem; \"$($c.Manufacturer)|$($c.Model)\"").catch(() => "");
      await gpuNameReady; // nvidia-smi was started with the sensors; it is usually done by now
      const [maker = "", model = ""] = cs.trim().split("|");
      return machineName({ maker, model, cpuModel: os.cpus()[0]?.model, gpuName: s.gpuName, hostname: os.hostname() });
    },
  };
}

/** Removes `word` from the start of `text` when it is a whole leading word. Never builds a RegExp from outside text. */
function stripLeadingWord(text, word) {
  if (!word || !text.toLowerCase().startsWith(word.toLowerCase())) return text;
  const rest = text.slice(word.length);
  return /^\s/.test(rest) ? rest.trimStart() : text;
}

/** Friendly "ASUS TUF Gaming A16" style name plus short CPU and GPU names, from raw WMI / os / nvidia-smi strings. */
export function machineName(raw) {
  const [maker, model, cpuModel, gpuName, hostname] = [raw.maker, raw.model, raw.cpuModel, raw.gpuName, raw.hostname].map((v) => String(v ?? ""));
  const brand = maker.replace(/ASUSTeK COMPUTER INC\./i, "ASUS").replace(/\s*(Inc\.?|Corporation|Co\.?,? Ltd\.?)$/i, "").trim();
  const cleaned = model.replace(/\s+[A-Z0-9]+_[A-Z0-9]+$/, "").trim();
  const withoutBrand = stripLeadingWord(stripLeadingWord(cleaned, brand.split(/\s+/)[0]), "ASUS");
  const name = `${brand} ${withoutBrand}`.replace(/\s+/g, " ").trim();
  const cpu = cpuModel.replace(/\s+with .*$/i, "").replace(/^AMD |^Intel\(R\) Core\(TM\) /i, "").replace(/\s+/g, " ").trim();
  const gpu = gpuName.replace(/NVIDIA GeForce | Laptop GPU/g, "").trim();
  return { name: name || hostname, cpu: cpu || "CPU", gpu: gpu || "GPU" };
}
