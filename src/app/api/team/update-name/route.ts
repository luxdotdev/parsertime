import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const TeamNameUpdateSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Team name must be at least 2 characters.",
    })
    .max(30, {
      message: "Team name must not be longer than 30 characters.",
    })
    .trim()
    .regex(/^(?!.*?:).*$/),
  teamId: z.number(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = TeamNameUpdateSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid request", {
      status: 400,
    });
  }

  await prisma.team.update({
    where: {
      id: body.data.teamId,
    },
    data: {
      name: body.data.name,
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
