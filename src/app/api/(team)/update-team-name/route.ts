import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

type UpdateTeamNameBody = {
  name: string;
  teamId: number;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = (await req.json()) as UpdateTeamNameBody;

  await prisma.team.update({
    where: {
      id: body.teamId,
    },
    data: {
      name: body.name,
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
