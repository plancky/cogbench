import { z } from "zod";
import { SERIES } from "./registry";

const num = z.number().finite();

export const spanTrialSchema = z.object({
  phase: z.enum(["forward", "backward", "spatial"]),
  length: z.number().int(),
  sequence: z.array(z.number().int()),
  answer: z.array(z.number().int()),
  correct: z.boolean(),
});

export const digitSpanExtra = z.object({
  forward: z.number().int().min(0),
  backward: z.number().int().min(0),
  trials: z.array(spanTrialSchema),
});

export const corsiExtra = z.object({ trials: z.array(spanTrialSchema) });

export const nbackExtra = z.object({
  hits: z.number().int().min(0),
  misses: z.number().int().min(0),
  falseAlarms: z.number().int().min(0),
  correctRejections: z.number().int().min(0),
  hitRate: num,
  falseAlarmRate: num,
  trials: z.array(z.object({ letter: z.string(), isTarget: z.boolean(), responded: z.boolean(), rt: num.nullable() })),
});

export const pvtExtra = z.object({
  median: num,
  mean: num,
  lapses: z.number().int().min(0),
  falseStarts: z.number().int().min(0),
  rts: z.array(num),
});

export const stroopExtra = z.object({
  accuracy: num,
  congruentRt: num.nullable(),
  incongruentRt: num.nullable(),
  interference: num.nullable(),
  trials: z.array(
    z.object({ word: z.string(), ink: z.string(), congruent: z.boolean(), response: z.string().nullable(), correct: z.boolean(), rt: num.nullable() }),
  ),
});

export const wordExtra = z.object({
  listId: z.number().int(),
  recalled: z.array(z.string()),
  daysElapsed: num.optional(),
});

export const EXTRA_SCHEMAS = {
  digit_span: digitSpanExtra,
  corsi: corsiExtra,
  nback: nbackExtra,
  pvt: pvtExtra,
  stroop: stroopExtra,
  word_immediate: wordExtra,
  word_delayed: wordExtra,
} as const;

export const seriesSchema = z.enum(SERIES);

export const resultInputSchema = z
  .object({
    test: seriesSchema,
    score: num,
    ts: z.number().int().positive().optional(),
    extra: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((v, ctx) => {
    const r = EXTRA_SCHEMAS[v.test].safeParse(v.extra);
    if (!r.success) ctx.addIssue({ code: "custom", message: `invalid extra for ${v.test}: ${r.error.message}`, path: ["extra"] });
  });
export type ResultInput = z.input<typeof resultInputSchema>;

export const resultsQuerySchema = z.object({
  test: seriesSchema.optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
});

export const recallInputSchema = z.object({
  recalled: z.array(z.string().max(100)).max(200),
  ts: z.number().int().positive().optional(),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  header: z.enum(["0", "1"]).optional(),
});

export const trackingQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(100000).optional(),
});

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number().optional(),
  results: z.array(z.object({ id: z.number().int(), ts: z.number().int(), test: z.string(), score: num, extra_json: z.string() })),
  word_lists: z.array(
    z.object({
      id: z.number().int(),
      created_at: z.number().int(),
      words_json: z.string(),
      immediate_score: z.number().int().nullable(),
      recalled_at: z.number().int().nullable(),
      delayed_score: z.number().int().nullable(),
      days_elapsed: num.nullable(),
    }),
  ),
  used_words: z.array(z.object({ word: z.string() })),
});
export type Backup = z.infer<typeof backupSchema>;
