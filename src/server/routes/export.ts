import { Hono } from "hono";
import { EXPORT_HEADER, METRICS, localDate, toTsv } from "@shared/exportRow";
import { dateQuerySchema } from "@shared/schemas";
import type { Env } from "../app";
import { dailyRows } from "../daily";
import type { ResultDbRow } from "../db";
import { parse } from "../validate";

export const exportRoutes = new Hono<Env>();

/** Tab-separated spreadsheet row for one local date (default: today, server time). */
exportRoutes.get("/export/row", (c) => {
  const { db, now } = c.get("deps");
  const q = parse(dateQuerySchema, c.req.query());
  const date = q.date ?? localDate(now());
  const row = dailyRows(db).find((r) => r.date === date);
  const line = toTsv(date, row?.values ?? METRICS.map(() => null));
  const body = q.header === "1" ? `${EXPORT_HEADER.join("\t")}\n${line}` : line;
  return c.text(body, 200, { "Content-Type": "text/tab-separated-values; charset=utf-8" });
});

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Long format: one line per stored result. */
exportRoutes.get("/export/csv", (c) => {
  const { db } = c.get("deps");
  const rows = db.query("SELECT * FROM results ORDER BY ts ASC, id ASC").all() as ResultDbRow[];
  const lines = ["id,ts,iso_time,date,test,score,extra_json"];
  for (const r of rows) {
    lines.push([r.id, r.ts, new Date(r.ts).toISOString(), localDate(r.ts), r.test, r.score, r.extra_json].map(csvCell).join(","));
  }
  return c.body(lines.join("\n") + "\n", 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="cogbench-${localDate(Date.now())}.csv"`,
  });
});
