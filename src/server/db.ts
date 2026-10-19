import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const MIGRATIONS: string[] = [
  `CREATE TABLE results (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     ts INTEGER NOT NULL,
     test TEXT NOT NULL,
     score REAL NOT NULL,
     extra_json TEXT NOT NULL DEFAULT '{}'
   );
   CREATE INDEX results_test_ts ON results(test, ts);
   CREATE TABLE word_lists (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     created_at INTEGER NOT NULL,
     words_json TEXT NOT NULL,
     immediate_score INTEGER,
     recalled_at INTEGER,
     delayed_score INTEGER,
     days_elapsed REAL
   );
   CREATE TABLE used_words (word TEXT PRIMARY KEY);`,
];

export function openDb(path: string): Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true, strict: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

export function migrate(db: Database): void {
  const { user_version } = db.query("PRAGMA user_version").get() as { user_version: number };
  for (let v = user_version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.run(MIGRATIONS[v]);
      db.run(`PRAGMA user_version = ${v + 1}`);
    })();
  }
}

export interface ResultDbRow {
  id: number;
  ts: number;
  test: string;
  score: number;
  extra_json: string;
}

export interface WordListDbRow {
  id: number;
  created_at: number;
  words_json: string;
  immediate_score: number | null;
  recalled_at: number | null;
  delayed_score: number | null;
  days_elapsed: number | null;
}
