import test from "node:test";
import assert from "node:assert/strict";
import { parseWifi, summarize } from "../netstats.mjs";
import { parseNews } from "../steam.mjs";
import { parsePatchNotes } from "../parsers.mjs";

test("Wi-Fi: reads signal, band and name from netsh output", () => {
  const text = `
    Name                   : Wi-Fi
    State                  : connected
    SSID                   : Home Wi-Fi
    Radio type             : 802.11ax
    Band                   : 5 GHz
    Channel                : 44
    Receive rate (Mbps)    : 866.7
    Signal                 : 82%
  `;
  const w = parseWifi(text);
  assert.equal(w.connected, true);
  assert.equal(w.ssid, "Home Wi-Fi");
  assert.equal(w.signal, 82);
  assert.equal(w.band, "5 GHz");
  assert.equal(w.channel, 44);
  assert.equal(w.rateMbps, 866.7);
});

test("Wi-Fi: disconnected adapter and no output", () => {
  const w = parseWifi("    State                  : disconnected\n");
  assert.equal(w.connected, false);
  assert.equal(w.signal, null);
  assert.equal(parseWifi("The Wireless AutoConfig Service (wlansvc) is not running."), null);
});

test("jitter and loss: steady ping with one dropped reply", () => {
  const s = summarize([10, 12, 10, null, 11]);
  assert.equal(s.lossPct, 20);
  assert.equal(s.avg, 11);
  assert.equal(s.jitter, 1.7); // diffs 2, 2, 1 over 3 steps
});

test("jitter and loss: nothing answered", () => {
  const s = summarize([null, null]);
  assert.equal(s.avg, null);
  assert.equal(s.jitter, null);
  assert.equal(s.lossPct, 100);
  assert.equal(summarize([]).lossPct, null);
});

test("Steam news: maps items and converts seconds to milliseconds", () => {
  const out = parseNews({ appnews: { newsitems: [{ gid: 7, title: "Update", url: "https://x/y", date: 1000, feedlabel: "Community Announcements" }] } });
  assert.deepEqual(out, [{ id: "7", title: "Update", url: "https://x/y", date: 1_000_000, source: "Community Announcements" }]);
  assert.deepEqual(parseNews({}), []);
});

test("patch notes: heroes get a buff or nerf count from the wording", () => {
  const html = `<div class="PatchNotes-patch" id="patch-2026-11-05"><h3 class="PatchNotes-patchTitle">Retail Patch Notes</h3>
    <div class="PatchNotesHeroUpdate-name">Wrecking Ball</div><ul><li>Health increased from 600 to 650</li></ul>
    <div class="PatchNotesHeroUpdate-name">Reaper</div><ul><li>Damage reduced from 7 to 6</li></ul></div>`;
  const [p] = parsePatchNotes(html);
  assert.equal(p.heroChanges.length, 2);
  assert.ok(p.heroChanges[0].up > p.heroChanges[0].down);
  assert.ok(p.heroChanges[1].down > p.heroChanges[1].up);
});
