import "server-only";

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

export type EnemyHeroWinrate = {
  heroName: HeroName;
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
};

export type EnemyHeroAnalysis = {
  winrateVsHero: EnemyHeroWinrate[];
};

const MIN_GAMES_FOR_INCLUSION = 2;

async function getEnemyHeroAnalysisUncached(
  teamId: number,
  dateRange?: TeamDateRange
): Promise<EnemyHeroAnalysis> {
  const sharedData = await getBaseTeamData(teamId, {
    excludePush: true,
    excludeClash: true,
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
    return { winrateVsHero: [] };
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

  // Track wins/losses per enemy hero across all maps
  const enemyHeroData = new Map<
    string,
    { wins: number; losses: number; maps: Set<number> }
  >();

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

    // Find enemy players for this map
    const enemyPlayers = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team !== teamName
    );

    // Track unique enemy heroes per map (a hero may appear multiple times
    // if swapped to/from, so deduplicate per map)
    const seenHeroes = new Set<string>();
    for (const enemy of enemyPlayers) {
      const hero = enemy.player_hero;
      if (seenHeroes.has(hero)) continue;
      seenHeroes.add(hero);

      if (!enemyHeroData.has(hero)) {
        enemyHeroData.set(hero, { wins: 0, losses: 0, maps: new Set() });
      }

      const data = enemyHeroData.get(hero)!;
      if (!data.maps.has(mapDataId)) {
        data.maps.add(mapDataId);
        if (isWin) {
          data.wins++;
        } else {
          data.losses++;
        }
      }
    }
  }

  const winrateVsHero: EnemyHeroWinrate[] = [];

  for (const [heroName, data] of enemyHeroData.entries()) {
    const gamesPlayed = data.wins + data.losses;
    if (gamesPlayed < MIN_GAMES_FOR_INCLUSION) continue;

    winrateVsHero.push({
      heroName: heroName as HeroName,
      wins: data.wins,
      losses: data.losses,
      winrate: (data.wins / gamesPlayed) * 100,
      gamesPlayed,
    });
  }

  winrateVsHero.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return { winrateVsHero };
}

export const getEnemyHeroAnalysis = cache(getEnemyHeroAnalysisUncached);
