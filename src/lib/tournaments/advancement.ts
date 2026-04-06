import { getAdvancement, getNextMatch } from "@/lib/tournaments/bracket";
import { transitionToPlayoffs } from "@/lib/tournaments/round-robin";
import prisma from "@/lib/prisma";
import type { BracketSide } from "@prisma/client";

type MatchWithContext = {
  id: number;
  tournamentId: number;
  bracketPosition: number;
  team1Id: number | null;
  team2Id: number | null;
  round: {
    roundNumber: number;
    bracket: BracketSide;
  };
  tournament: {
    format: string;
    bestOf: number;
    grandFinalReset: boolean;
  };
};

export async function advanceMatch(
  match: MatchWithContext,
  winnerId: number,
  loserId: number | null
) {
  const isDE = match.tournament.format === "DOUBLE_ELIMINATION";

  if (match.round.bracket === "ROUND_ROBIN") {
    const totalRRMatches = await prisma.tournamentMatch.count({
      where: {
        tournamentId: match.tournamentId,
        round: { bracket: "ROUND_ROBIN" },
      },
    });

    const completedRRMatches = await prisma.tournamentMatch.count({
      where: {
        tournamentId: match.tournamentId,
        round: { bracket: "ROUND_ROBIN" },
        status: "COMPLETED",
      },
    });

    if (completedRRMatches >= totalRRMatches) {
      await transitionToPlayoffs(match.tournamentId);
    }

    return;
  }

  if (!isDE) {
    const totalRounds = await prisma.tournamentRound.count({
      where: { tournamentId: match.tournamentId },
    });

    const next = getNextMatch(
      match.round.roundNumber,
      match.bracketPosition,
      totalRounds
    );

    if (next) {
      await placeTeamInMatch(
        match.tournamentId,
        next.roundNumber,
        next.bracketPosition,
        "WINNERS",
        next.slot,
        winnerId
      );
    }

    if (match.round.roundNumber === totalRounds) {
      await prisma.tournament.update({
        where: { id: match.tournamentId },
        data: { status: "COMPLETED" },
      });
    }
    return;
  }

  const bracket = match.round.bracket;

  if (bracket === "GRAND_FINAL") {
    const gfMatches = await prisma.tournamentMatch.findMany({
      where: {
        tournamentId: match.tournamentId,
        round: { bracket: "GRAND_FINAL" },
      },
    });

    if (
      gfMatches.length === 1 &&
      match.team1Id !== winnerId &&
      match.tournament.grandFinalReset
    ) {
      const gfRound = await prisma.tournamentRound.findFirst({
        where: { tournamentId: match.tournamentId, bracket: "GRAND_FINAL" },
      });

      if (gfRound) {
        const tournament = await prisma.tournament.findUnique({
          where: { id: match.tournamentId },
          select: { creatorId: true, name: true },
        });

        const scrim = await prisma.scrim.create({
          data: {
            name: `[Tournament] ${tournament?.name ?? "Unknown"} - Grand Final Reset`,
            date: new Date(),
            creatorId: tournament?.creatorId ?? "",
            autoAssignTeamNames: false,
          },
        });

        await prisma.tournamentMatch.create({
          data: {
            tournamentId: match.tournamentId,
            roundId: gfRound.id,
            bracketPosition: 1,
            team1Id: match.team1Id,
            team2Id: winnerId,
            scrimId: scrim.id,
            status: "UPCOMING",
          },
        });
      }
    } else {
      await prisma.tournament.update({
        where: { id: match.tournamentId },
        data: { status: "COMPLETED" },
      });
    }
    return;
  }

  const wbRoundCount = await prisma.tournamentRound.count({
    where: { tournamentId: match.tournamentId, bracket: "WINNERS" },
  });
  const lbRoundCount = await prisma.tournamentRound.count({
    where: { tournamentId: match.tournamentId, bracket: "LOSERS" },
  });

  const advancement = getAdvancement(
    bracket,
    match.round.roundNumber,
    match.bracketPosition,
    wbRoundCount,
    lbRoundCount
  );

  if (advancement.winner) {
    await placeTeamInMatch(
      match.tournamentId,
      advancement.winner.roundNumber,
      advancement.winner.bracketPosition,
      advancement.winner.bracket,
      advancement.winner.slot,
      winnerId
    );
  }

  if (advancement.loser && loserId) {
    await placeTeamInMatch(
      match.tournamentId,
      advancement.loser.roundNumber,
      advancement.loser.bracketPosition,
      advancement.loser.bracket,
      advancement.loser.slot,
      loserId
    );
  }

  if (bracket === "LOSERS" && loserId) {
    await prisma.tournamentTeam.updateMany({
      where: { id: loserId, tournamentId: match.tournamentId },
      data: { eliminated: true },
    });
  }
}

async function placeTeamInMatch(
  tournamentId: number,
  roundNumber: number,
  bracketPosition: number,
  bracket: BracketSide | string,
  slot: "team1" | "team2",
  teamId: number
) {
  const round = await prisma.tournamentRound.findFirst({
    where: {
      tournamentId,
      bracket: bracket as BracketSide,
      roundNumber,
    },
  });

  if (!round) return;

  const targetMatch = await prisma.tournamentMatch.findFirst({
    where: {
      tournamentId,
      roundId: round.id,
      bracketPosition,
    },
  });

  if (!targetMatch) return;

  await prisma.tournamentMatch.update({
    where: { id: targetMatch.id },
    data: {
      [slot === "team1" ? "team1Id" : "team2Id"]: teamId,
    },
  });
}
