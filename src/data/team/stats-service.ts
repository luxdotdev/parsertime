import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { PlayerStat } from "@prisma/client";
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
} from "./shared-core";
import { teamCacheRequestTotal, teamCacheMissTotal } from "./metrics";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

const statsQuerySuccessTotal = Metric.counter("team.stats.query.success", {
  description: "Total successful team stats queries",
  incremental: true,
});

const statsQueryErrorTotal = Metric.counter("team.stats.query.error", {
  description: "Total team stats query failures",
  incremental: true,
});

const statsQueryDuration = Metric.histogram(
  "team.stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team stats query duration in milliseconds"
);

type RosterCombination = {
  players: string[];
  wins: number;
  losses: number;
  winrate: number;
};

type MapWinrate = {
  mapName: string;
  totalWins: number;
  totalLosses: number;
  totalWinrate: number;
  rosterVariants: RosterCombination[];
  bestRoster: string[] | null;
  bestWinrate: number;
};

export type TeamWinrates = {
  overallWins: number;
  overallLosses: number;
  overallWinrate: number;
  byMap: Record<string, MapWinrate>;
};

export type TopMapByPlaytime = {
  name: string;
  playtime: number;
};

export type BestMapByWinrate = {
  mapName: string;
  playtime: number;
  winrate: number;
};

function getRosterForMap(
  mapDataId: number,
  teamName: string,
  allPlayerStats: {
    player_name: string;
    player_team: string;
    MapDataId: number | null;
  }[]
): string[] {
  const roster = new Set<string>();
  for (const stat of allPlayerStats) {
    if (stat.MapDataId === mapDataId && stat.player_team === teamName) {
      roster.add(stat.player_name);
    }
  }
  return Array.from(roster).sort();
}

function findTeamNameForMap(
  mapDataId: number,
  allPlayerStats: {
    player_name: string;
    player_team: string;
    MapDataId: number | null;
  }[],
  sortedPlayers: [string, number][]
): string | null {
  for (const [playerName] of sortedPlayers) {
    for (const stat of allPlayerStats) {
      if (stat.MapDataId === mapDataId && stat.player_name === playerName) {
        return stat.player_team;
      }
    }
  }
  return null;
}

