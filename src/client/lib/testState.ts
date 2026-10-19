import { useSyncExternalStore } from "react";

/** Global "a test is running" flag: blocks network flushes and chart rendering. */
let active = false;
const listeners = new Set<() => void>();

export function setTestActive(v: boolean): void {
  if (active === v) return;
  active = v;
  listeners.forEach((l) => l());
}

export function isTestActive(): boolean {
  return active;
}

export function useTestActive(): boolean {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => active,
  );
}
