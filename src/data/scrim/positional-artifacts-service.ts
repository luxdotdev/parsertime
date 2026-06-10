import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "@/data/team/shared-data-service";
import { findTeamNameForMapInMemory } from "@/data/team/shared-core";
import { EffectObservabilityLive } from "@/instrumentation";
import {
  mergeEngagementSummaries,
  summarizeEngagements,
  type EngagementSummary,
} from "@/lib/engagement-rollups";
import prisma from "@/lib/prisma";
import { buildRouteAnalysisForMapData } from "@/lib/routes/routes-db";
import { getEngagementsForMapData } from "@/lib/ult-quality-db";
import { sumZoneRows, type ZoneCountRow } from "@/lib/zones/analytics";
import { buildZoneAnalyticsForMapData } from "@/data/map/zone-analytics-service";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { ScrimQueryError } from "./errors";
import {
  scrimCacheMissTotal,
  scrimCacheRequestTotal,
  scrimPositionalArtifactsDuration,
  scrimPositionalArtifactsErrorTotal,
  scrimPositionalArtifactsSuccessTotal,
} from "./metrics";

export type ScrimPositionalArtifacts = {
  /** Merged across the scrim's MapDatas (only ones where our side resolved). */
  engagements: EngagementSummary;
  /** Summed per base map name. */
  zonesByMap: { mapName: string; rows: ZoneCountRow[] }[];
  /** Our team's routes only, per base map name. */
  routesByMap: {
    mapName: string;
    total: number;
    won: number;
    lost: number;
  }[];
};

export type ScrimPositionalArtifactsServiceInterface = {
  readonly getScrimPositionalArtifacts: (
    scrimId: number,
    teamId: number
  ) => Effect.Effect<ScrimPositionalArtifacts | null, ScrimQueryError>;
};

export class ScrimPositionalArtifactsService extends Context.Tag(
  "@app/data/scrim/ScrimPositionalArtifactsService"
)<
  ScrimPositionalArtifactsService,
  ScrimPositionalArtifactsServiceInterface
>() {}

type PerMapResult = {
  mapName: string;
  summary: EngagementSummary;
  zoneRows: ZoneCountRow[];
  route: { total: number; won: number; lost: number };
};

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<
  ScrimPositionalArtifactsServiceInterface,
  never,
  TeamSharedDataService
> = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getScrimPositionalArtifacts(
    scrimId: number,
    teamId: number
  ): Effect.Effect<ScrimPositionalArtifacts | null, ScrimQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { scrimId, teamId };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("scrimId", scrimId);
      yield* Effect.annotateCurrentSpan("teamId", teamId);

      const maps = yield* Effect.tryPromise({
        try: () =>
          prisma.map.findMany({
            where: { scrimId },
            orderBy: { id: "asc" },
            select: {
              id: true,
              name: true,
              mapData: { select: { id: true } },
            },
          }),
        catch: (error) =>
          new ScrimQueryError({
            operation: "getScrimPositionalArtifacts.fetchMaps",
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("scrim.positionalArtifacts.fetchMaps", {
          attributes: { scrimId },
        })
      );

      // Flatten to { mapDataId, mapName } pairs across the scrim's maps.
      const mapDatas = maps.flatMap((m) =>
        m.mapData.map((md) => ({ mapDataId: md.id, mapName: m.name }))
      );
      const allMapDataIds = mapDatas.map((md) => md.mapDataId);

      wideEvent.map_count = maps.length;
      wideEvent.map_data_count = allMapDataIds.length;

      if (allMapDataIds.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_map_data";
        yield* Metric.increment(scrimPositionalArtifactsSuccessTotal);
        return null;
      }

      // Resolve the team's in-game side via the roster-derived `player_team`
      // string (the namespace shared by engagements/zones/routes), NOT the
      // parsertime `Team.name`. Same approach as route-tendencies-service.
      const teamRoster = yield* shared.getTeamRoster(teamId).pipe(
        Effect.mapError(
          (error) =>
            new ScrimQueryError({
              operation: "getScrimPositionalArtifacts.getTeamRoster",
              cause: error,
            })
        )
      );
      const teamRosterSet = new Set(teamRoster);

      const allPlayerStats = yield* Effect.tryPromise({
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
          new ScrimQueryError({
            operation: "getScrimPositionalArtifacts.fetchPlayerStats",
            cause: error,
          }),
      });

      // Resolve each MapData's side; SKIP (do not guess) when ambiguous.
      const resolved: {
        mapDataId: number;
        mapName: string;
        ourSide: string;
      }[] = [];
      let skipped = 0;
      for (const md of mapDatas) {
        const ourSide = findTeamNameForMapInMemory(
          md.mapDataId,
          allPlayerStats,
          teamRosterSet
        );
        if (ourSide === null) {
          skipped++;
          continue;
        }
        resolved.push({ ...md, ourSide });
      }

      wideEvent.resolved_map_data_count = resolved.length;
      wideEvent.skipped_map_data_count = skipped;

      if (resolved.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_resolved_sides";
        yield* Metric.increment(scrimPositionalArtifactsSuccessTotal);
        return null;
      }

      const perMap = yield* Effect.forEach(
        resolved,
        ({ mapDataId, mapName, ourSide }) =>
          Effect.gen(function* () {
            const [engs, za, ra] = yield* Effect.all(
              [
                Effect.tryPromise({
                  try: () => getEngagementsForMapData(mapDataId),
                  catch: (error) =>
                    new ScrimQueryError({
                      operation:
                        "getScrimPositionalArtifacts.getEngagements",
                      cause: error,
                    }),
                }),
                Effect.tryPromise({
                  try: () => buildZoneAnalyticsForMapData(mapDataId),
                  catch: (error) =>
                    new ScrimQueryError({
                      operation: "getScrimPositionalArtifacts.buildZones",
                      cause: error,
                    }),
                }),
                Effect.tryPromise({
                  try: () => buildRouteAnalysisForMapData(mapDataId),
                  catch: (error) =>
                    new ScrimQueryError({
                      operation: "getScrimPositionalArtifacts.buildRoutes",
                      cause: error,
                    }),
                }),
              ],
              { concurrency: "unbounded" }
            );

            const summary = summarizeEngagements(
              engs.map((e) => ({ winner: e.winner, zoneName: e.zoneName })),
              ourSide
            );

            const zoneRows = za?.rows ?? [];

            let total = 0;
            let won = 0;
            let lost = 0;
            if (ra !== null) {
              for (const route of ra.routes) {
                if (route.playerTeam !== ourSide) continue;
                total++;
                if (route.outcome === "WON") won++;
                else if (route.outcome === "LOST") lost++;
              }
            }

            const result: PerMapResult = {
              mapName,
              summary,
              zoneRows,
              route: { total, won, lost },
            };
            return result;
          }),
        { concurrency: "unbounded" }
      );

      // engagements: merge across every non-skipped MapData.
      const engagements = mergeEngagementSummaries(perMap.map((p) => p.summary));

      // zones: group zone tables by base map name, sum within each name.
      const zoneTablesByMap = new Map<string, ZoneCountRow[][]>();
      for (const p of perMap) {
        const existing = zoneTablesByMap.get(p.mapName) ?? [];
        existing.push(p.zoneRows);
        zoneTablesByMap.set(p.mapName, existing);
      }
      const zonesByMap = Array.from(zoneTablesByMap, ([mapName, tables]) => ({
        mapName,
        rows: sumZoneRows(tables),
      })).filter((entry) => entry.rows.length > 0);

      // routes: group per-MapData route counts by base map name, sum each.
      const routeAccByMap = new Map<
        string,
        { total: number; won: number; lost: number }
      >();
      for (const p of perMap) {
        const acc = routeAccByMap.get(p.mapName) ?? {
          total: 0,
          won: 0,
          lost: 0,
        };
        acc.total += p.route.total;
        acc.won += p.route.won;
        acc.lost += p.route.lost;
        routeAccByMap.set(p.mapName, acc);
      }
      const routesByMap = Array.from(routeAccByMap, ([mapName, acc]) => ({
        mapName,
        ...acc,
      })).filter((entry) => entry.total > 0);

      const result: ScrimPositionalArtifacts = {
        engagements,
        zonesByMap,
        routesByMap,
      };

      wideEvent.engagement_total = engagements.total;
      wideEvent.zone_map_count = zonesByMap.length;
      wideEvent.route_map_count = routesByMap.length;

      // Empty-state contract: null only when EVERY family is empty.
      const isEmpty =
        engagements.total === 0 &&
        zonesByMap.length === 0 &&
        routesByMap.length === 0;

      wideEvent.outcome = "success";
      if (isEmpty) {
        wideEvent.early_return = "all_families_empty";
        yield* Metric.increment(scrimPositionalArtifactsSuccessTotal);
        return null;
      }

      yield* Metric.increment(scrimPositionalArtifactsSuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(
          Effect.andThen(Metric.increment(scrimPositionalArtifactsErrorTotal))
        )
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("scrim.positionalArtifacts.query")
              : Effect.logInfo("scrim.positionalArtifacts.query");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              scrimPositionalArtifactsDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("scrim.positionalArtifacts.getScrimPositionalArtifacts")
    );
  }

  // Cache keyed on both scrimId and teamId via a composite string key.
  const artifactsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [scrimIdStr, teamIdStr] = key.split(":");
      return getScrimPositionalArtifacts(
        Number(scrimIdStr),
        Number(teamIdStr)
      ).pipe(Effect.tap(() => Metric.increment(scrimCacheMissTotal)));
    },
  });

  return {
    getScrimPositionalArtifacts: (scrimId: number, teamId: number) =>
      artifactsCache
        .get(`${scrimId}:${teamId}`)
        .pipe(Effect.tap(() => Metric.increment(scrimCacheRequestTotal))),
  } satisfies ScrimPositionalArtifactsServiceInterface;
});

export const ScrimPositionalArtifactsServiceLive = Layer.effect(
  ScrimPositionalArtifactsService,
  make
).pipe(
  Layer.provide(TeamSharedDataServiceLive),
  Layer.provide(EffectObservabilityLive)
);
