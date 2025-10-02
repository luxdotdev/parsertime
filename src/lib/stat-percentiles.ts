import prisma from "@/lib/prisma";
import type { HeroName } from "@/types/heroes";
import { Prisma } from "@prisma/client";

type ValidStatColumn =
  | "eliminations"
  | "final_blows"
  | "deaths"
  | "hero_damage_dealt"
  | "healing_dealt"
  | "damage_blocked"
  | "damage_taken"
  | "solo_kills"
  | "ultimates_earned"
  | "objective_kills"
  | "offensive_assists"
  | "defensive_assists";

const INVERTED_STATS: ValidStatColumn[] = ["deaths", "damage_taken"];

type StatPercentileParams = {
  hero: HeroName;
  player: string;
  stat: ValidStatColumn;
  minMaps?: number;
  minTimeSeconds?: number;
};

type StatPercentileResult = {
  hero: string;
  player_name: string;
  stat_name: string;
  stat_per10: number;
  hero_avg_per10: number;
  hero_std_per10: number;
  z_score: number;
  rank: number;
  total_players: number;
  percentile: number;
  maps: number;
  minutes_played: number;
};

function buildStatPercentileQuery({
  hero,
  player,
  stat,
  minMaps = 10,
  minTimeSeconds = 600,
}: StatPercentileParams): Prisma.Sql {
  const isInverted = INVERTED_STATS.includes(stat);
  const zScoreCalc = isInverted
    ? `(b.avg_per10 - p.stat_per10) / NULLIF(b.std_per10, 0)`
    : `(p.stat_per10 - b.avg_per10) / NULLIF(b.std_per10, 0)`;

  return Prisma.sql`
    WITH
      final_rows AS (
        SELECT DISTINCT ON ("MapDataId", player_name)
          player_name,
          ${Prisma.raw(stat)},
          hero_time_played
        FROM
          "PlayerStat"
        WHERE
          player_hero = ${hero}
          AND ${Prisma.raw(stat)} IS NOT NULL
          AND hero_time_played >= 60
        ORDER BY
          "MapDataId",
          player_name,
          round_number DESC
      ),
      per_player_totals AS (
        SELECT
          player_name,
          COUNT(*) AS maps,
          SUM(hero_time_played) AS total_secs,
          (SUM(${Prisma.raw(stat)})::numeric / SUM(hero_time_played)) * 600.0 AS stat_per10
        FROM
          final_rows
        GROUP BY
          player_name
        HAVING
          COUNT(*) >= ${minMaps}
          AND SUM(hero_time_played) >= ${minTimeSeconds}
      ),
      stat_baseline AS (
        SELECT
          AVG(stat_per10) AS avg_per10,
          STDDEV_SAMP(stat_per10) AS std_per10,
          COUNT(*) AS total_players
        FROM
          per_player_totals
      ),
      with_z_scores AS (
        SELECT
          p.*,
          b.avg_per10,
          b.std_per10,
          b.total_players,
          ${Prisma.raw(zScoreCalc)} AS z_score
        FROM
          per_player_totals p
          CROSS JOIN stat_baseline b
      ),
      with_ranks AS (
        SELECT
          *,
          ROW_NUMBER() OVER (ORDER BY z_score DESC) AS rank,
          ROUND((PERCENT_RANK() OVER (ORDER BY z_score) * 100)::numeric, 1) AS percentile
        FROM
          with_z_scores
      )
    SELECT
      ${hero}::text AS hero,
      player_name,
      ${stat}::text AS stat_name,
      ROUND(stat_per10::numeric, 2) AS stat_per10,
      ROUND(avg_per10::numeric, 2) AS hero_avg_per10,
      ROUND(std_per10::numeric, 2) AS hero_std_per10,
      ROUND(z_score::numeric, 2) AS z_score,
      rank::int,
      total_players::int,
      percentile,
      maps::int,
      ROUND((total_secs / 60.0)::numeric, 1) AS minutes_played
    FROM
      with_ranks
    WHERE
      player_name = ${player}
  `;
}

export async function getPlayerStatPercentile(
  params: StatPercentileParams
): Promise<StatPercentileResult | null> {
  const query = buildStatPercentileQuery(params);
  const result = await prisma.$queryRaw<StatPercentileResult[]>(query);
  return result[0] || null;
}

