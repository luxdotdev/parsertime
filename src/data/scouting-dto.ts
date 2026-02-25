import "server-only";

import prisma from "@/lib/prisma";
import type { MapType, Prisma } from "@prisma/client";
import { cache } from "react";

export type ScoutingTeam = {
  abbreviation: string;
  fullName: string;
  matchCount: number;
  winCount: number;
};

export type MatchResult = "win" | "loss";

export type ScoutingTeamOverview = {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  weightedWinRate: number;
  recentForm: MatchResult[];
};

export type HeroBanEntry = {
  hero: string;
  rawCount: number;
  weightedCount: number;
};

export type ScoutingHeroBans = {
  bansByTeam: HeroBanEntry[];
  bansAgainstTeam: HeroBanEntry[];
};

export type MapPerformanceEntry = {
  name: string;
  played: number;
  won: number;
  winRate: number;
  weightedWinRate: number;
};

export type ScoutingMapAnalysis = {
  byMap: MapPerformanceEntry[];
  byMapType: (MapPerformanceEntry & { mapType: MapType })[];
};

export type ScoutingMatchHistoryEntry = {
  date: Date;
  opponent: string;
  opponentFullName: string;
  teamScore: number | null;
  opponentScore: number | null;
  result: MatchResult;
  tournament: string;
};

export type ScoutingRecommendation = {
  name: string;
  reason: string;
  weightedWinRate: number;
  sampleSize: number;
};

export type ScoutingRecommendations = {
  suggestedBans: ScoutingRecommendation[];
  suggestedMapPicks: ScoutingRecommendation[];
  suggestedMapAvoids: ScoutingRecommendation[];
};

export type ScoutingTeamProfile = {
  team: { abbreviation: string; fullName: string };
  overview: ScoutingTeamOverview;
  heroBans: ScoutingHeroBans;
  mapAnalysis: ScoutingMapAnalysis;
  matchHistory: ScoutingMatchHistoryEntry[];
  recommendations: ScoutingRecommendations;
};

const HALF_LIFE_DAYS = 90;
const DECAY_CONSTANT = Math.LN2 / HALF_LIFE_DAYS;

function calculateWeight(matchDate: Date): number {
  const daysAgo = (Date.now() - matchDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-DECAY_CONSTANT * daysAgo);
}

function weightedRate(items: { won: boolean; weight: number }[]): number {
  if (items.length === 0) return 0;
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return 0;
  const winWeight = items
    .filter((i) => i.won)
    .reduce((sum, i) => sum + i.weight, 0);
  return (winWeight / totalWeight) * 100;
}

type TeamAppearanceRow = {
  team: string;
  team_full_name: string;
  match_count: bigint;
  win_count: bigint;
};

async function getScoutingTeamsFn(): Promise<ScoutingTeam[]> {
  const rows = await prisma.$queryRaw<TeamAppearanceRow[]>`
    WITH appearances AS (
      SELECT team1 AS team, "team1FullName" AS team_full_name, id,
             CASE WHEN winner = team1 THEN 1 ELSE 0 END AS won
      FROM "ScoutingMatch"
      UNION ALL
      SELECT team2 AS team, "team2FullName" AS team_full_name, id,
             CASE WHEN winner = team2 THEN 1 ELSE 0 END AS won
      FROM "ScoutingMatch"
    )
    SELECT
      team,
      team_full_name,
      COUNT(*)::bigint AS match_count,
      SUM(won)::bigint AS win_count
    FROM appearances
    GROUP BY team, team_full_name
    ORDER BY match_count DESC
  `;

  return rows.map((row) => ({
    abbreviation: row.team,
    fullName: row.team_full_name,
    matchCount: Number(row.match_count),
    winCount: Number(row.win_count),
  }));
}

export const getScoutingTeams = cache(getScoutingTeamsFn);

const opponentMatchInclude = {
  maps: { include: { heroBans: true } },
  tournament: { select: { title: true } },
} satisfies Prisma.ScoutingMatchInclude;

export type OpponentMatchRow = Prisma.ScoutingMatchGetPayload<{
  include: typeof opponentMatchInclude;
}>;

async function getOpponentMatchDataFn(
  teamAbbr: string
): Promise<OpponentMatchRow[]> {
  return prisma.scoutingMatch.findMany({
    where: { OR: [{ team1: teamAbbr }, { team2: teamAbbr }] },
    include: opponentMatchInclude,
    orderBy: { matchDate: "asc" },
  });
}

export const getOpponentMatchData = cache(getOpponentMatchDataFn);

