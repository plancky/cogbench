import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PendingList, RecallResponse } from "@shared/types";
import { Instructions } from "../components/Instructions";
import { ResultView, type SaveState } from "../components/ResultView";
import { api, saveWithRetry } from "../lib/api";
import { fmtDateTime } from "../lib/format";
import { navigate } from "../lib/router";
import { setTestActive } from "../lib/testState";
import { RecallForm } from "./WordFlow";

export function DelayedRecall({ listId }: { listId: number }) {
  const [list, setList] = useState<PendingList | null | "missing">(null);
  const [phase, setPhase] = useState<"instructions" | "recall" | "result">("instructions");
  const [save, setSave] = useState<SaveState>("saving");
  const [res, setRes] = useState<RecallResponse | null>(null);

  useEffect(() => {
    api.pending().then(
      (p) => setList(p.lists.find((l) => l.id === listId) ?? "missing"),
      () => setList("missing"),
    );
  }, [listId]);

  useEffect(() => {
    setTestActive(phase === "recall");
    return () => setTestActive(false);
  }, [phase]);

  if (list === null) return <p className="py-12 text-center text-muted-foreground">Loading…</p>;
  if (list === "missing" || !list.unlocked)
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Delayed recall unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {list === "missing" ? "This list doesn't exist or was already recalled." : `This list unlocks at ${fmtDateTime(new Date(list.unlockAt))}.`}{" "}
          <a className="underline" href="#/">Back home</a>
        </CardContent>
      </Card>
    );

  if (phase === "instructions")
    return (
      <Instructions
        title="Delayed Recall"
        minutes="~2 min"
        steps={[
          `This list was studied on ${fmtDateTime(new Date(list.createdAt))}.`,
          "Type every word you remember from it, one per line. No peeking at notes.",
          "You can only do this once per list.",
        ]}
        onStart={() => setPhase("recall")}
        onCancel={() => navigate("")}
      />
    );
  if (phase === "recall")
    return (
      <RecallForm
        title="Delayed recall"
        onSubmit={(text) => {
          setPhase("result");
          const recalled = text.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean);
          void saveWithRetry<RecallResponse>(`/api/wordlists/${listId}/recall`, { recalled }).then((s) => {
            if (s.status === "saved") setRes(s.data);
            setSave(s.status === "rejected" ? { error: s.error } : s.status);
          });
        }}
      />
    );
  return (
    <ResultView
      title="Delayed Recall"
      score={res ? `${res.score}/${res.total}` : save === "saving" ? "…" : "—"}
      details={
        res
          ? [["Days since study", String(res.daysElapsed)], ["Recalled", res.matched.join(", ") || "—"]]
          : [["Score", "computed by the server once the result syncs"]]
      }
      save={save}
      nextLabel="Done"
      onNext={() => navigate("")}
    />
  );
}
