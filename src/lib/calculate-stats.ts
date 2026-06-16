import {
  calculateDroughtTimeForMapData,
  getAjaxesForMapData,
  getAverageTimeToUseUltForMapData,
  getAverageUltChargeTimeForMapData,
  getDuelWinratesForMapData,
  getKillsPerUltimateForMapData,
} from "@/lib/analytics";
import {
  calculateMVPScoreFromStats,
  getMVPForFinalRoundStats,
} from "@/lib/mvp-score";
import { getSpatialStatsForMapData } from "@/lib/spatial-stats";
import { getUltQualityStatsForMapData } from "@/lib/ult-quality-db";
import { removeDuplicateRows, round } from "@/lib/utils";
import { groupKillsIntoFightsByMapDataId } from "@/lib/server-utils";
import { heroPriority, type HeroName, heroRoleMapping } from "@/types/heroes";
import type { PlayerStat } from "@/generated/prisma/client";
import prisma from "./prisma";

export async function calculateStats(mapDataId: number, playerName: string) {
  const finalRoundStats = await getFinalRoundStatsByMapDataId(mapDataId);
  const playerFinalRoundStats = finalRoundStats.filter(
    (stat) => stat.player_name === playerName
  );

  const [
    fights,
    finalRound,
    averageUltChargeTime,
    averageTimeToUseUlt,
    killsPerUltimate,
    droughtTime,
    duels,
    ajaxCount,
    playerMvpScore,
    mapMVP,
    spatialStats,
    ultStats,
  ] = await Promise.all([
    groupKillsIntoFightsByMapDataId(mapDataId),
    prisma.roundEnd.findFirst({
      where: { MapDataId: mapDataId },
      orderBy: { round_number: "desc" },
    }),
    getAverageUltChargeTimeForMapData(mapDataId, playerName),
    getAverageTimeToUseUltForMapData(mapDataId, playerName),
    getKillsPerUltimateForMapData(mapDataId, playerName),
    calculateDroughtTimeForMapData(mapDataId, playerName),
    getDuelWinratesForMapData(mapDataId, playerName),
    getAjaxesForMapData(mapDataId, playerName),
    calculateMVPScoreFromStats({
      playerStats: playerFinalRoundStats,
      playerName,
    }),
    getMVPForFinalRoundStats(finalRoundStats),
    getSpatialStatsForMapData(mapDataId, playerName),
    getUltQualityStatsForMapData(mapDataId, playerName),
  ]);

  const mostPlayedHero = playerFinalRoundStats.sort(
    (a, b) => b.hero_time_played - a.hero_time_played
  )[0].player_hero;

  const heroRole = heroRoleMapping[mostPlayedHero as HeroName];

  const firstKills = fights.map((fight) => fight.kills[0]);
  const playerFirstKills = firstKills.filter(
    (kill) => kill.attacker_name === playerName
  );

  const playerFirstDeaths = firstKills.filter(
    (kill) => kill.victim_name === playerName
  );

  const firstPickPercentage = round(
    fights.length > 0 ? (playerFirstKills.length / fights.length) * 100 : 0
  );
  const firstDeathPercentage = round(
    fights.length > 0 ? (playerFirstDeaths.length / fights.length) * 100 : 0
  );

  const team = playerFinalRoundStats[0]?.player_team;

  const teamFinalBlows = removeDuplicateRows(
    await prisma.playerStat.findMany({
      where: {
        MapDataId: mapDataId,
        player_team: team,
        round_number: finalRound?.round_number,
      },
      select: {
        id: true,
        final_blows: true,
        player_hero: true,
      },
    })
  );

  const teamTotalFinalBlows = teamFinalBlows.reduce(
    (acc, { final_blows }) => acc + final_blows,
    0
  );

  const playerFinalBlows = playerFinalRoundStats.reduce(
    (acc, { final_blows }) => acc + final_blows,
    0
  );

  const playerFletaDeadliftPercentage =
    teamTotalFinalBlows > 0
      ? (playerFinalBlows / teamTotalFinalBlows) * 100
      : 0;

  const fightReversals = fights.filter((fight) => {
    const playerKills = fight.kills.filter(
      (kill) => kill.attacker_name === playerName
    );
    const enemyKills = fight.kills.filter(
      (kill) => kill.attacker_name !== playerName
    );

    return playerKills.length === 0 && enemyKills.length > 1;
  });

  const fightReversalPercentage = round(
    fights.length > 0 ? (fightReversals.length / fights.length) * 100 : 0
  );

  return {
    playerName,
    hero: mostPlayedHero,
    role: heroRole.toUpperCase(),
    fletaDeadliftPercentage: round(playerFletaDeadliftPercentage),
    firstPickPercentage: round(firstPickPercentage),
    firstPickCount: playerFirstKills.length,
    firstDeathPercentage: round(firstDeathPercentage),
    firstDeathCount: playerFirstDeaths.length,
    mvpScore: round(playerMvpScore?.totalScore ?? 0),
    isMapMVP: mapMVP?.playerName === playerName,
    ajaxCount,
    averageUltChargeTime: round(averageUltChargeTime),
    averageTimeToUseUlt: round(averageTimeToUseUlt),
    droughtTime: round(droughtTime),
    killsPerUltimate: round(killsPerUltimate),
    duels,
    fightReversalPercentage: round(fightReversalPercentage),
    averageEngagementDistance: spatialStats.averageEngagementDistance,
    highGroundKillPercentage: spatialStats.highGroundKillPercentage,
    isolationDeathPercentage: spatialStats.isolationDeathPercentage,
    averageFightStartSpread: spatialStats.averageFightStartSpread,
    averageUltConversionKills: ultStats.averageUltConversionKills,
    ultDeathPercentage: ultStats.ultDeathPercentage,
    averageUltDisplacement: ultStats.averageUltDisplacement,
    ultsOnObjectivePercentage: ultStats.ultsOnObjectivePercentage,
  };
}

async function getFinalRoundStatsByMapDataId(
  mapDataId: number
): Promise<PlayerStat[]> {
  const rawStats = await prisma.$queryRaw<PlayerStat[]>`
    WITH maxTime AS (
      SELECT
        MAX("match_time") AS max_time
      FROM
        "PlayerStat"
      WHERE
        "MapDataId" = ${mapDataId}
    )
    SELECT
      ps.*
    FROM
      "PlayerStat" ps
      INNER JOIN maxTime m ON ps."match_time" = m.max_time
    WHERE
      ps."MapDataId" = ${mapDataId}`;

  return removeDuplicateRows(rawStats)
    .sort((a, b) => a.player_name.localeCompare(b.player_name))
    .sort(
      (a, b) =>
        heroPriority[heroRoleMapping[a.player_hero as HeroName]] -
        heroPriority[heroRoleMapping[b.player_hero as HeroName]]
    )
    .sort((a, b) => a.player_team.localeCompare(b.player_team));
}
