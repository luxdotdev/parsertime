import { Prettify } from "@/types/utils";
import { PlayerStat } from "@prisma/client";

// Base properties required for stat calculations.
type RequiredStats = {
  round_number: number;
  player_hero: string;
};

// Specifies keys from PlayerStat that are not used in Stat calculations.
type UnusedKeys = "id" | "scrimId" | "match_time" | "event_type" | "MapDataId";

// Represents a refined version of PlayerStat tailored for specific statistical operations.
// It includes all required properties and a subset of optional properties from PlayerStat,
// excluding those listed in UnusedKeys.
export type Stat = Prettify<
  RequiredStats & Partial<Omit<PlayerStat, UnusedKeys | keyof RequiredStats>>
>;

/**
 * Sums a specified statistic across rounds for a collection of player statistics,
 * ensuring that each hero's contribution is counted once per round. The function
 * then calculates the difference in the summed statistic between consecutive rounds,
 * effectively making the statistic for each round relative to the previous one.
 *
 * The function is generic and can operate on any numeric statistic present in the
 * `Stat` type. It relies on the `key` parameter to dynamically access the statistic
 * to be summed. The result is an array of objects, each representing a round and
 * the relative change in the specified statistic from the previous round.
 *
 * @template T - The type of the key from the `Stat` type that specifies which
 *               statistic is to be summed and compared across rounds.
 * @param {Stat[]} stats - An array of player statistics, where each entry includes
 *                         round information, player identification, and various statistics.
 * @param {T} key - The key of the statistic to be summed and analyzed. This key
 *                  must correspond to a numeric property within the `Stat` type.
 * @returns {Array<{ round_number: number; } & Record<T, number>>} An array of objects,
 *          each containing a `round_number` and a dynamically named property based on `key`.
 *          The value of this property is the difference in the summed statistic from the
 *          previous round to the current round. The first round's statistic is compared to 0.
 *
 * @example
 * // Assuming a Stat type with a numeric property 'damage_taken':
 * sumStatByRound(playerStats, 'damage_taken');
 * // Returns: [{ round_number: 1, damage_taken: 10 }, { round_number: 2, damage_taken: 5 }, ...]
 */
export function sumStatByRound<T extends keyof Stat>(
  stats: Stat[],
  key: T
): Array<{ round_number: number } & Record<T, number>> {
  const sumByRound = new Map<number, number>();
  const uniqueEntries = new Set<string>();

  stats.forEach((stat) => {
    const { round_number, player_hero } = stat;
    const statValue = (stat[key] as number) || 0;
    const setKey = `${round_number}-${player_hero}`;
    if (!uniqueEntries.has(setKey)) {
      uniqueEntries.add(setKey);
      const currentSum = sumByRound.get(round_number) || 0;
      sumByRound.set(round_number, currentSum + statValue);
    }
  });

  const result: Array<{ round_number: number } & Record<T, number>> = [];
  let previousRoundStat = 0;
  Array.from(sumByRound.keys())
    .sort((a, b) => a - b)
    .forEach((round_number) => {
      const currentRoundStat = sumByRound.get(round_number)!;
      const statDifference = currentRoundStat - previousRoundStat;
      result.push({
        round_number,
        [key]: statDifference,
      } as { round_number: number } & Record<T, number>); // Casting here to satisfy TypeScript
      previousRoundStat = currentRoundStat;
    });

  return result;
}
