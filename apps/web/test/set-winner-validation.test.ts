import { describe, expect, it } from "vitest";
import { resolveSetWinnerOutcome } from "@/lib/scrim/set-winner-validation";

describe("resolveSetWinnerOutcome", () => {
  const teams = { team1: "Spitfire", team2: "Dynasty" };

  it("accepts a winner matching team 1", () => {
    expect(resolveSetWinnerOutcome("Spitfire", teams)).toEqual({ ok: true });
  });

  it("accepts a winner matching team 2", () => {
    expect(resolveSetWinnerOutcome("Dynasty", teams)).toEqual({ ok: true });
  });

  it("rejects a winner that matches neither team", () => {
    expect(resolveSetWinnerOutcome("Fusion", teams)).toEqual({
      ok: false,
      error: "Winner must be one of the two teams on this map",
    });
  });

  it("rejects when team names are not yet known", () => {
    expect(
      resolveSetWinnerOutcome("Spitfire", { team1: "", team2: "" })
    ).toEqual({ ok: false, error: "Map teams are not available yet" });
  });
});
