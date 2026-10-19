import { CFG } from "../lib/fast";
import { h, interstitial, paint, sleep } from "./dom";

/** Show each word for the study duration. */
export async function runWordStudy(host: HTMLElement, words: string[], signal: AbortSignal): Promise<void> {
  await interstitial(host, `Study ${words.length} words, ${CFG.word.studyMs / 1000} s each. Try to picture each one.`, "Start", signal);
  const display = h("div", "stage-display stage-word", "", { "data-testid": "study-word" });
  const count = h("p", "stage-msg");
  const wrap = h("div", "stage-center");
  wrap.append(display, count);
  host.replaceChildren(wrap);
  for (let i = 0; i < words.length; i++) {
    await paint(() => {
      display.textContent = words[i];
      count.textContent = `${i + 1} / ${words.length}`;
    }, signal);
    await sleep(CFG.word.studyMs, signal);
  }
  host.replaceChildren();
}
