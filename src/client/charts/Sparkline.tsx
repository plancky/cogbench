import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import type { Direction } from "@shared/registry";
import { useResizeObserver } from "./useResizeObserver";

/** Last-N trend, no axes. Higher on the chart always means a higher raw value. */
export function Sparkline({ values, label, direction, height = 36 }: { values: number[]; label: string; direction: Direction; height?: number }) {
  const [ref, width] = useResizeObserver<HTMLDivElement>();
  const pad = 5;
  const summary =
    values.length === 0
      ? `${label}: no results yet`
      : `${label}: last ${values.length} results, from ${values[0]} to ${values.at(-1)}, range ${Math.min(...values)}–${Math.max(...values)} (${direction} is better)`;
  let path: string | null = null;
  let last: [number, number] | null = null;
  if (width > 0 && values.length > 0) {
    const [lo, hi] = extent(values) as [number, number];
    const x = scaleLinear().domain([0, Math.max(1, values.length - 1)]).range([pad, width - pad]);
    const y = scaleLinear().domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]).range([height - pad, pad]);
    path = line<number>().x((_, i) => x(i)).y((v) => y(v))(values);
    last = [x(values.length - 1), y(values.at(-1)!)];
  }
  return (
    <div ref={ref} className="h-9 w-full">
      <svg width={width} height={height} role="img" aria-label={summary}>
        {path && <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {last && <circle cx={last[0]} cy={last[1]} r={3.5} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />}
      </svg>
    </div>
  );
}
