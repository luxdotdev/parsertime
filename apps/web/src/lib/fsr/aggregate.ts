import prisma from "@/lib/prisma";
import type { AnchoredTier, FsrGroupRow, FsrStatColumn } from "@/lib/fsr/types";
import { FaceitRole } from "@/generated/prisma/client";

type RawGroupRow = {
  player_id: string;
  role: string;
  tier: AnchoredTier;
  map_count: number;
  recent_map_count: number;
  sum_recency: number;
  sum_recency_time: number;
  w_eliminations: number;
  w_finalBlows: number;
  w_deaths: number;
  w_damageDealt: number;
  w_healingDone: number;
  w_damageMitigated: number;
  w_soloKills: number;
  w_assists: number;
  w_objectiveTime: number;
};

const DB_ROLE_TO_ENUM: Record<string, FaceitRole> = {
  Tank: FaceitRole.TANK,
  Damage: FaceitRole.DAMAGE,
  Support: FaceitRole.SUPPORT,
};

/**
 * Collapse the per-line FaceitMapPlayerStats into (player × role × tier) groups
 * with recency-weighted stat sums. Filters: timePlayed present, anchored tiers,
 * valid roles. recencyWeight = 0.5 ^ (ageDays / 365), ageDays measured from `now`.
 */
export async function loadFsrGroups(
  now: Date,
  recentCutoff: Date
): Promise<FsrGroupRow[]> {
  const rows = await prisma.$queryRaw<RawGroupRow[]>`
    WITH lines AS (
      SELECT
        s."faceitPlayerId" AS player_id,
        s.role AS role,
        c.tier AS tier,
        s."timePlayed" AS time_played,
        s.eliminations, s."finalBlows", s.deaths, s."damageDealt",
        s."healingDone", s."damageMitigated", s."soloKills", s.assists,
        s."objectiveTime",
        power(0.5, (EXTRACT(EPOCH FROM (${now}::timestamptz - m."finishedAt")) / 86400.0) / 365.0) AS recency,
        (m."finishedAt" >= ${recentCutoff}::timestamptz) AS is_recent
      FROM "FaceitMapPlayerStats" s
      JOIN "FaceitMatchMap" mm ON mm.id = s."faceitMapId"
      JOIN "FaceitMatch" m ON m."faceitMatchId" = mm."matchId"
      JOIN "FaceitChampionship" c ON c."championshipId" = m."championshipId"
      WHERE s."timePlayed" IS NOT NULL
        AND s."timePlayed" > 0
        AND s.role IN ('Tank', 'Damage', 'Support')
        AND c.tier IN ('OPEN', 'ADVANCED', 'EXPERT', 'MASTERS', 'OWCS')
    )
    SELECT
      player_id,
      role,
      tier,
      COUNT(*)::int AS map_count,
      COUNT(*) FILTER (WHERE is_recent)::int AS recent_map_count,
      SUM(recency)::float8 AS sum_recency,
      SUM(recency * time_played)::float8 AS sum_recency_time,
      SUM(recency * eliminations)::float8 AS "w_eliminations",
      SUM(recency * "finalBlows")::float8 AS "w_finalBlows",
      SUM(recency * deaths)::float8 AS "w_deaths",
      SUM(recency * "damageDealt")::float8 AS "w_damageDealt",
      SUM(recency * "healingDone")::float8 AS "w_healingDone",
      SUM(recency * "damageMitigated")::float8 AS "w_damageMitigated",
      SUM(recency * "soloKills")::float8 AS "w_soloKills",
      SUM(recency * assists)::float8 AS "w_assists",
      SUM(recency * "objectiveTime")::float8 AS "w_objectiveTime"
    FROM lines
    GROUP BY player_id, role, tier
  `;

  return rows.map((r) => {
    const role = DB_ROLE_TO_ENUM[r.role];
    if (!role) throw new Error(`unexpected role ${r.role}`);

    const weightedSums: Record<FsrStatColumn, number> = {
      eliminations: r.w_eliminations ?? 0,
      finalBlows: r.w_finalBlows ?? 0,
      deaths: r.w_deaths ?? 0,
      damageDealt: r.w_damageDealt ?? 0,
      healingDone: r.w_healingDone ?? 0,
      damageMitigated: r.w_damageMitigated ?? 0,
      soloKills: r.w_soloKills ?? 0,
      assists: r.w_assists ?? 0,
      objectiveTime: r.w_objectiveTime ?? 0,
    };
    return {
      faceitPlayerId: r.player_id,
      role,
      tier: r.tier,
      mapCount: r.map_count,
      recentMapCount: r.recent_map_count,
      sumRecency: r.sum_recency ?? 0,
      sumRecencyTime: r.sum_recency_time ?? 0,
      weightedSums,
    } satisfies FsrGroupRow;
  });
}
