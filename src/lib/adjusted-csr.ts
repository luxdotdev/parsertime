import {
  getHeroStatConfigs,
  getStatAlias,
  type StatConfig,
} from "@/lib/hero-rating";
import prisma from "@/lib/prisma";
import { TIER_PRIORS } from "@/lib/tsr/constants";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { FaceitTier, Prisma } from "@/generated/prisma/client";

export const ADJUSTED_CSR_PEER_DELTA_SCALE = 450;
export const ADJUSTED_CSR_BASELINE_SHRINKAGE = 25;

export type AdjustedCsrTier = Extract<
  FaceitTier,
  "OPEN" | "ADVANCED" | "EXPERT" | "MASTERS" | "OWCS"
>;

export type AdjustedCSRLeaderboardParams = {
  hero: HeroName;
  player?: string;
  minMaps?: number;
  minTimeSeconds?: number;
  limit?: number;
  customWeights?: Record<string, number>;
};

export type AdjustedCSRLeaderboardResult = {
  hero: string;
  role: string;
  player_name: string;
  tsr_rating: number;
  tsr_tier: AdjustedCsrTier;
  tsr_tier_anchor: number;
  tier_peer_count: number;
  tier_confidence: string;
  maps: number;
  minutes_played: number;
  raw_composite_z_score: number;
  peer_composite_z_score: number;
  raw_csr: number;
  adjusted_csr: number;
  rank: number;
  percentile: string;
  elims_per10?: number;
  fb_per10?: number;
  deaths_per10: number;
  damage_per10: number;
  healing_per10?: number;
  blocked_per10?: number;
  taken_per10?: number;
  solo_per10?: number;
  ults_per10?: number;
};

export function getAdjustedCsrTier(rating: number): AdjustedCsrTier {
  if (rating >= TIER_PRIORS.OWCS) return FaceitTier.OWCS;
  if (rating >= TIER_PRIORS.MASTERS) return FaceitTier.MASTERS;
  if (rating >= TIER_PRIORS.EXPERT) return FaceitTier.EXPERT;
  if (rating >= TIER_PRIORS.ADVANCED) return FaceitTier.ADVANCED;
  return FaceitTier.OPEN;
}

export function getAdjustedCsrTierAnchor(rating: number): number {
  return TIER_PRIORS[getAdjustedCsrTier(rating)];
}

export function scaleAdjustedCsrPeerDelta(peerZScore: number): number {
  return (
    peerZScore *
    (ADJUSTED_CSR_PEER_DELTA_SCALE / (1 + Math.abs(peerZScore) / 3))
  );
}

export function calculateAdjustedCsr(input: {
  tsrRating: number;
  peerZScore: number;
}): number {
  const anchor = getAdjustedCsrTierAnchor(input.tsrRating);
  const adjusted = anchor + scaleAdjustedCsrPeerDelta(input.peerZScore);
  return Math.floor(Math.max(1, Math.min(5000, adjusted)));
}

function tierCaseSql(column: string): string {
  return `CASE
    WHEN ${column} >= ${TIER_PRIORS.OWCS} THEN '${FaceitTier.OWCS}'
    WHEN ${column} >= ${TIER_PRIORS.MASTERS} THEN '${FaceitTier.MASTERS}'
    WHEN ${column} >= ${TIER_PRIORS.EXPERT} THEN '${FaceitTier.EXPERT}'
    WHEN ${column} >= ${TIER_PRIORS.ADVANCED} THEN '${FaceitTier.ADVANCED}'
    ELSE '${FaceitTier.OPEN}'
  END`;
}

function tierAnchorCaseSql(column: string): string {
  return `CASE
    WHEN ${column} >= ${TIER_PRIORS.OWCS} THEN ${TIER_PRIORS.OWCS}
    WHEN ${column} >= ${TIER_PRIORS.MASTERS} THEN ${TIER_PRIORS.MASTERS}
    WHEN ${column} >= ${TIER_PRIORS.EXPERT} THEN ${TIER_PRIORS.EXPERT}
    WHEN ${column} >= ${TIER_PRIORS.ADVANCED} THEN ${TIER_PRIORS.ADVANCED}
    ELSE ${TIER_PRIORS.OPEN}
  END`;
}

function buildPer10Calculations(statConfigs: StatConfig[]): string {
  return statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `(SUM(${stat.column})::numeric / SUM(hero_time_played)) * 600.0 AS ${alias}_per10`;
    })
    .join(",\n          ");
}

function buildBaselineCalculations(
  statConfigs: StatConfig[],
  prefix: string
): string {
  return statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `AVG(${alias}_per10) AS ${prefix}_avg_${alias},
          STDDEV_SAMP(${alias}_per10) AS ${prefix}_std_${alias}`;
    })
    .join(",\n          ");
}

