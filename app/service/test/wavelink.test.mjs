import test from "node:test";
import assert from "node:assert/strict";
import { buildCall, createClient, createWaveLink, decodeFrames, encodeFrame, readPort, shape } from "../wavelink.mjs";

const quiet = () => {};

test("a masked frame decodes back to the same text, short and long", () => {
  for (const text of ["hi", "x".repeat(300)]) {
    const frame = encodeFrame(text, Buffer.from([1, 2, 3, 4]));
    assert.equal(frame[1] & 0x80, 0x80); // clients must mask
    // Unmask like a server would, then wrap as an unmasked server frame to test our decoder.
    const lenBytes = (frame[1] & 0x7f) === 126 ? 4 : 2;
    const mask = frame.subarray(lenBytes, lenBytes + 4);
    const body = Buffer.from(frame.subarray(lenBytes + 4));
    for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
    const head = body.length < 126 ? Buffer.from([0x81, body.length]) : Buffer.from([0x81, 126, body.length >> 8, body.length & 255]);
    assert.deepEqual(decodeFrames(Buffer.concat([head, body])).messages, [text]);
  }
});

test("decoder keeps half a frame for later, joins fragments, and reports a close", () => {
  const whole = Buffer.concat([Buffer.from([0x81, 5]), Buffer.from("hello")]);
  const first = decodeFrames(whole.subarray(0, 4));
  assert.deepEqual(first.messages, []);
  assert.equal(first.rest.length, 4);
  assert.deepEqual(decodeFrames(Buffer.concat([first.rest, whole.subarray(4)])).messages, ["hello"]);

  const fragA = Buffer.concat([Buffer.from([0x01, 3]), Buffer.from("abc")]); // not final, text
  const fragB = Buffer.concat([Buffer.from([0x80, 2]), Buffer.from("de")]); // final, continuation
  const a = decodeFrames(fragA);
  assert.deepEqual(a.messages, []);
  assert.deepEqual(decodeFrames(fragB, a.partial).messages, ["abcde"]);

  assert.equal(decodeFrames(Buffer.from([0x88, 0])).closed, true);
});

test("the port comes from the Wave Link port file, and bad files give null", () => {
  assert.equal(readPort(() => '{"port": 62025}', "x"), 62025);
  assert.equal(readPort(() => '{"port": "no"}', "x"), null);
  assert.equal(readPort(() => "not json", "x"), null);
  assert.equal(
    readPort(() => {
      throw new Error("missing");
    }, "x"),
    null,
  );
});

test("the client skips ports that are not Wave Link and remembers the one that is", async () => {
  const seen = [];
  const session = async (port, requests) => {
    seen.push(port);
    if (port === 1111) throw new Error("refused");
    if (port === 2222) return [{ appID: "OTHER" }, ...requests.slice(1).map(() => ({}))];
    return [{ appID: "EWL", version: "3.5", interfaceRevision: 3 }, ...requests.slice(1).map((r) => ({ echoed: r.method }))];
  };
  const call = createClient({ session, port: () => 1111, scan: [2222, 3333] });
  const r = await call([{ method: "getMixes" }]);
  assert.deepEqual(seen, [1111, 2222, 3333]);
  assert.deepEqual(r.results, [{ echoed: "getMixes" }]);
  seen.length = 0;
  await call([{ method: "getMixes" }]);
  assert.deepEqual(seen, [3333]); // went straight to the known port
});

test("when nothing answers, the client says Wave Link is not running (503)", async () => {
  const call = createClient({
    session: async () => {
      throw new Error("refused");
    },
    port: () => null,
    scan: [1, 2],
  });
  await assert.rejects(call([]), (e) => e.status === 503 && /not running/.test(e.message));
});

