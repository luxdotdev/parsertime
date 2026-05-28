import { auditLog } from "@/lib/audit-logs";
import { auth, canEditScrim, canManageTeam, getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const UpdateScrimSchema = z.object({
  name: z.string().min(1).max(30),
  teamId: z.string().min(1),
  scrimId: z.number(),
  date: z.iso.datetime(),
  guestMode: z.boolean(),
  opponentTeamAbbr: z.string().nullable().optional(),
  maps: z.array(
    z.object({
      id: z.number(),
      replayCode: z.string().max(6).optional(),
      heroBans: z
        .array(
          z.object({
            id: z.number().optional(),
            hero: z.string(),
            team: z.string(),
            banPosition: z.number(),
          })
        )
        .optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    unauthorized();
  }

  const body = UpdateScrimSchema.safeParse(await req.json());
  if (!body.success) return new Response("Invalid request", { status: 400 });

  const user = await getCurrentUser();
  if (!user) unauthorized();

  const scrim = await prisma.scrim.findUnique({
    where: { id: body.data.scrimId },
    select: { id: true, name: true, teamId: true, creatorId: true },
  });
  if (!scrim) return new Response("Scrim not found", { status: 404 });

  if (!(await canEditScrim(scrim.id, user))) unauthorized();

  const targetTeamId = parseInt(body.data.teamId);
  if (!Number.isInteger(targetTeamId)) {
    return new Response("Invalid team ID", { status: 400 });
  }

  if (targetTeamId !== 0 && !(await canManageTeam(targetTeamId, user))) {
    return new Response("Forbidden target team", { status: 403 });
  }

  const mapIds = body.data.maps.map((map) => map.id);
  const maps = await prisma.map.findMany({
    where: { id: { in: mapIds }, scrimId: body.data.scrimId },
    select: { id: true, mapData: { select: { id: true }, take: 1 } },
  });
  if (maps.length !== new Set(mapIds).size) {
    return new Response("Invalid map IDs", { status: 400 });
  }

  const mapDataIdsByMapId = new Map(
    maps.map((map) => [map.id, map.mapData[0]?.id])
  );
  if ([...mapDataIdsByMapId.values()].some((id) => id === undefined)) {
    return new Response("Map data not found", { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.scrim.update({
      where: { id: body.data.scrimId },
      data: {
        name: body.data.name,
        teamId: targetTeamId === 0 ? null : targetTeamId,
        date: new Date(body.data.date),
        guestMode: body.data.guestMode,
        opponentTeamAbbr: body.data.opponentTeamAbbr ?? null,
      },
    });

    for (const mapUpdate of body.data.maps) {
      await tx.map.update({
        where: { id: mapUpdate.id },
        data: { replayCode: mapUpdate.replayCode },
      });

      if (mapUpdate.heroBans) {
        const mapDataId = mapDataIdsByMapId.get(mapUpdate.id)!;

        await tx.heroBan.deleteMany({
          where: { MapDataId: mapDataId },
        });

        if (mapUpdate.heroBans.length > 0) {
          await tx.heroBan.createMany({
            data: mapUpdate.heroBans.map((ban) => ({
              scrimId: body.data.scrimId,
              hero: ban.hero,
              team: ban.team,
              banPosition: ban.banPosition,
              MapDataId: mapDataId,
            })),
          });
        }
      }
    }
  });

  after(async () => {
    await auditLog.createAuditLog({
      userEmail: user.email,
      action: "SCRIM_UPDATED",
      target: `${scrim.name} (ID: ${scrim.id})`,
      details: `Scrim updated: ${scrim.name} (ID: ${scrim.id})`,
    });
  });

  return new Response("OK", { status: 200 });
}
