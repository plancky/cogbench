import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DAILY_FLOWS, SERIES, SERIES_META, WEEKLY_FLOWS, isBetter, type SeriesId } from "@shared/registry";
import { mean } from "@shared/scoring/stats";
import type { PendingResponse, SeriesSummary } from "@shared/types";
import { Sparkline } from "../charts/Sparkline";
import { api } from "../lib/api";
import { fmtDateTime, fmtScore } from "../lib/format";
import { href, navigate } from "../lib/router";
import { CopyRowDialog } from "./CopyRowDialog";

export function Home() {
  const [summary, setSummary] = useState<SeriesSummary[] | null>(null);
  const [pending, setPending] = useState<PendingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.summary().then(setSummary, (e) => setError(String(e.message ?? e)));
    api.pending().then(setPending, () => setPending({ now: Date.now(), lists: [] }));
  }, []);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your cognitive benchmarks</h1>
          <p className="text-sm text-muted-foreground">Compare against yourself only. Same time of day, same device.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate(`run/${DAILY_FLOWS.join(",")}`)} data-testid="daily-check">Daily check</Button>
          <Button variant="secondary" onClick={() => navigate(`run/${WEEKLY_FLOWS.join(",")}`)} data-testid="weekly-benchmark">Weekly benchmark</Button>
          <CopyRowDialog />
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">Could not load results: {error}</p>}

      <WordListsPanel pending={pending} />

      <section aria-label="Tests" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERIES.map((id) => (
          <SeriesCard key={id} id={id} summary={summary?.find((s) => s.test === id) ?? null} loading={summary === null} />
        ))}
      </section>
    </div>
  );
}

function Trend({ s }: { s: SeriesSummary }) {
  const meta = SERIES_META[s.test];
  const prev = s.recent.slice(-6, -1).map((r) => r.score);
  const ref = mean(prev);
  if (s.last === null || ref === null) return null;
  const same = Math.abs(s.last - ref) < 1e-9;
  const better = !same && isBetter(meta.direction, s.last, ref);
  const label = same ? "same as recent average" : better ? "better than recent average" : "worse than recent average";
  // Arrow direction follows improvement, not raw value (lower RT = ▲ better).
  return (
    <span className={better ? "text-good-text" : same ? "text-muted-foreground" : "text-bad"} data-testid={`trend-${s.test}`}>
      <span aria-hidden="true">{same ? "＝" : better ? "▲" : "▼"} </span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

function SeriesCard({ id, summary: s, loading }: { id: SeriesId; summary: SeriesSummary | null; loading: boolean }) {
  const meta = SERIES_META[id];
  return (
    <Card data-testid={`card-${id}`}>
      <CardHeader>
        <CardTitle>
          <a href={href(`detail/${id}`)} className="hover:underline">{meta.name}</a>
        </CardTitle>
        <CardDescription>{meta.description}</CardDescription>
        <CardAction>
          <Badge variant={meta.cadence === "Daily" ? "default" : "outline"}>{meta.cadence}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <Stat label="Last" value={loading ? "…" : fmtScore(id, s?.last)} testId={`last-${id}`} />
          <Stat label="Best" value={loading ? "…" : fmtScore(id, s?.best)} />
          <Stat label="Last-5 avg" value={loading ? "…" : fmtScore(id, s?.avg5)} />
        </dl>
        <Sparkline values={s?.recent.map((r) => r.score) ?? []} label={meta.name} direction={meta.direction} />
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="min-h-5">
            {s && <Trend s={s} />}
            {s?.lastTs && <span className="sr-only"> · last on {fmtDateTime(new Date(s.lastTs))}</span>}
          </span>
          {meta.flow ? (
            <Button size="sm" variant="outline" onClick={() => navigate(`run/${meta.flow}`)} data-testid={`run-${meta.flow}`}>
              {id === "word_immediate" ? "Study list" : "Run"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">From a saved list ↑</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{meta.direction === "lower" ? "Lower is better" : "Higher is better"} · {meta.area}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums" data-testid={testId}>{value}</dd>
    </div>
  );
}

function WordListsPanel({ pending }: { pending: PendingResponse | null }) {
  const lists = pending?.lists ?? [];
  return (
    <Card data-testid="word-lists">
      <CardHeader>
        <CardTitle>Word lists</CardTitle>
        <CardDescription>Study a new list now, recall it in 7 days. Delayed recall unlocks 24 hours after studying (server time).</CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => navigate("run/word")} data-testid="study-new-list">Study new list</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {pending === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lists waiting for recall.</p>
        ) : (
          <ul className="divide-y text-sm">
            {lists.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2" data-testid={`pending-${l.id}`}>
                <span>
                  List #{l.id} · studied {fmtDateTime(new Date(l.createdAt))}
                  {l.immediateScore !== null && <span className="text-muted-foreground"> · immediate {l.immediateScore}/20</span>}
                </span>
                {l.unlocked ? (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`recall/${l.id}`)} data-testid={`delayed-${l.id}`}>
                    Delayed recall
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Unlocks {fmtDateTime(new Date(l.unlockAt))}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
