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

  const id = parseInt(params.get("id") ?? "");
  if (!id) return new Response("Missing ID", { status: 400 });

  const token = req.headers.get("Authorization");

  const session = await auth();

  if (!session) {
    if (token !== process.env.DEV_TOKEN) {
      Logger.warn("Unauthorized request to remove team: ", id);
      unauthorized();
    }
    Logger.log("Authorized removal of team with dev token");
  }

  const user = await getUser(session?.user?.email ?? "lucas@lux.dev");
  if (!user) return new Response("User not found", { status: 404 });

  const team = await prisma.team.findFirst({ where: { id } });
  if (!team) return new Response("Team not found", { status: 404 });

  const hasPerms =
    user.role === $Enums.UserRole.ADMIN || // Admins can delete anything
    user.role === $Enums.UserRole.MANAGER || // Managers can delete anything
    user.id === team.ownerId; // Creators can delete their own teams

  if (!hasPerms) unauthorized();

  await prisma.team.delete({ where: { id } });
  await prisma.teamManager.deleteMany({ where: { teamId: id } });
  await prisma.scrim.updateMany({ where: { teamId: id }, data: { teamId: 0 } });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "TEAM_DELETED",
      target: team.name,
      details: `Team deleted: ${team.name}`,
    });
  });

  return new Response("OK", { status: 200 });
}
