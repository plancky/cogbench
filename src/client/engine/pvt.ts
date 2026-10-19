import { PvtSession, type PvtSummary } from "@shared/scoring/pvt";
import { CFG } from "../lib/fast";
import { Aborted, eventTime, h, interstitial, isSpace, randBetween, sleep } from "./dom";

/**
 * One PVT trial. Waits a random delay; on the painted frame the counter
 * appears and onset is taken; an rAF loop updates the counter text directly.
 * Resolves with a false start or a reaction time.
 */
function trial(
  stage: HTMLElement,
  counter: HTMLElement,
  session: PvtSession,
  signal: AbortSignal,
): Promise<{ kind: "false_start" } | { kind: "response"; rt: number }> {
  return new Promise((resolve, reject) => {
    let onset: number | null = null;
    let raf = 0;
    let finished = false;
    const delay = randBetween(CFG.pvt.minDelayMs, CFG.pvt.maxDelayMs);

    const tick = () => {
      if (finished || onset === null) return;
      counter.textContent = String(Math.floor(performance.now() - onset));
      raf = requestAnimationFrame(tick);
    };
    const finish = (r: { kind: "false_start" } | { kind: "response"; rt: number }) => {
      finished = true;
      cleanup();
      resolve(r);
    };
    const press = (e: Event) => {
      if (finished) return;
      const r = session.press(eventTime(e), onset);
      if (r.kind === "response") counter.textContent = String(Math.round(r.rt));
      finish(r);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      e.preventDefault();
      if (!e.repeat) press(e);
    };
    const onAbort = () => {
      finished = true;
      cleanup();
      reject(new Aborted());
    };
    const startTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        if (finished) return;
        counter.textContent = "0";
        counter.hidden = false;
        stage.dataset.state = "stimulus";
        onset = performance.now();
        raf = requestAnimationFrame(tick);
      });
    }, delay);
    const timeout = setTimeout(() => {
      if (finished) return;
      const r = session.press((onset ?? performance.now()) + CFG.pvt.timeoutMs, onset ?? performance.now());
      finish(r);
    }, delay + CFG.pvt.timeoutMs);
    const cleanup = () => {
      clearTimeout(startTimer);
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
      stage.removeEventListener("pointerdown", press);
      signal.removeEventListener("abort", onAbort);
    };
    window.addEventListener("keydown", onKey, true);
    stage.addEventListener("pointerdown", press);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runPvt(host: HTMLElement, signal: AbortSignal): Promise<PvtSummary> {
  await interstitial(host, `${CFG.pvt.trials} trials. When the counter starts, press Space or tap as fast as you can. Don't press early.`, "Start", signal);
  const session = new PvtSession(CFG.pvt.trials);
  const stage = h("div", "stage-center stage-tap", "", { "data-testid": "pvt-stage", "data-state": "wait" });
  const counter = h("div", "stage-display stage-counter", "", { "data-testid": "pvt-counter" });
  const msg = h("p", "stage-msg", " ", { "aria-live": "polite" });
  stage.append(counter, msg);
  host.replaceChildren(stage);

  while (!session.done) {
    counter.hidden = true;
    stage.dataset.state = "wait";
    msg.textContent = `Trial ${session.rts.length + 1} of ${session.trials}`;
    const r = await trial(stage, counter, session, signal);
    stage.dataset.state = "feedback";
    if (r.kind === "false_start") {
      counter.hidden = true;
      msg.textContent = "Too soon! Wait for the counter.";
      await sleep(CFG.pvt.falseStartMs, signal);
    } else {
      msg.textContent = r.rt > 500 ? "Lapse (>500 ms)" : " ";
      await sleep(CFG.pvt.feedbackMs, signal);
    }
  }
  host.replaceChildren();
  return session.summary();
}
