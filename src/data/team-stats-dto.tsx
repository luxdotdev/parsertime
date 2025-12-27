import "server-only";

import prisma from "@/lib/prisma";
import type { PlayerStat } from "@prisma/client";
import { cache } from "react";

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
  // We'll use this player to identify which team is the roster on each map
  let anchorPlayer: string | null = null;

  for (const [playerName] of sortedPlayers) {
    // Check if this player appears in the stats
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
    // Find the anchor player's team name on this specific map
    let anchorTeamName: string | null = null;

    for (const stat of allPlayerStats) {
      if (stat.MapDataId === mapDataId && stat.player_name === anchorPlayer) {
        anchorTeamName = stat.player_team;
        break;
      }
    }

    // If anchor player is not on this map, try the next most frequent players as fallback
    if (!anchorTeamName) {
      for (const [fallbackPlayer] of sortedPlayers) {
        if (fallbackPlayer === anchorPlayer) continue;

        for (const stat of allPlayerStats) {
          if (
            stat.MapDataId === mapDataId &&
            stat.player_name === fallbackPlayer
          ) {
            anchorTeamName = stat.player_team;
            break;
          }
        }

        if (anchorTeamName) break;
      }
    }

    // If we found the team name, collect all players on that team for this map
    if (anchorTeamName) {
      for (const stat of allPlayerStats) {
        if (
          stat.MapDataId === mapDataId &&
          stat.player_team === anchorTeamName
        ) {
          rosterPlayers.add(stat.player_name);
        }
      }
    }
  }

  return Array.from(rosterPlayers);
}

export const getTeamRoster = cache(getTeamRosterUncached);

export async function getTeamNameForRoster(teamId: number, mapDataId: number) {
  // Get the roster for the team
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
