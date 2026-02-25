import "server-only";

import { assessConfidence, type ConfidenceMetadata } from "@/lib/confidence";
import {
  hasScrimData,
  SCRIM_CONFIDENCE_THRESHOLDS,
  type DataAvailabilityProfile,
} from "@/lib/data-availability";
import {
  getTeamStrengthRatings,
  type TeamStrengthRating,
} from "./opponent-strength-dto";
import { getOpponentMatchData } from "./scouting-dto";
import { getOpponentScrimMapResults } from "./scrim-opponent-dto";
import { getTeamWinrates } from "./team-stats-dto";
import type { MapType } from "@prisma/client";
import { cache } from "react";

const INITIAL_RATING = 1500;
const HALF_LIFE_DAYS = 90;
const DECAY_CONSTANT = Math.LN2 / HALF_LIFE_DAYS;
const RECENT_MAP_WINDOW = 10;

function calculateWeight(matchDate: Date): number {
  const daysAgo = (Date.now() - matchDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-DECAY_CONSTANT * daysAgo);
}

export type StrengthWeightedMapWR = {
  mapName: string;
  mapType: MapType;
  rawWinRate: number;
  strengthWeightedWinRate: number;
  played: number;
  won: number;
  confidence: ConfidenceMetadata;
  strengthRatingAvailable: boolean;
  sources?: { owcsMaps: number; scrimMaps: number };
};

export type MapPerformanceTrend = {
  mapName: string;
  overallWinRate: number;
  recentWinRate: number;
  overallPlayed: number;
  recentPlayed: number;
  delta: number;
  trend: "improving" | "declining" | "stable";
};

export type MapTypeDependency = {
  mapType: MapType;
  played: number;
  won: number;
  winRate: number;
  strengthWeightedWinRate: number;
  confidence: ConfidenceMetadata;
};

export type MapMatchupEntry = {
  mapName: string;
  mapType: MapType;
  userWinRate: number | null;
  userPlayed: number;
  opponentWinRate: number;
  opponentStrengthWeightedWR: number;
  opponentPlayed: number;
  netAdvantage: number | null;
  userConfidence: ConfidenceMetadata;
  opponentConfidence: ConfidenceMetadata;
};

export type MapIntelligence = {
  strengthWeightedWRs: StrengthWeightedMapWR[];
  trends: MapPerformanceTrend[];
  mapTypeDependencies: MapTypeDependency[];
  matchupMatrix: MapMatchupEntry[];
};

type MapResultRow = {
  mapName: string;
  mapType: MapType;
  matchDate: Date;
  team1: string;
  team2: string;
  teamSide: "team1" | "team2";
  winner: string;
};

async function getOpponentMapResults(
  teamAbbr: string
): Promise<MapResultRow[]> {
  const matches = await getOpponentMatchData(teamAbbr);

  const rows: MapResultRow[] = [];
  for (const match of matches) {
    const teamSide =
      match.team1 === teamAbbr ? ("team1" as const) : ("team2" as const);
    for (const map of match.maps) {
      rows.push({
        mapName: map.mapName,
        mapType: map.mapType,
        matchDate: match.matchDate,
        team1: match.team1,
        team2: match.team2,
        teamSide,
        winner: map.winner,
      });
    }
  }
  return rows;
}

type MapResultRowWithSource = MapResultRow & { source: "owcs" | "scrim" };

