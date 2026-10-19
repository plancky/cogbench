import type { SeriesId } from "./registry";

export interface ResultRow {
  id: number;
  ts: number; // epoch ms
  test: SeriesId;
  score: number;
  extra: Record<string, unknown>;
}

export interface SeriesSummary {
  test: SeriesId;
  count: number;
  last: number | null;
  lastTs: number | null;
  best: number | null;
  avg5: number | null;
  recent: { ts: number; score: number }[]; // last 20, oldest first
}

export interface WordListCreated {
  id: number;
  createdAt: number;
  words: string[];
}

export interface PendingList {
  id: number;
  createdAt: number;
  unlockAt: number;
  unlocked: boolean;
  immediateScore: number | null;
}

export interface PendingResponse {
  now: number;
  lists: PendingList[];
}

export interface RecallResponse {
  score: number;
  total: number;
  matched: string[];
  daysElapsed?: number;
  resultId: number;
}

export type Cell = number | null;

export interface TrackingRow {
  date: string;
  values: Cell[]; // one per METRIC
}

export interface MetricSummary {
  key: string;
  label: string;
  direction: "higher" | "lower";
  n: number;
  baseline: number | null;
  baselineComplete: boolean;
  latest3: number | null;
  best: number | null;
  pctChange: number | null; // positive = improving
}
