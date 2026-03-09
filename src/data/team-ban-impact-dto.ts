import "server-only";

import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import { cache } from "react";
import type { TeamDateRange } from "./team-shared-core";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "./team-shared-core";
import { getBaseTeamData } from "./team-shared-data";

export type HeroBanImpact = {
  hero: string;
  totalBans: number;
  banRate: number;
  winRateWithHero: number;
  winRateWithoutHero: number;
  winRateDelta: number;
  mapsPlayed: number;
  mapsBanned: number;
};

export type TeamBanImpactAnalysis = {
  banImpacts: HeroBanImpact[];
  mostBanned: HeroBanImpact[];
  weakPoints: HeroBanImpact[];
  totalMapsAnalyzed: number;
};

const MIN_BANS_FOR_SIGNIFICANCE = 3;
const WEAK_POINT_DELTA_THRESHOLD = 0.15;

async function getTeamBanImpactAnalysisUncached(
  teamId: number,
  dateRange?: TeamDateRange
): Promise<TeamBanImpactAnalysis> {
  const sharedData = await getBaseTeamData(teamId, { dateRange });

  const {
    teamRosterSet,
    mapDataRecords,
    mapDataIds,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
  } = sharedData;

  if (mapDataRecords.length === 0) {
    return createEmptyAnalysis();
  }

  const heroBans = await prisma.heroBan.findMany({
    where: { MapDataId: { in: mapDataIds } },
    select: { MapDataId: true, team: true, hero: true },
  });

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );
  const {
    team1ProgressMap: team1PayloadProgressMap,
    team2ProgressMap: team2PayloadProgressMap,
  } = buildProgressMaps(payloadProgresses, matchStartMap);
  const {
    team1ProgressMap: team1PointProgressMap,
    team2ProgressMap: team2PointProgressMap,
  } = buildProgressMaps(pointProgresses, matchStartMap);

  type MapOutcome = {
    mapDataId: number;
    teamName: string;
    isWin: boolean;
    bannedHeroes: Set<string>;
  };

  const mapOutcomes: MapOutcome[] = [];

  // Index bans by mapDataId
  const bansByMapId = new Map<number, { team: string; hero: string }[]>();
  for (const ban of heroBans) {
    if (!ban.MapDataId) continue;
    if (!bansByMapId.has(ban.MapDataId)) {
      bansByMapId.set(ban.MapDataId, []);
    }
    bansByMapId.get(ban.MapDataId)!.push({ team: ban.team, hero: ban.hero });
  }

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;

    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );

    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    const matchDetails = matchStartMap.get(mapDataId) ?? null;
    const finalRound = finalRoundMap.get(mapDataId) ?? null;
    const winner = calculateWinner({
      matchDetails,
      finalRound,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
      team1PayloadProgress: team1PayloadProgressMap.get(mapDataId) ?? [],
      team2PayloadProgress: team2PayloadProgressMap.get(mapDataId) ?? [],
      team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
      team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
    });

    const isWin = winner === teamName;
    const mapBans = bansByMapId.get(mapDataId) ?? [];

    // Collect heroes banned AGAINST the team (i.e. bans by the opponent)
    const bannedHeroes = new Set<string>();
    for (const ban of mapBans) {
      if (ban.team !== teamName) {
        bannedHeroes.add(ban.hero);
      }
    }

    mapOutcomes.push({ mapDataId, teamName, isWin, bannedHeroes });
  }

  if (mapOutcomes.length === 0) {
    return createEmptyAnalysis();
  }

  const totalMaps = mapOutcomes.length;
  const overallWins = mapOutcomes.filter((o) => o.isWin).length;
  const overallWinRate = totalMaps > 0 ? overallWins / totalMaps : 0;

  // Collect all heroes that appear in bans at all
  const allBannedHeroes = new Set<string>();
  for (const outcome of mapOutcomes) {
    for (const hero of outcome.bannedHeroes) {
      allBannedHeroes.add(hero);
    }
  }

  const banImpacts: HeroBanImpact[] = [];

  for (const hero of allBannedHeroes) {
    const mapsWithBan = mapOutcomes.filter((o) => o.bannedHeroes.has(hero));
    const mapsWithoutBan = mapOutcomes.filter((o) => !o.bannedHeroes.has(hero));

    const mapsBanned = mapsWithBan.length;
    if (mapsBanned < MIN_BANS_FOR_SIGNIFICANCE) continue;

    const winsWhenBanned = mapsWithBan.filter((o) => o.isWin).length;
    const winsWhenAvailable = mapsWithoutBan.filter((o) => o.isWin).length;

    const winRateWithoutHero = mapsBanned > 0 ? winsWhenBanned / mapsBanned : 0;
    const winRateWithHero =
      mapsWithoutBan.length > 0
        ? winsWhenAvailable / mapsWithoutBan.length
        : overallWinRate;

    const winRateDelta = winRateWithHero - winRateWithoutHero;

    banImpacts.push({
      hero,
      totalBans: mapsBanned,
      banRate: mapsBanned / totalMaps,
      winRateWithHero,
      winRateWithoutHero,
      winRateDelta,
      mapsPlayed: totalMaps,
      mapsBanned,
    });
  }

  banImpacts.sort((a, b) => b.banRate - a.banRate);

  const mostBanned = banImpacts.slice(0, 10);

  const weakPoints = banImpacts
    .filter(
      (impact) =>
        impact.winRateDelta >= WEAK_POINT_DELTA_THRESHOLD &&
        impact.mapsBanned >= MIN_BANS_FOR_SIGNIFICANCE
    )
    .sort((a, b) => b.winRateDelta - a.winRateDelta);

  return {
    banImpacts,
    mostBanned,
    weakPoints,
    totalMapsAnalyzed: totalMaps,
  };
}

function createEmptyAnalysis(): TeamBanImpactAnalysis {
  return {
    banImpacts: [],
    mostBanned: [],
    weakPoints: [],
    totalMapsAnalyzed: 0,
  };
}

export const getTeamBanImpactAnalysis = cache(getTeamBanImpactAnalysisUncached);
