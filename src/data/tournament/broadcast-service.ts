import { aggregatePlayerStats } from "@/data/comparison/computation";
import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import { removeDuplicateRows } from "@/lib/utils";
import type { HeroName } from "@/types/heroes";
import { heroRoleMapping } from "@/types/heroes";
import { Prisma, type PlayerStat } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { BroadcastQueryError } from "./errors";
import {
  getBroadcastDataDuration,
  getBroadcastDataErrorTotal,
  getBroadcastDataSuccessTotal,
  broadcastCacheRequestTotal,
  broadcastCacheMissTotal,
} from "./metrics";

function findTournamentWithRelations(id: number) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: {
        include: { team: { select: { id: true, name: true, image: true } } },
        orderBy: { seed: "asc" },
      },
      rounds: { orderBy: [{ bracket: "asc" }, { roundNumber: "asc" }] },
      matches: {
        include: {
          team1: true,
          team2: true,
          winner: true,
          round: true,
          maps: { include: { map: true }, orderBy: { gameNumber: "asc" } },
        },
        orderBy: [{ roundId: "asc" }, { bracketPosition: "asc" }],
      },
    },
  });
}

type TournamentWithRelations = NonNullable<
  Awaited<ReturnType<typeof findTournamentWithRelations>>
>;

function formatTournamentMeta(tournament: TournamentWithRelations) {
  return {
    id: tournament.id,
    name: tournament.name,
    format: tournament.format,
    bestOf: tournament.bestOf,
    status: tournament.status,
    teams: tournament.teams.map((t) => ({
      name: t.name,
      seed: t.seed,
      image: t.team?.image ?? null,
      eliminated: t.eliminated,
    })),
    matches: tournament.matches.map((m) => ({
      id: m.id,
      round: m.round.roundName,
      bracket: m.round.bracket,
      bracketPosition: m.bracketPosition,
      team1: m.team1 ? { name: m.team1.name, score: m.team1Score } : null,
      team2: m.team2 ? { name: m.team2.name, score: m.team2Score } : null,
      status: m.status,
      winner: m.winner?.name ?? null,
    })),
  };
}

type BroadcastResult = {
  tournament: ReturnType<typeof formatTournamentMeta>;
  players: {
    name: string;
    team: string;
    role: string;
    heroesPlayed: string[];
    mapsPlayed: number;
    stats: Record<string, number>;
    per10: Record<string, number>;
    averages: Record<string, number>;
  }[];
} | null;

export type BroadcastServiceInterface = {
  readonly getTournamentBroadcastData: (
    tournamentId: number
  ) => Effect.Effect<BroadcastResult, BroadcastQueryError>;
};

export class BroadcastService extends Context.Tag(
  "@app/data/tournament/BroadcastService"
)<BroadcastService, BroadcastServiceInterface>() {}