async function getScoutingTeamProfileFn(
  teamAbbr: string
): Promise<ScoutingTeamProfile | null> {
  const matchesAsc = await getOpponentMatchData(teamAbbr);

  if (matchesAsc.length === 0) return null;

  const matches = [...matchesAsc].reverse();

  const firstMatch = matches[0];
  const fullName =
    firstMatch.team1 === teamAbbr
      ? firstMatch.team1FullName
      : firstMatch.team2FullName;

  type ProcessedMatch = {
    isTeam1: boolean;
    won: boolean;
    weight: number;
    date: Date;
    opponent: string;
    opponentFullName: string;
    teamScore: number | null;
    opponentScore: number | null;
    tournament: string;
    maps: typeof firstMatch.maps;
  };

  const processed: ProcessedMatch[] = matches.map((m) => {
    const isTeam1 = m.team1 === teamAbbr;
    const won = m.winner === teamAbbr;
    return {
      isTeam1,
      won,
      weight: calculateWeight(m.matchDate),
      date: m.matchDate,
      opponent: isTeam1 ? m.team2 : m.team1,
      opponentFullName: isTeam1 ? m.team2FullName : m.team1FullName,
      teamScore: isTeam1 ? m.team1Score : m.team2Score,
      opponentScore: isTeam1 ? m.team2Score : m.team1Score,
      tournament: m.tournament.title,
      maps: m.maps,
    };
  });

  const wins = processed.filter((m) => m.won).length;
  const losses = processed.length - wins;
  const overview: ScoutingTeamOverview = {
    totalMatches: processed.length,
    wins,
    losses,
    winRate: processed.length > 0 ? (wins / processed.length) * 100 : 0,
    weightedWinRate: weightedRate(processed),
    recentForm: processed.slice(0, 10).map((m) => (m.won ? "win" : "loss")),
  };

  const bansByTeamMap = new Map<string, { raw: number; weighted: number }>();
  const bansAgainstMap = new Map<string, { raw: number; weighted: number }>();

  for (const match of processed) {
    const teamSide = match.isTeam1 ? "team1" : "team2";

    for (const map of match.maps) {
      for (const ban of map.heroBans) {
        const target = ban.team === teamSide ? bansByTeamMap : bansAgainstMap;
        const existing = target.get(ban.hero) ?? { raw: 0, weighted: 0 };
        existing.raw += 1;
        existing.weighted += match.weight;
        target.set(ban.hero, existing);
      }
    }
  }

  function toBanEntries(
    map: Map<string, { raw: number; weighted: number }>
  ): HeroBanEntry[] {
    return Array.from(map.entries())
      .map(([hero, data]) => ({
        hero,
        rawCount: data.raw,
        weightedCount: Math.round(data.weighted * 100) / 100,
      }))
      .sort((a, b) => b.weightedCount - a.weightedCount);
  }

  const heroBans: ScoutingHeroBans = {
    bansByTeam: toBanEntries(bansByTeamMap),
    bansAgainstTeam: toBanEntries(bansAgainstMap),
  };

  type MapAccum = { played: { won: boolean; weight: number }[] };
  const byMapName = new Map<string, MapAccum>();
  const byMapTypeMap = new Map<MapType, MapAccum>();

  for (const match of processed) {
    const teamSide = match.isTeam1 ? "team1" : "team2";
    for (const map of match.maps) {
      const mapWon = map.winner === teamSide;
      const entry = { won: mapWon, weight: match.weight };

      const nameAccum = byMapName.get(map.mapName) ?? { played: [] };
      nameAccum.played.push(entry);
      byMapName.set(map.mapName, nameAccum);

      const typeAccum = byMapTypeMap.get(map.mapType) ?? { played: [] };
      typeAccum.played.push(entry);
      byMapTypeMap.set(map.mapType, typeAccum);
    }
  }

  function toMapPerformance(
    accum: MapAccum
  ): Pick<
    MapPerformanceEntry,
    "played" | "won" | "winRate" | "weightedWinRate"
  > {
    const won = accum.played.filter((p) => p.won).length;
    return {
      played: accum.played.length,
      won,
      winRate: accum.played.length > 0 ? (won / accum.played.length) * 100 : 0,
      weightedWinRate: weightedRate(accum.played),
    };
  }

  const mapAnalysis: ScoutingMapAnalysis = {
    byMap: Array.from(byMapName.entries())
      .map(([name, accum]) => ({ name, ...toMapPerformance(accum) }))
      .sort((a, b) => b.played - a.played),
    byMapType: Array.from(byMapTypeMap.entries())
      .map(([mapType, accum]) => ({
        name: mapType,
        mapType,
        ...toMapPerformance(accum),
      }))
      .sort((a, b) => b.played - a.played),
  };

  const matchHistory: ScoutingMatchHistoryEntry[] = processed.map((m) => ({
    date: m.date,
    opponent: m.opponent,
    opponentFullName: m.opponentFullName,
    teamScore: m.teamScore,
    opponentScore: m.opponentScore,
    result: m.won ? "win" : "loss",
    tournament: m.tournament,
  }));

  const suggestedBans: ScoutingRecommendation[] = heroBans.bansAgainstTeam
    .slice(0, 5)
    .map((ban) => ({
      name: ban.hero,
      reason: `Banned against ${teamAbbr} ${ban.rawCount} times (opponents target this hero)`,
      weightedWinRate: ban.weightedCount,
      sampleSize: ban.rawCount,
    }));

  const MIN_MAP_SAMPLE = 3;
  const mapsWithEnoughData = mapAnalysis.byMap.filter(
    (m) => m.played >= MIN_MAP_SAMPLE
  );

  const suggestedMapPicks: ScoutingRecommendation[] = [...mapsWithEnoughData]
    .sort((a, b) => a.weightedWinRate - b.weightedWinRate)
    .slice(0, 3)
    .map((m) => ({
      name: m.name,
      reason: `${teamAbbr} has a ${m.weightedWinRate.toFixed(0)}% weighted WR across ${m.played} maps`,
      weightedWinRate: m.weightedWinRate,
      sampleSize: m.played,
    }));

  const suggestedMapAvoids: ScoutingRecommendation[] = [...mapsWithEnoughData]
    .sort((a, b) => b.weightedWinRate - a.weightedWinRate)
    .slice(0, 3)
    .map((m) => ({
      name: m.name,
      reason: `${teamAbbr} has a ${m.weightedWinRate.toFixed(0)}% weighted WR across ${m.played} maps`,
      weightedWinRate: m.weightedWinRate,
      sampleSize: m.played,
    }));

  return {
    team: { abbreviation: teamAbbr, fullName },
    overview,
    heroBans,
    mapAnalysis,
    matchHistory,
    recommendations: { suggestedBans, suggestedMapPicks, suggestedMapAvoids },
  };
}

export const getScoutingTeamProfile = cache(getScoutingTeamProfileFn);
