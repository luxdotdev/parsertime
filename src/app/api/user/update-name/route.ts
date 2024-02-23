import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

type UpdateNameBody = {
  name: string;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const body = (await req.json()) as UpdateNameBody;

  await prisma.user.update({
    where: {
      email: session.user.email,
    },
    data: {
      name: body.name,
    },
  });

  return new Response("OK", {
    status: 200,
  });
}
