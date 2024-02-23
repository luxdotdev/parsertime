import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";

type CreateTeamRequestData = {
  name: string;
  users: { id: string }[];
};

export async function POST(request: Request) {
  const session = await auth();

  const userId = await prisma.user.findUnique({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  const req = (await request.json()) as CreateTeamRequestData;

  if (!session) {
    Logger.warn("Unauthorized request to create team API");

    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const usersById = await prisma.user.findMany({
    where: {
      id: {
        in: req.users?.map((user: { id: string }) => user.id) ?? [],
      },
      AND: {
        id: userId?.id,
        role: "ADMIN",
      },
    },
  });

  await prisma.team.create({
    data: {
      name: req.name,
      updatedAt: new Date(),
      users: {
        connect: [
          ...usersById.map((user) => {
            return {
              id: user.id,
            };
          }),
        ],
      },
      ownerId: userId?.id ?? "",
    },
  });

  const teamIds = await prisma.team.findMany({
    where: {
      name: req.name,
    },
  });

  await prisma.user.update({
    where: {
      id: userId?.id ?? "",
    },
    data: {
      teams: {
        connect: [
          ...teamIds.map((team) => {
            return {
              id: team.id,
            };
          }),
        ],
      },
    },
  });

  return new Response("Success", {
    status: 200,
  });
}
