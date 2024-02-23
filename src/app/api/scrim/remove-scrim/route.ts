import { getScrim } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const id = params.get("id");
  const token = req.headers.get("Authorization");

  const session = await auth();

  if (!session) {
    if (token !== process.env.DEV_TOKEN) {
      Logger.warn("Unauthorized request to remove scrim: ", id);
      return new Response("Unauthorized", {
        status: 401,
      });
    } else {
      Logger.log("Authorized removal of scrim with dev token");
    }
  }

  const user = await getUser(session?.user?.email ?? "lucas@lux.dev");

  if (!user) {
    return new Response("User not found", {
      status: 404,
    });
  }

  if (!id) {
    return new Response("Missing ID", {
      status: 400,
    });
  }

  const scrim = await getScrim(parseInt(id));

  if (!scrim) {
    return new Response("Scrim not found", {
      status: 404,
    });
  }

  let isManager = false;

  if (scrim.teamId !== 0) {
    // scrim is associated with a team
    const managers = await prisma.team.findFirst({
      where: {
        id: scrim.teamId ?? 0,
      },
      select: {
        managers: true,
      },
    });

    // check if user is a manager
    isManager =
      managers?.managers.some((manager) => manager.userId === user.id) ?? false;
  }

  const hasPerms =
    user.role === $Enums.UserRole.ADMIN || // Admins can delete anything
    user.role === $Enums.UserRole.MANAGER || // Managers can delete anything
    user.id === scrim.creatorId || // Creators can delete their own scrims
    isManager; // Managers of the scrim's team can delete the scrim

  if (!hasPerms) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const hasMatchEnd = await prisma.matchEnd.findFirst({
    where: {
      scrimId: parseInt(id),
    },
  });

  const hasPayloadProgress = await prisma.payloadProgress.findFirst({
    where: {
      scrimId: parseInt(id),
    },
  });

  const hasPointProgress = await prisma.pointProgress.findFirst({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.scrim.delete({
    where: {
      id: parseInt(id),
    },
  });

  await prisma.map.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.mapData.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.defensiveAssist.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.heroSpawn.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.heroSwap.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.kill.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  if (hasMatchEnd) {
    await prisma.matchEnd.deleteMany({
      where: {
        scrimId: parseInt(id),
      },
    });
  }

  await prisma.matchStart.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.offensiveAssist.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.objectiveCaptured.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.objectiveUpdated.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  if (hasPayloadProgress) {
    await prisma.payloadProgress.deleteMany({
      where: {
        scrimId: parseInt(id),
      },
    });
  }

  await prisma.playerStat.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  if (hasPointProgress) {
    await prisma.pointProgress.deleteMany({
      where: {
        scrimId: parseInt(id),
      },
    });
  }

  await prisma.roundEnd.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.roundStart.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.setupComplete.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.ultimateCharged.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.ultimateEnd.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  await prisma.ultimateStart.deleteMany({
    where: {
      scrimId: parseInt(id),
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
