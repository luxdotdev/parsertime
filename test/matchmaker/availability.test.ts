import { describe, expect, it } from "vitest";
import { computeAvailabilityOverlapHours } from "@/lib/matchmaker/availability";

describe("computeAvailabilityOverlapHours", () => {
  it("returns 0 when either team has no schedule", () => {
    expect(
      computeAvailabilityOverlapHours({
        a: null,
        b: { slotMinutes: 30, responses: [[0, 1]] },
      })
    ).toBe(0);
    expect(
      computeAvailabilityOverlapHours({
        a: { slotMinutes: 30, responses: [[0, 1]] },
        b: null,
      })
    ).toBe(0);
  });

  it("requires >=3 responders per slot for the slot to count", () => {
    expect(
      computeAvailabilityOverlapHours({
        a: { slotMinutes: 30, responses: [[0], [0]] },
        b: { slotMinutes: 30, responses: [[0], [0], [0]] },
      })
    ).toBe(0);
  });

  it("counts a single overlapping hour when both teams hit threshold on both 30m slots", () => {
    const teamSlots = [
      [0, 1],
      [0, 1],
      [0, 1],
    ];
    expect(
      computeAvailabilityOverlapHours({
        a: { slotMinutes: 30, responses: teamSlots },
        b: { slotMinutes: 30, responses: teamSlots },
      })
    ).toBe(1);
  });

  it("partial-hour coverage doesn't count: one 30m slot of 2 isn't a full hour", () => {
    const teamSlots = [[0], [0], [0]];
    expect(
      computeAvailabilityOverlapHours({
        a: { slotMinutes: 30, responses: teamSlots },
        b: { slotMinutes: 30, responses: teamSlots },
      })
    ).toBe(0);
  });

  it("disjoint hours produce 0 overlap", () => {
    expect(
      computeAvailabilityOverlapHours({
        a: {
          slotMinutes: 30,
          responses: [
            [0, 1],
            [0, 1],
            [0, 1],
          ],
        },
        b: {
          slotMinutes: 30,
          responses: [
            [10, 11],
            [10, 11],
            [10, 11],
          ],
        },
      })
    ).toBe(0);
  });
});
