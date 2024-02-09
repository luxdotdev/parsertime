import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { Team } from "@prisma/client";

export type GetTeamsResponse = {
  teams: Team[];
};

export async function GET() {
  const session = await auth();

  if (!session) {
    Logger.warn("Unauthorized request to get teams API");

    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const userId = await prisma.user.findUnique({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        {
          ownerId: userId?.id,
        },
        {
          users: {
            some: {
              id: userId?.id,
            },
          },
        },
      ],
    },
  });

  const teamResponse = {
    teams: teams.map((team) => {
      return {
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        ownerId: team.ownerId,
        image: team.image,
      };
    }),
  };

  return new Response(JSON.stringify(teamResponse), {
    headers: {
      "content-type": "application/json",
    },
    status: 200,
  });
}
