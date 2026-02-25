import "server-only";

import { assessConfidence, type ConfidenceMetadata } from "@/lib/confidence";
import type { DataAvailabilityProfile } from "@/lib/data-availability";
import prisma from "@/lib/prisma";
import type { MapType } from "@prisma/client";
import { cache } from "react";
import { getBaseTeamData } from "./team-shared-data";

export type HeroWinRateDelta = {
  hero: string;
  winRateWhenAvailable: number;
  winRateWhenBanned: number;
  delta: number;
  mapsAvailable: number;
  mapsBanned: number;
  confidenceAvailable: ConfidenceMetadata;
  confidenceBanned: ConfidenceMetadata;
};

export type ComfortCrutch = {
  hero: string;
  banFrequency: number;
  totalMaps: number;
  banRate: number;
  winRateDelta: number;
  crutchScore: number;
  confidence: ConfidenceMetadata;
};

export type ProtectedHero = {
  hero: string;
  timesBannedByTeam: number;
  totalMaps: number;
  banRate: number;
};

export type BanRateByMapType = {
  hero: string;
  mapType: MapType;
  banCount: number;
  totalMapsOfType: number;
  banRate: number;
};

export type HeroExposure = {
  hero: string;
  userPlayRate: number;
  userTimePlayed: number;
  opponentBanRate: number;
  opponentBanCount: number;
  exposureRisk: "high" | "medium" | "low";
};

export type BanDisruptionEntry = {
  hero: string;
  winRateDelta: number;
  mapsAvailable: number;
  mapsBanned: number;
  disruptionScore: number;
  confidence: ConfidenceMetadata;
};

export type HeroBanIntelligence = {
  winRateDeltas: HeroWinRateDelta[];
  comfortCrutches: ComfortCrutch[];
  protectedHeroes: ProtectedHero[];
  banRateByMapType: BanRateByMapType[];
  heroExposure: HeroExposure[];
  banDisruptionRanking: BanDisruptionEntry[];
};

type MapWithBans = {
  mapName: string;
  mapType: MapType;
  matchDate: Date;
  teamSide: "team1" | "team2";
  won: boolean;
  heroBans: { team: string; hero: string }[];
};

async function getOpponentMapBanData(
  teamAbbr: string
): Promise<MapWithBans[]> {
  const matches = await prisma.scoutingMatch.findMany({
    where: { OR: [{ team1: teamAbbr }, { team2: teamAbbr }] },
    include: { maps: { include: { heroBans: true } } },
    orderBy: { matchDate: "asc" },
  });

  const results: MapWithBans[] = [];
  for (const match of matches) {
    const teamSide =
      match.team1 === teamAbbr ? ("team1" as const) : ("team2" as const);
    for (const map of match.maps) {
      results.push({
        mapName: map.mapName,
        mapType: map.mapType,
        matchDate: match.matchDate,
        teamSide,
        won: map.winner === teamSide,
        heroBans: map.heroBans.map((b) => ({ team: b.team, hero: b.hero })),
      });
    }
  }
  return results;
}

function computeWinRateDeltas(
  maps: MapWithBans[]
): HeroWinRateDelta[] {
  const allBannedHeroes = new Set<string>();
  for (const map of maps) {
    for (const ban of map.heroBans) {
      allBannedHeroes.add(ban.hero);
    }
  }

  return Array.from(allBannedHeroes)
    .map((hero) => {
      let availableWins = 0;
      let availableTotal = 0;
      let bannedWins = 0;
      let bannedTotal = 0;

      for (const map of maps) {
        const isBanned = map.heroBans.some((b) => b.hero === hero);
        if (isBanned) {
          bannedTotal++;
          if (map.won) bannedWins++;
        } else {
          availableTotal++;
          if (map.won) availableWins++;
        }
      }

      const winRateWhenAvailable =
        availableTotal > 0 ? (availableWins / availableTotal) * 100 : 0;
      const winRateWhenBanned =
        bannedTotal > 0 ? (bannedWins / bannedTotal) * 100 : 0;

      return {
        hero,
        winRateWhenAvailable,
        winRateWhenBanned,
        delta: winRateWhenAvailable - winRateWhenBanned,
        mapsAvailable: availableTotal,
        mapsBanned: bannedTotal,
        confidenceAvailable: assessConfidence(availableTotal),
        confidenceBanned: assessConfidence(bannedTotal),
      };
    })
    .sort((a, b) => b.delta - a.delta);
}

