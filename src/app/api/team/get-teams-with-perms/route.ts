import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";

export async function GET() {
  const session = await auth();

  if (!session) {
    Logger.warn("Unauthorized request to get teams API");

    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const userId = await getUser(session?.user?.email);

  // find teams where the user is the owner or a manager
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
              role: {
                in: [$Enums.UserRole.MANAGER, $Enums.UserRole.ADMIN],
              },
            },
          },
        },
        {
          managers: {
            some: {
              userId: userId?.id,
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
