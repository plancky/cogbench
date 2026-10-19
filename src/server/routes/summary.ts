import { Hono } from "hono";
import { SERIES, SERIES_META } from "@shared/registry";
import { best, mean, round } from "@shared/scoring/stats";
import type { SeriesSummary } from "@shared/types";
import type { Env } from "../app";

export const summaryRoutes = new Hono<Env>();

summaryRoutes.get("/summary", (c) => {
  const { db } = c.get("deps");
  const allScores = db.query("SELECT score FROM results WHERE test = ?");
  const recentQ = db.query("SELECT ts, score FROM results WHERE test = ? ORDER BY ts DESC, id DESC LIMIT 20");
  const out: SeriesSummary[] = SERIES.map((test) => {
    const scores = (allScores.all(test) as { score: number }[]).map((r) => r.score);
    const recent = (recentQ.all(test) as { ts: number; score: number }[]).reverse();
    const last = recent.at(-1) ?? null;
    return {
      test,
      count: scores.length,
      last: last?.score ?? null,
      lastTs: last?.ts ?? null,
      best: best(scores, SERIES_META[test].direction),
      avg5: round(mean(recent.slice(-5).map((r) => r.score)), 1),
      recent,
    };
  });
  return c.json(out);
});
