import { shuffle, type Rng } from "./rng";

export const UNLOCK_MS = 24 * 60 * 60 * 1000;
export const LIST_SIZE = 20;

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export const normalizeWord = (w: string) => w.trim().toLowerCase();

/** Does `guess` count as `target`? Exact (normalised), or 1 edit when the target has 5+ letters. */
export function wordMatches(target: string, guess: string): boolean {
  const t = normalizeWord(target);
  const g = normalizeWord(guess);
  if (!g) return false;
  if (t === g) return true;
  return t.length >= 5 && levenshtein(t, g) <= 1;
}

/** Split textarea input into candidate words (one per line; commas tolerated). */
export function splitRecall(text: string): string[] {
  return text.split(/[\n,]+/).map(normalizeWord).filter(Boolean);
}

/** Each target is credited at most once; duplicate guesses are ignored. Exact matches win over fuzzy. */
export function matchRecall(targets: readonly string[], guesses: readonly string[]): { score: number; matched: string[] } {
  const unique = [...new Set(guesses.map(normalizeWord).filter(Boolean))];
  const remaining = new Set(targets.map(normalizeWord));
  const matched: string[] = [];
  const pending: string[] = [];
  for (const g of unique) {
    if (remaining.has(g)) {
      remaining.delete(g);
      matched.push(g);
    } else pending.push(g);
  }
  for (const g of pending) {
    for (const t of remaining) {
      if (wordMatches(t, g)) {
        remaining.delete(t);
        matched.push(t);
        break;
      }
    }
  }
  return { score: matched.length, matched };
}

export function unlockAt(createdAt: number): number {
  return createdAt + UNLOCK_MS;
}

export function isUnlocked(createdAt: number, now: number): boolean {
  return now >= unlockAt(createdAt);
}

export function daysElapsed(createdAt: number, now: number): number {
  return Math.round(((now - createdAt) / 86_400_000) * 10) / 10;
}

/** Pick `n` words from the pool that are not in `used`. Throws if the pool is exhausted. */
export function pickUnused(pool: readonly string[], used: ReadonlySet<string>, n: number, rng: Rng): string[] {
  const available = [...new Set(pool.map(normalizeWord))].filter((w) => !used.has(w));
  if (available.length < n) throw new Error(`word pool exhausted: ${available.length} left, need ${n}`);
  return shuffle(available, rng).slice(0, n);
}
