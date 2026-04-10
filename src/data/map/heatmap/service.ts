import { EffectObservabilityLive } from "@/instrumentation";
import {
  getControlSubMapName,
  getControlSubMapNames,
  isControlMap,
} from "@/lib/map-calibration/control-map-index";
import { loadCalibration } from "@/lib/map-calibration/load-calibration";
import type { MapTransform } from "@/lib/map-calibration/types";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "../errors";
import {
  heatmapQueryDuration,
  heatmapQueryErrorTotal,
  heatmapQuerySuccessTotal,
  mapCacheMissTotal,
  mapCacheRequestTotal,
} from "../metrics";
import type {
  EventsByCategory,
  HeatmapData,
  HeatmapSubMap,
  KillPoint,
  TimedCoord,
  TimedKillCoord,
} from "./types";

type Point = { u: number; v: number };

function toImagePoint(
  x: number | null,
  z: number | null,
  transform: MapTransform
): Point | null {
  if (x == null || z == null) return null;
  return worldToImage({ x, y: z }, transform);
}

function convertPoints(events: TimedCoord[], transform: MapTransform): Point[] {
  const result: Point[] = [];
  for (const e of events) {
    const p = toImagePoint(e.x, e.z, transform);
    if (p) result.push(p);
  }
  return result;
}

function convertKillPoints(
  events: TimedKillCoord[],
  transform: MapTransform,
  team1Name: string
): KillPoint[] {
  const result: KillPoint[] = [];
  for (const e of events) {
    const p = toImagePoint(e.x, e.z, transform);
    if (p) {
      result.push({
        ...p,
        team: e.victim_team === team1Name ? 1 : 2,
        attackerName: e.attacker_name,
        attackerHero: e.attacker_hero,
        victimName: e.victim_name,
        victimHero: e.victim_hero,
        ability: e.event_ability,
        matchTime: e.match_time,
      });
    }
  }
  return result;
}

function buildSubMap(
  calibrationMapName: string,
  cal: NonNullable<Awaited<ReturnType<typeof loadCalibration>>>,
  events: EventsByCategory,
  team1Name: string
): HeatmapSubMap {
  const colonIdx = calibrationMapName.indexOf(": ");
  const displayName =
    colonIdx >= 0 ? calibrationMapName.slice(colonIdx + 2) : calibrationMapName;

  return {
    subMapName: displayName,
    calibrationMapName,
    imagePresignedUrl: cal.imagePresignedUrl,
    imageWidth: cal.imageWidth,
    imageHeight: cal.imageHeight,
    damagePoints: convertPoints(events.damage, cal.transform),
    healingPoints: convertPoints(events.healing, cal.transform),
    killPoints: convertKillPoints(events.kills, cal.transform, team1Name),
  };
}

function assignToRound(
  matchTime: number,
  roundStarts: { match_time: number; objective_index: number }[]
): number {
  for (let i = roundStarts.length - 1; i >= 0; i--) {
    if (matchTime >= roundStarts[i].match_time) {
      return roundStarts[i].objective_index;
    }
  }
  return 0;
}

export type HeatmapServiceInterface = {
  readonly getHeatmapData: (
    mapDataId: number
  ) => Effect.Effect<HeatmapData, MapQueryError>;
};

export class HeatmapService extends Context.Tag("@app/data/map/HeatmapService")<
  HeatmapService,
  HeatmapServiceInterface
