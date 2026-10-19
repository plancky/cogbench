import { STROOP_COLORS, generateStroop, summarizeStroop, type StroopColor, type StroopResponse, type StroopSummary } from "@shared/scoring/stroop";
import { defaultRng } from "@shared/scoring/rng";
import { CFG } from "../lib/fast";
import { Aborted, eventTime, h, interstitial, paint, sleep } from "./dom";

/** Ink colours on the fixed dark Stroop panel (same in light and dark themes). */
export const INK: Record<StroopColor, string> = {
  RED: "#ff4d4d",
  BLUE: "#4d8dff",
  GREEN: "#3ecf5a",
  YELLOW: "#ffd633",
};

export interface StroopRaw extends StroopSummary {
  trials: StroopResponse[];
}

function awaitAnswer(
  buttons: HTMLButtonElement[],
  signal: AbortSignal,
  timeoutMs: number,
): Promise<{ color: StroopColor; time: number } | null> {
  return new Promise((resolve, reject) => {
    const done = (v: { color: StroopColor; time: number } | null) => {
      cleanup();
      resolve(v);
    };
    const onKey = (e: KeyboardEvent) => {
      const k = Number(e.key);
      if (e.repeat || !(k >= 1 && k <= 4)) return;
      e.preventDefault();
      done({ color: STROOP_COLORS[k - 1], time: eventTime(e) });
    };
    const handlers = buttons.map((b, i) => {
      const fn = (e: Event) => done({ color: STROOP_COLORS[i], time: eventTime(e) });
      b.addEventListener("pointerdown", fn);
      return fn;
    });
    const onAbort = () => {
      cleanup();
      reject(new Aborted());
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey, true);
      buttons.forEach((b, i) => b.removeEventListener("pointerdown", handlers[i]));
      signal.removeEventListener("abort", onAbort);
    };
    window.addEventListener("keydown", onKey, true);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function block(host: HTMLElement, count: number, feedback: boolean, signal: AbortSignal): Promise<StroopResponse[]> {
  const c = CFG.stroop;
  const panel = h("div", "stage-stroop");
  const word = h("div", "stage-display", "", { "data-testid": "stroop-word" });
  const fb = h("p", "stage-msg stage-stroop-fb", " ", { "aria-live": "polite" });
  const row = h("div", "stage-answers");
  const buttons = STROOP_COLORS.map((col, i) =>
    h("button", "stage-btn", `${i + 1} ${col}`, { type: "button", "data-testid": `stroop-${col}`, "aria-label": `${col} (key ${i + 1})` }),
  );
  row.append(...buttons);
  panel.append(word, fb);
  const wrap = h("div", "stage-center");
  wrap.append(panel, row);
  host.replaceChildren(wrap);

  const out: StroopResponse[] = [];
  for (const t of generateStroop(count, defaultRng)) {
    await paint(() => {
      word.style.color = "#bbbbbb";
      word.textContent = "+";
    }, signal);
    await sleep(c.fixationMs, signal);
    const onset = await paint(() => {
      word.style.color = INK[t.ink];
      word.textContent = t.word;
      word.dataset.ink = t.ink;
    }, signal);
    const ans = await awaitAnswer(buttons, signal, c.timeoutMs);
    const response = ans?.color ?? null;
    const correct = response === t.ink;
    out.push({ ...t, response, correct, rt: ans ? Math.round(ans.time - onset) : null });
    await paint(() => (word.textContent = ""), signal);
    if (feedback) {
      fb.textContent = correct ? "✓ Correct" : ans ? `✗ The ink was ${t.ink}` : "✗ Too slow";
      await sleep(c.feedbackMs, signal);
      fb.textContent = " ";
    }
    await sleep(c.itiMs, signal);
  }
  return out;
}

export async function runStroop(host: HTMLElement, signal: AbortSignal): Promise<StroopRaw> {
  await interstitial(host, `Practice: ${CFG.stroop.practice} trials. Answer the INK colour, not the word, with keys 1–4 or the buttons.`, "Start practice", signal);
  await block(host, CFG.stroop.practice, true, signal);
  await interstitial(host, `Practice done. ${CFG.stroop.trials} trials, no feedback.`, "Start test", signal);
  const trials = await block(host, CFG.stroop.trials, false, signal);
  host.replaceChildren();
  return { ...summarizeStroop(trials), trials };
}
