import { describe, expect, it } from "bun:test";
import { movingAverage, pctChange, trackSummary } from "@shared/scoring/stats";

describe("tracking stats", () => {
  it("handles zero entries", () => {
    expect(trackSummary([], "higher")).toEqual({ n: 0, baseline: null, baselineComplete: false, latest3: null, best: null, pctChange: null });
  });
  it("handles one entry", () => {
    const s = trackSummary([null, 5, null], "higher");
    expect(s).toMatchObject({ n: 1, baseline: 5, latest3: 5, best: 5, pctChange: null, baselineComplete: false });
  });
  it("handles two entries (incomplete baseline)", () => {
    const s = trackSummary([4, 6], "higher");
    expect(s).toMatchObject({ n: 2, baseline: 5, latest3: 5, baselineComplete: false, pctChange: 0 });
  });
  it("computes baseline, latest-3, best and direction-aware % change", () => {
    const rt = [300, 310, 290, 280, 270, 260, 250, 240, 230, 220];
    const s = trackSummary(rt, "lower");
    expect(s.baseline).toBe(300);
    expect(s.latest3).toBe(230);
    expect(s.best).toBe(220);
    expect(s.pctChange).toBeCloseTo(23.33, 1); // faster = improving = positive
    expect(pctChange(330, 300, "lower")).toBeCloseTo(-10);
    expect(pctChange(6, 5, "higher")).toBeCloseTo(20);
  });
  it("moving average is trailing", () => {
    expect(movingAverage([1, 2, 3, 4, 5, 6], 5)).toEqual([1, 1.5, 2, 2.5, 3, 4]);
  });
});
