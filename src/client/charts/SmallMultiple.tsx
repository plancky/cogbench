import { useState } from "react";
import { scaleLinear, scaleTime } from "d3-scale";
import { line } from "d3-shape";
import { fmtDate, fmtPct, fmtShort } from "../lib/format";
import { AxisBottom, AxisLeft, xTickCount } from "./axes";
import { ChartTooltip } from "./ChartTooltip";
import { DataTable } from "./DataTable";
import { useResizeObserver } from "./useResizeObserver";

export interface PctPoint {
  ts: number;
  pct: number; // improvement vs baseline, + = better
  raw: string;
}

const M = { top: 10, right: 10, bottom: 24, left: 40 };

/** One panel of the progress grid. Up always means improving. Shared y domain across panels. */
export function SmallMultiple({
  title,
  points,
  domain,
  xDomain,
  height = 150,
}: {
  title: string;
  points: PctPoint[];
  domain: [number, number];
  xDomain: [number, number];
  height?: number;
}) {
  const [ref, width] = useResizeObserver<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const pw = Math.max(0, width - M.left - M.right);
  const ph = height - M.top - M.bottom;
  const x = scaleTime().domain(xDomain).range([M.left, M.left + pw]);
  const y = scaleLinear().domain(domain).range([M.top + ph, M.top]);
  const path = line<PctPoint>().x((p) => x(p.ts)).y((p) => y(p.pct))(points);
  const latest = points.at(-1);
  const summary = points.length
    ? `${title}: ${points.length} sessions in range; latest ${fmtPct(latest!.pct)} versus baseline (positive means improving).`
    : `${title}: no sessions in this range.`;
  const a = active === null ? null : points[active];

  return (
    <div className="min-w-0 rounded-lg border p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {latest ? (
            <>
              <span aria-hidden="true">{latest.pct > 0 ? "▲ " : latest.pct < 0 ? "▼ " : ""}</span>
              {fmtPct(latest.pct)}
            </>
          ) : (
            "no data"
          )}
        </span>
      </div>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg width={width} height={height} role="group" aria-label={summary} onPointerLeave={() => setActive(null)}>
            <AxisLeft scale={y as never} x={M.left} width={pw} count={3} format={(v) => `${v}%`} />
            <line x1={M.left} x2={M.left + pw} y1={y(0)} y2={y(0)} stroke="var(--chart-axis)" strokeWidth={1.5} aria-hidden="true" />
            <AxisBottom scale={x as never} y={M.top + ph} count={xTickCount(pw, 70)} format={(d) => fmtShort(d as Date)} />
            {path && points.length > 1 && <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" aria-hidden="true" />}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={x(p.ts)} cy={y(p.pct)} r={10} fill="transparent" onPointerEnter={() => setActive(i)} aria-hidden="true" />
                <circle
                  cx={x(p.ts)}
                  cy={y(p.pct)}
                  r={active === i ? 5 : 3.5}
                  fill="var(--chart-1)"
                  stroke="var(--background)"
                  strokeWidth={2}
                  tabIndex={0}
                  className="outline-none focus-visible:stroke-[var(--foreground)]"
                  aria-label={`${fmtDate(new Date(p.ts))}: ${p.raw}, ${fmtPct(p.pct)} versus baseline`}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onPointerEnter={() => setActive(i)}
                />
              </g>
            ))}
          </svg>
        )}
        {a && (
          <ChartTooltip x={x(a.ts)} y={y(a.pct) + 20} containerWidth={width}>
            <div className="font-medium">{fmtDate(new Date(a.ts))}</div>
            <div>Raw: <span className="tabular-nums">{a.raw}</span></div>
            <div className="text-muted-foreground">{fmtPct(a.pct)} vs baseline</div>
          </ChartTooltip>
        )}
      </div>
      <DataTable caption={summary} columns={["Date", "Raw value", "% vs baseline"]} rows={points.map((p) => [fmtDate(new Date(p.ts)), p.raw, fmtPct(p.pct)])} />
    </div>
  );
}