function computeComfortCrutches(
  maps: MapWithBans[],
  winRateDeltas: HeroWinRateDelta[]
): ComfortCrutch[] {
  const totalMaps = maps.length;

  const banCounts = new Map<string, number>();
  for (const map of maps) {
    for (const ban of map.heroBans) {
      banCounts.set(ban.hero, (banCounts.get(ban.hero) ?? 0) + 1);
    }
  }

  const deltaMap = new Map(winRateDeltas.map((d) => [d.hero, d]));

  return Array.from(banCounts.entries())
    .map(([hero, banFrequency]) => {
      const banRate = totalMaps > 0 ? (banFrequency / totalMaps) * 100 : 0;
      const wrDelta = deltaMap.get(hero);
      const winRateDelta = wrDelta?.delta ?? 0;

      // Crutch score = ban rate * WR delta (higher = more exploitable)
      // Normalized: ban rate as fraction * delta as fraction
      const crutchScore = (banRate / 100) * Math.max(0, winRateDelta);

      return {
        hero,
        banFrequency,
        totalMaps,
        banRate,
        winRateDelta,
        crutchScore,
        confidence: assessConfidence(banFrequency),
      };
    })
    .filter((c) => c.winRateDelta > 0)
    .sort((a, b) => b.crutchScore - a.crutchScore);
}

function computeProtectedHeroes(maps: MapWithBans[]): ProtectedHero[] {
  const totalMaps = maps.length;
  const bansByTeam = new Map<string, number>();

  for (const map of maps) {
    for (const ban of map.heroBans) {
      if (ban.team === map.teamSide) {
        bansByTeam.set(ban.hero, (bansByTeam.get(ban.hero) ?? 0) + 1);
      }
    }
  }

  return Array.from(bansByTeam.entries())
    .map(([hero, timesBannedByTeam]) => ({
      hero,
      timesBannedByTeam,
      totalMaps,
      banRate:
        totalMaps > 0 ? (timesBannedByTeam / totalMaps) * 100 : 0,
    }))
    .sort((a, b) => a.banRate - b.banRate)
    .filter((h) => h.banRate < 5);
}

function computeBanRateByMapType(maps: MapWithBans[]): BanRateByMapType[] {
  const mapTypeCount = new Map<MapType, number>();
  const heroBansByType = new Map<string, Map<MapType, number>>();

  for (const map of maps) {
    mapTypeCount.set(map.mapType, (mapTypeCount.get(map.mapType) ?? 0) + 1);

    for (const ban of map.heroBans) {
      let heroTypes = heroBansByType.get(ban.hero);
      if (!heroTypes) {
        heroTypes = new Map();
        heroBansByType.set(ban.hero, heroTypes);
      }
      heroTypes.set(map.mapType, (heroTypes.get(map.mapType) ?? 0) + 1);
    }
  }

  const results: BanRateByMapType[] = [];
  for (const [hero, typeMap] of heroBansByType) {
    for (const [mapType, banCount] of typeMap) {
      const totalMapsOfType = mapTypeCount.get(mapType) ?? 0;
      results.push({
        hero,
        mapType,
        banCount,
        totalMapsOfType,
        banRate:
          totalMapsOfType > 0 ? (banCount / totalMapsOfType) * 100 : 0,
      });
    }
  }

  return results.sort((a, b) => b.banRate - a.banRate);
}

