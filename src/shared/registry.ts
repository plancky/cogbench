/** Static metadata for every result series and test flow. */

export const SERIES = [
  "digit_span",
  "corsi",
  "nback",
  "word_immediate",
  "word_delayed",
  "pvt",
  "stroop",
] as const;
export type SeriesId = (typeof SERIES)[number];

/** Runnable test flows. Word recall's study+immediate flow writes `word_immediate`. */
export const FLOWS = ["digit_span", "corsi", "nback", "word", "pvt", "stroop"] as const;
export type FlowId = (typeof FLOWS)[number];

export type Direction = "higher" | "lower";

export interface SeriesMeta {
  id: SeriesId;
  name: string;
  area: "Memory" | "Focus";
  cadence: "Daily" | "Weekly";
  direction: Direction;
  unit: string;
  description: string;
  /** Flow that produces this series (delayed recall is started from a saved list). */
  flow: FlowId | null;
}

export const SERIES_META: Record<SeriesId, SeriesMeta> = {
  digit_span: {
    id: "digit_span", name: "Digit Span", area: "Memory", cadence: "Daily", direction: "higher",
    unit: "digits", flow: "digit_span",
    description: "Short-term and working memory: repeat digits forwards, then backwards.",
  },
  corsi: {
    id: "corsi", name: "Corsi Span", area: "Memory", cadence: "Weekly", direction: "higher",
    unit: "squares", flow: "corsi",
    description: "Visual-spatial memory: tap the flashed squares in order.",
  },
  nback: {
    id: "nback", name: "2-back", area: "Memory", cadence: "Weekly", direction: "higher",
    unit: "pts", flow: "nback",
    description: "Working memory: spot letters that match the one two steps back.",
  },
  word_immediate: {
    id: "word_immediate", name: "Immediate Recall", area: "Memory", cadence: "Weekly",
    direction: "higher", unit: "/20", flow: "word",
    description: "Long-term memory: study 20 words, then recall them after a distractor.",
  },
  word_delayed: {
    id: "word_delayed", name: "Delayed Recall", area: "Memory", cadence: "Weekly",
    direction: "higher", unit: "/20", flow: null,
    description: "Recall a saved word list a day or more later.",
  },
  pvt: {
    id: "pvt", name: "PVT", area: "Focus", cadence: "Daily", direction: "lower", unit: "ms",
    flow: "pvt",
    description: "Sustained attention: react as fast as you can when the counter starts.",
  },
  stroop: {
    id: "stroop", name: "Stroop", area: "Focus", cadence: "Daily", direction: "lower", unit: "ms",
    flow: "stroop",
    description: "Selective attention: name the ink colour, not the word.",
  },
};

export const FLOW_NAMES: Record<FlowId, string> = {
  digit_span: "Digit Span",
  corsi: "Corsi Span",
  nback: "2-back",
  word: "Word Recall",
  pvt: "Psychomotor Vigilance",
  stroop: "Stroop",
};

export const DAILY_FLOWS: FlowId[] = ["digit_span", "pvt", "stroop"];
export const WEEKLY_FLOWS: FlowId[] = ["digit_span", "corsi", "nback", "word", "pvt", "stroop"];

/** True when `a` is a better score than `b` for this direction. */
export function isBetter(direction: Direction, a: number, b: number): boolean {
  return direction === "higher" ? a > b : a < b;
}
