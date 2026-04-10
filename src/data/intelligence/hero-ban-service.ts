import { EffectObservabilityLive } from "@/instrumentation";
import { assessConfidence } from "@/lib/confidence";
import {
  hasScrimData,
  SCRIM_CONFIDENCE_THRESHOLDS,
  type DataAvailabilityProfile,
} from "@/lib/data-availability";
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
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "@/data/team/shared-data-service";
import type { MapType } from "@prisma/client";
import { Cache, Context, Duration, Effect, Layer, Metric } from "effect";
import { HeroBanIntelligenceQueryError } from "./errors";
import {
  heroBanIntelligenceQueryDuration,
  heroBanIntelligenceQueryErrorTotal,
  heroBanIntelligenceQuerySuccessTotal,
  intelligenceCacheRequestTotal,
  intelligenceCacheMissTotal,
} from "./metrics";
import type {
  BanDisruptionEntry,
  BanRateByMapType,
  ComfortCrutch,
  HeroBanIntelligence,
  HeroExposure,
  HeroWinRateDelta,
  MapWithBans,
  ProtectedHero,
} from "./types";

function getOpponentMapBanData(
  matches: OpponentMatchRow[],
  teamAbbr: string
): MapWithBans[] {
  const results: MapWithBans[] = [];
  for (const match of matches) {
    const teamSide =
      match.team1 === teamAbbr ? ("team1" as const) : ("team2" as const);
    for (const map of match.maps) {
      results.push({
        mapName: map.mapName,
        mapType: map.mapType,
        matchDate: match.matchDate,
        teamSide,
        won: map.winner === teamSide,
        heroBans: map.heroBans.map((b) => ({ team: b.team, hero: b.hero })),
        source: "owcs",
      });
    }
  }
  return results;
}

function computeWinRateDeltas(
  maps: MapWithBans[],
  includesScrimData: boolean
): HeroWinRateDelta[] {
  const confidenceThresholds = includesScrimData
    ? SCRIM_CONFIDENCE_THRESHOLDS
    : undefined;

  const totalMaps = maps.length;
  const totalWins = maps.filter((m) => m.won).length;

  const bannedAccum = new Map<
    string,
    { bannedTotal: number; bannedWins: number }
  >();

  for (const map of maps) {
    for (const ban of map.heroBans) {
      let accum = bannedAccum.get(ban.hero);
      if (!accum) {
        accum = { bannedTotal: 0, bannedWins: 0 };
        bannedAccum.set(ban.hero, accum);
      }
      accum.bannedTotal++;
      if (map.won) accum.bannedWins++;
    }
  }

  return Array.from(bannedAccum.entries())
    .map(([hero, accum]) => {
      const availableTotal = totalMaps - accum.bannedTotal;
      const availableWins = totalWins - accum.bannedWins;

      const winRateWhenAvailable =
        availableTotal > 0 ? (availableWins / availableTotal) * 100 : 0;
      const winRateWhenBanned =
        accum.bannedTotal > 0
          ? (accum.bannedWins / accum.bannedTotal) * 100
          : 0;

      return {
        hero,
        winRateWhenAvailable,
        winRateWhenBanned,
        delta: winRateWhenAvailable - winRateWhenBanned,
        mapsAvailable: availableTotal,
        mapsBanned: accum.bannedTotal,
        confidenceAvailable: assessConfidence(
          availableTotal,
          confidenceThresholds
        ),
        confidenceBanned: assessConfidence(
          accum.bannedTotal,
          confidenceThresholds
        ),
      };
    })
    .sort((a, b) => b.delta - a.delta);
}

