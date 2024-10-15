import { getUser } from "@/data/user-dto";
import { auth, getImpersonateUrl } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

const ImpersonateUserSchema = z.object({
  email: z.string().email(),
  isProd: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getUser(session.user.email);

  if (!user) return new Response("Unauthorized", { status: 401 });

  if (user.role !== $Enums.UserRole.ADMIN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = ImpersonateUserSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const url = await getImpersonateUrl(body.data.email, body.data.isProd);

  return new Response(JSON.stringify({ url }), {
    headers: { "content-type": "application/json" },
  });
}
