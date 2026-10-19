import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ResultRow } from "@shared/types";
import type { SeriesId } from "@shared/registry";
import type { ResultDbRow } from "./db";
import { resultsRoutes } from "./routes/results";
import { summaryRoutes } from "./routes/summary";
import { wordlistRoutes } from "./routes/wordlists";
import { exportRoutes } from "./routes/export";
import { backupRoutes } from "./routes/backup";
import { trackingRoutes } from "./routes/tracking";

export interface AppDeps {
  db: Database;
  now: () => number;
  rng: () => number;
}

export type Env = { Variables: { deps: AppDeps } };

export function toResult(r: ResultDbRow): ResultRow {
  return { id: r.id, ts: r.ts, test: r.test as SeriesId, score: r.score, extra: JSON.parse(r.extra_json) };
}

export function insertResult(db: Database, ts: number, test: SeriesId, score: number, extra: unknown): number {
  const row = db
    .query("INSERT INTO results (ts, test, score, extra_json) VALUES (?, ?, ?, ?) RETURNING id")
    .get(ts, test, score, JSON.stringify(extra ?? {})) as { id: number };
  return row.id;
}

export function createApp(partial: Partial<AppDeps> & { db: Database }) {
  const deps: AppDeps = { now: Date.now, rng: Math.random, ...partial };
  const app = new Hono<Env>();
  app.use("/api/*", async (c, next) => {
    c.set("deps", deps);
    await next();
  });
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });
  app.route("/api", resultsRoutes);
  app.route("/api", summaryRoutes);
  app.route("/api", wordlistRoutes);
  app.route("/api", exportRoutes);
  app.route("/api", backupRoutes);
  app.route("/api", trackingRoutes);
  app.get("/api/health", (c) => c.json({ ok: true, now: deps.now() }));
  return app;
}
