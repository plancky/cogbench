import { defineConfig } from "@playwright/test";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.E2E_PORT ?? 5299);
const DB = join(tmpdir(), `cogbench-e2e-${PORT}.db`);
for (const suffix of ["", "-wal", "-shm"]) rmSync(DB + suffix, { force: true });

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: process.env.E2E_CHANNEL ?? "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "NODE_ENV=production bun src/server/index.ts",
    url: `http://127.0.0.1:${PORT}/api/health`,
    env: { PORT: String(PORT), DB_PATH: DB, HOST: "127.0.0.1" },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
