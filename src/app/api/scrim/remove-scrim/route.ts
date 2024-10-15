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
      return new Response("Unauthorized", { status: 401 });
    }
    Logger.log("Authorized removal of scrim with dev token");
  }

  const user = await getUser(session?.user?.email ?? "lucas@lux.dev");

  if (!user) return new Response("User not found", { status: 404 });
  if (!id) return new Response("Missing ID", { status: 400 });

  const scrim = await getScrim(parseInt(id));

  if (!scrim) return new Response("Scrim not found", { status: 404 });

  let isManager = false;

  if (scrim.teamId !== 0) {
    // scrim is associated with a team
    const managers = await prisma.team.findFirst({
      where: { id: scrim.teamId ?? 0 },
      select: { managers: true },
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

  if (!hasPerms) return new Response("Unauthorized", { status: 401 });

  const scrimId = parseInt(id);

  await Promise.all([
    prisma.scrim.delete({ where: { id: scrimId } }),
    prisma.map.deleteMany({ where: { scrimId } }),
    prisma.mapData.deleteMany({ where: { scrimId } }),
    prisma.defensiveAssist.deleteMany({ where: { scrimId } }),
    prisma.dvaRemech.deleteMany({ where: { scrimId } }),
    prisma.echoDuplicateEnd.deleteMany({ where: { scrimId } }),
    prisma.echoDuplicateStart.deleteMany({ where: { scrimId } }),
    prisma.heroSpawn.deleteMany({ where: { scrimId } }),
    prisma.heroSwap.deleteMany({ where: { scrimId } }),
    prisma.kill.deleteMany({ where: { scrimId } }),
    prisma.matchEnd.deleteMany({ where: { scrimId } }),
    prisma.matchStart.deleteMany({ where: { scrimId } }),
    prisma.mercyRez.deleteMany({ where: { scrimId } }),
    prisma.objectiveCaptured.deleteMany({ where: { scrimId } }),
    prisma.objectiveUpdated.deleteMany({ where: { scrimId } }),
    prisma.offensiveAssist.deleteMany({ where: { scrimId } }),
    prisma.payloadProgress.deleteMany({ where: { scrimId } }),
    prisma.playerStat.deleteMany({ where: { scrimId } }),
    prisma.pointProgress.deleteMany({ where: { scrimId } }),
    prisma.remechCharged.deleteMany({ where: { scrimId } }),
    prisma.roundEnd.deleteMany({ where: { scrimId } }),
    prisma.roundStart.deleteMany({ where: { scrimId } }),
    prisma.setupComplete.deleteMany({ where: { scrimId } }),
    prisma.ultimateCharged.deleteMany({ where: { scrimId } }),
    prisma.ultimateEnd.deleteMany({ where: { scrimId } }),
    prisma.ultimateStart.deleteMany({ where: { scrimId } }),
  ]);

  return new Response("OK", { status: 200 });
}
