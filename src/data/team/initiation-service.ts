import prisma from "@/lib/prisma";
import { assembleMapInitiation } from "@/lib/fight-initiation";
import {
  emptyTally,
  initiationRates,
  mergeTallies,
  tallyMapForTeam,
  type InitiationTally,
} from "@/lib/fight-initiation-rollups";
import type { Kill, MercyRez, UltimateStart } from "@/generated/prisma/client";
import {
  Cache,
  Context,
  Duration,
  Effect,
  Layer,
  Metric,
  MetricBoundaries,
} from "effect";
import type { TeamQueryError } from "./errors";
import { TeamQueryError as TeamQueryErrorClass } from "./errors";
import { parseDateRangeFromCacheKey } from "./shared-core";
import type { TeamDateRange } from "./shared-core";
import { findTeamNameForMapInMemory } from "./shared-core";
import { teamCacheRequestTotal, teamCacheMissTotal } from "./metrics";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";
import type { TeamInitiationStats } from "./types";
export type { TeamInitiationStats } from "./types";

const initiationQuerySuccessTotal = Metric.counter(
  "team.initiation.query.success",
  { description: "Total successful team initiation queries", incremental: true }
);
const initiationQueryErrorTotal = Metric.counter(
  "team.initiation.query.error",
  { description: "Total team initiation query failures", incremental: true }
);
const initiationQueryDuration = Metric.histogram(
  "team.initiation.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team initiation query duration in milliseconds"
);

function emptyInitiationStats(): TeamInitiationStats {
  return {
    totalFights: 0,
    decidedFights: 0,
    contestedFights: 0,
    wentFirst: 0,
    wentFirstWins: 0,
    wentSecond: 0,
    wentSecondWins: 0,
    initiationWinrate: 0,
    initiationFrequency: 0,
    goingSecondWinrate: 0,
    mapsCovered: 0,
    mapsTotal: 0,
  };
}

function groupByMap<T extends { MapDataId: number | null }>(
  rows: T[]
): Map<number, T[]> {
  const byMap = new Map<number, T[]>();
  for (const row of rows) {
    if (row.MapDataId === null) continue;
    const list = byMap.get(row.MapDataId);
    if (list) list.push(row);
    else byMap.set(row.MapDataId, [row]);
  }
  return byMap;
}

export type TeamInitiationServiceInterface = {
  readonly getTeamInitiation: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<TeamInitiationStats, TeamQueryError>;
};

export class TeamInitiationService extends Context.Tag(
  "@app/data/team/TeamInitiationService"
)<TeamInitiationService, TeamInitiationServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getTeamInitiation(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<TeamInitiationStats, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const sharedData = yield* shared.getExtendedTeamData(teamId, {
        dateRange,
      });

      if (sharedData.mapDataIds.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.maps_total = 0;
        yield* Metric.increment(initiationQuerySuccessTotal);
        return emptyInitiationStats();
      }

      // Fetch only the tables not already in shared data; healing and rounds are
      // omitted because they never change initiator/winner (aggregate-only path).
      const [damage, ability1, ability2] = yield* Effect.tryPromise({
        try: () =>
          Promise.all([
            prisma.damage.findMany({
              where: { MapDataId: { in: sharedData.mapDataIds } },
              select: {
                match_time: true,
                attacker_name: true,
                attacker_team: true,
                victim_name: true,
                victim_team: true,
                event_damage: true,
                MapDataId: true,
              },
            }),
            prisma.ability1Used.findMany({
              where: { MapDataId: { in: sharedData.mapDataIds } },
              select: {
                match_time: true,
                player_name: true,
                player_team: true,
                MapDataId: true,
              },
            }),
            prisma.ability2Used.findMany({
              where: { MapDataId: { in: sharedData.mapDataIds } },
              select: {
                match_time: true,
                player_name: true,
                player_team: true,
                MapDataId: true,
              },
            }),
          ]),
        catch: (error) =>
          new TeamQueryErrorClass({
            operation: "fetch initiation event tables",
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("team.initiation.fetchEventTables", {
          attributes: { teamId, mapCount: sharedData.mapDataIds.length },
        })
      );

      const killsByMap = groupByMap<Kill>(sharedData.allKills);
      const rezzesByMap = groupByMap<MercyRez>(sharedData.allRezzes);
      const ultsByMap = groupByMap<UltimateStart>(sharedData.allUltimates);
      const damageByMap = groupByMap(damage);
      const ability1ByMap = groupByMap(ability1);
      const ability2ByMap = groupByMap(ability2);

      const tallies: InitiationTally[] = [];
      for (const mapDataId of sharedData.mapDataIds) {
        const ourTeam = findTeamNameForMapInMemory(
          mapDataId,
          sharedData.allPlayerStats,
          sharedData.teamRosterSet
        );
        if (!ourTeam) continue;

        const result = assembleMapInitiation({
          kills: killsByMap.get(mapDataId) ?? [],
          rezzes: rezzesByMap.get(mapDataId) ?? [],
          damage: damageByMap.get(mapDataId) ?? [],
          ability1: ability1ByMap.get(mapDataId) ?? [],
          ability2: ability2ByMap.get(mapDataId) ?? [],
          ults: ultsByMap.get(mapDataId) ?? [],
          healing: [],
          roundStarts: [],
          roundEnds: [],
        });
        if (!result.available) continue;
        tallies.push(tallyMapForTeam(result.labels, ourTeam));
      }

      const merged = tallies.length > 0 ? mergeTallies(tallies) : emptyTally();
      const rates = initiationRates(merged);
      const stats: TeamInitiationStats = {
        totalFights: merged.totalFights,
        decidedFights: merged.decidedFights,
        contestedFights: merged.contestedFights,
        wentFirst: merged.wentFirst,
        wentFirstWins: merged.wentFirstWins,
        wentSecond: merged.wentSecond,
        wentSecondWins: merged.wentSecondWins,
        ...rates,
        mapsCovered: merged.mapsCovered,
        mapsTotal: sharedData.mapDataIds.length,
      };

      wideEvent.outcome = "success";
      wideEvent.maps_total = stats.mapsTotal;
      wideEvent.maps_covered = stats.mapsCovered;
      wideEvent.total_fights = stats.totalFights;
      yield* Metric.increment(initiationQuerySuccessTotal);
      return stats;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(initiationQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.initiation.getTeamInitiation")
              : Effect.logInfo("team.initiation.getTeamInitiation");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(initiationQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.initiation.getTeamInitiation")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const initiationCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const teamIdStr = key.slice(0, key.indexOf(":"));
      const rest = key.slice(key.indexOf(":") + 1);
      const dr = parseDateRangeFromCacheKey(rest);
      return getTeamInitiation(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getTeamInitiation: (teamId: number, dateRange?: TeamDateRange) =>
      initiationCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamInitiationServiceInterface;
});

export const TeamInitiationServiceLive = Layer.effect(
  TeamInitiationService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
