import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { EXPORT_HEADER } from "@shared/exportRow";
import { digitExtra, makeApp, pvtExtra, stroopExtra } from "./helpers";

const DAY = 86_400_000;
let t: ReturnType<typeof makeApp>;
beforeEach(() => (t = makeApp()));
afterEach(() => t.cleanup());

describe("database", () => {
  it("creates and migrates the SQLite file", () => {
    expect(existsSync(t.path)).toBe(true);
    const v = t.db.query("PRAGMA user_version").get() as { user_version: number };
    expect(v.user_version).toBe(1);
    const tables = (t.db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((r) => r.name);
    expect(tables).toEqual(expect.arrayContaining(["results", "word_lists", "used_words"]));
  });
});

describe("results", () => {
  it("POST validates and stores; GET filters and limits", async () => {
    expect((await t.req("POST", "/api/results", { test: "pvt", score: 250, extra: pvtExtra(250) })).status).toBe(201);
    expect((await t.req("POST", "/api/results", { test: "digit_span", score: 12, extra: digitExtra(7, 5) })).status).toBe(201);
    t.clock.t += 1000;
    await t.req("POST", "/api/results", { test: "pvt", score: 240, extra: pvtExtra(240) });

    const all = await t.req("GET", "/api/results");
    expect(all.data).toHaveLength(3);
    const pvt = await t.req("GET", "/api/results?test=pvt&limit=1");
    expect(pvt.data).toHaveLength(1);
    expect(pvt.data[0].score).toBe(240);
    expect(pvt.data[0].extra.median).toBe(240);
  });

  it("rejects bad input", async () => {
    expect((await t.req("POST", "/api/results", { test: "nope", score: 1 })).status).toBe(400);
    expect((await t.req("POST", "/api/results", { test: "pvt", score: "fast" })).status).toBe(400);
    expect((await t.req("POST", "/api/results", { test: "pvt", score: 1, extra: { median: 1 } })).status).toBe(400);
    expect((await t.req("GET", "/api/results?limit=0")).status).toBe(400);
    const raw = await t.app.request("/api/results", { method: "POST", body: "{not json" });
    expect(raw.status).toBe(400);
  });

  it("honours a client-supplied ts (retry queue)", async () => {
    const ts = t.clock.t - 3 * DAY;
    await t.req("POST", "/api/results", { test: "pvt", score: 300, ts, extra: pvtExtra(300) });
    expect((await t.req("GET", "/api/results")).data[0].ts).toBe(ts);
  });
});

describe("summary", () => {
  it("returns last, best (direction-aware), avg of last 5 and last 20", async () => {
    const scores = [300, 280, 320, 260, 290, 310, 270];
    for (const s of scores) {
      await t.req("POST", "/api/results", { test: "pvt", score: s, extra: pvtExtra(s) });
      t.clock.t += 1000;
    }
    for (let i = 0; i < 25; i++) {
      await t.req("POST", "/api/results", { test: "digit_span", score: i, extra: digitExtra(i, 0) });
      t.clock.t += 1000;
    }
    const { data } = await t.req("GET", "/api/summary");
    const pvt = data.find((d: any) => d.test === "pvt");
    expect(pvt).toMatchObject({ count: 7, last: 270, best: 260 });
    expect(pvt.avg5).toBeCloseTo((320 + 260 + 290 + 310 + 270) / 5, 1);
    const ds = data.find((d: any) => d.test === "digit_span");
    expect(ds.best).toBe(24);
    expect(ds.recent).toHaveLength(20);
    expect(ds.recent[0].score).toBe(5);
    const corsi = data.find((d: any) => d.test === "corsi");
    expect(corsi).toMatchObject({ count: 0, last: null, best: null, avg5: null, recent: [] });
  });
});

describe("word lists", () => {
  it("creates lists of 20 unused words and never reuses words", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const r = await t.req("POST", "/api/wordlists");
      expect(r.status).toBe(201);
      expect(r.data.words).toHaveLength(20);
      for (const w of r.data.words) {
        expect(seen.has(w)).toBe(false);
        seen.add(w);
      }
    }
    const used = t.db.query("SELECT COUNT(*) AS n FROM used_words").get() as { n: number };
    expect(used.n).toBe(200);
  });

  it("scores immediate recall and stores a result", async () => {
    const { data: list } = await t.req("POST", "/api/wordlists");
    const guess = [list.words[0], list.words[0].toUpperCase(), list.words[1], "zzzz"];
    const r = await t.req("POST", `/api/wordlists/${list.id}/immediate`, { recalled: guess });
    expect(r.status).toBe(200);
    expect(r.data.score).toBe(2);
    expect((await t.req("POST", `/api/wordlists/${list.id}/immediate`, { recalled: [] })).status).toBe(409);
    const res = await t.req("GET", "/api/results?test=word_immediate");
    expect(res.data[0]).toMatchObject({ score: 2 });
    expect((await t.req("POST", `/api/wordlists/999/immediate`, { recalled: [] })).status).toBe(404);
  });

  it("locks delayed recall for 24h of server time, then scores it once", async () => {
    const { data: list } = await t.req("POST", "/api/wordlists");
    let p = await t.req("GET", "/api/wordlists/pending");
    expect(p.data.lists[0]).toMatchObject({ id: list.id, unlocked: false, unlockAt: list.createdAt + DAY });
    expect(p.data.lists[0].words).toBeUndefined();

    t.clock.t += DAY - 1;
    expect((await t.req("POST", `/api/wordlists/${list.id}/recall`, { recalled: list.words })).status).toBe(409);

    t.clock.t += 6 * DAY + 1; // 7 days total
    p = await t.req("GET", "/api/wordlists/pending");
    expect(p.data.lists[0].unlocked).toBe(true);
    const r = await t.req("POST", `/api/wordlists/${list.id}/recall`, { recalled: list.words.slice(0, 15) });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ score: 15, total: 20, daysElapsed: 7 });
    expect((await t.req("POST", `/api/wordlists/${list.id}/recall`, { recalled: [] })).status).toBe(409);
    expect((await t.req("GET", "/api/wordlists/pending")).data.lists).toHaveLength(0);
    const row = t.db.query("SELECT delayed_score, days_elapsed FROM word_lists WHERE id = ?").get(list.id);
    expect(row).toEqual({ delayed_score: 15, days_elapsed: 7 });
    const res = await t.req("GET", "/api/results?test=word_delayed");
    expect(res.data[0].extra.daysElapsed).toBe(7);
  });

  it("returns 409 when the word pool runs out", async () => {
    let status = 201;
    for (let i = 0; i < 30 && status === 201; i++) status = (await t.req("POST", "/api/wordlists")).status;
    expect(status).toBe(409);
  });
});

