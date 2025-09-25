import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { forbidden, unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const token = req.headers.get("Authorization");

  const id = parseInt(params.get("id") ?? "");
  if (!id) return new Response("Missing ID", { status: 400 });

  const owner = params.get("owner");
  if (!owner) return new Response("Missing owner", { status: 400 });

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
    user.role === $Enums.UserRole.ADMIN || // Admins can transfer anything
    user.role === $Enums.UserRole.MANAGER || // Managers can transfer anything
    user.id === team.ownerId; // Creators can transfer their own teams

  if (!hasPerms) forbidden();

  const newOwner = await getUser(owner);
  if (!newOwner) return new Response("New owner not found", { status: 404 });

  await prisma.team.update({
    where: { id },
    data: { ownerId: newOwner.id },
  });

  // add new owner to team if they aren't already a member
  await prisma.team.update({
    where: { id },
    data: { users: { connect: { id: newOwner.id } } },
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "TEAM_OWNERSHIP_TRANSFERRED",
      target: newOwner.email,
      details: `Transferred ownership of team ${team.name} to ${newOwner.name}`,
    });
  });

  return new Response("OK", { status: 200 });
}
