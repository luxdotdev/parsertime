import { AppRuntime } from "@/data/runtime";
import { TournamentService } from "@/data/tournament";
import { Effect } from "effect";
import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentMapId: string }> }
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "tournament.map.delete",
    method: "DELETE",
  };

  try {
    const session = await auth();
    if (!session?.user?.email) {
      event.outcome = "unauthorized";
      unauthorized();
    }
    event.userEmail = session.user.email;

    const { tournamentMapId: idStr } = await params;
    const tournamentMapId = parseInt(idStr);
    event.tournamentMapId = tournamentMapId;
    if (isNaN(tournamentMapId)) {
      event.outcome = "invalid_id";
      event.statusCode = 400;
      return Response.json(
        { error: "Invalid tournament map ID" },
        { status: 400 }
      );
    }

    const tournamentMap = await prisma.tournamentMap.findUnique({
      where: { id: tournamentMapId },
      include: {
        match: {
          include: {
            tournament: true,
            team1: true,
            team2: true,
            round: true,
            maps: true,
          },
        },
      },
    });

    if (!tournamentMap) {
      event.outcome = "not_found";
      event.statusCode = 404;
      return Response.json(
        { error: "Tournament map not found" },
        { status: 404 }
      );
    }

    const match = tournamentMap.match;
    event.matchId = match.id;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (
      user?.id !== match.tournament.creatorId &&
      user?.role !== "ADMIN" &&
      user?.role !== "MANAGER"
    ) {
      event.outcome = "forbidden";
      event.statusCode = 403;
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const mapId = tournamentMap.mapId;

    await prisma.tournamentMap.delete({
      where: { id: tournamentMapId },
    });

    if (mapId) {
      await prisma.map.delete({ where: { id: mapId } });
    }

    const remainingMaps = await prisma.tournamentMap.findMany({
      where: { matchId: match.id },
    });

    let team1Wins = 0;
    let team2Wins = 0;
    for (const map of remainingMaps) {
      if (map.winnerOverride === match.team1?.name) team1Wins++;
      else if (map.winnerOverride === match.team2?.name) team2Wins++;
    }

    const bestOf = match.round.bestOf ?? match.tournament.bestOf;
    const winsNeeded = Math.ceil(bestOf / 2);
    const isDecided = team1Wins >= winsNeeded || team2Wins >= winsNeeded;

    await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: {
        team1Score: team1Wins,
        team2Score: team2Wins,
        status: isDecided
          ? "COMPLETED"
          : remainingMaps.length > 0
            ? "ONGOING"
            : "UPCOMING",
        winnerId: isDecided
          ? team1Wins >= winsNeeded
            ? match.team1Id
            : match.team2Id
          : null,
      },
    });

    await AppRuntime.runPromise(
      TournamentService.pipe(
        Effect.flatMap((svc) => svc.invalidateMatch(match.id))
      )
    );

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_MATCH_UPDATED",
        target: match.id.toString(),
        details: `Map ${tournamentMap.gameNumber} deleted from match #${match.id}`,
      });
    });

    event.outcome = "success";
    event.statusCode = 200;
    return Response.json({ success: true });
  } catch (e) {
    event.outcome = "error";
    event.statusCode = 500;
    event.error = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Failed to delete map" }, { status: 500 });
  } finally {
    event.durationMs = Date.now() - startTime;
    const logFn =
      event.outcome === "error"
        ? (e: Record<string, unknown>) => Logger.error(e)
        : (e: Record<string, unknown>) => Logger.info(e);
    logFn(event);
  }
}
