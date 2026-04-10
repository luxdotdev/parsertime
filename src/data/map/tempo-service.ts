import { EffectObservabilityLive } from "@/instrumentation";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  type Fight,
} from "@/lib/utils";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "./errors";
import {
  mapCacheMissTotal,
  mapCacheRequestTotal,
  tempoQueryDuration,
  tempoQueryErrorTotal,
  tempoQuerySuccessTotal,
} from "./metrics";

export type {
  TempoDataPoint,
  UltPin,
  FightBoundary,
  KillPin,
  TempoChartData,
} from "./types";
export { tempoPointsToSvgPath } from "./types";

import type {
  TempoDataPoint,
  FightBoundary,
  KillPin,
  UltPin,
  TempoChartData,
} from "./types";

type WeightedEvent = { time: number; weight: number };

const SIGMA = 5;
const SAMPLE_INTERVAL = 0.5;
const TWO_SIGMA_SQ = 2 * SIGMA * SIGMA;

function gaussianKDE(
  events: WeightedEvent[],
  sampleStart: number,
  sampleEnd: number
): number[] {
  const n = Math.ceil((sampleEnd - sampleStart) / SAMPLE_INTERVAL) + 1;
  const values = new Array<number>(n).fill(0);

  for (const e of events) {
    const lo = Math.max(
      0,
      Math.floor((e.time - 3 * SIGMA - sampleStart) / SAMPLE_INTERVAL)
    );
    const hi = Math.min(
      n - 1,
      Math.ceil((e.time + 3 * SIGMA - sampleStart) / SAMPLE_INTERVAL)
    );
    for (let i = lo; i <= hi; i++) {
      const t = sampleStart + i * SAMPLE_INTERVAL;
      const diff = t - e.time;
      values[i] += e.weight * Math.exp(-(diff * diff) / TWO_SIGMA_SQ);
    }
  }

  return values;
}

export function computeTempoSeries(
  kills: { match_time: number; attacker_team: string }[],
  ultStarts: { match_time: number; player_team: string }[],
  team1Name: string,
  matchStart: number,
  matchEnd: number,
  mode: "combined" | "kills" | "ults"
): TempoDataPoint[] {
  const killWeight = 1.0;
  const ultWeight = 0.6;

  const team1Events: WeightedEvent[] = [];
  const team2Events: WeightedEvent[] = [];

  if (mode === "combined" || mode === "kills") {
    for (const k of kills) {
      const entry = { time: k.match_time, weight: killWeight };
      if (k.attacker_team === team1Name) {
        team1Events.push(entry);
      } else {
        team2Events.push(entry);
      }
    }
  }

  if (mode === "combined" || mode === "ults") {
    for (const u of ultStarts) {
      const entry = { time: u.match_time, weight: ultWeight };
      if (u.player_team === team1Name) {
        team1Events.push(entry);
      } else {
        team2Events.push(entry);
      }
    }
  }

  const t1Values = gaussianKDE(team1Events, matchStart, matchEnd);
  const t2Values = gaussianKDE(team2Events, matchStart, matchEnd);

  let maxVal = 0;
  for (let i = 0; i < t1Values.length; i++) {
    maxVal = Math.max(maxVal, t1Values[i], t2Values[i]);
  }
  if (maxVal === 0) maxVal = 1;

  const series: TempoDataPoint[] = [];
  for (let i = 0; i < t1Values.length; i++) {
    series.push({
      time: matchStart + i * SAMPLE_INTERVAL,
      team1: t1Values[i] / maxVal,
      team2: t2Values[i] / maxVal,
    });
  }

  return series;
}

export function fightsToBoundaries(fights: Fight[]): FightBoundary[] {
  return fights.map((f, i) => ({
    start: f.start,
    end: f.end,
    fightNumber: i + 1,
  }));
}

export type TempoServiceInterface = {
  readonly getTempoChartData: (
    mapId: number
  ) => Effect.Effect<TempoChartData | null, MapQueryError>;
};

export class TempoService extends Context.Tag("@app/data/map/TempoService")<
  TempoService,
  TempoServiceInterface
