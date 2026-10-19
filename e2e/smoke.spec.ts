import { expect, test, type Page } from "@playwright/test";
import { EMPTY, pendingListBackup, restore, seededBackup, trackErrors } from "./fixtures";

const COLORS = ["RED", "BLUE", "GREEN", "YELLOW"];
const FAST = "/?fast=1";

const visible = (page: Page, id: string) => page.getByTestId(id).isVisible().catch(() => false);
const resultShown = (page: Page) => visible(page, "result-view");
const tick = (page: Page) => page.waitForTimeout(25);

async function clickContinueIfShown(page: Page) {
  if (await visible(page, "stage-continue")) {
    await page.getByTestId("stage-continue").click().catch(() => {});
    return true;
  }
  return false;
}

async function driveDigitSpan(page: Page) {
  while (!(await resultShown(page))) {
    if (await clickContinueIfShown(page)) continue;
    if (await visible(page, "span-answer")) {
      const expected = await page.evaluate(() => (window as any).__cogbenchTest?.expected as string | undefined);
      if (expected) {
        await page.getByTestId("span-answer").fill(expected);
        await page.getByTestId("span-answer").press("Enter");
        continue;
      }
    }
    await tick(page);
  }
  await expect(page.getByTestId("result-score")).toHaveText("8"); // fast mode caps each phase at 4
}

async function driveCorsi(page: Page) {
  while (!(await resultShown(page))) {
    if (await clickContinueIfShown(page)) continue;
    const seq = await page.evaluate(() => {
      const e = (window as any).__cogbenchTest?.expected as number[] | undefined;
      const cell = document.querySelector<HTMLButtonElement>('[data-cell="0"]');
      return e && cell && !cell.disabled ? e : null;
    });
    if (seq) {
      for (const i of seq) await page.locator(`[data-cell="${i}"]`).click();
      await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('[data-cell="0"]')?.disabled !== false);
      continue;
    }
    await tick(page);
  }
  await expect(page.getByTestId("result-score")).toHaveText("4");
}

async function driveNback(page: Page) {
  let n = 0;
  while (!(await resultShown(page))) {
    if (await clickContinueIfShown(page)) continue;
    if (n++ % 4 === 0) await page.keyboard.press("Space");
    await page.waitForTimeout(60);
  }
  await expect(page.getByTestId("result-view")).toContainText("Hit rate");
}

async function drivePvt(page: Page) {
  await page.getByTestId("stage-continue").click();
  // provoke one false start
  await page.waitForSelector('[data-testid="pvt-stage"][data-state="wait"]');
  await page.keyboard.press("Space");
  await expect(page.getByText("Too soon!")).toBeVisible();
  while (!(await resultShown(page))) {
    const state = await page.evaluate(() => document.querySelector('[data-testid="pvt-stage"]')?.getAttribute("data-state") ?? null);
    if (state === "stimulus") {
      await page.keyboard.press("Space");
      await page.waitForFunction(() => document.querySelector('[data-testid="pvt-stage"]')?.getAttribute("data-state") !== "stimulus");
      continue;
    }
    await page.waitForTimeout(10);
  }
  await expect(page.getByTestId("result-view")).toContainText(/False starts\s*1/);
  await expect(page.getByTestId("result-score")).toHaveText(/^\d+ ms$/);
}

async function driveStroop(page: Page) {
  while (!(await resultShown(page))) {
    if (await clickContinueIfShown(page)) continue;
    const s = await page.evaluate(() => {
      const w = document.querySelector<HTMLElement>('[data-testid="stroop-word"]');
      return w ? { text: w.textContent ?? "", ink: w.dataset.ink ?? "" } : null;
    });
    if (s && COLORS.includes(s.text) && s.ink) {
      await page.keyboard.press(String(COLORS.indexOf(s.ink) + 1));
      await page.waitForFunction((txt) => document.querySelector('[data-testid="stroop-word"]')?.textContent !== txt, s.text).catch(() => {});
      continue;
    }
    await page.waitForTimeout(10);
  }
  await expect(page.getByTestId("result-view")).toContainText("Accuracy");
  await expect(page.getByTestId("result-view")).toContainText("100%");
}

async function driveWord(page: Page) {
  const listRes = page.waitForResponse((r) => r.url().endsWith("/api/wordlists") && r.request().method() === "POST");
  await page.getByTestId("start-test").click();
  const { words } = (await (await listRes).json()) as { words: string[] };
  await page.getByTestId("stage-continue").click();
  await expect(page.getByTestId("recall-text")).toBeVisible({ timeout: 15_000 });
  // 5 correct (one with different case and a duplicate) + 1 wrong
  await page.getByTestId("recall-text").fill([words[0].toUpperCase(), words[0], words[1], words[2], words[3], words[4], "notaword"].join("\n"));
  await page.getByTestId("recall-submit").click();
  await expect(page.getByTestId("result-score")).toHaveText("5/20");
}

