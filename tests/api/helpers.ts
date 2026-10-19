import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../src/server/app";
import { openDb } from "../../src/server/db";

export function makeApp(start = new Date(2026, 0, 10, 9, 0).getTime()) {
  const dir = mkdtempSync(join(tmpdir(), "cogbench-test-"));
  const path = join(dir, "test.db");
  const db = openDb(path);
  const clock = { t: start };
  const app = createApp({ db, now: () => clock.t });
  const req = async (method: string, url: string, body?: unknown) => {
    const res = await app.request(url, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const ct = res.headers.get("content-type") ?? "";
    const data = ct.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data: data as any, headers: res.headers };
  };
  const cleanup = () => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  };
  return { app, db, clock, req, cleanup, path };
}

export const pvtExtra = (median: number, lapses = 0) => ({ median, mean: median + 10, lapses, falseStarts: 0, rts: [median] });
export const stroopExtra = (accuracy = 95, interference = 80) => ({
  accuracy, congruentRt: 600, incongruentRt: 600 + interference, interference, trials: [],
});
export const digitExtra = (f: number, b: number) => ({ forward: f, backward: b, trials: [] });
