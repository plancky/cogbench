import { isTestActive } from "./testState";

/** Small localStorage-backed queue for result POSTs that failed (server down, offline). */
export interface QueuedRequest {
  id: string;
  url: string;
  body: unknown;
  queuedAt: number;
  attempts: number;
}

const KEY = "cogbench.retryQueue.v1";

function load(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function save(items: QueuedRequest[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable: the in-memory copy below still retries this session
  }
  memory = items;
}

let memory: QueuedRequest[] = load();
let flushing = false;
const listeners = new Set<(n: number) => void>();

export function pendingCount(): number {
  return memory.length;
}

export function onQueueChange(fn: (n: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((l) => l(memory.length));
}

export function enqueue(url: string, body: unknown): void {
  save([...memory, { id: crypto.randomUUID?.() ?? String(Math.random()), url, body, queuedAt: Date.now(), attempts: 0 }]);
  notify();
}

/** Retry queued POSTs. Never runs while a test is active. Returns number sent. */
export async function flushQueue(): Promise<number> {
  if (flushing || isTestActive() || memory.length === 0) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of [...memory]) {
      if (isTestActive()) break;
      let res: Response;
      try {
        res = await fetch(item.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.body) });
      } catch {
        break; // still offline
      }
      // 2xx sent; 4xx will never succeed (e.g. already recorded) so drop it; 5xx keep for later
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        save(memory.filter((m) => m.id !== item.id));
        if (res.ok) sent++;
      } else {
        save(memory.map((m) => (m.id === item.id ? { ...m, attempts: m.attempts + 1 } : m)));
        break;
      }
    }
  } finally {
    flushing = false;
    notify();
  }
  return sent;
}

export function startQueueRetries(): () => void {
  const tick = () => void flushQueue();
  tick();
  window.addEventListener("online", tick);
  const id = window.setInterval(tick, 30_000);
  return () => {
    window.removeEventListener("online", tick);
    window.clearInterval(id);
  };
}
