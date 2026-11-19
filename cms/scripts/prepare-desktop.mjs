// Prepares what Tauri bundles into Command CMS.exe:
//   1. src-tauri/binaries/node-x86_64-pc-windows-msvc.exe  a copy of the current Node (the `binaries/node` sidecar)
//   2. src-tauri/stage/cms/                                server/*.mjs, the built UI (dist/) and seed/draft.json
// Never stages data/keys or data/releases: the installed CMS keeps its data in %APPDATA%\CommandCMS\data.
// Run after `npm run build` (tauri.conf.json's beforeBuildCommand does both).
import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32" || process.arch !== "x64") {
  console.error(`[desktop] This build targets Windows x64 but Node here is ${process.platform} ${process.arch}.`);
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tauri = resolve(root, "src-tauri");

const binDir = resolve(tauri, "binaries");
mkdirSync(binDir, { recursive: true });
const node = resolve(binDir, "node-x86_64-pc-windows-msvc.exe");
copyFileSync(process.execPath, node);
console.log(`[desktop] ${process.execPath} -> ${node} (${(statSync(node).size / 1048576).toFixed(1)} MB)`);

const dist = resolve(root, "dist");
if (!existsSync(resolve(dist, "index.html"))) {
  console.error("[desktop] dist/index.html missing: run npm run build first");
  process.exit(1);
}

const stage = resolve(tauri, "stage", "cms");
rmSync(resolve(tauri, "stage"), { recursive: true, force: true });
mkdirSync(resolve(stage, "server"), { recursive: true });
for (const f of readdirSync(resolve(root, "server"))) {
  if (f.endsWith(".mjs")) copyFileSync(resolve(root, "server", f), resolve(stage, "server", f));
}
cpSync(dist, resolve(stage, "dist"), { recursive: true });
mkdirSync(resolve(stage, "seed"), { recursive: true });
copyFileSync(resolve(root, "data", "draft.json"), resolve(stage, "seed", "draft.json"));
console.log(`[desktop] server/*.mjs, dist/, seed/draft.json -> ${stage}`);
