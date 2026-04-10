import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import type { TargetStatKey } from "@/lib/target-stats";
import { removeDuplicateRows, toMins } from "@/lib/utils";
import type { PlayerStat, PlayerTarget } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TargetsQueryError } from "./errors";
import {
  playerCacheRequestTotal,
  playerCacheMissTotal,
  playerTargetsQueryDuration,
  playerTargetsQueryErrorTotal,
  playerTargetsQuerySuccessTotal,
  recentScrimStatsQueryDuration,
  recentScrimStatsQueryErrorTotal,
  recentScrimStatsQuerySuccessTotal,
  teamTargetsQueryDuration,
  teamTargetsQueryErrorTotal,
  teamTargetsQuerySuccessTotal,
} from "./metrics";
import type { ScrimStatPoint, TargetProgress } from "./types";

export function calculateTargetProgress(
  target: PlayerTarget,
  recentStats: ScrimStatPoint[]
): Omit<TargetProgress, "target"> {
  if (recentStats.length === 0) {
    return {
      currentValue: target.baselineValue,
      progressPercent: 0,
      trending: "neutral",
    };
  }

  const values = recentStats
    .map((s) => s.stats[target.stat])
    .filter((v) => v !== undefined && isFinite(v));

  if (values.length === 0) {
    return {
      currentValue: target.baselineValue,
      progressPercent: 0,
      trending: "neutral",
    };
  }

  const currentValue = values.reduce((a, b) => a + b, 0) / values.length;

  const multiplier =
    target.targetDirection === "increase"
      ? 1 + target.targetPercent / 100
      : 1 - target.targetPercent / 100;
  const targetValue = target.baselineValue * multiplier;

  const totalDistance = targetValue - target.baselineValue;
  if (Math.abs(totalDistance) < 0.001) {
    return { currentValue, progressPercent: 100, trending: "neutral" };
  }

  const currentDistance = currentValue - target.baselineValue;
  const progressPercent = Math.min(
    100,
    Math.max(0, (currentDistance / totalDistance) * 100)
  );

  let trending: "toward" | "away" | "neutral" = "neutral";
  if (values.length >= 2) {
    const recentHalf = values.slice(Math.floor(values.length / 2));
    const earlierHalf = values.slice(0, Math.floor(values.length / 2));
    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
    const earlierAvg =
      earlierHalf.reduce((a, b) => a + b, 0) / earlierHalf.length;

    const diff = recentAvg - earlierAvg;
    if (target.targetDirection === "increase") {
      trending = diff > 0 ? "toward" : diff < 0 ? "away" : "neutral";
    } else {
      trending = diff < 0 ? "toward" : diff > 0 ? "away" : "neutral";
    }
  }

  return { currentValue, progressPercent, trending };
}

type PlayerTargetWithCreator = PlayerTarget & {
  creator: { name: string | null; email: string };
};

export type TargetsServiceInterface = {
  readonly getPlayerTargets: (
    teamId: number,
    playerName: string
  ) => Effect.Effect<PlayerTargetWithCreator[], TargetsQueryError>;

  readonly getTeamTargets: (
    teamId: number
  ) => Effect.Effect<
    Record<string, PlayerTargetWithCreator[]>,
    TargetsQueryError
  >;

  readonly getRecentScrimStats: (
    playerName: string,
    teamId: number,
    scrimCount: number
  ) => Effect.Effect<ScrimStatPoint[], TargetsQueryError>;
};

