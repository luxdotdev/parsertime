import { computeTeamTotals } from "@/data/scrim/team-totals";
import { describe, expect, it } from "vitest";

type Row = {
  eliminations: number;
  deaths: number;
  heroDamageDealt: number;
  healingDealt: number;
  isSubstitute: boolean;
};

function player(overrides: Partial<Row> = {}): Row {
  return {
    eliminations: 10,
    deaths: 5,
    heroDamageDealt: 5000,
    healingDealt: 0,
    isSubstitute: false,
    ...overrides,
  };
}

describe("computeTeamTotals", () => {
  it("sums all players when none are substitutes", () => {
    const totals = computeTeamTotals([
      player({ eliminations: 10, deaths: 5, heroDamageDealt: 5000 }),
      player({ eliminations: 20, deaths: 5, heroDamageDealt: 7000 }),
    ]);

    expect(totals.eliminations).toBe(30);
    expect(totals.deaths).toBe(10);
    expect(totals.heroDamage).toBe(12000);
    expect(totals.kdRatio).toBe(3); // 30 / 10
  });

  it("excludes substitutes from sums and kdRatio", () => {
    const players = [
      player({ eliminations: 10, deaths: 5, heroDamageDealt: 5000 }),
      player({ eliminations: 20, deaths: 5, heroDamageDealt: 7000 }),
      player({
        eliminations: 100,
        deaths: 50,
        heroDamageDealt: 99999,
        healingDealt: 99999,
        isSubstitute: true,
      }),
    ];

    const totals = computeTeamTotals(players);

    // The substitute's stats are not folded into the team totals.
    expect(totals.eliminations).toBe(30);
    expect(totals.deaths).toBe(10);
    expect(totals.heroDamage).toBe(12000);
    expect(totals.healing).toBe(0);
    expect(totals.kdRatio).toBe(3);

    // The substitute is still present in the input array (individually visible).
    expect(players.some((p) => p.isSubstitute)).toBe(true);
    expect(players).toHaveLength(3);
  });

  it("falls back to eliminations for kdRatio when there are no deaths", () => {
    const totals = computeTeamTotals([
      player({ eliminations: 8, deaths: 0, heroDamageDealt: 1000 }),
    ]);

    expect(totals.deaths).toBe(0);
    expect(totals.kdRatio).toBe(8);
  });

  it("returns zeroed totals when every player is a substitute", () => {
    const totals = computeTeamTotals([
      player({ isSubstitute: true }),
      player({ isSubstitute: true }),
    ]);

    expect(totals.eliminations).toBe(0);
    expect(totals.deaths).toBe(0);
    expect(totals.heroDamage).toBe(0);
    expect(totals.healing).toBe(0);
    expect(totals.kdRatio).toBe(0);
  });
});
