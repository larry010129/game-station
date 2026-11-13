import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import { FrameWindow, PresentMonParser, parseGateway, parseNvidiaLine, parsePingMs, parseTypeperfLine } from "./parsers.mjs";
import { run, powershell, isRunning } from "./system.mjs";

const PRESENTMON_CANDIDATES = [
  "C:\\Program Files\\PresentMon\\PresentMon.exe",
  "C:\\Program Files\\Intel\\PresentMon\\PresentMon.exe",
  `${process.env.LOCALAPPDATA ?? ""}\\Programs\\PresentMon\\PresentMon.exe`,
];

/**
 * Reads this PC. Each source is optional: when one is missing its value stays
 * null and `notes` says why, so the dashboard never shows an invented number.
 */
export function createSensors(config, log) {
  const s = {
    gpu: { at: 0 },
    cpu: { at: 0, utility: null, performance: null },
    cpuTimes: null,
    ping: { region: null, router: null },
    battery: { pct: null, onAc: null },
    game: null,
    gateway: null,
    frames: new FrameWindow(),
    presentMon: { path: null, state: "missing", detail: "" },
    gpuName: null,
    slow: false,
    // Per-source health: "pending" | "live" | "unavailable". `detail` is a user-facing hint.
    sources: {
      nvidia: { state: "pending", detail: "" },
      typeperf: { state: "pending", detail: "" },
    },
  };
  const children = new Set();
  const timers = new Set();
  let stopping = false;

  const presentMonPath = [config.presentMonPath, ...PRESENTMON_CANDIDATES].find((p) => p && fs.existsSync(p)) ?? null;
  s.presentMon.path = presentMonPath;
  s.presentMon.state = presentMonPath ? "idle" : "missing";

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
    const start = () => {
      if (stopping) return null;
      const startedAt = Date.now();
      const child = spawn(file, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
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
        if (restart && !stopping) {
          const t = setTimeout(start, delay);
          timers.add({ clear: () => clearTimeout(t) });
          delay = Math.min(delay * 2, MAX_DELAY);
        }
      });
      return child;
    };
    return start();
  }

  function start() {
    // GPU: NVIDIA's own driver tool, one reading a second.
    run("nvidia-smi", ["--query-gpu=name", "--format=csv,noheader"])
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

    // Which game is running. PresentMon is not started: FPS cards were removed.
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
      s.ping.region = await tcpConnectMs(config.regionHost, 443);
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

  const PM_ADMIN_HINT = "PresentMon needs to run as administrator, or your account must be in the 'Performance Log Users' group.";
  const PM_ACCESS = /access|denied|administrator|performance log|privilege|elevat/i;

  function startPresentMon(game) {
    if (!s.presentMon.path) return;
    stopPresentMon();
    s.presentMon = { ...s.presentMon, state: "starting", detail: "" };
    const parser = new PresentMonParser();
    const args = config.presentMonArgs.map((a) => a.replace("{process}", game));
    let sawFrame = false;
    let child = null;
    const current = () => child && s.presentMonChild === child;
    const fail = (text) => {
      const detail = PM_ACCESS.test(text) ? PM_ADMIN_HINT : text.slice(0, 140);
      s.presentMon = { ...s.presentMon, state: "error", detail };
    };
    child = stream(
      "PresentMon",
      s.presentMon.path,
      args,
      (line) => {
        if (!current()) return;
        const ms = parser.line(line);
        if (ms != null) {
          if (!sawFrame) {
            sawFrame = true;
            s.presentMon = { ...s.presentMon, state: "live", detail: "" };
          }
          s.frames.push(ms);
        } else if (parser.index < 0 && /error|access|denied|administrator|performance log/i.test(line)) {
          fail(line);
        }
      },
      {
        restart: false,
        onMissing: () => {
          if (current()) s.presentMon = { ...s.presentMon, state: "missing", detail: "" };
        },
        onExit: (c) => {
          // Exited by itself (not via stopPresentMon): keep "error" if set, else go idle.
          if (s.presentMonChild === c) {
            s.presentMonChild = null;
            if (s.presentMon.state !== "error") s.presentMon = { ...s.presentMon, state: "idle", detail: "" };
          }
        },
      },
    );
    if (!child) return;
    child.stderr.on("data", (d) => {
      const text = d.toString().trim().split(/\r?\n/)[0];
      if (current() && text) fail(text);
    });
    s.presentMonChild = child;
  }

  function stopPresentMon() {
    const c = s.presentMonChild;
    s.presentMonChild = null; // detach first so late output from the dying child is ignored
    if (c && c.exitCode == null && !c.killed) {
      try {
        c.kill();
      } catch {
        // Already gone.
      }
    }
    s.presentMon = { ...s.presentMon, state: s.presentMon.path ? "idle" : "missing", detail: "" };
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
    const frame = s.frames.stats(now);
    const baseMhz = os.cpus()[0]?.speed ?? 0;
    const cpuOk = fresh(s.cpu.at);
    const fallbackLoad = cpuOk ? null : cpuLoadFallback();
    if (cpuOk) s.cpuTimes = os.cpus().map((c) => c.times);
    const notes = {};
    if (!frame) {
      if (!s.game) notes.fps = "Start a game to see frame rate.";
      else if (s.presentMon.state === "missing") notes.fps = "Frame rate needs PresentMon. See the README.";
      else if (s.presentMon.state === "error") notes.fps = `PresentMon couldn't read frames: ${s.presentMon.detail || "unknown error"}`;
      else notes.fps = "Waiting for PresentMon to report frames.";
    }
    if (s.sources.nvidia.state === "unavailable") notes.gpu = s.sources.nvidia.detail;
    if (s.sources.typeperf.state === "unavailable") notes.cpu = s.sources.typeperf.detail;
    return {
      t: now,
      fps: frame ? frame.fps : null,
      frameTimeMs: frame ? frame.frameTimeMs : null,
      gpuTemp: fresh(s.gpu.at) && s.gpu.temp != null ? Math.round(s.gpu.temp) : null,
      cpuLoad: cpuOk && s.cpu.utility != null ? Math.min(100, Math.round(s.cpu.utility)) : fallbackLoad,
      gpuLoad: fresh(s.gpu.at) ? s.gpu.load ?? null : null,
      cpuClockGhz: cpuOk && s.cpu.performance != null && baseMhz ? +((baseMhz * s.cpu.performance) / 100000).toFixed(2) : null,
      gpuPowerW: fresh(s.gpu.at) && s.gpu.powerW != null ? Math.round(s.gpu.powerW) : null,
      pingRegionMs: s.ping.region,
      pingRouterMs: s.ping.router,
      batteryPct: s.battery.pct,
      onAc: s.battery.onAc,
      game: s.game,
      notes,
    };
  }

  function stop() {
    stopping = true;
    timers.forEach((t) => t.clear());
    s.presentMonChild = null;
    children.forEach((c) => c.kill());
  }

  return {
    start,
    stop,
    sample,
    setSlow: (v) => (s.slow = v),
    state: s,
    machine: async () => {
      const cs = await powershell("$c=Get-CimInstance Win32_ComputerSystem; \"$($c.Manufacturer)|$($c.Model)\"").catch(() => "");
      const [maker = "", model = ""] = cs.trim().split("|");
      const brand = maker.replace(/ASUSTeK COMPUTER INC\./i, "ASUS").replace(/\s*(Inc\.?|Corporation|Co\.?,? Ltd\.?)$/i, "").trim();
      const cleaned = model.replace(/\s+[A-Z0-9]+_[A-Z0-9]+$/, "").trim();
      const withoutBrand = cleaned.replace(new RegExp(`^${brand.split(/\s+/)[0]}\\s+`, "i"), "").replace(/^ASUS\\s+/i, "");
      const name = `${brand} ${withoutBrand}`.replace(/\s+/g, " ").trim();
      const cpu = (os.cpus()[0]?.model ?? "").replace(/\s+with .*$/i, "").replace(/^AMD |^Intel\(R\) Core\(TM\) /i, "").replace(/\s+/g, " ").trim();
      const gpu = (s.gpuName ?? "").replace(/NVIDIA GeForce | Laptop GPU/g, "").trim();
      return { name: name || os.hostname(), cpu: cpu || "CPU", gpu: gpu || "GPU" };
    },
  };
}

function tcpConnectMs(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    let t0 = 0;
    const sock = net.connect({ host, port });
    const done = (v) => {
      sock.destroy();
      resolve(v);
    };
    sock.setTimeout(timeoutMs, () => done(null));
    sock.on("lookup", () => (t0 = performance.now()));
    sock.on("connect", () => done(Math.max(1, Math.round(performance.now() - t0))));
    sock.on("error", () => done(null));
  });
}
