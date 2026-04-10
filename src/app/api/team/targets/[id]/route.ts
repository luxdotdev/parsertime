import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const UpdateTargetSchema = z.object({
  targetDirection: z.enum(["increase", "decrease"]).optional(),
  targetPercent: z.number().min(0.1).max(100).optional(),
  scrimWindow: z.number().min(1).max(50).optional(),
  note: z.string().nullable().optional(),
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

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  const { id } = await params;
  const targetId = parseInt(id);
  if (isNaN(targetId)) {
    return new Response("Invalid target ID", { status: 400 });
  }

  const target = await prisma.playerTarget.findUnique({
    where: { id: targetId },
  });
  if (!target) return new Response("Target not found", { status: 404 });

  const hasPerms =
    user.role === "ADMIN" || (await checkManagerPerms(user.id, target.teamId));
  if (!hasPerms) unauthorized();

  const body = UpdateTargetSchema.safeParse(await req.json());
  if (!body.success) {
    return Response.json(body.error.flatten(), { status: 400 });
  }

  const updated = await prisma.playerTarget.update({
    where: { id: targetId },
    data: body.data,
  });

  return Response.json(updated);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.email) unauthorized();

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) unauthorized();

  const { id } = await params;
  const targetId = parseInt(id);
  if (isNaN(targetId)) {
    return new Response("Invalid target ID", { status: 400 });
  }

  const target = await prisma.playerTarget.findUnique({
    where: { id: targetId },
  });
  if (!target) return new Response("Target not found", { status: 404 });

  const hasPerms =
    user.role === "ADMIN" || (await checkManagerPerms(user.id, target.teamId));
  if (!hasPerms) unauthorized();

  await prisma.playerTarget.delete({ where: { id: targetId } });

  return new Response("OK", { status: 200 });
}
