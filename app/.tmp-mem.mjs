import { chromium } from "playwright";
import { execSync } from "node:child_process";

const ps = (cmd) => execSync(`powershell -NoProfile -Command "${cmd}"`, { encoding: "utf8" }).trim();
// Private memory (MB) of every WebView2 process of the app, split by role.
function webviewMem() {
  const out = ps(`$root = (Get-Process command-station).Id; $all = Get-CimInstance Win32_Process; function K($i){ $all | Where-Object { $_.ParentProcessId -eq $i } | ForEach-Object { $_.ProcessId; K $_.ProcessId } }; $ids = @(K $root); Get-Process -Id $ids -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq 'msedgewebview2' } | ForEach-Object { '{0}|{1}' -f $_.Id, [math]::Round($_.PrivateMemorySize64/1MB) }`);
  const rows = out.split(/\r?\n/).filter(Boolean).map((l) => l.split("|").map(Number));
  return rows.reduce((a, r) => a + r[1], 0);
}
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => /tauri\.localhost/.test(p.url()));
const css = (id, text) => page.evaluate(([i, t]) => { let s = document.getElementById(i); if (!s) { s = document.createElement("style"); s.id = i; document.head.appendChild(s); } s.textContent = t; }, [id, text]);
const settle = (s) => new Promise((r) => setTimeout(r, s * 1000));
async function step(label, text) {
  await css("exp", text);
  await settle(12);
  console.log(label.padEnd(38), webviewMem() + " MB private (all WebView processes)");
}
await step("baseline", "");
await step("no backdrop-filter", ".t,.top,.vault-card,.nc,.wc-me span{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}");
await step("+ content-visibility on cards", ".t,.top{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.react-grid-item{content-visibility:auto;contain-intrinsic-size:auto 300px}");
await step("+ backdrop scene hidden", ".t,.top{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.react-grid-item{content-visibility:auto;contain-intrinsic-size:auto 300px}.scene{display:none!important}");
await browser.close();
