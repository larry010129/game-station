import test from "node:test";
import assert from "node:assert/strict";
import {
  FrameWindow,
  PresentMonParser,
  decodeEntities,
  parseGateway,
  parseLhm,
  parseNews,
  parseNvidiaLine,
  parsePatchNotes,
  parsePingMs,
  parseRedditAtom,
  parseYouTubeAtom,
  parseSteamManifest,
  parseTypeperfLine,
  parseVdfLibraries,
} from "../parsers.mjs";

test("decodes entities", () => {
  assert.equal(decodeEntities("Director&#x27;s &amp; Co &#39;x&#39;"), "Director's & Co 'x'");
});

test("nvidia-smi line, including N/A", () => {
  assert.deepEqual(parseNvidiaLine("51, 20, 1080, 12.57"), { temp: 51, load: 20, clockMhz: 1080, powerW: 12.57 });
  assert.deepEqual(parseNvidiaLine("51, 20, 1080, [N/A]"), { temp: 51, load: 20, clockMhz: 1080, powerW: null });
  assert.equal(parseNvidiaLine("garbage"), null);
});

test("typeperf rows, skipping the header", () => {
  assert.equal(parseTypeperfLine('"(PDH-CSV 4.0)","\\\\PC\\a","\\\\PC\\b"'), null);
  assert.deepEqual(parseTypeperfLine('"11/11/2026 23:47:24.135","11.859075","81.557854"'), { utility: 11.859075, performance: 81.557854 });
  assert.equal(parseTypeperfLine("Exiting, please wait..."), null);
});

test("LibreHardwareMonitor tree: picks the Ryzen Tctl/Tdie reading", () => {
  const tree = {
    Text: "Sensor",
    Children: [
      {
        Text: "YUZI",
        Children: [
          {
            Text: "AMD Ryzen 9 8940HX",
            ImageURL: "images_icon/cpu.png",
            Children: [
              { Text: "Temperatures", Children: [
                { Text: "Core (Tctl/Tdie)", Value: "83.4 °C", Children: [] },
                { Text: "Core #1", Value: "71.0 °C", Children: [] },
              ] },
              { Text: "Load", Children: [{ Text: "CPU Total", Value: "12.0 %", Children: [] }] },
            ],
          },
          { Text: "NVIDIA GeForce RTX 5060", ImageURL: "images_icon/nvidia.png", Children: [{ Text: "GPU Core", Value: "50.0 °C", Children: [] }] },
        ],
      },
    ],
  };
  assert.equal(parseLhm(tree), 83);
  assert.equal(parseLhm({ Text: "empty", Children: [] }), null);
});

test("frame window gives fps and frame time, and goes stale", () => {
  const w = new FrameWindow(1000);
  for (let i = 0; i < 100; i++) w.push(6, 1000 + i * 6);
  const s = w.stats(1000 + 600);
  assert.equal(s.fps, 167);
  assert.equal(s.frameTimeMs, 6);
  assert.equal(w.stats(1000 + 600 + 5000), null);
});

test("PresentMon v1 and v2 headers", () => {
  const v2 = new PresentMonParser();
  assert.equal(v2.line("Application,ProcessID,SwapChainAddress,PresentRuntime,FrameTime,CPUBusy"), null);
  assert.equal(v2.line("Overwatch.exe,1234,0x1,DXGI,6.25,3.1"), 6.25);
  const v1 = new PresentMonParser();
  assert.equal(v1.line("Application,ProcessID,TimeInSeconds,MsBetweenPresents,MsInPresentAPI"), null);
  assert.equal(v1.line("Overwatch.exe,1234,1.5,7.1,0.2"), 7.1);
  assert.equal(v1.line("Overwatch.exe,1234,1.6,not-a-number,0.2"), null);
});