export class TargetsService extends Context.Tag(
  "@app/data/player/TargetsService"
)<TargetsService, TargetsServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<TargetsServiceInterface> = Effect.gen(
  function* () {
    function getPlayerTargets(
      teamId: number,
      playerName: string
    ): Effect.Effect<PlayerTargetWithCreator[], TargetsQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamId, playerName };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        yield* Effect.annotateCurrentSpan("playerName", playerName);
        const targets = yield* Effect.tryPromise({
          try: () =>
            prisma.playerTarget.findMany({
              where: {
                teamId,
                playerName: { equals: playerName, mode: "insensitive" },
              },
              include: { creator: { select: { name: true, email: true } } },
              orderBy: { createdAt: "desc" },
            }),
          catch: (error) =>
            new TargetsQueryError({
              operation: "fetch player targets",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("player.targets.fetchPlayerTargets", {
            attributes: { teamId, playerName },
          })
        );

        wideEvent.target_count = targets.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(playerTargetsQuerySuccessTotal);
        return targets;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(playerTargetsQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("player.getPlayerTargets")
                : Effect.logInfo("player.getPlayerTargets");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                playerTargetsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("player.getPlayerTargets")
      );
    }

    function getTeamTargets(
      teamId: number
    ): Effect.Effect<
      Record<string, PlayerTargetWithCreator[]>,
      TargetsQueryError
    > {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        const targets = yield* Effect.tryPromise({
          try: () =>
            prisma.playerTarget.findMany({
              where: { teamId },
              include: { creator: { select: { name: true, email: true } } },
              orderBy: { createdAt: "desc" },
            }),
          catch: (error) =>
            new TargetsQueryError({
              operation: "fetch team targets",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("player.targets.fetchTeamTargets", {
            attributes: { teamId },
          })
        );

        const grouped: Record<string, PlayerTargetWithCreator[]> = {};
        for (const target of targets) {
          if (!grouped[target.playerName]) {
            grouped[target.playerName] = [];
          }
          grouped[target.playerName].push(target);
        }

        wideEvent.target_count = targets.length;
        wideEvent.player_count = Object.keys(grouped).length;
        wideEvent.outcome = "success";
        yield* Metric.increment(teamTargetsQuerySuccessTotal);
        return grouped;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(teamTargetsQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("player.getTeamTargets")
                : Effect.logInfo("player.getTeamTargets");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                teamTargetsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("player.getTeamTargets")
      );
    }

    function getRecentScrimStats(
      playerName: string,
      teamId: number,
      scrimCount: number
    ): Effect.Effect<ScrimStatPoint[], TargetsQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        playerName,
        teamId,
        scrimCount,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("playerName", playerName);
        yield* Effect.annotateCurrentSpan("teamId", teamId);
        yield* Effect.annotateCurrentSpan("scrimCount", scrimCount);
        const recentScrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { teamId },
              orderBy: { date: "desc" },
              take: scrimCount,
              select: {
                id: true,
                date: true,
                name: true,
                maps: {
                  select: {
                    id: true,
                    mapData: { select: { id: true } },
                  },
                },
              },
            }),
          catch: (error) =>
            new TargetsQueryError({
              operation: "fetch recent scrims",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("player.targets.fetchRecentScrims", {
            attributes: { teamId, scrimCount },
          })
        );

        if (recentScrims.length === 0) {
          wideEvent.scrim_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(recentScrimStatsQuerySuccessTotal);
          const _empty: ScrimStatPoint[] = []; return _empty;
        }

        const mapIds = recentScrims.flatMap((s) =>
          s.maps.flatMap((m) => m.mapData.map((md) => md.id))
        );

        if (mapIds.length === 0) {
          wideEvent.scrim_count = recentScrims.length;
          wideEvent.map_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(recentScrimStatsQuerySuccessTotal);
          const _empty: ScrimStatPoint[] = []; return _empty;
        }

        const stats = yield* Effect.tryPromise({
          try: async () => {
            const raw = await prisma.$queryRaw<PlayerStat[]>`
            WITH maxTime AS (
              SELECT
                  MAX("match_time") AS max_time,
                  "MapDataId"
              FROM
                  "PlayerStat"
              WHERE
                  "MapDataId" IN (${Prisma.join(mapIds)})
              GROUP BY
                  "MapDataId"
            )
            SELECT
                ps.*
            FROM
                "PlayerStat" ps
                INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
            WHERE
                ps."MapDataId" IN (${Prisma.join(mapIds)})
                AND ps."player_name" ILIKE ${playerName}`;
            return removeDuplicateRows(raw);
          },
          catch: (error) =>
            new TargetsQueryError({
              operation: "fetch recent scrim player stats",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("player.targets.fetchScrimPlayerStats", {
            attributes: { playerName, teamId, mapCount: mapIds.length },
          })
        );

        const results: ScrimStatPoint[] = [];
        for (const scrim of recentScrims) {
          const scrimMapIds = new Set(
            scrim.maps.flatMap((m) => m.mapData.map((md) => md.id))
          );
          const scrimStats = stats.filter((s) => scrimMapIds.has(s.MapDataId!));

          if (scrimStats.length === 0) continue;

          const totalTime = scrimStats.reduce(
            (sum, s) => sum + s.hero_time_played,
            0
          );
          const timeMins = toMins(totalTime);
          if (timeMins <= 0) continue;

          const statKeys: TargetStatKey[] = [
            "eliminations",
            "deaths",
            "hero_damage_dealt",
            "damage_taken",
            "damage_blocked",
            "final_blows",
            "healing_dealt",
            "ultimates_earned",
          ];

          const per10Stats: Record<string, number> = {};
          for (const key of statKeys) {
            const total = scrimStats.reduce(
              (sum, s) => sum + (Number(s[key]) || 0),
              0
            );
            per10Stats[key] = (total / timeMins) * 10;
          }

          results.push({
            scrimId: scrim.id,
            scrimDate: scrim.date.toISOString(),
            scrimName: scrim.name,
            stats: per10Stats,
          });
        }

        results.sort(
          (a, b) =>
            new Date(a.scrimDate).getTime() - new Date(b.scrimDate).getTime()
        );

        wideEvent.scrim_count = recentScrims.length;
        wideEvent.result_count = results.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(recentScrimStatsQuerySuccessTotal);
        return results;
      }).pipe(
        Effect.tapError((error: TargetsQueryError) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(recentScrimStatsQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("player.getRecentScrimStats")
                : Effect.logInfo("player.getRecentScrimStats");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                recentScrimStatsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("player.getRecentScrimStats")
      );
    }

    const playerTargetsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [teamId, playerName] = JSON.parse(key) as [number, string];
        return getPlayerTargets(teamId, playerName).pipe(
          Effect.tap(() => Metric.increment(playerCacheMissTotal))
        );
      },
    });

    const teamTargetsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamId: number) =>
        getTeamTargets(teamId).pipe(
          Effect.tap(() => Metric.increment(playerCacheMissTotal))
        ),
    });

    const recentScrimStatsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [playerName, teamId, scrimCount] = JSON.parse(key) as [
          string,
          number,
          number,
        ];
        return getRecentScrimStats(playerName, teamId, scrimCount).pipe(
          Effect.tap(() => Metric.increment(playerCacheMissTotal))
        );
      },
    });

    return {
      getPlayerTargets: (teamId: number, playerName: string) =>
        playerTargetsCache
          .get(JSON.stringify([teamId, playerName]))
          .pipe(Effect.tap(() => Metric.increment(playerCacheRequestTotal))),
      getTeamTargets: (teamId: number) =>
        teamTargetsCache
          .get(teamId)
          .pipe(Effect.tap(() => Metric.increment(playerCacheRequestTotal))),
      getRecentScrimStats: (
        playerName: string,
        teamId: number,
        scrimCount: number
      ) =>
        recentScrimStatsCache
          .get(JSON.stringify([playerName, teamId, scrimCount]))
          .pipe(Effect.tap(() => Metric.increment(playerCacheRequestTotal))),
    } satisfies TargetsServiceInterface;
  }
);

export const TargetsServiceLive = Layer.effect(TargetsService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
