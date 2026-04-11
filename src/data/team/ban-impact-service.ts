import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import {
  Cache,
  Context,
  Duration,
  Effect,
  Layer,
  Metric,
  MetricBoundaries,
} from "effect";
import { TeamQueryError } from "./errors";
import type { BaseTeamData, TeamDateRange } from "./shared-core";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
  parseDateRangeFromCacheKey,
} from "./shared-core";
import { teamCacheRequestTotal, teamCacheMissTotal } from "./metrics";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

const banImpactQuerySuccessTotal = Metric.counter(
  "team.ban_impact.query.success",
  { description: "Total successful team ban impact queries", incremental: true }
);
const banImpactQueryErrorTotal = Metric.counter("team.ban_impact.query.error", {
  description: "Total team ban impact query failures",
  incremental: true,
});
const banImpactQueryDuration = Metric.histogram(
  "team.ban_impact.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team ban impact query duration in milliseconds"
);

export type {
  HeroBanImpact,
  TeamBanImpactAnalysis,
  OurBanImpact,
  TeamOurBanAnalysis,
  CombinedBanAnalysis,
} from "./types";
import type {
  HeroBanImpact,
  TeamBanImpactAnalysis,
  OurBanImpact,
  TeamOurBanAnalysis,
  CombinedBanAnalysis,
} from "./types";

const MIN_BANS_FOR_SIGNIFICANCE = 3;
const WEAK_POINT_DELTA_THRESHOLD = 0.15;
const STRONG_BAN_DELTA_THRESHOLD = 0.1;

function createEmptyAnalysis(): CombinedBanAnalysis {
  return {
    received: {
      banImpacts: [],
      mostBanned: [],
      weakPoints: [],
      totalMapsAnalyzed: 0,
    },
    outgoing: {
      ourBanImpacts: [],
      mostBannedByUs: [],
      strongBans: [],
      totalMapsAnalyzed: 0,
    },
  };
}

export function processBanImpactAnalysis(
  sharedData: BaseTeamData,
  heroBans: { MapDataId: number | null; team: string; hero: string }[]
): CombinedBanAnalysis {
  const {
    teamRosterSet,
    mapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
  } = sharedData;

  if (mapDataRecords.length === 0) return createEmptyAnalysis();

  const finalRoundMap = buildFinalRoundMap(finalRounds);
  const matchStartMap = buildMatchStartMap(matchStarts);
  const { team1CapturesMap, team2CapturesMap } = buildCapturesMaps(
    captures,
    matchStartMap
  );
  const {
    team1ProgressMap: team1PayloadProgressMap,
    team2ProgressMap: team2PayloadProgressMap,
  } = buildProgressMaps(payloadProgresses, matchStartMap);
  const {
    team1ProgressMap: team1PointProgressMap,
    team2ProgressMap: team2PointProgressMap,
  } = buildProgressMaps(pointProgresses, matchStartMap);

  type MapOutcome = {
    mapDataId: number;
    teamName: string;
    isWin: boolean;
    bannedHeroes: Set<string>;
    heroesBannedByUs: Set<string>;
  };
  const mapOutcomes: MapOutcome[] = [];

  const bansByMapId = new Map<number, { team: string; hero: string }[]>();
  for (const ban of heroBans) {
    if (!ban.MapDataId) continue;
    if (!bansByMapId.has(ban.MapDataId)) bansByMapId.set(ban.MapDataId, []);
    bansByMapId.get(ban.MapDataId)!.push({ team: ban.team, hero: ban.hero });
  }

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (!teamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === teamName
    );
    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    const matchDetails = matchStartMap.get(mapDataId) ?? null;
    const finalRound = finalRoundMap.get(mapDataId) ?? null;
    const winner = calculateWinner({
      matchDetails,
      finalRound,
      team1Captures: team1CapturesMap.get(mapDataId) ?? [],
      team2Captures: team2CapturesMap.get(mapDataId) ?? [],
      team1PayloadProgress: team1PayloadProgressMap.get(mapDataId) ?? [],
      team2PayloadProgress: team2PayloadProgressMap.get(mapDataId) ?? [],
      team1PointProgress: team1PointProgressMap.get(mapDataId) ?? [],
      team2PointProgress: team2PointProgressMap.get(mapDataId) ?? [],
    });

    const isWin = winner === teamName;
    const mapBans = bansByMapId.get(mapDataId) ?? [];
    const bannedHeroes = new Set<string>();
    const heroesBannedByUs = new Set<string>();
    for (const ban of mapBans) {
      if (ban.team !== teamName) bannedHeroes.add(ban.hero);
      else heroesBannedByUs.add(ban.hero);
    }
    mapOutcomes.push({
      mapDataId,
      teamName,
      isWin,
      bannedHeroes,
      heroesBannedByUs,
    });
  }

  if (mapOutcomes.length === 0) return createEmptyAnalysis();

  const totalMaps = mapOutcomes.length;
  const overallWins = mapOutcomes.filter((o) => o.isWin).length;
  const overallWinRate = totalMaps > 0 ? overallWins / totalMaps : 0;

  const allBannedHeroes = new Set<string>();
  for (const outcome of mapOutcomes)
    for (const hero of outcome.bannedHeroes) allBannedHeroes.add(hero);

  const banImpacts: HeroBanImpact[] = [];
  for (const hero of allBannedHeroes) {
    const mapsWithBan = mapOutcomes.filter((o) => o.bannedHeroes.has(hero));
    const mapsWithoutBan = mapOutcomes.filter(
      (o) => !o.bannedHeroes.has(hero)
    );
    const mapsBanned = mapsWithBan.length;
    if (mapsBanned < MIN_BANS_FOR_SIGNIFICANCE) continue;
    const winsWhenBanned = mapsWithBan.filter((o) => o.isWin).length;
    const winsWhenAvailable = mapsWithoutBan.filter((o) => o.isWin).length;
    const winRateWithoutHero =
      mapsBanned > 0 ? winsWhenBanned / mapsBanned : 0;
    const winRateWithHero =
      mapsWithoutBan.length > 0
        ? winsWhenAvailable / mapsWithoutBan.length
        : overallWinRate;
    const winRateDelta = winRateWithHero - winRateWithoutHero;
    banImpacts.push({
      hero,
      totalBans: mapsBanned,
      banRate: mapsBanned / totalMaps,
      winRateWithHero,
      winRateWithoutHero,
      winRateDelta,
      mapsPlayed: totalMaps,
      mapsBanned,
    });
  }
  banImpacts.sort((a, b) => b.banRate - a.banRate);
  const mostBanned = banImpacts.slice(0, 10);
  const weakPoints = banImpacts
    .filter(
      (impact) =>
        impact.winRateDelta >= WEAK_POINT_DELTA_THRESHOLD &&
        impact.mapsBanned >= MIN_BANS_FOR_SIGNIFICANCE
    )
    .sort((a, b) => b.winRateDelta - a.winRateDelta);

  const received: TeamBanImpactAnalysis = {
    banImpacts,
    mostBanned,
    weakPoints,
    totalMapsAnalyzed: totalMaps,
  };

  const allHeroesBannedByUs = new Set<string>();
  for (const outcome of mapOutcomes)
    for (const hero of outcome.heroesBannedByUs)
      allHeroesBannedByUs.add(hero);

  const ourBanImpacts: OurBanImpact[] = [];
  for (const hero of allHeroesBannedByUs) {
    const mapsWhereBanned = mapOutcomes.filter((o) =>
      o.heroesBannedByUs.has(hero)
    );
    const mapsWhereNotBanned = mapOutcomes.filter(
      (o) => !o.heroesBannedByUs.has(hero)
    );
    const mapsBanned = mapsWhereBanned.length;
    if (mapsBanned < MIN_BANS_FOR_SIGNIFICANCE) continue;
    const winsWhenWeBanned = mapsWhereBanned.filter((o) => o.isWin).length;
    const winsWhenWeDidNotBan = mapsWhereNotBanned.filter(
      (o) => o.isWin
    ).length;
    const winRateWhenBanned =
      mapsBanned > 0 ? winsWhenWeBanned / mapsBanned : 0;
    const winRateWhenNotBanned =
      mapsWhereNotBanned.length > 0
        ? winsWhenWeDidNotBan / mapsWhereNotBanned.length
        : overallWinRate;
    const winRateDelta = winRateWhenBanned - winRateWhenNotBanned;
    ourBanImpacts.push({
      hero,
      totalBans: mapsBanned,
      banRate: mapsBanned / totalMaps,
      winRateWhenBanned,
      winRateWhenNotBanned,
      winRateDelta,
      mapsPlayed: totalMaps,
      mapsBanned,
    });
  }
  ourBanImpacts.sort((a, b) => b.banRate - a.banRate);
  const mostBannedByUs = ourBanImpacts.slice(0, 10);
  const strongBans = ourBanImpacts
    .filter(
      (impact) =>
        impact.winRateDelta >= STRONG_BAN_DELTA_THRESHOLD &&
        impact.mapsBanned >= MIN_BANS_FOR_SIGNIFICANCE
    )
    .sort((a, b) => b.winRateDelta - a.winRateDelta);

  const outgoing: TeamOurBanAnalysis = {
    ourBanImpacts,
    mostBannedByUs,
    strongBans,
    totalMapsAnalyzed: totalMaps,
  };

  return { received, outgoing };
}

