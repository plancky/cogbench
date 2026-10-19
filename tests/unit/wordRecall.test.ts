import { describe, expect, it } from "bun:test";
import { UNLOCK_MS, daysElapsed, isUnlocked, levenshtein, matchRecall, pickUnused, splitRecall, wordMatches } from "@shared/scoring/wordRecall";
import { seeded } from "@shared/scoring/rng";
import { WORD_POOL } from "@shared/words";

describe("Levenshtein matching", () => {
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });

  it("tolerates 1 edit only for words of 5+ letters", () => {
    expect(wordMatches("candle", "candel")).toBe(false); // transposition = 2 edits
    expect(wordMatches("candle", "candl")).toBe(true);
    expect(wordMatches("candle", "kandle")).toBe(true);
    expect(wordMatches("piano", "pian")).toBe(true);
    expect(wordMatches("lamp", "lamb")).toBe(false);
    expect(wordMatches("lamp", " LAMP ")).toBe(true);
  });

  it("is case-insensitive, trimmed, ignores duplicates, credits each target once", () => {
    const targets = ["apple", "candle", "dog"];
    expect(matchRecall(targets, ["Apple", " apple", "APPLE"]).score).toBe(1);
    expect(matchRecall(targets, ["candle", "candl"]).score).toBe(1);
    expect(matchRecall(targets, ["dog", "dig", "", "cat"]).score).toBe(1);
    expect(matchRecall(targets, splitRecall("apple\ncandle\n\ndog\n")).score).toBe(3);
  });

  it("prefers exact matches over fuzzy ones", () => {
    // "camel" is 1 edit from "camels" but "camels" is not a target; both targets present exactly.
    const r = matchRecall(["camel", "cameo"], ["camel", "cameo"]);
    expect(r.score).toBe(2);
  });
});

describe("24-hour unlock", () => {
  const t0 = 1_700_000_000_000;
  it("unlocks exactly at 24h", () => {
    expect(isUnlocked(t0, t0 + UNLOCK_MS - 1)).toBe(false);
    expect(isUnlocked(t0, t0 + UNLOCK_MS)).toBe(true);
  });
  it("reports days elapsed to one decimal", () => {
    expect(daysElapsed(t0, t0 + 7 * 86_400_000 + 3_600_000)).toBe(7);
    expect(daysElapsed(t0, t0 + 1.5 * 86_400_000)).toBe(1.5);
  });
});

describe("word pool", () => {
  it("has at least 200 unique words", () => {
    expect(new Set(WORD_POOL).size).toBeGreaterThanOrEqual(200);
  });
  it("never reuses words across lists", () => {
    const used = new Set<string>();
    const rng = seeded(9);
    const lists = Math.floor(WORD_POOL.length / 20);
    for (let i = 0; i < lists; i++) {
      const words = pickUnused(WORD_POOL, used, 20, rng);
      expect(new Set(words).size).toBe(20);
      for (const w of words) {
        expect(used.has(w)).toBe(false);
        used.add(w);
      }
    }
    expect(() => pickUnused(WORD_POOL, used, 20, rng)).toThrow(/exhausted/);
  });
});
