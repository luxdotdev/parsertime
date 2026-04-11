import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { TournamentTeamQueryError } from "./errors";
import {
  ttBaseDataQueryDuration,
  ttBaseDataQueryErrorTotal,
  ttBaseDataQuerySuccessTotal,
  ttRosterQueryDuration,
  ttRosterQueryErrorTotal,
  ttRosterQuerySuccessTotal,
  ttExtendedDataQueryDuration,
  ttExtendedDataQueryErrorTotal,
  ttExtendedDataQuerySuccessTotal,
  ttCacheRequestTotal,
  ttCacheMissTotal,
} from "./metrics";
import type { BaseTeamData, ExtendedTeamData } from "@/data/team/shared-core";

export type TournamentTeamSharedDataServiceInterface = {
  readonly getRoster: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<string[], TournamentTeamQueryError>;

  readonly getBaseTeamData: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<BaseTeamData, TournamentTeamQueryError>;

  readonly getExtendedTeamData: (
    tournamentId: number,
    tournamentTeamId: number
  ) => Effect.Effect<ExtendedTeamData, TournamentTeamQueryError>;
};

export class TournamentTeamSharedDataService extends Context.Tag(
  "@app/data/tournament-team/TournamentTeamSharedDataService"
)<
  TournamentTeamSharedDataService,
  TournamentTeamSharedDataServiceInterface
>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

function resolveScrimTeamNames(
  matches: {
    scrimId: number | null;
    team1Id: number | null;
    team2Id: number | null;
  }[],
  tournamentTeamId: number,
  matchStarts: { scrimId: number; team_1_name: string; team_2_name: string }[]
): Map<number, string> {
  const scrimToSlot = new Map<number, "team1" | "team2">();
  for (const m of matches) {
    if (m.scrimId == null) continue;
    if (m.team1Id === tournamentTeamId) {
      scrimToSlot.set(m.scrimId, "team1");
    } else if (m.team2Id === tournamentTeamId) {
      scrimToSlot.set(m.scrimId, "team2");
    }
  }

  const matchStartByScrim = new Map<
    number,
    { team_1_name: string; team_2_name: string }
  >();
  for (const ms of matchStarts) {
    if (!matchStartByScrim.has(ms.scrimId)) {
      matchStartByScrim.set(ms.scrimId, ms);
    }
  }

  const scrimTeamNameMap = new Map<number, string>();
  for (const [scrimId, slot] of scrimToSlot) {
    const ms = matchStartByScrim.get(scrimId);
    if (!ms) continue;
    scrimTeamNameMap.set(
      scrimId,
      slot === "team1" ? ms.team_1_name : ms.team_2_name
    );
  }

  return scrimTeamNameMap;
}