function computeStrengthWeightedWRs(
  rows: MapResultRowWithSource[],
  teamAbbr: string,
  ratingsMap: Map<string, TeamStrengthRating>,
  includesScrimData: boolean
): StrengthWeightedMapWR[] {
  const strengthRatingAvailable = ratingsMap.size > 0;

  const byMap = new Map<
    string,
    {
      mapType: MapType;
      results: { won: boolean; opponentRating: number; weight: number }[];
      owcsMaps: number;
      scrimMaps: number;
    }
  >();

  for (const row of rows) {
    const won = row.winner === row.teamSide;
    const opponentAbbr = row.teamSide === "team1" ? row.team2 : row.team1;
    const opponentRating =
      ratingsMap.get(opponentAbbr)?.rating ?? INITIAL_RATING;
    const weight = calculateWeight(row.matchDate);

    let entry = byMap.get(row.mapName);
    if (!entry) {
      entry = { mapType: row.mapType, results: [], owcsMaps: 0, scrimMaps: 0 };
      byMap.set(row.mapName, entry);
    }
    entry.results.push({ won, opponentRating, weight });
    if (row.source === "scrim") {
      entry.scrimMaps++;
    } else {
      entry.owcsMaps++;
    }
  }

  const confidenceThresholds = includesScrimData
    ? SCRIM_CONFIDENCE_THRESHOLDS
    : undefined;

  return Array.from(byMap.entries())
    .map(([mapName, { mapType, results, owcsMaps, scrimMaps }]) => {
      const played = results.length;
      const won = results.filter((r) => r.won).length;
      const rawWinRate = played > 0 ? (won / played) * 100 : 0;

      let weightedWinSum = 0;
      let weightedTotalSum = 0;
      for (const r of results) {
        const ratingWeight = strengthRatingAvailable
          ? r.opponentRating / INITIAL_RATING
          : 1;
        const combinedWeight = ratingWeight * r.weight;
        weightedWinSum += r.won ? combinedWeight : 0;
        weightedTotalSum += combinedWeight;
      }
      const strengthWeightedWinRate =
        weightedTotalSum > 0
          ? (weightedWinSum / weightedTotalSum) * 100
          : rawWinRate;

      return {
        mapName,
        mapType,
        rawWinRate,
        strengthWeightedWinRate: strengthRatingAvailable
          ? strengthWeightedWinRate
          : rawWinRate,
        played,
        won,
        confidence: assessConfidence(played, confidenceThresholds),
        strengthRatingAvailable,
        sources: includesScrimData ? { owcsMaps, scrimMaps } : undefined,
      };
    })
    .sort((a, b) => b.strengthWeightedWinRate - a.strengthWeightedWinRate);
}