const DRIVERS: Record<string, (p: Page) => Promise<void>> = {
  digit_span: driveDigitSpan,
  corsi: driveCorsi,
  nback: driveNback,
  word: driveWord,
  pvt: drivePvt,
  stroop: driveStroop,
};

async function runFlow(page: Page, flow: string) {
  if (flow !== "word") await page.getByTestId("start-test").click();
  await DRIVERS[flow](page);
  await expect(page.getByTestId("save-status")).toHaveText("Saved");
}

test.describe.configure({ mode: "serial" });

test("each test runs end to end individually and appears on the home screen", async ({ page, request }) => {
  await restore(request, EMPTY);
  const errors = trackErrors(page);
  for (const flow of ["digit_span", "corsi", "nback", "word", "pvt", "stroop"]) {
    await page.goto(`${FAST}#/run/${flow}`);
    await runFlow(page, flow);
    await page.getByTestId("next").click();
    await expect(page.getByTestId("daily-check")).toBeVisible();
  }
  for (const s of ["digit_span", "corsi", "nback", "word_immediate", "pvt", "stroop"]) {
    await expect(page.getByTestId(`last-${s}`)).not.toHaveText("—");
  }
  await expect(page.getByTestId("last-word_delayed")).toHaveText("—");
  await expect(page.getByTestId("word-lists")).toContainText("Unlocks");
  expect(errors).toEqual([]);
});

test("weekly benchmark runs all six tests back to back; export row and CSV", async ({ page, request }) => {
  await restore(request, EMPTY);
  const errors = trackErrors(page);
  await page.goto(`${FAST}#/`);
  await page.getByTestId("weekly-benchmark").click();
  const flows = ["digit_span", "corsi", "nback", "word", "pvt", "stroop"];
  for (const [i, flow] of flows.entries()) {
    await runFlow(page, flow);
    await expect(page.getByTestId("next")).toHaveText(i === flows.length - 1 ? "Done" : /^Next: /);
    await page.getByTestId("next").click();
  }
  await expect(page.getByTestId("daily-check")).toBeVisible();
  await expect(page.getByTestId("last-digit_span")).toHaveText("8");
  await expect(page.getByTestId("last-corsi")).toHaveText("4");
  await expect(page.getByTestId("last-word_immediate")).toHaveText("5/20");

  // Export row via the dialog
  await page.getByTestId("copy-row-open").click();
  await page.getByTestId("copy-row-submit").click();
  const row = (await page.getByTestId("copy-row-text").textContent())!;
  const cells = row.split("\t");
  expect(cells).toHaveLength(11);
  expect(cells[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(cells[1]).toBe("8");
  expect(cells[2]).toBe("4");
  for (const i of [3, 4, 5, 6, 7, 8]) expect(cells[i]).not.toBe("");
  expect(cells[9]).toBe("5");
  expect(cells[10]).toBe("");
  const api = await (await request.get(`/api/export/row?date=${cells[0]}`)).text();
  expect(api).toBe(row);
  await page.keyboard.press("Escape");

  // CSV download from the tracking page
  await page.goto(`${FAST}#/tracking`);
  const dl = page.waitForEvent("download");
  await page.getByTestId("csv-download").click();
  const file = await dl;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const lines = Buffer.concat(chunks).toString("utf8").trim().split("\n");
  expect(lines[0]).toBe("id,ts,iso_time,date,test,score,extra_json");
  expect(lines).toHaveLength(7);
  await expect(page.getByTestId("tracking-log")).toContainText(cells[0]);
  expect(errors).toEqual([]);
});

test("daily check runs digit span, PVT and Stroop", async ({ page, request }) => {
  await restore(request, EMPTY);
  const errors = trackErrors(page);
  await page.goto(`${FAST}#/`);
  await page.getByTestId("daily-check").click();
  for (const flow of ["digit_span", "pvt", "stroop"]) {
    await runFlow(page, flow);
    await page.getByTestId("next").click();
  }
  await expect(page.getByTestId("last-pvt")).toHaveText(/ms$/);
  expect(errors).toEqual([]);
});

test("delayed recall unlocks for a list older than 24h", async ({ page, request }) => {
  const words = ["apple", "anchor", "candle", "piano", "rocket", "zebra", "violin", "window", "turtle", "tiger", "sofa", "spoon", "sword", "kite", "lemon", "mirror", "pumpkin", "saddle", "tower", "wagon"];
  await restore(request, pendingListBackup(words));
  const errors = trackErrors(page);
  await page.goto(`${FAST}#/`);
  await page.getByTestId("delayed-7").click();
  await page.getByTestId("start-test").click();
  await page.getByTestId("recall-text").fill("apple\nCANDLE\npian\nnope");
  await page.getByTestId("recall-submit").click();
  await expect(page.getByTestId("result-score")).toHaveText("3/20");
  await expect(page.getByTestId("result-view")).toContainText(/Days since study\s*2/);
  await page.getByTestId("next").click();
  await expect(page.getByTestId("last-word_delayed")).toHaveText("3/20");
  await expect(page.getByTestId("word-lists")).toContainText("No lists waiting");
  expect(errors).toEqual([]);
});

test("a failed POST is queued locally and retried later", async ({ page, request }) => {
  await restore(request, EMPTY);
  await page.route("**/api/results", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
  await page.goto(`${FAST}#/run/pvt`);
  await page.getByTestId("start-test").click();
  await drivePvt(page);
  await expect(page.getByTestId("save-status")).toContainText("saved locally");
  await page.unroute("**/api/results");
  await page.getByTestId("next").click();
  await page.reload(); // queue flushes on load
  await expect.poll(async () => (await (await request.get("/api/results?test=pvt")).json()).length).toBe(1);
  await page.reload();
  await expect(page.getByTestId("last-pvt")).toHaveText(/ms$/);
});

// ---- chart pages at 0 / 1 / 30+ results, phone and desktop widths ----

async function axisIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = [];
    document.querySelectorAll("svg").forEach((svg) => {
      const sr = svg.getBoundingClientRect();
      svg.querySelectorAll(".chart-axis").forEach((axis) => {
        const labels = [...axis.querySelectorAll(".tick-label")].map((t) => ({ text: t.textContent, r: t.getBoundingClientRect() })).filter((l) => l.r.width > 0);
        for (const l of labels) if (l.r.left < sr.left - 1 || l.r.right > sr.right + 1) issues.push(`clipped tick "${l.text}"`);
        for (let i = 0; i < labels.length; i++)
          for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i].r, b = labels[j].r;
            if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5)
              issues.push(`overlapping ticks "${labels[i].text}" / "${labels[j].text}"`);
          }
      });
    });
    if (document.documentElement.scrollWidth > window.innerWidth + 1) issues.push(`horizontal page scroll (${document.documentElement.scrollWidth}px)`);
    return issues;
  });
}

