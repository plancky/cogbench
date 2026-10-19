import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { matchRecall, splitRecall } from "@shared/scoring/wordRecall";
import type { RecallResponse, WordListCreated } from "@shared/types";
import { Instructions } from "../components/Instructions";
import { ResultView, type SaveState } from "../components/ResultView";
import { Stage } from "../components/Stage";
import { runWordStudy } from "../engine/wordStudy";
import { WORD_INSTRUCTIONS } from "../flows/defs";
import { api, saveWithRetry } from "../lib/api";
import { CFG } from "../lib/fast";
import { navigate } from "../lib/router";
import { setTestActive } from "../lib/testState";
import { fmtDate } from "../lib/format";

type Phase = "instructions" | "study" | "distractor" | "recall" | "result";

export function WordFlow({ position, nextLabel, onNext, onAbort }: { position?: string; nextLabel: string; onNext: () => void; onAbort: () => void }) {
  const [phase, setPhase] = useState<Phase>("instructions");
  const [list, setList] = useState<WordListCreated | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; matched: string[] } | null>(null);
  const [save, setSave] = useState<SaveState>("saving");

  // Keep the "test active" flag on through distractor and recall.
  useEffect(() => {
    const active = phase === "study" || phase === "distractor" || phase === "recall";
    setTestActive(active);
    return () => setTestActive(false);
  }, [phase]);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      setList(await api.newList()); // fetched before the study phase begins
      setPhase("study");
    } catch (e) {
      setError(`Could not create a word list: ${(e as Error).message}`);
    } finally {
      setStarting(false);
    }
  };

  const run = useCallback((host: HTMLElement, signal: AbortSignal) => runWordStudy(host, list!.words, signal), [list]);

  const submit = (text: string) => {
    const guesses = splitRecall(text);
    const r = matchRecall(list!.words, guesses);
    setResult(r);
    setPhase("result");
    void saveWithRetry<RecallResponse>(`/api/wordlists/${list!.id}/immediate`, { recalled: guesses, ts: Date.now() }).then((s) =>
      setSave(s.status === "rejected" ? { error: s.error } : s.status),
    );
  };

  if (phase === "instructions")
    return (
      <Instructions title="Word Recall" minutes="~3 min" steps={WORD_INSTRUCTIONS} position={position} onStart={start} onCancel={() => navigate("")} starting={starting} error={error} />
    );
  if (phase === "study") return <Stage run={run} onDone={() => setPhase("distractor")} onAbort={onAbort} />;
  if (phase === "distractor") return <Distractor onDone={() => setPhase("recall")} />;
  if (phase === "recall") return <RecallForm title="Immediate recall" onSubmit={submit} />;
  const unlock = new Date(list!.createdAt + 7 * 86_400_000);
  return (
    <ResultView
      title="Immediate Recall"
      score={`${result!.score}/20`}
      details={[
        ["Recalled", result!.matched.join(", ") || "—"],
        ["Delayed recall", `available from tomorrow; ideally on ${fmtDate(unlock)}`],
      ]}
      save={save}
      position={position}
      nextLabel={nextLabel}
      onNext={onNext}
    />
  );
}

function Distractor({ onDone }: { onDone: () => void }) {
  const [start] = useState(() => 300 + Math.floor(Math.random() * 700));
  const [left, setLeft] = useState(CFG.word.distractorMs);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const end = performance.now() + CFG.word.distractorMs;
    const id = window.setInterval(() => {
      const remaining = end - performance.now();
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        window.clearInterval(id);
        done.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <Card className="mx-auto max-w-xl" data-testid="distractor">
      <CardHeader>
        <CardDescription>Distractor · {Math.ceil(left / 1000)} s left</CardDescription>
        <CardTitle className="text-2xl">Count backwards by 7 from {start}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">Say the numbers aloud, or type them below. This isn't scored.</p>
        <Label htmlFor="distractor-input" className="sr-only">Numbers</Label>
        <Input id="distractor-input" inputMode="numeric" autoComplete="off" autoFocus placeholder={`${start - 7}, ${start - 14}, …`} />
      </CardContent>
    </Card>
  );
}

export function RecallForm({ title, onSubmit, busy = false }: { title: string; onSubmit: (text: string) => void; busy?: boolean }) {
  const [text, setText] = useState("");
  const count = splitRecall(text).length;
  return (
    <Card className="mx-auto max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(text);
        }}
      >
        <CardHeader>
          <CardDescription>Free recall</CardDescription>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 py-4">
          <Label htmlFor="recall-text">Type every word you remember, one per line. Order doesn't matter.</Label>
          <Textarea
            id="recall-text"
            data-testid="recall-text"
            autoFocus
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onSubmit(text);
              }
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">{count} word{count === 1 ? "" : "s"} entered · Ctrl+Enter to submit</p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={busy} data-testid="recall-submit">Submit</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
