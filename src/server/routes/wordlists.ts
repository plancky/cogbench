import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { idParamSchema, recallInputSchema } from "@shared/schemas";
import { WORD_POOL } from "@shared/words";
import { LIST_SIZE, daysElapsed, isUnlocked, matchRecall, pickUnused, unlockAt } from "@shared/scoring/wordRecall";
import type { PendingResponse, RecallResponse, WordListCreated } from "@shared/types";
import { insertResult, type Env } from "../app";
import type { WordListDbRow } from "../db";
import { jsonBody, parse } from "../validate";

export const wordlistRoutes = new Hono<Env>();

wordlistRoutes.post("/wordlists", (c) => {
  const { db, now, rng } = c.get("deps");
  const created = db.transaction((): WordListCreated => {
    const used = new Set((db.query("SELECT word FROM used_words").all() as { word: string }[]).map((r) => r.word));
    let words: string[];
    try {
      words = pickUnused(WORD_POOL, used, LIST_SIZE, rng);
    } catch (e) {
      throw new HTTPException(409, { message: (e as Error).message });
    }
    const ins = db.query("INSERT INTO used_words (word) VALUES (?)");
    for (const w of words) ins.run(w);
    const createdAt = now();
    const { id } = db
      .query("INSERT INTO word_lists (created_at, words_json) VALUES (?, ?) RETURNING id")
      .get(createdAt, JSON.stringify(words)) as { id: number };
    return { id, createdAt, words };
  })();
  return c.json(created, 201);
});

function getList(db: Database, id: number): WordListDbRow {
  const row = db.query("SELECT * FROM word_lists WHERE id = ?").get(id) as WordListDbRow | null;
  if (!row) throw new HTTPException(404, { message: "word list not found" });
  return row;
}

wordlistRoutes.post("/wordlists/:id/immediate", async (c) => {
  const { db, now } = c.get("deps");
  const { id } = parse(idParamSchema, c.req.param());
  const body = parse(recallInputSchema, await jsonBody(c));
  const list = getList(db, id);
  if (list.immediate_score !== null) throw new HTTPException(409, { message: "immediate recall already recorded" });
  const words = JSON.parse(list.words_json) as string[];
  const { score, matched } = matchRecall(words, body.recalled);
  const resultId = db.transaction(() => {
    db.query("UPDATE word_lists SET immediate_score = ? WHERE id = ?").run(score, id);
    return insertResult(db, body.ts ?? now(), "word_immediate", score, { listId: id, recalled: matched });
  })();
  return c.json({ score, total: words.length, matched, resultId } satisfies RecallResponse);
});

wordlistRoutes.get("/wordlists/pending", (c) => {
  const { db, now } = c.get("deps");
  const t = now();
  const rows = db
    .query("SELECT * FROM word_lists WHERE recalled_at IS NULL ORDER BY created_at ASC")
    .all() as WordListDbRow[];
  const res: PendingResponse = {
    now: t,
    lists: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      unlockAt: unlockAt(r.created_at),
      unlocked: isUnlocked(r.created_at, t),
      immediateScore: r.immediate_score,
    })),
  };
  return c.json(res);
});

wordlistRoutes.post("/wordlists/:id/recall", async (c) => {
  const { db, now } = c.get("deps");
  const { id } = parse(idParamSchema, c.req.param());
  const body = parse(recallInputSchema, await jsonBody(c));
  const list = getList(db, id);
  const t = now();
  if (list.recalled_at !== null) throw new HTTPException(409, { message: "list already recalled" });
  if (!isUnlocked(list.created_at, t)) throw new HTTPException(409, { message: `list unlocks at ${new Date(unlockAt(list.created_at)).toISOString()}` });
  const words = JSON.parse(list.words_json) as string[];
  const { score, matched } = matchRecall(words, body.recalled);
  const days = daysElapsed(list.created_at, t);
  const resultId = db.transaction(() => {
    db.query("UPDATE word_lists SET recalled_at = ?, delayed_score = ?, days_elapsed = ? WHERE id = ?").run(t, score, days, id);
    return insertResult(db, t, "word_delayed", score, { listId: id, recalled: matched, daysElapsed: days });
  })();
  return c.json({ score, total: words.length, matched, daysElapsed: days, resultId } satisfies RecallResponse);
});
