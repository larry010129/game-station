import test from "node:test";
import assert from "node:assert/strict";
import { parseSteamApp } from "../parsers.mjs";
import { decodeFrames, encodeFrame } from "../discord.mjs";

test("parseSteamApp reads a game and skips tools", () => {
  const acf = '"AppState"\n{\n\t"appid"\t\t"2357570"\n\t"name"\t\t"Overwatch 2"\n\t"SizeOnDisk"\t\t"1000"\n\t"LastPlayed"\t\t"1700000000"\n}';
  assert.deepEqual(parseSteamApp(acf), { appId: "2357570", name: "Overwatch 2", lastPlayed: 1700000000000, sizeBytes: 1000 });
  assert.equal(parseSteamApp('"appid" "228980"\n"name" "Steamworks Common Redistributables"'), null);
  assert.equal(parseSteamApp("nothing"), null);
});

test("discord frames round-trip, including split and joined chunks", () => {
  const a = encodeFrame(1, { cmd: "A", n: 1 });
  const b = encodeFrame(1, { cmd: "B", n: 2 });
  const both = Buffer.concat([a, b]);
  const first = decodeFrames(both.subarray(0, a.length + 5));
  assert.equal(first.frames.length, 1);
  assert.equal(first.frames[0].data.cmd, "A");
  const second = decodeFrames(Buffer.concat([first.rest, both.subarray(a.length + 5)]));
  assert.equal(second.frames[0].data.cmd, "B");
  assert.equal(decodeFrames(Buffer.from([1, 0, 0, 0, 255, 255, 255, 127])).broken, true);
});
