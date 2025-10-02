import prisma from "@/lib/prisma";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { Prisma } from "@prisma/client";

type HeroRole = "Tank" | "Damage" | "Support";

type StatConfig = {
  column: string;
  weight: number;
  invert?: boolean;
};

const ROLE_STAT_CONFIGS: Record<HeroRole, StatConfig[]> = {
  Damage: [
    { column: "eliminations", weight: 0.3 },
    { column: "final_blows", weight: 0.2 },
    { column: "deaths", weight: 0.2, invert: true },
    { column: "hero_damage_dealt", weight: 0.2 },
    { column: "solo_kills", weight: 0.1 },
  ],
  Tank: [
    { column: "eliminations", weight: 0.12 },
    { column: "final_blows", weight: 0.08 },
    { column: "deaths", weight: 0.25, invert: true },
    { column: "hero_damage_dealt", weight: 0.12 },
    { column: "damage_blocked", weight: 0.15 },
    { column: "damage_taken", weight: 0.1, invert: true },
    { column: "solo_kills", weight: 0.15 },
    { column: "ultimates_earned", weight: 0.03 },
  ],
  Support: [
    { column: "eliminations", weight: 0.1 },
    { column: "final_blows", weight: 0.05 },
    { column: "deaths", weight: 0.25, invert: true },
    { column: "hero_damage_dealt", weight: 0.14 },
    { column: "healing_dealt", weight: 0.35 },
    { column: "solo_kills", weight: 0.06 },
    { column: "ultimates_earned", weight: 0.05 },
  ],
};

type CompositeLeaderboardParams = {
  hero: HeroName;
  player?: string;
  minMaps?: number;
  minTimeSeconds?: number;
  limit?: number;
  customWeights?: Record<string, number>;
};

function getStatAlias(column: string): string {
  const aliases: Record<string, string> = {
    eliminations: "elims",
    final_blows: "fb",
    deaths: "deaths",
    hero_damage_dealt: "damage",
    healing_dealt: "healing",
    damage_blocked: "blocked",
    damage_taken: "taken",
    solo_kills: "solo",
    ultimates_earned: "ults",
  };
  return aliases[column] || column;
}

function buildCompositeSRQuery({
  hero,
  minMaps = 10,
  minTimeSeconds = 60,
  limit = 100,
  customWeights,
}: CompositeLeaderboardParams): Prisma.Sql {
  const role = heroRoleMapping[hero] || "Damage";
  let statConfigs = ROLE_STAT_CONFIGS[role];

  if (customWeights) {
    statConfigs = statConfigs.map((stat) => ({
      ...stat,
      weight: customWeights[stat.column] ?? stat.weight,
    }));
  }

  const statColumns = statConfigs.map((s) => s.column).join(",\n          ");

  const per10Calculations = statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `(SUM(${stat.column})::numeric / SUM(hero_time_played)) * 600.0 AS ${alias}_per10`;
    })
    .join(",\n          ");

  const baselineCalculations = statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `AVG(${alias}_per10) AS avg_${alias},\n          STDDEV_SAMP(${alias}_per10) AS std_${alias}`;
    })
    .join(",\n          ");

  const zScoreCalculations = statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      if (stat.invert) {
        return `(b.avg_${alias} - p.${alias}_per10) / NULLIF(b.std_${alias}, 0) AS z_${alias}`;
      }
      return `(p.${alias}_per10 - b.avg_${alias}) / NULLIF(b.std_${alias}, 0) AS z_${alias}`;
    })
    .join(",\n          ");

  const compositeFormula = statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `z_${alias} * ${stat.weight}`;
    })
    .join(" +\n             ");

  const displayColumns = statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `ROUND(${alias}_per10::numeric, 1) AS ${alias}_per10`;
    })
    .join(",\n      ");

  return Prisma.sql`
    WITH
      final_rows AS (
        SELECT DISTINCT ON ("MapDataId", player_name)
          player_name,
          ${Prisma.raw(statColumns)},
          hero_time_played
        FROM
          "PlayerStat"
        WHERE
          player_hero = ${hero}
          AND hero_time_played >= 60
        ORDER BY
          "MapDataId",
          player_name,
          round_number DESC,
          id DESC
      ),
      per_player_totals AS (
        SELECT
          player_name,
          COUNT(*) AS maps,
          SUM(hero_time_played) AS total_secs,
          ${Prisma.raw(per10Calculations)}
        FROM
          final_rows
        GROUP BY
          player_name
        HAVING
          COUNT(*) >= ${minMaps}
          AND SUM(hero_time_played) >= ${minTimeSeconds}
      ),
      stat_baselines AS (
        SELECT
          ${Prisma.raw(baselineCalculations)}
        FROM
          per_player_totals
      ),
      z_scores AS (
        SELECT
          p.*,
          ${Prisma.raw(zScoreCalculations)}
        FROM
          per_player_totals p
          CROSS JOIN stat_baselines b
      ),
      composite_scores AS (
        SELECT
          *,
          (${Prisma.raw(compositeFormula)}) AS composite_z_score
        FROM
          z_scores
      )
    SELECT
      ${hero}::text AS hero,
      ${role}::text AS role,
      player_name,
      ${Prisma.raw(displayColumns)},
      maps::int AS maps,
      ROUND((total_secs / 60.0)::numeric, 1) AS minutes_played,
      ROUND(composite_z_score::numeric, 2) AS composite_z_score,
      FLOOR(
        GREATEST(1, LEAST(5000,
          2500 + (
            composite_z_score * 
            (1250.0 / (1.0 + ABS(composite_z_score) / 3.0))
          )
        ))
      )::int AS composite_sr,
      ROW_NUMBER() OVER (
        ORDER BY composite_z_score DESC
      )::int AS rank,
      ROUND((PERCENT_RANK() OVER (
        ORDER BY composite_z_score
      ) * 100)::numeric, 1) AS percentile
    FROM
      composite_scores
    ORDER BY
      rank
    LIMIT ${limit}
  `;
}

type CompositeSRLeaderboardResult = {
  hero: string;
  role: string;
  player_name: string;
  elims_per10: number;
  fb_per10: number;
  deaths_per10: number;
  damage_per10: number;
  solo_per10: number;
  maps: number;
  minutes_played: number;
  composite_z_score: number;
  composite_sr: number;
  rank: number;
  percentile: number;
};

// Overload: when player is provided, return single result or undefined
export async function getCompositeSRLeaderboard(params: {
  hero: HeroName;
  player: string;
  minMaps?: number;
  minTimeSeconds?: number;
  limit?: number;
  customWeights?: Record<string, number>;
}): Promise<CompositeSRLeaderboardResult | null>;

// Overload: when player is not provided, return array
export async function getCompositeSRLeaderboard(params: {
  hero: HeroName;
  player?: undefined;
  minMaps?: number;
  minTimeSeconds?: number;
  limit?: number;
  customWeights?: Record<string, number>;
}): Promise<CompositeSRLeaderboardResult[]>;

// Implementation
export async function getCompositeSRLeaderboard(params: {
  hero: HeroName;
  player?: string;
  minMaps?: number;
  minTimeSeconds?: number;
  limit?: number;
  customWeights?: Record<string, number>;
}): Promise<
  CompositeSRLeaderboardResult | CompositeSRLeaderboardResult[] | null
> {
  const query = buildCompositeSRQuery(params);
  const result = await prisma.$queryRaw<CompositeSRLeaderboardResult[]>(query);

  if (params.player) {
    return result.find((row) => row.player_name === params.player) ?? null;
  }

  return result;
}

export type { CompositeLeaderboardParams, StatConfig };
