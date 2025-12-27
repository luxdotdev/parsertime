import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { PlayerStat } from "@prisma/client";
import { cache } from "react";
import type { BaseTeamData } from "./team-shared-data";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  getBaseTeamData,
  getTeamRoster,
} from "./team-shared-data";

// Re-export getTeamRoster for backwards compatibility
export { getTeamRoster };

/**
 * Gets the roster (list of player names) for a specific team on a specific map.
 */
function getRosterForMap(
  mapDataId: number,
  teamName: string,
  allPlayerStats: {
    player_name: string;
    player_team: string;
    MapDataId: number | null;
  }[]
): string[] {
  const roster = new Set<string>();
  for (const stat of allPlayerStats) {
    if (stat.MapDataId === mapDataId && stat.player_team === teamName) {
      roster.add(stat.player_name);
    }
  }
  return Array.from(roster).sort();
}

/**
 * Finds the anchor player's team name for a specific map.
 * Uses fallback to next most frequent players if anchor is not on the map.
 */
function findTeamNameForMap(
  mapDataId: number,
  allPlayerStats: {
    player_name: string;
    player_team: string;
    MapDataId: number | null;
  }[],
  sortedPlayers: [string, number][]
): string | null {
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

export async function getTeamNameForRoster(teamId: number, mapDataId: number) {
  const roster = await getTeamRoster(teamId);

  if (roster.length === 0) {
    return null;
  }

  const playerStats = await prisma.playerStat.findMany({
    where: { MapDataId: mapDataId },
    select: { player_name: true, player_team: true },
    distinct: ["player_name", "player_team"],
  });

  const teamCounts = new Map<string, number>();

  for (const stat of playerStats) {
    if (roster.includes(stat.player_name)) {
      const currentCount = teamCounts.get(stat.player_team) ?? 0;
      teamCounts.set(stat.player_team, currentCount + 1);
    }
  }

  let maxCount = 0;
  let teamName: string | null = null;

  for (const [team, count] of teamCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      teamName = team;
    }
  }

  return teamName;
}

export async function filterTeamPlayerStats(
  teamId: number,
  mapDataId: number,
  playerStats: PlayerStat[]
) {
  const teamName = await getTeamNameForRoster(teamId, mapDataId);

  if (!teamName) {
    return [];
  }

  return playerStats.filter((stat) => stat.player_team === teamName);
}

type RosterCombination = {
  players: string[];
  wins: number;
  losses: number;
  winrate: number;
};

type MapWinrate = {
  mapName: string;
  totalWins: number;
  totalLosses: number;
  totalWinrate: number;
  rosterVariants: RosterCombination[];
  bestRoster: string[] | null;
  bestWinrate: number;
};

type TeamWinrates = {
  overallWins: number;
  overallLosses: number;
  overallWinrate: number;
  byMap: Record<string, MapWinrate>;
};

async function getTeamWinratesUncached(teamId: number): Promise<TeamWinrates> {
  const sharedData = await getBaseTeamData(teamId, { excludePush: true });
  return processTeamWinrates(sharedData);
}

function processTeamWinrates(sharedData: BaseTeamData): TeamWinrates {
  const {
    teamRoster,
    teamRosterSet,
    mapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
  } = sharedData;

  if (teamRoster.length === 0 || mapDataRecords.length === 0) {
    return {
      overallWins: 0,
      overallLosses: 0,
      overallWinrate: 0,
      byMap: {},
    };
  }

  // Build frequency map for anchor player identification
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

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );
  const mapWinrateData = new Map<string, MapWinrate>();
  let overallWins = 0;
  let overallLosses = 0;

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const mapName = mapDataRecord.name ?? "Unknown Map";

    // Find team name for this map
    const teamName = findTeamNameForMap(
      mapDataId,
      allPlayerStats,
      sortedPlayers
    );

    if (!teamName) continue;

    // Get roster for this map
    const roster = getRosterForMap(mapDataId, teamName, allPlayerStats);

    // VALIDATE: Only process this map if ALL players in the roster are part of the team roster
    const allPlayersInTeamRoster = roster.every((player) =>
      teamRosterSet.has(player)
    );

    if (!allPlayersInTeamRoster) {
      // This roster contains players not on the team roster (probably opponent team)
      continue;
    }

    const rosterKey = roster.join(",");

    // Calculate winner
    const matchDetails = matchStartMap.get(mapDataId) ?? null;
    const finalRound = finalRoundMap.get(mapDataId) ?? null;
    const winner = calculateWinner({
      matchDetails,
      finalRound,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
    });

    const isWin = winner === teamName;

    if (isWin) {
      overallWins++;
    } else {
      overallLosses++;
    }

    // Initialize map data if needed
    if (!mapWinrateData.has(mapName)) {
      mapWinrateData.set(mapName, {
        mapName,
        totalWins: 0,
        totalLosses: 0,
        totalWinrate: 0,
        rosterVariants: [],
        bestRoster: null,
        bestWinrate: 0,
      });
    }

    const currentMapData = mapWinrateData.get(mapName)!;

    // Update map totals
    if (isWin) {
      currentMapData.totalWins++;
    } else {
      currentMapData.totalLosses++;
    }

    // Find or create roster variant
    let rosterVariant = currentMapData.rosterVariants.find(
      (rv) => rv.players.join(",") === rosterKey
    );

    if (!rosterVariant) {
      rosterVariant = {
        players: roster,
        wins: 0,
        losses: 0,
        winrate: 0,
      };
      currentMapData.rosterVariants.push(rosterVariant);
    }

    // Update roster variant stats
    if (isWin) {
      rosterVariant.wins++;
    } else {
      rosterVariant.losses++;
    }
  }

  // 6. Calculate final percentages and find best rosters
  for (const mapData of mapWinrateData.values()) {
    const total = mapData.totalWins + mapData.totalLosses;
    mapData.totalWinrate = total > 0 ? (mapData.totalWins / total) * 100 : 0;

    // Calculate winrate for each roster variant
    for (const variant of mapData.rosterVariants) {
      const variantTotal = variant.wins + variant.losses;
      variant.winrate =
        variantTotal > 0 ? (variant.wins / variantTotal) * 100 : 0;
    }

    // Sort roster variants by winrate (descending)
    mapData.rosterVariants.sort((a, b) => b.winrate - a.winrate);

    // Set best roster
    if (mapData.rosterVariants.length > 0) {
      mapData.bestRoster = mapData.rosterVariants[0].players;
      mapData.bestWinrate = mapData.rosterVariants[0].winrate;
    }
  }

  // 7. Build final result
  const byMap: Record<string, MapWinrate> = {};
  for (const [mapName, data] of mapWinrateData.entries()) {
    byMap[mapName] = data;
  }

  const overallTotal = overallWins + overallLosses;
  const overallWinrate =
    overallTotal > 0 ? (overallWins / overallTotal) * 100 : 0;

  return {
    overallWins,
    overallLosses,
    overallWinrate,
    byMap,
  };
}

