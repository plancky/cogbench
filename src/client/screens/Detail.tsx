import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SERIES_META, type SeriesId } from "@shared/registry";
import { best, mean } from "@shared/scoring/stats";
import type { ResultRow } from "@shared/types";
import { TrendChart } from "../charts/TrendChart";
import { api } from "../lib/api";
import { fmtDateTime, fmtScore } from "../lib/format";
import { href, navigate } from "../lib/router";

function extraSummary(r: ResultRow): string {
  const e = r.extra as Record<string, unknown>;
  switch (r.test) {
    case "digit_span":
      return `fwd ${e.forward} · bwd ${e.backward}`;
    case "nback":
      return `hits ${e.hits} · FA ${e.falseAlarms}`;
    case "pvt":
      return `mean ${e.mean} ms · lapses ${e.lapses} · false starts ${e.falseStarts}`;
    case "stroop":
      return `acc ${e.accuracy}% · interference ${e.interference ?? "—"} ms`;
    case "word_delayed":
      return `${e.daysElapsed} days after study`;
    default:
      return "";
  }
}

export default function Detail({ series }: { series: SeriesId }) {
  const meta = SERIES_META[series];
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  useEffect(() => {
    api.results(series, 2000).then(setRows, () => setRows([]));
  }, [series]);
  const scores = rows?.map((r) => r.score) ?? [];
  const format = (v: number) => fmtScore(series, v);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <a href={href("")} className="text-sm text-muted-foreground hover:underline">← Home</a>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.name}</h1>
          <p className="text-sm text-muted-foreground">{meta.description} {meta.direction === "lower" ? "Lower is better." : "Higher is better."}</p>
        </div>
        {meta.flow && <Button onClick={() => navigate(`run/${meta.flow}`)}>Run {meta.name}</Button>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Trend</CardTitle>
          <CardDescription>
            {rows === null ? "Loading…" : `${rows.length} sessions · best ${fmtScore(series, best(scores, meta.direction))} · overall mean ${fmtScore(series, mean(scores) === null ? null : Math.round(mean(scores)! * 10) / 10)}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows && <TrendChart points={rows.map((r) => ({ ts: r.ts, score: r.score }))} direction={meta.direction} name={meta.name} format={format} />}
        </CardContent>
      </Card>
      {rows && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="hidden sm:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(-15).reverse().map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDateTime(new Date(r.ts))}</TableCell>
                    <TableCell className="text-right tabular-nums">{format(r.score)}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{extraSummary(r)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
