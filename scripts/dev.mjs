import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Node's --env-file only handles one file per process, so load the same files
// here and pass the values down to both children.
for (const file of [".env", ".env.local"]) {
  const fullPath = path.join(rootDir, file);
  if (!existsSync(fullPath)) continue;

  for (const rawLine of readFileSync(fullPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];
let shuttingDown = false;

const COLORS = {
  api: "\x1b[36m",
  web: "\x1b[35m",
};
const RESET = "\x1b[0m";

function run(name, args, env) {
  const child = spawn(npmCommand, args, {
    cwd: rootDir,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const prefix = `${COLORS[name] ?? ""}[${name}]${RESET} `;
  const pipe = (stream) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) process.stdout.write(prefix + line + "\n");
    });
    stream.on("end", () => {
      if (buffer) process.stdout.write(prefix + buffer + "\n");
    });
  };

  pipe(child.stdout);
  pipe(child.stderr);

  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.error(`\n${prefix}exited with code ${code ?? "unknown"}. Stopping other processes.`);
    shutdown(code ?? 1);
  });

  children.push(child);
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 200);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const apiPort = process.env.API_PORT ?? "8080";
const webPort = process.env.WEB_PORT ?? "20165";
const PROSPECTING_HINT =
  "Tip: if DATABASE_URL is not set, prospecting search still works, but saving prospects requires a database.";

console.log(`Starting API on http://localhost:${apiPort} and web app on http://localhost:${webPort}`);
console.log(PROSPECTING_HINT);

run("api", ["run", "dev", "--workspace", "@workspace/api-server"], {
  PORT: apiPort,
  NODE_ENV: "development",
});

run("web", ["run", "dev", "--workspace", "@workspace/agency-crm"], {
  PORT: webPort,
  BASE_PATH: "/",
  API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? `http://localhost:${apiPort}`,
});
