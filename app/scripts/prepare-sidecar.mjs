// Copies the current Node binary into src-tauri/binaries so Tauri can bundle
// it as the `binaries/node` sidecar (externalBin). Target triple is Windows x64.
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "src-tauri", "binaries");
const dest = resolve(outDir, "node-x86_64-pc-windows-msvc.exe");

mkdirSync(outDir, { recursive: true });
copyFileSync(process.execPath, dest);
console.log(`[sidecar] ${process.execPath} -> ${dest} (${(statSync(dest).size / 1048576).toFixed(1)} MB)`);