>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<TempoServiceInterface> = Effect.gen(
  function* () {
    function getTempoChartData(
      mapId: number
    ): Effect.Effect<TempoChartData | null, MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapId", mapId);
        const mapDataId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapId),
          catch: (error) =>
            new MapQueryError({
              operation: "resolve map data id for tempo",
              cause: error,
            }),
        });

        wideEvent.mapDataId = mapDataId;

        const [
          kills,
          ultStarts,
          matchStartRecord,
          matchEndRecord,
          mercyRezzes,
        ] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.kill.findMany({ where: { MapDataId: mapDataId } }),
              prisma.ultimateStart.findMany({
                where: { MapDataId: mapDataId },
              }),
              prisma.matchStart.findFirst({
                where: { MapDataId: mapDataId },
              }),
              prisma.matchEnd.findFirst({ where: { MapDataId: mapDataId } }),
              prisma.mercyRez.findMany({ where: { MapDataId: mapDataId } }),
            ]),
          catch: (error) =>
            new MapQueryError({
              operation: "fetch tempo chart data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("map.tempo.fetchAllTables", {
            attributes: { mapId, mapDataId },
          })
        );

        if (!matchStartRecord || !matchEndRecord) {
          wideEvent.outcome = "success";
          wideEvent.result = "no_match_records";
          yield* Metric.increment(tempoQuerySuccessTotal);
          return null;
        }

        if (kills.length < 3) {
          wideEvent.outcome = "success";
          wideEvent.result = "insufficient_kills";
          wideEvent.kill_count = kills.length;
          yield* Metric.increment(tempoQuerySuccessTotal);
          return null;
        }

        const team1Name = matchStartRecord.team_1_name;
        const team2Name = matchStartRecord.team_2_name;
        const matchStartTime = matchStartRecord.match_time;
        const matchEndTime = matchEndRecord.match_time;

        wideEvent.team1 = team1Name;
        wideEvent.team2 = team2Name;
        wideEvent.kill_count = kills.length;
        wideEvent.ult_start_count = ultStarts.length;

        const allKillEvents = [
          ...kills,
          ...mercyRezzes.map(mercyRezToKillEvent),
        ].sort((a, b) => a.match_time - b.match_time);
        const fights = groupEventsIntoFights(allKillEvents);
        const fightBoundaries = fightsToBoundaries(fights);

        const combinedSeries = computeTempoSeries(
          kills,
          ultStarts,
          team1Name,
          matchStartTime,
          matchEndTime,
          "combined"
        );
        const killsSeries = computeTempoSeries(
          kills,
          ultStarts,
          team1Name,
          matchStartTime,
          matchEndTime,
          "kills"
        );
        const ultsSeries = computeTempoSeries(
          kills,
          ultStarts,
          team1Name,
          matchStartTime,
          matchEndTime,
          "ults"
        );

        const ultPins: UltPin[] = ultStarts.map((u) => ({
          time: u.match_time,
          hero: u.player_hero,
          playerName: u.player_name,
          team: u.player_team === team1Name ? "team1" : "team2",
        }));

        const killPins: KillPin[] = kills.map((k) => ({
          time: k.match_time,
          hero: k.attacker_hero,
          playerName: k.attacker_name,
          victimHero: k.victim_hero,
          victimName: k.victim_name,
          team: k.attacker_team === team1Name ? "team1" : "team2",
        }));

        wideEvent.fight_count = fights.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(tempoQuerySuccessTotal);

        return {
          combinedSeries,
          killsSeries,
          ultsSeries,
          ultPins,
          killPins,
          fightBoundaries,
          matchStartTime,
          matchEndTime,
          team1Name,
          team2Name,
        };
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(tempoQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.tempo.getTempoChartData")
                : Effect.logInfo("map.tempo.getTempoChartData");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(tempoQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("map.tempo.getTempoChartData")
      );
    }

    const tempoCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapId: number) =>
        getTempoChartData(mapId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    return {
      getTempoChartData: (mapId: number) =>
        tempoCache
          .get(mapId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies TempoServiceInterface;
  }
);

export const TempoServiceLive = Layer.effect(TempoService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
