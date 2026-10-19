import { useState } from "react";
import { extent, mean } from "d3-array";
import { scaleLinear, scalePoint } from "d3-scale";
import { AxisLeft } from "./axes";
import { ChartTooltip, LegendItem } from "./ChartTooltip";
import { DataTable } from "./DataTable";
import { useResizeObserver } from "./useResizeObserver";

interface Trial {
  congruent: boolean;
  correct: boolean;
  rt: number | null;
  word: string;
  ink: string;
}

const M = { top: 24, right: 12, bottom: 28, left: 44 };

/** Congruent vs incongruent RT distributions side by side (correct trials), with means. */
export function StroopStrips({ trials, height = 280 }: { trials: Trial[]; height?: number }) {
  const [ref, width] = useResizeObserver<HTMLDivElement>();
  const [active, setActive] = useState<{ i: number; group: string } | null>(null);
  const ok = trials.filter((t) => t.correct && t.rt !== null) as (Trial & { rt: number })[];
  const groups = [
    { key: "Congruent", items: ok.filter((t) => t.congruent), color: "var(--chart-1)", shape: "circle" as const },
    { key: "Incongruent", items: ok.filter((t) => !t.congruent), color: "var(--chart-2)", shape: "square" as const },
  ];
  const pw = Math.max(0, width - M.left - M.right);
  const ph = height - M.top - M.bottom;
  const x = scalePoint<string>().domain(groups.map((g) => g.key)).range([M.left, M.left + pw]).padding(0.5);
  let [lo, hi] = (extent(ok, (t) => t.rt) as [number, number]) ?? [0, 1];
  if (lo === undefined) [lo, hi] = [300, 900];
  if (lo === hi) [lo, hi] = [lo - 50, hi + 50];
  const y = scaleLinear().domain([lo, hi]).nice(4).range([M.top + ph, M.top]);
  const spread = Math.min(60, pw / 6);
  const summary =
    `Stroop correct-trial RTs: ` +
    groups.map((g) => `${g.key} ${g.items.length} trials, mean ${Math.round(mean(g.items, (t) => t.rt) ?? 0)} ms`).join("; ") + ".";
  const at = active ? groups.find((g) => g.key === active.group)!.items[active.i] : null;
  // deterministic jitter so points don't move between renders
  const jitter = (i: number) => (((i * 7919) % 101) / 100 - 0.5) * 2 * spread;

  return (
    <div ref={ref} className="relative w-full">
      <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
        <LegendItem kind="dot" color="var(--chart-1)" label="Congruent" />
        <LegendItem kind="square" color="var(--chart-2)" label="Incongruent" />
        <LegendItem kind="line" color="var(--foreground)" label="Mean" />
      </div>
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={summary} onPointerLeave={() => setActive(null)}>
          <AxisLeft scale={y as never} x={M.left} width={pw} count={4} format={(v) => `${v}`} />
          <text x={M.left - 6} y={M.top - 10} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">ms</text>
          {groups.map((g) => {
            const cx = x(g.key)!;
            const m = mean(g.items, (t) => t.rt);
            return (
              <g key={g.key}>
                <text x={cx} y={M.top + ph + 18} textAnchor="middle" fontSize={12} fill="var(--foreground)">{g.key}</text>
                {g.items.map((t, i) => {
                  const px = cx + jitter(i);
                  const py = y(t.rt);
                  const props = {
                    fill: g.color,
                    stroke: "var(--background)",
                    strokeWidth: 2,
                    tabIndex: 0,
                    className: "outline-none focus-visible:stroke-[var(--foreground)]",
                    "aria-label": `${g.key} trial, ${t.word} in ${t.ink}: ${t.rt} ms`,
                    onFocus: () => setActive({ i, group: g.key }),
                    onBlur: () => setActive(null),
                    onPointerEnter: () => setActive({ i, group: g.key }),
                  };
                  return g.shape === "circle" ? <circle key={i} cx={px} cy={py} r={4.5} {...props} /> : <rect key={i} x={px - 4.5} y={py - 4.5} width={9} height={9} {...props} />;
                })}
                {m !== undefined && (
                  <g aria-hidden="true">
                    <line x1={cx - spread - 8} x2={cx + spread + 8} y1={y(m)} y2={y(m)} stroke="var(--foreground)" strokeWidth={2} />
                    <text x={cx + spread + 10} y={y(m)} dy="0.32em" fontSize={11} fill="var(--muted-foreground)">{Math.round(m)}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {at && active && (
        <ChartTooltip x={x(active.group)! + jitter(active.i)} y={y(at.rt)} containerWidth={width}>
          <div className="font-medium">{active.group}</div>
          <div>{at.word} in {at.ink.toLowerCase()} ink</div>
          <div className="tabular-nums">{at.rt} ms</div>
        </ChartTooltip>
      )}
      <DataTable caption={summary} columns={["Condition", "Word", "Ink", "RT (ms)"]} rows={ok.map((t) => [t.congruent ? "Congruent" : "Incongruent", t.word, t.ink, t.rt])} />
    </div>
  );
}