function computeComfortCrutches(
  maps: MapWithBans[],
  winRateDeltas: HeroWinRateDelta[],
  includesScrimData: boolean
): ComfortCrutch[] {
  const confidenceThresholds = includesScrimData
    ? SCRIM_CONFIDENCE_THRESHOLDS
    : undefined;
  const totalMaps = maps.length;

  const banCounts = new Map<string, number>();
  for (const map of maps) {
    for (const ban of map.heroBans) {
      banCounts.set(ban.hero, (banCounts.get(ban.hero) ?? 0) + 1);
    }
  }

  const deltaMap = new Map(winRateDeltas.map((d) => [d.hero, d]));

  return Array.from(banCounts.entries())
    .map(([hero, banFrequency]) => {
      const banRate = totalMaps > 0 ? (banFrequency / totalMaps) * 100 : 0;
      const wrDelta = deltaMap.get(hero);
      const winRateDelta = wrDelta?.delta ?? 0;

      // Crutch score = ban rate * WR delta (higher = more exploitable)
      // Normalized: ban rate as fraction * delta as fraction
      const crutchScore = (banRate / 100) * Math.max(0, winRateDelta);

      return {
        hero,
        banFrequency,
        totalMaps,
        banRate,
        winRateDelta,
        crutchScore,
        confidence: assessConfidence(banFrequency, confidenceThresholds),
      };
    })
    .filter((c) => c.winRateDelta > 0)
    .sort((a, b) => b.crutchScore - a.crutchScore);
}

function computeProtectedHeroes(maps: MapWithBans[]): ProtectedHero[] {
  const totalMaps = maps.length;
  const bansByTeam = new Map<string, number>();

  for (const map of maps) {
    for (const ban of map.heroBans) {
      if (ban.team === map.teamSide) {
        bansByTeam.set(ban.hero, (bansByTeam.get(ban.hero) ?? 0) + 1);
      }
    }
  }

  return Array.from(bansByTeam.entries())
    .map(([hero, timesBannedByTeam]) => ({
      hero,
      timesBannedByTeam,
      totalMaps,
      banRate: totalMaps > 0 ? (timesBannedByTeam / totalMaps) * 100 : 0,
    }))
    .sort((a, b) => a.banRate - b.banRate)
    .filter((h) => h.banRate < 5);
}

function computeBanRateByMapType(maps: MapWithBans[]): BanRateByMapType[] {
  const mapTypeCount = new Map<MapType, number>();
  const heroBansByType = new Map<string, Map<MapType, number>>();

  for (const map of maps) {
    mapTypeCount.set(map.mapType, (mapTypeCount.get(map.mapType) ?? 0) + 1);

    for (const ban of map.heroBans) {
      let heroTypes = heroBansByType.get(ban.hero);
      if (!heroTypes) {
        heroTypes = new Map();
        heroBansByType.set(ban.hero, heroTypes);
      }
      heroTypes.set(map.mapType, (heroTypes.get(map.mapType) ?? 0) + 1);
    }
  }

  const results: BanRateByMapType[] = [];
  for (const [hero, typeMap] of heroBansByType) {
    for (const [mapType, banCount] of typeMap) {
      const totalMapsOfType = mapTypeCount.get(mapType) ?? 0;
      results.push({
        hero,
        mapType,
        banCount,
        totalMapsOfType,
        banRate: totalMapsOfType > 0 ? (banCount / totalMapsOfType) * 100 : 0,
      });
    }
  }

  return results.sort((a, b) => b.banRate - a.banRate);
}

function computeHeroExposureSync(
  maps: MapWithBans[],
  allPlayerStats: {
    player_name: string;
    player_hero: string;
    hero_time_played: number;
  }[],
  teamRosterSet: Set<string>
): HeroExposure[] {
  const heroTimePlayed = new Map<string, number>();
  let totalTimePlayed = 0;

  for (const stat of allPlayerStats) {
    if (!teamRosterSet.has(stat.player_name)) continue;
    const current = heroTimePlayed.get(stat.player_hero) ?? 0;
    heroTimePlayed.set(stat.player_hero, current + stat.hero_time_played);
    totalTimePlayed += stat.hero_time_played;
  }

  const totalOpponentMaps = maps.length;
  const opponentBanCounts = new Map<string, number>();
  for (const map of maps) {
    const opponentSide = map.teamSide === "team1" ? "team2" : "team1";
    for (const ban of map.heroBans) {
      if (ban.team === opponentSide) {
        opponentBanCounts.set(
          ban.hero,
          (opponentBanCounts.get(ban.hero) ?? 0) + 1
        );
      }
    }
  }

  const exposures: HeroExposure[] = [];
  for (const [hero, timePlayed] of heroTimePlayed) {
    const playRate =
      totalTimePlayed > 0 ? (timePlayed / totalTimePlayed) * 100 : 0;
    if (playRate < 1) continue;

    const opponentBanCount = opponentBanCounts.get(hero) ?? 0;
    const opponentBanRate =
      totalOpponentMaps > 0 ? (opponentBanCount / totalOpponentMaps) * 100 : 0;

    const HIGH_BAN_THRESHOLD = 30;
    const MEDIUM_BAN_THRESHOLD = 15;
    const exposureRisk: HeroExposure["exposureRisk"] =
      opponentBanRate >= HIGH_BAN_THRESHOLD && playRate >= 10
        ? "high"
        : opponentBanRate >= MEDIUM_BAN_THRESHOLD && playRate >= 5
          ? "medium"
          : "low";

    exposures.push({
      hero,
      userPlayRate: playRate,
      userTimePlayed: timePlayed,
      opponentBanRate,
      opponentBanCount,
      exposureRisk,
    });
  }

  return exposures
    .filter((e) => e.opponentBanCount > 0)
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      if (riskOrder[a.exposureRisk] !== riskOrder[b.exposureRisk]) {
        return riskOrder[a.exposureRisk] - riskOrder[b.exposureRisk];
      }
      return b.userPlayRate - a.userPlayRate;
    });
}

