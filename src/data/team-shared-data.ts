import "server-only";

import prisma from "@/lib/prisma";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";
import { cache } from "react";
import type {
  BaseTeamData,
  ExtendedTeamData,
  TeamDateRange,
} from "./team-shared-core";

/**
 * Options for fetching base team data
 */
export type BaseTeamDataOptions = {
  excludePush?: boolean;
  excludeClash?: boolean;
  includeDateInfo?: boolean;
  dateRange?: TeamDateRange;
};

/**
 * Gets the team roster for a specific team
 * Extracted from team-stats-dto.tsx
 */
async function getTeamRosterUncached(teamId: number): Promise<string[]> {
  const mapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: { id: true },
  });

  const mapDataIds = mapDataRecords.map((md) => md.id);

  if (mapDataIds.length === 0) {
    return [];
  }

  const allPlayerStats = await prisma.playerStat.findMany({
    where: { MapDataId: { in: mapDataIds } },
    select: {
      player_name: true,
      player_team: true,
      MapDataId: true,
    },
  });

  const playerFrequencyMap = new Map<string, number>();
  const mapPlayerSets = new Map<number, Set<string>>();

  for (const stat of allPlayerStats) {
    const mapDataId = stat.MapDataId;
    if (!mapDataId) continue;

    if (!mapPlayerSets.has(mapDataId)) {
      mapPlayerSets.set(mapDataId, new Set<string>());
    }

    const playersInMap = mapPlayerSets.get(mapDataId)!;
    if (!playersInMap.has(stat.player_name)) {
      playersInMap.add(stat.player_name);
      const currentCount = playerFrequencyMap.get(stat.player_name) ?? 0;
      playerFrequencyMap.set(stat.player_name, currentCount + 1);
    }
  }

  const sortedPlayers = Array.from(playerFrequencyMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  if (sortedPlayers.length === 0) {
    return [];
  }

  let anchorPlayer: string | null = null;
  for (const [playerName] of sortedPlayers) {
    const playerExists = allPlayerStats.some(
      (stat) => stat.player_name === playerName
    );
    if (playerExists) {
      anchorPlayer = playerName;
      break;
    }
  }

  if (!anchorPlayer) {
    return [];
  }

  // Helper function to find team name for a map using anchor player logic
  function findTeamNameForMap(mapDataId: number): string | null {
    // Try each player in order of frequency
    for (const [playerName] of sortedPlayers) {
      for (const stat of allPlayerStats) {
        if (stat.MapDataId === mapDataId && stat.player_name === playerName) {
          return stat.player_team;
        }
      }
    }
    return null;
  }

  const rosterPlayers = new Set<string>();

  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMap(mapDataId);

    if (teamName) {
      for (const stat of allPlayerStats) {
        if (stat.MapDataId === mapDataId && stat.player_team === teamName) {
          rosterPlayers.add(stat.player_name);
        }
      }
    }
  }

  return Array.from(rosterPlayers);
}

export const getTeamRoster = cache(getTeamRosterUncached);

/**
 * Fetches base team data that is common across most DTOs
 * This eliminates ~40 redundant database queries
 */
