import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const RemoveUserFromTeamSchema = z.object({
  userId: z.string().min(1),
  teamId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) unauthorized();

  const body = RemoveUserFromTeamSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const team = await prisma.team.findFirst({
    where: { id: parseInt(body.data.teamId) },
  });
  if (!team) return new Response("Team not found", { status: 404 });

  const user = await prisma.user.findFirst({ where: { id: body.data.userId } });
  if (!user) return new Response("User not found", { status: 404 });

  const authedUser = await getUser(session.user.email);
  if (!authedUser) unauthorized();

  const managers = await prisma.team.findFirst({
    where: { id: parseInt(body.data.teamId) },
    select: { managers: { select: { userId: true } } },
  });

  const authedUserIsManager = managers?.managers.some(
    (manager) => manager.userId === authedUser.id
  );

  function userIsManager(user: User) {
    return managers?.managers.some((manager) => manager.userId === user.id);
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

  return new Response("OK", { status: 200 });
}
