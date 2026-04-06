import { auditLog } from "@/lib/audit-logs";
import { auth } from "@/lib/auth";
import { getNextMatch } from "@/lib/bracket";
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
  const session = await auth();
  if (!session?.user?.email) {
    Logger.warn("Unauthorized request to add tournament map");
    unauthorized();
  }

  const { matchId: matchIdStr } = await params;
  const matchId = parseInt(matchIdStr);
  if (isNaN(matchId)) {
    return Response.json({ error: "Invalid match ID" }, { status: 400 });
  }

  const data = (await req.json()) as AddTournamentMapRequest;
  if (!data.map) {
    return Response.json({ error: "Invalid map data" }, { status: 400 });
  }

  try {
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
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    // Check permissions: tournament creator or admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (
      user?.id !== match.tournament.creatorId &&
      user?.role !== "ADMIN" &&
      user?.role !== "MANAGER"
    ) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!match.scrimId) {
      return Response.json(
        { error: "Match has no associated scrim for map storage" },
        { status: 500 }
      );
    }

    // Create the map via existing pipeline
    await createNewMap(
      {
        map: data.map,
        scrimId: match.scrimId,
        heroBans: data.heroBans,
      },
      session
    );

    // Find the newly created map (latest map in this scrim)
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
      return Response.json({ error: "Failed to create map" }, { status: 500 });
    }

    // Create TournamentMap record
    const tournamentMap = await prisma.tournamentMap.create({
      data: {
        matchId: match.id,
        gameNumber: data.gameNumber,
        mapId: newMap.id,
      },
    });

    // Try to auto-determine winner
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

        // Update match scores and check for match completion
        await updateMatchScores(match.id);
      }
    }

    after(async () => {
      await auditLog.createAuditLog({
        userEmail: session.user.email,
        action: "TOURNAMENT_MATCH_UPDATED",
        target: match.id.toString(),
        details: `Map ${data.gameNumber} added to match #${match.id}`,
      });
    });

    return Response.json({
      mapId: newMap.id,
      tournamentMapId: tournamentMap.id,
      winner,
      needsManualWinner: winner === null,
    });
  } catch (e) {
    Logger.error("Error adding tournament map", e);
    return Response.json({ error: "Failed to add map" }, { status: 500 });
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

  if (!match || !match.team1 || !match.team2) return;

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

  // If match is decided, advance winner to next round
  if (isDecided && winnerId) {
    const totalRounds = await prisma.tournamentRound.count({
      where: { tournamentId: match.tournamentId },
    });

    const next = getNextMatch(
      match.round.roundNumber,
      match.bracketPosition,
      totalRounds
    );

    if (next) {
      const nextRound = await prisma.tournamentRound.findUnique({
        where: {
          tournamentId_roundNumber: {
            tournamentId: match.tournamentId,
            roundNumber: next.roundNumber,
          },
        },
      });

      if (nextRound) {
        const nextMatch = await prisma.tournamentMatch.findFirst({
          where: {
            tournamentId: match.tournamentId,
            roundId: nextRound.id,
            bracketPosition: next.bracketPosition,
          },
        });

        if (nextMatch) {
          await prisma.tournamentMatch.update({
            where: { id: nextMatch.id },
            data: {
              [next.slot === "team1" ? "team1Id" : "team2Id"]: winnerId,
            },
          });
        }
      }
    }

    // Check if tournament is complete (final match decided)
    if (match.round.roundNumber === totalRounds) {
      await prisma.tournament.update({
        where: { id: match.tournamentId },
        data: { status: "COMPLETED" },
      });
    }
  }
}