function computeBanDisruptionRanking(
  winRateDeltas: HeroWinRateDelta[],
  includesScrimData: boolean
): BanDisruptionEntry[] {
  const confidenceThresholds = includesScrimData
    ? SCRIM_CONFIDENCE_THRESHOLDS
    : undefined;

  return winRateDeltas
    .filter((d) => d.mapsBanned >= 2)
    .map((d) => {
      // Disruption score weights the WR delta by the confidence of the ban sample.
      // A large delta from 2 maps is less reliable than a moderate delta from 10.
      const sampleWeight = Math.min(d.mapsBanned / 10, 1);
      const disruptionScore = d.delta * sampleWeight;

      return {
        hero: d.hero,
        winRateDelta: d.delta,
        mapsAvailable: d.mapsAvailable,
        mapsBanned: d.mapsBanned,
        disruptionScore,
        confidence: assessConfidence(d.mapsBanned, confidenceThresholds),
      };
    })
    .sort((a, b) => b.disruptionScore - a.disruptionScore);
}

export type HeroBanIntelligenceServiceInterface = {
  readonly getHeroBanIntelligence: (
    opponentAbbr: string,
    userTeamId: number | null,
    profile?: DataAvailabilityProfile
  ) => Effect.Effect<HeroBanIntelligence, HeroBanIntelligenceQueryError>;
};

// Context tag

export class HeroBanIntelligenceService extends Context.Tag(
  "@app/data/intelligence/HeroBanIntelligenceService"
)<HeroBanIntelligenceService, HeroBanIntelligenceServiceInterface>() {}

// Implementation

const CACHE_TTL = Duration.seconds(30);
const CACHE_CAPACITY = 64;