function processTeamWinrates(sharedData: BaseTeamData): TeamWinrates {
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

  if (sharedData.teamRoster.length === 0 || mapDataRecords.length === 0) {
    return {
      overallWins: 0,
      overallLosses: 0,
      overallWinrate: 0,
      byMap: {},
    };
  }

  const playerFrequencyMap = new Map<string, number>();
  const mapPlayerSets = new Map<number, Set<string>>();

  for (const stat of allPlayerStats) {
    const mapDataId = stat.MapDataId;
    if (!mapDataId) continue;

    if (!mapPlayerSets.has(mapDataId)) {
      mapPlayerSets.set(mapDataId, new Set<string>());
    }

    const playersInMap = mapPlayerSets.get(mapDataId)!;
    if (!playersInMap.has(stat.player_name)) {
      playersInMap.add(stat.player_name);
      const currentCount = playerFrequencyMap.get(stat.player_name) ?? 0;
      playerFrequencyMap.set(stat.player_name, currentCount + 1);
    }
  }

  const sortedPlayers = Array.from(playerFrequencyMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );

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

  const mapWinrateData = new Map<string, MapWinrate>();
  let overallWins = 0;
  let overallLosses = 0;

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const mapName = mapDataRecord.name ?? "Unknown Map";

    const teamName = findTeamNameForMap(
      mapDataId,
      allPlayerStats,
      sortedPlayers
    );

    if (!teamName) continue;

    const roster = getRosterForMap(mapDataId, teamName, allPlayerStats);

    const allPlayersInTeamRoster = roster.every((player) =>
      teamRosterSet.has(player)
    );

    if (!allPlayersInTeamRoster) continue;

    const rosterKey = roster.join(",");

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

    if (isWin) {
      overallWins++;
    } else {
      overallLosses++;
    }

    if (!mapWinrateData.has(mapName)) {
      mapWinrateData.set(mapName, {
        mapName,
        totalWins: 0,
        totalLosses: 0,
        totalWinrate: 0,
        rosterVariants: [],
        bestRoster: null,
        bestWinrate: 0,
      });
    }

    const currentMapData = mapWinrateData.get(mapName)!;

    if (isWin) {
      currentMapData.totalWins++;
    } else {
      currentMapData.totalLosses++;
    }

    let rosterVariant = currentMapData.rosterVariants.find(
      (rv) => rv.players.join(",") === rosterKey
    );

    if (!rosterVariant) {
      rosterVariant = {
        players: roster,
        wins: 0,
        losses: 0,
        winrate: 0,
      };
      currentMapData.rosterVariants.push(rosterVariant);
    }

    if (isWin) {
      rosterVariant.wins++;
    } else {
      rosterVariant.losses++;
    }
  }

  for (const mapData of mapWinrateData.values()) {
    const total = mapData.totalWins + mapData.totalLosses;
    mapData.totalWinrate = total > 0 ? (mapData.totalWins / total) * 100 : 0;

    for (const variant of mapData.rosterVariants) {
      const variantTotal = variant.wins + variant.losses;
      variant.winrate =
        variantTotal > 0 ? (variant.wins / variantTotal) * 100 : 0;
    }

    mapData.rosterVariants.sort((a, b) => b.winrate - a.winrate);

    if (mapData.rosterVariants.length > 0) {
      mapData.bestRoster = mapData.rosterVariants[0].players;
      mapData.bestWinrate = mapData.rosterVariants[0].winrate;
    }
  }

  const byMap: Record<string, MapWinrate> = {};
  for (const [mn, data] of mapWinrateData.entries()) {
    byMap[mn] = data;
  }

  const overallTotal = overallWins + overallLosses;
  const overallWinrate =
    overallTotal > 0 ? (overallWins / overallTotal) * 100 : 0;

  return { overallWins, overallLosses, overallWinrate, byMap };
}

export type TeamStatsServiceInterface = {
  readonly getTeamWinrates: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<TeamWinrates, TeamQueryError>;

  readonly getTeamNameForRoster: (
    teamId: number,
    mapDataId: number
  ) => Effect.Effect<string | null, TeamQueryError>;

  readonly filterTeamPlayerStats: (
    teamId: number,
    mapDataId: number,
    playerStats: PlayerStat[]
  ) => Effect.Effect<PlayerStat[], TeamQueryError>;

  readonly getTopMapsByPlaytime: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<TopMapByPlaytime[], TeamQueryError>;

  readonly getTop5MapsByPlaytime: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<TopMapByPlaytime[], TeamQueryError>;

  readonly getBestMapByWinrate: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<BestMapByWinrate | undefined, TeamQueryError>;

  readonly getBlindSpotMap: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<BestMapByWinrate | undefined, TeamQueryError>;
};

export class TeamStatsService extends Context.Tag(
  "@app/data/team/TeamStatsService"
)<TeamStatsService, TeamStatsServiceInterface>() {}

