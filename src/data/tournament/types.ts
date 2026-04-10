import type { PrismaClient } from "@prisma/client";
import type { calculateRRStandings } from "@/lib/tournaments/round-robin";

export type Tournament = NonNullable<
  Awaited<ReturnType<PrismaClient["tournament"]["findUnique"]>>
>;

export type UserTournaments = Awaited<
  ReturnType<PrismaClient["tournament"]["findMany"]>
>;

export type TournamentMatch = NonNullable<
  Awaited<ReturnType<PrismaClient["tournamentMatch"]["findUnique"]>>
>;

export type TeamStanding = Awaited<
  ReturnType<typeof calculateRRStandings>
>[number];

export type BroadcastData = {
  tournament: {
    id: number;
    name: string;
    format: string;
    bestOf: number;
    status: string;
    teams: {
      name: string;
      seed: number;
      image: string | null;
      eliminated: boolean;
    }[];
    matches: {
      id: number;
      round: string;
      bracket: string;
      bracketPosition: number;
      team1: { name: string; score: number } | null;
      team2: { name: string; score: number } | null;
      status: string;
      winner: string | null;
    }[];
  };
  players: {
    name: string;
    team: string;
    role: string;
    heroesPlayed: string[];
    mapsPlayed: number;
    stats: Record<string, number>;
    per10: Record<string, number>;
    averages: Record<string, number>;
  }[];
} | null;
