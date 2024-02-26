import { auth, getImpersonateUrl } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (user.role !== $Enums.UserRole.ADMIN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as { email: string };

  const url = await getImpersonateUrl(body.email);

  return new Response(JSON.stringify({ url }), {
    headers: {
      "content-type": "application/json",
    },
  });
}
