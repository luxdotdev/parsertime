import {
  OpponentStrengthService,
  OpponentStrengthServiceLive,
} from "@/data/scouting/opponent-strength-service";
import type { TeamStrengthRating } from "@/data/scouting/types";
import {
  ScoutingService,
  ScoutingServiceLive,
  type OpponentMatchRow,
} from "@/data/scouting/scouting-service";
import {
  ScrimOpponentService,
  ScrimOpponentServiceLive,
} from "@/data/scrim/opponent-service";
import {
  TeamStatsService,
  TeamStatsServiceLive,
} from "@/data/team/stats-service";
import { EffectObservabilityLive } from "@/instrumentation";
import { assessConfidence } from "@/lib/confidence";
import {
  hasScrimData,
  SCRIM_CONFIDENCE_THRESHOLDS,
  type DataAvailabilityProfile,
} from "@/lib/data-availability";
import type { MapType } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { MapIntelligenceQueryError } from "./errors";
import {
  intelligenceCacheRequestTotal,
  intelligenceCacheMissTotal,
  mapIntelligenceQueryDuration,
  mapIntelligenceQueryErrorTotal,
  mapIntelligenceQuerySuccessTotal,
} from "./metrics";
import type {
  MapIntelligence,
  MapMatchupEntry,
  MapPerformanceTrend,
  MapResultRow,
  MapResultRowWithSource,
  MapTypeDependency,
  StrengthWeightedMapWR,
} from "./types";

const INITIAL_RATING = 1500;
const HALF_LIFE_DAYS = 90;
const DECAY_CONSTANT = Math.LN2 / HALF_LIFE_DAYS;
const RECENT_MAP_WINDOW = 10;

function calculateWeight(matchDate: Date): number {
  const daysAgo = (Date.now() - matchDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-DECAY_CONSTANT * daysAgo);
}

function getOpponentMapResults(
  matches: OpponentMatchRow[],
  teamAbbr: string
): MapResultRow[] {
  const rows: MapResultRow[] = [];
  for (const match of matches) {
    const teamSide =
      match.team1 === teamAbbr ? ("team1" as const) : ("team2" as const);
    for (const map of match.maps) {
      rows.push({
        mapName: map.mapName,
        mapType: map.mapType,
        matchDate: match.matchDate,
        team1: match.team1,
        team2: match.team2,
        teamSide,
        winner: map.winner,
      });
    }
  }
  return rows;
}

function computeStrengthWeightedWRs(
  rows: MapResultRowWithSource[],
  teamAbbr: string,
  ratingsMap: Map<string, TeamStrengthRating>,
  includesScrimData: boolean
): StrengthWeightedMapWR[] {
  const strengthRatingAvailable = ratingsMap.size > 0;

  const byMap = new Map<
    string,
    {
      mapType: MapType;
      results: { won: boolean; opponentRating: number; weight: number }[];
      owcsMaps: number;
      scrimMaps: number;
    }
  >();

  for (const row of rows) {
    const won = row.winner === row.teamSide;
    const opponentAbbr = row.teamSide === "team1" ? row.team2 : row.team1;
    const opponentRating =
      ratingsMap.get(opponentAbbr)?.rating ?? INITIAL_RATING;
    const weight = calculateWeight(row.matchDate);

    let entry = byMap.get(row.mapName);
    if (!entry) {
      entry = { mapType: row.mapType, results: [], owcsMaps: 0, scrimMaps: 0 };
      byMap.set(row.mapName, entry);
    }
    entry.results.push({ won, opponentRating, weight });
    if (row.source === "scrim") {
      entry.scrimMaps++;
    } else {
      entry.owcsMaps++;
    }
  }

  const confidenceThresholds = includesScrimData
    ? SCRIM_CONFIDENCE_THRESHOLDS
    : undefined;

  return Array.from(byMap.entries())
    .map(([mapName, { mapType, results, owcsMaps, scrimMaps }]) => {
      const played = results.length;
      const won = results.filter((r) => r.won).length;
      const rawWinRate = played > 0 ? (won / played) * 100 : 0;

      let weightedWinSum = 0;
      let weightedTotalSum = 0;
      for (const r of results) {
        const ratingWeight = strengthRatingAvailable
          ? r.opponentRating / INITIAL_RATING
          : 1;
        const combinedWeight = ratingWeight * r.weight;
        weightedWinSum += r.won ? combinedWeight : 0;
        weightedTotalSum += combinedWeight;
      }
      const strengthWeightedWinRate =
        weightedTotalSum > 0
          ? (weightedWinSum / weightedTotalSum) * 100
          : rawWinRate;

      return {
        mapName,
        mapType,
        rawWinRate,
        strengthWeightedWinRate: strengthRatingAvailable
          ? strengthWeightedWinRate
          : rawWinRate,
        played,
        won,
        confidence: assessConfidence(played, confidenceThresholds),
        strengthRatingAvailable,
        sources: includesScrimData ? { owcsMaps, scrimMaps } : undefined,
      };
    })
    .sort((a, b) => b.strengthWeightedWinRate - a.strengthWeightedWinRate);
}

