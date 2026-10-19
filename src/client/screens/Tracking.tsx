import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXPORT_HEADER, METRICS, toTsv } from "@shared/exportRow";
import type { MetricSummary, TrackingRow } from "@shared/types";
import { TrendChart } from "../charts/TrendChart";
import { api } from "../lib/api";
import { copyText } from "../lib/clipboard";
import { fmtPct } from "../lib/format";

const CHART_KEYS = ["digit_span", "corsi", "nback", "pvt_median", "stroop_rt", "word_delayed"];
const fmtCell = (v: number | null) => (v === null ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(1));
const fmtVal = (v: number | null, unit: string) =>
  v === null ? "—" : `${Number.isInteger(v) ? v : v.toFixed(1)}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;

export default function Tracking() {
  const [days, setDays] = useState("90");
  const [log, setLog] = useState<TrackingRow[] | null>(null);
  const [allRows, setAllRows] = useState<TrackingRow[] | null>(null);
  const [summary, setSummary] = useState<MetricSummary[] | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.trackingLog(days === "all" ? undefined : Number(days)).then((r) => setLog(r.rows), () => setLog([]));
  }, [days, reload]);
  useEffect(() => {
    api.trackingLog().then((r) => setAllRows(r.rows), () => setAllRows([]));
    api.trackingSummary().then(setSummary, () => setSummary([]));
  }, [reload]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tracking</h1>
        <p className="text-sm text-muted-foreground">Your daily log, straight from the database: the latest result per test on each day.</p>
      </div>
      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Log</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <Card>
            <CardHeader className="gap-3">
              <div>
                <CardTitle>Daily log</CardTitle>
                <CardDescription>Same columns as the spreadsheet export row. Newest first.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger className="w-40" aria-label="Date range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" asChild>
                  <a href="/api/export/csv" download data-testid="csv-download">Download CSV</a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {log === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : log.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results in this range.</p>
              ) : (
                <Table data-testid="tracking-log">
                  <TableHeader>
                    <TableRow>
                      {EXPORT_HEADER.map((h) => (
                        <TableHead key={h} className={h === "Date" ? "" : "text-right"}>{h}</TableHead>
                      ))}
                      <TableHead><span className="sr-only">Copy</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...log].reverse().map((r) => (
                      <TableRow key={r.date}>
                        <TableCell className="font-medium whitespace-nowrap">{r.date}</TableCell>
                        {r.values.map((v, i) => (
                          <TableCell key={i} className="text-right tabular-nums">{fmtCell(v)}</TableCell>
                        ))}
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Copy row for ${r.date}`}
                            onClick={async () => ((await copyText(toTsv(r.date, r.values))) ? toast.success(`Copied ${r.date}`) : toast.error("Clipboard unavailable"))}
                          >
                            Copy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Baseline = mean of your first 3 logged days. % change is signed so positive always means improving.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <Table data-testid="tracking-summary">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Baseline</TableHead>
                      <TableHead className="text-right">Latest 3</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Best</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((m) => {
                      const unit = METRICS.find((x) => x.key === m.key)?.unit ?? "";
                      return (
                        <TableRow key={m.key}>
                          <TableCell>
                            <div className="font-medium">{m.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {m.direction === "lower" ? "lower is better" : "higher is better"} · {m.n} day{m.n === 1 ? "" : "s"}
                              {m.n > 0 && !m.baselineComplete && ` · baseline in progress (${m.n}/3)`}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmtVal(m.baseline, unit)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtVal(m.latest3, unit)}</TableCell>
                          <TableCell className="hidden text-right tabular-nums sm:table-cell">{fmtVal(m.best, unit)}</TableCell>
                          <TableCell className="text-right">
                            <ChangeBadge pct={m.pctChange} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {CHART_KEYS.map((key) => {
              const idx = METRICS.findIndex((m) => m.key === key);
              const m = METRICS[idx];
              const points = (allRows ?? [])
                .filter((r) => r.values[idx] !== null)
                .map((r) => ({ ts: new Date(`${r.date}T12:00:00`).getTime(), score: r.values[idx] as number }));
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>{m.label}</CardTitle>
                    <CardDescription>{m.direction === "lower" ? "Lower is better" : "Higher is better"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {allRows && <TrendChart points={points} direction={m.direction} name={m.label} format={(v) => fmtVal(v, m.unit)} height={220} />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="data">
          <DataPanel onRestored={() => setReload((n) => n + 1)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground">—</span>;
  if (pct === 0) return <Badge variant="outline">＝ 0.0%<span className="sr-only sm:not-sr-only">no change</span></Badge>;
  const good = pct > 0;
  return (
    <Badge variant="outline" className={good ? "text-good-text" : "text-bad"}>
      <span aria-hidden="true">{good ? "▲" : "▼"}</span> {fmtPct(pct)}
      <span className="sr-only sm:not-sr-only">{good ? "improving" : "worse"}</span>
    </Badge>
  );
}

function DataPanel({ onRestored }: { onRestored: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const restore = async (f: File) => {
    if (!confirm("Replace ALL data with this backup? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api.restore(JSON.parse(await f.text()));
      toast.success("Backup restored");
      onRestored();
    } catch (e) {
      toast.error(`Restore failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup and restore</CardTitle>
        <CardDescription>The database lives at <code>data/cogbench.db</code>. A JSON backup contains every result and word list.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <a href="/api/backup" download="cogbench-backup.json">Download backup (JSON)</a>
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}>Restore from backup…</Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
      </CardContent>
    </Card>
  );
}
