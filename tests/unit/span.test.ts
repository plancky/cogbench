import { describe, expect, it } from "bun:test";
import { SpanStaircase, expectedAnswer, generateCorsi, generateDigits, parseDigits, sameSeq } from "@shared/scoring/span";
import { seeded } from "@shared/scoring/rng";

function run(outcomes: boolean[], max?: number) {
  const s = new SpanStaircase(3, max);
  const lengths: number[] = [];
  for (const o of outcomes) {
    if (s.done) break;
    lengths.push(s.length);
    s.record(o);
  }
  return { s, lengths };
}

describe("span staircase (digit span + Corsi)", () => {
  it("starts at 3 and advances on first-attempt success", () => {
    const { s, lengths } = run([true, true, false, false]);
    expect(lengths).toEqual([3, 4, 5, 5]);
    expect(s.done).toBe(true);
    expect(s.best).toBe(4);
  });

  it("gives a second attempt and advances on success after one failure", () => {
    const { s, lengths } = run([false, true, false, true, false, false]);
    expect(lengths).toEqual([3, 3, 4, 4, 5, 5]);
    expect(s.best).toBe(4);
    expect(s.done).toBe(true);
  });

  it("ends after two failures at the same length", () => {
    const { s, lengths } = run([false, false, true]);
    expect(lengths).toEqual([3, 3]);
    expect(s.done).toBe(true);
    expect(s.best).toBe(0);
  });

  it("failures at different lengths do not end the phase", () => {
    const { s } = run([false, true, false, true]);
    expect(s.done).toBe(false);
    expect(s.length).toBe(5);
    expect(s.attempt).toBe(1);
  });

  it("stops past the max length (Corsi grid = 9)", () => {
    const { s } = run(Array(10).fill(true), 9);
    expect(s.done).toBe(true);
    expect(s.best).toBe(9);
  });

  it("throws if recorded after finishing", () => {
    const { s } = run([false, false]);
    expect(() => s.record(true)).toThrow();
  });
});

describe("sequences", () => {
  it("digits have no immediate repeats", () => {
    const rng = seeded(1);
    for (let i = 0; i < 200; i++) {
      const d = generateDigits(9, rng);
      expect(d).toHaveLength(9);
      for (let j = 1; j < d.length; j++) expect(d[j]).not.toBe(d[j - 1]);
    }
  });

  it("corsi sequences use distinct cells of a 3x3 grid", () => {
    const seq = generateCorsi(9, seeded(2));
    expect(new Set(seq).size).toBe(9);
    expect(Math.max(...seq)).toBeLessThan(9);
  });

  it("backward answers are reversed; parsing ignores separators", () => {
    expect(expectedAnswer([1, 2, 3], "backward")).toEqual([3, 2, 1]);
    expect(sameSeq(parseDigits("3 2,1"), [3, 2, 1])).toBe(true);
  });
});
