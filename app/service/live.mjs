import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { killTree } from "./spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kids = [];

function run(command, args, env = process.env) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    windowsHide: true,
    env,
  });
  kids.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) stop(code);
  });
  return child;
}

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  // shell:true makes each child a cmd.exe: kill the whole tree, or the real node/vite is left running.
  for (const c of kids) killTree(c);
  // taskkill runs on its own; give it a moment to start before this process goes away.
  setTimeout(() => process.exit(code), 400);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

// The service ignores any PORT in the environment (it always uses 8787), so the harness's PORT only reaches the dev server.
run("node", ["service/index.mjs"]);
run("npm", ["run", "dev"]);
