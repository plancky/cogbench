import { mean } from "./stats";
import { shuffle, type Rng } from "./rng";

export const STROOP_COLORS = ["RED", "BLUE", "GREEN", "YELLOW"] as const;
export type StroopColor = (typeof STROOP_COLORS)[number];

export interface StroopTrial {
  word: StroopColor;
  ink: StroopColor;
  congruent: boolean;
}

export interface StroopResponse extends StroopTrial {
  response: StroopColor | null;
  correct: boolean;
  rt: number | null;
}

/** Exactly half congruent (rounded down), shuffled, no identical consecutive stimuli. */
export function generateStroop(count: number, rng: Rng): StroopTrial[] {
  const nCong = Math.floor(count / 2);
  const flags = shuffle([...Array(nCong).fill(true), ...Array(count - nCong).fill(false)], rng) as boolean[];
  const out: StroopTrial[] = [];
  for (const congruent of flags) {
    for (;;) {
      const word = STROOP_COLORS[Math.floor(rng() * 4)];
      const others = STROOP_COLORS.filter((c) => c !== word);
      const ink = congruent ? word : others[Math.floor(rng() * 3)];
      const prev = out[out.length - 1];
      if (prev && prev.word === word && prev.ink === ink) continue;
      out.push({ word, ink, congruent });
      break;
    }
  }
  return out;
}

export interface StroopSummary {
  score: number; // mean RT on correct trials
  accuracy: number; // %
  congruentRt: number | null;
  incongruentRt: number | null;
  interference: number | null;
}

export function summarizeStroop(trials: readonly StroopResponse[]): StroopSummary {
  const correct = trials.filter((t) => t.correct && t.rt !== null);
  const rts = (xs: typeof correct) => xs.map((t) => t.rt as number);
  const cong = mean(rts(correct.filter((t) => t.congruent)));
  const incong = mean(rts(correct.filter((t) => !t.congruent)));
  const r = (v: number | null) => (v === null ? null : Math.round(v));
  return {
    score: Math.round(mean(rts(correct)) ?? 0),
    accuracy: trials.length ? Math.round((correct.length / trials.length) * 1000) / 10 : 0,
    congruentRt: r(cong),
    incongruentRt: r(incong),
    interference: cong !== null && incong !== null ? Math.round(incong - cong) : null,
  };
}
