import "server-only";

import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
} from "@/data/team/shared-core";
import { determineRole } from "@/lib/player-table-data";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { getTeamData } from "@/lib/query-builder/compute/shared";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";

type HeroMapPoint = {
  mapDataId: number;
  date: Date;
  playtime: number;
  appeared: number;
  teamAppearance: number;
};

type HeroMapAggregate = {
  hero: HeroName;
  role: string;
  map: string;
  mapType: string;
  playtime: number;
  wins: number;
  games: number;
  appearances: number;
  points: Map<number, HeroMapPoint>;
};

function mapKey(map: string, mapType: string): string {
  return `${map}\0${mapType}`;
}

function aggregateKey(hero: HeroName, key: string): string {
  return `${hero}\0${key}`;
}

function percentTrend(early: number, late: number): number {
  if (early === 0) return late > 0 ? 100 : 0;
  return ((late - early) / early) * 100;
}

function splitTrend(points: HeroMapPoint[]): {
  playtimeTrend: number;
  pickRateTrend: number;
  trend: "increasing" | "declining" | "stable";
} {
  const sorted = [...points].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  if (sorted.length < 2) {
    return { playtimeTrend: 0, pickRateTrend: 0, trend: "stable" };
  }

  const midpoint = Math.floor(sorted.length / 2);
  const early = sorted.slice(0, midpoint);
  const late = sorted.slice(midpoint);

  const earlyPlaytime = early.reduce((sum, point) => sum + point.playtime, 0);
  const latePlaytime = late.reduce((sum, point) => sum + point.playtime, 0);
  const earlyAppearances = early.reduce(
    (sum, point) => sum + point.appeared,
    0
  );
  const lateAppearances = late.reduce((sum, point) => sum + point.appeared, 0);
  const earlyTeamAppearances = early.reduce(
    (sum, point) => sum + point.teamAppearance,
    0
  );
  const lateTeamAppearances = late.reduce(
    (sum, point) => sum + point.teamAppearance,
    0
  );

  const playtimeTrend = percentTrend(earlyPlaytime, latePlaytime);
  const earlyPickRate =
    earlyTeamAppearances > 0
      ? (earlyAppearances / earlyTeamAppearances) * 100
      : 0;
  const latePickRate =
    lateTeamAppearances > 0 ? (lateAppearances / lateTeamAppearances) * 100 : 0;
  const pickRateTrend = latePickRate - earlyPickRate;
  const trend =
    playtimeTrend > 10 || pickRateTrend > 5
      ? "increasing"
      : playtimeTrend < -10 || pickRateTrend < -5
        ? "declining"
        : "stable";

  return { playtimeTrend, pickRateTrend, trend };
}

/**
 * Queryable team-scoped hero trend rows inspired by the map hero-trends view:
 * one row per hero and map, with pick-rate, win-rate, playtime, and early vs
 * late scoped usage deltas.
 */
export async function computeHeroTrends(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  if (scrimIds.length === 0) return [];

  const data = await getTeamData(teamId);
  const inScope = new Set(scrimIds);

  const finalRoundMap = buildFinalRoundMap(data.finalRounds);
  const matchStartMap = buildMatchStartMap(data.matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    data.captures,
    matchStartMap
  );
  const {
    team1ProgressMap: team1PayloadProgressMap,
    team2ProgressMap: team2PayloadProgressMap,
  } = buildProgressMaps(data.payloadProgresses, matchStartMap);
  const {
    team1ProgressMap: team1PointProgressMap,
    team2ProgressMap: team2PointProgressMap,
  } = buildProgressMaps(data.pointProgresses, matchStartMap);

  const aggregates = new Map<string, HeroMapAggregate>();
  const mapAppearances = new Map<string, { mapDataId: number; date: Date }[]>();

  for (const record of data.mapDataRecords) {
    const scrimId = record.Scrim?.id;
    if (!scrimId || !inScope.has(scrimId)) continue;

    const mapDataId = record.id;
    const matchStart = matchStartMap.get(mapDataId) ?? null;
    if (!matchStart) continue;

    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      data.allPlayerStats,
      data.teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = data.allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );
    if (
      !playersOnMap.every((stat) => data.teamRosterSet.has(stat.player_name))
    ) {
      continue;
    }

    const winner = calculateWinner({
      matchDetails: matchStart,
      finalRound: finalRoundMap.get(mapDataId) ?? null,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
      team1PayloadProgress: team1PayloadProgressMap.get(mapDataId) ?? [],
      team2PayloadProgress: team2PayloadProgressMap.get(mapDataId) ?? [],
      team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
      team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
    });
    if (winner === "N/A") continue;

    const keyForMap = mapKey(matchStart.map_name, matchStart.map_type);
    const appearances = mapAppearances.get(keyForMap) ?? [];
    appearances.push({
      mapDataId,
      date: record.Scrim?.date ?? new Date(0),
    });
    mapAppearances.set(keyForMap, appearances);

    const heroPlaytime = new Map<HeroName, number>();
    for (const stat of playersOnMap) {
      if (stat.hero_time_played <= 0) continue;
      const hero = stat.player_hero as HeroName;
      const role = determineRole(hero);
      if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;
      heroPlaytime.set(
        hero,
        (heroPlaytime.get(hero) ?? 0) + stat.hero_time_played
      );
    }

    for (const [hero, playtime] of heroPlaytime.entries()) {
      const role = determineRole(hero);
      const key = aggregateKey(hero, keyForMap);
      const aggregate =
        aggregates.get(key) ??
        ({
          hero,
          role,
          map: matchStart.map_name,
          mapType: matchStart.map_type,
          playtime: 0,
          wins: 0,
          games: 0,
          appearances: 0,
          points: new Map<number, HeroMapPoint>(),
        } satisfies HeroMapAggregate);

      aggregate.playtime += playtime;
      aggregate.games++;
      aggregate.appearances++;
      if (winner === teamName) aggregate.wins++;
      aggregate.points.set(mapDataId, {
        mapDataId,
        date: record.Scrim?.date ?? new Date(0),
        playtime,
        appeared: 1,
        teamAppearance: 1,
      });
      aggregates.set(key, aggregate);
    }
  }

  return Array.from(aggregates.values()).map((aggregate) => {
    const keyForMap = mapKey(aggregate.map, aggregate.mapType);
    const allMapAppearances = mapAppearances.get(keyForMap) ?? [];
    const teamAppearances = allMapAppearances.length;
    const trendPoints = allMapAppearances.map((appearance) => {
      const point = aggregate.points.get(appearance.mapDataId);
      return (
        point ?? {
          mapDataId: appearance.mapDataId,
          date: appearance.date,
          playtime: 0,
          appeared: 0,
          teamAppearance: 1,
        }
      );
    });
    const trend = splitTrend(trendPoints);
    return {
      hero: aggregate.hero,
      role: aggregate.role,
      map: aggregate.map,
      map_type: aggregate.mapType,
      trend: trend.trend,
      time_played: aggregate.playtime,
      appearances: aggregate.appearances,
      team_appearances: teamAppearances,
      wins: aggregate.wins,
      games: aggregate.games,
      maps_played: aggregate.games,
      pick_rate:
        teamAppearances > 0 ? aggregate.appearances / teamAppearances : 0,
      win_rate: aggregate.games > 0 ? aggregate.wins / aggregate.games : 0,
      playtime_trend: trend.playtimeTrend,
      pick_rate_trend: trend.pickRateTrend,
    };
  });
}
