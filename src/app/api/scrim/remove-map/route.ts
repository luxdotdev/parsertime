import { getScrim } from "@/data/scrim-dto";
import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const id = params.get("id");
  const token = req.headers.get("Authorization");

  const session = await auth();

  if (!session) {
    if (token !== process.env.DEV_TOKEN) {
      Logger.warn("Unauthorized request to remove map: ", id);
      unauthorized();
    }
    Logger.log("Authorized removal of map with dev token");
  }

  const user = await getUser(session?.user?.email ?? "lucas@lux.dev");

  if (!user) return new Response("User not found", { status: 404 });
  if (!id) return new Response("Missing ID", { status: 400 });

  const map = await prisma.map.findFirst({
    where: { id: parseInt(id) },
  });
  if (!map) return new Response("Map not found", { status: 404 });

  const scrim = await getScrim(map.scrimId!);
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
    user.id === scrim.creatorId || // Creators can delete their own maps
    isManager; // Managers of the scrim's team can delete the map

  if (!hasPerms) {
    unauthorized();
  }

  Logger.log("Removing map: ", id);

  const mapId = parseInt(id);

  await Promise.all([
    prisma.map.delete({ where: { id: mapId } }),
    prisma.mapData.deleteMany({ where: { mapId } }),
    prisma.defensiveAssist.deleteMany({ where: { MapDataId: mapId } }),
    prisma.dvaRemech.deleteMany({ where: { MapDataId: mapId } }),
    prisma.echoDuplicateEnd.deleteMany({ where: { MapDataId: mapId } }),
    prisma.echoDuplicateStart.deleteMany({ where: { MapDataId: mapId } }),
    prisma.heroSpawn.deleteMany({ where: { MapDataId: mapId } }),
    prisma.heroSwap.deleteMany({ where: { MapDataId: mapId } }),
    prisma.kill.deleteMany({ where: { MapDataId: mapId } }),
    prisma.matchEnd.deleteMany({ where: { MapDataId: mapId } }),
    prisma.matchStart.deleteMany({ where: { MapDataId: mapId } }),
    prisma.mercyRez.deleteMany({ where: { MapDataId: mapId } }),
    prisma.objectiveCaptured.deleteMany({ where: { MapDataId: mapId } }),
    prisma.objectiveUpdated.deleteMany({ where: { MapDataId: mapId } }),
    prisma.offensiveAssist.deleteMany({ where: { MapDataId: mapId } }),
    prisma.payloadProgress.deleteMany({ where: { MapDataId: mapId } }),
    prisma.playerStat.deleteMany({ where: { MapDataId: mapId } }),
    prisma.pointProgress.deleteMany({ where: { MapDataId: mapId } }),
    prisma.remechCharged.deleteMany({ where: { MapDataId: mapId } }),
    prisma.roundEnd.deleteMany({ where: { MapDataId: mapId } }),
    prisma.roundStart.deleteMany({ where: { MapDataId: mapId } }),
    prisma.setupComplete.deleteMany({ where: { MapDataId: mapId } }),
    prisma.ultimateCharged.deleteMany({ where: { MapDataId: mapId } }),
    prisma.ultimateEnd.deleteMany({ where: { MapDataId: mapId } }),
    prisma.ultimateStart.deleteMany({ where: { MapDataId: mapId } }),
  ]);

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "MAP_DELETED",
      target: `${scrim.name} (ID: ${scrim.id})`,
      details: `Map deleted: ${id}`,
    });
  });

  return new Response("OK", { status: 200 });
}
