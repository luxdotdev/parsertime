import {
  ScrimPositionalArtifactsService,
  ScrimPositionalArtifactsServiceLive,
} from "@/data/scrim/positional-artifacts-service";
import { EffectObservabilityLive } from "@/instrumentation";
import {
  mergeEngagementSummaries,
  type EngagementSummary,
} from "@/lib/engagement-rollups";
import { E_TEAM_SCRIM_WINDOW } from "@/lib/positional-rollups";
import prisma from "@/lib/prisma";
import { sumZoneRows, type ZoneCountRow } from "@/lib/zones/analytics";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TeamQueryError } from "./errors";
import {
  positionalArtifactsQueryDuration,
  positionalArtifactsQueryErrorTotal,
  positionalArtifactsQuerySuccessTotal,
  teamCacheMissTotal,
  teamCacheRequestTotal,
} from "./metrics";

export type TeamPositionalArtifacts = {
  /** Merged across all scrims in the window. */
  engagements: EngagementSummary;
  /** Summed per base map name across scrims. */
  zonesByMap: { mapName: string; rows: ZoneCountRow[] }[];
  /** Summed per base map name across scrims. */
  routesByMap: {
    mapName: string;
    total: number;
    won: number;
    lost: number;
  }[];
  /** Number of scrims actually contributing (non-null results). */
  scrimWindow: number;
};

export type TeamPositionalArtifactsServiceInterface = {
  readonly getTeamPositionalArtifacts: (
    teamId: number
  ) => Effect.Effect<TeamPositionalArtifacts | null, TeamQueryError>;
};

export class TeamPositionalArtifactsService extends Context.Tag(
  "@app/data/team/TeamPositionalArtifactsService"
)<
  TeamPositionalArtifactsService,
  TeamPositionalArtifactsServiceInterface
>() {}

const CACHE_TTL = Duration.minutes(5);
const CACHE_CAPACITY = 32;

export const make: Effect.Effect<
  TeamPositionalArtifactsServiceInterface,
  never,
  ScrimPositionalArtifactsService
> = Effect.gen(function* () {
  const scrimArtifacts = yield* ScrimPositionalArtifactsService;

  function getTeamPositionalArtifacts(
    teamId: number
  ): Effect.Effect<TeamPositionalArtifacts | null, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { teamId };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);

      const scrims = yield* Effect.tryPromise({
        try: () =>
          prisma.scrim.findMany({
            where: { teamId },
            select: { id: true },
            orderBy: { date: "desc" },
            take: E_TEAM_SCRIM_WINDOW,
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "getTeamPositionalArtifacts.fetchScrims",
            cause: error,
          }),
      }).pipe(
        Effect.withSpan("team.positional_artifacts.fetchScrims", {
          attributes: { teamId },
        })
      );

      const scrimIds = scrims.map((s) => s.id);

      if (scrimIds.length === 0) {
        wideEvent.scrim_count = 0;
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_scrims";
        yield* Metric.increment(positionalArtifactsQuerySuccessTotal);
        return null;
      }

      // Fan out to the (cached) scrim service per scrim id. Map its
      // ScrimQueryError into this service's TeamQueryError channel.
      const perScrim = yield* Effect.forEach(
        scrimIds,
        (scrimId) =>
          scrimArtifacts
            .getScrimPositionalArtifacts(scrimId, teamId)
            .pipe(
              Effect.mapError(
                (error) =>
                  new TeamQueryError({
                    operation:
                      "getTeamPositionalArtifacts.getScrimPositionalArtifacts",
                    cause: error,
                  })
              )
            ),
        { concurrency: "unbounded" }
      );

      const results = perScrim.filter(
        (r): r is NonNullable<typeof r> => r !== null
      );

      const scrimWindow = results.length;
      wideEvent.scrim_count = scrims.length;
      wideEvent.contributing_scrim_count = scrimWindow;

      if (scrimWindow === 0) {
        wideEvent.outcome = "success";
        wideEvent.early_return = "no_contributing_scrims";
        yield* Metric.increment(positionalArtifactsQuerySuccessTotal);
        return null;
      }

      // engagements: merge across every contributing scrim.
      const engagements = mergeEngagementSummaries(
        results.map((r) => r.engagements)
      );

      // zones: group each scrim's per-map tables by base map name, sum within
      // each name across scrims. Drop map names whose summed rows are empty.
      const zoneTablesByMap = new Map<string, ZoneCountRow[][]>();
      for (const r of results) {
        for (const entry of r.zonesByMap) {
          const existing = zoneTablesByMap.get(entry.mapName) ?? [];
          existing.push(entry.rows);
          zoneTablesByMap.set(entry.mapName, existing);
        }
      }
      const zonesByMap = Array.from(zoneTablesByMap, ([mapName, tables]) => ({
        mapName,
        rows: sumZoneRows(tables),
      })).filter((entry) => entry.rows.length > 0);

      // routes: group per-scrim route counts by base map name, sum each.
      const routeAccByMap = new Map<
        string,
        { total: number; won: number; lost: number }
      >();
      for (const r of results) {
        for (const entry of r.routesByMap) {
          const acc = routeAccByMap.get(entry.mapName) ?? {
            total: 0,
            won: 0,
            lost: 0,
          };
          acc.total += entry.total;
          acc.won += entry.won;
          acc.lost += entry.lost;
          routeAccByMap.set(entry.mapName, acc);
        }
      }
      const routesByMap = Array.from(routeAccByMap, ([mapName, acc]) => ({
        mapName,
        ...acc,
      })).filter((entry) => entry.total > 0);

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
        yield* Metric.increment(positionalArtifactsQuerySuccessTotal);
        return null;
      }

      yield* Metric.increment(positionalArtifactsQuerySuccessTotal);
      return {
        engagements,
        zonesByMap,
        routesByMap,
        scrimWindow,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(
          Effect.andThen(Metric.increment(positionalArtifactsQueryErrorTotal))
        )
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.getTeamPositionalArtifacts")
              : Effect.logInfo("team.getTeamPositionalArtifacts");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              positionalArtifactsQueryDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("team.getTeamPositionalArtifacts")
    );
  }

  const cache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (teamId: number) =>
      getTeamPositionalArtifacts(teamId).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      ),
  });

  return {
    getTeamPositionalArtifacts: (teamId: number) =>
      cache
        .get(teamId)
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamPositionalArtifactsServiceInterface;
});

export const TeamPositionalArtifactsServiceLive = Layer.effect(
  TeamPositionalArtifactsService,
  make
).pipe(
  Layer.provide(ScrimPositionalArtifactsServiceLive),
  Layer.provide(EffectObservabilityLive)
);
