import { describe, expect, it } from "vitest";
import { resolveMapWinner } from "@/lib/winrate";

const baseArgs = {
  matchDetails: null,
  finalRound: null,
  team1Captures: [],
  team2Captures: [],
};

describe("resolveMapWinner", () => {
  it("returns the stored winner when present", () => {
    expect(resolveMapWinner("Spitfire", baseArgs)).toBe("Spitfire");
  });

  it("falls back to calculateWinner when stored winner is null", () => {
    // calculateWinner returns "N/A" with null matchDetails/finalRound
    expect(resolveMapWinner(null, baseArgs)).toBe("N/A");
  });

  it("falls back when stored winner is undefined", () => {
    expect(resolveMapWinner(undefined, baseArgs)).toBe("N/A");
  });

  it("treats an empty string as unset and falls back", () => {
    expect(resolveMapWinner("", baseArgs)).toBe("N/A");
  });
});