const SERIES = ["digit_span", "corsi", "nback", "word_immediate", "word_delayed", "pvt", "stroop"];

for (const [label, backup] of [
  ["zero results", () => EMPTY],
  ["one result", () => seededBackup(1)],
  ["35 results", () => seededBackup(35)],
] as const) {
  for (const width of [375, 1280]) {
    test(`chart pages with ${label} at ${width}px`, async ({ page, request }) => {
      await restore(request, backup());
      await page.setViewportSize({ width, height: 900 });
      const errors = trackErrors(page);
      const check = async (where: string) => {
        await page.waitForTimeout(150); // let ResizeObserver settle
        expect(await axisIssues(page), where).toEqual([]);
      };
      await page.goto(`/#/`);
      await expect(page.getByTestId("card-pvt")).toBeVisible();
      await check("home");
      for (const s of SERIES) {
        await page.goto(`/#/detail/${s}`);
        await expect(page.getByText("Trend", { exact: true })).toBeVisible();
        await check(`detail/${s}`);
      }
      await page.goto(`/#/progress`);
      await expect(page.getByTestId("progress-grid")).toBeVisible();
      for (const tab of ["30 days", "90 days", "All time"]) {
        await page.getByRole("tab", { name: tab }).click();
        await check(`progress ${tab}`);
      }
      await page.goto(`/#/report`);
      await expect(page.getByTestId("report-pvt")).not.toContainText("Loading");
      await check("report");
      await page.goto(`/#/tracking`);
      for (const tab of ["Log", "Summary", "Charts", "Data"]) {
        await page.getByRole("tab", { name: tab }).click();
        await check(`tracking ${tab}`);
      }
      if (label === "35 results") {
        await page.getByRole("tab", { name: "Summary" }).click();
        await expect(page.getByTestId("tracking-summary")).toContainText("improving");
        await page.goto(`/#/detail/pvt`);
        const pts = page.locator("circle[tabindex='0']");
        await expect(pts).toHaveCount(35);
        await pts.first().focus();
        await expect(page.getByRole("status").filter({ hasText: "5-session avg" })).toBeVisible();
        await page.keyboard.press("ArrowRight");
        await expect(pts.nth(1)).toBeFocused();
      }
      expect(errors).toEqual([]);
    });
  }
}
