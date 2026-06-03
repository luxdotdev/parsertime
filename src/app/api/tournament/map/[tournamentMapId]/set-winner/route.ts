import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { advanceMatch } from "@/lib/tournaments/advancement";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { unauthorized, unstable_rethrow } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { z } from "zod";

const setWinnerSchema = z.object({
  winner: z.string().min(1),
});

const TOURNAMENT_MATCH_LOCK_NAMESPACE = 61_042;

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
    if (!match.team1?.name || !match.team2?.name) {
      event.outcome = "missing_teams";
      event.statusCode = 400;
      return Response.json(
        { error: "Match teams must be assigned before setting a winner" },
        { status: 400 }
      );
    }

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

    if (![match.team1.name, match.team2.name].includes(parsed.data.winner)) {
      event.outcome = "invalid_winner";
      event.statusCode = 400;
      return Response.json({ error: "Invalid winner" }, { status: 400 });
    }

    const mutation = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TOURNAMENT_MATCH_LOCK_NAMESPACE}::integer, ${match.id}::integer)`;

      const lockedMatch = await tx.tournamentMatch.findUnique({
        where: { id: match.id },
        include: {
          tournament: true,
          team1: true,
          team2: true,
          round: true,
          maps: true,
        },
      });
      if (!lockedMatch) return { status: "not_found" as const };
      if (lockedMatch.status === "COMPLETED" && lockedMatch.winnerId) {
        return { status: "match_completed" as const };
      }

      await tx.tournamentMap.update({
        where: { id: tournamentMapId },
        data: { winnerOverride: parsed.data.winner },
      });

      let team1Wins = 0;
      let team2Wins = 0;

      for (const map of lockedMatch.maps) {
        const winner =
          map.id === tournamentMapId ? parsed.data.winner : map.winnerOverride;
        if (winner === lockedMatch.team1?.name) team1Wins++;
        else if (winner === lockedMatch.team2?.name) team2Wins++;
      }

      const bestOf = lockedMatch.round.bestOf ?? lockedMatch.tournament.bestOf;
      const winsNeeded = Math.ceil(bestOf / 2);
      const isDecided = team1Wins >= winsNeeded || team2Wins >= winsNeeded;
      const winnerId =
        team1Wins >= winsNeeded
          ? lockedMatch.team1Id
          : team2Wins >= winsNeeded
            ? lockedMatch.team2Id
            : null;

      await tx.tournamentMatch.update({
        where: { id: lockedMatch.id },
        data: {
          team1Score: team1Wins,
          team2Score: team2Wins,
          status: isDecided ? "COMPLETED" : "ONGOING",
          winnerId: isDecided ? winnerId : null,
        },
      });

      const loserId = winnerId
        ? winnerId === lockedMatch.team1Id
          ? lockedMatch.team2Id
          : lockedMatch.team1Id
        : null;

      return {
        status: "ok" as const,
        isDecided,
        winnerId,
        loserId,
        match: {
          id: lockedMatch.id,
          tournamentId: lockedMatch.tournamentId,
          bracketPosition: lockedMatch.bracketPosition,
          team1Id: lockedMatch.team1Id,
          team2Id: lockedMatch.team2Id,
          round: {
            roundNumber: lockedMatch.round.roundNumber,
            bracket: lockedMatch.round.bracket,
          },
          tournament: {
            format: lockedMatch.tournament.format,
            bestOf: lockedMatch.tournament.bestOf,
            grandFinalReset: lockedMatch.tournament.grandFinalReset,
          },
        },
      };
    });

    if (mutation.status === "not_found") {
      event.outcome = "not_found";
      event.statusCode = 404;
      return Response.json(
        { error: "Tournament map not found" },
        { status: 404 }
      );
    }

    if (mutation.status === "match_completed") {
      event.outcome = "match_completed";
      event.statusCode = 409;
      return Response.json(
        { error: "Cannot change winners after a match is completed" },
        { status: 409 }
      );
    }

    event.matchDecided = mutation.isDecided;

    if (mutation.isDecided && mutation.winnerId && mutation.loserId) {
      await advanceMatch(mutation.match, mutation.winnerId, mutation.loserId);
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
    unstable_rethrow(e);
    event.outcome = "error";
    event.statusCode = 500;
    event.error = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Failed to set winner" }, { status: 500 });
  } finally {
    event.durationMs = Date.now() - startTime;
    const logFn =
      event.outcome === "error"
        ? (e: Record<string, unknown>) => Logger.error(e)
        : (e: Record<string, unknown>) => Logger.info(e);
    logFn(event);
  }
}
