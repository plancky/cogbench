import type { Direction } from "../registry";

export function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const s = values.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function stdev(values: readonly number[]): number | null {
  const m = mean(values);
  if (m === null || values.length < 2) return values.length === 1 ? 0 : null;
  return Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1));
}

/** Trailing moving average; the first window-1 points average what exists. */
export function movingAverage(values: readonly number[], window = 5): number[] {
  return values.map((_, i) => mean(values.slice(Math.max(0, i - window + 1), i + 1)) as number);
}

export function best(values: readonly number[], direction: Direction): number | null {
  if (!values.length) return null;
  return direction === "higher" ? Math.max(...values) : Math.min(...values);
}

/** % change from baseline, signed so positive always means improving. */
export function pctChange(value: number | null, baseline: number | null, direction: Direction): number | null {
  if (value === null || baseline === null || baseline === 0) return null;
  const raw = ((value - baseline) / Math.abs(baseline)) * 100;
  return direction === "higher" ? raw : -raw;
}

export interface TrackSummary {
  n: number;
  baseline: number | null;
  baselineComplete: boolean;
  latest3: number | null;
  best: number | null;
  pctChange: number | null;
}

/** Baseline = mean of first 3 non-blank entries; latest3 = mean of last 3. Values in chronological order. */
export function trackSummary(values: readonly (number | null)[], direction: Direction): TrackSummary {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x));
  const baseline = mean(v.slice(0, 3));
  const latest3 = mean(v.slice(-3));
  return {
    n: v.length,
    baseline,
    baselineComplete: v.length >= 3,
    latest3,
    best: best(v, direction),
    pctChange: v.length >= 2 ? pctChange(latest3, baseline, direction) : null,
  };
}

export function round(v: number | null, digits = 1): number | null {
  if (v === null) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
