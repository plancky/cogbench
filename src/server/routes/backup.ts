import { Hono } from "hono";
import { backupSchema, type Backup } from "@shared/schemas";
import type { Env } from "../app";
import { jsonBody, parse } from "../validate";

export const backupRoutes = new Hono<Env>();

backupRoutes.get("/backup", (c) => {
  const { db, now } = c.get("deps");
  const backup: Backup = {
    version: 1,
    exportedAt: now(),
    results: db.query("SELECT id, ts, test, score, extra_json FROM results ORDER BY id").all() as Backup["results"],
    word_lists: db.query("SELECT * FROM word_lists ORDER BY id").all() as Backup["word_lists"],
    used_words: db.query("SELECT word FROM used_words ORDER BY word").all() as Backup["used_words"],
  };
  return c.json(backup, 200, { "Content-Disposition": `attachment; filename="cogbench-backup.json"` });
});

/** Replaces all data with the backup contents, atomically. */
backupRoutes.post("/restore", async (c) => {
  const { db } = c.get("deps");
  const b = parse(backupSchema, await jsonBody(c));
  db.transaction(() => {
    db.run("DELETE FROM results");
    db.run("DELETE FROM word_lists");
    db.run("DELETE FROM used_words");
    const r = db.query("INSERT INTO results (id, ts, test, score, extra_json) VALUES (?, ?, ?, ?, ?)");
    for (const x of b.results) r.run(x.id, x.ts, x.test, x.score, x.extra_json);
    const w = db.query(
      "INSERT INTO word_lists (id, created_at, words_json, immediate_score, recalled_at, delayed_score, days_elapsed) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const x of b.word_lists) w.run(x.id, x.created_at, x.words_json, x.immediate_score, x.recalled_at, x.delayed_score, x.days_elapsed);
    const u = db.query("INSERT OR IGNORE INTO used_words (word) VALUES (?)");
    for (const x of b.used_words) u.run(x.word);
  })();
  return c.json({ ok: true, results: b.results.length, word_lists: b.word_lists.length, used_words: b.used_words.length });
});