export const make: Effect.Effect<BroadcastServiceInterface> = Effect.gen(
  function* () {
    function getTournamentBroadcastData(
      tournamentId: number
    ): Effect.Effect<BroadcastResult, BroadcastQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { tournamentId };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("tournamentId", tournamentId);
        const tournament = yield* Effect.tryPromise({
          try: () => findTournamentWithRelations(tournamentId),
          catch: (error) =>
            new BroadcastQueryError({
              operation: `fetch tournament with relations for broadcast: ${tournamentId}`,
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.broadcast.findTournament", {
            attributes: { tournamentId },
          })
        );

        if (!tournament) {
          wideEvent.found = false;
          wideEvent.outcome = "success";
          yield* Metric.increment(getBroadcastDataSuccessTotal);
          return null;
        }

        wideEvent.found = true;

        const scrimIds = tournament.matches
          .map((m) => m.scrimId)
          .filter((id): id is number => id !== null);

        wideEvent.scrim_count = scrimIds.length;

        if (scrimIds.length === 0) {
          wideEvent.outcome = "success";
          yield* Metric.increment(getBroadcastDataSuccessTotal);
          return {
            tournament: formatTournamentMeta(tournament),
            players: [],
          };
        }

        const scrims = yield* Effect.tryPromise({
          try: () =>
            prisma.scrim.findMany({
              where: { id: { in: scrimIds } },
              select: {
                maps: { select: { mapData: { select: { id: true } } } },
              },
            }),
          catch: (error) =>
            new BroadcastQueryError({
              operation: "fetch scrims for broadcast map data ids",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.broadcast.fetchScrims", {
            attributes: { tournamentId, scrimCount: scrimIds.length },
          })
        );

        const mapIds: number[] = [];
        for (const scrim of scrims) {
          for (const map of scrim.maps) {
            for (const md of map.mapData) {
              mapIds.push(md.id);
            }
          }
        }

        wideEvent.map_data_count = mapIds.length;

        if (mapIds.length === 0) {
          wideEvent.outcome = "success";
          yield* Metric.increment(getBroadcastDataSuccessTotal);
          return {
            tournament: formatTournamentMeta(tournament),
            players: [],
          };
        }

        const allStats = yield* Effect.tryPromise({
          try: async () =>
            removeDuplicateRows(
              await prisma.$queryRaw<PlayerStat[]>`
                WITH maxTime AS (
                  SELECT MAX("match_time") AS max_time, "MapDataId"
                  FROM "PlayerStat"
                  WHERE "MapDataId" IN (${Prisma.join(mapIds)})
                  GROUP BY "MapDataId"
                )
                SELECT ps.* FROM "PlayerStat" ps
                INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
                WHERE ps."MapDataId" IN (${Prisma.join(mapIds)})
              `
            ),
          catch: (error) =>
            new BroadcastQueryError({
              operation: "fetch player stats for broadcast",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.broadcast.fetchPlayerStats", {
            attributes: { tournamentId, mapCount: mapIds.length },
          })
        );

        const allCalcStats = yield* Effect.tryPromise({
          try: () =>
            prisma.calculatedStat.findMany({
              where: { MapDataId: { in: mapIds } },
            }),
          catch: (error) =>
            new BroadcastQueryError({
              operation: "fetch calculated stats for broadcast",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("tournament.broadcast.fetchCalcStats", {
            attributes: { tournamentId, mapCount: mapIds.length },
          })
        );

        wideEvent.player_stat_count = allStats.length;
        wideEvent.calc_stat_count = allCalcStats.length;

        const playerStatsMap = new Map<string, PlayerStat[]>();
        for (const stat of allStats) {
          const name = stat.player_name;
          if (!playerStatsMap.has(name)) {
            playerStatsMap.set(name, []);
          }
          playerStatsMap.get(name)!.push(stat);
        }

        const playerCalcStatsMap = new Map<
          string,
          (typeof allCalcStats)[number][]
        >();
        for (const stat of allCalcStats) {
          const name = stat.playerName;
          if (!playerCalcStatsMap.has(name)) {
            playerCalcStatsMap.set(name, []);
          }
          playerCalcStatsMap.get(name)!.push(stat);
        }

        const players = Array.from(playerStatsMap.entries()).map(
          ([name, stats]) => {
            const calcStats = playerCalcStatsMap.get(name) ?? [];
            const aggregated = aggregatePlayerStats(stats, calcStats);

            const heroTimeTotals = new Map<string, number>();
            for (const stat of stats) {
              heroTimeTotals.set(
                stat.player_hero,
                (heroTimeTotals.get(stat.player_hero) ?? 0) +
                  stat.hero_time_played
              );
            }
            const heroesPlayed = Array.from(heroTimeTotals.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([hero]) => hero);
            const primaryHero = heroesPlayed[0] ?? "Unknown";
            const role = heroRoleMapping[primaryHero as HeroName] ?? "Damage";

            const playerTeam = stats[0]?.player_team ?? "Unknown";

            const mapsPlayed = new Set(stats.map((s) => s.MapDataId)).size;

            return {
              name,
              team: playerTeam,
              role,
              heroesPlayed,
              mapsPlayed,
              stats: {
                eliminations: aggregated.eliminations,
                finalBlows: aggregated.finalBlows,
                deaths: aggregated.deaths,
                heroDamageDone: aggregated.heroDamageDealt,
                healingDone: aggregated.healingDealt,
                damageBlocked: aggregated.damageBlocked,
                damageTaken: aggregated.damageTaken,
                offensiveAssists: aggregated.offensiveAssists,
                defensiveAssists: aggregated.defensiveAssists,
                ultimatesUsed: aggregated.ultimatesUsed,
                ultimatesEarned: aggregated.ultimatesEarned,
                multikills: aggregated.multikills,
                multikillBest: aggregated.multikillBest,
                soloKills: aggregated.soloKills,
                objectiveKills: aggregated.objectiveKills,
                environmentalKills: aggregated.environmentalKills,
                criticalHits: aggregated.criticalHits,
                weaponAccuracy: aggregated.weaponAccuracy,
                criticalHitAccuracy: aggregated.criticalHitAccuracy,
                scopedAccuracy: aggregated.scopedAccuracy,
                heroTimePlayed: aggregated.heroTimePlayed,
              },
              per10: {
                eliminationsPer10: aggregated.eliminationsPer10,
                finalBlowsPer10: aggregated.finalBlowsPer10,
                deathsPer10: aggregated.deathsPer10,
                heroDamagePer10: aggregated.heroDamagePer10,
                healingPer10: aggregated.healingDealtPer10,
                damageBlockedPer10: aggregated.damageBlockedPer10,
                damageTakenPer10: aggregated.damageTakenPer10,
                ultimatesUsedPer10: aggregated.ultimatesUsedPer10,
                soloKillsPer10: aggregated.soloKillsPer10,
                offensiveAssistsPer10: aggregated.offensiveAssistsPer10,
                defensiveAssistsPer10: aggregated.defensiveAssistsPer10,
                objectiveKillsPer10: aggregated.objectiveKillsPer10,
              },
              averages: {
                avgKD:
                  aggregated.deaths > 0
                    ? aggregated.finalBlows / aggregated.deaths
                    : aggregated.finalBlows,
                avgMvpScore: aggregated.mvpScore,
                avgFirstPickPct: aggregated.firstPickPercentage,
                avgFirstDeathPct: aggregated.firstDeathPercentage,
                avgDuelWinratePct: aggregated.duelWinratePercentage,
                firstPickCount: aggregated.firstPickCount,
                firstDeathCount: aggregated.firstDeathCount,
                avgUltChargeTime: aggregated.averageUltChargeTime,
                avgKillsPerUltimate: aggregated.killsPerUltimate,
              },
            };
          }
        );

        wideEvent.player_count = players.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(getBroadcastDataSuccessTotal);

        return {
          tournament: formatTournamentMeta(tournament),
          players,
        };
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(getBroadcastDataErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("tournament.getTournamentBroadcastData")
                : Effect.logInfo("tournament.getTournamentBroadcastData");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                getBroadcastDataDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("tournament.getTournamentBroadcastData")
      );
    }

    const broadcastCache = yield* Cache.make({
      capacity: 64,
      timeToLive: Duration.seconds(30),
      lookup: (tournamentId: number) =>
        getTournamentBroadcastData(tournamentId).pipe(
          Effect.tap(() => Metric.increment(broadcastCacheMissTotal))
        ),
    });

    return {
      getTournamentBroadcastData: (tournamentId: number) =>
        broadcastCache
          .get(tournamentId)
          .pipe(Effect.tap(() => Metric.increment(broadcastCacheRequestTotal))),
    } satisfies BroadcastServiceInterface;
  }
);

export const BroadcastServiceLive = Layer.effect(BroadcastService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
