import { auditLog } from "@/lib/audit-logs";
import { auth, canManageTeam, getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const MarkSubstituteSchema = z.object({
  teamId: z.string(),
  playerName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    unauthorized();
  }

  const body = MarkSubstituteSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const { teamId, playerName } = body.data;

  const team = await prisma.team.findFirst({
    where: { id: parseInt(teamId) },
  });
  if (!team) return new Response("Team not found", { status: 404 });

  const authedUser = await getCurrentUser();
  if (!authedUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await canManageTeam(parseInt(teamId), authedUser))) unauthorized();

  await prisma.teamSubstitute.upsert({
    where: {
      teamId_playerName: { teamId: parseInt(teamId), playerName },
    },
    update: {},
    create: { teamId: parseInt(teamId), playerName, createdBy: authedUser.id },
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: authedUser.email,
      action: "TEAM_SUBSTITUTE_MARKED",
      target: playerName,
      details: `Marked ${playerName} as a substitute for team ${team.name}`,
    });
  });

  return new Response("OK", { status: 200 });
}
