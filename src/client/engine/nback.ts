import { generateNback, markTargets, scoreNback, type NbackScore } from "@shared/scoring/nback";
import { defaultRng } from "@shared/scoring/rng";
import { CFG } from "../lib/fast";
import { eventTime, h, interstitial, isSpace, paint, sleep } from "./dom";

export interface NbackTrialResult {
  letter: string;
  isTarget: boolean;
  responded: boolean;
  rt: number | null;
}

export interface NbackRaw extends NbackScore {
  trials: NbackTrialResult[];
}

async function block(host: HTMLElement, count: number, feedback: boolean, signal: AbortSignal): Promise<NbackTrialResult[]> {
  const seq = generateNback(count, defaultRng);
  const truth = markTargets(seq.map((t) => t.letter));
  const letter = h("div", "stage-display", "", { "data-testid": "nback-letter" });
  const fb = h("p", "stage-msg", " ", { "aria-live": "polite" });
  const tap = h("div", "stage-center stage-tap", "", { "data-testid": "nback-tap" });
  tap.append(letter, fb);
  host.replaceChildren(tap);

  let onset = 0;
  let current: NbackTrialResult | null = null;
  const respond = (e: Event) => {
    if (!current || current.responded) return;
    current.responded = true;
    current.rt = Math.round(eventTime(e) - onset);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!isSpace(e)) return;
    e.preventDefault();
    if (!e.repeat) respond(e);
  };
  window.addEventListener("keydown", onKey, true);
  tap.addEventListener("pointerdown", respond);
  const out: NbackTrialResult[] = [];
  try {
    for (let i = 0; i < seq.length; i++) {
      current = { letter: seq[i].letter, isTarget: truth[i], responded: false, rt: null };
      onset = await paint(() => {
        letter.textContent = seq[i].letter;
        if (feedback) fb.textContent = " ";
      }, signal);
      await sleep(CFG.nback.stimMs, signal);
      await paint(() => (letter.textContent = ""), signal);
      await sleep(CFG.nback.gapMs, signal);
      const t = current;
      out.push(t);
      current = null;
      if (feedback) {
        fb.textContent = t.isTarget ? (t.responded ? "✓ Hit" : "✗ Missed a match") : t.responded ? "✗ Not a match" : " ";
        if (t.isTarget || t.responded) await sleep(CFG.nback.feedbackMs, signal);
      }
    }
  } finally {
    window.removeEventListener("keydown", onKey, true);
    tap.removeEventListener("pointerdown", respond);
  }
  return out;
}

export async function runNback(host: HTMLElement, signal: AbortSignal): Promise<NbackRaw> {
  await interstitial(host, `Practice: ${CFG.nback.practice} letters with feedback. Press Space (or tap) when a letter matches the one 2 back.`, "Start practice", signal);
  await block(host, CFG.nback.practice, true, signal);
  await interstitial(host, `Practice done. The real block has ${CFG.nback.trials} letters and no feedback.`, "Start test", signal);
  const trials = await block(host, CFG.nback.trials, false, signal);
  host.replaceChildren();
  return { ...scoreNback(trials), trials };
}
