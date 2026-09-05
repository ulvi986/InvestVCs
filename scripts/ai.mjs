// Start just the Python analyst service.
//
// `npm run ai` in one terminal, `npm run dev` in another. Use `npm run dev:all`
// to start both at once.

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const aiDir = path.join(root, "ai");
const port = process.env.AI_PORT || "8123";

// Left unset on purpose: the service uses the real model when credentials are
// configured and falls back to canned output when they are not. Set AI_MOCK=1
// to force canned output, AI_MOCK=0 to fail loudly instead of falling back.
const mock = process.env.AI_MOCK;

console.log(`Analyst service on http://127.0.0.1:${port}`);

const child = spawn(
  process.env.PYTHON || "python",
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", port],
  {
    cwd: aiDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...(mock ? { AI_MOCK: mock } : {}), CORS_ORIGINS: process.env.CORS_ORIGINS || "*" },
  },
);

child.on("error", (error) => {
  console.error(error.message);
  console.error("Install the service once with:  npm run ai:install");
  process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));
