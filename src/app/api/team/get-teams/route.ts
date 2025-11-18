import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { Team } from "@prisma/client";
import { unauthorized } from "next/navigation";

export type GetTeamsResponse = {
  teams: Team[];
};

export async function GET() {
  const session = await auth();

  if (!session) {
    Logger.warn("Unauthorized request to get teams API");
    unauthorized();
  }

  const userId = await getUser(session?.user?.email);

  const teams = await prisma.team.findMany({
    where: {
      OR: [{ ownerId: userId?.id }, { users: { some: { id: userId?.id } } }],
      id: { not: 0 },
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
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
