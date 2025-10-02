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
 *    - Awards/detracts points based on the z-score (4 points per standard deviation)
 *    - Applies stat-specific weights (core stats weighted 1.0x, minor stats 0.3-0.6x)
 *    - Caps each stat's contribution at ±10 points to prevent single-stat dominance
 * 3. Sums all contributions to get the total MVP score
 *
 * The result is a score typically ranging from -100 to +100, with a full breakdown
 * of each stat's contribution for transparency.
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
 * - Core impact stats (eliminations, final_blows, deaths, damage, healing, solo_kills): 1.0x
 * - Supporting stats (damage_blocked): 0.6x
 * - Minor stats (assists, ultimates, objective_kills): 0.3-0.4x
 */
const STAT_WEIGHTS: Record<ValidStatColumn, number> = {
  eliminations: 1.0,
  final_blows: 1.0,
  deaths: 1.0,
  hero_damage_dealt: 1.0,
  healing_dealt: 1.0,
  damage_blocked: 0.6,
  damage_taken: 0.3,
  solo_kills: 1.0,
  ultimates_earned: 0.4,
  objective_kills: 0.4,
  offensive_assists: 0.3,
  defensive_assists: 0.3,
};

/**
 * Maximum points any single stat can contribute (positive or negative).
 */
const MAX_STAT_CONTRIBUTION = 10;

/**
 * Converts a z-score to MVP points with capping.
 * Base formula: z-score * 4 * weight, capped at ±MAX_STAT_CONTRIBUTION
 *
 * Examples:
 * - 2.5 standard deviations above average (weight 1.0) = +10 points (capped)
 * - 1 standard deviation below average (weight 1.0) = -4 points
 * - At average (z-score = 0) = 0 points
 */
function calculatePointsFromZScore(zScore: number, weight = 1.0): number {
  const basePoints = zScore * 4 * weight;
  return Math.max(
    -MAX_STAT_CONTRIBUTION,
    Math.min(MAX_STAT_CONTRIBUTION, basePoints)
  );
}

type CalculateMVPScoreParams = {
  mapId: number;
  playerName: string;
  minMaps?: number;
  minTimeSeconds?: number;
};

/**
 * Calculate MVP score for a single hero/stat row.
 * Uses parallel queries for all stats to improve performance.
 */
async function calculateHeroMVPScore(
  playerName: string,
  hero: HeroName,
  stats: PlayerStat,
  minMaps = 5,
  minTimeSeconds = 300
): Promise<Omit<MVPScoreResult, "totalScore"> | null> {
  const statQueries = MVP_STATS.map((stat) => {
    const statValue = stats[stat as keyof PlayerStat] as number | undefined;

    if (statValue === undefined || statValue === null) {
      return null;
    }

    return {
      stat,
      statValue,
      promise: compareStatValueToDistribution({
        hero,
        stat,
        value: statValue,
        timePlayedSeconds: stats.hero_time_played,
        minMaps,
        minTimeSeconds,
        sampleLimit: 150,
      }).catch(() => null),
    };
  }).filter((q): q is NonNullable<typeof q> => q !== null);

  const results = await Promise.all(statQueries.map((q) => q.promise));

  const contributions: StatContribution[] = [];

  for (let i = 0; i < statQueries.length; i++) {
    const query = statQueries[i];
    const comparison = results[i];

    if (!comparison) {
      continue;
    }

    const weight = STAT_WEIGHTS[query.stat] ?? 1.0;
    const pointsAwarded = calculatePointsFromZScore(comparison.z_score, weight);

    contributions.push({
      stat: query.stat,
      rawValue: Number(query.statValue),
      per10Value: Number(comparison.input_per10),
      heroAverage: Number(comparison.hero_avg_per10),
      zScore: Number(comparison.z_score),
      pointsAwarded: Number(pointsAwarded),
      percentile: Number(comparison.estimated_percentile),
      totalPlayers: Number(comparison.total_players),
    });
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
 * Uses parallel calculations for all heroes to improve performance.
 */
export async function calculateMVPScore({
  mapId,
  playerName,
  minMaps = 5,
  minTimeSeconds = 300,
}: CalculateMVPScoreParams): Promise<MVPScoreResult | null> {
  const playerStats = await getPlayerFinalStats(mapId, playerName);

  if (playerStats.length === 0) {
    return null;
  }

  const validStats = playerStats.filter((s) => s.hero_time_played >= 60);

  if (validStats.length === 0) {
    return null;
  }

  const heroScores = await Promise.all(
    validStats.map((statRow) =>
      calculateHeroMVPScore(
        playerName,
        statRow.player_hero as HeroName,
        statRow,
        minMaps,
        minTimeSeconds
      )
    )
  );

  const allContributions: StatContribution[] = [];
  let totalScore = 0;
  let totalTimePlayedSeconds = 0;

  for (const heroScore of heroScores) {
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
    validStats.length > 0
      ? (validStats.reduce((prev, current) =>
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
  minMaps = 5,
  minTimeSeconds = 300
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
  minMaps = 5,
  minTimeSeconds = 300
): Promise<MVPScoreResult | null> {
  const results = await calculateMVPScoresForMap(
    mapId,
    minMaps,
    minTimeSeconds
  );
  return results[0] || null;
}

export type { CalculateMVPScoreParams, MVPScoreResult, StatContribution };
