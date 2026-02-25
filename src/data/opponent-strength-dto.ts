import "server-only";

import prisma from "@/lib/prisma";
import { cache } from "react";

export type TeamStrengthRating = {
  teamAbbr: string;
  fullName: string;
  rating: number;
  matchesRated: number;
  ratingHistory: { date: Date; rating: number }[];
};

const INITIAL_RATING = 1500;

/**
 * K-factor decays as sample size grows. Early matches have more volatility;
 * established teams converge toward stable ratings.
 */
function kFactor(matchesPlayed: number): number {
  if (matchesPlayed < 5) return 48;
  if (matchesPlayed < 15) return 32;
  if (matchesPlayed < 30) return 24;
  return 16;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

type MatchRecord = {
  matchDate: Date;
  team1: string;
  team1FullName: string;
  team2: string;
  team2FullName: string;
  winner: string | null;
};

async function getTeamStrengthRatingsFn(): Promise<TeamStrengthRating[]> {
  const matches = await prisma.scoutingMatch.findMany({
    select: {
      matchDate: true,
      team1: true,
      team1FullName: true,
      team2: true,
      team2FullName: true,
      winner: true,
    },
    orderBy: { matchDate: "asc" },
  });

  const ratings = new Map<string, number>();
  const fullNames = new Map<string, string>();
  const matchCounts = new Map<string, number>();
  const histories = new Map<string, { date: Date; rating: number }[]>();

  function ensureTeam(abbr: string, name: string) {
    if (!ratings.has(abbr)) {
      ratings.set(abbr, INITIAL_RATING);
      fullNames.set(abbr, name);
      matchCounts.set(abbr, 0);
      histories.set(abbr, []);
    }
  }

  function recordHistory(abbr: string, date: Date) {
    const history = histories.get(abbr)!;
    history.push({ date, rating: ratings.get(abbr)! });
  }

  for (const match of matches as MatchRecord[]) {
    ensureTeam(match.team1, match.team1FullName);
    ensureTeam(match.team2, match.team2FullName);

    if (!match.winner) continue;

    const r1 = ratings.get(match.team1)!;
    const r2 = ratings.get(match.team2)!;
    const n1 = matchCounts.get(match.team1)!;
    const n2 = matchCounts.get(match.team2)!;

    const e1 = expectedScore(r1, r2);
    const e2 = 1 - e1;
    const s1 = match.winner === match.team1 ? 1 : 0;
    const s2 = 1 - s1;

    const k1 = kFactor(n1);
    const k2 = kFactor(n2);

    ratings.set(match.team1, r1 + k1 * (s1 - e1));
    ratings.set(match.team2, r2 + k2 * (s2 - e2));

    matchCounts.set(match.team1, n1 + 1);
    matchCounts.set(match.team2, n2 + 1);

    recordHistory(match.team1, match.matchDate);
    recordHistory(match.team2, match.matchDate);
  }

  return Array.from(ratings.entries())
    .map(([teamAbbr, rating]) => ({
      teamAbbr,
      fullName: fullNames.get(teamAbbr)!,
      rating: Math.round(rating),
      matchesRated: matchCounts.get(teamAbbr)!,
      ratingHistory: histories.get(teamAbbr)!,
    }))
    .sort((a, b) => b.rating - a.rating);
}

export const getTeamStrengthRatings = cache(getTeamStrengthRatingsFn);

export async function getTeamStrengthRating(
  teamAbbr: string
): Promise<TeamStrengthRating | null> {
  const ratings = await getTeamStrengthRatings();
  return ratings.find((r) => r.teamAbbr === teamAbbr) ?? null;
}

/**
 * Returns a percentile rank (0–100) for a given team's rating
 * relative to all rated teams.
 */
export async function getTeamStrengthPercentile(
  teamAbbr: string
): Promise<number | null> {
  const ratings = await getTeamStrengthRatings();
  const index = ratings.findIndex((r) => r.teamAbbr === teamAbbr);
  if (index === -1) return null;
  return Math.round(
    ((ratings.length - 1 - index) / (ratings.length - 1)) * 100
  );
}
