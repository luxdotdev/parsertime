import "server-only";

import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "@/data/team/shared-core";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import { calculateWinner } from "@/lib/winrate";
import { heroRoleMapping, type HeroName } from "@/types/heroes";

type Role = "Tank" | "Damage" | "Support";

type RoleMapStats = {
  role: Role;
  time_played: number;
  eliminations: number;
  final_blows: number;
  deaths: number;
  assists: number;
  hero_damage: number;
  damage_taken: number;
  healing: number;
  ultimates_earned: number;
  ultimates_used: number;
};

function roleFor(hero: string): Role {
  return heroRoleMapping[hero as HeroName] ?? "Damage";
}

function emptyRoleStats(role: Role): RoleMapStats {
  return {
    role,
    time_played: 0,
    eliminations: 0,
    final_blows: 0,
    deaths: 0,
    assists: 0,
    hero_damage: 0,
    damage_taken: 0,
    healing: 0,
    ultimates_earned: 0,
    ultimates_used: 0,
  };
}

/**
 * Emit one row per role on each map, carrying role-line performance and the
 * computed map result. This mirrors TeamRoleStatsService, but leaves grouping
 * to the generic query builder so questions can pivot by role, map type, map,
 * scrim, or result.
 */
export async function computeRolePerformance(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const inScope = new Set(scrimIds);

  const finalRoundMap = buildFinalRoundMap(data.finalRounds);
  const matchStartMap = buildMatchStartMap(data.matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    data.captures,
    matchStartMap
  );
  const {
    team1ProgressMap: team1PayloadProgressMap,
    team2ProgressMap: team2PayloadProgressMap,
  } = buildProgressMaps(data.payloadProgresses, matchStartMap);
  const {
    team1ProgressMap: team1PointProgressMap,
    team2ProgressMap: team2PointProgressMap,
  } = buildProgressMaps(data.pointProgresses, matchStartMap);

  const rows: ComputedRow[] = [];

  for (const record of data.mapDataRecords) {
    if (!record.Scrim || !inScope.has(record.Scrim.id)) continue;

    const mapDataId = record.id;
    const matchStart = matchStartMap.get(mapDataId) ?? null;
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = data.allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );
    if (!playersOnMap.every((p) => data.teamRosterSet.has(p.player_name))) {
      continue;
    }

    const winner = calculateWinner({
      matchDetails: matchStart,
      finalRound: finalRoundMap.get(mapDataId) ?? null,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
      team1PayloadProgress: team1PayloadProgressMap.get(mapDataId) ?? [],
      team2PayloadProgress: team2PayloadProgressMap.get(mapDataId) ?? [],
      team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
      team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
    });
    if (winner === "N/A") continue;

    const isWin = winner === teamName;
    const roleStats = new Map<Role, RoleMapStats>();

    for (const stat of playersOnMap) {
      const role = roleFor(stat.player_hero);
      const stats = roleStats.get(role) ?? emptyRoleStats(role);
      stats.time_played += stat.hero_time_played;
      stats.eliminations += stat.eliminations;
      stats.final_blows += stat.final_blows;
      stats.deaths += stat.deaths;
      stats.assists += stat.offensive_assists;
      stats.hero_damage += stat.hero_damage_dealt;
      stats.damage_taken += stat.damage_taken;
      stats.healing += stat.healing_dealt;
      stats.ultimates_earned += stat.ultimates_earned;
      stats.ultimates_used += stat.ultimates_used;
      roleStats.set(role, stats);
    }

    for (const stats of roleStats.values()) {
      if (stats.time_played <= 0) continue;
      rows.push({
        role: stats.role,
        won: isWin ? 1 : 0,
        lost: isWin ? 0 : 1,
        result: isWin ? "win" : "loss",
        maps: 1,
        time_played: stats.time_played,
        eliminations: stats.eliminations,
        final_blows: stats.final_blows,
        deaths: stats.deaths,
        assists: stats.assists,
        hero_damage: stats.hero_damage,
        damage_taken: stats.damage_taken,
        healing: stats.healing,
        ultimates_earned: stats.ultimates_earned,
        ultimates_used: stats.ultimates_used,
        map: matchStart?.map_name ?? record.name ?? "Unknown",
        map_type: matchStart?.map_type ?? "Unknown",
        scrim: record.Scrim.name,
      });
    }
  }

  return rows;
}
