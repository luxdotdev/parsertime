import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, canManageTeam } from "@/lib/auth";
import { addBlacklistEntry, removeBlacklistEntry } from "@/lib/team-ops/blacklist";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const addSchema = z.object({
  ownerTeamId: z.number().int().positive(),
  blockedTeamId: z.number().int().positive().nullable(),
  blockedTeamName: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(500).nullish(),
});

const removeSchema = z.object({
  ownerTeamId: z.number().int().positive(),
  id: z.string().min(1),
});

async function requireManager(ownerTeamId: number) {
  const session = await auth();
  if (!session) unauthorized();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) return null;
  if (!(await canManageTeam(ownerTeamId, user))) return null;
  return user;
}

export async function POST(request: NextRequest) {
  const parsed = addSchema.safeParse(await request.json());
  if (!parsed.success) return new Response("Invalid request", { status: 400 });
  const user = await requireManager(parsed.data.ownerTeamId);
  if (!user) return new Response("Forbidden", { status: 403 });

  await addBlacklistEntry({
    ownerTeamId: parsed.data.ownerTeamId,
    blockedTeamId: parsed.data.blockedTeamId,
    blockedTeamName: parsed.data.blockedTeamName,
    reason: parsed.data.reason ?? null,
    createdBy: user.id,
    source: "MANUAL",
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const parsed = removeSchema.safeParse(await request.json());
  if (!parsed.success) return new Response("Invalid request", { status: 400 });
  const user = await requireManager(parsed.data.ownerTeamId);
  if (!user) return new Response("Forbidden", { status: 403 });

  await removeBlacklistEntry({ ownerTeamId: parsed.data.ownerTeamId, id: parsed.data.id });
  return Response.json({ ok: true });
}
