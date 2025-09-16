import { getUser } from "@/data/user-dto";
import { auth, getImpersonateUrl } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const ImpersonateUserSchema = z.object({
  email: z.email(),
  isProd: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) unauthorized();

  const user = await getUser(session.user.email);

  if (!user) unauthorized();
  if (user.role !== $Enums.UserRole.ADMIN) unauthorized();

  const body = ImpersonateUserSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const url = await getImpersonateUrl(body.data.email, body.data.isProd);

  return new Response(JSON.stringify({ url }), {
    headers: { "content-type": "application/json" },
  });
}
