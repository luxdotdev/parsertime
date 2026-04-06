import prisma from "@/lib/prisma";
import { getNextMatch } from "@/lib/tournaments/bracket";
import type { BracketSide } from "@prisma/client";

export type TeamStanding = {
  teamId: number;
  teamName: string;
  matchesWon: number;
  matchesLost: number;
  mapsWon: number;
  mapsLost: number;
  mapDifferential: number;
  headToHead: Map<number, number>;
};

export async function calculateRRStandings(
  tournamentId: number
): Promise<TeamStanding[]> {
  const completedMatches = await prisma.tournamentMatch.findMany({
    where: {
      tournamentId,
      round: { bracket: "ROUND_ROBIN" },
      status: "COMPLETED",
    },
    include: {
      team1: true,
      team2: true,
    },
  });

  const standingsMap = new Map<
    number,
    {
      teamName: string;
      matchesWon: number;
      matchesLost: number;
      mapsWon: number;
      mapsLost: number;
      headToHead: Map<number, number>;
    }
  >();

  const ensureTeam = (teamId: number, teamName: string) => {
    if (!standingsMap.has(teamId)) {
      standingsMap.set(teamId, {
        teamName,
        matchesWon: 0,
        matchesLost: 0,
        mapsWon: 0,
        mapsLost: 0,
        headToHead: new Map(),
      });
    }
  };

  for (const match of completedMatches) {
    if (!match.team1Id || !match.team2Id || !match.winnerId) continue;

    const t1Id = match.team1Id;
    const t2Id = match.team2Id;
    const t1Name = match.team1?.name ?? "Unknown";
    const t2Name = match.team2?.name ?? "Unknown";

    ensureTeam(t1Id, t1Name);
    ensureTeam(t2Id, t2Name);

    const t1 = standingsMap.get(t1Id)!;
    const t2 = standingsMap.get(t2Id)!;

    t1.mapsWon += match.team1Score;
    t1.mapsLost += match.team2Score;
    t2.mapsWon += match.team2Score;
    t2.mapsLost += match.team1Score;

    if (match.winnerId === t1Id) {
      t1.matchesWon++;
      t2.matchesLost++;
      t1.headToHead.set(t2Id, (t1.headToHead.get(t2Id) ?? 0) + 1);
      t2.headToHead.set(t1Id, (t2.headToHead.get(t1Id) ?? 0) - 1);
    } else {
      t2.matchesWon++;
      t1.matchesLost++;
      t2.headToHead.set(t1Id, (t2.headToHead.get(t1Id) ?? 0) + 1);
      t1.headToHead.set(t2Id, (t1.headToHead.get(t2Id) ?? 0) - 1);
    }
  }

  // Also include teams that haven't played yet
  const allTeams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
  });
  for (const team of allTeams) {
    ensureTeam(team.id, team.name);
  }

  const standings: TeamStanding[] = [];
  for (const [teamId, data] of standingsMap) {
    standings.push({
      teamId,
      teamName: data.teamName,
      matchesWon: data.matchesWon,
      matchesLost: data.matchesLost,
      mapsWon: data.mapsWon,
      mapsLost: data.mapsLost,
      mapDifferential: data.mapsWon - data.mapsLost,
      headToHead: data.headToHead,
    });
  }

  standings.sort((a, b) => {
    if (a.matchesWon !== b.matchesWon) return b.matchesWon - a.matchesWon;
    if (a.mapDifferential !== b.mapDifferential)
      return b.mapDifferential - a.mapDifferential;
    const aH2H = a.headToHead.get(b.teamId) ?? 0;
    const bH2H = b.headToHead.get(a.teamId) ?? 0;
    return bH2H - aH2H;
  });

  return standings;
}

function bracketOrder(n: number): number[] {
  if (n === 1) return [1];
  const half = n / 2;
  const previous = bracketOrder(half);
  const result: number[] = [];
  for (const seed of previous) {
    result.push(seed);
    result.push(n + 1 - seed);
  }
  return result;
}

function generateSeededPairings(totalSlots: number): [number, number][] {
  const order = bracketOrder(totalSlots);
  const pairings: [number, number][] = [];
  for (let i = 0; i < order.length; i += 2) {
    pairings.push([order[i], order[i + 1]]);
  }
  return pairings;
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export async function transitionToPlayoffs(
  tournamentId: number
): Promise<void> {
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournamentId },
  });

  const advancingCount = tournament.advancingTeams ?? undefined;
  const standings = await calculateRRStandings(tournamentId);

  const teamCount = advancingCount ?? standings.length;
  const qualifiedTeams = standings.slice(0, teamCount);

  const playoffSlots = nextPowerOf2(teamCount);
  const totalPlayoffRounds = Math.log2(playoffSlots);
  const pairings = generateSeededPairings(playoffSlots);

  const firstPlayoffRound = await prisma.tournamentRound.findFirst({
    where: {
      tournamentId,
      bracket: "WINNERS",
      roundNumber: 1,
    },
  });

  if (!firstPlayoffRound) return;

  const firstRoundMatches = await prisma.tournamentMatch.findMany({
    where: {
      tournamentId,
      roundId: firstPlayoffRound.id,
    },
    orderBy: { bracketPosition: "asc" },
  });

  for (let i = 0; i < pairings.length; i++) {
    const [seed1, seed2] = pairings[i];
    const match = firstRoundMatches[i];
    if (!match) continue;

    const team1 = seed1 <= teamCount ? qualifiedTeams[seed1 - 1] : null;
    const team2 = seed2 <= teamCount ? qualifiedTeams[seed2 - 1] : null;

    await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: {
        team1Id: team1?.teamId ?? null,
        team2Id: team2?.teamId ?? null,
      },
    });

    if (team1 && !team2) {
      await advanceByeWinner(
        tournamentId,
        match.bracketPosition,
        totalPlayoffRounds,
        team1.teamId
      );
    } else if (team2 && !team1) {
      await advanceByeWinner(
        tournamentId,
        match.bracketPosition,
        totalPlayoffRounds,
        team2.teamId
      );
    }
  }
}

async function advanceByeWinner(
  tournamentId: number,
  bracketPosition: number,
  totalPlayoffRounds: number,
  teamId: number
): Promise<void> {
  const next = getNextMatch(1, bracketPosition, totalPlayoffRounds);
  if (!next) return;

  const nextRound = await prisma.tournamentRound.findFirst({
    where: {
      tournamentId,
      bracket: "WINNERS",
      roundNumber: next.roundNumber,
    },
  });

  if (!nextRound) return;

  const nextMatch = await prisma.tournamentMatch.findFirst({
    where: {
      tournamentId,
      roundId: nextRound.id,
      bracketPosition: next.bracketPosition,
    },
  });

  if (!nextMatch) return;

  await prisma.tournamentMatch.update({
    where: { id: nextMatch.id },
    data: {
      [next.slot === "team1" ? "team1Id" : "team2Id"]: teamId,
    },
  });
}
