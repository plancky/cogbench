import { useState } from "react";
import { toast } from "sonner";
import { FLOW_NAMES, type FlowId } from "@shared/registry";
import { Instructions } from "../components/Instructions";
import { ResultView, type SaveState } from "../components/ResultView";
import { Stage } from "../components/Stage";
import { TIMED_FLOWS, type FlowOutcome, type TimedFlow } from "../flows/defs";
import { saveResult } from "../lib/api";
import { fmtScore } from "../lib/format";
import { navigate } from "../lib/router";
import { WordFlow } from "./WordFlow";

/** Runs one or more flows back to back (single test, Daily check, Weekly benchmark). */
export function RunFlows({ flows }: { flows: FlowId[] }) {
  const [index, setIndex] = useState(0);
  const flow = flows[index];
  const position = flows.length > 1 ? `Test ${index + 1} of ${flows.length}` : undefined;
  const isLast = index === flows.length - 1;
  const next = () => (isLast ? navigate("") : setIndex(index + 1));
  const nextLabel = isLast ? "Done" : `Next: ${FLOW_NAMES[flows[index + 1]]}`;
  const abort = () => {
    toast("Test cancelled. Nothing was saved for it.");
    navigate("");
  };
  if (flow === "word") return <WordFlow key={index} position={position} nextLabel={nextLabel} onNext={next} onAbort={abort} />;
  return <TimedFlowRunner key={index} def={TIMED_FLOWS[flow]} position={position} nextLabel={nextLabel} onNext={next} onAbort={abort} />;
}

function TimedFlowRunner({
  def,
  position,
  nextLabel,
  onNext,
  onAbort,
}: {
  def: TimedFlow;
  position?: string;
  nextLabel: string;
  onNext: () => void;
  onAbort: () => void;
}) {
  const [phase, setPhase] = useState<"instructions" | "running" | "result">("instructions");
  const [outcome, setOutcome] = useState<FlowOutcome | null>(null);
  const [save, setSave] = useState<SaveState>("saving");

  const finished = (o: FlowOutcome) => {
    setOutcome(o);
    setPhase("result");
    // The test has ended; only now do we touch the network.
    if (o.payload)
      void saveResult(o.payload).then((r) => setSave(r.status === "rejected" ? { error: r.error } : r.status));
  };

  if (phase === "instructions")
    return <Instructions title={def.title} minutes={def.minutes} steps={def.instructions} position={position} onStart={() => setPhase("running")} onCancel={() => navigate("")} />;
  if (phase === "running") return <Stage run={def.run} onDone={finished} onAbort={onAbort} />;
  return (
    <ResultView
      title={def.title}
      score={fmtScore(outcome!.series, outcome!.score)}
      details={outcome!.details}
      save={save}
      position={position}
      nextLabel={nextLabel}
      onNext={onNext}
    />
  );
}