export const getTeamWinrates = cache(getTeamWinratesUncached);

async function getTopMapsByPlaytimeFn(teamId: number) {
  // Get all Maps for the team (MapDataId in event tables actually stores Map.id)
  const maps = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: {
      id: true,
      name: true,
    },
  });

  if (maps.length === 0) {
    return [];
  }

  const mapIds = maps.map((m) => m.id);

  const matchEnds = await prisma.matchEnd.findMany({
    where: { MapDataId: { in: mapIds } },
    select: {
      match_time: true,
      MapDataId: true,
    },
  });

  // First, sum all match ends by Map ID
  const playtimeByMapId = new Map<number, number>();

  for (const matchEnd of matchEnds) {
    const mapId = matchEnd.MapDataId;
    if (!mapId) continue;

    const currentPlaytime = playtimeByMapId.get(mapId) ?? 0;
    playtimeByMapId.set(mapId, currentPlaytime + matchEnd.match_time);
  }

  // Then, aggregate by map name (since same map can appear in multiple scrims)
  const playtimeByMapName = new Map<string, number>();

  for (const map of maps) {
    const mapName = map.name ?? "Unknown Map";
    const playtime = playtimeByMapId.get(map.id) ?? 0;

    const currentPlaytime = playtimeByMapName.get(mapName) ?? 0;
    playtimeByMapName.set(mapName, currentPlaytime + playtime);
  }

  // Convert to array format
  const mapsWithPlaytime = Array.from(playtimeByMapName.entries()).map(
    ([name, playtime]) => ({
      name,
      playtime,
    })
  );

  return mapsWithPlaytime.sort((a, b) => b.playtime - a.playtime);
}

export const getTopMapsByPlaytime = cache(getTopMapsByPlaytimeFn);

async function getTop5MapsByPlaytimeFn(teamId: number) {
  const top5Maps = await getTopMapsByPlaytime(teamId);
  return top5Maps.slice(0, 5);
}

export const getTop5MapsByPlaytime = cache(getTop5MapsByPlaytimeFn);

async function getBestMapByWinrateFn(teamId: number) {
  const [winrates, top5Maps] = await Promise.all([
    getTeamWinrates(teamId),
    getTopMapsByPlaytime(teamId),
  ]);

  const mapsWithStats = Object.keys(winrates.byMap).map((map) => ({
    mapName: map,
    playtime: top5Maps.find((m) => m.name === map)?.playtime ?? 0,
    winrate: winrates.byMap[map].totalWinrate,
  }));

  return mapsWithStats.sort((a, b) => {
    if (b.winrate !== a.winrate) {
      return b.winrate - a.winrate;
    }
    return b.playtime - a.playtime;
  })[0];
}

export const getBestMapByWinrate = cache(getBestMapByWinrateFn);

/**
 * Finds the map with the lowest winrate, then breaks ties by playtime.
 */
async function getBlindSpotMapFn(teamId: number) {
  const [winrates, topMaps] = await Promise.all([
    getTeamWinrates(teamId),
    getTopMapsByPlaytime(teamId),
  ]);

  const mapsWithStats = Object.keys(winrates.byMap).map((map) => ({
    mapName: map,
    playtime: topMaps.find((m) => m.name === map)?.playtime ?? 0,
    winrate: winrates.byMap[map].totalWinrate,
  }));

  const sortedMapsWithStats = mapsWithStats.sort((a, b) => {
    if (b.winrate !== a.winrate) {
      return a.winrate - b.winrate;
    }
    return b.playtime - a.playtime;
  });

  return sortedMapsWithStats[0];
}

export const getBlindSpotMap = cache(getBlindSpotMapFn);
