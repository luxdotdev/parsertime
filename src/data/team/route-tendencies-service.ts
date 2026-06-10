import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { clusterRoutes } from "@/lib/routes/cluster";
import {
  TENDENCIES_MAX_MAPDATA,
  TENDENCIES_SCRIM_WINDOW,
} from "@/lib/routes/constants";
import {
  buildRouteAnalysisForMapData,
  type RouteAnalysis,
} from "@/lib/routes/routes-db";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TeamQueryError } from "./errors";
import {
  routeTendenciesQueryDuration,
  routeTendenciesQueryErrorTotal,
  routeTendenciesQuerySuccessTotal,
  teamCacheMissTotal,
  teamCacheRequestTotal,
} from "./metrics";
import { findTeamNameForMapInMemory } from "./shared-core";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

export type MapTendencies = {
  mapName: string;
  totalRoutes: number;
  clusters: {
    label: string | null;
    routeCount: number;
    sharePercent: number;
    outcomes: { won: number; lost: number; unknown: number };
  }[];
};

export type TendenciesResult = MapTendencies[];

type AugmentedRoute = RouteAnalysis["routes"][number];

export type RouteTendenciesServiceInterface = {
  readonly getTendencies: (
    teamId: number
  ) => Effect.Effect<TendenciesResult, TeamQueryError>;
};

export class RouteTendenciesService extends Context.Tag(
  "@app/data/team/RouteTendenciesService"
)<RouteTendenciesService, RouteTendenciesServiceInterface>() {}

const CACHE_TTL = Duration.minutes(5);
const CACHE_CAPACITY = 32;

export const make: Effect.Effect<
  RouteTendenciesServiceInterface,
  never,
  TeamSharedDataService
> = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getTendencies(
    teamId: number
  ): Effect.Effect<TendenciesResult, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { teamId };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);

      const team = yield* Effect.tryPromise({
        try: () =>
          prisma.team.findUnique({
            where: { id: teamId },
            select: { name: true },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch team for route tendencies",
            cause: error,
          }),
      });

      if (!team) {
        wideEvent.outcome = "success";
        wideEvent.result = "team_not_found";
        yield* Metric.increment(routeTendenciesQuerySuccessTotal);
        const _empty: TendenciesResult = [];
        return _empty;
      }

      const teamName = team.name;
      wideEvent.team_name = teamName;

      const scrims = yield* Effect.tryPromise({
        try: () =>
          prisma.scrim.findMany({
            where: { Team: { id: teamId } },
            orderBy: { date: "desc" },
            take: TENDENCIES_SCRIM_WINDOW,
            select: {
              maps: {
                select: {
                  name: true,
                  mapData: { select: { id: true } },
                },
              },
            },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch scrims for route tendencies",
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("team.routeTendencies.fetchScrims", {
          attributes: { teamId },
        })
      );

      // Collect MapData ids grouped by map name, capped per map name.
      const mapDataIdsByMapName = new Map<string, number[]>();
      for (const scrim of scrims) {
        for (const map of scrim.maps) {
          const mapName = map.name;
          if (!mapName) continue;
          const ids = mapDataIdsByMapName.get(mapName) ?? [];
          for (const md of map.mapData) {
            if (ids.length >= TENDENCIES_MAX_MAPDATA) break;
            ids.push(md.id);
          }
          mapDataIdsByMapName.set(mapName, ids);
        }
      }

      wideEvent.scrim_count = scrims.length;
      wideEvent.map_name_count = mapDataIdsByMapName.size;

      // Resolve the team's in-game side via the roster-derived
      // `player_team` string (the same namespace as `route.playerTeam`),
      // NOT the parsertime `Team.name` label. A Scrim links to a Team by
      // id, so the scoreboard team name routinely differs from `Team.name`.
      const teamRoster = yield* shared.getTeamRoster(teamId);
      const teamRosterSet = new Set(teamRoster);

      const allMapDataIds = Array.from(mapDataIdsByMapName.values()).flat();

      const allPlayerStats =
        allMapDataIds.length === 0
          ? []
          : yield* Effect.tryPromise({
              try: () =>
                prisma.playerStat.findMany({
                  where: { MapDataId: { in: allMapDataIds } },
                  select: {
                    player_name: true,
                    player_team: true,
                    MapDataId: true,
                  },
                }),
              catch: (error) =>
                new TeamQueryError({
                  operation: "fetch player stats for route tendencies",
                  cause: error,
                }),
            });

      const result: MapTendencies[] = [];

      for (const [mapName, mapDataIds] of mapDataIdsByMapName) {
        const keptRoutes: AugmentedRoute[] = [];

        for (const mapDataId of mapDataIds) {
          const analysis = yield* Effect.tryPromise({
            try: () => buildRouteAnalysisForMapData(mapDataId),
            catch: (error) =>
              new TeamQueryError({
                operation: "build route analysis for route tendencies",
                cause: error,
              }),
          });

          if (analysis === null) continue;

          // Resolve the team's side for THIS MapData via the roster-derived
          // `player_team` string (frequency of roster players per team),
          // matching how the sibling team services resolve sides. Skip when
          // the side can't be determined (no roster overlap on this map).
          const ourSide = findTeamNameForMapInMemory(
            mapDataId,
            allPlayerStats,
            teamRosterSet
          );
          if (ourSide === null) continue;

          for (const route of analysis.routes) {
            if (route.playerTeam === ourSide) keptRoutes.push(route);
          }
        }

        const totalRoutes = keptRoutes.length;
        if (totalRoutes === 0) continue;

        const rawClusters = clusterRoutes(keptRoutes.map((r) => r.points));
        const clusters = rawClusters.map((cluster) => {
          const counts = { won: 0, lost: 0, unknown: 0 };
          for (const idx of cluster.routeIndexes) {
            const outcome = keptRoutes[idx].outcome;
            if (outcome === "WON") counts.won++;
            else if (outcome === "LOST") counts.lost++;
            else counts.unknown++;
          }
          return {
            label: keptRoutes[cluster.medoidIndex]?.signature ?? null,
            routeCount: cluster.routeIndexes.length,
            sharePercent: Math.round(
              (cluster.routeIndexes.length / totalRoutes) * 100
            ),
            outcomes: counts,
          };
        });

        result.push({ mapName, totalRoutes, clusters });
      }

      result.sort((a, b) => b.totalRoutes - a.totalRoutes);

      wideEvent.tendency_map_count = result.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(routeTendenciesQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(
          Effect.andThen(Metric.increment(routeTendenciesQueryErrorTotal))
        )
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.routeTendencies.getTendencies")
              : Effect.logInfo("team.routeTendencies.getTendencies");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              routeTendenciesQueryDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("team.routeTendencies.getTendencies")
    );
  }

  const tendenciesCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (teamId: number) =>
      getTendencies(teamId).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      ),
  });

  return {
    getTendencies: (teamId: number) =>
      tendenciesCache
        .get(teamId)
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies RouteTendenciesServiceInterface;
});

export const RouteTendenciesServiceLive = Layer.effect(
  RouteTendenciesService,
  make
).pipe(
  Layer.provide(TeamSharedDataServiceLive),
  Layer.provide(EffectObservabilityLive)
);
