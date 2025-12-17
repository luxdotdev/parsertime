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

export async function calculateStats(mapId: number, playerName: string) {
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
    getPlayerFinalStats(mapId, playerName),
    groupKillsIntoFights(mapId),
    prisma.roundEnd.findFirst({
      where: { MapDataId: mapId },
      orderBy: { round_number: "desc" },
    }),
    getPlayerFinalStats(mapId, playerName),
    getAverageUltChargeTime(mapId, playerName),
    getAverageTimeToUseUlt(mapId, playerName),
    getKillsPerUltimate(mapId, playerName),
    calculateDroughtTime(mapId, playerName),
    getDuelWinrates(mapId, playerName),
    getAjaxes(mapId, playerName),
    calculateMVPScore({ mapId, playerName }),
    getMVPForMap(mapId),
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
        MapDataId: mapId,
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
    role: heroRole,
    fletaDeadliftPercentage: playerFletaDeadliftPercentage,
    firstPickPercentage,
    firstPickCount: playerFirstKills.length,
    firstDeathPercentage,
    firstDeathCount: playerFirstDeaths.length,
    mvpScore: playerMvpScore?.totalScore,
    isMapMVP: mapMVP?.playerName === playerName,
    ajaxCount,
    averageUltChargeTime,
    averageTimeToUseUlt,
    droughtTime,
    killsPerUltimate,
    duels,
    fightReversalPercentage,
  };
}
