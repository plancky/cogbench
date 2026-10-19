import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SeriesId } from "@shared/registry";
import type { ResultRow } from "@shared/types";
import { NbackBars } from "../charts/NbackBars";
import { PvtHistogram } from "../charts/PvtHistogram";
import { StroopStrips } from "../charts/StroopStrips";
import { api } from "../lib/api";
import { fmtDateTime, fmtScore } from "../lib/format";

function useSessions(test: SeriesId) {
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  useEffect(() => {
    api.results(test, 100).then((r) => setRows(r.reverse()), () => setRows([]));
  }, [test]);
  return rows;
}

function Section({ test, title, description, render }: { test: SeriesId; title: string; description: string; render: (r: ResultRow) => React.ReactNode }) {
  const rows = useSessions(test);
  const [id, setId] = useState<string | null>(null);
  const current = rows?.find((r) => String(r.id) === id) ?? rows?.[0] ?? null;
  return (
    <Card data-testid={`report-${test}`}>
      <CardHeader className="gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {rows && rows.length > 0 && (
          <Select value={String(current!.id)} onValueChange={setId}>
            <SelectTrigger className="w-full sm:w-72" aria-label={`${title} session`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rows.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {fmtDateTime(new Date(r.ts))} · {fmtScore(test, r.score)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !current ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          render(current)
        )}
      </CardContent>
    </Card>
  );
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const num = (v: unknown) => (typeof v === "number" ? v : 0);

export default function Report() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly report</h1>
        <p className="text-sm text-muted-foreground">Trial-level views of a single session. Pick a session from each list.</p>
      </div>
      <Section
        test="pvt"
        title="PVT reaction times"
        description="Histogram of individual trials (25 ms bins) and a strip of every trial."
        render={(r) => <PvtHistogram rts={arr<number>(r.extra.rts)} />}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section
          test="nback"
          title="2-back breakdown"
          description="Hits and correct rejections are good; misses and false alarms are errors."
          render={(r) => (
            <div className="space-y-2">
              <NbackBars hits={num(r.extra.hits)} misses={num(r.extra.misses)} falseAlarms={num(r.extra.falseAlarms)} correctRejections={num(r.extra.correctRejections)} />
              <p className="text-sm text-muted-foreground">
                Hit rate {num(r.extra.hitRate).toFixed(1)}% − false-alarm rate {num(r.extra.falseAlarmRate).toFixed(1)}% = score {r.score}
              </p>
            </div>
          )}
        />
        <Section
          test="stroop"
          title="Stroop: congruent vs incongruent"
          description="Correct-trial RTs per condition; the gap between means is the interference effect."
          render={(r) => (
            <div className="space-y-2">
              <StroopStrips trials={arr(r.extra.trials)} />
              <p className="text-sm text-muted-foreground">Interference {String(r.extra.interference ?? "—")} ms · accuracy {num(r.extra.accuracy)}%</p>
            </div>
          )}
        />
      </div>
    </div>
  );
}
