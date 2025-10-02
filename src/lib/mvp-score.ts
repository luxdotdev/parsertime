import "server-only";

import { getFinalRoundStats, getPlayerFinalStats } from "@/data/scrim-dto";
import type { HeroName } from "@/types/heroes";
import type { PlayerStat } from "@prisma/client";
import {
  compareStatValueToDistribution,
  type ValidStatColumn,
} from "./stat-percentiles";

/**
 * MVP Score Algorithm
 *
 * This algorithm calculates a points-based MVP score for players based on their
 * performance relative to global hero statistics. The algorithm:
 *
 * 1. Starts each player at 0 points
 * 2. For each significant stat (eliminations, hero damage, etc.):
 *    - Calculates how many standard deviations the player is from the global hero average
 *    - Awards/detracts points based on the z-score (10 points per standard deviation)
 *    - Applies stat-specific weights (e.g., solo kills are worth more)
 * 3. Sums all contributions to get the total MVP score
 *
 * The result includes a full breakdown of each stat's contribution, allowing the UI
 * to display exactly how the score was calculated.
 */

type StatContribution = {
  stat: ValidStatColumn;
  rawValue: number;
  per10Value: number;
  heroAverage: number;
  zScore: number;
  pointsAwarded: number;
  percentile: number;
  totalPlayers: number;
};

type MVPScoreResult = {
  totalScore: number;
  contributions: StatContribution[];
  playerName: string;
  hero: HeroName;
  timePlayedSeconds: number;
};

/**
 * Stats considered for MVP calculation.
 * These are chosen based on their significance in determining player impact.
 */
const MVP_STATS: ValidStatColumn[] = [
  "eliminations",
  "final_blows",
  "deaths",
  "hero_damage_dealt",
  "healing_dealt",
  "damage_blocked",
  "solo_kills",
  "ultimates_earned",
  "objective_kills",
  "offensive_assists",
  "defensive_assists",
];

/**
 * Weight multipliers for each stat.
 * Higher weights mean the stat has more impact on the final MVP score.
 * - High impact stats (solo_kills, objective_kills): 1.4-1.5x
 * - Important stats (final_blows, ultimates_earned): 1.2-1.3x
 * - Standard stats (eliminations, damage, healing): 1.0x
 * - Supporting stats (assists, damage_blocked): 0.8-0.9x
 */
const STAT_WEIGHTS: Record<ValidStatColumn, number> = {
  eliminations: 1.0,
  final_blows: 1.2,
  deaths: 1.0,
  hero_damage_dealt: 1.0,
  healing_dealt: 1.0,
  damage_blocked: 0.8,
  damage_taken: 0.5,
  solo_kills: 1.5,
  ultimates_earned: 1.3,
  objective_kills: 1.4,
  offensive_assists: 0.9,
  defensive_assists: 0.9,
};

/**
 * Converts a z-score to MVP points.
 * Base formula: z-score * 10 * weight
 *
 * Examples:
 * - 2 standard deviations above average = +20 base points
 * - 1 standard deviation below average = -10 base points
 * - At average (z-score = 0) = 0 points
 */
function calculatePointsFromZScore(zScore: number, weight = 1.0): number {
  const basePoints = zScore * 10;
  return basePoints * weight;
}

type CalculateMVPScoreParams = {
  mapId: number;
  playerName: string;
  minMaps?: number;
  minTimeSeconds?: number;
};

/**
 * Calculate MVP score for a single hero/stat row.
 */
