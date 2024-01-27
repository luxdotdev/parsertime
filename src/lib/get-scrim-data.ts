import prisma from "@/lib/prisma";

export async function getScrimDataById(id: number) {
  const defensiveAssists = await getDefensiveAssistsByScrimId(id);
  const heroSpawns = await getHeroSpawnsById(id);
  const heroSwaps = await getHeroSwapsById(id);
  const kills = await getKillsById(id);
  const matchStart = await getMatchStartById(id);
  const objectiveCaptured = await getObjectiveCapturedById(id);
  const objectiveUpdated = await getObjectiveUpdatedById(id);
  const offensiveAssists = await getOffensiveAssistsById(id);
  const payloadProgress = await getPayloadProgressById(id);
  const playerStats = await getPlayerStatsById(id);
  const roundEnd = await getRoundEndById(id);
  const roundStart = await getRoundStartById(id);
  const setupComplete = await getSetupCompleteById(id);
  const ultimateCharged = await getUltimateChargedById(id);
  const ultimateEnd = await getUltimateEndById(id);
  const ultimateStart = await getUltimateStartById(id);

  const data = {
    defensiveAssists,
    heroSpawns,
    heroSwaps,
    kills,
    matchStart,
    objectiveCaptured,
    objectiveUpdated,
    offensiveAssists,
    payloadProgress,
    playerStats,
    roundEnd,
    roundStart,
    setupComplete,
    ultimateCharged,
    ultimateEnd,
    ultimateStart,
  };

  return data;
}

export async function getDefensiveAssistsByScrimId(id: number) {
  const data = await prisma.defensiveAssist.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getHeroSpawnsById(id: number) {
  const data = await prisma.heroSpawn.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getHeroSwapsById(id: number) {
  const data = await prisma.heroSwap.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getKillsById(id: number) {
  const data = await prisma.kill.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getMatchStartById(id: number) {
  const data = await prisma.matchStart.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getObjectiveCapturedById(id: number) {
  const data = await prisma.objectiveCaptured.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getObjectiveUpdatedById(id: number) {
  const data = await prisma.objectiveUpdated.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getOffensiveAssistsById(id: number) {
  const data = await prisma.offensiveAssist.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getPayloadProgressById(id: number) {
  const data = await prisma.payloadProgress.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getPlayerStatsById(id: number) {
  const data = await prisma.playerStat.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getRoundEndById(id: number) {
  const data = await prisma.roundEnd.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getRoundStartById(id: number) {
  const data = await prisma.roundStart.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getSetupCompleteById(id: number) {
  const data = await prisma.setupComplete.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getUltimateChargedById(id: number) {
  const data = await prisma.ultimateCharged.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getUltimateEndById(id: number) {
  const data = await prisma.ultimateEnd.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getUltimateStartById(id: number) {
  const data = await prisma.ultimateStart.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}
