/** DOM + timing primitives for test engines. No React here. */

export class Aborted extends Error {
  constructor() {
    super("aborted");
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Aborted());
    const id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new Aborted());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Apply a DOM change inside requestAnimationFrame and return performance.now()
 * taken in that same callback, i.e. the frame on which the change is painted.
 */
export function paint(apply: () => void, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Aborted());
    requestAnimationFrame(() => {
      if (signal?.aborted) return reject(new Aborted());
      apply();
      resolve(performance.now());
    });
  });
}

/** High-resolution input time from the event itself, falling back to now(). */
export function eventTime(e: Event): number {
  const t = e.timeStamp;
  const now = performance.now();
  return t > 0 && t <= now + 1 ? t : now;
}

export const isSpace = (e: KeyboardEvent) => e.code === "Space" || e.key === " ";

/** Resolve when the user presses Space/Enter or clicks `button`. */
export function waitForContinue(button: HTMLButtonElement, signal: AbortSignal, keys = ["Space", "Enter"]): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      cleanup();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !keys.includes(e.code)) return;
      e.preventDefault();
      done();
    };
    const onAbort = () => {
      cleanup();
      reject(new Aborted());
    };
    const cleanup = () => {
      window.removeEventListener("keydown", onKey, true);
      button.removeEventListener("click", done);
      signal.removeEventListener("abort", onAbort);
    };
    window.addEventListener("keydown", onKey, true);
    button.addEventListener("click", done);
    signal.addEventListener("abort", onAbort, { once: true });
    button.focus({ preventScroll: true });
  });
}

/** A centred message with a continue button; resolves once dismissed. */
export async function interstitial(host: HTMLElement, message: string, label: string, signal: AbortSignal): Promise<void> {
  const wrap = h("div", "stage-center");
  wrap.append(h("p", "stage-msg", message));
  const btn = h("button", "stage-btn", label, { type: "button", "data-testid": "stage-continue" });
  wrap.append(btn);
  host.replaceChildren(wrap);
  await waitForContinue(btn, signal);
  host.replaceChildren();
}

export function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