export const make = Effect.gen(function* () {
  const sharedData = yield* TeamSharedDataService;

  function getTeamWinrates(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<TeamWinrates, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* sharedData.getBaseTeamData(teamId, {
        excludePush: true,
        dateRange,
      });
      const result = processTeamWinrates(data);
      wideEvent.overall_wins = result.overallWins;
      wideEvent.overall_losses = result.overallLosses;
      wideEvent.map_count = Object.keys(result.byMap).length;
      wideEvent.outcome = "success";
      yield* Metric.increment(statsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(statsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.stats.getTeamWinrates")
              : Effect.logInfo("team.stats.getTeamWinrates");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(statsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.stats.getTeamWinrates")
    );
  }

  function getTeamNameForRoster(
    teamId: number,
    mapDataId: number
  ): Effect.Effect<string | null, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = { teamId, mapDataId };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      yield* Effect.annotateCurrentSpan("mapDataId", mapDataId);
      const roster = yield* sharedData.getTeamRoster(teamId);

      if (roster.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.result = null;
        return null;
      }

      const playerStats = yield* Effect.tryPromise({
        try: () =>
          prisma.playerStat.findMany({
            where: { MapDataId: mapDataId },
            select: { player_name: true, player_team: true },
            distinct: ["player_name", "player_team"],
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch player stats for team name lookup",
            cause: error,
          }),
      });

      const teamCounts = new Map<string, number>();
      for (const stat of playerStats) {
        if (roster.includes(stat.player_name)) {
          const currentCount = teamCounts.get(stat.player_team) ?? 0;
          teamCounts.set(stat.player_team, currentCount + 1);
        }
      }

      let maxCount = 0;
      let teamName: string | null = null;
      for (const [team, count] of teamCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          teamName = team;
        }
      }

      wideEvent.outcome = "success";
      wideEvent.result = teamName;
      yield* Metric.increment(statsQuerySuccessTotal);
      return teamName;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(statsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.stats.getTeamNameForRoster")
              : Effect.logInfo("team.stats.getTeamNameForRoster");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(statsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.stats.getTeamNameForRoster")
    );
  }

  function filterTeamPlayerStats(
    teamId: number,
    mapDataId: number,
    playerStats: PlayerStat[]
  ): Effect.Effect<PlayerStat[], TeamQueryError> {
    return Effect.gen(function* () {
      const teamName = yield* getTeamNameForRoster(teamId, mapDataId);
      if (!teamName) return [];
      return playerStats.filter((stat) => stat.player_team === teamName);
    });
  }

  function getTopMapsByPlaytime(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<TopMapByPlaytime[], TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const scrimWhereClause: Record<string, unknown> = {
        Team: { id: teamId },
      };
      if (dateRange) {
        scrimWhereClause.date = { gte: dateRange.from, lte: dateRange.to };
      }

      const maps = yield* Effect.tryPromise({
        try: () =>
          prisma.map.findMany({
            where: { Scrim: scrimWhereClause },
            select: {
              id: true,
              name: true,
              mapData: { select: { id: true } },
            },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch maps for playtime",
            cause: error,
          }),
      });

      if (maps.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.map_count = 0;
        yield* Metric.increment(statsQuerySuccessTotal);
        const _empty: TopMapByPlaytime[] = []; return _empty;
      }

      const mapDataIds = maps.flatMap((m) => m.mapData.map((md) => md.id));

      if (mapDataIds.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.map_count = 0;
        yield* Metric.increment(statsQuerySuccessTotal);
        const _empty: TopMapByPlaytime[] = []; return _empty;
      }

      const mapDataIdToName = new Map<number, string>();
      for (const map of maps) {
        for (const md of map.mapData) {
          mapDataIdToName.set(md.id, map.name ?? "Unknown Map");
        }
      }

      const matchEnds = yield* Effect.tryPromise({
        try: () =>
          prisma.matchEnd.findMany({
            where: { MapDataId: { in: mapDataIds } },
            select: { match_time: true, MapDataId: true },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch match ends for playtime",
            cause: error,
          }),
      });

      const playtimeByMapName = new Map<string, number>();
      for (const matchEnd of matchEnds) {
        const mdId = matchEnd.MapDataId;
        if (!mdId) continue;
        const mapName = mapDataIdToName.get(mdId) ?? "Unknown Map";
        const currentPlaytime = playtimeByMapName.get(mapName) ?? 0;
        playtimeByMapName.set(mapName, currentPlaytime + matchEnd.match_time);
      }

      const mapsWithPlaytime = Array.from(playtimeByMapName.entries()).map(
        ([name, playtime]) => ({ name, playtime })
      );

      const result = mapsWithPlaytime.sort((a, b) => b.playtime - a.playtime);
      wideEvent.outcome = "success";
      wideEvent.map_count = result.length;
      yield* Metric.increment(statsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(statsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.stats.getTopMapsByPlaytime")
              : Effect.logInfo("team.stats.getTopMapsByPlaytime");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(statsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.stats.getTopMapsByPlaytime")
    );
  }

  function getTop5MapsByPlaytime(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<TopMapByPlaytime[], TeamQueryError> {
    return getTopMapsByPlaytime(teamId, dateRange).pipe(
      Effect.map((maps) => maps.slice(0, 5))
    );
  }

  function getBestMapByWinrate(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<BestMapByWinrate | undefined, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const [winrates, topMaps] = yield* Effect.all([
        getTeamWinrates(teamId, dateRange),
        getTopMapsByPlaytime(teamId, dateRange),
      ]);

      const mapsWithStats = Object.keys(winrates.byMap).map((map) => ({
        mapName: map,
        playtime: topMaps.find((m) => m.name === map)?.playtime ?? 0,
        winrate: winrates.byMap[map].totalWinrate,
      }));

      const result = mapsWithStats.sort((a, b) => {
        if (b.winrate !== a.winrate) return b.winrate - a.winrate;
        return b.playtime - a.playtime;
      })[0];

      wideEvent.outcome = "success";
      wideEvent.best_map = result?.mapName;
      yield* Metric.increment(statsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(statsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.stats.getBestMapByWinrate")
              : Effect.logInfo("team.stats.getBestMapByWinrate");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(statsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.stats.getBestMapByWinrate")
    );
  }

  function getBlindSpotMap(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<BestMapByWinrate | undefined, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const [winrates, topMaps] = yield* Effect.all([
        getTeamWinrates(teamId, dateRange),
        getTopMapsByPlaytime(teamId, dateRange),
      ]);

      const mapsWithStats = Object.keys(winrates.byMap).map((map) => ({
        mapName: map,
        playtime: topMaps.find((m) => m.name === map)?.playtime ?? 0,
        winrate: winrates.byMap[map].totalWinrate,
      }));

      const result = mapsWithStats.sort((a, b) => {
        if (b.winrate !== a.winrate) return a.winrate - b.winrate;
        return b.playtime - a.playtime;
      })[0];

      wideEvent.outcome = "success";
      wideEvent.blind_spot_map = result?.mapName;
      yield* Metric.increment(statsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(statsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.stats.getBlindSpotMap")
              : Effect.logInfo("team.stats.getBlindSpotMap");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(statsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.stats.getBlindSpotMap")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const winratesCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getTeamWinrates(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const teamNameCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, mapDataIdStr] = key.split(":");
      return getTeamNameForRoster(Number(teamIdStr), Number(mapDataIdStr)).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const topMapsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getTopMapsByPlaytime(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const top5MapsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getTop5MapsByPlaytime(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const bestMapCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getBestMapByWinrate(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const blindSpotCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getBlindSpotMap(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getTeamWinrates: (teamId: number, dateRange?: TeamDateRange) =>
      winratesCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getTeamNameForRoster: (teamId: number, mapDataId: number) =>
      teamNameCache
        .get(`${teamId}:${mapDataId}`)
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    filterTeamPlayerStats,
    getTopMapsByPlaytime: (teamId: number, dateRange?: TeamDateRange) =>
      topMapsCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getTop5MapsByPlaytime: (teamId: number, dateRange?: TeamDateRange) =>
      top5MapsCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getBestMapByWinrate: (teamId: number, dateRange?: TeamDateRange) =>
      bestMapCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getBlindSpotMap: (teamId: number, dateRange?: TeamDateRange) =>
      blindSpotCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamStatsServiceInterface;
});

export const TeamStatsServiceLive = Layer.effect(TeamStatsService, make).pipe(
  Layer.provide(TeamSharedDataServiceLive)
);