async function getBaseTeamDataUncached(
  teamId: number,
  options: BaseTeamDataOptions = {}
): Promise<BaseTeamData> {
  const {
    excludePush = false,
    excludeClash = false,
    includeDateInfo = false,
    dateRange,
  } = options;

  // Fetch team roster first
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  const scrimWhereClause: Record<string, unknown> = { Team: { id: teamId } };
  if (dateRange) {
    scrimWhereClause.date = { gte: dateRange.from, lte: dateRange.to };
  }

  // Fetch all map data records
  const allMapDataRecords = await prisma.map.findMany({
    where: { Scrim: scrimWhereClause },
    select: {
      id: true,
      name: true,
      ...(includeDateInfo && {
        Scrim: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
      }),
    },
    ...(includeDateInfo && {
      orderBy: {
        Scrim: {
          date: "desc" as const,
        },
      },
    }),
  });

  // Filter map types if requested
  let mapDataRecords = allMapDataRecords;
  if (excludePush || excludeClash) {
    mapDataRecords = allMapDataRecords.filter((record) => {
      const mapName = record.name;
      if (!mapName) return false;
      const mapType =
        mapNameToMapTypeMapping[
          mapName as keyof typeof mapNameToMapTypeMapping
        ];
      if (excludePush && mapType === $Enums.MapType.Push) return false;
      if (excludeClash && mapType === $Enums.MapType.Clash) return false;
      return true;
    });
  }

  const mapDataIds = mapDataRecords.map((md) => md.id);

  // If no maps, return empty data
  if (mapDataIds.length === 0) {
    return {
      teamId,
      teamRoster,
      teamRosterSet,
      mapDataRecords: [],
      mapDataIds: [],
      allPlayerStats: [],
      matchStarts: [],
      finalRounds: [],
      captures: [],
      payloadProgresses: [],
      pointProgresses: [],
    };
  }

  // Fetch all common data in parallel
  const [
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
  ] = await Promise.all([
    prisma.playerStat.findMany({
      where: { MapDataId: { in: mapDataIds } },
      select: {
        player_name: true,
        player_team: true,
        player_hero: true,
        hero_time_played: true,
        MapDataId: true,
        eliminations: true,
        final_blows: true,
        deaths: true,
        offensive_assists: true,
        hero_damage_dealt: true,
        damage_taken: true,
        healing_dealt: true,
        ultimates_earned: true,
        ultimates_used: true,
      },
    }),
    prisma.matchStart.findMany({
      where: { MapDataId: { in: mapDataIds } },
    }),
    prisma.roundEnd.findMany({
      where: {
        MapDataId: { in: mapDataIds },
      },
      orderBy: { round_number: "desc" },
    }),
    prisma.objectiveCaptured.findMany({
      where: { MapDataId: { in: mapDataIds } },
      orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
    }),
    prisma.payloadProgress.findMany({
      where: { MapDataId: { in: mapDataIds } },
      orderBy: [
        { round_number: "asc" },
        { objective_index: "asc" },
        { match_time: "asc" },
      ],
    }),
    prisma.pointProgress.findMany({
      where: { MapDataId: { in: mapDataIds } },
      orderBy: [
        { round_number: "asc" },
        { objective_index: "asc" },
        { match_time: "asc" },
      ],
    }),
  ]);

  return {
    teamId,
    teamRoster,
    teamRosterSet,
    mapDataRecords: mapDataRecords as BaseTeamData["mapDataRecords"],
    mapDataIds,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
  };
}

export const getBaseTeamData = cache(getBaseTeamDataUncached);

/**
 * Fetches extended team data including fight-related events
 * Used by fight stats and quick wins DTOs
 */
async function getExtendedTeamDataUncached(
  teamId: number,
  options: BaseTeamDataOptions = {}
): Promise<ExtendedTeamData> {
  // Get base data first
  const baseData = await getBaseTeamData(teamId, options);

  // If no maps, return extended data with empty arrays
  if (baseData.mapDataIds.length === 0) {
    return {
      ...baseData,
      allKills: [],
      allRezzes: [],
      allUltimates: [],
    };
  }

  // Fetch fight-related data in parallel
  const [allKills, allRezzes, allUltimates] = await Promise.all([
    prisma.kill.findMany({
      where: { MapDataId: { in: baseData.mapDataIds } },
      orderBy: { match_time: "asc" },
    }),
    prisma.mercyRez.findMany({
      where: { MapDataId: { in: baseData.mapDataIds } },
      orderBy: { match_time: "asc" },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: { in: baseData.mapDataIds } },
      orderBy: { match_time: "asc" },
    }),
  ]);

  return {
    ...baseData,
    allKills,
    allRezzes,
    allUltimates,
  };
}

export const getExtendedTeamData = cache(getExtendedTeamDataUncached);
