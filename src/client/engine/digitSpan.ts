import { SpanStaircase, expectedAnswer, generateDigits, parseDigits, sameSeq } from "@shared/scoring/span";
import { defaultRng } from "@shared/scoring/rng";
import { CFG, exposeForTest } from "../lib/fast";
import { Aborted, h, interstitial, paint, sleep } from "./dom";

export interface SpanTrial {
  phase: "forward" | "backward" | "spatial";
  length: number;
  sequence: number[];
  answer: number[];
  correct: boolean;
}

export interface DigitSpanRaw {
  forward: number;
  backward: number;
  trials: SpanTrial[];
}

function readAnswer(host: HTMLElement, prompt: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = h("form", "stage-center");
    form.append(h("label", "stage-msg", prompt, { for: "span-answer" }));
    const input = h("input", "stage-input", "", {
      id: "span-answer", inputmode: "numeric", autocomplete: "off", "aria-label": prompt, "data-testid": "span-answer",
    });
    const btn = h("button", "stage-btn", "Submit", { type: "submit" });
    form.append(input, btn);
    host.replaceChildren(form);
    input.focus();
    const onAbort = () => reject(new Aborted());
    signal.addEventListener("abort", onAbort, { once: true });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      signal.removeEventListener("abort", onAbort);
      resolve(input.value);
    });
  });
}

export async function runDigitSpan(host: HTMLElement, signal: AbortSignal): Promise<DigitSpanRaw> {
  const c = CFG.digit;
  const trials: SpanTrial[] = [];
  const best = { forward: 0, backward: 0 };
  for (const phase of ["forward", "backward"] as const) {
    await interstitial(
      host,
      phase === "forward"
        ? "Forward: type the digits in the order shown."
        : "Backward: type the digits in reverse order (last shown first).",
      "Start",
      signal,
    );
    const sc = new SpanStaircase(3, c.maxLen);
    while (!sc.done) {
      const seq = generateDigits(sc.length, defaultRng);
      const expected = expectedAnswer(seq, phase);
      const display = h("div", "stage-display", "", { "aria-live": "off", "data-testid": "span-display" });
      host.replaceChildren(display);
      exposeForTest(null);
      await sleep(c.preMs, signal);
      for (const d of seq) {
        await paint(() => (display.textContent = String(d)), signal);
        await sleep(c.onMs, signal);
        await paint(() => (display.textContent = ""), signal);
        await sleep(c.offMs, signal);
      }
      exposeForTest({ expected: expected.join("") });
      const answer = parseDigits(
        await readAnswer(host, `${phase === "forward" ? "Forward" : "Backward"} · length ${sc.length} · attempt ${sc.attempt}`, signal),
      );
      const correct = sameSeq(answer, expected);
      trials.push({ phase, length: sc.length, sequence: seq, answer, correct });
      sc.record(correct);
    }
    best[phase] = sc.best;
  }
  exposeForTest(null);
  host.replaceChildren();
  return { ...best, trials };
}
