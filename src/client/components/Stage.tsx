import { useEffect, useRef } from "react";
import { Aborted } from "../engine/dom";
import { setTestActive } from "../lib/testState";

/**
 * Bare host element for a test engine. React renders nothing inside it; the
 * engine owns its DOM, so trials never wait on React state updates.
 */
export function Stage<T>({
  run,
  onDone,
  onAbort,
}: {
  run: (host: HTMLElement, signal: AbortSignal) => Promise<T>;
  onDone: (result: T) => void;
  onAbort: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef({ onDone, onAbort });
  cb.current = { onDone, onAbort };

  useEffect(() => {
    const ctrl = new AbortController();
    let disposed = false;
    setTestActive(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctrl.abort();
    };
    window.addEventListener("keydown", onKey);
    run(ref.current!, ctrl.signal).then(
      (r) => {
        if (disposed) return;
        setTestActive(false);
        cb.current.onDone(r);
      },
      (e) => {
        if (disposed) return;
        if (!(e instanceof Aborted)) console.error(e);
        setTestActive(false);
        cb.current.onAbort();
      },
    );
    return () => {
      disposed = true;
      ctrl.abort();
      window.removeEventListener("keydown", onKey);
      setTestActive(false);
    };
  }, [run]);

  return (
    <div>
      <div ref={ref} className="stage" data-testid="stage" />
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Press <kbd>Esc</kbd> to quit (nothing is saved).
      </p>
    </div>
  );
}
