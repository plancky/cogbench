import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FLOWS, SERIES, type FlowId, type SeriesId } from "@shared/registry";
import { href, useRoute } from "./lib/router";
import { onQueueChange, pendingCount, startQueueRetries } from "./lib/retryQueue";
import { useTestActive } from "./lib/testState";
import { Home } from "./screens/Home";
import { RunFlows } from "./screens/RunFlows";
import { DelayedRecall } from "./screens/DelayedRecall";
import { Notes } from "./screens/Notes";

// Chart-heavy pages are split out so D3 code is never loaded on test screens.
const Detail = lazy(() => import("./screens/Detail"));
const Progress = lazy(() => import("./screens/Progress"));
const Report = lazy(() => import("./screens/Report"));
const Tracking = lazy(() => import("./screens/Tracking"));

const NAV = [
  ["", "Home"],
  ["progress", "Progress"],
  ["report", "Weekly report"],
  ["tracking", "Tracking"],
  ["notes", "Notes"],
] as const;

function Page({ route }: { route: string[] }) {
  const [name, arg] = route;
  switch (name) {
    case undefined:
      return <Home />;
    case "run": {
      const ids = (arg ?? "").split(",").filter((f): f is FlowId => (FLOWS as readonly string[]).includes(f));
      return ids.length ? <RunFlows key={arg} flows={ids} /> : <NotFound />;
    }
    case "recall":
      return <DelayedRecall key={arg} listId={Number(arg)} />;
    case "detail":
      return (SERIES as readonly string[]).includes(arg) ? <Detail series={arg as SeriesId} /> : <NotFound />;
    case "progress":
      return <Progress />;
    case "report":
      return <Report />;
    case "tracking":
      return <Tracking />;
    case "notes":
      return <Notes />;
    default:
      return <NotFound />;
  }
}

function NotFound() {
  return (
    <p className="py-12 text-center text-muted-foreground">
      Page not found. <a className="underline" href={href("")}>Go home</a>
    </p>
  );
}

export function App() {
  const route = useRoute();
  const testActive = useTestActive();
  const [queued, setQueued] = useState(pendingCount());

  useEffect(() => startQueueRetries(), []);
  useEffect(() => onQueueChange(setQueued), []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.join("/")]);

  return (
    <TooltipProvider>
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-4 pb-10">
        {!testActive && (
          <header className="flex flex-wrap items-center justify-between gap-3 py-4">
            <a href={href("")} className="text-lg font-semibold tracking-tight">
              CogBench
            </a>
            <nav aria-label="Main" className="flex flex-wrap gap-1 text-sm">
              {NAV.map(([path, label]) => (
                <a
                  key={path}
                  href={href(path)}
                  aria-current={(route[0] ?? "") === path ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                    (route[0] ?? "") === path && "bg-muted text-foreground",
                  )}
                >
                  {label}
                </a>
              ))}
            </nav>
          </header>
        )}
        {queued > 0 && !testActive && (
          <p role="status" className="mb-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {queued} result{queued > 1 ? "s" : ""} waiting to sync with the server. Retrying automatically.
          </p>
        )}
        <main className="flex-1">
          <Suspense fallback={<p className="py-12 text-center text-muted-foreground">Loading…</p>}>
            <Page route={route} />
          </Suspense>
        </main>
      </div>
      <Toaster position="bottom-center" />
    </TooltipProvider>
  );
}