describe("export", () => {
  async function seedDay(dayOffset: number) {
    const base = new Date(2026, 0, 10 + dayOffset, 8, 0).getTime();
    const post = (ts: number, test: string, score: number, extra: unknown) => t.req("POST", "/api/results", { ts, test, score, extra });
    await post(base, "digit_span", 10, digitExtra(6, 4));
    await post(base + 60_000, "digit_span", 12, digitExtra(7, 5)); // latest wins
    await post(base, "pvt", 260, pvtExtra(260, 2));
    await post(base, "stroop", 640, stroopExtra(97.5, 85));
  }

  it("returns the TSV row in column order with blanks for missing tests", async () => {
    await seedDay(0);
    const r = await t.req("GET", "/api/export/row?date=2026-01-10");
    expect(r.status).toBe(200);
    expect(r.data).toBe(["2026-01-10", "12", "", "", "260", "2", "640", "97.5", "85", "", ""].join("\t"));
    const withHeader = await t.req("GET", "/api/export/row?date=2026-01-10&header=1");
    expect(withHeader.data.split("\n")[0]).toBe(EXPORT_HEADER.join("\t"));
    const empty = await t.req("GET", "/api/export/row?date=2026-01-11");
    expect(empty.data.split("\t")).toHaveLength(11);
    expect(empty.data).toBe("2026-01-11" + "\t".repeat(10));
    expect((await t.req("GET", "/api/export/row?date=Jan-1")).status).toBe(400);
  });

  it("defaults to today (server time)", async () => {
    await seedDay(0);
    const r = await t.req("GET", "/api/export/row");
    expect(r.data.startsWith("2026-01-10\t12")).toBe(true);
  });

  it("exports long-format CSV", async () => {
    await seedDay(0);
    const r = await t.req("GET", "/api/export/csv");
    expect(r.headers.get("content-type")).toContain("text/csv");
    expect(r.headers.get("content-disposition")).toContain("attachment");
    const lines = r.data.trim().split("\n");
    expect(lines[0]).toBe("id,ts,iso_time,date,test,score,extra_json");
    expect(lines).toHaveLength(5);
    expect(lines[1]).toContain('"{""forward"":6');
  });
});