export type TeamBanImpactServiceInterface = {
  readonly getTeamBanImpactAnalysis: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<CombinedBanAnalysis, TeamQueryError>;
};

export class TeamBanImpactService extends Context.Tag(
  "@app/data/team/TeamBanImpactService"
)<TeamBanImpactService, TeamBanImpactServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getTeamBanImpactAnalysis(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<CombinedBanAnalysis, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const sharedData = yield* shared.getBaseTeamData(teamId, { dateRange });

      const { mapDataRecords, mapDataIds } = sharedData;

      if (mapDataRecords.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.total_maps = 0;
        yield* Metric.increment(banImpactQuerySuccessTotal);
        return createEmptyAnalysis();
      }

      const heroBans = yield* Effect.tryPromise({
        try: () =>
          prisma.heroBan.findMany({
            where: { MapDataId: { in: mapDataIds } },
            select: { MapDataId: true, team: true, hero: true },
          }),
        catch: (error) =>
          new TeamQueryError({ operation: "fetch hero bans", cause: error }),
      });

      const result = processBanImpactAnalysis(sharedData, heroBans);

      wideEvent.outcome = "success";
      wideEvent.total_maps = result.received.totalMapsAnalyzed;
      wideEvent.received_ban_count = result.received.banImpacts.length;
      wideEvent.outgoing_ban_count = result.outgoing.ourBanImpacts.length;
      yield* Metric.increment(banImpactQuerySuccessTotal);

      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(banImpactQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.banImpact.getTeamBanImpactAnalysis")
              : Effect.logInfo("team.banImpact.getTeamBanImpactAnalysis");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(banImpactQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.banImpact.getTeamBanImpactAnalysis")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const banImpactCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getTeamBanImpactAnalysis(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getTeamBanImpactAnalysis: (teamId: number, dateRange?: TeamDateRange) =>
      banImpactCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamBanImpactServiceInterface;
});

export const TeamBanImpactServiceLive = Layer.effect(
  TeamBanImpactService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
