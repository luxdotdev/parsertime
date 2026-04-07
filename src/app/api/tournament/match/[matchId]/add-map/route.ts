import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { advanceMatch } from "@/lib/tournaments/advancement";
import { Logger } from "@/lib/logger";
import { createNewMap } from "@/lib/parser";
import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { ParserData } from "@/types/parser";
import { unauthorized } from "next/navigation";
import { after, type NextRequest } from "next/server";

type AddTournamentMapRequest = {
  map: ParserData;
  heroBans?: { hero: string; team: string; banPosition: number }[];
  gameNumber: number;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const startTime = Date.now();
  const event: Record<string, unknown> = {
    route: "tournament.match.addMap",
    method: "POST",
  };

  try {
    const session = await auth();
    if (!session?.user?.email) {
      event.outcome = "unauthorized";
      unauthorized();
    }
    event.userEmail = session.user.email;

    const { matchId: matchIdStr } = await params;
    const matchId = parseInt(matchIdStr);
    event.matchId = matchId;
    if (isNaN(matchId)) {
      event.outcome = "invalid_id";
      event.statusCode = 400;
      return Response.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const data = (await req.json()) as AddTournamentMapRequest;
    event.gameNumber = data.gameNumber;
    if (!data.map) {
      event.outcome = "invalid_map_data";
      event.statusCode = 400;
      return Response.json({ error: "Invalid map data" }, { status: 400 });
    }

    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        team1: true,
        team2: true,
        round: true,
        maps: true,
      },
    });

    if (!match) {
      event.outcome = "not_found";
      event.statusCode = 404;
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    event.tournamentId = match.tournamentId;

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

    if (!match.scrimId) {
      event.outcome = "no_scrim";
      event.statusCode = 500;
      return Response.json(
        { error: "Match has no associated scrim for map storage" },
        { status: 500 }
      );
    }

    await createNewMap(
      {
        map: data.map,
        scrimId: match.scrimId,
        heroBans: data.heroBans,
      },
      session
    );

    const newMap = await prisma.map.findFirst({
      where: { scrimId: match.scrimId },
      orderBy: { createdAt: "desc" },
      include: {
        mapData: {
          include: {
            match_start: true,
            match_end: true,
            round_end: true,
            objective_captured: true,
            payload_progress: true,
            point_progress: true,
          },
        },
      },
    });

    if (!newMap) {
      event.outcome = "map_creation_failed";
      event.statusCode = 500;
      return Response.json({ error: "Failed to create map" }, { status: 500 });
    }

    const tournamentMap = await prisma.tournamentMap.create({
      data: {
        matchId: match.id,
        gameNumber: data.gameNumber,
        mapId: newMap.id,
      },
    });

    const mapData = newMap.mapData[0];
    let winner: string | null = null;

    if (mapData) {
      const matchStart = mapData.match_start[0] ?? null;
      const finalRound =
        mapData.round_end.length > 0
          ? mapData.round_end.reduce((latest, re) =>
              re.round_number > latest.round_number ? re : latest
            )
          : null;

      const team1Name = matchStart?.team_1_name ?? "";
      const team2Name = matchStart?.team_2_name ?? "";

      const team1Captures = mapData.objective_captured.filter(
        (oc) => oc.capturing_team === team1Name
      );
      const team2Captures = mapData.objective_captured.filter(
        (oc) => oc.capturing_team === team2Name
      );
      const team1PayloadProgress = mapData.payload_progress.filter(
        (pp) => pp.capturing_team === team1Name
      );
      const team2PayloadProgress = mapData.payload_progress.filter(
        (pp) => pp.capturing_team === team2Name
      );
      const team1PointProgress = mapData.point_progress.filter(
        (pp) => pp.capturing_team === team1Name
      );
      const team2PointProgress = mapData.point_progress.filter(
        (pp) => pp.capturing_team === team2Name
      );

      const result = calculateWinner({
        matchDetails: matchStart,
        finalRound,
        team1Captures,
        team2Captures,
        team1PayloadProgress,
        team2PayloadProgress,
        team1PointProgress,
        team2PointProgress,
      });

      if (result !== "N/A") {
        winner = result;
        await prisma.tournamentMap.update({
          where: { id: tournamentMap.id },
          data: { winnerOverride: winner },
        });

        await updateMatchScores(match.id);
      }
    }

    event.winner = winner ?? "auto";
    event.needsManualWinner = winner === null;

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_MATCH_UPDATED",
        target: match.id.toString(),
        details: `Map ${data.gameNumber} added to match #${match.id}`,
      });
    });

    event.outcome = "success";
    event.statusCode = 200;
    return Response.json({
      mapId: newMap.id,
      tournamentMapId: tournamentMap.id,
      winner,
      needsManualWinner: winner === null,
    });
  } catch (e) {
    event.outcome = "error";
    event.statusCode = 500;
    event.error = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Failed to add map" }, { status: 500 });
  } finally {
    event.durationMs = Date.now() - startTime;
    const logFn =
      event.outcome === "error"
        ? (e: Record<string, unknown>) => Logger.error(e)
        : (e: Record<string, unknown>) => Logger.info(e);
    logFn(event);
  }
}

async function updateMatchScores(matchId: number) {
  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      team1: true,
      team2: true,
      round: true,
      maps: true,
    },
  });

  if (!match?.team1 || !match.team2) return;

  let team1Wins = 0;
  let team2Wins = 0;

  for (const map of match.maps) {
    if (map.winnerOverride === match.team1.name) team1Wins++;
    else if (map.winnerOverride === match.team2.name) team2Wins++;
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

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: {
      team1Score: team1Wins,
      team2Score: team2Wins,
      status: isDecided ? "COMPLETED" : "ONGOING",
      winnerId: isDecided ? winnerId : null,
    },
  });

  if (isDecided && winnerId) {
    const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;

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
}