async function calculateHeroMVPScore(
  playerName: string,
  hero: HeroName,
  stats: PlayerStat,
  minMaps = 10,
  minTimeSeconds = 600
): Promise<Omit<MVPScoreResult, "totalScore"> | null> {
  const contributions: StatContribution[] = [];

  for (const stat of MVP_STATS) {
    const statValue = stats[stat as keyof PlayerStat] as number | undefined;

    if (statValue === undefined || statValue === null) {
      continue;
    }

    try {
      const comparison = await compareStatValueToDistribution({
        hero,
        stat,
        value: statValue,
        timePlayedSeconds: stats.hero_time_played,
        minMaps,
        minTimeSeconds,
      });

      if (!comparison) {
        continue;
      }

      const weight = STAT_WEIGHTS[stat] ?? 1.0;
      const pointsAwarded = calculatePointsFromZScore(
        comparison.z_score,
        weight
      );

      contributions.push({
        stat,
        rawValue: Number(statValue),
        per10Value: Number(comparison.input_per10),
        heroAverage: Number(comparison.hero_avg_per10),
        zScore: Number(comparison.z_score),
        pointsAwarded: Number(pointsAwarded),
        percentile: Number(comparison.estimated_percentile),
        totalPlayers: Number(comparison.total_players),
      });
    } catch {
      continue;
    }
  }

  if (contributions.length === 0) {
    return null;
  }

  return {
    contributions,
    playerName,
    hero,
    timePlayedSeconds: stats.hero_time_played,
  };
}

/**
 * Calculate the total MVP score for a player on a map.
 * If the player played multiple heroes, their scores are combined.
 */
export async function calculateMVPScore({
  mapId,
  playerName,
  minMaps = 10,
  minTimeSeconds = 600,
}: CalculateMVPScoreParams): Promise<MVPScoreResult | null> {
  const playerStats = await getPlayerFinalStats(mapId, playerName);

  if (playerStats.length === 0) {
    return null;
  }

  const allContributions: StatContribution[] = [];
  let totalScore = 0;
  let totalTimePlayedSeconds = 0;
  const heroesPlayed: HeroName[] = [];

  for (const statRow of playerStats) {
    if (statRow.hero_time_played < 60) {
      continue;
    }

    const hero = statRow.player_hero as HeroName;
    heroesPlayed.push(hero);

    const heroScore = await calculateHeroMVPScore(
      playerName,
      hero,
      statRow,
      minMaps,
      minTimeSeconds
    );

    if (heroScore) {
      allContributions.push(...heroScore.contributions);
      totalScore += heroScore.contributions.reduce(
        (sum, c) => sum + c.pointsAwarded,
        0
      );
      totalTimePlayedSeconds += heroScore.timePlayedSeconds;
    }
  }

  if (allContributions.length === 0) {
    return null;
  }

  const primaryHero =
    heroesPlayed.length > 0
      ? (playerStats.reduce((prev, current) =>
          prev.hero_time_played > current.hero_time_played ? prev : current
        ).player_hero as HeroName)
      : ("Unknown" as HeroName);

  return {
    totalScore: Number((Math.round(totalScore * 100) / 100).toFixed(2)),
    contributions: allContributions,
    playerName,
    hero: primaryHero,
    timePlayedSeconds: Number(totalTimePlayedSeconds),
  };
}

/**
 * Calculate MVP scores for all players on a map.
 * Returns results sorted by total score (highest first).
 */
export async function calculateMVPScoresForMap(
  mapId: number,
  minMaps = 10,
  minTimeSeconds = 600
): Promise<MVPScoreResult[]> {
  const allStats = await getFinalRoundStats(mapId);

  const uniquePlayerNames = new Set(allStats.map((stat) => stat.player_name));

  const results = await Promise.all(
    Array.from(uniquePlayerNames).map((playerName) =>
      calculateMVPScore({
        mapId,
        playerName,
        minMaps,
        minTimeSeconds,
      })
    )
  );

  return results
    .filter((r): r is MVPScoreResult => r !== null)
    .sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Get the MVP for a specific map.
 */
export async function getMVPForMap(
  mapId: number,
  minMaps = 10,
  minTimeSeconds = 600
): Promise<MVPScoreResult | null> {
  const results = await calculateMVPScoresForMap(
    mapId,
    minMaps,
    minTimeSeconds
  );
  return results[0] || null;
}

export type { CalculateMVPScoreParams, MVPScoreResult, StatContribution };
