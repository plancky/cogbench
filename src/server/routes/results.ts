import { Hono } from "hono";
import { resultInputSchema, resultsQuerySchema } from "@shared/schemas";
import { insertResult, toResult, type Env } from "../app";
import type { ResultDbRow } from "../db";
import { jsonBody, parse } from "../validate";

export const resultsRoutes = new Hono<Env>();

resultsRoutes.post("/results", async (c) => {
  const { db, now } = c.get("deps");
  const input = parse(resultInputSchema, await jsonBody(c));
  const ts = input.ts ?? now();
  const id = insertResult(db, ts, input.test, input.score, input.extra);
  return c.json({ id, ts }, 201);
});

/** Latest `limit` results (optionally for one test), returned oldest first. */
resultsRoutes.get("/results", (c) => {
  const { db } = c.get("deps");
  const q = parse(resultsQuerySchema, c.req.query());
  const rows = (
    q.test
      ? db.query("SELECT * FROM results WHERE test = ? ORDER BY ts DESC, id DESC LIMIT ?").all(q.test, q.limit)
      : db.query("SELECT * FROM results ORDER BY ts DESC, id DESC LIMIT ?").all(q.limit)
  ) as ResultDbRow[];
  return c.json(rows.reverse().map(toResult));
});