export const make = Effect.gen(function* () {
  const scouting = yield* ScoutingService;
  const scrimOpponent = yield* ScrimOpponentService;
  const teamSharedData = yield* TeamSharedDataService;
  function getHeroBanIntelligence(
    opponentAbbr: string,
    userTeamId: number | null,
    profile?: DataAvailabilityProfile
  ): Effect.Effect<HeroBanIntelligence, HeroBanIntelligenceQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      opponentAbbr,
      userTeamId,
      hasProfile: !!profile,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("opponentAbbr", opponentAbbr);
      yield* Effect.annotateCurrentSpan("userTeamId", String(userTeamId));
      const matches = yield* scouting.getOpponentMatchData(opponentAbbr).pipe(
        Effect.mapError(
          (error) =>
            new HeroBanIntelligenceQueryError({
              operation: "fetch opponent match data",
              cause: error,
            })
        ),
        Effect.withSpan("intelligence.heroBan.fetchOpponentMatchData", {
          attributes: { opponentAbbr },
        })
      );

      const owcsMaps = getOpponentMapBanData(matches, opponentAbbr);

      const includesScrimData =
        !!profile && !!userTeamId && hasScrimData(profile);
      wideEvent.includesScrimData = includesScrimData;

      let maps: MapWithBans[] = owcsMaps;

      if (includesScrimData && userTeamId !== null) {
        const scrimBans = yield* scrimOpponent
          .getOpponentScrimHeroBans(userTeamId, opponentAbbr)
          .pipe(
            Effect.mapError(
              (error) =>
                new HeroBanIntelligenceQueryError({
                  operation: "fetch opponent scrim hero bans",
                  cause: error,
                })
            ),
            Effect.withSpan("intelligence.heroBan.fetchScrimHeroBans", {
              attributes: { opponentAbbr, userTeamId },
            })
          );

        const scrimMaps: MapWithBans[] = scrimBans.map((s) => ({
          mapName: s.mapName,
          mapType: s.mapType,
          matchDate: s.scrimDate,
          teamSide: "team2" as const,
          won: !s.opponentWon,
          heroBans: s.opponentBans.map((hero) => ({
            team: "team2",
            hero,
          })),
          source: "scrim" as const,
        }));
        maps = [...owcsMaps, ...scrimMaps];
      }

      wideEvent.mapCount = maps.length;
      wideEvent.owcsMapCount = owcsMaps.length;
      wideEvent.scrimMapCount = maps.length - owcsMaps.length;

      const winRateDeltas = computeWinRateDeltas(maps, includesScrimData);
      const comfortCrutches = computeComfortCrutches(
        maps,
        winRateDeltas,
        includesScrimData
      );
      const protectedHeroes = computeProtectedHeroes(maps);
      const banRateByMapType = computeBanRateByMapType(maps);
      const banDisruptionRanking = computeBanDisruptionRanking(
        winRateDeltas,
        includesScrimData
      );

      let heroExposure: HeroExposure[] = [];
      if (userTeamId !== null) {
        const baseData = yield* teamSharedData.getBaseTeamData(userTeamId).pipe(
          Effect.mapError(
            (error) =>
              new HeroBanIntelligenceQueryError({
                operation: "fetch base team data for hero exposure",
                cause: error,
              })
          ),
          Effect.withSpan("intelligence.heroBan.fetchBaseTeamData", {
            attributes: { userTeamId },
          })
        );

        heroExposure = computeHeroExposureSync(
          maps,
          baseData.allPlayerStats,
          baseData.teamRosterSet
        );
      }

      wideEvent.winRateDeltaCount = winRateDeltas.length;
      wideEvent.comfortCrutchCount = comfortCrutches.length;
      wideEvent.protectedHeroCount = protectedHeroes.length;
      wideEvent.heroExposureCount = heroExposure.length;
      wideEvent.banDisruptionCount = banDisruptionRanking.length;
      wideEvent.outcome = "success";
      yield* Metric.increment(heroBanIntelligenceQuerySuccessTotal);

      return {
        winRateDeltas,
        comfortCrutches,
        protectedHeroes,
        banRateByMapType,
        heroExposure,
        banDisruptionRanking,
      } satisfies HeroBanIntelligence;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(
          Effect.andThen(Metric.increment(heroBanIntelligenceQueryErrorTotal))
        )
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("intelligence.getHeroBanIntelligence")
              : Effect.logInfo("intelligence.getHeroBanIntelligence");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(
              heroBanIntelligenceQueryDuration(Effect.succeed(durationMs))
            )
          );
        })
      ),
      Effect.withSpan("intelligence.getHeroBanIntelligence")
    );
  }

  function heroBanCacheKeyOf(
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

  const heroBanCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const { opponentAbbr, userTeamId, profile } = JSON.parse(key) as {
        opponentAbbr: string;
        userTeamId: number | null;
        profile: DataAvailabilityProfile | null;
      };
      return getHeroBanIntelligence(
        opponentAbbr,
        userTeamId,
        profile ?? undefined
      ).pipe(Effect.tap(() => Metric.increment(intelligenceCacheMissTotal)));
    },
  });

  return {
    getHeroBanIntelligence: (
      opponentAbbr: string,
      userTeamId: number | null,
      profile?: DataAvailabilityProfile
    ) =>
      heroBanCache
        .get(heroBanCacheKeyOf(opponentAbbr, userTeamId, profile))
        .pipe(
          Effect.tap(() => Metric.increment(intelligenceCacheRequestTotal))
        ),
  } satisfies HeroBanIntelligenceServiceInterface;
});

export const HeroBanIntelligenceServiceLive = Layer.effect(
  HeroBanIntelligenceService,
  make
).pipe(
  Layer.provide(ScoutingServiceLive),
  Layer.provide(ScrimOpponentServiceLive),
  Layer.provide(TeamSharedDataServiceLive),
  Layer.provide(EffectObservabilityLive)
);
