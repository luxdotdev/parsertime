import "server-only";

import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { getMapNames, toKebabCase } from "@/lib/utils";
import { calculateWinner } from "@/lib/winrate";
import {
  getHeroRole,
  getHeroSubrole,
  type HeroName,
  type RoleName,
  type SubroleName,
} from "@/types/heroes";
import { mapNameToMapTypeMapping, type MapName } from "@/types/map";
import type {
  MatchStart,
  ObjectiveCaptured,
  PayloadProgress,
  PlayerStat,
  PointProgress,
  RoundEnd,
} from "@prisma/client";
import { Prisma, type $Enums } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";

import { MapQueryError } from "./errors";
import {
  mapCacheMissTotal,
  mapCacheRequestTotal,
  mapHeroTrendsQueryDuration,
  mapHeroTrendsQueryErrorTotal,
  mapHeroTrendsQuerySuccessTotal,
} from "./metrics";

export type MapHeroTrendPoint = {
  date: string;
  pickRate: number;
  playtime: number;
};

export type MapHeroTrend = {
  hero: HeroName;
  role: RoleName;
  subrole: SubroleName | null;
  totalPlaytime: number;
  pickRate: number;
  wins: number;
  losses: number;
  winrate: number;
  mapsPlayed: number;
  samples: number;
  playtimeTrend: number;
  trend: MapHeroTrendPoint[];
};

export type MapHeroTrendGroup = {
  mapName: string;
  mapType: $Enums.MapType | null;
  scrimsAnalyzed: number;
  mapsAnalyzed: number;
  teamAppearances: number;
  heroes: MapHeroTrend[];
};

export type MapHeroTrendsResult = {
  allMaps: MapHeroTrendGroup;
  perMap: MapHeroTrendGroup[];
};

type FinalPlayerStat = PlayerStat & {
  scrimDate: Date;
};

type MapDataRecord = {
  id: number;
  mapName: string;
  scrimDate: Date;
};

type HeroAccumulator = {
  hero: HeroName;
  playtime: number;
  wins: number;
  losses: number;
  mapsPlayed: Set<number>;
  teamAppearances: number;
  buckets: Map<string, { playtime: number; appearances: number }>;
};

type MapGroup = {
  canonicalName: string;
  mapType: $Enums.MapType | null;
  mapIds: Set<number>;
  scrimIds: Set<number>;
  teamAppearances: number;
  heroes: Map<HeroName, HeroAccumulator>;
  bucketTeamAppearances: Map<string, number>;
};

const RECENT_DAYS = 60;
const PARENTHETICAL_SUFFIX = /\s*\([^)]*\)\s*$/;

function canonicalizeMapName(name: string): string {
  return name.replace(PARENTHETICAL_SUFFIX, "").trim();
}

function resolveMapType(canonicalName: string): $Enums.MapType | null {
  return canonicalName in mapNameToMapTypeMapping
    ? mapNameToMapTypeMapping[canonicalName as MapName]
    : null;
}

function keyByMapDataId<T extends { MapDataId: number | null }>(
  rows: T[]
): Map<number, T[]> {
  const byMap = new Map<number, T[]>();
  for (const row of rows) {
    if (!row.MapDataId) continue;
    const existing = byMap.get(row.MapDataId) ?? [];
    existing.push(row);
    byMap.set(row.MapDataId, existing);
  }
  return byMap;
}

function latestRoundByMap(rows: RoundEnd[]): Map<number, RoundEnd> {
  const byMap = new Map<number, RoundEnd>();
  for (const row of rows) {
    if (!row.MapDataId) continue;
    const current = byMap.get(row.MapDataId);
    if (
      !current ||
      row.round_number > current.round_number ||
      (row.round_number === current.round_number &&
        row.match_time > current.match_time)
    ) {
      byMap.set(row.MapDataId, row);
    }
  }
  return byMap;
}

function firstMatchStartByMap(rows: MatchStart[]): Map<number, MatchStart> {
  const byMap = new Map<number, MatchStart>();
  for (const row of rows) {
    if (!row.MapDataId) continue;
    const current = byMap.get(row.MapDataId);
    if (!current || row.match_time < current.match_time) {
      byMap.set(row.MapDataId, row);
    }
  }
  return byMap;
}

