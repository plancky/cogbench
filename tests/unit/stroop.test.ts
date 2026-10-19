import { describe, expect, it } from "bun:test";
import { generateStroop, summarizeStroop, type StroopResponse } from "@shared/scoring/stroop";
import { seeded } from "@shared/scoring/rng";

describe("Stroop", () => {
  it("generates exactly 50% congruent trials", () => {
    const t = generateStroop(40, seeded(3));
    expect(t.filter((x) => x.congruent)).toHaveLength(20);
    for (const x of t) expect(x.congruent).toBe(x.word === x.ink);
  });

  it("computes interference from correct trials only", () => {
    const mk = (congruent: boolean, rt: number, correct = true): StroopResponse => ({
      word: "RED", ink: congruent ? "RED" : "BLUE", congruent, response: correct ? (congruent ? "RED" : "BLUE") : "GREEN", correct, rt,
    });
    const s = summarizeStroop([mk(true, 500), mk(true, 600), mk(false, 700), mk(false, 800), mk(false, 2000, false)]);
    expect(s.congruentRt).toBe(550);
    expect(s.incongruentRt).toBe(750);
    expect(s.interference).toBe(200);
    expect(s.score).toBe(650);
    expect(s.accuracy).toBe(80);
  });

  it("interference is null when one condition has no correct trials", () => {
    const s = summarizeStroop([{ word: "RED", ink: "RED", congruent: true, response: "RED", correct: true, rt: 400 }]);
    expect(s.interference).toBeNull();
  });
});
