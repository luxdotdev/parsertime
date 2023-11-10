import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export async function POST(request: Request, response: Response) {
  const prisma = new PrismaClient();
  const session = await auth();

  const userId = await prisma.user.findUnique({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  const req = await request.json();

  if (!session) {
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

export async function GET(request: Request, response: Response) {
  return new Response("Method not allowed", {
    status: 405,
  });
}