function bucketDate(date: Date): string {
  const bucket = new Date(date);
  bucket.setUTCHours(0, 0, 0, 0);
  const day = bucket.getUTCDay();
  bucket.setUTCDate(bucket.getUTCDate() - day);
  return bucket.toISOString().slice(0, 10);
}

function getTrendPercent(points: MapHeroTrendPoint[]): number {
  if (points.length < 2) return 0;
  const midpoint = Math.floor(points.length / 2);
  const early = points
    .slice(0, midpoint)
    .reduce((sum, point) => sum + point.playtime, 0);
  const late = points
    .slice(midpoint)
    .reduce((sum, point) => sum + point.playtime, 0);
  if (early === 0) return late > 0 ? 100 : 0;
  return ((late - early) / early) * 100;
}

function emptyAllMapsGroup(): MapGroup {
  return {
    canonicalName: "All maps",
    mapType: null,
    mapIds: new Set<number>(),
    scrimIds: new Set<number>(),
    teamAppearances: 0,
    heroes: new Map<HeroName, HeroAccumulator>(),
    bucketTeamAppearances: new Map<string, number>(),
  };
}

function finalizeGroup(group: MapGroup): MapHeroTrendGroup {
  const sortedDates = Array.from(group.bucketTeamAppearances.keys()).sort();

  return {
    mapName: group.canonicalName,
    mapType: group.mapType,
    scrimsAnalyzed: group.scrimIds.size,
    mapsAnalyzed: group.mapIds.size,
    teamAppearances: group.teamAppearances,
    heroes: Array.from(group.heroes.values())
      .map((heroData) => {
        const role = getHeroRole(heroData.hero);
        const subrole = getHeroSubrole(heroData.hero, role);
        const games = heroData.wins + heroData.losses;
        const trend = sortedDates.map((date) => {
          const bucket = heroData.buckets.get(date);
          const denominator = group.bucketTeamAppearances.get(date) ?? 0;
          return {
            date,
            pickRate:
              denominator > 0
                ? ((bucket?.appearances ?? 0) / denominator) * 100
                : 0,
            playtime: bucket?.playtime ?? 0,
          };
        });

        return {
          hero: heroData.hero,
          role,
          subrole,
          totalPlaytime: heroData.playtime,
          pickRate:
            group.teamAppearances > 0
              ? (heroData.teamAppearances / group.teamAppearances) * 100
              : 0,
          wins: heroData.wins,
          losses: heroData.losses,
          winrate: games > 0 ? (heroData.wins / games) * 100 : 0,
          mapsPlayed: heroData.mapsPlayed.size,
          samples: heroData.teamAppearances,
          playtimeTrend: getTrendPercent(trend),
          trend,
        };
      })
      .filter((hero) => hero.totalPlaytime > 0)
      .sort((a, b) => b.totalPlaytime - a.totalPlaytime),
  };
}

function mergeGroupsIntoAll(groups: MapGroup[]): MapGroup {
  const all = emptyAllMapsGroup();

  for (const group of groups) {
    for (const id of group.mapIds) all.mapIds.add(id);
    for (const id of group.scrimIds) all.scrimIds.add(id);
    all.teamAppearances += group.teamAppearances;

    for (const [bucket, count] of group.bucketTeamAppearances) {
      all.bucketTeamAppearances.set(
        bucket,
        (all.bucketTeamAppearances.get(bucket) ?? 0) + count
      );
    }

    for (const [heroName, heroAcc] of group.heroes) {
      const existing = all.heroes.get(heroName) ?? {
        hero: heroName,
        playtime: 0,
        wins: 0,
        losses: 0,
        mapsPlayed: new Set<number>(),
        teamAppearances: 0,
        buckets: new Map<string, { playtime: number; appearances: number }>(),
      };
      existing.playtime += heroAcc.playtime;
      existing.wins += heroAcc.wins;
      existing.losses += heroAcc.losses;
      existing.teamAppearances += heroAcc.teamAppearances;
      for (const id of heroAcc.mapsPlayed) existing.mapsPlayed.add(id);
      for (const [bucket, data] of heroAcc.buckets) {
        const existingBucket = existing.buckets.get(bucket) ?? {
          playtime: 0,
          appearances: 0,
        };
        existingBucket.playtime += data.playtime;
        existingBucket.appearances += data.appearances;
        existing.buckets.set(bucket, existingBucket);
      }
      all.heroes.set(heroName, existing);
    }
  }

  return all;
}

