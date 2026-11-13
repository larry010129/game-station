import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kids = [];

function run(command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    windowsHide: true,
  });
  kids.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) stop(code);
  });
  return child;
}

function stop(code = 0) {
  for (const c of kids) {
    try {
      c.kill();
    } catch {
      // already gone
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

run("node", ["service/index.mjs"]);
run("npm", ["run", "dev"]);
