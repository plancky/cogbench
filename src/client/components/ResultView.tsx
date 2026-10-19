import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export type SaveState = "saving" | "saved" | "queued" | { error: string };

export function ResultView({
  title,
  score,
  details,
  save,
  nextLabel,
  onNext,
  position,
}: {
  title: string;
  score: string;
  details: [string, string][];
  save: SaveState;
  nextLabel: string;
  onNext: () => void;
  position?: string;
}) {
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => nextRef.current?.focus(), []);
  return (
    <Card className="mx-auto max-w-xl" data-testid="result-view">
      <CardHeader>
        <CardDescription>{position ? `${position} · ` : ""}Result</CardDescription>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-5xl font-bold tabular-nums" data-testid="result-score">{score}</p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          {details.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div role="status" data-testid="save-status">
          {save === "saving" && <Badge variant="outline">Saving…</Badge>}
          {save === "saved" && <Badge variant="secondary">Saved</Badge>}
          {save === "queued" && <Badge variant="outline">Server unreachable: saved locally, will retry</Badge>}
          {typeof save === "object" && <Badge variant="destructive">Not saved: {save.error}</Badge>}
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button ref={nextRef} onClick={onNext} data-testid="next">{nextLabel}</Button>
      </CardFooter>
    </Card>
  );
}