type StatValueComparisonParams = {
  hero: string;
  stat: ValidStatColumn;
  value: number;
  timePlayedSeconds: number;
  minMaps?: number;
  minTimeSeconds?: number;
};

type StatValueComparisonResult = {
  hero: string;
  stat_name: string;
  input_per10: number;
  hero_avg_per10: number;
  hero_std_per10: number;
  z_score: number;
  estimated_rank: number;
  total_players: number;
  estimated_percentile: number;
};

function buildStatValueComparisonQuery({
  hero,
  stat,
  value,
  timePlayedSeconds,
  minMaps = 10,
  minTimeSeconds = 600,
}: StatValueComparisonParams): Prisma.Sql {
  const isInverted = INVERTED_STATS.includes(stat);
  const per10Value = (value / timePlayedSeconds) * 600.0;

  const zScoreCalc = isInverted
    ? `(b.avg_per10 - ${per10Value}) / NULLIF(b.std_per10, 0)`
    : `(${per10Value} - b.avg_per10) / NULLIF(b.std_per10, 0)`;

  return Prisma.sql`
    WITH
      final_rows AS (
        SELECT DISTINCT ON ("MapDataId", player_name)
          player_name,
          ${Prisma.raw(stat)},
          hero_time_played
        FROM
          "PlayerStat"
        WHERE
          player_hero = ${hero}
          AND ${Prisma.raw(stat)} IS NOT NULL
          AND hero_time_played >= 60
        ORDER BY
          "MapDataId",
          player_name,
          round_number DESC
      ),
      per_player_totals AS (
        SELECT
          player_name,
          (SUM(${Prisma.raw(stat)})::numeric / SUM(hero_time_played)) * 600.0 AS stat_per10
        FROM
          final_rows
        GROUP BY
          player_name
        HAVING
          COUNT(*) >= ${minMaps}
          AND SUM(hero_time_played) >= ${minTimeSeconds}
      ),
      stat_baseline AS (
        SELECT
          AVG(stat_per10) AS avg_per10,
          STDDEV_SAMP(stat_per10) AS std_per10,
          COUNT(*) AS total_players
        FROM
          per_player_totals
      ),
      player_z_scores AS (
        SELECT
          ${Prisma.raw(zScoreCalc.replace(/b\./g, ""))} AS player_z_score
        FROM
          per_player_totals
          CROSS JOIN stat_baseline b
      ),
      input_stats AS (
        SELECT
          b.avg_per10,
          b.std_per10,
          b.total_players,
          ${per10Value}::numeric AS input_per10,
          ${Prisma.raw(zScoreCalc)} AS input_z_score,
          (COUNT(CASE WHEN pz.player_z_score > ${Prisma.raw(zScoreCalc)} THEN 1 END) + 1)::int AS estimated_rank,
          ROUND(
            (COUNT(CASE WHEN pz.player_z_score < ${Prisma.raw(zScoreCalc)} THEN 1 END)::numeric / 
            b.total_players * 100)::numeric, 
            1
          ) AS estimated_percentile
        FROM
          stat_baseline b
          CROSS JOIN player_z_scores pz
        GROUP BY
          b.avg_per10, b.std_per10, b.total_players
      )
    SELECT
      ${hero}::text AS hero,
      ${stat}::text AS stat_name,
      ROUND(input_per10::numeric, 2) AS input_per10,
      ROUND(avg_per10::numeric, 2) AS hero_avg_per10,
      ROUND(std_per10::numeric, 2) AS hero_std_per10,
      ROUND(input_z_score::numeric, 2) AS z_score,
      estimated_rank,
      total_players::int,
      estimated_percentile
    FROM
      input_stats
  `;
}

export async function compareStatValueToDistribution(
  params: StatValueComparisonParams
): Promise<StatValueComparisonResult | null> {
  const query = buildStatValueComparisonQuery(params);
  const result = await prisma.$queryRaw<StatValueComparisonResult[]>(query);
  return result[0] || null;
}

export type {
  StatPercentileParams,
  StatPercentileResult,
  StatValueComparisonParams,
  StatValueComparisonResult,
  ValidStatColumn,
};
