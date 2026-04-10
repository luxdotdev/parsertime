import { EffectObservabilityLive } from "@/instrumentation";
import {
  getControlSubMapName,
  isControlMap,
} from "@/lib/map-calibration/control-map-index";
import {
  loadCalibration,
  type LoadedCalibration,
} from "@/lib/map-calibration/load-calibration";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "../errors";
import {
  killfeedCalibrationQueryDuration,
  killfeedCalibrationQueryErrorTotal,
  killfeedCalibrationQuerySuccessTotal,
  mapCacheMissTotal,
  mapCacheRequestTotal,
} from "../metrics";
import type {
  KillfeedCalibrationData,
  SerializedCalibrationData,
} from "./types";

export function serializeCalibrationData(
  data: KillfeedCalibrationData | null
): SerializedCalibrationData {
  if (!data) return null;
  const obj: Record<string, LoadedCalibration> = {};
  for (const [key, val] of data.calibrations) {
    obj[key] = val;
  }
  return {
    calibrations: obj,
    mapName: data.mapName,
    mapType: data.mapType,
    roundStarts: data.roundStarts,
  };
}

export type KillfeedCalibrationServiceInterface = {
  readonly getKillfeedCalibration: (
    mapDataId: number
  ) => Effect.Effect<KillfeedCalibrationData | null, MapQueryError>;
};

export class KillfeedCalibrationService extends Context.Tag(
  "@app/data/map/KillfeedCalibrationService"
)<KillfeedCalibrationService, KillfeedCalibrationServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<KillfeedCalibrationServiceInterface> =
  Effect.gen(function* () {
    function getKillfeedCalibration(
      mapDataId: number
    ): Effect.Effect<KillfeedCalibrationData | null, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapDataId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapDataId", mapDataId);
        const matchStart = yield* Effect.tryPromise({
          try: () =>
            prisma.matchStart.findFirst({
              where: { MapDataId: mapDataId },
              select: { map_name: true, map_type: true },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch match start for killfeed calibration",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.killfeed.calibration.fetchMatchStart", {
            attributes: { mapDataId },
          })
        );

        if (!matchStart) {
          wideEvent.outcome = "success";
          wideEvent.result = "no_match_start";
          yield* Metric.increment(killfeedCalibrationQuerySuccessTotal);
          return null;
        }

        wideEvent.map_name = matchStart.map_name;
        wideEvent.map_type = matchStart.map_type;

        const calibrations = new Map<string, LoadedCalibration>();

        if (
          matchStart.map_type === $Enums.MapType.Control &&
          isControlMap(matchStart.map_name)
        ) {
          const roundStarts = yield* Effect.tryPromise({
            try: () =>
              prisma.roundStart.findMany({
                where: { MapDataId: mapDataId },
                select: { match_time: true, objective_index: true },
                orderBy: { match_time: "asc" },
              }),
            catch: (error) =>
              new MapQueryError({
                operation: "fetch round starts for killfeed calibration",
                cause: error,
              }),
          });

          const seenIndices = new Set<number>();
          for (const rs of roundStarts) {
            seenIndices.add(rs.objective_index);
          }

          for (const idx of seenIndices) {
            const subMapName = getControlSubMapName(matchStart.map_name, idx);
            if (!subMapName) continue;
            const cal = yield* Effect.tryPromise({
              try: () => loadCalibration(subMapName),
              catch: (error) =>
                new MapQueryError({
                  operation: "load calibration for sub-map",
                  cause: error,
                }),
            });
            if (cal) calibrations.set(subMapName, cal);
          }

          wideEvent.calibration_count = calibrations.size;
          wideEvent.outcome = "success";
          yield* Metric.increment(killfeedCalibrationQuerySuccessTotal);

          return {
            calibrations,
            mapName: matchStart.map_name,
            mapType: matchStart.map_type,
            roundStarts,
          };
        }

        const cal = yield* Effect.tryPromise({
          try: () => loadCalibration(matchStart.map_name),
          catch: (error) =>
            new MapQueryError({
              operation: "load calibration for map",
              cause: error,
            }),
        });
        if (cal) calibrations.set(matchStart.map_name, cal);

        wideEvent.calibration_count = calibrations.size;
        wideEvent.outcome = "success";
        yield* Metric.increment(killfeedCalibrationQuerySuccessTotal);

        return {
          calibrations,
          mapName: matchStart.map_name,
          mapType: matchStart.map_type,
          roundStarts: [],
        };
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(killfeedCalibrationQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.killfeed.getKillfeedCalibration")
                : Effect.logInfo("map.killfeed.getKillfeedCalibration");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                killfeedCalibrationQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("map.killfeed.getKillfeedCalibration")
      );
    }

    const calibrationCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapDataId: number) =>
        getKillfeedCalibration(mapDataId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    return {
      getKillfeedCalibration: (mapDataId: number) =>
        calibrationCache
          .get(mapDataId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies KillfeedCalibrationServiceInterface;
  });

export const KillfeedCalibrationServiceLive = Layer.effect(
  KillfeedCalibrationService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
