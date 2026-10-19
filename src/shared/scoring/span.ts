import { randInt, shuffle, type Rng } from "./rng";

/**
 * Adaptive span staircase shared by Digit Span and Corsi:
 * start at `start`, two attempts per length, advance on any success,
 * stop after two failures at the same length (or when `max` is passed).
 */
export class SpanStaircase {
  length: number;
  failuresAtLength = 0;
  best = 0;
  done = false;

  constructor(
    readonly start = 3,
    readonly max = 12,
  ) {
    this.length = start;
  }

  /** Attempt number (1 or 2) for the current length. */
  get attempt(): number {
    return this.failuresAtLength + 1;
  }

  record(correct: boolean): void {
    if (this.done) throw new Error("staircase finished");
    if (correct) {
      this.best = Math.max(this.best, this.length);
      this.length += 1;
      this.failuresAtLength = 0;
      if (this.length > this.max) this.done = true;
    } else {
      this.failuresAtLength += 1;
      if (this.failuresAtLength >= 2) this.done = true;
    }
  }
}

/** Random digits 0-9 with no immediate repeats. */
export function generateDigits(length: number, rng: Rng): number[] {
  const out: number[] = [];
  while (out.length < length) {
    const d = randInt(rng, 0, 9);
    if (out.length && out[out.length - 1] === d) continue;
    out.push(d);
  }
  return out;
}

/** Corsi sequence over cells 0..cells-1, no repeated cells (length <= cells). */
export function generateCorsi(length: number, rng: Rng, cells = 9): number[] {
  return shuffle(Array.from({ length: cells }, (_, i) => i), rng).slice(0, Math.min(length, cells));
}

export function parseDigits(input: string): number[] {
  return [...input.replace(/\D/g, "")].map(Number);
}

export function sameSeq(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function expectedAnswer(seq: readonly number[], phase: "forward" | "backward" | "spatial"): number[] {
  return phase === "backward" ? seq.slice().reverse() : seq.slice();
}
