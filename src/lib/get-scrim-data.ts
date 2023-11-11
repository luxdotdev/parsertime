import { PrismaClient } from "@prisma/client";

export async function getScrimDataById(prisma: PrismaClient, id: number) {
  const defensiveAssists = await getDefensiveAssistsByScrimId(prisma, id);
  const heroSpawns = await getHeroSpawnsById(prisma, id);
  const heroSwaps = await getHeroSwapsById(prisma, id);
  const kills = await getKillsById(prisma, id);
  const matchStart = await getMatchStartById(prisma, id);
  const objectiveCaptured = await getObjectiveCapturedById(prisma, id);
  const objectiveUpdated = await getObjectiveUpdatedById(prisma, id);
  const offensiveAssists = await getOffensiveAssistsById(prisma, id);
  const payloadProgress = await getPayloadProgressById(prisma, id);
  const playerStats = await getPlayerStatsById(prisma, id);
  const roundEnd = await getRoundEndById(prisma, id);
  const roundStart = await getRoundStartById(prisma, id);
  const setupComplete = await getSetupCompleteById(prisma, id);
  const ultimateCharged = await getUltimateChargedById(prisma, id);
  const ultimateEnd = await getUltimateEndById(prisma, id);
  const ultimateStart = await getUltimateStartById(prisma, id);

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

export async function getDefensiveAssistsByScrimId(
  prisma: PrismaClient,
  id: number
) {
  const data = await prisma.defensiveAssist.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getHeroSpawnsById(prisma: PrismaClient, id: number) {
  const data = await prisma.heroSpawn.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getHeroSwapsById(prisma: PrismaClient, id: number) {
  const data = await prisma.heroSwap.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getKillsById(prisma: PrismaClient, id: number) {
  const data = await prisma.kill.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getMatchStartById(prisma: PrismaClient, id: number) {
  const data = await prisma.matchStart.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getObjectiveCapturedById(
  prisma: PrismaClient,
  id: number
) {
  const data = await prisma.objectiveCaptured.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getObjectiveUpdatedById(
  prisma: PrismaClient,
  id: number
) {
  const data = await prisma.objectiveUpdated.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getOffensiveAssistsById(
  prisma: PrismaClient,
  id: number
) {
  const data = await prisma.offensiveAssist.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getPayloadProgressById(prisma: PrismaClient, id: number) {
  const data = await prisma.payloadProgress.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getPlayerStatsById(prisma: PrismaClient, id: number) {
  const data = await prisma.playerStat.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getRoundEndById(prisma: PrismaClient, id: number) {
  const data = await prisma.roundEnd.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getRoundStartById(prisma: PrismaClient, id: number) {
  const data = await prisma.roundStart.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getSetupCompleteById(prisma: PrismaClient, id: number) {
  const data = await prisma.setupComplete.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getUltimateChargedById(prisma: PrismaClient, id: number) {
  const data = await prisma.ultimateCharged.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getUltimateEndById(prisma: PrismaClient, id: number) {
  const data = await prisma.ultimateEnd.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}

export async function getUltimateStartById(prisma: PrismaClient, id: number) {
  const data = await prisma.ultimateStart.findMany({
    where: {
      scrimId: id,
    },
  });

  return data;
}
