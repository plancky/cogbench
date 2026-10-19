/** HTML tooltip positioned over a chart container (React state; never used during tests). */
export function ChartTooltip({ x, y, containerWidth, children }: { x: number; y: number; containerWidth: number; children: React.ReactNode }) {
  const flip = x > containerWidth - 170;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
      style={{ left: flip ? undefined : x + 12, right: flip ? containerWidth - x + 12 : undefined, top: Math.max(0, y - 12) }}
    >
      {children}
    </div>
  );
}

export function LegendItem({ kind, color, label }: { kind: "line" | "dash" | "band" | "dot" | "square"; color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="18" height="10" aria-hidden="true">
        {kind === "line" && <line x1="1" x2="17" y1="5" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />}
        {kind === "dash" && <line x1="1" x2="17" y1="5" y2="5" stroke={color} strokeWidth="2" strokeDasharray="4 3" />}
        {kind === "band" && <rect x="1" y="1" width="16" height="8" fill={color} />}
        {kind === "dot" && <circle cx="9" cy="5" r="4" fill={color} />}
        {kind === "square" && <rect x="5" y="1" width="8" height="8" fill={color} />}
      </svg>
      {label}
    </span>
  );
}
