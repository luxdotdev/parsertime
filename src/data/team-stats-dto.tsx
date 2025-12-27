import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import { mapNameToMapTypeMapping } from "@/types/map";
import type { PlayerStat } from "@prisma/client";
import { $Enums } from "@prisma/client";
import { cache } from "react";

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

async function getTeamRosterUncached(teamId: number) {
  // 1. Get all MapData for the team ID through the relationship chain
  const mapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: { id: true },
  });

  const mapDataIds = mapDataRecords.map((md) => md.id);

  if (mapDataIds.length === 0) {
    return [];
  }

  // 2. Get ALL PlayerStat records for ALL maps in a single query (batch optimization)
  const allPlayerStats = await prisma.playerStat.findMany({
    where: { MapDataId: { in: mapDataIds } },
    select: {
      player_name: true,
      player_team: true,
      MapDataId: true,
    },
  });

  // 3. Process in memory: count each unique player exactly once per map
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

  // 4. Find the most frequently occurring player to use as anchor
  const sortedPlayers = Array.from(playerFrequencyMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  if (sortedPlayers.length === 0) {
    return [];
  }

  // 5. Find an anchor player who appears in the data
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

  // 6. For each map, find the anchor player's team name, then collect all players on that team
  const rosterPlayers = new Set<string>();

  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMap(
      mapDataId,
      allPlayerStats,
      sortedPlayers
    );

    if (teamName) {
      const mapRoster = getRosterForMap(mapDataId, teamName, allPlayerStats);
      mapRoster.forEach((player) => rosterPlayers.add(player));
    }
  }

  return Array.from(rosterPlayers);
}

export const getTeamRoster = cache(getTeamRosterUncached);

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
  // 0. Get the team's actual roster first
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return {
      overallWins: 0,
      overallLosses: 0,
      overallWinrate: 0,
      byMap: {},
    };
  }

  // 1. Get all MapData IDs for the team
  const allMapDataRecords = await prisma.mapData.findMany({
    where: { Map: { Scrim: { Team: { id: teamId } } } },
    select: {
      id: true,
      Map: { select: { name: true } },
    },
  });

  // Filter out Push maps as they cannot be calculated
  const mapDataRecords = allMapDataRecords.filter((record) => {
    const mapName = record.Map?.name;
    if (!mapName) return false;

    const mapType =
      mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping];
    return mapType !== $Enums.MapType.Push;
  });

  if (mapDataRecords.length === 0) {
    return {
      overallWins: 0,
      overallLosses: 0,
      overallWinrate: 0,
      byMap: {},
    };
  }

  const mapDataIds = mapDataRecords.map((md) => md.id);

  // 2. Get all necessary data in batch queries
  const [allPlayerStats, matchStarts, finalRounds, captures] =
    await Promise.all([
      prisma.playerStat.findMany({
        where: { MapDataId: { in: mapDataIds } },
        select: {
          player_name: true,
          player_team: true,
          MapDataId: true,
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
      }),
    ]);

  // 3. Build frequency map for anchor player identification
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

  // 4. Create lookup maps for winner calculation
  const finalRoundMap = new Map<number, (typeof finalRounds)[0]>();
  for (const round of finalRounds) {
    const mapDataId = round.MapDataId;
    if (mapDataId) {
      const existing = finalRoundMap.get(mapDataId);
      if (!existing || round.round_number > existing.round_number) {
        finalRoundMap.set(mapDataId, round);
      }
    }
  }

  const matchStartMap = new Map<number, (typeof matchStarts)[0]>();
  for (const match of matchStarts) {
    if (match.MapDataId) {
      matchStartMap.set(match.MapDataId, match);
    }
  }

  // Organize captures by map and team
  const team1CapturesMap = new Map<number, typeof captures>();
  const team2CapturesMap = new Map<number, typeof captures>();

  for (const capture of captures) {
    const mapDataId = capture.MapDataId;
    if (!mapDataId) continue;

    const match = matchStartMap.get(mapDataId);
    if (!match) continue;

    if (capture.capturing_team === match.team_1_name) {
      if (!team1CapturesMap.has(mapDataId)) {
        team1CapturesMap.set(mapDataId, []);
      }
      team1CapturesMap.get(mapDataId)!.push(capture);
    } else if (capture.capturing_team === match.team_2_name) {
      if (!team2CapturesMap.has(mapDataId)) {
        team2CapturesMap.set(mapDataId, []);
      }
      team2CapturesMap.get(mapDataId)!.push(capture);
    }
  }

  // 5. Calculate winrates for each map and roster combination
  const mapWinrateData = new Map<string, MapWinrate>();
  let overallWins = 0;
  let overallLosses = 0;

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const mapName = mapDataRecord.Map?.name ?? "Unknown Map";

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

async function getTop5MapsByPlaytimeFn(teamId: number) {
  const mapDataIds = await prisma.mapData.findMany({
    where: { Map: { Scrim: { Team: { id: teamId } } } },
    select: {
      id: true,
      Map: { select: { name: true } },
    },
  });

  const matchEnds = await prisma.matchEnd.findMany({
    where: { MapDataId: { in: mapDataIds.map((md) => md.id) } },
    select: {
      match_time: true,
      MapDataId: true,
    },
  });

  // Sum all match ends that the team has played
  const playtimeByMap = new Map<number, number>();

  for (const matchEnd of matchEnds) {
    const mapDataId = matchEnd.MapDataId;
    if (!mapDataId) continue;

    const currentPlaytime = playtimeByMap.get(mapDataId) ?? 0;
    playtimeByMap.set(mapDataId, currentPlaytime + matchEnd.match_time);
  }

  const top5Maps = mapDataIds.map((md) => ({
    id: md.id,
    name: md.Map?.name ?? "Unknown Map",
    playtime: playtimeByMap.get(md.id) ?? 0,
  }));

  return top5Maps.sort((a, b) => b.playtime - a.playtime).slice(0, 5);
}

export const getTop5MapsByPlaytime = cache(getTop5MapsByPlaytimeFn);

async function getBestMapByWinrateFn(teamId: number) {
  const [winrates, top5Maps] = await Promise.all([
    getTeamWinrates(teamId),
    getTop5MapsByPlaytime(teamId),
  ]);

  // Get the map(s) with the highest winrate, then break ties by playtime
  const bestMaps = Object.keys(winrates.byMap).sort(
    (a, b) => winrates.byMap[b].totalWinrate - winrates.byMap[a].totalWinrate
  );

  return bestMaps
    .map((map) => ({
      mapName: map,
      playtime: top5Maps.find((m) => m.name === map)?.playtime ?? 0,
      winrate: winrates.byMap[map].totalWinrate,
    }))
    .sort((a, b) => b.playtime - a.playtime)[0];
}

export const getBestMapByWinrate = cache(getBestMapByWinrateFn);
