import { auditLog } from "@/lib/audit-logs";
import { auth, canManageTeam, getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const PromoteUserSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    unauthorized();
  }

  const body = PromoteUserSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const { teamId, userId } = body.data;

  const team = await prisma.team.findFirst({
    where: {
      id: parseInt(teamId),
    },
  });
  if (!team) return new Response("Team not found", { status: 404 });

  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const authedUser = await getCurrentUser();

  if (!authedUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await canManageTeam(parseInt(teamId), authedUser))) unauthorized();

  const targetMembership = await prisma.team.findFirst({
    where: { id: parseInt(teamId), users: { some: { id: userId } } },
    select: { id: true },
  });
  if (!targetMembership) {
    return new Response("Target user is not a team member", { status: 400 });
  }

  // add user as a manager
  await prisma.teamManager.upsert({
    where: { teamId_userId: { teamId: parseInt(teamId), userId } },
    update: {},
    create: { userId, teamId: parseInt(teamId) },
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: authedUser.email,
      action: "TEAM_MEMBER_PROMOTED",
      target: user.email,
      details: `Promoted ${user.name ?? user.email} to manager of team ${team.name}`,
    });
  });

  return new Response("OK", { status: 200 });
}
