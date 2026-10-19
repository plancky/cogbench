import { useMemo, useRef, useState } from "react";
import { bisector, extent } from "d3-array";
import { scaleLinear, scaleTime } from "d3-scale";
import { line } from "d3-shape";
import type { Direction } from "@shared/registry";
import { best, mean, movingAverage, stdev } from "@shared/scoring/stats";
import { fmtDate, fmtShort } from "../lib/format";
import { AxisBottom, AxisLeft, xTickCount } from "./axes";
import { ChartTooltip, LegendItem } from "./ChartTooltip";
import { DataTable } from "./DataTable";
import { useResizeObserver } from "./useResizeObserver";

export interface TrendPoint {
  ts: number;
  score: number;
}

const M = { top: 16, right: 16, bottom: 28, left: 44 };
const byTs = bisector<TrendPoint, number>((p) => p.ts).center;

/**
 * Full trend: points + line, 5-session moving average, baseline band
 * (mean ± 1 SD of the first 3 sessions) and a dashed best-score marker.
 */
export function TrendChart({
  points,
  direction,
  name,
  format,
  height = 280,
}: {
  points: TrendPoint[];
  direction: Direction;
  name: string;
  format: (v: number) => string;
  height?: number;
}) {
  const [ref, width] = useResizeObserver<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);

  const model = useMemo(() => {
    const scores = points.map((p) => p.score);
    const ma = movingAverage(scores, 5);
    const base = scores.slice(0, 3);
    const baseMean = mean(base);
    const baseSd = stdev(base) ?? 0;
    return { scores, ma, baseMean, baseSd, baseN: base.length, best: best(scores, direction) };
  }, [points, direction]);

  const pw = Math.max(0, width - M.left - M.right);
  const ph = height - M.top - M.bottom;

  if (points.length === 0) {
    return (
      <div ref={ref} className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground" role="img" aria-label={`${name}: no results yet`}>
        No results yet. Run the test to start your trend.
      </div>
    );
  }

  const [t0, t1] = extent(points, (p) => p.ts) as [number, number];
  const day = 86_400_000;
  const x = scaleTime()
    .domain(t0 === t1 ? [t0 - day, t1 + day] : [t0, t1])
    .range([M.left, M.left + pw]);
  const yVals = [...model.scores, ...model.ma];
  if (model.baseMean !== null) yVals.push(model.baseMean - model.baseSd, model.baseMean + model.baseSd);
  let [lo, hi] = extent(yVals) as [number, number];
  if (lo === hi) [lo, hi] = [lo - Math.max(1, Math.abs(lo) * 0.1), hi + Math.max(1, Math.abs(hi) * 0.1)];
  const y = scaleLinear().domain([lo, hi]).nice(4).range([M.top + ph, M.top]);

  const rawPath = line<TrendPoint>().x((p) => x(p.ts)).y((p) => y(p.score))(points);
  const maPath = line<number>().x((_, i) => x(points[i].ts)).y((v) => y(v))(model.ma);
  const xCount = xTickCount(pw, 80);
  const summary =
    `${name}: ${points.length} sessions from ${fmtDate(new Date(t0))} to ${fmtDate(new Date(t1))}. ` +
    `Latest ${format(points.at(-1)!.score)}, best ${format(model.best!)}, baseline ${model.baseMean === null ? "n/a" : format(Math.round(model.baseMean * 10) / 10)}` +
    ` (${direction === "lower" ? "lower" : "higher"} is better).`;

  const focusPoint = (i: number) => {
    const j = Math.max(0, Math.min(points.length - 1, i));
    dots.current[j]?.focus();
  };
  const a = active === null ? null : points[active];

  return (
    <div ref={ref} className="relative w-full">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <LegendItem kind="line" color="var(--chart-1)" label="Session score" />
        <LegendItem kind="line" color="var(--chart-2)" label="5-session average" />
        <LegendItem kind="band" color="var(--baseline-band)" label={model.baseN < 3 ? `Baseline (${model.baseN}/3 sessions)` : "Baseline (first 3, ±1 SD)"} />
        <LegendItem kind="dash" color="var(--foreground)" label="Best" />
      </div>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="group"
          aria-label={summary}
          onPointerLeave={() => setActive(null)}
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = e.clientX - r.left;
            if (px < M.left || px > M.left + pw) return;
            setActive(byTs(points, x.invert(px).getTime()));
          }}
        >
          <AxisLeft scale={y as never} x={M.left} width={pw} count={4} format={(v) => String(v)} />
          {model.baseMean !== null && (
            <g aria-hidden="true">
              <rect x={M.left} width={pw} y={y(model.baseMean + model.baseSd)} height={Math.max(2, y(model.baseMean - model.baseSd) - y(model.baseMean + model.baseSd))} fill="var(--baseline-band)" />
              <line x1={M.left} x2={M.left + pw} y1={y(model.baseMean)} y2={y(model.baseMean)} stroke="var(--chart-1)" strokeOpacity={0.35} />
            </g>
          )}
          {model.best !== null && (
            <g aria-hidden="true">
              <line x1={M.left} x2={M.left + pw} y1={y(model.best)} y2={y(model.best)} stroke="var(--foreground)" strokeDasharray="4 3" strokeOpacity={0.7} />
              <text x={M.left + 4} y={y(model.best) + (direction === "lower" ? 14 : -5)} fontSize={11} fill="var(--muted-foreground)">
                Best {format(model.best)}
              </text>
            </g>
          )}
          <AxisBottom scale={x as never} y={M.top + ph} count={xCount} format={(d) => fmtShort(d as Date)} />
          {rawPath && <path d={rawPath} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} strokeOpacity={0.6} strokeLinejoin="round" aria-hidden="true" />}
          {maPath && points.length > 1 && <path d={maPath} fill="none" stroke="var(--chart-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" />}
          {a && <line x1={x(a.ts)} x2={x(a.ts)} y1={M.top} y2={M.top + ph} stroke="var(--chart-axis)" aria-hidden="true" />}
          {points.map((p, i) => (
            <circle
              key={i}
              ref={(el) => {
                dots.current[i] = el;
              }}
              cx={x(p.ts)}
              cy={y(p.score)}
              r={active === i ? 6 : 4}
              fill="var(--chart-1)"
              stroke="var(--card)"
              strokeWidth={2}
              tabIndex={0}
              className="chart-point outline-none focus-visible:stroke-[var(--foreground)]"
              aria-label={`${fmtDate(new Date(p.ts))}: ${format(p.score)}, 5-session average ${format(Math.round(model.ma[i] * 10) / 10)}`}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") (e.preventDefault(), focusPoint(i + 1));
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") (e.preventDefault(), focusPoint(i - 1));
                if (e.key === "Home") (e.preventDefault(), focusPoint(0));
                if (e.key === "End") (e.preventDefault(), focusPoint(points.length - 1));
              }}
            />
          ))}
        </svg>
      )}
      {a && active !== null && (
        <ChartTooltip x={x(a.ts)} y={y(a.score) + 24} containerWidth={width}>
          <div className="font-medium">{fmtDate(new Date(a.ts))}</div>
          <div>Score: <span className="tabular-nums">{format(a.score)}</span></div>
          <div className="text-muted-foreground">5-session avg: {format(Math.round(model.ma[active] * 10) / 10)}</div>
          {model.baseMean !== null && (
            <div className="text-muted-foreground">Baseline: {format(Math.round(model.baseMean * 10) / 10)}</div>
          )}
        </ChartTooltip>
      )}
      <DataTable
        caption={summary}
        columns={["Date", "Score", "5-session average"]}
        rows={points.map((p, i) => [fmtDate(new Date(p.ts)), p.score, Math.round(model.ma[i] * 10) / 10])}
      />
    </div>
  );
}