test("shape keeps only what the card shows and tolerates missing parts", () => {
  const v = shape({ version: "3.5.0" }, [
    { channels: [{ id: "c1", name: "Game", type: "Hardware", level: 0.5, isMuted: true, image: { imgData: "HUGE" }, effects: [{}], mixes: [{ id: "m1", level: 1, isMuted: false }] }] },
    { mixes: [{ id: "m1", name: "Personal Mix", level: 1, isMuted: false, image: { name: "x" } }] },
    { inputDevices: [{ id: "d1", name: "Mic", isWaveDevice: true, inputs: [{ id: "i1", isMuted: true, gain: { value: 9 } }] }] },
  ]);
  assert.equal(JSON.stringify(v).includes("HUGE"), false);
  assert.equal(v.channels[0].isMuted, true);
  assert.deepEqual(v.inputs[0].inputs[0], { id: "i1", name: "Mic", isMuted: true });
  assert.deepEqual(shape({}, [undefined, undefined, undefined]).mixes, []);
});

test("buildCall maps each control to the right Wave Link call", () => {
  assert.deepEqual(buildCall({ kind: "mix", id: "m", level: 0.4 }), { method: "setMix", params: { id: "m", level: 0.4 } });
  assert.deepEqual(buildCall({ kind: "channel", id: "c", isMuted: true }), { method: "setChannel", params: { id: "c", isMuted: true } });
  assert.deepEqual(buildCall({ kind: "channel", id: "c", mixId: "m", level: 0 }), { method: "setChannel", params: { id: "c", mixes: [{ id: "m", level: 0 }] } });
  assert.deepEqual(buildCall({ kind: "input", id: "d", inputId: "i", isMuted: false }), { method: "setInputDevice", params: { id: "d", inputs: [{ id: "i", isMuted: false }] } });
});

test("buildCall refuses anything odd with a 400", () => {
  const status = (body) => {
    try {
      buildCall(body);
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  assert.equal(status(null), 400);
  assert.equal(status({ kind: "nuke", id: "x", level: 1 }), 400);
  assert.equal(status({ kind: "mix", id: "", level: 1 }), 400);
  assert.equal(status({ kind: "mix", id: "x" }), 400); // nothing to change
  assert.equal(status({ kind: "mix", id: "x", level: 2 }), 400);
  assert.equal(status({ kind: "mix", id: "x", level: -1 }), 400);
  assert.equal(status({ kind: "mix", id: "x", level: "loud" }), 400);
  assert.equal(status({ kind: "mix", id: "x", isMuted: "yes" }), 400);
  assert.equal(status({ kind: "input", id: "d", isMuted: true }), 400); // needs inputId
  assert.equal(status({ kind: "input", id: "d", inputId: "i", level: 0.5 }), 400); // never gain
  assert.equal(status({ kind: "mix", id: "x".repeat(201), level: 1 }), 400);
});

test("snapshot reports offline instead of throwing, and a set while offline is a 503", async () => {
  const offline = Object.assign(new Error("Wave Link is not running."), { status: 503 });
  const wl = createWaveLink({
    log: quiet,
    call: async () => {
      throw offline;
    },
  });
  assert.deepEqual(await wl.snapshot(), { state: "offline" });
  await assert.rejects(wl.set({ kind: "mix", id: "m", level: 0.5 }), (e) => e.status === 503);
});

test("snapshot is cached briefly, and a change clears the cache", async () => {
  let reads = 0;
  const call = async (requests) => {
    if (requests[0].method === "getChannels") reads++;
    return { info: { version: "3.5", interfaceRevision: 3 }, results: requests.map(() => ({})) };
  };
  const wl = createWaveLink({ log: quiet, call });
  await wl.snapshot();
  await wl.snapshot();
  assert.equal(reads, 1);
  await wl.set({ kind: "mix", id: "m", level: 0.5 });
  assert.equal(reads, 2);
});

test("an old interface revision is reported as unsupported", async () => {
  const wl = createWaveLink({ log: quiet, call: async () => ({ info: { version: "1.0", interfaceRevision: 0 }, results: [] }) });
  assert.equal((await wl.snapshot()).state, "unsupported");
});

test("an error answer from Wave Link on a change is a 502", async () => {
  const call = async () => ({ info: { interfaceRevision: 3 }, results: [{ error: { code: -1 } }] });
  await assert.rejects(createWaveLink({ log: quiet, call }).set({ kind: "mix", id: "m", level: 1 }), (e) => e.status === 502);
});
