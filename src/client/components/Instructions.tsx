import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function Instructions({
  title,
  minutes,
  steps,
  position,
  onStart,
  onCancel,
  starting = false,
  error,
}: {
  title: string;
  minutes: string;
  steps: string[];
  position?: string;
  onStart: () => void;
  onCancel: () => void;
  starting?: boolean;
  error?: string | null;
}) {
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => startRef.current?.focus(), []);
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardDescription>{position ? `${position} · ` : ""}{minutes}</CardDescription>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Find a quiet spot, use the same device as usual, and keep this tab in the foreground.
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button ref={startRef} onClick={onStart} disabled={starting} data-testid="start-test">
          {starting ? "Preparing…" : "Start"}
        </Button>
      </CardFooter>
    </Card>
  );
}
