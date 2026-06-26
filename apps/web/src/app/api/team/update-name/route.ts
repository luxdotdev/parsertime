import { auditLog } from "@/lib/audit-logs";
import { auth, canManageTeam, getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const TeamNameUpdateSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Team name must be at least 2 characters.",
    })
    .max(30, {
      message: "Team name must not be longer than 30 characters.",
    })
    .trim()
    .regex(/^(?!.*?:).*$/),
  teamId: z.number(),
  readonly: z.boolean(),
  scoutingTeamAbbr: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    unauthorized();
  }

  const body = TeamNameUpdateSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const user = await getCurrentUser();
  if (!(await canManageTeam(body.data.teamId, user))) {
    return new Response("Forbidden", { status: 403 });
  }

  if (body.data.scoutingTeamAbbr) {
    const scoutingTeam = await prisma.scoutingMatch.findFirst({
      where: {
        OR: [
          { team1: body.data.scoutingTeamAbbr },
          { team2: body.data.scoutingTeamAbbr },
        ],
      },
      select: { id: true },
    });
    if (!scoutingTeam) {
      return new Response("Invalid scouting team", { status: 400 });
    }
  }

  await prisma.team.update({
    where: { id: body.data.teamId },
    data: {
      name: body.data.name,
      readonly: body.data.readonly,
      scoutingTeamAbbr: body.data.scoutingTeamAbbr ?? null,
    },
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: session.user.email,
      action: "TEAM_UPDATED",
      target: body.data.name,
      details: `Updated name for team ${body.data.name}`,
    });
  });

  return new Response("OK", { status: 200 });
}
