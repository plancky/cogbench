import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPORT_HEADER } from "@shared/exportRow";
import { api } from "../lib/api";
import { copyText } from "../lib/clipboard";
import { todayLocal } from "../lib/format";

export function CopyRowDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayLocal());
  const [row, setRow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    setBusy(true);
    try {
      const text = await api.exportRow(date);
      setRow(text);
      const ok = await copyText(text);
      ok ? toast.success(`Copied row for ${date}`) : toast.error("Clipboard unavailable: select the row below and copy it manually.");
    } catch (e) {
      toast.error(`Could not fetch row: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), setRow(null))}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="copy-row-open">Copy today's row</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy spreadsheet row</DialogTitle>
          <DialogDescription>Tab-separated, latest result per test on that date. Paste into your sheet's Date column.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void copy();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="row-date">Date</Label>
            <Input id="row-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required data-testid="copy-row-date" />
          </div>
          {row !== null && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{EXPORT_HEADER.join(" | ")}</p>
              <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs" data-testid="copy-row-text">{row}</pre>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy || !date} data-testid="copy-row-submit">{busy ? "Fetching…" : "Copy row"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
