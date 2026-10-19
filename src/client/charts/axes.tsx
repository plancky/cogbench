/** React-rendered axes: D3 scales provide ticks/formatting, React owns the DOM. */

interface ContinuousScale {
  (v: number | Date): number;
  ticks(count?: number): (number | Date)[];
  tickFormat(count?: number, spec?: string): (d: number | Date) => string;
  range(): number[];
}

export function AxisBottom({
  scale,
  y,
  count,
  format,
  label,
}: {
  scale: ContinuousScale;
  y: number;
  count: number;
  format?: (d: number | Date) => string;
  label?: string;
}) {
  const ticks = scale.ticks(count);
  const fmt = format ?? scale.tickFormat(count);
  const [r0, r1] = scale.range();
  return (
    <g transform={`translate(0,${y})`} className="chart-axis" aria-hidden="true">
      <line x1={r0} x2={r1} stroke="var(--chart-axis)" />
      {ticks.map((t, i) => {
        const x = scale(t);
        // keep the first/last labels inside the plot so they never clip
        const anchor = x - r0 < 24 ? "start" : r1 - x < 24 ? "end" : "middle";
        return (
          <g key={i} transform={`translate(${x},0)`}>
            <line y2={4} stroke="var(--chart-axis)" />
            <text y={16} textAnchor={anchor} fontSize={11} fill="var(--muted-foreground)" className="tick-label">
              {fmt(t)}
            </text>
          </g>
        );
      })}
      {label && (
        <text x={r1} y={30} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
          {label}
        </text>
      )}
    </g>
  );
}

export function AxisLeft({
  scale,
  x,
  width,
  count = 4,
  format,
}: {
  scale: ContinuousScale;
  x: number;
  /** plot width, for gridlines */
  width: number;
  count?: number;
  format?: (d: number | Date) => string;
}) {
  const ticks = scale.ticks(count);
  const fmt = format ?? scale.tickFormat(count);
  return (
    <g className="chart-axis" aria-hidden="true">
      {ticks.map((t, i) => {
        const y = scale(t);
        return (
          <g key={i} transform={`translate(0,${y})`}>
            <line x1={x} x2={x + width} stroke="var(--chart-grid)" />
            <text x={x - 6} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted-foreground)" className="tick-label">
              {fmt(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Pick an x tick count that keeps labels apart at the current width. */
export const xTickCount = (plotWidth: number, labelPx = 72) => Math.max(2, Math.floor(plotWidth / labelPx));
