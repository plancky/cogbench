import { describe, expect, it } from "bun:test";
import { generateNback, markTargets, scoreNback } from "@shared/scoring/nback";
import { seeded } from "@shared/scoring/rng";

describe("2-back", () => {
  it("generates ~1/3 targets, none in the first two trials, flags match letters", () => {
    for (let seed = 1; seed < 30; seed++) {
      const trials = generateNback(45, seeded(seed));
      expect(trials).toHaveLength(45);
      expect(trials[0].isTarget || trials[1].isTarget).toBe(false);
      expect(trials.filter((t) => t.isTarget)).toHaveLength(15);
      const truth = markTargets(trials.map((t) => t.letter));
      expect(truth).toEqual(trials.map((t) => t.isTarget));
    }
  });

  it("scores hit rate minus false alarm rate", () => {
    const trials = [
      ...Array(10).fill({ isTarget: true, responded: true }),
      ...Array(5).fill({ isTarget: true, responded: false }),
      ...Array(3).fill({ isTarget: false, responded: true }),
      ...Array(27).fill({ isTarget: false, responded: false }),
    ];
    const s = scoreNback(trials);
    expect(s).toMatchObject({ hits: 10, misses: 5, falseAlarms: 3, correctRejections: 27 });
    expect(s.hitRate).toBeCloseTo(66.7, 1);
    expect(s.falseAlarmRate).toBe(10);
    expect(s.score).toBeCloseTo(56.7, 1);
  });

  it("is bounded to -100..100", () => {
    expect(scoreNback([{ isTarget: true, responded: true }, { isTarget: false, responded: false }]).score).toBe(100);
    expect(scoreNback([{ isTarget: true, responded: false }, { isTarget: false, responded: true }]).score).toBe(-100);
    expect(scoreNback([]).score).toBe(0);
  });
});
