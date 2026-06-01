import type { PlayerScrimPerformance, ScrimTeamTotals } from "./types";

type TeamTotalsInput = Pick<
  PlayerScrimPerformance,
  "eliminations" | "deaths" | "heroDamageDealt" | "healingDealt" | "isSubstitute"
>;

/**
 * Sums team-level totals across the roster, excluding substitutes.
 *
 * Substitutes are kept in `players` (so per-player rows stay intact) but must
 * not contribute to team aggregates, so they are filtered out here before the
 * reduce. `kdRatio` is derived from the filtered totals.
 */
export function computeTeamTotals(
  players: readonly TeamTotalsInput[]
): ScrimTeamTotals {
  const totals = players
    .filter((p) => !p.isSubstitute)
    .reduce(
      (acc, p) => ({
        eliminations: acc.eliminations + p.eliminations,
        deaths: acc.deaths + p.deaths,
        heroDamage: acc.heroDamage + p.heroDamageDealt,
        healing: acc.healing + p.healingDealt,
        kdRatio: 0,
      }),
      { eliminations: 0, deaths: 0, heroDamage: 0, healing: 0, kdRatio: 0 }
    );

  totals.kdRatio =
    totals.deaths > 0
      ? totals.eliminations / totals.deaths
      : totals.eliminations;

  return totals;
}
