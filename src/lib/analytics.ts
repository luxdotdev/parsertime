import prisma from "@/lib/prisma";

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
