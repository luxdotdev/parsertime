import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const TeamAvatarUpdateSchema = z.object({
  teamId: z.string(),
  image: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    Logger.log("No session found", session);
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = TeamAvatarUpdateSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request", {
      status: 400,
    });
  }

  const team = await prisma.team.findUnique({
    where: {
      id: parseInt(body.data.teamId),
    },
  });

  const teamManagers = await prisma.teamManager.findMany({
    where: {
      teamId: parseInt(body.data.teamId),
    },
  });

  if (!team) {
    Logger.log("Team not found", body.data.teamId);
    return new Response("Not found", {
      status: 404,
    });
  }

  const authedUser = await getUser(session.user.email);

  if (!authedUser) {
    Logger.log("User not found", session.user.email);
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  if (
    team.ownerId !== authedUser.id &&
    teamManagers.some((m) => m.userId === authedUser.id) === false
  ) {
    Logger.log("Not a team owner or manager", team.name, authedUser.email);
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  await prisma.team.update({
    where: { id: team.id },
    data: {
      image: body.data.image,
    },
  });

  Logger.log("new avatar uploaded for team: ", team.name, body.data.image);

  return new Response("OK", {
    status: 200,
  });
}
