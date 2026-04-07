import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { advanceMatch } from "@/lib/tournaments/advancement";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const setWinnerSchema = z.object({
  winner: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentMapId: string }> }
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "tournament.map.setWinner",
    method: "POST",
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

    const body = await req.json();
    const parsed = setWinnerSchema.safeParse(body);
    if (!parsed.success) {
      event.outcome = "validation_error";
      event.statusCode = 400;
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    event.winner = parsed.data.winner;

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

    await prisma.tournamentMap.update({
      where: { id: tournamentMapId },
      data: { winnerOverride: parsed.data.winner },
    });

    const allMaps = await prisma.tournamentMap.findMany({
      where: { matchId: match.id },
    });

    let team1Wins = 0;
    let team2Wins = 0;

    for (const map of allMaps) {
      const winner =
        map.id === tournamentMapId ? parsed.data.winner : map.winnerOverride;
      if (winner === match.team1?.name) team1Wins++;
      else if (winner === match.team2?.name) team2Wins++;
    }

    const bestOf = match.round.bestOf ?? match.tournament.bestOf;
    const winsNeeded = Math.ceil(bestOf / 2);
    const isDecided = team1Wins >= winsNeeded || team2Wins >= winsNeeded;
    const winnerId =
      team1Wins >= winsNeeded
        ? match.team1Id
        : team2Wins >= winsNeeded
          ? match.team2Id
          : null;

    event.matchDecided = isDecided;

    await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: {
        team1Score: team1Wins,
        team2Score: team2Wins,
        status: isDecided ? "COMPLETED" : "ONGOING",
        winnerId: isDecided ? winnerId : null,
      },
    });

    if (isDecided && winnerId) {
      const loserId =
        winnerId === match.team1Id ? match.team2Id : match.team1Id;

      await advanceMatch(
        {
          id: match.id,
          tournamentId: match.tournamentId,
          bracketPosition: match.bracketPosition,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
          round: {
            roundNumber: match.round.roundNumber,
            bracket: match.round.bracket,
          },
          tournament: {
            format: match.tournament.format,
            bestOf: match.tournament.bestOf,
            grandFinalReset: match.tournament.grandFinalReset,
          },
        },
        winnerId,
        loserId
      );
    }

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_MATCH_UPDATED",
        target: match.id.toString(),
        details: `Winner set for map ${tournamentMap.gameNumber} in match #${match.id}: ${parsed.data.winner}`,
      });
    });

    event.outcome = "success";
    event.statusCode = 200;
    return Response.json({ success: true });
  } catch (e) {
    event.outcome = "error";
    event.statusCode = 500;
    event.error = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Failed to set winner" }, { status: 500 });
  } finally {
    event.durationMs = Date.now() - startTime;
    const logFn = event.outcome === "error" ? (e: Record<string, unknown>) => Logger.error(e) : (e: Record<string, unknown>) => Logger.info(e);
    logFn(event);
  }
}
