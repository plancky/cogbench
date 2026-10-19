/**
 * `?fast=1` shortens delays and trial counts for automated smoke tests only.
 * Read once at startup; normal runs never see the fast values.
 */
export const FAST = typeof location !== "undefined" && new URLSearchParams(location.search).get("fast") === "1";

const normal = {
  digit: { onMs: 800, offMs: 200, maxLen: 12, preMs: 600 },
  corsi: { onMs: 600, gapMs: 300, maxLen: 9, preMs: 700 },
  nback: { practice: 10, trials: 45, stimMs: 500, gapMs: 1500, feedbackMs: 500 },
  word: { studyMs: 3000, distractorMs: 60_000 },
  pvt: { trials: 20, minDelayMs: 2000, maxDelayMs: 8000, feedbackMs: 1000, falseStartMs: 1200, timeoutMs: 30_000 },
  stroop: { practice: 6, trials: 40, fixationMs: 500, itiMs: 300, timeoutMs: 3000, feedbackMs: 600 },
};

const fast: typeof normal = {
  digit: { onMs: 80, offMs: 30, maxLen: 4, preMs: 50 },
  corsi: { onMs: 80, gapMs: 30, maxLen: 4, preMs: 50 },
  nback: { practice: 4, trials: 12, stimMs: 120, gapMs: 280, feedbackMs: 50 },
  word: { studyMs: 60, distractorMs: 1500 },
  pvt: { trials: 3, minDelayMs: 300, maxDelayMs: 600, feedbackMs: 100, falseStartMs: 200, timeoutMs: 5000 },
  stroop: { practice: 2, trials: 8, fixationMs: 60, itiMs: 40, timeoutMs: 3000, feedbackMs: 60 },
};

export const CFG = FAST ? fast : normal;

/** Test hook: exposes the expected answer to Playwright, only in fast mode. */
export function exposeForTest(data: Record<string, unknown> | null): void {
  if (FAST) (window as unknown as { __cogbenchTest: unknown }).__cogbenchTest = data;
}
