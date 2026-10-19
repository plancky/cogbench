import { describe, expect, it } from "bun:test";
import { PvtSession, summarizePvt } from "@shared/scoring/pvt";

describe("PVT", () => {
  it("counts presses before onset as false starts without consuming a trial", () => {
    const s = new PvtSession(2);
    expect(s.press(1000, null).kind).toBe("false_start");
    expect(s.press(1999, 2000).kind).toBe("false_start");
    expect(s.rts).toHaveLength(0);
    const r = s.press(2250, 2000);
    expect(r).toEqual({ kind: "response", rt: 250 });
    expect(s.done).toBe(false);
    s.press(5300, 5000);
    expect(s.done).toBe(true);
    expect(s.falseStarts).toBe(2);
  });

  it("computes median, mean and lapses (>500 ms)", () => {
    const sum = summarizePvt([200, 300, 250, 600, 501, 500], 1);
    expect(sum.median).toBe(Math.round((300 + 500) / 2));
    expect(sum.mean).toBe(Math.round((200 + 300 + 250 + 600 + 501 + 500) / 6));
    expect(sum.lapses).toBe(2);
    expect(sum.falseStarts).toBe(1);
  });

  it("odd-length median", () => {
    expect(summarizePvt([300, 100, 200], 0).median).toBe(200);
  });
});
