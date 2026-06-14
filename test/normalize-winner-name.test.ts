import { describe, expect, it } from "vitest";
import { normalizeWinnerName } from "@/lib/parser/client";

const orig1 = "RAW1";
const orig2 = "RAW2";

describe("normalizeWinnerName", () => {
  it("maps original team1 winner to newTeam1Name (no swap)", () => {
    expect(normalizeWinnerName("RAW1", orig1, orig2, "Spitfire", "Dynasty", false)).toBe("Spitfire");
  });
  it("maps original team2 winner to newTeam2Name (no swap)", () => {
    expect(normalizeWinnerName("RAW2", orig1, orig2, "Spitfire", "Dynasty", false)).toBe("Dynasty");
  });
  it("handles the userIsOriginalTeam2 swap: original team2 winner becomes newTeam1Name", () => {
    expect(normalizeWinnerName("RAW2", orig1, orig2, "Spitfire", "Dynasty", true)).toBe("Spitfire");
  });
  it("handles the swap: original team1 winner becomes newTeam2Name", () => {
    expect(normalizeWinnerName("RAW1", orig1, orig2, "Spitfire", "Dynasty", true)).toBe("Dynasty");
  });
  it("leaves the loser's name unchanged when newTeam2Name is null", () => {
    // only team1 gets renamed; the other team keeps its raw name
    expect(normalizeWinnerName("RAW2", orig1, orig2, "Spitfire", null, false)).toBe("RAW2");
  });
  it("returns the winner unchanged when it matches neither team", () => {
    expect(normalizeWinnerName("OTHER", orig1, orig2, "Spitfire", "Dynasty", false)).toBe("OTHER");
  });
  it("passes through null", () => {
    expect(normalizeWinnerName(null, orig1, orig2, "Spitfire", "Dynasty", false)).toBeNull();
  });
});
