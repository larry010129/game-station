import { mockApi } from "./mockApi";
import type { FeedItem, GameModeStep, Profile, Provider, Sample } from "../lib/types";

const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function sampleAt(t: number, dip: boolean): Sample {
  const fps = Math.round(dip ? rnd(124, 138) : 168 + Math.sin(t / 4000) * 9 + rnd(-6, 6));
  const gpuPowerW = Math.round(rnd(100, 108));
  return {
    t,
    fps,
    frameTimeMs: +(1000 / fps).toFixed(1),
    gpuTemp: Math.round(rnd(71, 74)),
    cpuLoad: Math.round(rnd(50, 62) + (dip ? 18 : 0)),
    gpuLoad: Math.round(rnd(88, 96)),
    cpuClockGhz: +rnd(4.6, 4.8).toFixed(2),
    gpuPowerW,
    pingRegionMs: Math.round(rnd(40, 49)),
    pingRouterMs: Math.round(rnd(3, 5)),
    batteryPct: 81,
    onAc: true,
    game: "Overwatch.exe",
  };
}

const HOUR = 3600_000;

function sampleFeed(now: number): FeedItem[] {
  return [
    {
      id: "patch-2026-11-05",
      kind: "patch",
      title: "Overwatch Retail Patch Notes, November 5, 2026",
      source: "Blizzard",
      publishedAt: now - 7 * 24 * HOUR,
      summary: "Sample support healing 60 → 65",
      isNew: true,
    },
    {
      id: "yt-sample",
      platform: "youtube",
      kind: "video",
      title: "Sample video: new hero reveal",
      source: "PlayOverwatch",
      publishedAt: now - 3 * HOUR,
      summary: "",
    },
    {
      id: "directors-take",
      kind: "official",
      title: "Director's Take: 5v5 and 6v6, Better Together",
      source: "Blizzard",
      publishedAt: now - 24 * HOUR,
      summary: "The game director on running both team formats",
    },
  ];
}

const step = (id: string, label: string, before: string, after: string): GameModeStep => ({ id, label, before, after });

const PROFILES: Profile[] = [
  {
    id: "ow-ranked",
    name: "Overwatch ranked",
    steps: [
      step("power", "Power plan to High performance", "Balanced", "High performance"),
      step("close", "Close Spotify, OneDrive, Armoury Crate", "3 running", "Closed"),
      step("gpu", "Run Overwatch on the RTX 5060", "Let Windows decide", "High performance GPU"),
      step("poll", "Slow live stats to every 3 s", "Every 1 s", "Every 3 s"),
      step("launch", "Launch Overwatch", "Not running", "Running"),
    ],
  },
  {
    id: "streaming",
    name: "Streaming",
    steps: [
      step("power", "Power plan to High performance", "Balanced", "High performance"),
      step("close", "Close Spotify and OneDrive", "2 running", "Closed"),
      step("obs", "Switch OBS to the Gaming scene", "Starting soon", "Gaming"),
      step("poll", "Slow live stats to every 3 s", "Every 1 s", "Every 3 s"),
    ],
  },
];

/**
 * Sample data that behaves like a laptop running Overwatch: frame rate
 * around 168 with an occasional short dip, CPU warming slightly during dips.
 */
export function createMockProvider(): Provider {
  let dipLeft = 0;
  return {
    id: "mock",
    label: "Sample data",
    machine: { name: "ASUS TUF A16", cpu: "Ryzen 9 HX", gpu: "RTX 5060" },
    seed(count, endT) {
      return Array.from({ length: count }, (_, i) => {
        const fromEnd = count - 1 - i;
        return sampleAt(endT - fromEnd * 1000, fromEnd === 18 || fromEnd === 17);
      });
    },
    async readSample() {
      let dip = false;
      if (dipLeft > 0) {
        dipLeft -= 1;
        dip = true;
      } else if (Math.random() < 0.04) {
        dipLeft = 1;
        dip = true;
      }
      return sampleAt(Date.now(), dip);
    },
    async readFeed() {
      return sampleFeed(Date.now());
    },
    async refreshFeed() {
      await wait(600);
      return sampleFeed(Date.now());
    },
    async api<T>(path: string, body?: unknown) {
      return mockApi(path, body) as T;
    },
    async readPlayers() {
      const hour = 3600_000;
      const end = Math.floor(Date.now() / hour) * hour;
      const hours = Array.from({ length: 24 }, (_, i) => {
        const t = end - (23 - i) * hour;
        const h = new Date(t).getUTCHours();
        return { t, count: Math.round(42000 + Math.sin(((h - 14) / 24) * Math.PI * 2) * 11000) };
      });
      return {
        source: "Sample data",
        latest: { t: Date.now(), count: hours[23].count },
        error: null,
        hours,
        regions: [
          { id: "na", name: "North America", share: 0.34 },
          { id: "sa", name: "South America", share: 0.07 },
          { id: "eu", name: "Europe", share: 0.33 },
          { id: "asia", name: "Asia", share: 0.19 },
          { id: "oce", name: "Oceania", share: 0.03 },
          { id: "other", name: "Middle East and Africa", share: 0.04 },
        ],
        regionsEstimated: true,
        demo: true,
      };
    },
    profiles: PROFILES,
    async applyStep() {
      await wait(340);
    },
    async restoreStep() {
      await wait(120);
    },
  };
}
