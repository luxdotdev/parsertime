import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import type { MapGroup } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "./errors";
import {
  mapCacheMissTotal,
  mapCacheRequestTotal,
  mapGroupMutationDuration,
  mapGroupMutationErrorTotal,
  mapGroupMutationSuccessTotal,
  mapGroupQueryDuration,
  mapGroupQueryErrorTotal,
  mapGroupQuerySuccessTotal,
} from "./metrics";

export type MapGroupServiceInterface = {
  readonly getMapGroupsForTeam: (
    teamId: number
  ) => Effect.Effect<MapGroup[], MapQueryError>;

  readonly getMapGroupById: (
    groupId: number
  ) => Effect.Effect<MapGroup | null, MapQueryError>;

  readonly createMapGroup: (data: {
    name: string;
    description?: string;
    teamId: number;
    mapIds: number[];
    category?: string;
    createdBy: string;
  }) => Effect.Effect<MapGroup, MapQueryError>;

  readonly updateMapGroup: (
    groupId: number,
    data: {
      name?: string;
      description?: string;
      mapIds?: number[];
      category?: string;
    }
  ) => Effect.Effect<MapGroup, MapQueryError>;

  readonly deleteMapGroup: (
    groupId: number
  ) => Effect.Effect<void, MapQueryError>;

  readonly getMapGroupsByCategory: (
    teamId: number,
    category: string
  ) => Effect.Effect<MapGroup[], MapQueryError>;
};

export class MapGroupService extends Context.Tag(
  "@app/data/map/MapGroupService"
)<MapGroupService, MapGroupServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<MapGroupServiceInterface> = Effect.gen(
  function* () {
    function getMapGroupsForTeam(
      teamId: number
    ): Effect.Effect<MapGroup[], MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        const groups = yield* Effect.tryPromise({
          try: () =>
            prisma.mapGroup.findMany({
              where: { teamId },
              orderBy: { createdAt: "desc" },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch map groups for team",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.group.getMapGroupsForTeam.query", {
            attributes: { teamId },
          })
        );

        wideEvent.group_count = groups.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(mapGroupQuerySuccessTotal);
        return groups;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(mapGroupQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.group.getMapGroupsForTeam")
                : Effect.logInfo("map.group.getMapGroupsForTeam");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(mapGroupQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("map.group.getMapGroupsForTeam")
      );
    }

    function getMapGroupById(
      groupId: number
    ): Effect.Effect<MapGroup | null, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { groupId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("groupId", groupId);
        const group = yield* Effect.tryPromise({
          try: () =>
            prisma.mapGroup.findUnique({
              where: { id: groupId },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch map group by id",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.group.getMapGroupById.query", {
            attributes: { groupId },
          })
        );

        wideEvent.found = group !== null;
        wideEvent.outcome = "success";
        yield* Metric.increment(mapGroupQuerySuccessTotal);
        return group;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(mapGroupQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.group.getMapGroupById")
                : Effect.logInfo("map.group.getMapGroupById");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(mapGroupQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("map.group.getMapGroupById")
      );
    }

    function createMapGroup(data: {
      name: string;
      description?: string;
      teamId: number;
      mapIds: number[];
      category?: string;
      createdBy: string;
    }): Effect.Effect<MapGroup, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        teamId: data.teamId,
        name: data.name,
        mapIdCount: data.mapIds.length,
        category: data.category,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", data.teamId);
        const group = yield* Effect.tryPromise({
          try: () =>
            prisma.mapGroup.create({
              data: {
                name: data.name,
                description: data.description,
                teamId: data.teamId,
                mapIds: data.mapIds,
                category: data.category,
                createdBy: data.createdBy,
              },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "create map group",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.group.createMapGroup.query", {
            attributes: { teamId: data.teamId },
          })
        );

        wideEvent.groupId = group.id;
        wideEvent.outcome = "success";
        yield* Metric.increment(mapGroupMutationSuccessTotal);
        return group;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(mapGroupMutationErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.group.createMapGroup")
                : Effect.logInfo("map.group.createMapGroup");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                mapGroupMutationDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("map.group.createMapGroup")
      );
    }

    function updateMapGroup(
      groupId: number,
      data: {
        name?: string;
        description?: string;
        mapIds?: number[];
        category?: string;
      }
    ): Effect.Effect<MapGroup, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        groupId,
        hasName: data.name !== undefined,
        hasMapIds: data.mapIds !== undefined,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("groupId", groupId);
        const group = yield* Effect.tryPromise({
          try: () =>
            prisma.mapGroup.update({
              where: { id: groupId },
              data: {
                name: data.name,
                description: data.description,
                mapIds: data.mapIds,
                category: data.category,
              },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "update map group",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.group.updateMapGroup.query", {
            attributes: { groupId },
          })
        );

        wideEvent.outcome = "success";
        yield* Metric.increment(mapGroupMutationSuccessTotal);
        return group;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(mapGroupMutationErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.group.updateMapGroup")
                : Effect.logInfo("map.group.updateMapGroup");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                mapGroupMutationDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("map.group.updateMapGroup")
      );
    }

    function deleteMapGroup(
      groupId: number
    ): Effect.Effect<void, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { groupId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("groupId", groupId);
        yield* Effect.tryPromise({
          try: () =>
            prisma.mapGroup.delete({
              where: { id: groupId },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "delete map group",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.group.deleteMapGroup.query", {
            attributes: { groupId },
          })
        );

        wideEvent.outcome = "success";
        yield* Metric.increment(mapGroupMutationSuccessTotal);
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(mapGroupMutationErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.group.deleteMapGroup")
                : Effect.logInfo("map.group.deleteMapGroup");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                mapGroupMutationDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("map.group.deleteMapGroup")
      );
    }

    function getMapGroupsByCategory(
      teamId: number,
      category: string
    ): Effect.Effect<MapGroup[], MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamId, category };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        yield* Effect.annotateCurrentSpan("category", category);
        const groups = yield* Effect.tryPromise({
          try: () =>
            prisma.mapGroup.findMany({
              where: { teamId, category },
              orderBy: { name: "asc" },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch map groups by category",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.group.getMapGroupsByCategory.query", {
            attributes: { teamId, category },
          })
        );

        wideEvent.group_count = groups.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(mapGroupQuerySuccessTotal);
        return groups;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(mapGroupQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.group.getMapGroupsByCategory")
                : Effect.logInfo("map.group.getMapGroupsByCategory");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(mapGroupQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("map.group.getMapGroupsByCategory")
      );
    }

    const mapGroupsForTeamCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamId: number) =>
        getMapGroupsForTeam(teamId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    const mapGroupByIdCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (groupId: number) =>
        getMapGroupById(groupId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    const mapGroupsByCategoryCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [teamId, category] = JSON.parse(key) as [number, string];
        return getMapGroupsByCategory(teamId, category).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        );
      },
    });

    return {
      getMapGroupsForTeam: (teamId: number) =>
        mapGroupsForTeamCache
          .get(teamId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
      getMapGroupById: (groupId: number) =>
        mapGroupByIdCache
          .get(groupId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
      createMapGroup,
      updateMapGroup,
      deleteMapGroup,
      getMapGroupsByCategory: (teamId: number, category: string) =>
        mapGroupsByCategoryCache
          .get(JSON.stringify([teamId, category]))
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies MapGroupServiceInterface;
  }
);

export const MapGroupServiceLive = Layer.effect(MapGroupService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
