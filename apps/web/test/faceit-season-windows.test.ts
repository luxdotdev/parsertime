import { describe, expect, it } from "vitest";
import {
  buildSeasonWindows,
  parseFaceitSeasonNumber,
  resolveSeasonWindow,
} from "@/data/faceit/season-windows";

describe("parseFaceitSeasonNumber", () => {
  it("parses league split names (SN prefix)", () => {
    expect(
      parseFaceitSeasonNumber("S8 NA Open Central - Regular Season")
    ).toBe(8);
    expect(
      parseFaceitSeasonNumber("S5 EMEA Master Central - Regular Season")
    ).toBe(5);
  });

  it("parses qualifier names (FACEIT League Season N)", () => {
    expect(
      parseFaceitSeasonNumber("FACEIT League Season 7 - Expert Qualifier (EMEA)")
    ).toBe(7);
    expect(
      parseFaceitSeasonNumber(
        "FACEIT League Season 3 - Master Open Qualifier NA (Tiebreaker) NEW"
      )
    ).toBe(3);
  });

  it("prefers the SN prefix when both patterns appear", () => {
    // Relegation events between seasons carry both; the split prefix wins.
    expect(
      parseFaceitSeasonNumber("S8 EMEA OWCS Relegation S9 - Season 9")
    ).toBe(8);
  });

  it("rejects non-league names", () => {
    expect(parseFaceitSeasonNumber("CAH Spring Season 2025 Swiss Rising")).toBe(
      null
    );
    expect(parseFaceitSeasonNumber("WASB Cup - Friday Open - NA")).toBe(null);
    expect(
      parseFaceitSeasonNumber("OWCS 2024: NA Stage 1 - Open Qualifiers")
    ).toBe(null);
    expect(parseFaceitSeasonNumber("Sombra Showdown")).toBe(null);
  });
});

describe("buildSeasonWindows", () => {
  function d(iso: string) {
    return new Date(iso);
  }

  it("folds championships into per-season windows, newest first", () => {
    const windows = buildSeasonWindows([
      {
        name: "FACEIT League Season 7 - Expert Qualifier (NA)",
        firstMatch: d("2025-11-09T00:00:00Z"),
        lastMatch: d("2025-11-10T00:00:00Z"),
        matchCount: 114,
      },
      {
        name: "S7 NA Open Central - Regular Season",
        firstMatch: d("2025-11-23T00:00:00Z"),
        lastMatch: d("2026-02-02T00:00:00Z"),
        matchCount: 807,
      },
      {
        name: "S6 NA Open Central - Regular Season",
        firstMatch: d("2025-08-01T00:00:00Z"),
        lastMatch: d("2025-09-28T00:00:00Z"),
        matchCount: 517,
      },
      {
        name: "WASB Cup - Friday Open - NA",
        firstMatch: d("2024-02-16T00:00:00Z"),
        lastMatch: d("2024-02-16T00:00:00Z"),
        matchCount: 72,
      },
    ]);

    expect(windows).toEqual([
      {
        season: 7,
        startDate: d("2025-11-09T00:00:00Z"),
        endDate: d("2026-02-02T00:00:00Z"),
        matchCount: 921,
      },
      {
        season: 6,
        startDate: d("2025-08-01T00:00:00Z"),
        endDate: d("2025-09-28T00:00:00Z"),
        matchCount: 517,
      },
    ]);
  });

  it("returns an empty list when nothing parses", () => {
    expect(
      buildSeasonWindows([
        {
          name: "COPPET Test",
          firstMatch: d("2024-02-17T00:00:00Z"),
          lastMatch: d("2024-02-17T00:00:00Z"),
          matchCount: 1,
        },
      ])
    ).toEqual([]);
  });
});

describe("resolveSeasonWindow", () => {
  const windows = buildSeasonWindows([
    {
      name: "S7 NA Open Central - Regular Season",
      firstMatch: new Date("2025-11-23T00:00:00Z"),
      lastMatch: new Date("2026-02-02T00:00:00Z"),
      matchCount: 807,
    },
  ]);

  it("finds a known season", () => {
    expect(resolveSeasonWindow(windows, 7)?.season).toBe(7);
  });

  it("returns null for unknown or absent seasons", () => {
    expect(resolveSeasonWindow(windows, 99)).toBe(null);
    expect(resolveSeasonWindow(windows, undefined)).toBe(null);
  });
});
