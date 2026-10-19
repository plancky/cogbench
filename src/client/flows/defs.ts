import type { FlowId, SeriesId } from "@shared/registry";
import type { ResultInput } from "@shared/schemas";
import { CFG } from "../lib/fast";
import { runCorsi } from "../engine/corsi";
import { runDigitSpan } from "../engine/digitSpan";
import { runNback } from "../engine/nback";
import { runPvt } from "../engine/pvt";
import { runStroop } from "../engine/stroop";

export interface FlowOutcome {
  series: SeriesId;
  score: number;
  unit: string;
  details: [string, string][];
  /** null for word recall, which is saved through the word-list endpoints. */
  payload: ResultInput | null;
}

export interface TimedFlow {
  kind: "timed";
  id: Exclude<FlowId, "word">;
  title: string;
  minutes: string;
  instructions: string[];
  run: (host: HTMLElement, signal: AbortSignal) => Promise<FlowOutcome>;
}

const fmt = (v: number | null, unit = "") => (v === null ? "—" : `${v}${unit}`);

export const TIMED_FLOWS: Record<TimedFlow["id"], TimedFlow> = {
  digit_span: {
    kind: "timed", id: "digit_span", title: "Digit Span", minutes: "3–5 min",
    instructions: [
      "Digits appear one at a time (one per second). When they stop, type them and press Enter.",
      "First forwards (same order), then backwards (reverse order).",
      "Lists start at 3 digits and grow by one when you get one right. Two misses at the same length end the phase.",
    ],
    run: async (host, signal) => {
      const r = await runDigitSpan(host, signal);
      const score = r.forward + r.backward;
      return {
        series: "digit_span", score, unit: "",
        details: [["Forward span", String(r.forward)], ["Backward span", String(r.backward)], ["Trials", String(r.trials.length)]],
        payload: { test: "digit_span", score, extra: { forward: r.forward, backward: r.backward, trials: r.trials } },
      };
    },
  },
  corsi: {
    kind: "timed", id: "corsi", title: "Corsi Span", minutes: "3–5 min",
    instructions: [
      "Squares in a 3×3 grid flash one after another.",
      "Then tap them in the same order. You can also use keys 1–9 (top-left = 1, row by row).",
      "Starts at 3 squares, two attempts per length; two misses at one length ends the test.",
    ],
    run: async (host, signal) => {
      const r = await runCorsi(host, signal);
      return {
        series: "corsi", score: r.span, unit: "",
        details: [["Longest span", String(r.span)], ["Trials", String(r.trials.length)]],
        payload: { test: "corsi", score: r.span, extra: { trials: r.trials } },
      };
    },
  },
  nback: {
    kind: "timed", id: "nback", title: "2-back", minutes: "2–3 min",
    instructions: [
      "Letters appear one at a time, every 2 seconds.",
      "Press Space (or tap the screen) when the letter is the same as the one two letters back.",
      "Example: B · K · B ← press. Don't press for other letters.",
      `A ${CFG.nback.practice}-letter practice with feedback comes first and is not scored.`,
    ],
    run: async (host, signal) => {
      const r = await runNback(host, signal);
      return {
        series: "nback", score: r.score, unit: "",
        details: [
          ["Hit rate", `${r.hitRate}%`], ["False alarm rate", `${r.falseAlarmRate}%`],
          ["Hits / misses", `${r.hits} / ${r.misses}`], ["False alarms / correct rejections", `${r.falseAlarms} / ${r.correctRejections}`],
        ],
        payload: { test: "nback", score: r.score, extra: r as unknown as Record<string, unknown> },
      };
    },
  },
  pvt: {
    kind: "timed", id: "pvt", title: "Psychomotor Vigilance", minutes: "~2 min",
    instructions: [
      "Keep your eyes on the screen. After a random 2–8 second wait, a counter starts.",
      "Press Space or tap the screen as fast as you can when it starts.",
      "Pressing too early is a false start; the trial restarts.",
    ],
    run: async (host, signal) => {
      const r = await runPvt(host, signal);
      return {
        series: "pvt", score: r.median, unit: " ms",
        details: [["Median RT", `${r.median} ms`], ["Mean RT", `${r.mean} ms`], ["Lapses (>500 ms)", String(r.lapses)], ["False starts", String(r.falseStarts)]],
        payload: { test: "pvt", score: r.median, extra: r as unknown as Record<string, unknown> },
      };
    },
  },
  stroop: {
    kind: "timed", id: "stroop", title: "Stroop", minutes: "~2 min",
    instructions: [
      "A colour word appears in coloured ink. Answer the INK colour, not the word.",
      "Keys: 1 = RED, 2 = BLUE, 3 = GREEN, 4 = YELLOW, or use the buttons.",
      "Be fast but accurate. 6 practice trials with feedback first.",
    ],
    run: async (host, signal) => {
      const r = await runStroop(host, signal);
      return {
        series: "stroop", score: r.score, unit: " ms",
        details: [
          ["Mean RT (correct)", `${r.score} ms`], ["Accuracy", `${r.accuracy}%`],
          ["Congruent RT", fmt(r.congruentRt, " ms")], ["Incongruent RT", fmt(r.incongruentRt, " ms")],
          ["Interference", fmt(r.interference, " ms")],
        ],
        payload: { test: "stroop", score: r.score, extra: r as unknown as Record<string, unknown> },
      };
    },
  },
};

export const WORD_INSTRUCTIONS = [
  "You'll see 20 words, one every 3 seconds. Picture each one.",
  "Then count backwards by 7 from a given number for 60 seconds (aloud or by typing).",
  "Then type every word you remember, one per line. Spelling slips are tolerated for longer words.",
  "The list is saved; come back after 24 hours or more (7 days is a good default) for delayed recall.",
];
