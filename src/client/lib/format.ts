import { SERIES_META, type SeriesId } from "@shared/registry";
import { timeFormat } from "d3-time-format";

export function fmtScore(series: SeriesId, v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const unit = SERIES_META[series].unit;
  const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return unit === "ms" ? `${n} ms` : unit.startsWith("/") ? `${n}${unit}` : n;
}

export const fmtDate = timeFormat("%b %-d, %Y");
export const fmtDateTime = timeFormat("%b %-d, %H:%M");
export const fmtShort = timeFormat("%b %-d");

export function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
