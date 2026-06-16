import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to join team");
    unauthorized();
  }

  const token = req.nextUrl.searchParams.get("token");
  const userEmail = session.user.email.toLowerCase();

  if (!token) {
    Logger.error("No token provided to join team");
    return new Response("No token provided", { status: 400 });
  }

  const joinedTeam = await prisma.$transaction(async (tx) => {
    const teamInviteToken = await tx.teamInviteToken.findUnique({
      where: { token },
    });

    if (!teamInviteToken || teamInviteToken.expires <= new Date()) return null;
    if (teamInviteToken.email.toLowerCase() !== userEmail) return null;

    const deleted = await tx.teamInviteToken.deleteMany({
      where: { token, expires: { gt: new Date() } },
    });
    if (deleted.count !== 1) return null;

    return await tx.team.update({
      where: { id: teamInviteToken.teamId },
      data: {
        users: { connect: { email: userEmail } },
      },
      select: { id: true, name: true },
    });
  });

  if (!joinedTeam) {
    Logger.error("Invalid or expired token provided to join team");
    return new Response("Invalid token provided", { status: 400 });
  }

  Logger.info(`User ${session.user.email} joined team ${joinedTeam.id}`);

  const teams = await prisma.team.findMany({
    where: { users: { some: { email: session.user.email } } },
  });

  Logger.info(`User now belongs to team: ${JSON.stringify(teams)}`);

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: session.user.email,
      action: "TEAM_JOINED",
      target: `${joinedTeam.name}`,
      details: `Joined team ${joinedTeam.name} (Team ID: ${joinedTeam.id})`,
    });
  });

  return new Response("OK", { status: 200 });
}
