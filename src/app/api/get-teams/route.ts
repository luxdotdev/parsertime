import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

export type Team = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};

export type GetTeamsResponse = {
  teams: Team[];
};

export async function GET(req: NextApiRequest) {
  const prisma = new PrismaClient();
  const session = await auth();

  const userId = await prisma.user.findUnique({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  const teams = await prisma.team.findMany({
    where: {
      ownerId: userId?.id,
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
      };
    }),
  };

  return Response.json(teamResponse);
}
