import { getPlayerFinalStats } from "@/data/scrim-dto";
import {
  calculateDroughtTime,
  getAjaxes,
  getAverageTimeToUseUlt,
  getAverageUltChargeTime,
  getDuelWinrates,
  getKillsPerUltimate,
} from "@/lib/analytics";
import { calculateMVPScore, getMVPForMap } from "@/lib/mvp-score";
import { groupKillsIntoFights, removeDuplicateRows, round } from "@/lib/utils";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import prisma from "./prisma";

export async function calculateStats(mapDataId: number, playerName: string) {
  const [
    playerStats,
    fights,
    finalRound,
    playerStatsByFinalRound,
    averageUltChargeTime,
    averageTimeToUseUlt,
    killsPerUltimate,
    droughtTime,
    duels,
    ajaxCount,
    playerMvpScore,
    mapMVP,
  ] = await Promise.all([
    getPlayerFinalStats(mapDataId, playerName),
    groupKillsIntoFights(mapDataId),
    prisma.roundEnd.findFirst({
      where: { MapDataId: mapDataId },
      orderBy: { round_number: "desc" },
    }),
    getPlayerFinalStats(mapDataId, playerName),
    getAverageUltChargeTime(mapDataId, playerName),
    getAverageTimeToUseUlt(mapDataId, playerName),
    getKillsPerUltimate(mapDataId, playerName),
    calculateDroughtTime(mapDataId, playerName),
    getDuelWinrates(mapDataId, playerName),
    getAjaxes(mapDataId, playerName),
    calculateMVPScore({ mapId: mapDataId, playerName }),
    getMVPForMap(mapDataId),
  ]);

  const mostPlayedHero = playerStats.sort(
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
    (playerFirstKills.length / fights.length) * 100
  );
  const firstDeathPercentage = round(
    (playerFirstDeaths.length / fights.length) * 100
  );

  const team = playerStatsByFinalRound[0]?.player_team;

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

  const playerFinalBlows = playerStatsByFinalRound.reduce(
    (acc, { final_blows }) => acc + final_blows,
    0
  );

  const playerFletaDeadliftPercentage =
    (playerFinalBlows / (teamTotalFinalBlows - playerFinalBlows)) * 100;

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
    (fightReversals.length / fights.length) * 100
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
  };
}
