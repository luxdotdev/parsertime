import { auditLog } from "@/lib/audit-logs";
import { auth, canEditScrim, getCurrentUser } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { resolveSetWinnerOutcome } from "@/lib/scrim/set-winner-validation";
import { revalidateTag } from "next/cache";
import { unauthorized, unstable_rethrow } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ winner: z.string().min(1).max(100) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const event: Record<string, unknown> = {
    route: "POST /api/scrim/map/[mapId]/set-winner",
    timestamp: new Date().toISOString(),
  };

  try {
    const session = await auth();
    if (!session?.user?.email) {
      event.outcome = "unauthorized";
      unauthorized();
    }

    const mapId = Number((await params).mapId);
    if (!Number.isInteger(mapId)) {
      return Response.json({ error: "Invalid map id" }, { status: 400 });
    }
    event.map_id = mapId;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const map = await prisma.map.findUnique({
      where: { id: mapId },
      select: { id: true, scrimId: true, mapData: { select: { id: true } } },
    });
    if (!map?.scrimId) {
      return Response.json({ error: "Map not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    if (!(await canEditScrim(map.scrimId, user))) {
      event.outcome = "forbidden";
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const mapDataIds = map.mapData.map((md) => md.id);
    const matchStart = await prisma.matchStart.findFirst({
      where: { MapDataId: { in: mapDataIds } },
      select: { team_1_name: true, team_2_name: true },
    });

    const outcome = resolveSetWinnerOutcome(parsed.data.winner, {
      team1: matchStart?.team_1_name ?? "",
      team2: matchStart?.team_2_name ?? "",
    });
    if (!outcome.ok) {
      event.outcome = "invalid_winner";
      return Response.json({ error: outcome.error }, { status: 400 });
    }

    await prisma.map.update({
      where: { id: mapId },
      data: { winner: parsed.data.winner, winnerSource: "manual" },
    });

    revalidateTag(`map:${mapId}`, "max");

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "MAP_UPDATED",
        target: `Scrim ID: ${map.scrimId}`,
        details: `Winner set for map ${mapId}: ${parsed.data.winner}`,
      });
    });

    event.outcome = "success";
    event.winner = parsed.data.winner;
    Logger.info(event);
    return Response.json({ success: true });
  } catch (error) {
    unstable_rethrow(error);
    event.outcome = "error";
    event.error = error instanceof Error ? error.message : String(error);
    Logger.error(event);
    return Response.json({ error: "Failed to set winner" }, { status: 500 });
  }
}
