import test, { after } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, readUserConfig } from "../config.mjs";
import { PORT } from "../constants.mjs";

// The environment must never change what these tests see: PORT (set by some preview tools) is ignored by the
// service, and stubbing it here proves that.
const savedPort = process.env.PORT;
process.env.PORT = "9999";
after(() => {
  if (savedPort === undefined) delete process.env.PORT;
  else process.env.PORT = savedPort;
});

const err = (code) => Object.assign(new Error(`${code}: boom`), { code });
const throwing = (code) => () => {
  throw err(code);
};

test("a missing config.json (ENOENT) is seeded once", () => {
  const writes = [];
  const cfg = loadConfig({ readFile: throwing("ENOENT"), writeJson: (f, v) => writes.push([f, v]), file: "fake.json" });
  assert.equal(cfg.corrupt, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], "fake.json");
});

for (const code of ["EBUSY", "EPERM", "EACCES"]) {
  test(`a config.json that cannot be read (${code}) is corrupt and never seeded over`, () => {
    const writes = [];
    const r = readUserConfig(throwing(code), "fake.json");
    assert.equal(r.exists, true);
    assert.equal(r.corrupt, true);
    assert.deepEqual(r.problems, [`config.json could not be read (${code})`]);
    const cfg = loadConfig({ readFile: throwing(code), writeJson: (f, v) => writes.push([f, v]), file: "fake.json" });
    assert.equal(writes.length, 0);
    assert.equal(cfg.corrupt, true);
    assert.ok(cfg.problems.some((p) => p.includes(`(${code})`)));
    assert.equal(cfg.port, undefined); // no port in the config: it is fixed
  });
}

test("a valid config.json is used and not rewritten", () => {
  const writes = [];
  const cfg = loadConfig({ readFile: () => '{"host": "localhost"}', writeJson: () => writes.push(1), file: "fake.json" });
  assert.equal(writes.length, 0);
  assert.equal(cfg.host, "localhost");
  assert.equal(cfg.corrupt, false);
});

test("the port is fixed at 8787: not in the config, not seeded, ignored from config.json and from PORT", () => {
  assert.equal(PORT, 8787);
  const writes = [];
  const seeded = loadConfig({ readFile: throwing("ENOENT"), writeJson: (_f, v) => writes.push(v), file: "fake.json" });
  assert.equal("port" in seeded, false);
  assert.equal("port" in writes[0], false);
  assert.equal(process.env.PORT, "9999"); // stubbed above; still no effect
  // An old seeded config with the default port is accepted silently; any other value is reported and ignored.
  assert.deepEqual(loadConfig({ readFile: () => '{"port": 8787}', file: "fake.json" }).problems, []);
  const other = loadConfig({ readFile: () => '{"port": 9000}', file: "fake.json" });
  assert.equal("port" in other, false);
  assert.ok(other.problems.some((p) => p.includes('"port"') && p.includes("8787")));
});

test("under the test runner the data folder is a throwaway temp dir, never %APPDATA%\CommandStation", async () => {
  const os = await import("node:os");
  const path = await import("node:path");
  const { DATA_DIR, JOURNAL_FILE, CONFIG_FILE } = await import("../paths.mjs");
  const real = path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "CommandStation");
  assert.notEqual(path.resolve(DATA_DIR), path.resolve(real));
  assert.ok(path.resolve(DATA_DIR).startsWith(path.resolve(os.tmpdir())), DATA_DIR);
  assert.ok(JOURNAL_FILE.startsWith(DATA_DIR) && CONFIG_FILE.startsWith(DATA_DIR));
});
