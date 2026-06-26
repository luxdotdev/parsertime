import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import {
  rateLimitHitCounter,
  teamCreatedCounter,
  teamQuotaHitCounter,
} from "@/lib/axiom/metrics";
import { UsageEventName } from "@/lib/usage/names";
import { usage } from "@/lib/usage/server";
import { Logger } from "@/lib/logger";
import { Permission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { TEAM_CREATION_LIMIT } from "@/lib/usage";
import { Ratelimit } from "@upstash/ratelimit";
import { ipAddress } from "@vercel/functions";
import { kv } from "@vercel/kv";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const TeamCreationRequestSchema = z.object({
  name: z.string().min(2).max(30),
  users: z.array(z.object({ id: z.string() })).optional(),
});
const TEAM_CREATION_LOCK_NAMESPACE = 42_111;

export async function POST(request: NextRequest) {
  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  // Limit the requests to 5 per minute per user
  const identifier = ipAddress(request) ?? "127.0.0.1";
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    rateLimitHitCounter.add(1, { endpoint: "team.create" });
    Logger.warn(`Rate limit exceeded for creating a team: ${identifier}`);
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to create team API");
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const permission = await new Permission("create-team").check();
  if (!permission) return new Response("Unauthorized", { status: 401 });

  const req = TeamCreationRequestSchema.safeParse(await request.json());
  if (!req.success) return new Response("Invalid request", { status: 400 });

  const planLimit =
    TEAM_CREATION_LIMIT[userId.billingPlan as keyof typeof TEAM_CREATION_LIMIT];

  if (planLimit === undefined && userId.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TEAM_CREATION_LOCK_NAMESPACE}::integer, hashtext(${userId.id}))`;

    const numberOfTeams = await tx.team.count({
      where: { ownerId: userId.id },
    });

    if (
      planLimit !== undefined &&
      numberOfTeams >= planLimit &&
      userId.role !== "ADMIN"
    ) {
      return { ok: false as const, reason: "quota" as const };
    }

    const usersById = await tx.user.findMany({
      where: {
        id: {
          in: req.data.users?.map((user: { id: string }) => user.id) ?? [],
        },
        AND: { id: userId.id, role: "ADMIN" },
      },
    });

    const team = await tx.team.create({
      data: {
        name: req.data.name,
        updatedAt: new Date(),
        users: {
          connect: usersById.map((user) => ({ id: user.id })),
        },
        ownerId: userId.id,
      },
    });

    await tx.user.update({
      where: { id: userId.id },
      data: { teams: { connect: [{ id: team.id }] } },
    });

    return { ok: true as const, team };
  });

  if (!result.ok) {
    teamQuotaHitCounter.add(1, { plan: userId.billingPlan });
    return new Response(
      "You have hit the limit of teams that your account can create.  Please upgrade your plan or contact support.",
      { status: 403 }
    );
  }

  const { team } = result;
  teamCreatedCounter.add(1, { plan: userId.billingPlan });
  void usage.track({
    name: UsageEventName.TEAM_CREATE,
    userId: userId.id,
    props: { plan: userId.billingPlan },
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: session.user.email,
      action: "TEAM_CREATED",
      target: team.name,
      details: `Team created: ${team.name}`,
    });
  });

  return new Response("Success", { status: 200 });
}
