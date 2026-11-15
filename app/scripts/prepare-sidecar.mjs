// Prepares what Tauri bundles next to the app:
//   1. src-tauri/binaries/node-x86_64-pc-windows-msvc.exe  a copy of the current Node (the `binaries/node` sidecar)
//   2. src-tauri/service-stage/service/                    a clean copy of service/ without its tests
// tauri.conf.json bundles service-stage/service/ as the `service/` resource (the .ps1 helpers stay in).
import { cpSync, copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// The sidecar file name carries the target triple, which is hard-coded to Windows x64 below.
// Refuse to bundle a Node of another kind under that name (an arm64 Node would be mislabelled and fail at run time).
if (process.platform !== "win32" || process.arch !== "x64") {
  console.error(`[sidecar] This build targets Windows x64 but Node here is ${process.platform} ${process.arch}. Run it with a 64-bit (x64) Windows Node.`);
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "src-tauri", "binaries");
const dest = resolve(outDir, "node-x86_64-pc-windows-msvc.exe");

mkdirSync(outDir, { recursive: true });
copyFileSync(process.execPath, dest);
console.log(`[sidecar] ${process.execPath} -> ${dest} (${(statSync(dest).size / 1048576).toFixed(1)} MB)`);

const serviceSrc = resolve(root, "service");
const stage = resolve(root, "src-tauri", "service-stage", "service");
rmSync(resolve(root, "src-tauri", "service-stage"), { recursive: true, force: true });
cpSync(serviceSrc, stage, {
  recursive: true,
  // Skip the test folder only at the top of service/.
  filter: (src) => {
    const rel = relative(serviceSrc, src);
    return rel !== "test" && !rel.startsWith(`test${sep}`);
  },
});
console.log(`[sidecar] service/ (without test/) -> ${stage}`);

// The bundled service has no package.json beside it, so stage the app version for constants.mjs to read.
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
writeFileSync(resolve(stage, "version.json"), JSON.stringify({ version }) + "\n");
console.log(`[sidecar] version.json (${version})`);
