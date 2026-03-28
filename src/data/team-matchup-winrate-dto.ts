import "server-only";

import { determineRole } from "@/lib/player-table-data";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { cache } from "react";
import type { TeamDateRange } from "./team-shared-core";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "./team-shared-core";
import { getBaseTeamData } from "./team-shared-data";

export type MapHeroEntry = {
  heroName: HeroName;
  role: "Tank" | "Damage" | "Support";
  playerName: string;
  timePlayed: number;
};

export type MatchupMapResult = {
  mapDataId: number;
  mapName: string;
  scrimName: string;
  date: string;
  isWin: boolean;
  ourHeroes: MapHeroEntry[];
  enemyHeroes: MapHeroEntry[];
};

export type MatchupWinrateData = {
  maps: MatchupMapResult[];
  allOurHeroes: HeroName[];
  allEnemyHeroes: HeroName[];
};

async function getMatchupWinrateDataUncached(
  teamId: number,
  dateRange?: TeamDateRange
): Promise<MatchupWinrateData> {
  const sharedData = await getBaseTeamData(teamId, {
    excludePush: true,
    excludeClash: true,
    includeDateInfo: true,
    dateRange,
  });

  const {
    teamRosterSet,
    mapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
  } = sharedData;

  if (mapDataRecords.length === 0) {
    return { maps: [], allOurHeroes: [], allEnemyHeroes: [] };
  }

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );
  const {
    team1ProgressMap: team1PayloadProgressMap,
    team2ProgressMap: team2PayloadProgressMap,
  } = buildProgressMaps(payloadProgresses, matchStartMap);
  const {
    team1ProgressMap: team1PointProgressMap,
    team2ProgressMap: team2PointProgressMap,
  } = buildProgressMaps(pointProgresses, matchStartMap);

  const maps: MatchupMapResult[] = [];
  const allOurHeroesSet = new Set<HeroName>();
  const allEnemyHeroesSet = new Set<HeroName>();

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;

    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );

    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    const matchDetails = matchStartMap.get(mapDataId) ?? null;
    const finalRound = finalRoundMap.get(mapDataId) ?? null;
    const winner = calculateWinner({
      matchDetails,
      finalRound,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
      team1PayloadProgress: team1PayloadProgressMap.get(mapDataId) ?? [],
      team2PayloadProgress: team2PayloadProgressMap.get(mapDataId) ?? [],
      team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
      team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
    });

    const isWin = winner === teamName;

    const enemyPlayers = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team !== teamName
    );

    const ourHeroes = buildHeroEntries(playersOnMap);
    const enemyHeroes = buildHeroEntries(enemyPlayers);

    for (const h of ourHeroes) allOurHeroesSet.add(h.heroName);
    for (const h of enemyHeroes) allEnemyHeroesSet.add(h.heroName);

    const scrim = (mapDataRecord as { Scrim?: { name: string; date: Date } })
      .Scrim;

    maps.push({
      mapDataId,
      mapName: mapDataRecord.name ?? "Unknown",
      scrimName: scrim?.name ?? "Unknown",
      date: scrim?.date?.toISOString() ?? new Date().toISOString(),
      isWin,
      ourHeroes,
      enemyHeroes,
    });
  }

  maps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const allOurHeroes = Array.from(allOurHeroesSet).sort();
  const allEnemyHeroes = Array.from(allEnemyHeroesSet).sort();

  return { maps, allOurHeroes, allEnemyHeroes };
}

function buildHeroEntries(
  playerStats: {
    player_name: string;
    player_hero: string;
    hero_time_played: number;
    MapDataId: number | null;
  }[]
): MapHeroEntry[] {
  // Group by player, pick each player's most-played hero
  const playerMap = new Map<string, { heroName: string; timePlayed: number }>();

  for (const stat of playerStats) {
    const existing = playerMap.get(stat.player_name);
    if (!existing || stat.hero_time_played > existing.timePlayed) {
      playerMap.set(stat.player_name, {
        heroName: stat.player_hero,
        timePlayed: stat.hero_time_played,
      });
    }
  }

  const entries: MapHeroEntry[] = [];
  for (const [playerName, data] of playerMap.entries()) {
    const role = determineRole(data.heroName as HeroName);
    if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

    entries.push({
      heroName: data.heroName as HeroName,
      role,
      playerName,
      timePlayed: data.timePlayed,
    });
  }

  // Sort by role order (Tank > Damage > Support), then alphabetically
  const roleOrder = { Tank: 0, Damage: 1, Support: 2 };
  entries.sort(
    (a, b) =>
      roleOrder[a.role] - roleOrder[b.role] ||
      a.heroName.localeCompare(b.heroName)
  );

  // Cap at 5 (1 tank + 2 dps + 2 support)
  return entries.slice(0, 5);
}

export const getMatchupWinrateData = cache(getMatchupWinrateDataUncached);
