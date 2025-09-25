import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const TeamAvatarUpdateSchema = z.object({
  teamId: z.number(),
  image: z.string().url(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    Logger.log("No session found", session);
    unauthorized();
  }

  const body = TeamAvatarUpdateSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const team = await prisma.team.findUnique({
    where: { id: body.data.teamId },
  });
  if (!team) {
    Logger.log("Team not found", body.data.teamId);
    return new Response("Not found", { status: 404 });
  }

  const teamManagers = await prisma.teamManager.findMany({
    where: { teamId: body.data.teamId },
  });

  const authedUser = await getUser(session.user.email);
  if (!authedUser) {
    Logger.log("User not found", session.user.email);
    unauthorized();
  }

  if (
    team.ownerId !== authedUser.id &&
    teamManagers.some((m) => m.userId === authedUser.id) === false
  ) {
    Logger.log("Not a team owner or manager", team.name, authedUser.email);
    unauthorized();
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { image: body.data.image },
  });

  Logger.log("new avatar uploaded for team: ", team.name, body.data.image);

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: authedUser.email,
      action: "TEAM_AVATAR_UPDATED",
      target: team.name,
      details: `Updated avatar for team ${team.name}`,
    });
  });

  return new Response("OK", { status: 200 });
}
