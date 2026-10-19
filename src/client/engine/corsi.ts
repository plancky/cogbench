import { SpanStaircase, generateCorsi, sameSeq } from "@shared/scoring/span";
import { defaultRng } from "@shared/scoring/rng";
import { CFG, exposeForTest } from "../lib/fast";
import { Aborted, h, interstitial, paint, sleep } from "./dom";
import type { SpanTrial } from "./digitSpan";

export interface CorsiRaw {
  span: number;
  trials: SpanTrial[];
}

/** Collect `n` cell selections (click/tap or keys 1-9). */
function collect(cells: HTMLButtonElement[], n: number, status: HTMLElement, signal: AbortSignal): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const picks: number[] = [];
    const pick = (i: number) => {
      picks.push(i);
      const cell = cells[i];
      cell.dataset.lit = "1";
      setTimeout(() => delete cell.dataset.lit, 120);
      status.textContent = `${picks.length} / ${n}`;
      if (picks.length >= n) {
        cleanup();
        resolve(picks);
      }
    };
    const handlers = cells.map((cell, i) => {
      const fn = () => pick(i);
      cell.addEventListener("click", fn);
      return fn;
    });
    const onKey = (e: KeyboardEvent) => {
      const k = Number(e.key);
      if (e.repeat || !Number.isInteger(k) || k < 1 || k > 9) return;
      e.preventDefault();
      pick(k - 1);
    };
    const onAbort = () => {
      cleanup();
      reject(new Aborted());
    };
    const cleanup = () => {
      cells.forEach((c, i) => {
        c.removeEventListener("click", handlers[i]);
        c.disabled = true;
      });
      window.removeEventListener("keydown", onKey, true);
      signal.removeEventListener("abort", onAbort);
    };
    cells.forEach((c) => (c.disabled = false));
    window.addEventListener("keydown", onKey, true);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runCorsi(host: HTMLElement, signal: AbortSignal): Promise<CorsiRaw> {
  const c = CFG.corsi;
  await interstitial(host, "Watch the squares flash, then tap them in the same order (or press keys 1–9).", "Start", signal);
  const wrap = h("div", "stage-center");
  const status = h("p", "stage-msg", "", { "aria-live": "polite" });
  const grid = h("div", "stage-grid", "", { role: "group", "aria-label": "Corsi grid" });
  const cells = Array.from({ length: 9 }, (_, i) => {
    const b = h("button", "stage-cell", "", { type: "button", "aria-label": `Square ${i + 1}`, "data-cell": String(i) });
    b.disabled = true;
    grid.append(b);
    return b;
  });
  wrap.append(status, grid);
  host.replaceChildren(wrap);

  const trials: SpanTrial[] = [];
  const sc = new SpanStaircase(3, c.maxLen);
  while (!sc.done) {
    const seq = generateCorsi(sc.length, defaultRng);
    status.textContent = `Watch · length ${sc.length} · attempt ${sc.attempt}`;
    exposeForTest(null);
    await sleep(c.preMs, signal);
    for (const i of seq) {
      await paint(() => (cells[i].dataset.lit = "1"), signal);
      await sleep(c.onMs, signal);
      await paint(() => delete cells[i].dataset.lit, signal);
      await sleep(c.gapMs, signal);
    }
    status.textContent = `Your turn: 0 / ${seq.length}`;
    exposeForTest({ expected: seq });
    const answer = await collect(cells, seq.length, status, signal);
    const correct = sameSeq(answer, seq);
    trials.push({ phase: "spatial", length: sc.length, sequence: seq, answer, correct });
    sc.record(correct);
    await sleep(300, signal);
  }
  exposeForTest(null);
  host.replaceChildren();
  return { span: sc.best, trials };
}