function buildBlendedBaselineCalculations(statConfigs: StatConfig[]): string {
  return statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `(tier_confidence * COALESCE(pb.peer_avg_${alias}, gb.global_avg_${alias}, 0)
          + (1 - tier_confidence) * COALESCE(gb.global_avg_${alias}, pb.peer_avg_${alias}, 0)) AS blended_avg_${alias},
        SQRT(
          tier_confidence * POWER(COALESCE(pb.peer_std_${alias}, gb.global_std_${alias}, 0), 2)
          + (1 - tier_confidence) * POWER(COALESCE(gb.global_std_${alias}, pb.peer_std_${alias}, 0), 2)
        ) AS blended_std_${alias}`;
    })
    .join(",\n        ");
}

function buildZScoreCalculations(
  statConfigs: StatConfig[],
  baselinePrefix: "global" | "blended",
  outputPrefix: "raw" | "peer"
): string {
  return statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      const avg = `${baselinePrefix}_avg_${alias}`;
      const std = `${baselinePrefix}_std_${alias}`;
      if (stat.invert) {
        return `COALESCE((${avg} - ${alias}_per10) / NULLIF(${std}, 0), 0) AS ${outputPrefix}_z_${alias}`;
      }
      return `COALESCE((${alias}_per10 - ${avg}) / NULLIF(${std}, 0), 0) AS ${outputPrefix}_z_${alias}`;
    })
    .join(",\n          ");
}

function buildCompositeFormula(
  statConfigs: StatConfig[],
  prefix: "raw" | "peer"
): string {
  return statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `${prefix}_z_${alias} * ${stat.weight}`;
    })
    .join(" +\n             ");
}

function buildDisplayColumns(statConfigs: StatConfig[]): string {
  return statConfigs
    .map((stat) => {
      const alias = getStatAlias(stat.column);
      return `ROUND(${alias}_per10::numeric, 1) AS ${alias}_per10`;
    })
    .join(",\n      ");
}