function computeTrends(rows: MapResultRowWithSource[]): MapPerformanceTrend[] {
  const byMap = new Map<string, { won: boolean; date: Date }[]>();

  for (const row of rows) {
    const won = row.winner === row.teamSide;
    let results = byMap.get(row.mapName);
    if (!results) {
      results = [];
      byMap.set(row.mapName, results);
    }
    results.push({ won, date: row.matchDate });
  }

  return Array.from(byMap.entries())
    .map(([mapName, results]) => {
      results.sort((a, b) => b.date.getTime() - a.date.getTime());

      const overallPlayed = results.length;
      const overallWon = results.filter((r) => r.won).length;
      const overallWinRate =
        overallPlayed > 0 ? (overallWon / overallPlayed) * 100 : 0;

      const recent = results.slice(0, RECENT_MAP_WINDOW);
      const recentPlayed = recent.length;
      const recentWon = recent.filter((r) => r.won).length;
      const recentWinRate =
        recentPlayed > 0 ? (recentWon / recentPlayed) * 100 : 0;

      const delta = recentWinRate - overallWinRate;
      const TREND_THRESHOLD = 10;
      const trend: MapPerformanceTrend["trend"] =
        delta > TREND_THRESHOLD
          ? "improving"
          : delta < -TREND_THRESHOLD
            ? "declining"
            : "stable";

      return {
        mapName,
        overallWinRate,
        recentWinRate,
        overallPlayed,
        recentPlayed,
        delta,
        trend,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function computeMapTypeDependencies(
  rows: MapResultRowWithSource[],
  ratingsMap: Map<string, TeamStrengthRating>,
  includesScrimData: boolean
): MapTypeDependency[] {
  const byType = new Map<
    MapType,
    { results: { won: boolean; opponentRating: number; weight: number }[] }
  >();

  for (const row of rows) {
    const won = row.winner === row.teamSide;
    const opponentAbbr = row.teamSide === "team1" ? row.team2 : row.team1;
    const opponentRating =
      ratingsMap.get(opponentAbbr)?.rating ?? INITIAL_RATING;
    const weight = calculateWeight(row.matchDate);

    let entry = byType.get(row.mapType);
    if (!entry) {
      entry = { results: [] };
      byType.set(row.mapType, entry);
    }
    entry.results.push({ won, opponentRating, weight });
  }

  const strengthRatingAvailable = ratingsMap.size > 0;
  const confidenceThresholds = includesScrimData
    ? SCRIM_CONFIDENCE_THRESHOLDS
    : undefined;

  return Array.from(byType.entries())
    .map(([mapType, { results }]) => {
      const played = results.length;
      const won = results.filter((r) => r.won).length;
      const winRate = played > 0 ? (won / played) * 100 : 0;

      let weightedWinSum = 0;
      let weightedTotalSum = 0;
      for (const r of results) {
        const ratingWeight = strengthRatingAvailable
          ? r.opponentRating / INITIAL_RATING
          : 1;
        const combinedWeight = ratingWeight * r.weight;
        weightedWinSum += r.won ? combinedWeight : 0;
        weightedTotalSum += combinedWeight;
      }
      const strengthWeightedWinRate =
        weightedTotalSum > 0
          ? (weightedWinSum / weightedTotalSum) * 100
          : winRate;

      return {
        mapType,
        played,
        won,
        winRate,
        strengthWeightedWinRate: strengthRatingAvailable
          ? strengthWeightedWinRate
          : winRate,
        confidence: assessConfidence(played, confidenceThresholds),
      };
    })
    .sort((a, b) => b.winRate - a.winRate);
}

function buildMatchupMatrix(
  opponentWRs: StrengthWeightedMapWR[],
  userMapWinrates: Record<
    string,
    { totalWinrate: number; totalWins: number; totalLosses: number }
  >
): MapMatchupEntry[] {
  return opponentWRs
    .map((opp) => {
      const userMap = userMapWinrates[opp.mapName];
      const userPlayed = userMap ? userMap.totalWins + userMap.totalLosses : 0;
      const userWinRate = userMap ? userMap.totalWinrate : null;

      const netAdvantage =
        userWinRate !== null ? userWinRate - opp.strengthWeightedWinRate : null;

      return {
        mapName: opp.mapName,
        mapType: opp.mapType,
        userWinRate,
        userPlayed,
        opponentWinRate: opp.rawWinRate,
        opponentStrengthWeightedWR: opp.strengthWeightedWinRate,
        opponentPlayed: opp.played,
        netAdvantage,
        userConfidence: assessConfidence(userPlayed),
        opponentConfidence: opp.confidence,
      };
    })
    .sort((a, b) => {
      if (a.netAdvantage === null && b.netAdvantage === null) return 0;
      if (a.netAdvantage === null) return 1;
      if (b.netAdvantage === null) return -1;
      return b.netAdvantage - a.netAdvantage;
    });
}

async function getMapIntelligenceFn(
  opponentAbbr: string,
  userTeamId: number | null,
  profile?: DataAvailabilityProfile
): Promise<MapIntelligence> {
  const [owcsRows, allRatings] = await Promise.all([
    getOpponentMapResults(opponentAbbr),
    getTeamStrengthRatings(),
  ]);

  const owcsRowsWithSource: MapResultRowWithSource[] = owcsRows.map((r) => ({
    ...r,
    source: "owcs" as const,
  }));

  let rows: MapResultRowWithSource[] = owcsRowsWithSource;
  const includesScrimData = !!profile && !!userTeamId && hasScrimData(profile);

  if (includesScrimData && userTeamId !== null) {
    const scrimResults = await getOpponentScrimMapResults(
      userTeamId,
      opponentAbbr
    );
    const scrimRows: MapResultRowWithSource[] = scrimResults.map((r) => ({
      mapName: r.mapName,
      mapType: r.mapType,
      matchDate: r.scrimDate,
      team1: "user",
      team2: opponentAbbr,
      teamSide: "team1" as const,
      winner: r.opponentWon ? "team2" : "team1",
      source: "scrim" as const,
    }));
    rows = [...owcsRowsWithSource, ...scrimRows];
  }

  const ratingsMap = new Map(allRatings.map((r) => [r.teamAbbr, r]));

  const strengthWeightedWRs = computeStrengthWeightedWRs(
    rows,
    opponentAbbr,
    ratingsMap,
    includesScrimData
  );
  const trends = computeTrends(rows);
  const mapTypeDependencies = computeMapTypeDependencies(
    rows,
    ratingsMap,
    includesScrimData
  );

  let matchupMatrix: MapMatchupEntry[] = [];
  if (userTeamId !== null) {
    const userWinrates = await getTeamWinrates(userTeamId);
    matchupMatrix = buildMatchupMatrix(strengthWeightedWRs, userWinrates.byMap);
  }

  return {
    strengthWeightedWRs,
    trends,
    mapTypeDependencies,
    matchupMatrix,
  };
}

export const getMapIntelligence = cache(getMapIntelligenceFn);
