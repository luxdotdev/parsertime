import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { auth as authServer } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { $Enums } from "@/generated/prisma/browser";
import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const ImpersonateUserSchema = z.object({
  email: z.email(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) unauthorized();

  const currentUser = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );

  if (!currentUser) unauthorized();
  if (currentUser.role !== $Enums.UserRole.ADMIN) unauthorized();

  const body = ImpersonateUserSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const target = await prisma.user.findUnique({
    where: { email: body.data.email },
    select: { id: true },
  });
  if (!target) return new Response("User not found", { status: 404 });

  const response = await authServer.api.impersonateUser({
    body: { userId: target.id },
    headers: await headers(),
    asResponse: true,
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: session.user.email,
      action: "IMPERSONATE_USER",
      target: body.data.email,
      details: `Impersonated ${body.data.email}`,
    });
  });

  return response;
}
