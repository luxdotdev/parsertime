import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Effect } from "effect";
import type { NextRequest } from "next/server";
import { unauthorized } from "next/navigation";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  const requested = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(1, Math.trunc(requested)), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      amountCents: true,
      balanceAfterCents: true,
      description: true,
      createdAt: true,
    },
  });

  return Response.json({ transactions });
}
