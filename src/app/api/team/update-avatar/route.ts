import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import Logger from "@/lib/logger";

type TeamAvatarUpdateBody = {
  teamId: string;
  image: string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    Logger.log("No session found", session);
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = (await req.json()) as TeamAvatarUpdateBody;

  const team = await prisma.team.findUnique({
    where: {
      id: parseInt(body.teamId),
    },
  });

  const teamManagers = await prisma.teamManager.findMany({
    where: {
      teamId: parseInt(body.teamId),
    },
  });

  if (!team) {
    Logger.log("Team not found", body.teamId);
    return new Response("Not found", {
      status: 404,
    });
  }

  const authedUser = await prisma.user.findUnique({
    where: {
      email: session.user.email ?? "",
    },
  });

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
      image: body.image,
    },
  });

  Logger.log("new avatar uploaded for team: ", team.name, body.image);

  return new Response("OK", {
    status: 200,
  });
}