describe("backup / restore", () => {
  it("round-trips all tables", async () => {
    await t.req("POST", "/api/results", { test: "pvt", score: 250, extra: pvtExtra(250) });
    await t.req("POST", "/api/wordlists");
    const backup = (await t.req("GET", "/api/backup")).data;
    expect(backup.results).toHaveLength(1);
    expect(backup.used_words).toHaveLength(20);

    const other = makeApp();
    try {
      const r = await other.req("POST", "/api/restore", backup);
      expect(r.status).toBe(200);
      const again = (await other.req("GET", "/api/backup")).data;
      expect({ ...again, exportedAt: 0 }).toEqual({ ...backup, exportedAt: 0 });
      // used words survive restore, so new lists still avoid them
      const next = (await other.req("POST", "/api/wordlists")).data.words as string[];
      const usedBefore = new Set(backup.used_words.map((u: any) => u.word));
      expect(next.some((w) => usedBefore.has(w))).toBe(false);
    } finally {
      other.cleanup();
    }
  });

  it("rejects invalid backups without touching data", async () => {
    await t.req("POST", "/api/results", { test: "pvt", score: 250, extra: pvtExtra(250) });
    expect((await t.req("POST", "/api/restore", { version: 2 })).status).toBe(400);
    expect((await t.req("GET", "/api/results")).data).toHaveLength(1);
  });
});

describe("tracking", () => {
  async function day(i: number, pvt: number | null, digit: number | null) {
    const ts = new Date(2026, 0, 1 + i, 9).getTime();
    if (pvt !== null) await t.req("POST", "/api/results", { ts, test: "pvt", score: pvt, extra: pvtExtra(pvt, 1) });
    if (digit !== null) await t.req("POST", "/api/results", { ts, test: "digit_span", score: digit, extra: digitExtra(digit, 0) });
  }
  const metric = async (key: string) => ((await t.req("GET", "/api/tracking/summary")).data as any[]).find((m) => m.key === key);

  it("0 entries: nulls", async () => {
    const m = await metric("pvt_median");
    expect(m).toMatchObject({ n: 0, baseline: null, latest3: null, best: null, pctChange: null, baselineComplete: false });
    expect((await t.req("GET", "/api/tracking/log")).data.rows).toEqual([]);
  });

  it("1 and 2 entries: partial baseline", async () => {
    await day(0, 300, null);
    expect(await metric("pvt_median")).toMatchObject({ n: 1, baseline: 300, latest3: 300, best: 300, pctChange: null });
    await day(1, 270, 9);
    expect(await metric("pvt_median")).toMatchObject({ n: 2, baseline: 285, latest3: 285, best: 270, baselineComplete: false });
    expect(await metric("digit_span")).toMatchObject({ n: 1, baseline: 9 });
  });

  it("10 days: hand-computed baseline, latest-3, best and %", async () => {
    const pvt = [300, 310, 290, 280, 270, 260, 250, 240, 230, 220];
    const dig = [8, null, 9, 10, null, 11, 12, null, 13, 14];
    for (let i = 0; i < 10; i++) await day(i, pvt[i], dig[i]);
    const p = await metric("pvt_median");
    expect(p).toMatchObject({ n: 10, baseline: 300, latest3: 230, best: 220, baselineComplete: true, pctChange: 23.3 });
    const d = await metric("digit_span");
    // non-blank: 8,9,10,11,12,13,14 -> baseline 9, latest3 13, best 14, +44.4%
    expect(d).toMatchObject({ n: 7, baseline: 9, latest3: 13, best: 14, pctChange: 44.4 });
    const lapses = await metric("pvt_lapses");
    expect(lapses).toMatchObject({ n: 10, baseline: 1, pctChange: 0 });

    const log = (await t.req("GET", "/api/tracking/log")).data;
    expect(log.columns).toEqual(EXPORT_HEADER);
    expect(log.rows).toHaveLength(10);
    expect(log.rows[1]).toEqual({ date: "2026-01-02", values: [null, null, null, 310, 1, null, null, null, null, null] });
    t.clock.t = new Date(2026, 0, 10, 12).getTime();
    expect((await t.req("GET", "/api/tracking/log?days=3")).data.rows.map((r: any) => r.date)).toEqual(["2026-01-08", "2026-01-09", "2026-01-10"]);
  });
});
