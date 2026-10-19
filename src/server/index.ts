import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serveStatic } from "hono/bun";
import { createApp } from "./app";
import { openDb } from "./db";

const dbPath = process.env.DB_PATH ?? "./data/cogbench.db";
const hostname = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 5174);
const clientDir = resolve(import.meta.dir, "../../dist/client");

const db = openDb(dbPath);
const app = createApp({ db });

if (process.env.NODE_ENV === "production") {
  if (!existsSync(clientDir)) {
    console.error(`No built client at ${clientDir}. Run \`bun run build\` first.`);
    process.exit(1);
  }
  app.use("/*", serveStatic({ root: clientDir }));
  const indexHtml = await Bun.file(resolve(clientDir, "index.html")).text();
  app.get("*", (c) => (c.req.path.startsWith("/api/") ? c.json({ error: "not found" }, 404) : c.html(indexHtml)));
}

const server = Bun.serve({ hostname, port, fetch: app.fetch });
console.log(`CogBench API on http://${server.hostname}:${server.port} (db: ${dbPath})`);

const shutdown = () => {
  server.stop();
  db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
