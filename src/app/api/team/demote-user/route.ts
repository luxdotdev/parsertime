import { auditLog } from "@/lib/audit-logs";
import { auth, canManageTeam, getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const DemoteUserSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    unauthorized();
  }

  const body = DemoteUserSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const { teamId, userId } = body.data;

  const team = await prisma.team.findFirst({ where: { id: parseInt(teamId) } });
  if (!team) return new Response("Team not found", { status: 404 });

  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const authedUser = await getCurrentUser();

  if (!authedUser) unauthorized();

  if (!(await canManageTeam(parseInt(teamId), authedUser))) unauthorized();
  if (team.ownerId === user.id) {
    return new Response("Cannot demote the team owner", { status: 400 });
  }

  // demote user to member
  await prisma.teamManager.deleteMany({
    where: { userId: user.id, teamId: team.id },
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: authedUser.email,
      action: "TEAM_MEMBER_DEMOTED",
      target: team.name,
      details: `Demoted ${user.name} to member`,
    });
  });

  return new Response("OK", { status: 200 });
}
