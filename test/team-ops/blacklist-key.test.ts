import { describe, expect, it } from "vitest";
import { blacklistKey, normalizeTeamName } from "@/lib/team-ops/blacklist-key";

describe("normalizeTeamName", () => {
  it("trims, lowercases, and collapses internal whitespace", () => {
    expect(normalizeTeamName("  Cloud   Nine ")).toBe("cloud nine");
  });
});

describe("blacklistKey", () => {
  it("keys an on-platform team by id", () => {
    expect(blacklistKey({ teamId: 42, name: "Anything" })).toBe("team:42");
  });

  it("keys an off-platform team by normalized name", () => {
    expect(blacklistKey({ teamId: null, name: "  Team   Liquid " })).toBe(
      "name:team liquid"
    );
  });
});
