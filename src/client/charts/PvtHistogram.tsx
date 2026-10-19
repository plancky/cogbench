import { useState } from "react";
import { bin, max, median } from "d3-array";
import { scaleLinear } from "d3-scale";
import { AxisBottom, AxisLeft, xTickCount } from "./axes";
import { ChartTooltip } from "./ChartTooltip";
import { DataTable } from "./DataTable";
import { useResizeObserver } from "./useResizeObserver";

const M = { top: 30, right: 16, bottom: 52, left: 36 };

/** Reaction-time histogram (25 ms bins) with a strip of individual trials and the 500 ms lapse line. */
export function PvtHistogram({ rts, height = 240 }: { rts: number[]; height?: number }) {
  const [ref, width] = useResizeObserver<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const pw = Math.max(0, width - M.left - M.right);
  const ph = height - M.top - M.bottom;
  const hi = Math.max(600, Math.ceil(((max(rts) ?? 600) + 25) / 50) * 50);
  const x = scaleLinear().domain([100, hi]).range([M.left, M.left + pw]).clamp(true);
  const bins = bin().domain([100, hi]).thresholds(Math.ceil((hi - 100) / 25))(rts);
  const y = scaleLinear().domain([0, Math.max(1, max(bins, (b) => b.length) ?? 1)]).nice(3).range([M.top + ph, M.top]);
  const med = median(rts);
  const lapses = rts.filter((r) => r > 500).length;
  const summary = `PVT reaction times: ${rts.length} trials, median ${med ?? "n/a"} ms, ${lapses} lapses over 500 ms.`;
  const stripY = M.top + ph + 34;
  const ab = active === null ? null : bins[active];

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={summary} onPointerLeave={() => setActive(null)}>
          <AxisLeft scale={y as never} x={M.left} width={pw} count={3} format={(v) => String(v)} />
          {bins.map((b, i) => {
            const bx = x(b.x0!) + 1;
            const bw = Math.max(1, x(b.x1!) - x(b.x0!) - 2);
            const top = y(b.length);
            const h = M.top + ph - top;
            if (!b.length) return null;
            return (
              <path
                key={i}
                d={roundedTop(bx, top, bw, h, Math.min(4, bw / 2))}
                fill={b.x0! >= 500 ? "var(--chart-2)" : "var(--chart-1)"}
                tabIndex={0}
                className="outline-none focus-visible:stroke-[var(--foreground)]"
                aria-label={`${b.x0}–${b.x1} ms: ${b.length} trials`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            );
          })}
          <line x1={x(500)} x2={x(500)} y1={M.top - 8} y2={stripY + 6} stroke="var(--foreground)" strokeDasharray="4 3" aria-hidden="true" />
          <text x={x(500) + 4} y={M.top - 26} fontSize={11} fill="var(--muted-foreground)" dominantBaseline="hanging">Lapse &gt; 500 ms</text>
          {med !== undefined && (
            <g aria-hidden="true">
              <line x1={x(med)} x2={x(med)} y1={M.top - 8} y2={M.top + ph} stroke="var(--foreground)" strokeWidth={1.5} />
              <text x={x(med) - 4} y={M.top - 26} textAnchor="end" fontSize={11} fill="var(--muted-foreground)" dominantBaseline="hanging">median {Math.round(med)} ms</text>
            </g>
          )}
          <AxisBottom scale={x as never} y={M.top + ph} count={xTickCount(pw, 64)} format={(v) => String(v)} />
          <g aria-hidden="true">
            {rts.map((r, i) => (
              <line key={i} x1={x(r)} x2={x(r)} y1={stripY - 6} y2={stripY + 6} stroke={r > 500 ? "var(--chart-2)" : "var(--chart-1)"} strokeWidth={2} />
            ))}
            <text x={M.left} y={stripY + 18} fontSize={11} fill="var(--muted-foreground)">Each trial (ms)</text>
          </g>
        </svg>
      )}
      {ab && (
        <ChartTooltip x={x(ab.x0!)} y={y(ab.length)} containerWidth={width}>
          <div className="font-medium">{ab.x0}–{ab.x1} ms</div>
          <div>{ab.length} trial{ab.length === 1 ? "" : "s"}</div>
        </ChartTooltip>
      )}
      <DataTable caption={summary} columns={["Trial", "RT (ms)"]} rows={rts.map((r, i) => [i + 1, r])} />
    </div>
  );
}

/** Bar path with 4px rounded top corners, square at the baseline. */
export function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
