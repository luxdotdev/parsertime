import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const RemoveUserFromTeamSchema = z.object({
  userId: z.string().min(1),
  teamId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const body = RemoveUserFromTeamSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const [team, user, authedUser] = await Promise.all([
    prisma.team.findFirst({
      where: { id: parseInt(body.data.teamId) },
      include: { managers: { select: { userId: true } } },
    }),
    prisma.user.findFirst({ where: { id: body.data.userId } }),
    AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    ),
  ]);
  if (!team) return new Response("Team not found", { status: 404 });
  if (!user) return new Response("User not found", { status: 404 });
  if (!authedUser) unauthorized();

  const authedUserIsManager = team.managers.some(
    (manager) => manager.userId === authedUser.id
  );

  function userIsManager(user: User) {
    return team.managers.some((manager) => manager.userId === user.id);
  }

  if (team.ownerId !== authedUser.id && !authedUserIsManager) {
    unauthorized();
  }

  if (team.ownerId === user.id) {
    return new Response("Cannot remove owner from team", { status: 400 });
  }

  if (authedUserIsManager && user.id === authedUser.id) {
    return new Response("Cannot remove yourself from team", { status: 400 });
  }

  if (authedUserIsManager && userIsManager(user)) {
    return new Response("Cannot remove another manager", { status: 400 });
  }

  if (team.ownerId === authedUser.id) {
    if (userIsManager(user)) {
      await prisma.teamManager.deleteMany({
        where: {
          userId: user.id,
          teamId: parseInt(body.data.teamId),
        },
      });
    }
  }

  await prisma.team.update({
    where: { id: parseInt(body.data.teamId) },
    data: { users: { disconnect: { id: body.data.userId } } },
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: authedUser.email,
      action: "TEAM_MEMBER_REMOVED",
      target: user.email,
      details: `Removed ${user.name ?? user.email} from team ${team.name}`,
    });
  });

  return new Response("OK", { status: 200 });
}
