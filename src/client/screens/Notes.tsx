import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NOTES: [string, string][] = [
  ["The first 3 sessions are your baseline", "Scores usually rise over the first few sessions as you learn the tasks (practice effects). The baseline is the mean of your first 3 sessions, so treat early gains with caution and look at the trend after that."],
  ["Same time of day, same device", "Sleep, caffeine, time of day and hardware all move these numbers. Reaction times depend on your screen, keyboard and browser, so test on the same device and at about the same time each day."],
  ["Compare only to yourself", "These tasks aren't normed. A number here can't be compared with anyone else's or with published studies; only your own trend over time means anything."],
  ["This is not diagnostic", "CogBench is a personal tracking tool. It can't detect, diagnose or rule out any medical or cognitive condition. If you're worried about your memory or attention, talk to a clinician."],
  ["Good habits", "Do the Daily check (Digit Span, PVT, Stroop) on most days and the Weekly benchmark once a week. Study a new word list during the weekly run and recall it 7 days later. Close other apps, silence notifications, and keep the tab in the foreground while testing."],
];

export function Notes() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
      {NOTES.map(([title, body]) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">{body}</CardContent>
        </Card>
      ))}
    </div>
  );
}