function computeTrends(rows: MapResultRowWithSource[]): MapPerformanceTrend[] {
  const byMap = new Map<string, { won: boolean; date: Date }[]>();

  for (const row of rows) {
    const won = row.winner === row.teamSide;
    let results = byMap.get(row.mapName);
    if (!results) {
      results = [];
      byMap.set(row.mapName, results);
    }
    results.push({ won, date: row.matchDate });
  }

  return Array.from(byMap.entries())
    .map(([mapName, results]) => {
      results.sort((a, b) => b.date.getTime() - a.date.getTime());

      const overallPlayed = results.length;
      const overallWon = results.filter((r) => r.won).length;
      const overallWinRate =
        overallPlayed > 0 ? (overallWon / overallPlayed) * 100 : 0;

      const recent = results.slice(0, RECENT_MAP_WINDOW);
      const recentPlayed = recent.length;
      const recentWon = recent.filter((r) => r.won).length;
      const recentWinRate =
        recentPlayed > 0 ? (recentWon / recentPlayed) * 100 : 0;

      const delta = recentWinRate - overallWinRate;
      const TREND_THRESHOLD = 10;
      const trend: MapPerformanceTrend["trend"] =
        delta > TREND_THRESHOLD
          ? "improving"
          : delta < -TREND_THRESHOLD
            ? "declining"
            : "stable";

      return {
        mapName,
        overallWinRate,
        recentWinRate,
        overallPlayed,
        recentPlayed,
        delta,
        trend,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function computeMapTypeDependencies(
  rows: MapResultRowWithSource[],
  ratingsMap: Map<string, TeamStrengthRating>,
  includesScrimData: boolean
): MapTypeDependency[] {
  const byType = new Map<
    MapType,
    { results: { won: boolean; opponentRating: number; weight: number }[] }
  >();

  for (const row of rows) {
    const won = row.winner === row.teamSide;
    const opponentAbbr = row.teamSide === "team1" ? row.team2 : row.team1;
    const opponentRating =
      ratingsMap.get(opponentAbbr)?.rating ?? INITIAL_RATING;
    const weight = calculateWeight(row.matchDate);

    let entry = byType.get(row.mapType);
    if (!entry) {
      entry = { results: [] };
      byType.set(row.mapType, entry);
    }
    entry.results.push({ won, opponentRating, weight });
  }

  const strengthRatingAvailable = ratingsMap.size > 0;
  const confidenceThresholds = includesScrimData
    ? SCRIM_CONFIDENCE_THRESHOLDS
    : undefined;

  return Array.from(byType.entries())
    .map(([mapType, { results }]) => {
      const played = results.length;
      const won = results.filter((r) => r.won).length;
      const winRate = played > 0 ? (won / played) * 100 : 0;

      let weightedWinSum = 0;
      let weightedTotalSum = 0;
      for (const r of results) {
        const ratingWeight = strengthRatingAvailable
          ? r.opponentRating / INITIAL_RATING
          : 1;
        const combinedWeight = ratingWeight * r.weight;
        weightedWinSum += r.won ? combinedWeight : 0;
        weightedTotalSum += combinedWeight;
      }
      const strengthWeightedWinRate =
        weightedTotalSum > 0
          ? (weightedWinSum / weightedTotalSum) * 100
          : winRate;

      return {
        mapType,
        played,
        won,
        winRate,
        strengthWeightedWinRate: strengthRatingAvailable
          ? strengthWeightedWinRate
          : winRate,
        confidence: assessConfidence(played, confidenceThresholds),
      };
    })
    .sort((a, b) => b.winRate - a.winRate);
}

function buildMatchupMatrix(
  opponentWRs: StrengthWeightedMapWR[],
  userMapWinrates: Record<
    string,
    { totalWinrate: number; totalWins: number; totalLosses: number }
  >
): MapMatchupEntry[] {
  return opponentWRs
    .map((opp) => {
      const userMap = userMapWinrates[opp.mapName];
      const userPlayed = userMap ? userMap.totalWins + userMap.totalLosses : 0;
      const userWinRate = userMap ? userMap.totalWinrate : null;

      const netAdvantage =
        userWinRate !== null ? userWinRate - opp.strengthWeightedWinRate : null;

      return {
        mapName: opp.mapName,
        mapType: opp.mapType,
        userWinRate,
        userPlayed,
        opponentWinRate: opp.rawWinRate,
        opponentStrengthWeightedWR: opp.strengthWeightedWinRate,
        opponentPlayed: opp.played,
        netAdvantage,
        userConfidence: assessConfidence(userPlayed),
        opponentConfidence: opp.confidence,
      };
    })
    .sort((a, b) => {
      if (a.netAdvantage === null && b.netAdvantage === null) return 0;
      if (a.netAdvantage === null) return 1;
      if (b.netAdvantage === null) return -1;
      return b.netAdvantage - a.netAdvantage;
    });
}

export type MapIntelligenceServiceInterface = {
  readonly getMapIntelligence: (
    opponentAbbr: string,
    userTeamId: number | null,
    profile?: DataAvailabilityProfile
  ) => Effect.Effect<MapIntelligence, MapIntelligenceQueryError>;
};

export class MapIntelligenceService extends Context.Tag(
  "@app/data/intelligence/MapIntelligenceService"
)<MapIntelligenceService, MapIntelligenceServiceInterface>() {}

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make = Effect.gen(function* () {
  const scouting = yield* ScoutingService;
  const opponentStrength = yield* OpponentStrengthService;
  const scrimOpponent = yield* ScrimOpponentService;
  const teamStats = yield* TeamStatsService;
  function getMapIntelligence(
    opponentAbbr: string,
    userTeamId: number | null,
    profile?: DataAvailabilityProfile
  ): Effect.Effect<MapIntelligence, MapIntelligenceQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      opponentAbbr,
      userTeamId,
      hasProfile: !!profile,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("opponentAbbr", opponentAbbr);
      yield* Effect.annotateCurrentSpan("userTeamId", String(userTeamId));
      const [matches, allRatings] = yield* Effect.all([
        scouting.getOpponentMatchData(opponentAbbr),
        opponentStrength.getTeamStrengthRatings(),
      ]).pipe(
        Effect.mapError(
          (error) =>
            new MapIntelligenceQueryError({
              operation: "fetch opponent match data and strength ratings",
              cause: error,
            })
        ),
        Effect.withSpan("intelligence.map.fetchMatchDataAndRatings", {
          attributes: { opponentAbbr },
        })
      );

      const owcsRows = getOpponentMapResults(matches, opponentAbbr);

      const owcsRowsWithSource: MapResultRowWithSource[] = owcsRows.map(
        (r) => ({
          ...r,
          source: "owcs" as const,
        })
      );

      let rows: MapResultRowWithSource[] = owcsRowsWithSource;
      const includesScrimData =
        !!profile && !!userTeamId && hasScrimData(profile);
      wideEvent.includesScrimData = includesScrimData;

      if (includesScrimData && userTeamId !== null) {
        const scrimResults = yield* scrimOpponent
          .getOpponentScrimMapResults(userTeamId, opponentAbbr)
          .pipe(
            Effect.mapError(
              (error) =>
                new MapIntelligenceQueryError({
                  operation: "fetch opponent scrim map results",
                  cause: error,
                })
            ),
            Effect.withSpan("intelligence.map.fetchScrimMapResults", {
              attributes: { opponentAbbr, userTeamId },
            })
          );

        const scrimRows: MapResultRowWithSource[] = scrimResults.map((r) => ({
          mapName: r.mapName,
          mapType: r.mapType,
          matchDate: r.scrimDate,
          team1: "user",
          team2: opponentAbbr,
          teamSide: "team1" as const,
          winner: r.opponentWon ? "team2" : "team1",
          source: "scrim" as const,
        }));
        rows = [...owcsRowsWithSource, ...scrimRows];
      }

      wideEvent.rowCount = rows.length;
      wideEvent.owcsRowCount = owcsRowsWithSource.length;
      wideEvent.scrimRowCount = rows.length - owcsRowsWithSource.length;

      const ratingsMap = new Map(allRatings.map((r) => [r.teamAbbr, r]));
      wideEvent.ratingsAvailable = ratingsMap.size > 0;

      const strengthWeightedWRs = computeStrengthWeightedWRs(
        rows,
        opponentAbbr,
        ratingsMap,
        includesScrimData
      );
      const trends = computeTrends(rows);
      const mapTypeDependencies = computeMapTypeDependencies(
        rows,
        ratingsMap,
        includesScrimData
      );

      let matchupMatrix: MapMatchupEntry[] = [];
      if (userTeamId !== null) {
        const userWinrates = yield* teamStats.getTeamWinrates(userTeamId).pipe(
          Effect.mapError(
            (error) =>
              new MapIntelligenceQueryError({
                operation: "fetch user team winrates for matchup matrix",
                cause: error,
              })
          ),
          Effect.withSpan("intelligence.map.fetchUserWinrates", {
            attributes: { userTeamId },
          })
        );

        matchupMatrix = buildMatchupMatrix(
          strengthWeightedWRs,
          userWinrates.byMap
        );
      }

      wideEvent.strengthWeightedWRCount = strengthWeightedWRs.length;
      wideEvent.trendCount = trends.length;
      wideEvent.mapTypeDependencyCount = mapTypeDependencies.length;
      wideEvent.matchupMatrixCount = matchupMatrix.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(mapIntelligenceQuerySuccessTotal);

      return {
        strengthWeightedWRs,
        trends,
        mapTypeDependencies,
        matchupMatrix,
      } satisfies MapIntelligence;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(
          Effect.andThen(Metric.increment(mapIntelligenceQueryErrorTotal))
        )
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("intelligence.getMapIntelligence")
              : Effect.logInfo("intelligence.getMapIntelligence");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              mapIntelligenceQueryDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("intelligence.getMapIntelligence")
    );
  }

  function mapIntelCacheKeyOf(
    opponentAbbr: string,
    userTeamId: number | null,
    profile?: DataAvailabilityProfile
  ) {
    return JSON.stringify({
      opponentAbbr,
      userTeamId,
      profile: profile ?? null,
    });
  }

  const mapIntelCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const { opponentAbbr, userTeamId, profile } = JSON.parse(key) as {
        opponentAbbr: string;
        userTeamId: number | null;
        profile: DataAvailabilityProfile | null;
      };
      return getMapIntelligence(
        opponentAbbr,
        userTeamId,
        profile ?? undefined
      ).pipe(Effect.tap(() => Metric.increment(intelligenceCacheMissTotal)));
    },
  });

  return {
    getMapIntelligence: (
      opponentAbbr: string,
      userTeamId: number | null,
      profile?: DataAvailabilityProfile
    ) =>
      mapIntelCache
        .get(mapIntelCacheKeyOf(opponentAbbr, userTeamId, profile))
        .pipe(
          Effect.tap(() => Metric.increment(intelligenceCacheRequestTotal))
        ),
  } satisfies MapIntelligenceServiceInterface;
});

export const MapIntelligenceServiceLive = Layer.effect(
  MapIntelligenceService,
  make
).pipe(
  Layer.provide(ScoutingServiceLive),
  Layer.provide(OpponentStrengthServiceLive),
  Layer.provide(ScrimOpponentServiceLive),
  Layer.provide(TeamStatsServiceLive),
  Layer.provide(EffectObservabilityLive)
);