async function computeHeroExposure(
  maps: MapWithBans[],
  userTeamId: number
): Promise<HeroExposure[]> {
  const baseData = await getBaseTeamData(userTeamId);
  const { allPlayerStats, teamRosterSet } = baseData;

  const heroTimePlayed = new Map<string, number>();
  let totalTimePlayed = 0;

  for (const stat of allPlayerStats) {
    if (!teamRosterSet.has(stat.player_name)) continue;
    const current = heroTimePlayed.get(stat.player_hero) ?? 0;
    heroTimePlayed.set(stat.player_hero, current + stat.hero_time_played);
    totalTimePlayed += stat.hero_time_played;
  }

  const totalOpponentMaps = maps.length;
  const opponentBanCounts = new Map<string, number>();
  for (const map of maps) {
    const opponentSide = map.teamSide === "team1" ? "team2" : "team1";
    for (const ban of map.heroBans) {
      if (ban.team === opponentSide) {
        opponentBanCounts.set(
          ban.hero,
          (opponentBanCounts.get(ban.hero) ?? 0) + 1
        );
      }
    }
  }

  const exposures: HeroExposure[] = [];
  for (const [hero, timePlayed] of heroTimePlayed) {
    const playRate =
      totalTimePlayed > 0 ? (timePlayed / totalTimePlayed) * 100 : 0;
    if (playRate < 1) continue;

    const opponentBanCount = opponentBanCounts.get(hero) ?? 0;
    const opponentBanRate =
      totalOpponentMaps > 0
        ? (opponentBanCount / totalOpponentMaps) * 100
        : 0;

    const HIGH_BAN_THRESHOLD = 30;
    const MEDIUM_BAN_THRESHOLD = 15;
    const exposureRisk: HeroExposure["exposureRisk"] =
      opponentBanRate >= HIGH_BAN_THRESHOLD && playRate >= 10
        ? "high"
        : opponentBanRate >= MEDIUM_BAN_THRESHOLD && playRate >= 5
          ? "medium"
          : "low";

    exposures.push({
      hero,
      userPlayRate: playRate,
      userTimePlayed: timePlayed,
      opponentBanRate,
      opponentBanCount,
      exposureRisk,
    });
  }

  return exposures
    .filter((e) => e.opponentBanCount > 0)
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      if (riskOrder[a.exposureRisk] !== riskOrder[b.exposureRisk]) {
        return riskOrder[a.exposureRisk] - riskOrder[b.exposureRisk];
      }
      return b.userPlayRate - a.userPlayRate;
    });
}

function computeBanDisruptionRanking(
  winRateDeltas: HeroWinRateDelta[]
): BanDisruptionEntry[] {
  return winRateDeltas
    .filter((d) => d.mapsBanned >= 2)
    .map((d) => {
      // Disruption score weights the WR delta by the confidence of the ban sample.
      // A large delta from 2 maps is less reliable than a moderate delta from 10.
      const sampleWeight = Math.min(d.mapsBanned / 10, 1);
      const disruptionScore = d.delta * sampleWeight;

      return {
        hero: d.hero,
        winRateDelta: d.delta,
        mapsAvailable: d.mapsAvailable,
        mapsBanned: d.mapsBanned,
        disruptionScore,
        confidence: assessConfidence(d.mapsBanned),
      };
    })
    .sort((a, b) => b.disruptionScore - a.disruptionScore);
}

async function getHeroBanIntelligenceFn(
  opponentAbbr: string,
  userTeamId: number | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _profile?: DataAvailabilityProfile
): Promise<HeroBanIntelligence> {
  const maps = await getOpponentMapBanData(opponentAbbr);

  // Phase 3.5: When _profile indicates scrim data is available, merge
  // scrim-derived hero ban data from scrim-opponent-dto.ts here before
  // computing analytics. The OWCS-only path below is unchanged.

  const winRateDeltas = computeWinRateDeltas(maps);
  const comfortCrutches = computeComfortCrutches(maps, winRateDeltas);
  const protectedHeroes = computeProtectedHeroes(maps);
  const banRateByMapType = computeBanRateByMapType(maps);
  const banDisruptionRanking = computeBanDisruptionRanking(winRateDeltas);

  let heroExposure: HeroExposure[] = [];
  if (userTeamId !== null) {
    heroExposure = await computeHeroExposure(maps, userTeamId);
  }

  return {
    winRateDeltas,
    comfortCrutches,
    protectedHeroes,
    banRateByMapType,
    heroExposure,
    banDisruptionRanking,
  };
}

export const getHeroBanIntelligence = cache(getHeroBanIntelligenceFn);
