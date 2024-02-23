import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const userId = await prisma.user.findUnique({
    where: {
      email: session.user.email ?? "",
    },
  });

  if (!userId) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const id = req.nextUrl.searchParams.get("id"); // team id

  if (!id) {
    return new Response("No body provided", {
      status: 400,
    });
  }

  const allTeamsWhereUserIsMember = await prisma.team.findMany({
    where: {
      users: {
        some: {
          id: userId.id,
        },
      },
    },
  });

  const teamIds = allTeamsWhereUserIsMember.map((team) => team.id);

  // if the user is not a member of the team
  if (!teamIds.includes(parseInt(id))) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  // if the user is a member of the team
  return new Response("OK", {
    status: 200,
  });
}
