import type { ResultInput } from "@shared/schemas";
import type { MetricSummary, PendingResponse, RecallResponse, ResultRow, SeriesSummary, TrackingRow, WordListCreated } from "@shared/types";
import type { SeriesId } from "@shared/registry";
import { enqueue, flushQueue } from "./retryQueue";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("json") ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, typeof body === "object" && body?.error ? body.error : String(body));
  return body as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  summary: () => request<SeriesSummary[]>("/api/summary"),
  results: (test?: SeriesId, limit = 1000) =>
    request<ResultRow[]>(`/api/results?${new URLSearchParams({ ...(test ? { test } : {}), limit: String(limit) })}`),
  pending: () => request<PendingResponse>("/api/wordlists/pending"),
  newList: () => request<WordListCreated>("/api/wordlists", { method: "POST" }),
  exportRow: (date: string) => request<string>(`/api/export/row?date=${date}`),
  trackingLog: (days?: number) => request<{ columns: string[]; rows: TrackingRow[] }>(`/api/tracking/log${days ? `?days=${days}` : ""}`),
  trackingSummary: () => request<MetricSummary[]>("/api/tracking/summary"),
  restore: (backup: unknown) => request<{ ok: true }>("/api/restore", json(backup)),
  recallDelayed: (id: number, recalled: string[]) => request<RecallResponse>(`/api/wordlists/${id}/recall`, json({ recalled })),
};

export type SaveOutcome<T> = { status: "saved"; data: T } | { status: "queued" } | { status: "rejected"; error: string };

/**
 * POST a finished test's data. Called only after the test ends. Network or 5xx
 * failures go to the local retry queue; validation errors are reported.
 */
export async function saveWithRetry<T>(url: string, body: unknown): Promise<SaveOutcome<T>> {
  try {
    const data = await request<T>(url, json(body));
    void flushQueue();
    return { status: "saved", data };
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { status: "rejected", error: e.message };
    enqueue(url, body);
    return { status: "queued" };
  }
}

export const saveResult = (r: ResultInput) => saveWithRetry<{ id: number }>("/api/results", { ...r, ts: r.ts ?? Date.now() });
