import { EffectObservabilityLive } from "@/instrumentation";
import {
  aggregateStatsByPlayer,
  buildStatTrends,
  E_TEAM_SCRIM_WINDOW,
  POSITIONAL_STAT_TYPES,
  type TrendRow,
} from "@/lib/positional-rollups";
import prisma from "@/lib/prisma";
import { round } from "@/lib/utils";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TeamQueryError } from "./errors";
import {
  positionalStatsQueryDuration,
  positionalStatsQueryErrorTotal,
  positionalStatsQuerySuccessTotal,
  teamCacheMissTotal,
  teamCacheRequestTotal,
} from "./metrics";

export type TeamPositionalStats = {
  players: { playerName: string; stats: Record<string, number> }[];
  teamAverages: Record<string, number>;
  trends: Record<
    string,
    { scrimId: number; date: string; value: number }[]
  >;
  scrimWindow: number;
};

export type TeamPositionalStatsServiceInterface = {
  readonly getTeamPositionalStats: (
    teamId: number
  ) => Effect.Effect<TeamPositionalStats | null, TeamQueryError>;
};

export class TeamPositionalStatsService extends Context.Tag(
  "@app/data/team/TeamPositionalStatsService"
)<TeamPositionalStatsService, TeamPositionalStatsServiceInterface>() {}

const CACHE_TTL = Duration.minutes(5);
const CACHE_CAPACITY = 32;

export const make: Effect.Effect<TeamPositionalStatsServiceInterface> =
  Effect.gen(function* () {
    function getTeamPositionalStats(
      teamId: number
    ): Effect.Effect<TeamPositionalStats | null, TeamQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamId", teamId);

        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { teamId },
              select: { id: true, date: true },
              orderBy: { date: "desc" },
              take: E_TEAM_SCRIM_WINDOW,
            }),
          catch: (error) =>
            new TeamQueryError({
              operation: "getTeamPositionalStats.fetchScrims",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("team.positional_stats.fetchScrims", {
            attributes: { teamId },
          })
        );

        const scrimIds = scrims.map((s) => s.id);

        if (scrimIds.length === 0) {
          wideEvent.scrim_count = 0;
          wideEvent.outcome = "success";
          wideEvent.early_return = "no_scrims";
          yield* Metric.increment(positionalStatsQuerySuccessTotal);
          return null;
        }

        const rows = yield* Effect.tryPromise({
          try: () =>
            prisma.calculatedStat.findMany({
              where: {
                scrimId: { in: scrimIds },
                stat: { in: [...POSITIONAL_STAT_TYPES] },
              },
              select: {
                playerName: true,
                stat: true,
                value: true,
                scrimId: true,
              },
            }),
          catch: (error) =>
            new TeamQueryError({
              operation: "getTeamPositionalStats.fetchStats",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("team.positional_stats.fetchStats", {
            attributes: { teamId },
          })
        );

        if (rows.length === 0) {
          wideEvent.scrim_count = scrims.length;
          wideEvent.row_count = 0;
          wideEvent.outcome = "success";
          wideEvent.early_return = "no_rows";
          yield* Metric.increment(positionalStatsQuerySuccessTotal);
          return null;
        }

        const byPlayer = aggregateStatsByPlayer(rows);
        const players = Array.from(byPlayer, ([playerName, perStat]) => ({
          playerName,
          stats: Object.fromEntries(perStat),
        })).sort((a, b) => a.playerName.localeCompare(b.playerName));

        const statTotals = new Map<string, { total: number; n: number }>();
        for (const row of rows) {
          const acc = statTotals.get(row.stat) ?? { total: 0, n: 0 };
          acc.total += row.value;
          acc.n += 1;
          statTotals.set(row.stat, acc);
        }
        const teamAverages: Record<string, number> = {};
        for (const [stat, { total, n }] of statTotals) {
          teamAverages[stat] = round(total / n);
        }

        const dateByScrim = new Map<number, Date>();
        for (const s of scrims) dateByScrim.set(s.id, s.date);

        const trendRows: TrendRow[] = [];
        for (const row of rows) {
          const scrimDate = dateByScrim.get(row.scrimId);
          if (!scrimDate) continue;
          trendRows.push({
            stat: row.stat,
            value: row.value,
            scrimId: row.scrimId,
            scrimDate,
          });
        }

        const trendMap = buildStatTrends(trendRows);
        const trends: TeamPositionalStats["trends"] = {};
        for (const [stat, series] of trendMap) {
          trends[stat] = series.map((point) => ({
            scrimId: point.scrimId,
            date: point.date.toISOString(),
            value: point.value,
          }));
        }

        wideEvent.scrim_count = scrims.length;
        wideEvent.row_count = rows.length;
        wideEvent.player_count = players.length;
        wideEvent.stat_count = Object.keys(teamAverages).length;
        wideEvent.outcome = "success";
        yield* Metric.increment(positionalStatsQuerySuccessTotal);

        return {
          players,
          teamAverages,
          trends,
          scrimWindow: scrims.length,
        };
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(positionalStatsQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("team.getTeamPositionalStats")
                : Effect.logInfo("team.getTeamPositionalStats");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                positionalStatsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("team.getTeamPositionalStats")
      );
    }

    const cache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamId: number) =>
        getTeamPositionalStats(teamId).pipe(
          Effect.tap(() => Metric.increment(teamCacheMissTotal))
        ),
    });

    return {
      getTeamPositionalStats: (teamId: number) =>
        cache
          .get(teamId)
          .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    } satisfies TeamPositionalStatsServiceInterface;
  });

export const TeamPositionalStatsServiceLive = Layer.effect(
  TeamPositionalStatsService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