function aggregateHeroTrends(
  maps: MapDataRecord[],
  finalStats: FinalPlayerStat[],
  matchStarts: MatchStart[],
  roundEnds: RoundEnd[],
  captures: ObjectiveCaptured[],
  payloadProgress: PayloadProgress[],
  pointProgress: PointProgress[],
  mapDisplayNames: Map<string, string>
): MapHeroTrendsResult {
  const mapById = new Map(maps.map((record) => [record.id, record]));
  const statsByMap = keyByMapDataId(finalStats);
  const matchStartByMap = firstMatchStartByMap(matchStarts);
  const finalRoundByMap = latestRoundByMap(roundEnds);
  const capturesByMap = keyByMapDataId<ObjectiveCaptured>(captures);
  const payloadByMap = keyByMapDataId<PayloadProgress>(payloadProgress);
  const pointByMap = keyByMapDataId<PointProgress>(pointProgress);

  const mapGroups = new Map<string, MapGroup>();

  for (const mapDataId of mapById.keys()) {
    const mapRecord = mapById.get(mapDataId);
    const stats = statsByMap.get(mapDataId) ?? [];
    if (!mapRecord || stats.length === 0) continue;

    const matchDetails = matchStartByMap.get(mapDataId) ?? null;
    const team1Name = matchDetails?.team_1_name;
    const team2Name = matchDetails?.team_2_name;
    const bucket = bucketDate(mapRecord.scrimDate);
    const teams = Array.from(new Set(stats.map((stat) => stat.player_team)));
    const validTeams = teams.filter(
      (team) =>
        !team1Name || !team2Name || team === team1Name || team === team2Name
    );
    const teamAppearanceCount = Math.max(validTeams.length, 1);

    const canonicalRaw = canonicalizeMapName(mapRecord.mapName);
    const mapKey = toKebabCase(canonicalRaw);
    const canonicalName = mapDisplayNames.get(mapKey) ?? canonicalRaw;
    const group = mapGroups.get(mapKey) ?? {
      canonicalName,
      mapType: resolveMapType(canonicalName) ?? resolveMapType(canonicalRaw),
      mapIds: new Set<number>(),
      scrimIds: new Set<number>(),
      teamAppearances: 0,
      heroes: new Map<HeroName, HeroAccumulator>(),
      bucketTeamAppearances: new Map<string, number>(),
    };
    group.mapIds.add(mapDataId);
    const scrimId = stats[0]?.scrimId;
    if (scrimId !== undefined) group.scrimIds.add(scrimId);
    group.teamAppearances += teamAppearanceCount;
    group.bucketTeamAppearances.set(
      bucket,
      (group.bucketTeamAppearances.get(bucket) ?? 0) + teamAppearanceCount
    );

    const winner = calculateWinner({
      matchDetails,
      finalRound: finalRoundByMap.get(mapDataId) ?? null,
      team1Captures: (capturesByMap.get(mapDataId) ?? []).filter(
        (capture) => capture.capturing_team === team1Name
      ),
      team2Captures: (capturesByMap.get(mapDataId) ?? []).filter(
        (capture) => capture.capturing_team === team2Name
      ),
      team1PayloadProgress: (payloadByMap.get(mapDataId) ?? []).filter(
        (progress) => progress.capturing_team === team1Name
      ),
      team2PayloadProgress: (payloadByMap.get(mapDataId) ?? []).filter(
        (progress) => progress.capturing_team === team2Name
      ),
      team1PointProgress: (pointByMap.get(mapDataId) ?? []).filter(
        (progress) => progress.capturing_team === team1Name
      ),
      team2PointProgress: (pointByMap.get(mapDataId) ?? []).filter(
        (progress) => progress.capturing_team === team2Name
      ),
    });

    const heroesByTeam = new Map<
      string,
      Map<HeroName, { playtime: number; players: Set<string> }>
    >();

    for (const stat of stats) {
      if (stat.hero_time_played <= 0) continue;
      const hero = stat.player_hero as HeroName;
      const teamHeroes = heroesByTeam.get(stat.player_team) ?? new Map();
      const heroData = teamHeroes.get(hero) ?? {
        playtime: 0,
        players: new Set<string>(),
      };
      heroData.playtime += stat.hero_time_played;
      heroData.players.add(stat.player_name);
      teamHeroes.set(hero, heroData);
      heroesByTeam.set(stat.player_team, teamHeroes);
    }

    for (const [team, heroes] of heroesByTeam.entries()) {
      if (team1Name && team2Name && team !== team1Name && team !== team2Name) {
        continue;
      }

      for (const [hero, heroData] of heroes.entries()) {
        const accumulator = group.heroes.get(hero) ?? {
          hero,
          playtime: 0,
          wins: 0,
          losses: 0,
          mapsPlayed: new Set<number>(),
          teamAppearances: 0,
          buckets: new Map<string, { playtime: number; appearances: number }>(),
        };
        accumulator.playtime += heroData.playtime;
        accumulator.mapsPlayed.add(mapDataId);
        accumulator.teamAppearances++;
        if (winner === team) accumulator.wins++;
        else if (winner !== "N/A") accumulator.losses++;

        const bucketData = accumulator.buckets.get(bucket) ?? {
          playtime: 0,
          appearances: 0,
        };
        bucketData.playtime += heroData.playtime;
        bucketData.appearances++;
        accumulator.buckets.set(bucket, bucketData);
        group.heroes.set(hero, accumulator);
      }
    }

    mapGroups.set(mapKey, group);
  }

  const groupValues = Array.from(mapGroups.values());
  const perMap = groupValues
    .map(finalizeGroup)
    .filter((group) => group.heroes.length > 0)
    .sort((a, b) => a.mapName.localeCompare(b.mapName));
  const allMaps = finalizeGroup(mergeGroupsIntoAll(groupValues));

  return { allMaps, perMap };
}

