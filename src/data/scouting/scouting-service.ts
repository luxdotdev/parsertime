import { EffectObservabilityLive } from "@/instrumentation";
import prisma from "@/lib/prisma";
import type { MapType, Prisma } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { ScoutingQueryError } from "./errors";
import {
  scoutingCacheRequestTotal,
  scoutingCacheMissTotal,
  scoutingOpponentMatchDataQueryDuration,
  scoutingOpponentMatchDataQueryErrorTotal,
  scoutingOpponentMatchDataQuerySuccessTotal,
  scoutingTeamProfileQueryDuration,
  scoutingTeamProfileQueryErrorTotal,
  scoutingTeamProfileQuerySuccessTotal,
  scoutingTeamsQueryDuration,
  scoutingTeamsQueryErrorTotal,
  scoutingTeamsQuerySuccessTotal,
} from "./metrics";
import type {
  HeroBanEntry,
  MapPerformanceEntry,
  ScoutingHeroBans,
  ScoutingMapAnalysis,
  ScoutingMatchHistoryEntry,
  ScoutingRecommendation,
  ScoutingRecommendations,
  ScoutingTeam,
  ScoutingTeamOverview,
  ScoutingTeamProfile,
} from "./types";

const HALF_LIFE_DAYS = 90;
const DECAY_CONSTANT = Math.LN2 / HALF_LIFE_DAYS;

function calculateWeight(matchDate: Date): number {
  const daysAgo = (Date.now() - matchDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-DECAY_CONSTANT * daysAgo);
}

function weightedRate(items: { won: boolean; weight: number }[]): number {
  if (items.length === 0) return 0;
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return 0;
  const winWeight = items
    .filter((i) => i.won)
    .reduce((sum, i) => sum + i.weight, 0);
  return (winWeight / totalWeight) * 100;
}

const opponentMatchInclude = {
  maps: { include: { heroBans: true } },
  tournament: { select: { title: true } },
} satisfies Prisma.ScoutingMatchInclude;

export type OpponentMatchRow = Prisma.ScoutingMatchGetPayload<{
  include: typeof opponentMatchInclude;
}>;

type TeamAppearanceRow = {
  team: string;
  team_full_name: string;
  match_count: bigint;
  win_count: bigint;
};

export type ScoutingServiceInterface = {
  readonly getScoutingTeams: () => Effect.Effect<
    ScoutingTeam[],
    ScoutingQueryError
  >;

  readonly getOpponentMatchData: (
    teamAbbr: string
  ) => Effect.Effect<OpponentMatchRow[], ScoutingQueryError>;

  readonly getScoutingTeamProfile: (
    teamAbbr: string
  ) => Effect.Effect<ScoutingTeamProfile | null, ScoutingQueryError>;
};

