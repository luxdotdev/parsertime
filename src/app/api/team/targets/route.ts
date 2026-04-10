import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { getRecentScrimStats } from "@/data/targets-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const CreateTargetSchema = z.object({
  teamId: z.number(),
  playerName: z.string().min(1),
  stat: z.string().min(1),
  targetDirection: z.enum(["increase", "decrease"]),
  targetPercent: z.number().min(0.1).max(100),
  scrimWindow: z.number().min(1).max(50).default(10),
  note: z.string().optional(),
});

async function checkManagerPerms(userId: string, teamId: number) {
  const team = await prisma.team.findFirst({ where: { id: teamId } });
  if (!team) return false;

  if (team.ownerId === userId) return true;

  const manager = await prisma.teamManager.findFirst({
    where: { teamId, userId },
  });
  return !!manager;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  const { searchParams } = new URL(req.url);
  const teamId = parseInt(searchParams.get("teamId") ?? "");
  if (isNaN(teamId)) {
    return new Response("Missing teamId", { status: 400 });
  }

  // Check team membership
  const teamMember = await prisma.team.findFirst({
    where: { id: teamId, users: { some: { id: user.id } } },
  });
  if (!teamMember && user.role !== "ADMIN") unauthorized();

  const targets = await prisma.playerTarget.findMany({
    where: { teamId },
    include: { creator: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(targets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  // Premium check
  if (user.billingPlan === "FREE" && user.role !== "ADMIN") {
    return new Response("Premium plan required", { status: 403 });
  }

  const body = CreateTargetSchema.safeParse(await req.json());
  if (!body.success) {
    return Response.json(body.error.flatten(), { status: 400 });
  }

  const {
    teamId,
    playerName,
    stat,
    targetDirection,
    targetPercent,
    scrimWindow,
    note,
  } = body.data;

  // Check manager/owner perms
  const hasPerms =
    user.role === "ADMIN" || (await checkManagerPerms(user.id, teamId));
  if (!hasPerms) unauthorized();

  // Calculate baseline from recent scrims
  const recentStats = await getRecentScrimStats(
    playerName,
    teamId,
    scrimWindow
  );
  let baselineValue = 0;
  if (recentStats.length > 0) {
    const values = recentStats
      .map((s) => s.stats[stat])
      .filter((v) => v !== undefined && isFinite(v));
    if (values.length > 0) {
      baselineValue = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  const target = await prisma.playerTarget.create({
    data: {
      teamId,
      playerName,
      stat,
      targetDirection,
      targetPercent,
      baselineValue,
      scrimWindow,
      note,
      createdBy: user.id,
    },
  });

  return Response.json(target, { status: 201 });
}