export type MapHeroTrendsServiceInterface = {
  readonly getRecentMapHeroTrends: () => Effect.Effect<
    MapHeroTrendsResult,
    MapQueryError
  >;
};

export class MapHeroTrendsService extends Context.Tag(
  "@app/data/map/MapHeroTrendsService"
)<MapHeroTrendsService, MapHeroTrendsServiceInterface>() {}

const CACHE_TTL = Duration.minutes(10);
const CACHE_CAPACITY = 1;
const CACHE_KEY = "recent" as const;

export const make: Effect.Effect<MapHeroTrendsServiceInterface> = Effect.gen(
  function* () {
    const computeRecentMapHeroTrends: Effect.Effect<
      MapHeroTrendsResult,
      MapQueryError
    > = Effect.suspend(() => {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        recent_days: RECENT_DAYS,
      };

      return Effect.gen(function* () {
        const since = new Date();
        since.setDate(since.getDate() - RECENT_DAYS);

        const mapDataRecords = yield* Effect.tryPromise({
          try: () =>
            prisma.mapData.findMany({
              where: {
                Map: {
                  is: {
                    Scrim: {
                      is: {
                        date: { gte: since },
                      },
                    },
                  },
                },
              },
              select: {
                id: true,
                Map: {
                  select: {
                    name: true,
                    Scrim: { select: { date: true } },
                  },
                },
              },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch recent map data records",
              cause: error,
            }),
        }).pipe(Effect.withSpan("map.hero_trends.fetchMapDataRecords"));

        const maps: MapDataRecord[] = mapDataRecords
          .map((record) => ({
            id: record.id,
            mapName: record.Map?.name ?? "Unknown Map",
            scrimDate: record.Map?.Scrim?.date ?? new Date(0),
          }))
          .filter((record) => record.mapName !== "Unknown Map");

        const mapDataIds = maps.map((record) => record.id);

        if (mapDataIds.length === 0) {
          wideEvent.scrim_count = 0;
          wideEvent.map_count = 0;
          wideEvent.unique_maps = 0;
          wideEvent.hero_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(mapHeroTrendsQuerySuccessTotal);
          return {
            allMaps: finalizeGroup(emptyAllMapsGroup()),
            perMap: [],
          };
        }

        const [
          finalStats,
          matchStarts,
          roundEnds,
          captures,
          payloadProgress,
          pointProgress,
          mapDisplayNames,
        ] = yield* Effect.all(
          [
            Effect.tryPromise({
              try: () =>
                prisma.$queryRaw<FinalPlayerStat[]>`
                  WITH max_time AS (
                    SELECT MAX(ps."match_time") AS match_time, ps."MapDataId"
                    FROM "PlayerStat" ps
                    WHERE ps."MapDataId" IN (${Prisma.join(mapDataIds)})
                    GROUP BY ps."MapDataId"
                  )
                  SELECT ps.*, s."date" AS "scrimDate"
                  FROM "PlayerStat" ps
                  INNER JOIN max_time mt
                    ON ps."MapDataId" = mt."MapDataId"
                    AND ps."match_time" = mt.match_time
                  INNER JOIN "Scrim" s ON s."id" = ps."scrimId"
                  WHERE ps."MapDataId" IN (${Prisma.join(mapDataIds)})
                `,
              catch: (error) =>
                new MapQueryError({
                  operation: "fetch final player stats",
                  cause: error,
                }),
            }),
            Effect.tryPromise({
              try: () =>
                prisma.matchStart.findMany({
                  where: { MapDataId: { in: mapDataIds } },
                }),
              catch: (error) =>
                new MapQueryError({
                  operation: "fetch match starts",
                  cause: error,
                }),
            }),
            Effect.tryPromise({
              try: () =>
                prisma.roundEnd.findMany({
                  where: { MapDataId: { in: mapDataIds } },
                }),
              catch: (error) =>
                new MapQueryError({
                  operation: "fetch round ends",
                  cause: error,
                }),
            }),
            Effect.tryPromise({
              try: () =>
                prisma.objectiveCaptured.findMany({
                  where: { MapDataId: { in: mapDataIds } },
                }),
              catch: (error) =>
                new MapQueryError({
                  operation: "fetch objective captures",
                  cause: error,
                }),
            }),
            Effect.tryPromise({
              try: () =>
                prisma.payloadProgress.findMany({
                  where: { MapDataId: { in: mapDataIds } },
                }),
              catch: (error) =>
                new MapQueryError({
                  operation: "fetch payload progress",
                  cause: error,
                }),
            }),
            Effect.tryPromise({
              try: () =>
                prisma.pointProgress.findMany({
                  where: { MapDataId: { in: mapDataIds } },
                }),
              catch: (error) =>
                new MapQueryError({
                  operation: "fetch point progress",
                  cause: error,
                }),
            }),
            Effect.promise(() => getMapNames()),
          ] as const,
          { concurrency: "unbounded" }
        ).pipe(
          Effect.withSpan("map.hero_trends.fetchAggregationInputs", {
            attributes: { map_data_count: mapDataIds.length },
          })
        );

        const result = aggregateHeroTrends(
          maps,
          finalStats,
          matchStarts,
          roundEnds,
          captures,
          payloadProgress,
          pointProgress,
          mapDisplayNames
        );

        wideEvent.scrim_count = result.allMaps.scrimsAnalyzed;
        wideEvent.map_count = result.allMaps.mapsAnalyzed;
        wideEvent.unique_maps = result.perMap.length;
        wideEvent.hero_count = result.allMaps.heroes.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(mapHeroTrendsQuerySuccessTotal);
        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(mapHeroTrendsQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.hero_trends.getRecentMapHeroTrends")
                : Effect.logInfo("map.hero_trends.getRecentMapHeroTrends");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                mapHeroTrendsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("map.hero_trends.getRecentMapHeroTrends")
      );
    });

    const heroTrendsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (_key: typeof CACHE_KEY) =>
        computeRecentMapHeroTrends.pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    return {
      getRecentMapHeroTrends: () =>
        heroTrendsCache
          .get(CACHE_KEY)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies MapHeroTrendsServiceInterface;
  }
);

export const MapHeroTrendsServiceLive = Layer.effect(
  MapHeroTrendsService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
