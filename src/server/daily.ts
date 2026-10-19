import type { Database } from "bun:sqlite";
import { localDate, rowValues, type ResultLike } from "@shared/exportRow";
import type { SeriesId } from "@shared/registry";
import type { TrackingRow } from "@shared/types";
import { toResult } from "./app";
import type { ResultDbRow } from "./db";

/**
 * One row per local date: the latest result per series on that day, pivoted
 * into the export/tracking metric columns. Oldest date first.
 */
export function dailyRows(db: Database, sinceTs?: number): TrackingRow[] {
  const rows = (
    sinceTs === undefined
      ? db.query("SELECT * FROM results ORDER BY ts ASC, id ASC").all()
      : db.query("SELECT * FROM results WHERE ts >= ? ORDER BY ts ASC, id ASC").all(sinceTs)
  ) as ResultDbRow[];
  const byDate = new Map<string, Partial<Record<SeriesId, ResultLike>>>();
  for (const r of rows.map(toResult)) {
    const d = localDate(r.ts);
    const day = byDate.get(d) ?? {};
    day[r.test] = r; // ascending order, so the last write is the latest
    byDate.set(d, day);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, latest]) => ({ date, values: rowValues(latest) }));
}
