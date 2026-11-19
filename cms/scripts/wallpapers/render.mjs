// node render.mjs <outDir> <id>:<style>:<seed>[:<hex,hex,...>] ...
// Serves gen.html on localhost; a headless Edge per job draws the canvas and POSTs the WebP back.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const [outDir, ...jobs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

let waiting = null;
const server = createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (req.method === "POST" && u.pathname === "/save") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => { res.end("ok"); waiting?.(Buffer.concat(chunks).toString()); });
    return;
  }
  res.setHeader("content-type", "text/html");
  res.end(readFileSync(path.join(here, "gen.html")));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

for (const job of jobs) {
  const [id, style, seed, pal = ""] = job.split(":");
  const url = `http://127.0.0.1:${port}/?style=${style}&seed=${seed}&pal=${pal}`;
  const got = new Promise((r) => (waiting = r));
  const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${path.join(here, "prof", `${id}-${Date.now()}`)}`, url], { stdio: "ignore" });
  const timer = new Promise((r) => setTimeout(() => r(null), 60000));
  const data = await Promise.race([got, timer]);
  spawnSync("taskkill", ["/T", "/F", "/PID", String(edge.pid)], { stdio: "ignore" });
  if (!data) { console.error(id, "timed out"); continue; }
  const buf = Buffer.from(data.replace(/^data:image\/webp;base64,/, ""), "base64");
  writeFileSync(path.join(outDir, `${id}.webp`), buf);
  console.log(id, style, (buf.length / 1024).toFixed(0) + " KB");
  await new Promise((r) => setTimeout(r, 800));
}
server.close();