test("news listing", () => {
  const html =
    '<a slot="gallery-items" href="/news/24316733/directors-take-5v5-and-6v6-better-together" target="_blank"><blz-card><blz-content-block><h3 slot="heading">Director’s Take: 5v5 and 6v6, Better Together</h3></blz-content-block><blz-timestamp slot="footer" timestamp="2026-11-10T17:00:00.000Z" lang="en-US"></blz-timestamp></blz-card></a>';
  const [item] = parseNews(html);
  assert.equal(item.title, "Director’s Take: 5v5 and 6v6, Better Together");
  assert.equal(item.publishedAt, Date.parse("2026-11-10T17:00:00.000Z"));
  assert.equal(item.url, "https://overwatch.blizzard.com/en-us/news/24316733/directors-take-5v5-and-6v6-better-together");
  assert.equal(item.kind, "official");
});

test("patch notes", () => {
  const html =
    '<div class="PatchNotes-body"><div class="PatchNotes-patch PatchNotes-live"><div class="anchor" id="patch-2026-11-05"></div><h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes – November 5, 2026</h3><div class="PatchNotes-sectionDescription"><p>This is a hotfix update.</p></div><h5 class="PatchNotesHeroUpdate-name">Wrecking Ball</h5><h5 class="PatchNotesHeroUpdate-name">Mercy</h5></div><div class="PatchNotes-patch"><div class="anchor" id="patch-2026-11-03"></div><h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes – November 3, 2026</h3><div class="PatchNotes-sectionDescription"><p>Season update.</p></div></div></div>';
  const [a, b] = parsePatchNotes(html);
  assert.equal(a.id, "patch-2026-11-05");
  assert.equal(a.summary, "Hero changes: Wrecking Ball, Mercy");
  assert.equal(b.summary, "Season update.");
  assert.ok(a.publishedAt > b.publishedAt);
  assert.ok(a.url.endsWith("#patch-2026-11-05"));
});

test("reddit atom", () => {
  const xml =
    '<feed><entry><author><name>/u/someone</name></author><id>t3_abc</id><link href="https://www.reddit.com/r/Overwatch/comments/abc/x/" /><updated>2026-11-11T16:18:14+00:00</updated><title>Don&#39;t miss &amp; this</title></entry></feed>';
  const [e] = parseRedditAtom(xml, "Overwatch", "community");
  assert.equal(e.title, "Don't miss & this");
  assert.equal(e.source, "r/Overwatch");
  assert.equal(e.summary, "u/someone");
  assert.equal(e.publishedAt, Date.parse("2026-11-11T16:18:14+00:00"));
});

test("gateway, ping, steam", () => {
  const route = "          0.0.0.0          0.0.0.0        10.24.0.1      10.24.0.20     35\n          0.0.0.0          0.0.0.0        192.168.0.1      192.168.0.9     50";
  assert.equal(parseGateway(route), "10.24.0.1");
  assert.equal(parsePingMs("Reply from 10.24.0.1: bytes=32 time=4ms TTL=64"), 4);
  assert.equal(parsePingMs("Reply from 10.24.0.1: bytes=32 time<1ms TTL=64"), 1);
  assert.equal(parsePingMs("Request timed out."), null);
  assert.deepEqual(parseSteamManifest('"AppState"\n{\n\t"appid"\t\t"2357570"\n\t"name"\t\t"Overwatch"\n\t"installdir"\t\t"Overwatch"\n}'), { appId: "2357570", installDir: "Overwatch" });
  assert.equal(parseSteamManifest('"appid" "1" "name" "Other" "installdir" "x"'), null);
  assert.deepEqual(parseVdfLibraries('"path"\t\t"D:\\\\Program Files (x86)\\\\Steam"'), ["D:\\Program Files (x86)\\Steam"]);
});

test("YouTube atom feed: links to the exact video and tags the platform", () => {
  const xml = `<feed><entry><id>yt:video:abc123</id><yt:videoId>abc123</yt:videoId><title>New hero &amp; trailer</title><link rel="alternate" href="https://www.youtube.com/shorts/abc123"/><published>2026-11-10T19:16:02+00:00</published></entry></feed>`;
  const [v] = parseYouTubeAtom(xml, "PlayOverwatch");
  assert.equal(v.id, "yt-abc123");
  assert.equal(v.platform, "youtube");
  assert.equal(v.kind, "video");
  assert.equal(v.source, "PlayOverwatch");
  assert.equal(v.url, "https://www.youtube.com/shorts/abc123");
  assert.equal(v.title, "New hero & trailer");
});