export const make: Effect.Effect<TournamentTeamSharedDataServiceInterface> =
  Effect.gen(function* () {
    function getRoster(
      tournamentId: number,
      tournamentTeamId: number
    ): Effect.Effect<string[], TournamentTeamQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        tournamentId,
        tournamentTeamId,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("tournamentId", tournamentId);
        yield* Effect.annotateCurrentSpan("tournamentTeamId", tournamentTeamId);

        const matches = yield* Effect.tryPromise({
          try: () =>
            prisma.tournamentMatch.findMany({
              where: {
                tournamentId,
                OR: [
                  { team1Id: tournamentTeamId },
                  { team2Id: tournamentTeamId },
                ],
                scrimId: { not: null },
              },
              select: { scrimId: true, team1Id: true, team2Id: true },
            }),
          catch: (error) =>
            new TournamentTeamQueryError({
              operation: "fetch tournament matches for roster",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournamentTeam.roster.fetchMatches", {
            attributes: { tournamentId, tournamentTeamId },
          })
        );

        const scrimIds = matches
          .map((m) => m.scrimId)
          .filter((id): id is number => id != null);

        if (scrimIds.length === 0) {
          wideEvent.roster_size = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(ttRosterQuerySuccessTotal);
          const _empty: string[] = [];
          return _empty;
        }

        const matchStartRecords = yield* Effect.tryPromise({
          try: () =>
            prisma.matchStart.findMany({
              where: { scrimId: { in: scrimIds } },
              select: {
                scrimId: true,
                team_1_name: true,
                team_2_name: true,
              },
            }),
          catch: (error) =>
            new TournamentTeamQueryError({
              operation: "fetch match starts for roster",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournamentTeam.roster.fetchMatchStarts", {
            attributes: { tournamentId, tournamentTeamId },
          })
        );

        const scrimTeamNameMap = resolveScrimTeamNames(
          matches,
          tournamentTeamId,
          matchStartRecords
        );

        const mapRecords = yield* Effect.tryPromise({
          try: () =>
            prisma.map.findMany({
              where: { scrimId: { in: scrimIds } },
              select: { mapData: { select: { id: true } }, scrimId: true },
            }),
          catch: (error) =>
            new TournamentTeamQueryError({
              operation: "fetch map records for roster",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournamentTeam.roster.fetchMapRecords", {
            attributes: { tournamentId, tournamentTeamId },
          })
        );

        const mapDataIds = mapRecords.flatMap((m) =>
          m.mapData.map((md) => md.id)
        );

        if (mapDataIds.length === 0) {
          wideEvent.roster_size = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(ttRosterQuerySuccessTotal);
          const _empty: string[] = [];
          return _empty;
        }

        const allPlayerStats = yield* Effect.tryPromise({
          try: () =>
            prisma.playerStat.findMany({
              where: { MapDataId: { in: mapDataIds } },
              select: {
                player_name: true,
                player_team: true,
                MapDataId: true,
              },
            }),
          catch: (error) =>
            new TournamentTeamQueryError({
              operation: "fetch player stats for roster",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournamentTeam.roster.fetchPlayerStats", {
            attributes: {
              tournamentId,
              tournamentTeamId,
              mapCount: mapDataIds.length,
            },
          })
        );

        const mapDataToScrim = new Map<number, number>();
        for (const mapRecord of mapRecords) {
          if (mapRecord.scrimId == null) continue;
          for (const md of mapRecord.mapData) {
            mapDataToScrim.set(md.id, mapRecord.scrimId);
          }
        }

        const rosterPlayers = new Set<string>();
        for (const stat of allPlayerStats) {
          if (stat.MapDataId == null) continue;
          const scrimId = mapDataToScrim.get(stat.MapDataId);
          if (scrimId == null) continue;
          const ourTeamName = scrimTeamNameMap.get(scrimId);
          if (ourTeamName && stat.player_team === ourTeamName) {
            rosterPlayers.add(stat.player_name);
          }
        }

        const roster = Array.from(rosterPlayers);
        wideEvent.roster_size = roster.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(ttRosterQuerySuccessTotal);
        return roster;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(ttRosterQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournamentTeam.getRoster")
                : Effect.logInfo("tournamentTeam.getRoster");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(ttRosterQueryDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("tournamentTeam.getRoster")
      );
    }

    function getBaseTeamData(
      tournamentId: number,
      tournamentTeamId: number
    ): Effect.Effect<BaseTeamData, TournamentTeamQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        tournamentId,
        tournamentTeamId,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("tournamentId", tournamentId);
        yield* Effect.annotateCurrentSpan("tournamentTeamId", tournamentTeamId);

        const teamRoster = yield* getRoster(tournamentId, tournamentTeamId);
        const teamRosterSet = new Set(teamRoster);

        const matches = yield* Effect.tryPromise({
          try: () =>
            prisma.tournamentMatch.findMany({
              where: {
                tournamentId,
                OR: [
                  { team1Id: tournamentTeamId },
                  { team2Id: tournamentTeamId },
                ],
                scrimId: { not: null },
              },
              select: { scrimId: true, team1Id: true, team2Id: true },
            }),
          catch: (error) =>
            new TournamentTeamQueryError({
              operation: "fetch tournament matches for base data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournamentTeam.baseData.fetchMatches", {
            attributes: { tournamentId, tournamentTeamId },
          })
        );

        const scrimIds = matches
          .map((m) => m.scrimId)
          .filter((id): id is number => id != null);

        if (scrimIds.length === 0) {
          wideEvent.map_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(ttBaseDataQuerySuccessTotal);
          return {
            teamId: tournamentTeamId,
            teamRoster,
            teamRosterSet,
            mapDataRecords: [],
            mapDataIds: [],
            allPlayerStats: [],
            matchStarts: [],
            finalRounds: [],
            captures: [],
            payloadProgresses: [],
            pointProgresses: [],
          } satisfies BaseTeamData;
        }

        const allMapRecords = yield* Effect.tryPromise({
          try: () =>
            prisma.map.findMany({
              where: { scrimId: { in: scrimIds } },
              select: {
                id: true,
                name: true,
                mapData: { select: { id: true } },
                Scrim: {
                  select: {
                    id: true,
                    name: true,
                    date: true,
                  },
                },
              },
            }),
          catch: (error) =>
            new TournamentTeamQueryError({
              operation: "fetch map records for base data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournamentTeam.baseData.fetchMapRecords", {
            attributes: { tournamentId, tournamentTeamId },
          })
        );

        const mapDataIds = allMapRecords.flatMap((m) =>
          m.mapData.map((md) => md.id)
        );

        const mapDataRecords = allMapRecords.flatMap((m) =>
          m.mapData.map((md) => ({
            id: md.id,
            name: m.name,
            ...(m.Scrim ? { Scrim: m.Scrim } : {}),
          }))
        );

        if (mapDataIds.length === 0) {
          wideEvent.map_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(ttBaseDataQuerySuccessTotal);
          return {
            teamId: tournamentTeamId,
            teamRoster,
            teamRosterSet,
            mapDataRecords: [],
            mapDataIds: [],
            allPlayerStats: [],
            matchStarts: [],
            finalRounds: [],
            captures: [],
            payloadProgresses: [],
            pointProgresses: [],
          } satisfies BaseTeamData;
        }

        const [
          allPlayerStats,
          matchStarts,
          finalRounds,
          captures,
          payloadProgresses,
          pointProgresses,
        ] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.playerStat.findMany({
                where: { MapDataId: { in: mapDataIds } },
                select: {
                  player_name: true,
                  player_team: true,
                  player_hero: true,
                  hero_time_played: true,
                  MapDataId: true,
                  eliminations: true,
                  final_blows: true,
                  deaths: true,
                  offensive_assists: true,
                  hero_damage_dealt: true,
                  damage_taken: true,
                  healing_dealt: true,
                  ultimates_earned: true,
                  ultimates_used: true,
                },
              }),
              prisma.matchStart.findMany({
                where: { MapDataId: { in: mapDataIds } },
              }),
              prisma.roundEnd.findMany({
                where: { MapDataId: { in: mapDataIds } },
                orderBy: { round_number: "desc" },
              }),
              prisma.objectiveCaptured.findMany({
                where: { MapDataId: { in: mapDataIds } },
                orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
              }),
              prisma.payloadProgress.findMany({
                where: { MapDataId: { in: mapDataIds } },
                orderBy: [
                  { round_number: "asc" },
                  { objective_index: "asc" },
                  { match_time: "asc" },
                ],
              }),
              prisma.pointProgress.findMany({
                where: { MapDataId: { in: mapDataIds } },
                orderBy: [
                  { round_number: "asc" },
                  { objective_index: "asc" },
                  { match_time: "asc" },
                ],
              }),
            ]),
          catch: (error) =>
            new TournamentTeamQueryError({
              operation: "fetch base team data tables",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournamentTeam.baseData.fetchAllTables", {
            attributes: {
              tournamentId,
              tournamentTeamId,
              mapCount: mapDataIds.length,
            },
          })
        );

        wideEvent.map_count = mapDataIds.length;
        wideEvent.player_stat_count = allPlayerStats.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(ttBaseDataQuerySuccessTotal);

        return {
          teamId: tournamentTeamId,
          teamRoster,
          teamRosterSet,
          mapDataRecords: mapDataRecords as BaseTeamData["mapDataRecords"],
          mapDataIds,
          allPlayerStats,
          matchStarts,
          finalRounds,
          captures,
          payloadProgresses,
          pointProgresses,
        } satisfies BaseTeamData;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(ttBaseDataQueryErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournamentTeam.getBaseTeamData")
                : Effect.logInfo("tournamentTeam.getBaseTeamData");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                ttBaseDataQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("tournamentTeam.getBaseTeamData")
      );
    }

    function getExtendedTeamData(
      tournamentId: number,
      tournamentTeamId: number
    ): Effect.Effect<ExtendedTeamData, TournamentTeamQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        tournamentId,
        tournamentTeamId,
      };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("tournamentId", tournamentId);
        yield* Effect.annotateCurrentSpan("tournamentTeamId", tournamentTeamId);

        const baseData = yield* getBaseTeamData(tournamentId, tournamentTeamId);

        if (baseData.mapDataIds.length === 0) {
          wideEvent.map_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(ttExtendedDataQuerySuccessTotal);
          return {
            ...baseData,
            allKills: [],
            allRezzes: [],
            allUltimates: [],
          } satisfies ExtendedTeamData;
        }

        const [allKills, allRezzes, allUltimates] = yield* Effect.tryPromise({
          try: () =>
            Promise.all([
              prisma.kill.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                orderBy: { match_time: "asc" },
              }),
              prisma.mercyRez.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                orderBy: { match_time: "asc" },
              }),
              prisma.ultimateStart.findMany({
                where: { MapDataId: { in: baseData.mapDataIds } },
                orderBy: { match_time: "asc" },
              }),
            ]),
          catch: (error) =>
            new TournamentTeamQueryError({
              operation: "fetch extended team data (kills, rezzes, ults)",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournamentTeam.extendedData.fetchFightTables", {
            attributes: {
              tournamentId,
              tournamentTeamId,
              mapCount: baseData.mapDataIds.length,
            },
          })
        );

        wideEvent.map_count = baseData.mapDataIds.length;
        wideEvent.kill_count = allKills.length;
        wideEvent.rez_count = allRezzes.length;
        wideEvent.ult_count = allUltimates.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(ttExtendedDataQuerySuccessTotal);

        return {
          ...baseData,
          allKills,
          allRezzes,
          allUltimates,
        } satisfies ExtendedTeamData;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(ttExtendedDataQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournamentTeam.getExtendedTeamData")
                : Effect.logInfo("tournamentTeam.getExtendedTeamData");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                ttExtendedDataQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("tournamentTeam.getExtendedTeamData")
      );
    }

    const rosterCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [tournamentIdStr, tournamentTeamIdStr] = key.split(":");
        return getRoster(
          Number(tournamentIdStr),
          Number(tournamentTeamIdStr)
        ).pipe(Effect.tap(() => Metric.increment(ttCacheMissTotal)));
      },
    });

    const baseDataCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [tournamentIdStr, tournamentTeamIdStr] = key.split(":");
        return getBaseTeamData(
          Number(tournamentIdStr),
          Number(tournamentTeamIdStr)
        ).pipe(Effect.tap(() => Metric.increment(ttCacheMissTotal)));
      },
    });

    const extendedDataCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (key: string) => {
        const [tournamentIdStr, tournamentTeamIdStr] = key.split(":");
        return getExtendedTeamData(
          Number(tournamentIdStr),
          Number(tournamentTeamIdStr)
        ).pipe(Effect.tap(() => Metric.increment(ttCacheMissTotal)));
      },
    });

    function cacheKey(tournamentId: number, tournamentTeamId: number): string {
      return `${tournamentId}:${tournamentTeamId}`;
    }

    return {
      getRoster: (tournamentId: number, tournamentTeamId: number) =>
        rosterCache
          .get(cacheKey(tournamentId, tournamentTeamId))
          .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
      getBaseTeamData: (tournamentId: number, tournamentTeamId: number) =>
        baseDataCache
          .get(cacheKey(tournamentId, tournamentTeamId))
          .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
      getExtendedTeamData: (tournamentId: number, tournamentTeamId: number) =>
        extendedDataCache
          .get(cacheKey(tournamentId, tournamentTeamId))
          .pipe(Effect.tap(() => Metric.increment(ttCacheRequestTotal))),
    } satisfies TournamentTeamSharedDataServiceInterface;
  });

export const TournamentTeamSharedDataServiceLive = Layer.effect(
  TournamentTeamSharedDataService,
  make
).pipe(Layer.provide(EffectObservabilityLive));
