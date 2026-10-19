import { Hono } from "hono";
import { EXPORT_HEADER, METRICS } from "@shared/exportRow";
import { trackingQuerySchema } from "@shared/schemas";
import { round, trackSummary } from "@shared/scoring/stats";
import type { MetricSummary } from "@shared/types";
import type { Env } from "../app";
import { dailyRows } from "../daily";
import { parse } from "../validate";

export const trackingRoutes = new Hono<Env>();

/** Daily log, same columns as the export row. `days` limits to the last N days. */
trackingRoutes.get("/tracking/log", (c) => {
  const { db, now } = c.get("deps");
  const q = parse(trackingQuerySchema, c.req.query());
  const since = q.days ? now() - q.days * 86_400_000 : undefined;
  return c.json({ columns: EXPORT_HEADER, rows: dailyRows(db, since) });
});

/** Per metric: baseline (first 3 days), latest-3 mean, best, direction-aware % change. */
trackingRoutes.get("/tracking/summary", (c) => {
  const { db } = c.get("deps");
  const rows = dailyRows(db);
  const out: MetricSummary[] = METRICS.map((m, i) => {
    const s = trackSummary(rows.map((r) => r.values[i]), m.direction);
    return {
      key: m.key,
      label: m.label,
      direction: m.direction,
      n: s.n,
      baseline: round(s.baseline, 2),
      baselineComplete: s.baselineComplete,
      latest3: round(s.latest3, 2),
      best: s.best,
      pctChange: round(s.pctChange, 1),
    };
  });
  return c.json(out);
});
