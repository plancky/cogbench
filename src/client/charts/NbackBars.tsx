import { scaleBand, scaleLinear } from "d3-scale";
import { DataTable } from "./DataTable";
import { useResizeObserver } from "./useResizeObserver";

const M = { top: 4, right: 40, bottom: 4, left: 132 };

/** Horizontal bars for hits / misses / false alarms / correct rejections. Labels carry identity. */
export function NbackBars({ hits, misses, falseAlarms, correctRejections }: { hits: number; misses: number; falseAlarms: number; correctRejections: number }) {
  const [ref, width] = useResizeObserver<HTMLDivElement>();
  const rows = [
    { key: "Hits", v: hits, good: true },
    { key: "Misses", v: misses, good: false },
    { key: "False alarms", v: falseAlarms, good: false },
    { key: "Correct rejections", v: correctRejections, good: true },
  ];
  const height = 4 * 36 + M.top + M.bottom;
  const pw = Math.max(0, width - M.left - M.right);
  const y = scaleBand<string>().domain(rows.map((r) => r.key)).range([M.top, height - M.bottom]).padding(0.3);
  const x = scaleLinear().domain([0, Math.max(1, ...rows.map((r) => r.v))]).range([M.left, M.left + pw]);
  const bh = Math.min(24, y.bandwidth());
  const summary = `2-back breakdown: ${rows.map((r) => `${r.key} ${r.v}`).join(", ")}.`;
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={summary}>
          {rows.map((r) => {
            const by = y(r.key)! + (y.bandwidth() - bh) / 2;
            const w = x(r.v) - M.left;
            return (
              <g key={r.key}>
                <text x={M.left - 8} y={by + bh / 2} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--foreground)">
                  {r.key}
                </text>
                {w > 0 && <path d={roundedRight(M.left, by, w, bh, 4)} fill={r.good ? "var(--chart-1)" : "var(--chart-2)"} />}
                <text x={M.left + w + 6} y={by + bh / 2} dy="0.32em" fontSize={12} fill="var(--muted-foreground)" className="tabular-nums">
                  {r.v}
                </text>
              </g>
            );
          })}
          <line x1={M.left} x2={M.left} y1={M.top} y2={height - M.bottom} stroke="var(--chart-axis)" />
        </svg>
      )}
      <DataTable caption={summary} columns={["Outcome", "Count"]} rows={rows.map((r) => [r.key, r.v])} />
    </div>
  );
}

function roundedRight(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}
