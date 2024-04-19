import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getScrim } from "@/data/scrim-dto";
import { $Enums } from "@prisma/client";

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const id = params.get("id");
  const token = req.headers.get("Authorization");

  const session = await auth();

  if (!session) {
    if (token !== process.env.DEV_TOKEN) {
      Logger.warn("Unauthorized request to remove map: ", id);
      return new Response("Unauthorized", {
        status: 401,
      });
    }
    Logger.log("Authorized removal of map with dev token");
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

  const map = await prisma.map.findFirst({
    where: {
      id: parseInt(id),
    },
  });

  if (!map) {
    return new Response("Map not found", {
      status: 404,
    });
  }

  const scrim = await getScrim(map.scrimId!);

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
    user.id === scrim.creatorId || // Creators can delete their own maps
    isManager; // Managers of the scrim's team can delete the map

  if (!hasPerms) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  Logger.log("Removing map: ", id);

  await prisma.map.delete({
    where: {
      id: parseInt(id),
    },
  });

  await prisma.mapData.deleteMany({
    where: {
      mapId: parseInt(id),
    },
  });

  await prisma.defensiveAssist.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.dvaRemech.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.echoDuplicateEnd.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.echoDuplicateStart.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.heroSpawn.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.heroSwap.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.kill.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.matchEnd.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.matchStart.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.mercyRez.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.objectiveCaptured.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.objectiveUpdated.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.offensiveAssist.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.payloadProgress.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.playerStat.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.pointProgress.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.remechCharged.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.roundEnd.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.roundStart.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.setupComplete.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.ultimateCharged.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.ultimateEnd.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  await prisma.ultimateStart.deleteMany({
    where: {
      MapDataId: parseInt(id),
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