function buildAdjustedCSRQuery({
  hero,
  player,
  minMaps = 10,
  minTimeSeconds = 60,
  limit = 100,
  customWeights,
}: AdjustedCSRLeaderboardParams): Prisma.Sql {
  const safeMinMaps = Math.max(1, minMaps);
  const safeMinTimeSeconds = Math.max(1, minTimeSeconds);
  const safeLimit = Math.max(1, Math.min(500, limit));
  const role = heroRoleMapping[hero] || "Damage";
  const statConfigs = getHeroStatConfigs(hero, customWeights);
  const statColumns = statConfigs.map((s) => s.column).join(",\n          ");
  const per10Calculations = buildPer10Calculations(statConfigs);
  const globalBaselineCalculations = buildBaselineCalculations(
    statConfigs,
    "global"
  );
  const peerBaselineCalculations = buildBaselineCalculations(
    statConfigs,
    "peer"
  );
  const blendedBaselineCalculations =
    buildBlendedBaselineCalculations(statConfigs);
  const rawZScoreCalculations = buildZScoreCalculations(
    statConfigs,
    "global",
    "raw"
  );
  const peerZScoreCalculations = buildZScoreCalculations(
    statConfigs,
    "blended",
    "peer"
  );
  const rawCompositeFormula = buildCompositeFormula(statConfigs, "raw");
  const peerCompositeFormula = buildCompositeFormula(statConfigs, "peer");
  const displayColumns = buildDisplayColumns(statConfigs);
  const playerFilter = player
    ? Prisma.sql`WHERE LOWER(player_name) = LOWER(${player})`
    : Prisma.empty;

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
          COUNT(*) >= ${safeMinMaps}
          AND SUM(hero_time_played) >= ${safeMinTimeSeconds}
      ),
      faceit_identity_keys AS (
        SELECT
          "faceitPlayerId",
          LOWER(battletag) AS player_key
        FROM
          "FaceitPlayer"
        WHERE
          battletag IS NOT NULL
        UNION ALL
        SELECT
          "faceitPlayerId",
          LOWER(battletag) AS player_key
        FROM
          "BattletagAlias"
      ),
      identity_keys AS (
        SELECT
          fk.player_key,
          pts.rating AS tsr_rating
        FROM
          faceit_identity_keys fk
          INNER JOIN "PlayerTsr" pts ON pts."faceitPlayerId" = fk."faceitPlayerId"
        UNION ALL
        SELECT
          LOWER(u.name) AS player_key,
          pts.rating AS tsr_rating
        FROM
          "User" u
          INNER JOIN faceit_identity_keys fk ON LOWER(u.battletag) = fk.player_key
          INNER JOIN "PlayerTsr" pts ON pts."faceitPlayerId" = fk."faceitPlayerId"
        WHERE
          u.name IS NOT NULL
          AND u.battletag IS NOT NULL
      ),
      resolved_tsr AS (
        SELECT
          player_key,
          MAX(tsr_rating) AS tsr_rating
        FROM
          identity_keys
        GROUP BY
          player_key
      ),
      per_player_with_tsr AS (
        SELECT
          p.*,
          r.tsr_rating,
          ${Prisma.raw(tierCaseSql("r.tsr_rating"))} AS tsr_tier,
          ${Prisma.raw(tierAnchorCaseSql("r.tsr_rating"))} AS tsr_tier_anchor
        FROM
          per_player_totals p
          INNER JOIN resolved_tsr r ON LOWER(p.player_name) = r.player_key
      ),
      global_baselines AS (
        SELECT
          ${Prisma.raw(globalBaselineCalculations)}
        FROM
          per_player_totals
      ),
      peer_baselines AS (
        SELECT
          tsr_tier,
          COUNT(*)::int AS peer_count,
          ${Prisma.raw(peerBaselineCalculations)}
        FROM
          per_player_with_tsr
        GROUP BY
          tsr_tier
      ),
      baselined AS (
        SELECT
          p.*,
          pb.peer_count,
          (pb.peer_count::numeric / (pb.peer_count + ${ADJUSTED_CSR_BASELINE_SHRINKAGE})::numeric) AS tier_confidence,
          gb.*,
          ${Prisma.raw(blendedBaselineCalculations)}
        FROM
          per_player_with_tsr p
          INNER JOIN peer_baselines pb ON pb.tsr_tier = p.tsr_tier
          CROSS JOIN global_baselines gb
      ),
      z_scores AS (
        SELECT
          *,
          ${Prisma.raw(rawZScoreCalculations)},
          ${Prisma.raw(peerZScoreCalculations)}
        FROM
          baselined
      ),
      composite_scores AS (
        SELECT
          *,
          (${Prisma.raw(rawCompositeFormula)}) AS raw_composite_z_score,
          (${Prisma.raw(peerCompositeFormula)}) AS peer_composite_z_score
        FROM
          z_scores
      ),
      scored AS (
        SELECT
          ${hero}::text AS hero,
          ${role}::text AS role,
          player_name,
          tsr_rating::int,
          tsr_tier,
          tsr_tier_anchor::int,
          peer_count::int AS tier_peer_count,
          tier_confidence,
          maps::int AS maps,
          ROUND((total_secs / 60.0)::numeric, 1) AS minutes_played,
          ROUND(raw_composite_z_score::numeric, 2) AS raw_composite_z_score,
          ROUND(peer_composite_z_score::numeric, 2) AS peer_composite_z_score,
          FLOOR(
            GREATEST(1, LEAST(5000,
              2500 + (
                raw_composite_z_score *
                (1250.0 / (1.0 + ABS(raw_composite_z_score) / 3.0))
              )
            ))
          )::int AS raw_csr,
          FLOOR(
            GREATEST(1, LEAST(5000,
              tsr_tier_anchor + (
                peer_composite_z_score *
                (${ADJUSTED_CSR_PEER_DELTA_SCALE} / (1.0 + ABS(peer_composite_z_score) / 3.0))
              )
            ))
          )::int AS adjusted_csr,
          ${Prisma.raw(displayColumns)}
        FROM
          composite_scores
      ),
      ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            ORDER BY adjusted_csr DESC, peer_composite_z_score DESC, raw_csr DESC
          )::int AS rank,
          ROUND((PERCENT_RANK() OVER (
            ORDER BY adjusted_csr
          ) * 100)::numeric, 1) AS percentile
        FROM
          scored
      )
    SELECT
      *
    FROM
      ranked
    ${playerFilter}
    ORDER BY
      rank
    LIMIT ${safeLimit}
  `;
}

export async function getAdjustedCSRLeaderboard(params: {
  hero: HeroName;
  player: string;
  minMaps?: number;
  minTimeSeconds?: number;
  limit?: number;
  customWeights?: Record<string, number>;
}): Promise<AdjustedCSRLeaderboardResult | null>;

export async function getAdjustedCSRLeaderboard(params: {
  hero: HeroName;
  player?: undefined;
  minMaps?: number;
  minTimeSeconds?: number;
  limit?: number;
  customWeights?: Record<string, number>;
}): Promise<AdjustedCSRLeaderboardResult[]>;

export async function getAdjustedCSRLeaderboard(
  params: AdjustedCSRLeaderboardParams
): Promise<
  AdjustedCSRLeaderboardResult | AdjustedCSRLeaderboardResult[] | null
>;

export async function getAdjustedCSRLeaderboard(
  params: AdjustedCSRLeaderboardParams
): Promise<
  AdjustedCSRLeaderboardResult | AdjustedCSRLeaderboardResult[] | null
> {
  const query = buildAdjustedCSRQuery(params);
  const result = await prisma.$queryRaw<AdjustedCSRLeaderboardResult[]>(query);

  if (params.player) {
    return result[0] ?? null;
  }

  return result;
}
