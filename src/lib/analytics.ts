import { getPlayerFinalStats } from "@/data/scrim-dto";
import prisma from "@/lib/prisma";
import { groupKillsIntoFights, removeDuplicateRows, round } from "@/lib/utils";
import { HeroName, heroRoleMapping } from "@/types/heroes";

export async function getAverageUltChargeTime(id: number, playerName: string) {
  const ultimatesCharged = await prisma.ultimateCharged.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
  });

  const ultimateEnds = await prisma.ultimateEnd.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
  });

  // Calculate average time to ultimate
  // Take the first ultimate charged and the next ultimate end
  // Then take the next ultimate charged and the next ultimate end
  // Continue until the end of the match
  const ultimateTimes = [ultimatesCharged[0].match_time];

  // for each ultimate end, calculate the time between the next ultimate charged and the current ultimate end
  for (let i = 0; i < ultimateEnds.length; i++) {
    const nextUltimateCharged = ultimatesCharged[i + 1];
    if (!nextUltimateCharged) {
      break;
    }
    const currentUltimateEnd = ultimateEnds[i];
    const timeToNextUltimate =
      nextUltimateCharged.match_time - currentUltimateEnd.match_time;

    // if time to next ultimate is negative, it means the next ultimate was charged before the current ultimate was used
    // so we should skip this ultimate end
    // this can happen if the round ends before the ultimate is used
    if (timeToNextUltimate < 0) {
      continue;
    }

    ultimateTimes.push(timeToNextUltimate);
  }

  const averageTimeToUltimate =
    ultimateTimes.reduce((a, b) => a + b, 0) / ultimateTimes.length;

  return averageTimeToUltimate;
}

export async function getAverageTimeToUseUlt(id: number, playerName: string) {
  const ultimatesCharged = await prisma.ultimateCharged.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
  });

  const ultimateStarts = await prisma.ultimateStart.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
  });

  const roundEnds = await prisma.roundEnd.findMany({
    where: {
      MapDataId: id,
    },
  });

  let totalUseTime = 0;
  let validUltimates = 0;

  ultimatesCharged.forEach((charged) => {
    // Find the next ultimate start for the same player after this charged event
    const nextStart = ultimateStarts.find(
      (start) =>
        start.player_name === charged.player_name &&
        start.match_time > charged.match_time &&
        start.ultimate_id === charged.ultimate_id
    );

    // Find the next round end event after this charged event
    const nextRoundEnd = roundEnds.find(
      (end) => end.match_time > charged.match_time
    );

    // Ensure the ultimate was started before the round ended or if there's no round end (last ultimate of the dataset)
    if (
      nextStart &&
      (!nextRoundEnd || nextStart.match_time < nextRoundEnd.match_time)
    ) {
      totalUseTime += nextStart.match_time - charged.match_time;
      validUltimates++;
    }
  });

  const averageTimeToUseUlt =
    validUltimates > 0 ? totalUseTime / validUltimates : 0;

  return averageTimeToUseUlt;
}

export async function getKillsPerUltimate(id: number, playerName: string) {
  const ultimatesCharged = await prisma.ultimateCharged.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
  });

  const ultKills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
      attacker_name: playerName,
      event_ability: "Ultimate",
    },
  });

  const killsPerUltimate = ultKills.length / ultimatesCharged.length;

  return killsPerUltimate;
}

export async function getDuelWinrates(id: number, playerName: string) {
  type AggregatedDuel = {
    player_name: string;
    player_hero: string;
    player_team: string;
    enemy_name: string;
    enemy_hero: string;
    enemy_team: string;
    enemy_kills: number;
    enemy_deaths: number;
  };

  const playerKills = await prisma.kill.findMany({
    where: {
      MapDataId: id,
      attacker_name: playerName,
    },
  });

  const playerDeaths = await prisma.kill.findMany({
    where: {
      MapDataId: id,
      victim_name: playerName,
    },
  });

  // Combine and aggregate kills and deaths
  const duelsAggregation: { [key: string]: AggregatedDuel } = {};

  playerKills.forEach((kill) => {
    const key = `${kill.attacker_hero}-${kill.victim_hero}`;
    if (!duelsAggregation[key]) {
      duelsAggregation[key] = {
        player_name: playerName,
        player_hero: kill.attacker_hero,
        player_team: kill.attacker_team,
        enemy_name: kill.victim_name,
        enemy_hero: kill.victim_hero,
        enemy_team: kill.victim_team,
        enemy_kills: 0,
        enemy_deaths: 1, // Since this is from playerKills
      };
    } else {
      duelsAggregation[key].enemy_deaths++;
    }
  });

  playerDeaths.forEach((death) => {
    const key = `${death.victim_hero}-${death.attacker_hero}`;
    if (!duelsAggregation[key]) {
      duelsAggregation[key] = {
        player_name: playerName,
        player_hero: death.victim_hero,
        player_team: death.victim_team,
        enemy_name: death.attacker_name,
        enemy_hero: death.attacker_hero,
        enemy_team: death.attacker_team,
        enemy_kills: 1, // Since this is from playerDeaths
        enemy_deaths: 0,
      };
    } else {
      duelsAggregation[key].enemy_kills++;
    }
  });

  // Convert the aggregated object back into an array for easy mapping
  return Object.values(duelsAggregation);
}

