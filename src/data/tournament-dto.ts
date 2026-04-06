import {
  calculateRRStandings,
  type TeamStanding,
} from "@/lib/tournaments/round-robin";
import prisma from "@/lib/prisma";
import { cache } from "react";

async function getTournamentFn(id: number) {
  return await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: {
        include: { team: { select: { id: true, name: true, image: true } } },
        orderBy: { seed: "asc" },
      },
      rounds: { orderBy: [{ bracket: "asc" }, { roundNumber: "asc" }] },
      matches: {
        include: {
          team1: true,
          team2: true,
          winner: true,
          round: true,
          maps: { include: { map: true }, orderBy: { gameNumber: "asc" } },
        },
        orderBy: [{ roundId: "asc" }, { bracketPosition: "asc" }],
      },
    },
  });
}

export const getTournament = cache(getTournamentFn);

async function getUserTournamentsFn(userId: string) {
  return await prisma.tournament.findMany({
    where: {
      OR: [
        { creatorId: userId },
        {
          teams: {
            some: { team: { users: { some: { id: userId } } } },
          },
        },
      ],
    },
    include: {
      teams: { select: { name: true }, orderBy: { seed: "asc" } },
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export const getUserTournaments = cache(getUserTournamentsFn);

async function getTournamentMatchFn(matchId: number) {
  return await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      round: true,
      team1: {
        include: { team: { select: { id: true, name: true, image: true } } },
      },
      team2: {
        include: { team: { select: { id: true, name: true, image: true } } },
      },
      winner: true,
      maps: {
        include: {
          map: {
            include: {
              mapData: {
                include: {
                  match_start: true,
                  match_end: true,
                  round_end: true,
                  HeroBan: true,
                },
              },
            },
          },
        },
        orderBy: { gameNumber: "asc" },
      },
    },
  });
}

export const getTournamentMatch = cache(getTournamentMatchFn);

async function getTournamentBracketFn(tournamentId: number) {
  return await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: { orderBy: { seed: "asc" } },
      rounds: { orderBy: [{ bracket: "asc" }, { roundNumber: "asc" }] },
      matches: {
        include: {
          team1: { select: { id: true, name: true, seed: true } },
          team2: { select: { id: true, name: true, seed: true } },
          winner: { select: { id: true, name: true } },
          round: {
            select: { roundNumber: true, roundName: true, bracket: true },
          },
        },
        orderBy: [{ roundId: "asc" }, { bracketPosition: "asc" }],
      },
    },
  });
}

export const getTournamentBracket = cache(getTournamentBracketFn);

async function getRRStandingsFn(tournamentId: number): Promise<TeamStanding[]> {
  return calculateRRStandings(tournamentId);
}

export const getRRStandings = cache(getRRStandingsFn);
