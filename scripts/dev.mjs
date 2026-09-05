// Start both halves of the app with one command.
//
// The frontend is useless without the Python analyst service, and remembering
// to start two processes in two terminals with the right environment variable
// is exactly the kind of setup step that gets skipped. `npm run dev:all` runs
// both and shuts both down together.
//
// Written with no dependencies on purpose: a dev-only convenience should not
// add a package to the install.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const aiDir = path.join(root, "ai");
const isWindows = process.platform === "win32";

const AI_PORT = process.env.AI_PORT || "8123";
const AI_URL = `http://127.0.0.1:${AI_PORT}`;

if (!existsSync(aiDir)) {
  console.error(`Cannot find the analyst service at ${aiDir}.`);
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function run(name, command, args, options) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWindows,
    ...options,
  });

  const prefix = `[${name}] `;
  const relay = (stream, target) => {
    stream.setEncoding("utf8");
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) target.write(prefix + line + "\n");
    });
  };

  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`${prefix}exited (${signal ?? code}). Stopping the other process.`);
    shutdown(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`${prefix}${error.message}`);
    if (name === "ai") {
      console.error(
        `${prefix}Python could not be started. Install the service once with:\n` +
        `${prefix}  cd ai && python -m pip install -r requirements.txt`,
      );
    }
    shutdown(1);
  });

  children.push(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill(isWindows ? undefined : "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  // Give them a moment to close their ports before the shell prompt returns.
  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// Left unset on purpose: the service uses the real model when credentials are
// configured and falls back to canned output when they are not. Set AI_MOCK=1
// to force canned output, AI_MOCK=0 to fail loudly instead of falling back.
const mock = process.env.AI_MOCK;

console.log(`Starting the analyst service on ${AI_URL} and Vite.\n`);

run("ai", process.env.PYTHON || "python", [
  "-m", "uvicorn", "app.main:app",
  "--host", "127.0.0.1",
  "--port", AI_PORT,
], {
  cwd: aiDir,
  env: { ...process.env, ...(mock ? { AI_MOCK: mock } : {}), CORS_ORIGINS: process.env.CORS_ORIGINS || "*" },
});

run("web", isWindows ? "npx.cmd" : "npx", ["vite"], {
  cwd: root,
  env: { ...process.env, VITE_AI_SERVICE_URL: process.env.VITE_AI_SERVICE_URL || AI_URL },
});
