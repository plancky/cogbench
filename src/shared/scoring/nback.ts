import { shuffle, type Rng } from "./rng";

export const NBACK_LETTERS = "BCDFGHJKLMNPQRSTVXZ".split("");

export interface NbackTrial {
  letter: string;
  isTarget: boolean;
}

/** Letter stream where ~targetRate of all trials match the letter `n` back. */
export function generateNback(count: number, rng: Rng, n = 2, targetRate = 1 / 3): NbackTrial[] {
  const eligible = Array.from({ length: Math.max(0, count - n) }, (_, i) => i + n);
  const nTargets = Math.min(eligible.length, Math.round(count * targetRate));
  const targets = new Set(shuffle(eligible, rng).slice(0, nTargets));
  const out: NbackTrial[] = [];
  for (let i = 0; i < count; i++) {
    if (targets.has(i)) {
      out.push({ letter: out[i - n].letter, isTarget: true });
    } else {
      const forbidden = i >= n ? out[i - n].letter : null;
      const prev = i >= 1 ? out[i - 1].letter : null;
      const pool = NBACK_LETTERS.filter((l) => l !== forbidden && l !== prev);
      out.push({ letter: pool[Math.floor(rng() * pool.length)], isTarget: false });
    }
  }
  return out;
}

/** Recompute isTarget from the letters themselves (source of truth for scoring). */
export function markTargets(letters: readonly string[], n = 2): boolean[] {
  return letters.map((l, i) => i >= n && letters[i - n] === l);
}

export interface NbackScore {
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  hitRate: number; // %
  falseAlarmRate: number; // %
  score: number; // hitRate - falseAlarmRate, -100..100
}

export function scoreNback(trials: readonly { isTarget: boolean; responded: boolean }[]): NbackScore {
  let hits = 0, misses = 0, falseAlarms = 0, correctRejections = 0;
  for (const t of trials) {
    if (t.isTarget) t.responded ? hits++ : misses++;
    else t.responded ? falseAlarms++ : correctRejections++;
  }
  const targets = hits + misses;
  const nonTargets = falseAlarms + correctRejections;
  const hitRate = targets ? (hits / targets) * 100 : 0;
  const falseAlarmRate = nonTargets ? (falseAlarms / nonTargets) * 100 : 0;
  return {
    hits, misses, falseAlarms, correctRejections,
    hitRate: round1(hitRate),
    falseAlarmRate: round1(falseAlarmRate),
    score: round1(hitRate - falseAlarmRate),
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
