import { describe, expect, it } from "vitest";
import {
  isScrimRequestLinkable,
  LINKAGE_WINDOW_DAYS,
} from "@/lib/team-ops/linkage";

const now = new Date("2026-06-01T00:00:00Z");
const recent = new Date("2026-05-31T00:00:00Z"); // 1 day ago
const old = new Date("2026-05-25T00:00:00Z"); // 7 days ago

describe("isScrimRequestLinkable", () => {
  it("links when the team sent the request inside the window", () => {
    expect(
      isScrimRequestLinkable({
        request: { fromTeamId: 1, toTeamId: 2, createdAt: recent },
        teamId: 1,
        now,
      })
    ).toBe(true);
  });

  it("links when the team received the request inside the window", () => {
    expect(
      isScrimRequestLinkable({
        request: { fromTeamId: 2, toTeamId: 1, createdAt: recent },
        teamId: 1,
        now,
      })
    ).toBe(true);
  });

  it("rejects requests outside the window", () => {
    expect(
      isScrimRequestLinkable({
        request: { fromTeamId: 1, toTeamId: 2, createdAt: old },
        teamId: 1,
        now,
      })
    ).toBe(false);
  });

  it("rejects requests the team is not part of", () => {
    expect(
      isScrimRequestLinkable({
        request: { fromTeamId: 2, toTeamId: 3, createdAt: recent },
        teamId: 1,
        now,
      })
    ).toBe(false);
  });

  it("exposes a 2-day window", () => {
    expect(LINKAGE_WINDOW_DAYS).toBe(2);
  });
});
