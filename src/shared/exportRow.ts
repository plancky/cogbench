import type { Direction, SeriesId } from "./registry";
import type { Cell } from "./types";

/** Minimal shape needed to pull metric values out of a stored result. */
export interface ResultLike {
  test: SeriesId;
  score: number;
  extra: Record<string, unknown>;
}

export interface Metric {
  key: string;
  label: string;
  series: SeriesId;
  direction: Direction;
  unit: string;
  pick: (r: ResultLike) => Cell;
}

const extraNum = (field: string) => (r: ResultLike): Cell => {
  const v = r.extra[field];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};
const score = (r: ResultLike): Cell => r.score;

/** Export/tracking columns, in spreadsheet order (after Date). */
export const METRICS: Metric[] = [
  { key: "digit_span", label: "Digit Span", series: "digit_span", direction: "higher", unit: "", pick: score },
  { key: "corsi", label: "Corsi Span", series: "corsi", direction: "higher", unit: "", pick: score },
  { key: "nback", label: "2-back Score", series: "nback", direction: "higher", unit: "", pick: score },
  { key: "pvt_median", label: "PVT Median RT", series: "pvt", direction: "lower", unit: "ms", pick: score },
  { key: "pvt_lapses", label: "PVT Lapses", series: "pvt", direction: "lower", unit: "", pick: extraNum("lapses") },
  { key: "stroop_rt", label: "Stroop RT", series: "stroop", direction: "lower", unit: "ms", pick: score },
  { key: "stroop_acc", label: "Stroop Accuracy", series: "stroop", direction: "higher", unit: "%", pick: extraNum("accuracy") },
  { key: "stroop_interf", label: "Stroop Interference", series: "stroop", direction: "lower", unit: "ms", pick: extraNum("interference") },
  { key: "word_immediate", label: "Immediate Recall", series: "word_immediate", direction: "higher", unit: "", pick: score },
  { key: "word_delayed", label: "Delayed Recall", series: "word_delayed", direction: "higher", unit: "", pick: score },
];

export const EXPORT_HEADER = ["Date", ...METRICS.map((m) => m.label)];

/** Build the metric cells for one day from the latest result per series on that day. */
export function rowValues(latestBySeries: Partial<Record<SeriesId, ResultLike>>): Cell[] {
  return METRICS.map((m) => {
    const r = latestBySeries[m.series];
    return r ? m.pick(r) : null;
  });
}

export function toTsv(date: string, values: readonly Cell[]): string {
  return [date, ...values.map((v) => (v === null ? "" : String(v)))].join("\t");
}

export function localDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
