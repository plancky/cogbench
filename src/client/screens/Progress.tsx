import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SERIES, SERIES_META } from "@shared/registry";
import { mean, pctChange } from "@shared/scoring/stats";
import type { ResultRow } from "@shared/types";
import { SmallMultiple, type PctPoint } from "../charts/SmallMultiple";
import { api } from "../lib/api";
import { fmtScore } from "../lib/format";

const RANGES = { "30": 30, "90": 90, all: null } as const;
type RangeKey = keyof typeof RANGES;

export default function Progress() {
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [range, setRange] = useState<RangeKey>("90");
  useEffect(() => {
    api.results(undefined, 5000).then(setRows, () => setRows([]));
  }, []);

  const model = useMemo(() => {
    if (!rows) return null;
    const now = Date.now();
    const days = RANGES[range];
    const since = days === null ? -Infinity : now - days * 86_400_000;
    const panels = SERIES.map((id) => {
      const meta = SERIES_META[id];
      const all = rows.filter((r) => r.test === id);
      // Baseline always comes from the first 3 sessions ever, not the visible window.
      const baseline = mean(all.slice(0, 3).map((r) => r.score));
      const points: PctPoint[] = all
        .filter((r) => r.ts >= since)
        .map((r) => ({ ts: r.ts, pct: pctChange(r.score, baseline, meta.direction) ?? 0, raw: fmtScore(id, r.score) }));
      return { id, title: meta.name, points };
    });
    const pcts = panels.flatMap((p) => p.points.map((x) => x.pct));
    const m = Math.max(10, ...pcts.map(Math.abs));
    const step = m <= 20 ? 5 : m <= 50 ? 10 : 25;
    const lim = Math.ceil(m / step) * step;
    const minTs = Math.min(...rows.map((r) => r.ts), now - 86_400_000);
    return { panels, domain: [-lim, lim] as [number, number], xDomain: [days === null ? minTs : since, now] as [number, number] };
  }, [rows, range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progress overview</h1>
          <p className="text-sm text-muted-foreground">% change versus your baseline (mean of first 3 sessions). Up always means improving; reaction times are inverted.</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <TabsList aria-label="Time range">
            <TabsTrigger value="30">30 days</TabsTrigger>
            <TabsTrigger value="90">90 days</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {!model ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="progress-grid">
          {model.panels.map((p) => (
            <SmallMultiple key={p.id} title={p.title} points={p.points} domain={model.domain} xDomain={model.xDomain} />
          ))}
        </div>
      )}
    </div>
  );
}
