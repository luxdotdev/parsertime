import { EffectObservabilityLive } from "@/instrumentation";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import { groupKillsIntoFights, type Fight } from "@/lib/utils";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapQueryError } from "../errors";
import {
  killfeedUltSpansQueryDuration,
  killfeedUltSpansQueryErrorTotal,
  killfeedUltSpansQuerySuccessTotal,
  mapCacheMissTotal,
  mapCacheRequestTotal,
} from "../metrics";
import type { FightUltimateData, UltimateSpan } from "./types";
export {
  getEventTime,
  hasAnyUltFeature,
  isKillDuringUlt,
  mergeKillfeedEvents,
} from "./types";

const INSTANT_ULT_THRESHOLD = 1.0;
const NO_END_ULT_WINDOW = 5.0;

function assignNestingDepths(spans: UltimateSpan[]): void {
  const sorted = spans.sort((a, b) => a.startTime - b.startTime);
  const activeEndTimes: number[] = [];

  for (const span of sorted) {
    while (
      activeEndTimes.length > 0 &&
      activeEndTimes[activeEndTimes.length - 1] <= span.startTime
    ) {
      activeEndTimes.pop();
    }

    span.depth = activeEndTimes.length;

    let insertIdx = activeEndTimes.length;
    for (let i = activeEndTimes.length - 1; i >= 0; i--) {
      if (activeEndTimes[i] <= span.endTime) break;
      insertIdx = i;
    }
    activeEndTimes.splice(insertIdx, 0, span.endTime);
  }
}

function assignSpanToFight(span: UltimateSpan, fights: Fight[]): number | null {
  for (let i = 0; i < fights.length; i++) {
    const fight = fights[i];
    if (span.startTime <= fight.end && span.endTime >= fight.start) {
      return i;
    }
  }
  return null;
}

export type KillfeedServiceInterface = {
  readonly getUltimateSpans: (
    mapId: number
  ) => Effect.Effect<FightUltimateData[], MapQueryError>;
};

export class KillfeedService extends Context.Tag(
  "@app/data/map/KillfeedService"
)<KillfeedService, KillfeedServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<KillfeedServiceInterface> = Effect.gen(
  function* () {
    function getUltimateSpans(
      mapId: number
    ): Effect.Effect<FightUltimateData[], MapQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { mapId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("mapId", mapId);
        const mapDataId = yield* Effect.tryPromise({
          try: () => resolveMapDataId(mapId),
          catch: (error) =>
            new MapQueryError({
              operation: "resolve map data id for killfeed",
              cause: error,
            }),
        });

        wideEvent.mapDataId = mapDataId;

        const [ultimateStarts, ultimateEnds, kills, fights] =
          yield* Effect.tryPromise({
            try: () =>
              Promise.all([
                prisma.ultimateStart.findMany({
                  where: { MapDataId: mapDataId },
                  orderBy: { match_time: "asc" },
                }),
                prisma.ultimateEnd.findMany({
                  where: { MapDataId: mapDataId },
                  orderBy: { match_time: "asc" },
                }),
                prisma.kill.findMany({
                  where: { MapDataId: mapDataId },
                  orderBy: { match_time: "asc" },
                }),
                groupKillsIntoFights(mapId),
              ]),
            catch: (error) =>
              new MapQueryError({
                operation: "fetch killfeed events and fights",
                cause: error,
              }),
          }).pipe(
            Effect.withSpan("map.killfeed.fetchEventsAndFights", {
              attributes: { mapId, mapDataId },
            })
          );

        if (fights.length === 0) {
          wideEvent.fight_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(killfeedUltSpansQuerySuccessTotal);
          const _empty: FightUltimateData[] = [];
          return _empty;
        }

        wideEvent.ult_start_count = ultimateStarts.length;
        wideEvent.ult_end_count = ultimateEnds.length;
        wideEvent.kill_count = kills.length;
        wideEvent.fight_count = fights.length;

        const spans: UltimateSpan[] = [];
        const pairedEndIds = new Set<number>();

        for (const start of ultimateStarts) {
          const end = ultimateEnds.find(
            (e) =>
              !pairedEndIds.has(e.id) &&
              e.ultimate_id === start.ultimate_id &&
              e.player_name === start.player_name &&
              e.match_time >= start.match_time
          );

          if (end) {
            pairedEndIds.add(end.id);
          }

          const hasEnd = !!end;
          const rawEndTime = end?.match_time ?? start.match_time;
          const duration = rawEndTime - start.match_time;
          const isInstant = !hasEnd || duration <= INSTANT_ULT_THRESHOLD;

          const effectiveEnd = hasEnd
            ? rawEndTime
            : start.match_time + NO_END_ULT_WINDOW;

          const killsDuringUlt = kills.filter(
            (k) =>
              k.attacker_name === start.player_name &&
              k.match_time >= start.match_time &&
              k.match_time <= effectiveEnd
          );

          const deathsDuringUlt = kills.filter(
            (k) =>
              k.victim_name === start.player_name &&
              k.match_time >= start.match_time &&
              k.match_time <= effectiveEnd
          );

          const diedDuringUlt = hasEnd
            ? deathsDuringUlt.some((k) => k.match_time === rawEndTime)
            : false;

          spans.push({
            id: start.id,
            ultimateId: start.ultimate_id,
            playerName: start.player_name,
            playerTeam: start.player_team,
            playerHero: start.player_hero,
            startTime: start.match_time,
            endTime: effectiveEnd,
            duration,
            depth: 0,
            isInstant,
            diedDuringUlt,
            killsDuringUlt,
            deathsDuringUlt,
          });
        }

        const fightDataMap = new Map<number, FightUltimateData>();

        for (let i = 0; i < fights.length; i++) {
          fightDataMap.set(i, {
            fightIndex: i,
            fightStart: fights[i].start,
            fightEnd: fights[i].end,
            spans: [],
          });
        }

        for (const span of spans) {
          const fightIdx = assignSpanToFight(span, fights);
          if (fightIdx !== null) {
            fightDataMap.get(fightIdx)!.spans.push(span);
          }
        }

        const result: FightUltimateData[] = [];
        for (const [, fightData] of fightDataMap) {
          if (fightData.spans.length > 0) {
            assignNestingDepths(fightData.spans);
          }
          result.push(fightData);
        }

        const sorted = result.sort((a, b) => a.fightIndex - b.fightIndex);

        wideEvent.span_count = spans.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(killfeedUltSpansQuerySuccessTotal);

        return sorted;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(killfeedUltSpansQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("map.killfeed.getUltimateSpans")
                : Effect.logInfo("map.killfeed.getUltimateSpans");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                killfeedUltSpansQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("map.killfeed.getUltimateSpans")
      );
    }

    const ultSpansCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (mapId: number) =>
        getUltimateSpans(mapId).pipe(
          Effect.tap(() => Metric.increment(mapCacheMissTotal))
        ),
    });

    return {
      getUltimateSpans: (mapId: number) =>
        ultSpansCache
          .get(mapId)
          .pipe(Effect.tap(() => Metric.increment(mapCacheRequestTotal))),
    } satisfies KillfeedServiceInterface;
  }
);

export const KillfeedServiceLive = Layer.effect(KillfeedService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
