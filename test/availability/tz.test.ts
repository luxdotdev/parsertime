import { describe, expect, it } from "vitest";
import { weekStartInTz } from "@/lib/availability/tz";

// Helper: read back the local Y-M-D and weekday of a UTC instant in a tz.
function localParts(d: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const by: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) if (p.type !== "literal") by[p.type] = p.value;
  return by;
}

const NY = "America/New_York";

describe("weekStartInTz", () => {
  it("weekStartsOn=0 (Sunday) snaps a mid-week instant back to the prior Sunday at midnight", () => {
    // 2026-06-10 is a Wednesday.
    const now = new Date("2026-06-10T18:00:00Z");
    const start = weekStartInTz(now, NY, 0);
    const p = localParts(start, NY);
    expect(p.weekday).toBe("Sun");
    expect(p.day).toBe("07"); // Sunday 2026-06-07
    expect(p.hour).toBe("00");
    expect(p.minute).toBe("00");
  });

  it("weekStartsOn=6 (Saturday) snaps a Wednesday back to the prior Saturday", () => {
    const now = new Date("2026-06-10T18:00:00Z"); // Wednesday
    const start = weekStartInTz(now, NY, 6);
    const p = localParts(start, NY);
    expect(p.weekday).toBe("Sat");
    expect(p.day).toBe("06"); // Saturday 2026-06-06
    expect(p.hour).toBe("00");
  });

  it("returns the same day at midnight when now is already on the start day", () => {
    // 2026-06-06 is a Saturday; 15:00Z is 11:00 local in NY (EDT).
    const now = new Date("2026-06-06T15:00:00Z");
    const start = weekStartInTz(now, NY, 6);
    const p = localParts(start, NY);
    expect(p.weekday).toBe("Sat");
    expect(p.day).toBe("06");
    expect(p.hour).toBe("00");
  });

  it("wraps across a month boundary", () => {
    // 2026-07-01 is a Wednesday; Saturday-start week began 2026-06-27.
    const now = new Date("2026-07-01T18:00:00Z");
    const start = weekStartInTz(now, NY, 6);
    const p = localParts(start, NY);
    expect(p.weekday).toBe("Sat");
    expect(p.month).toBe("06");
    expect(p.day).toBe("27");
  });

  it("keeps the boundary at local midnight across a DST spring-forward week", () => {
    // US DST starts Sun 2026-03-08. A Sunday-start week containing that day
    // must still begin at 00:00 local on 2026-03-08.
    const now = new Date("2026-03-10T18:00:00Z"); // Tuesday after spring-forward
    const start = weekStartInTz(now, NY, 0);
    const p = localParts(start, NY);
    expect(p.weekday).toBe("Sun");
    expect(p.day).toBe("08");
    expect(p.hour).toBe("00");
    expect(p.minute).toBe("00");
  });
});
