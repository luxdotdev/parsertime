import prisma from "@/lib/prisma";
import { assembleMapInitiation } from "@/lib/fight-initiation";
import {
  initiationRates,
  mergeTallies,
  tallyMapForTeam,
  type InitiationTally,
} from "@/lib/fight-initiation-rollups";
import {
  Cache,
  Context,
  Duration,
  Effect,
  Layer,
  Metric,
  MetricBoundaries,
} from "effect";
import { ScrimQueryError } from "./errors";
import type { ScrimInitiationData, ScrimTeamInitiation } from "./types";
export type { ScrimInitiationData } from "./types";

const scrimInitiationSuccessTotal = Metric.counter(
  "scrim.initiation.query.success",
  { description: "Total successful scrim initiation queries", incremental: true }
);
const scrimInitiationErrorTotal = Metric.counter(
  "scrim.initiation.query.error",
  { description: "Total scrim initiation query failures", incremental: true }
);
const scrimInitiationDuration = Metric.histogram(
  "scrim.initiation.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of scrim initiation query duration in milliseconds"
);

function emptyScrimInitiation(): ScrimInitiationData {
  return { teams: [], totalFights: 0, contestedFights: 0, mapsCovered: 0, mapsTotal: 0 };
}

export type ScrimInitiationServiceInterface = {
  readonly getScrimInitiation: (
    scrimId: number
  ) => Effect.Effect<ScrimInitiationData, ScrimQueryError>;
};

export class ScrimInitiationService extends Context.Tag(
  "@app/data/scrim/ScrimInitiationService"
)<ScrimInitiationService, ScrimInitiationServiceInterface>() {}

export const make = Effect.gen(function* () {
  function getScrimInitiation(
    scrimId: number
  ): Effect.Effect<ScrimInitiationData, ScrimQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { scrimId };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("scrimId", scrimId);

      const mapRecords = yield* Effect.tryPromise({
        try: () =>
          prisma.map.findMany({
            where: { scrimId },
            select: { mapData: { select: { id: true } } },
          }),
        catch: (error) =>
          new ScrimQueryError({ operation: "fetch scrim maps for initiation", cause: error }),
      });
      const mapDataIds = mapRecords.flatMap((m) => m.mapData.map((md) => md.id));

      if (mapDataIds.length === 0) {
        wideEvent.outcome = "success";
        yield* Metric.increment(scrimInitiationSuccessTotal);
        return emptyScrimInitiation();
      }

      // Per-team accumulators keyed by team name.
      const byTeam = new Map<string, InitiationTally[]>();
      let totalFights = 0;
      let contestedFights = 0;
      let mapsCovered = 0;

      for (const mapDataId of mapDataIds) {
        const [kills, rezzes, damage, ability1, ability2, ults] =
          yield* Effect.tryPromise({
            try: () =>
              Promise.all([
                prisma.kill.findMany({ where: { MapDataId: mapDataId } }),
                prisma.mercyRez.findMany({ where: { MapDataId: mapDataId } }),
                prisma.damage.findMany({
                  where: { MapDataId: mapDataId },
                  select: {
                    match_time: true,
                    attacker_name: true,
                    attacker_team: true,
                    victim_name: true,
                    victim_team: true,
                    event_damage: true,
                  },
                }),
                prisma.ability1Used.findMany({
                  where: { MapDataId: mapDataId },
                  select: { match_time: true, player_name: true, player_team: true },
                }),
                prisma.ability2Used.findMany({
                  where: { MapDataId: mapDataId },
                  select: { match_time: true, player_name: true, player_team: true },
                }),
                prisma.ultimateStart.findMany({ where: { MapDataId: mapDataId } }),
              ]),
            catch: (error) =>
              new ScrimQueryError({ operation: "fetch scrim map initiation events", cause: error }),
          });

        const result = assembleMapInitiation({
          kills,
          rezzes,
          damage,
          ability1,
          ability2,
          ults,
          healing: [],
          roundStarts: [],
          roundEnds: [],
        });
        if (!result.available || !result.summary) continue;

        mapsCovered++;
        totalFights += result.summary.totalFights;
        contestedFights += result.summary.contestedFights;
        for (const teamName of result.summary.teams) {
          const tally = tallyMapForTeam(result.labels, teamName);
          const list = byTeam.get(teamName);
          if (list) list.push(tally);
          else byTeam.set(teamName, [tally]);
        }
      }

      const teams: ScrimTeamInitiation[] = Array.from(byTeam, ([teamName, tallies]) => {
        const merged = mergeTallies(tallies);
        const rates = initiationRates(merged);
        return {
          teamName,
          wentFirst: merged.wentFirst,
          wentFirstWins: merged.wentFirstWins,
          wentSecond: merged.wentSecond,
          wentSecondWins: merged.wentSecondWins,
          decidedFights: merged.decidedFights,
          ...rates,
        };
      }).sort((a, b) => b.wentFirst - a.wentFirst);

      const data: ScrimInitiationData = {
        teams,
        totalFights,
        contestedFights,
        mapsCovered,
        mapsTotal: mapDataIds.length,
      };

      wideEvent.outcome = "success";
      wideEvent.maps_covered = mapsCovered;
      wideEvent.total_fights = totalFights;
      yield* Metric.increment(scrimInitiationSuccessTotal);
      return data;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(scrimInitiationErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("scrim.initiation.getScrimInitiation")
              : Effect.logInfo("scrim.initiation.getScrimInitiation");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(scrimInitiationDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("scrim.initiation.getScrimInitiation")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const initiationCache = yield* Cache.make({
    capacity: 64,
    timeToLive: CACHE_TTL,
    lookup: (scrimId: number) => getScrimInitiation(scrimId),
  });

  return {
    getScrimInitiation: (scrimId: number) => initiationCache.get(scrimId),
  } satisfies ScrimInitiationServiceInterface;
});

export const ScrimInitiationServiceLive = Layer.effect(ScrimInitiationService, make);
