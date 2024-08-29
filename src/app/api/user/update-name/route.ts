import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const updateNameSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    })
    .trim()
    .regex(/^(?!.*?:).*$/),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = updateNameSchema.safeParse(await req.json());
  if (!body.success) {
    return new Response("Invalid name supplied", {
      status: 400,
    });
  }

  await prisma.user.update({
    where: {
      email: session.user.email,
    },
    data: {
      name: body.data.name,
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
