import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth, canManageTeam } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { recordScrimFeedback } from "@/lib/team-ops/scrim-feedback";
import { unauthorized } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  scrimId: z.number().int().positive(),
  verdict: z.enum(["GOOD", "NEUTRAL", "BLACKLISTED", "DISMISSED"]),
  reason: z.string().trim().max(500).nullish(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const session = await auth();
  if (!session) unauthorized();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) return new Response("Forbidden", { status: 403 });

  const scrim = await prisma.scrim.findUnique({
    where: { id: parsed.data.scrimId },
    select: {
      teamId: true,
      opponentTeamId: true,
      feedback: { select: { id: true } },
      opponentTeam: { select: { name: true } },
    },
  });
  if (!scrim?.teamId || !scrim.opponentTeamId) {
    return new Response("Not linked", { status: 404 });
  }
  // Authorize before leaking any per-scrim state (e.g. the 409 below).
  if (!(await canManageTeam(scrim.teamId, user))) {
    return new Response("Forbidden", { status: 403 });
  }
  if (scrim.feedback) return new Response("Already recorded", { status: 409 });

  await recordScrimFeedback({
    scrimId: parsed.data.scrimId,
    ownerTeamId: scrim.teamId,
    opponentTeamId: scrim.opponentTeamId,
    opponentTeamName: scrim.opponentTeam?.name ?? "Unknown",
    verdict: parsed.data.verdict,
    reason: parsed.data.reason ?? null,
    userId: user.id,
  });
  return Response.json({ ok: true });
}
