import { getUser } from "@/data/user-dto";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
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
    Logger.warn(`Rate limit exceeded for creating a team: ${identifier}`);
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const session = await auth();

  const userId = await getUser(session?.user?.email);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const permission = await new Permission("create-team").check();
  if (!permission) return new Response("Unauthorized", { status: 401 });

  const numberOfTeams = await prisma.team.count({
    where: { ownerId: userId.id },
  });

  switch (userId.billingPlan) {
    case "FREE":
      if (
        numberOfTeams >= TEAM_CREATION_LIMIT[userId.billingPlan] &&
        userId.role !== "ADMIN"
      ) {
        return new Response(
          "You have hit the limit of teams that your account can create.  Please upgrade your plan or contact support.",
          { status: 403 }
        );
      }
      break;
    case "BASIC":
      if (
        numberOfTeams >= TEAM_CREATION_LIMIT[userId.billingPlan] &&
        userId.role !== "ADMIN"
      ) {
        return new Response(
          "You have hit the limit of teams that your account can create.  Please upgrade your plan or contact support.",
          { status: 403 }
        );
      }
      break;
    case "PREMIUM":
      if (
        numberOfTeams >= TEAM_CREATION_LIMIT[userId.billingPlan] &&
        userId.role !== "ADMIN"
      ) {
        return new Response(
          "You have hit the limit of teams that your account can create.  Please upgrade your plan or contact support.",
          { status: 403 }
        );
      }
      break;
    default:
      if (userId.role !== "ADMIN")
        return new Response("Unauthorized", { status: 401 });
      break;
  }

  const req = TeamCreationRequestSchema.safeParse(await request.json());
  if (!req.success) return new Response("Invalid request", { status: 400 });

  if (!session) {
    Logger.warn("Unauthorized request to create team API");
    return new Response("Unauthorized", { status: 401 });
  }

  const usersById = await prisma.user.findMany({
    where: {
      id: { in: req.data.users?.map((user: { id: string }) => user.id) ?? [] },
      AND: { id: userId?.id, role: "ADMIN" },
    },
  });

  const team = await prisma.team.create({
    data: {
      name: req.data.name,
      updatedAt: new Date(),
      users: {
        connect: [
          ...usersById.map((user) => {
            return { id: user.id };
          }),
        ],
      },
      ownerId: userId.id ?? "",
    },
  });

  await prisma.user.update({
    where: { id: userId.id ?? "" },
    data: { teams: { connect: [{ id: team.id }] } },
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
