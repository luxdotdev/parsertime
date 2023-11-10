import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

export async function POST(request: Request, response: Response) {
  const prisma = new PrismaClient();
  const session = await auth();

  const req = await request.json();
  const body = req.body;

  if (!session) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const userId = await prisma.user.findUnique({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  await prisma.scrim.create({
    data: {
      date: body.date,
      createdAt: new Date(),
      updatedAt: new Date(),
      name: body.name,
      maps: {
        createMany: {
          data: body.maps ?? [],
          skipDuplicates: true,
        },
      },
      Team: {
        connectOrCreate: {
          create: {
            name: body.teamName ?? "Uncategorized",
            createdAt: new Date(),
            updatedAt: new Date(),
            ownerId: userId?.id ?? "",
          },
          where: {
            name: body.teamName ?? "Uncategorized",
            id: body.teamId,
          },
        },
      },
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
