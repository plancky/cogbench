import { mean, median } from "./stats";

export const PVT_LAPSE_MS = 500;

export interface PvtSummary {
  median: number;
  mean: number;
  lapses: number;
  falseStarts: number;
  rts: number[];
}

export function summarizePvt(rts: readonly number[], falseStarts: number): PvtSummary {
  return {
    median: Math.round(median(rts) ?? 0),
    mean: Math.round(mean(rts) ?? 0),
    lapses: rts.filter((r) => r > PVT_LAPSE_MS).length,
    falseStarts,
    rts: rts.map((r) => Math.round(r)),
  };
}

/**
 * Pure PVT trial bookkeeping. The engine reports presses; a press before the
 * stimulus onset (or with no onset yet) is a false start and the trial restarts.
 */
export class PvtSession {
  rts: number[] = [];
  falseStarts = 0;
  constructor(readonly trials = 20) {}

  get done(): boolean {
    return this.rts.length >= this.trials;
  }

  press(time: number, onset: number | null): { kind: "false_start" } | { kind: "response"; rt: number } {
    if (onset === null || time < onset) {
      this.falseStarts++;
      return { kind: "false_start" };
    }
    const rt = time - onset;
    this.rts.push(rt);
    return { kind: "response", rt };
  }

  summary(): PvtSummary {
    return summarizePvt(this.rts, this.falseStarts);
  }
}
