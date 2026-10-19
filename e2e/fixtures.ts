import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

const DAY = 86_400_000;

export async function restore(request: APIRequestContext, backup: unknown) {
  const res = await request.post("/api/restore", { data: backup });
  expect(res.ok(), await res.text()).toBe(true);
}

export const EMPTY = { version: 1, results: [], word_lists: [], used_words: [] };

/** Collect console errors and uncaught exceptions for a page. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

function extraFor(test: string, score: number, i: number) {
  switch (test) {
    case "digit_span":
      return { forward: Math.ceil(score / 2), backward: Math.floor(score / 2), trials: [] };
    case "corsi":
      return { trials: [] };
    case "nback": {
      const hits = 8 + (i % 7), falseAlarms = i % 4;
      return { hits, misses: 15 - hits, falseAlarms, correctRejections: 30 - falseAlarms, hitRate: (hits / 15) * 100, falseAlarmRate: (falseAlarms / 30) * 100, trials: [] };
    }
    case "pvt": {
      const rts = Array.from({ length: 20 }, (_, k) => Math.round(score - 60 + ((k * 37 + i * 11) % 120) + (k === 7 ? 260 : 0)));
      return { median: score, mean: score + 12, lapses: rts.filter((r) => r > 500).length, falseStarts: i % 3, rts };
    }
    case "stroop": {
      const trials = Array.from({ length: 40 }, (_, k) => {
        const congruent = k % 2 === 0;
        const ink = ["RED", "BLUE", "GREEN", "YELLOW"][k % 4];
        return { word: congruent ? ink : "RED", ink, congruent, response: ink, correct: k % 13 !== 0, rt: Math.round(score + (congruent ? -40 : 40) + ((k * 53) % 90) - 45) };
      });
      return { accuracy: 92.5 + (i % 3), congruentRt: score - 40, incongruentRt: score + 40, interference: 80 - (i % 20), trials };
    }
    default:
      return { listId: 1, recalled: [], daysElapsed: 7 };
  }
}

/** n days of results for every series, ending yesterday, with plausible trends. */
export function seededBackup(n: number, now = Date.now()) {
  const results: { id: number; ts: number; test: string; score: number; extra_json: string }[] = [];
  let id = 1;
  for (let i = 0; i < n; i++) {
    const ts = now - (n - i) * DAY;
    const wobble = Math.sin(i * 1.7);
    const rows: [string, number][] = [
      ["digit_span", Math.round(11 + i / 8 + wobble)],
      ["corsi", Math.round(5 + i / 15 + wobble * 0.6)],
      ["nback", Math.round((40 + i * 0.8 + wobble * 8) * 10) / 10],
      ["pvt", Math.round(290 - i * 1.2 + wobble * 15)],
      ["stroop", Math.round(720 - i * 3 + wobble * 25)],
      ["word_immediate", Math.min(20, Math.round(11 + i / 6 + wobble))],
      ["word_delayed", Math.min(20, Math.round(7 + i / 7 + wobble))],
    ];
    for (const [test, score] of rows) {
      results.push({ id: id++, ts: ts + id * 1000, test, score, extra_json: JSON.stringify(extraFor(test, score, i)) });
    }
  }
  return { version: 1, results, word_lists: [], used_words: [] };
}

/** A word list studied two days ago, ready for delayed recall. */
export function pendingListBackup(words: string[], now = Date.now()) {
  return {
    version: 1,
    results: [],
    word_lists: [{ id: 7, created_at: now - 2 * DAY, words_json: JSON.stringify(words), immediate_score: 12, recalled_at: null, delayed_score: null, days_elapsed: null }],
    used_words: words.map((word) => ({ word })),
  };
}
