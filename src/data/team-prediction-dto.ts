import "server-only";

import { getTeamBanImpactAnalysis } from "@/data/team-ban-impact-dto";
import { getEnemyHeroAnalysis } from "@/data/team-enemy-hero-dto";
import { getHeroPoolAnalysis } from "@/data/team-hero-pool-dto";
import { getMapModePerformance } from "@/data/team-map-mode-stats-dto";
import { getBestRoleTrios, type RoleTrio } from "@/data/team-role-stats-dto";
import { getTeamWinrates } from "@/data/team-stats-dto";
import type { HeroName } from "@/types/heroes";
import { roleHeroMapping } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";
import { $Enums } from "@prisma/client";
import { cache } from "react";
import type { TeamDateRange } from "./team-shared-core";

export type SimulatorContext = {
  baseWinrate: number;
  totalGames: number;
  heroBanDeltas: Record<string, number>;
  heroBanSampleSizes: Record<string, number>;
  ourBanDeltas: Record<string, number>;
  ourBanSampleSizes: Record<string, number>;
  mapWinrates: Record<string, number>;
  mapSampleSizes: Record<string, number>;
  mapModeWinrates: Record<string, number>;
  roleTrioWinrates: RoleTrio[];
  heroPoolWinrates: Record<string, number>;
  heroPoolSampleSizes: Record<string, number>;
  enemyHeroWinrates: Record<string, number>;
  enemyHeroSampleSizes: Record<string, number>;
  availableHeroes: HeroName[];
  availableMaps: string[];
};

const EXCLUDED_MAP_TYPES = new Set<$Enums.MapType>([
  $Enums.MapType.Push,
  $Enums.MapType.Clash,
]);

async function getSimulatorContextUncached(
  teamId: number,
  dateRange?: TeamDateRange
): Promise<SimulatorContext> {
  const [winrates, banAnalysis, heroPool, mapModePerf, roleTrios, enemyHeroes] =
    await Promise.all([
      getTeamWinrates(teamId, dateRange),
      getTeamBanImpactAnalysis(teamId, dateRange),
      getHeroPoolAnalysis(teamId, dateRange?.from, dateRange?.to),
      getMapModePerformance(teamId, dateRange),
      getBestRoleTrios(teamId, dateRange),
      getEnemyHeroAnalysis(teamId, dateRange),
    ]);

  const totalGames = winrates.overallWins + winrates.overallLosses;
  const baseWinrate = totalGames > 0 ? winrates.overallWins / totalGames : 0.5;

  const heroBanDeltas: Record<string, number> = {};
  const heroBanSampleSizes: Record<string, number> = {};
  for (const impact of banAnalysis.received.banImpacts) {
    heroBanDeltas[impact.hero] = impact.winRateDelta;
    heroBanSampleSizes[impact.hero] = impact.mapsBanned;
  }

  const ourBanDeltas: Record<string, number> = {};
  const ourBanSampleSizes: Record<string, number> = {};
  for (const impact of banAnalysis.outgoing.ourBanImpacts) {
    ourBanDeltas[impact.hero] = impact.winRateDelta;
    ourBanSampleSizes[impact.hero] = impact.mapsBanned;
  }

  const mapWinrates: Record<string, number> = {};
  const mapSampleSizes: Record<string, number> = {};
  const availableMaps: string[] = [];

  for (const [mapName, mapData] of Object.entries(winrates.byMap)) {
    const mapType =
      mapNameToMapTypeMapping[mapName as keyof typeof mapNameToMapTypeMapping];
    if (mapType && EXCLUDED_MAP_TYPES.has(mapType)) continue;

    const games = mapData.totalWins + mapData.totalLosses;
    if (games === 0) continue;

    mapWinrates[mapName] = mapData.totalWinrate / 100;
    mapSampleSizes[mapName] = games;
    availableMaps.push(mapName);
  }

  availableMaps.sort();

  const mapModeWinrates: Record<string, number> = {};
  for (const [modeKey, modeData] of Object.entries(mapModePerf.byMode)) {
    if (EXCLUDED_MAP_TYPES.has(modeKey as $Enums.MapType)) continue;
    if (modeData.gamesPlayed > 0) {
      mapModeWinrates[modeKey] = modeData.winrate / 100;
    }
  }

  const heroPoolWinrates: Record<string, number> = {};
  const heroPoolSampleSizes: Record<string, number> = {};
  for (const hero of heroPool.topHeroWinrates) {
    heroPoolWinrates[hero.heroName] = hero.winrate / 100;
    heroPoolSampleSizes[hero.heroName] = hero.gamesPlayed;
  }

  const enemyHeroWinrates: Record<string, number> = {};
  const enemyHeroSampleSizes: Record<string, number> = {};
  for (const hero of enemyHeroes.winrateVsHero) {
    enemyHeroWinrates[hero.heroName] = hero.winrate / 100;
    enemyHeroSampleSizes[hero.heroName] = hero.gamesPlayed;
  }

  const allHeroes: HeroName[] = [
    ...roleHeroMapping.Tank,
    ...roleHeroMapping.Damage,
    ...roleHeroMapping.Support,
  ];

  return {
    baseWinrate,
    totalGames,
    heroBanDeltas,
    heroBanSampleSizes,
    ourBanDeltas,
    ourBanSampleSizes,
    mapWinrates,
    mapSampleSizes,
    mapModeWinrates,
    roleTrioWinrates: roleTrios,
    heroPoolWinrates,
    heroPoolSampleSizes,
    enemyHeroWinrates,
    enemyHeroSampleSizes,
    availableHeroes: allHeroes,
    availableMaps,
  };
}

export const getSimulatorContext = cache(getSimulatorContextUncached);
