// Builds latest.json for the Tauri updater from the signed installer that `npm run tauri build` produced.
// Usage:  npm run release:exe -- "what changed"          (after a build with TAURI_SIGNING_PRIVATE_KEY set)
// Then upload the three files it lists to a GitHub release named v<version> in larry010129/game-station.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const REPO = "larry010129/game-station";

const conf = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const cargo = readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8").match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const version = conf.version;

const fail = (msg) => {
  console.error(`release:exe: ${msg}`);
  process.exit(1);
};

// The exe, the updater and the screen must all say the same version, or the updater loops or never fires.
if (pkg.version !== version || cargo !== version) {
  fail(`versions differ: tauri.conf.json=${version}, package.json=${pkg.version}, Cargo.toml=${cargo}. Make them equal first.`);
}

const dir = join(root, "src-tauri/target/release/bundle/nsis");
if (!existsSync(dir)) fail(`no build output at ${dir}. Run  npm run tauri build  first.`);
const files = readdirSync(dir);
const installer = files.find((f) => f.endsWith(`_${version}_x64-setup.exe`));
if (!installer) fail(`no installer for ${version} in ${dir}. Run  npm run tauri build  after bumping the version.`);
const sigFile = `${installer}.sig`;
if (!files.includes(sigFile)) fail(`${sigFile} is missing: the build was not signed. Set TAURI_SIGNING_PRIVATE_KEY (path to the key) and build again.`);

// GitHub turns spaces in an uploaded file name into dots.
const assetName = installer.replace(/ /g, ".");
const latest = {
  version,
  notes: process.argv.slice(2).join(" ").trim() || `Version ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: readFileSync(join(dir, sigFile), "utf8").trim(),
      url: `https://github.com/${REPO}/releases/download/v${version}/${assetName}`,
    },
  },
};
writeFileSync(join(dir, "latest.json"), JSON.stringify(latest, null, 2));

console.log(`latest.json written for ${version}.\n\nUpload these to a GitHub release tagged v${version}:`);
console.log(`  ${join(dir, installer)}`);
console.log(`  ${join(dir, sigFile)}`);
console.log(`  ${join(dir, "latest.json")}`);
console.log(`\nThe app reads: https://github.com/${REPO}/releases/latest/download/latest.json`);