>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<HeatmapServiceInterface> = Effect.gen(
  function* () {
    function fetchEvents(
      mapDataId: number
    ): Effect.Effect<EventsByCategory, MapQueryError> {
      return Effect.tryPromise({
        try: () =>
          Promise.all([
            prisma.damage.findMany({
              where: { MapDataId: mapDataId },
              select: { match_time: true, victim_x: true, victim_z: true },
            }),
            prisma.healing.findMany({
              where: { MapDataId: mapDataId },
              select: { match_time: true, healer_x: true, healer_z: true },
            }),
            prisma.kill.findMany({
              where: { MapDataId: mapDataId },
              select: {
                match_time: true,
                victim_x: true,
                victim_z: true,
                victim_team: true,
                attacker_name: true,
                attacker_hero: true,
                victim_name: true,
                victim_hero: true,
                event_ability: true,
              },
            }),
          ]),
        catch: (error) =>
          new MapQueryError({
            operation: "fetch heatmap events",
            cause: error,
          }),
      }).pipe(
        Effect.map(([damageRows, healingRows, killRows]) => ({
          damage: damageRows.map((r) => ({
            match_time: r.match_time,
            x: r.victim_x,
            z: r.victim_z,
          })),
          healing: healingRows.map((r) => ({
            match_time: r.match_time,
            x: r.healer_x,
            z: r.healer_z,
          })),
          kills: killRows.map((r) => ({
            match_time: r.match_time,
            x: r.victim_x,
            z: r.victim_z,
            victim_team: r.victim_team,
            attacker_name: r.attacker_name,
            attacker_hero: r.attacker_hero,
            victim_name: r.victim_name,
            victim_hero: r.victim_hero,
            event_ability: r.event_ability,
          })),
        })),
        Effect.withSpan("map.heatmap.fetchEvents", {
          attributes: { mapDataId },
        })
      );
    }

    function getControlHeatmapData(
      mapName: string,
      mapDataId: number,
      events: EventsByCategory,
      team1Name: string
    ): Effect.Effect<HeatmapData, MapQueryError> {
      return Effect.gen(function* () {
        const roundStarts = yield* Effect.tryPromise({
          try: () =>
            prisma.roundStart.findMany({
              where: { MapDataId: mapDataId },
              select: { match_time: true, objective_index: true },
              orderBy: { match_time: "asc" },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch round starts for control heatmap",
              cause: error,
            }),
        });

        function splitBySubMap(
          coords: TimedCoord[]
        ): Map<string, TimedCoord[]> {
          const result = new Map<string, TimedCoord[]>();
          for (const c of coords) {
            const idx = assignToRound(c.match_time, roundStarts);
            const name = getControlSubMapName(mapName, idx);
            if (!name) continue;
            const arr = result.get(name) ?? [];
            arr.push(c);
            result.set(name, arr);
          }
          return result;
        }

        const damageBySubMap = splitBySubMap(events.damage);
        const healingBySubMap = splitBySubMap(events.healing);
        const killsBySubMap = splitBySubMap(events.kills);

        const allSubMapNames = getControlSubMapNames(mapName);
        const subMaps: HeatmapSubMap[] = [];

        for (const calibrationMapName of allSubMapNames) {
          const cal = yield* Effect.tryPromise({
            try: () => loadCalibration(calibrationMapName),
            catch: (error) =>
              new MapQueryError({
                operation: "load calibration for sub-map",
                cause: error,
              }),
          });
          if (!cal) continue;

          const subEvents: EventsByCategory = {
            damage: damageBySubMap.get(calibrationMapName) ?? [],
            healing: healingBySubMap.get(calibrationMapName) ?? [],
            kills: (killsBySubMap.get(calibrationMapName) ??
              []) as TimedKillCoord[],
          };

          subMaps.push(
            buildSubMap(calibrationMapName, cal, subEvents, team1Name)
          );
        }

        if (subMaps.length === 0) return { type: "no_calibration" } as const;

        return { type: "control", subMaps } as const;
      });
    }

    function getHeatmapData(
      mapDataId: number
    ): Effect.Effect<HeatmapData, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapDataId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapDataId", mapDataId);
        const matchStart = yield* Effect.tryPromise({
          try: () =>
            prisma.matchStart.findFirst({
              where: { MapDataId: mapDataId },
              select: { map_name: true, map_type: true, team_1_name: true },
            }),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch match start for heatmap",
              cause: error,
            }),
        });

        if (!matchStart) {
          wideEvent.outcome = "success";
          wideEvent.result_type = "no_calibration";
          yield* Metric.increment(heatmapQuerySuccessTotal);
          return { type: "no_calibration" } as const;
        }

        wideEvent.map_name = matchStart.map_name;
        wideEvent.map_type = matchStart.map_type;

        const events = yield* fetchEvents(mapDataId);

        const hasCoords =
          events.damage.some((e) => e.x != null && e.z != null) ||
          events.healing.some((e) => e.x != null && e.z != null) ||
          events.kills.some((e) => e.x != null && e.z != null);

        if (!hasCoords) {
          wideEvent.outcome = "success";
          wideEvent.result_type = "no_coordinates";
          yield* Metric.increment(heatmapQuerySuccessTotal);
          return { type: "no_coordinates" } as const;
        }

        wideEvent.damage_count = events.damage.length;
        wideEvent.healing_count = events.healing.length;
        wideEvent.kill_count = events.kills.length;

        if (
          matchStart.map_type === $Enums.MapType.Control &&
          isControlMap(matchStart.map_name)
        ) {
          const result = yield* getControlHeatmapData(
            matchStart.map_name,
            mapDataId,
            events,
            matchStart.team_1_name
          );
          wideEvent.outcome = "success";
          wideEvent.result_type = result.type;
          yield* Metric.increment(heatmapQuerySuccessTotal);
          return result;
        }

        const cal = yield* Effect.tryPromise({
          try: () => loadCalibration(matchStart.map_name),
          catch: (error) =>
            new MapQueryError({
              operation: "load calibration for map",
              cause: error,
            }),
        });
        if (!cal) {
          wideEvent.outcome = "success";
          wideEvent.result_type = "no_calibration";
          yield* Metric.increment(heatmapQuerySuccessTotal);
          return { type: "no_calibration" } as const;
        }

        wideEvent.outcome = "success";
        wideEvent.result_type = "single";
        yield* Metric.increment(heatmapQuerySuccessTotal);

        return {
          type: "single",
          subMap: buildSubMap(
            matchStart.map_name,
            cal,
            events,
            matchStart.team_1_name
          ),
        } as const;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(heatmapQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.heatmap.getHeatmapData")
                : Effect.logInfo("map.heatmap.getHeatmapData");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(heatmapQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("map.heatmap.getHeatmapData")
      );
    }

    const heatmapCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapDataId: number) =>
        getHeatmapData(mapDataId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    return {
      getHeatmapData: (mapDataId: number) =>
        heatmapCache
          .get(mapDataId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies HeatmapServiceInterface;
  }
);

export const HeatmapServiceLive = Layer.effect(HeatmapService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