async function calculateAverageDuelWinrate(id: number, playerName: string) {
  const duels = await getDuelWinrates(id, playerName);

  const winrates = duels.map((duel) => {
    const totalKills = duel.enemy_kills + duel.enemy_deaths;
    const winrate = (duel.enemy_kills / totalKills) * 100;
    return {
      winrate,
    };
  });

  // sum all winrates and divide by the number of duels
  const averageWinrate =
    winrates.reduce((a, b) => a + b.winrate, 0) / winrates.length;

  return averageWinrate;
}

/**
 * Calculate the X-Factor for a player.
 *
 * The X-Factor is a measure of a player's individual impact on a fight.
 * It is calculated differently for each role, with different factors
 * being weighted differently.
 *
 * For DPS, it is calculated by several factors:
 *   1. Fleta Deadlift (how often the player gets the most final blows in a fight) - 50%
 *   2. Deaths per 10 minutes - 20%
 *   3. First pick potential (how often the player gets the first kill in a fight) - 10%
 *   4. Duel winrate (how often the player wins a 1v1 fight) - 10%
 *   5. Fight reversals (a fight reversal is when a player gets a kill after their team has lost 2 players) - 10%
 *
 * For tanks, it is calculated by:
 *   1. Fleta Deadlift (how often the player gets the most final blows in a fight) - 50%
 *   2. Deaths per 10 minutes - 20%
 *   3. First death potential (how often the player is the first to die in a fight) - 15%
 *   4. Fight reversals - 10%
 *   5. Duel winrate - 5%
 *
 * For supports, it is calculated by:
 *   1. Fleta Deadlift (how often the player gets the most final blows in a fight) - 50%
 *   2. Deaths per 10 minutes - 20%
 *   3. Duel winrate (since supports are often targeted first) - 15%
 *   4. Fight reversals - 15%
 */
export async function calculateXFactor(mapId: number, playerName: string) {
  // Get the player's role
  const playerStats = await getPlayerFinalStats(mapId, playerName);
  const mostPlayedHero = playerStats.sort(
    (a, b) => b.hero_time_played - a.hero_time_played
  )[0].player_hero;

  const heroRole = heroRoleMapping[mostPlayedHero as HeroName];

  const fights = await groupKillsIntoFights(mapId);

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

  const duelWinratePercentage = await calculateAverageDuelWinrate(
    mapId,
    playerName
  );

  const finalRound = await prisma.roundEnd.findFirst({
    where: {
      MapDataId: mapId,
    },
    orderBy: {
      round_number: "desc",
    },
  });

  const playerStatsByFinalRound = await getPlayerFinalStats(mapId, playerName);

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

  type DeathsPer10 = { player_name: string; deaths_per_10: number };

  const deathsPer10 = await prisma.$queryRaw<DeathsPer10[]>`
    SELECT
        "player_name",
        (SUM(deaths) / SUM(hero_time_played / 600)) AS deaths_per_10
    FROM
        "PlayerStat"
    WHERE
        "MapDataId" = ${mapId}
        and "player_name" = ${playerName}
    GROUP BY
        "player_name"`;

  let xFactor = 0;
  switch (heroRole) {
    case "Damage":
      xFactor =
        playerFletaDeadliftPercentage * 0.5 +
        deathsPer10[0].deaths_per_10 * 0.2 +
        firstPickPercentage * 0.1 +
        duelWinratePercentage * 0.1 +
        fightReversalPercentage * 0.1;
      break;

    case "Tank":
      xFactor =
        playerFletaDeadliftPercentage * 0.5 +
        deathsPer10[0].deaths_per_10 * 0.2 +
        firstDeathPercentage * 0.15 +
        duelWinratePercentage * 0.05 +
        fightReversalPercentage * 0.1;
      break;

    case "Support":
      xFactor =
        playerFletaDeadliftPercentage * 0.5 +
        deathsPer10[0].deaths_per_10 * 0.2 +
        duelWinratePercentage * 0.15 +
        fightReversalPercentage * 0.15;
      break;
  }

  return round(xFactor);
}