export class ScoutingService extends Context.Tag(
  "@app/data/scouting/ScoutingService"
)<ScoutingService, ScoutingServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make: Effect.Effect<ScoutingServiceInterface> = Effect.gen(
  function* () {
    function getScoutingTeams(): Effect.Effect<
      ScoutingTeam[],
      ScoutingQueryError
    > {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {};

      return Effect.gen(function* () {
        const rows = yield* Effect.tryPromise({
          try: () =>
            prisma.$queryRaw<TeamAppearanceRow[]>`
              WITH appearances AS (
                SELECT team1 AS team, "team1FullName" AS team_full_name, id,
                       CASE WHEN winner = team1 THEN 1 ELSE 0 END AS won
                FROM "ScoutingMatch"
                UNION ALL
                SELECT team2 AS team, "team2FullName" AS team_full_name, id,
                       CASE WHEN winner = team2 THEN 1 ELSE 0 END AS won
                FROM "ScoutingMatch"
              )
              SELECT
                team,
                team_full_name,
                COUNT(*)::bigint AS match_count,
                SUM(won)::bigint AS win_count
              FROM appearances
              GROUP BY team, team_full_name
              ORDER BY match_count DESC
            `,
          catch: (error) =>
            new ScoutingQueryError({
              operation: "fetch scouting teams",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scouting.teams.fetchRows", {
            attributes: {},
          })
        );

        const teams: ScoutingTeam[] = rows.map((row) => ({
          abbreviation: row.team,
          fullName: row.team_full_name,
          matchCount: Number(row.match_count),
          winCount: Number(row.win_count),
        }));

        wideEvent.team_count = teams.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scoutingTeamsQuerySuccessTotal);
        return teams;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(scoutingTeamsQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scouting.getScoutingTeams")
                : Effect.logInfo("scouting.getScoutingTeams");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scoutingTeamsQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scouting.getScoutingTeams")
      );
    }

    function getOpponentMatchData(
      teamAbbr: string
    ): Effect.Effect<OpponentMatchRow[], ScoutingQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamAbbr };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamAbbr", teamAbbr);
        const matches = yield* Effect.tryPromise({
          try: () =>
            prisma.scoutingMatch.findMany({
              where: { OR: [{ team1: teamAbbr }, { team2: teamAbbr }] },
              include: opponentMatchInclude,
              orderBy: { matchDate: "asc" },
            }),
          catch: (error) =>
            new ScoutingQueryError({
              operation: "fetch opponent match data",
              cause: error,
            }),
        }).pipe(
          Effect.withSpan("scouting.opponentMatchData.fetch", {
            attributes: { teamAbbr },
          })
        );

        wideEvent.match_count = matches.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scoutingOpponentMatchDataQuerySuccessTotal);
        return matches;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(
              Metric.increment(scoutingOpponentMatchDataQueryErrorTotal)
            )
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scouting.getOpponentMatchData")
                : Effect.logInfo("scouting.getOpponentMatchData");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scoutingOpponentMatchDataQueryDuration(
                  Effect.succeed(durationMs)
                )
              )
            );
          })
        ),
        Effect.withSpan("scouting.getOpponentMatchData")
      );
    }

    function getScoutingTeamProfile(
      teamAbbr: string
    ): Effect.Effect<ScoutingTeamProfile | null, ScoutingQueryError> {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = { teamAbbr };

      return Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan("teamAbbr", teamAbbr);
        const matchesAsc = yield* getOpponentMatchData(teamAbbr);

        if (matchesAsc.length === 0) {
          wideEvent.match_count = 0;
          wideEvent.outcome = "success";
          yield* Metric.increment(scoutingTeamProfileQuerySuccessTotal);
          return null;
        }

        const matches = [...matchesAsc].reverse();

        const firstMatch = matches[0];
        const fullName =
          firstMatch.team1 === teamAbbr
            ? firstMatch.team1FullName
            : firstMatch.team2FullName;

        type ProcessedMatch = {
          isTeam1: boolean;
          won: boolean;
          weight: number;
          date: Date;
          opponent: string;
          opponentFullName: string;
          teamScore: number | null;
          opponentScore: number | null;
          tournament: string;
          maps: typeof firstMatch.maps;
        };

        const processed: ProcessedMatch[] = matches.map((m) => {
          const isTeam1 = m.team1 === teamAbbr;
          const won = m.winner === teamAbbr;
          return {
            isTeam1,
            won,
            weight: calculateWeight(m.matchDate),
            date: m.matchDate,
            opponent: isTeam1 ? m.team2 : m.team1,
            opponentFullName: isTeam1 ? m.team2FullName : m.team1FullName,
            teamScore: isTeam1 ? m.team1Score : m.team2Score,
            opponentScore: isTeam1 ? m.team2Score : m.team1Score,
            tournament: m.tournament.title,
            maps: m.maps,
          };
        });

        // Overview
        const wins = processed.filter((m) => m.won).length;
        const losses = processed.length - wins;
        const overview: ScoutingTeamOverview = {
          totalMatches: processed.length,
          wins,
          losses,
          winRate: processed.length > 0 ? (wins / processed.length) * 100 : 0,
          weightedWinRate: weightedRate(processed),
          recentForm: processed
            .slice(0, 10)
            .map((m) => (m.won ? "win" : "loss")),
        };

        // Hero bans
        const bansByTeamMap = new Map<
          string,
          { raw: number; weighted: number }
        >();
        const bansAgainstMap = new Map<
          string,
          { raw: number; weighted: number }
        >();

        for (const match of processed) {
          const teamSide = match.isTeam1 ? "team1" : "team2";

          for (const map of match.maps) {
            for (const ban of map.heroBans) {
              const target =
                ban.team === teamSide ? bansByTeamMap : bansAgainstMap;
              const existing = target.get(ban.hero) ?? {
                raw: 0,
                weighted: 0,
              };
              existing.raw += 1;
              existing.weighted += match.weight;
              target.set(ban.hero, existing);
            }
          }
        }

        function toBanEntries(
          map: Map<string, { raw: number; weighted: number }>
        ): HeroBanEntry[] {
          return Array.from(map.entries())
            .map(([hero, data]) => ({
              hero,
              rawCount: data.raw,
              weightedCount: Math.round(data.weighted * 100) / 100,
            }))
            .sort((a, b) => b.weightedCount - a.weightedCount);
        }

        const heroBans: ScoutingHeroBans = {
          bansByTeam: toBanEntries(bansByTeamMap),
          bansAgainstTeam: toBanEntries(bansAgainstMap),
        };

        // Map analysis
        type MapAccum = { played: { won: boolean; weight: number }[] };
        const byMapName = new Map<string, MapAccum>();
        const byMapTypeMap = new Map<MapType, MapAccum>();

        for (const match of processed) {
          const teamSide = match.isTeam1 ? "team1" : "team2";
          for (const map of match.maps) {
            const mapWon = map.winner === teamSide;
            const entry = { won: mapWon, weight: match.weight };

            const nameAccum = byMapName.get(map.mapName) ?? { played: [] };
            nameAccum.played.push(entry);
            byMapName.set(map.mapName, nameAccum);

            const typeAccum = byMapTypeMap.get(map.mapType) ?? {
              played: [],
            };
            typeAccum.played.push(entry);
            byMapTypeMap.set(map.mapType, typeAccum);
          }
        }

        function toMapPerformance(
          accum: MapAccum
        ): Pick<
          MapPerformanceEntry,
          "played" | "won" | "winRate" | "weightedWinRate"
        > {
          const won = accum.played.filter((p) => p.won).length;
          return {
            played: accum.played.length,
            won,
            winRate:
              accum.played.length > 0 ? (won / accum.played.length) * 100 : 0,
            weightedWinRate: weightedRate(accum.played),
          };
        }

        const mapAnalysis: ScoutingMapAnalysis = {
          byMap: Array.from(byMapName.entries())
            .map(([name, accum]) => ({ name, ...toMapPerformance(accum) }))
            .sort((a, b) => b.played - a.played),
          byMapType: Array.from(byMapTypeMap.entries())
            .map(([mapType, accum]) => ({
              name: mapType,
              mapType,
              ...toMapPerformance(accum),
            }))
            .sort((a, b) => b.played - a.played),
        };

        // Match history
        const matchHistory: ScoutingMatchHistoryEntry[] = processed.map(
          (m) => ({
            date: m.date,
            opponent: m.opponent,
            opponentFullName: m.opponentFullName,
            teamScore: m.teamScore,
            opponentScore: m.opponentScore,
            result: m.won ? "win" : "loss",
            tournament: m.tournament,
          })
        );

        // Recommendations
        const suggestedBans: ScoutingRecommendation[] = heroBans.bansAgainstTeam
          .slice(0, 5)
          .map((ban) => ({
            name: ban.hero,
            reason: `Banned against ${teamAbbr} ${ban.rawCount} times (opponents target this hero)`,
            weightedWinRate: ban.weightedCount,
            sampleSize: ban.rawCount,
          }));

        const MIN_MAP_SAMPLE = 3;
        const mapsWithEnoughData = mapAnalysis.byMap.filter(
          (m) => m.played >= MIN_MAP_SAMPLE
        );

        const suggestedMapPicks: ScoutingRecommendation[] = [
          ...mapsWithEnoughData,
        ]
          .sort((a, b) => a.weightedWinRate - b.weightedWinRate)
          .slice(0, 3)
          .map((m) => ({
            name: m.name,
            reason: `${teamAbbr} has a ${m.weightedWinRate.toFixed(0)}% weighted WR across ${m.played} maps`,
            weightedWinRate: m.weightedWinRate,
            sampleSize: m.played,
          }));

        const suggestedMapAvoids: ScoutingRecommendation[] = [
          ...mapsWithEnoughData,
        ]
          .sort((a, b) => b.weightedWinRate - a.weightedWinRate)
          .slice(0, 3)
          .map((m) => ({
            name: m.name,
            reason: `${teamAbbr} has a ${m.weightedWinRate.toFixed(0)}% weighted WR across ${m.played} maps`,
            weightedWinRate: m.weightedWinRate,
            sampleSize: m.played,
          }));

        const recommendations: ScoutingRecommendations = {
          suggestedBans,
          suggestedMapPicks,
          suggestedMapAvoids,
        };

        wideEvent.match_count = processed.length;
        wideEvent.wins = wins;
        wideEvent.losses = losses;
        wideEvent.ban_count =
          heroBans.bansByTeam.length + heroBans.bansAgainstTeam.length;
        wideEvent.map_analysis_count = mapAnalysis.byMap.length;
        wideEvent.outcome = "success";
        yield* Metric.increment(scoutingTeamProfileQuerySuccessTotal);

        return {
          team: { abbreviation: teamAbbr, fullName },
          overview,
          heroBans,
          mapAnalysis,
          matchHistory,
          recommendations,
        } satisfies ScoutingTeamProfile;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(
            Effect.andThen(Metric.increment(scoutingTeamProfileQueryErrorTotal))
          )
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("scouting.getScoutingTeamProfile")
                : Effect.logInfo("scouting.getScoutingTeamProfile");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(
                scoutingTeamProfileQueryDuration(Effect.succeed(durationMs))
              )
            );
          })
        ),
        Effect.withSpan("scouting.getScoutingTeamProfile")
      );
    }

    // Use a constant key for the no-arg getScoutingTeams
    const scoutingTeamsCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (_key: string) =>
        getScoutingTeams().pipe(
          Effect.tap(() => Metric.increment(scoutingCacheMissTotal))
        ),
    });

    const opponentMatchDataCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamAbbr: string) =>
        getOpponentMatchData(teamAbbr).pipe(
          Effect.tap(() => Metric.increment(scoutingCacheMissTotal))
        ),
    });

    const teamProfileCache = yield* Cache.make({
      capacity: CACHE_CAPACITY,
      timeToLive: CACHE_TTL,
      lookup: (teamAbbr: string) =>
        getScoutingTeamProfile(teamAbbr).pipe(
          Effect.tap(() => Metric.increment(scoutingCacheMissTotal))
        ),
    });

    return {
      getScoutingTeams: () =>
        scoutingTeamsCache
          .get("__all__")
          .pipe(Effect.tap(() => Metric.increment(scoutingCacheRequestTotal))),
      getOpponentMatchData: (teamAbbr: string) =>
        opponentMatchDataCache
          .get(teamAbbr)
          .pipe(Effect.tap(() => Metric.increment(scoutingCacheRequestTotal))),
      getScoutingTeamProfile: (teamAbbr: string) =>
        teamProfileCache
          .get(teamAbbr)
          .pipe(Effect.tap(() => Metric.increment(scoutingCacheRequestTotal))),
    } satisfies ScoutingServiceInterface;
  }
);

export const ScoutingServiceLive = Layer.effect(ScoutingService, make).pipe(
  Layer.provide(EffectObservabilityLive)
);
