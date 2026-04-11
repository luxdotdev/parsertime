import { determineRole } from "@/lib/player-table-data";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import {
  Cache,
  Context,
  Duration,
  Effect,
  Layer,
  Metric,
  MetricBoundaries,
} from "effect";
import type { TeamQueryError } from "./errors";
import { teamCacheMissTotal, teamCacheRequestTotal } from "./metrics";
import type { BaseTeamData, TeamDateRange } from "./shared-core";
import {
  buildCapturesMaps,
  buildFinalRoundMap,
  buildMatchStartMap,
  buildProgressMaps,
  findTeamNameForMapInMemory,
  parseDateRangeFromCacheKey,
} from "./shared-core";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

const matchupQuerySuccessTotal = Metric.counter("team.matchup.query.success", {
  description: "Total successful team matchup queries",
  incremental: true,
});
const matchupQueryErrorTotal = Metric.counter("team.matchup.query.error", {
  description: "Total team matchup query failures",
  incremental: true,
});
const matchupQueryDuration = Metric.histogram(
  "team.matchup.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team matchup query duration in milliseconds"
);

export type {
  MapHeroEntry,
  MatchupMapResult,
  MatchupWinrateData,
  EnemyHeroWinrate,
  EnemyHeroAnalysis,
} from "./types";
import type {
  MapHeroEntry,
  MatchupMapResult,
  MatchupWinrateData,
  EnemyHeroWinrate,
  EnemyHeroAnalysis,
} from "./types";

const MIN_GAMES_FOR_INCLUSION = 2;

function buildHeroEntries(
  playerStats: {
    player_name: string;
    player_hero: string;
    hero_time_played: number;
    MapDataId: number | null;
  }[]
): MapHeroEntry[] {
  const playerMap = new Map<string, { heroName: string; timePlayed: number }>();
  for (const stat of playerStats) {
    const existing = playerMap.get(stat.player_name);
    if (!existing || stat.hero_time_played > existing.timePlayed) {
      playerMap.set(stat.player_name, {
        heroName: stat.player_hero,
        timePlayed: stat.hero_time_played,
      });
    }
  }

  const entries: MapHeroEntry[] = [];
  for (const [playerName, data] of playerMap.entries()) {
    const role = determineRole(data.heroName as HeroName);
    if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;
    entries.push({
      heroName: data.heroName as HeroName,
      role,
      playerName,
      timePlayed: data.timePlayed,
    });
  }

  const roleOrder = { Tank: 0, Damage: 1, Support: 2 };
  entries.sort(
    (a, b) =>
      roleOrder[a.role] - roleOrder[b.role] ||
      a.heroName.localeCompare(b.heroName)
  );
  return entries.slice(0, 5);
}

export function processMatchupWinrateData(
  sharedData: BaseTeamData
): MatchupWinrateData {
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
  if (mapDataRecords.length === 0)
    return { maps: [], allOurHeroes: [], allEnemyHeroes: [] };

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

  const maps: MatchupMapResult[] = [];
  const allOurHeroesSet = new Set<HeroName>();
  const allEnemyHeroesSet = new Set<HeroName>();

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

    const enemyPlayers = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team !== teamName
    );
    const ourHeroes = buildHeroEntries(playersOnMap);
    const enemyHeroes = buildHeroEntries(enemyPlayers);

    for (const h of ourHeroes) allOurHeroesSet.add(h.heroName);
    for (const h of enemyHeroes) allEnemyHeroesSet.add(h.heroName);

    const scrim = (mapDataRecord as { Scrim?: { name: string; date: Date } })
      .Scrim;

    maps.push({
      mapDataId,
      mapName: mapDataRecord.name ?? "Unknown",
      scrimName: scrim?.name ?? "Unknown",
      date: scrim?.date?.toISOString() ?? new Date().toISOString(),
      isWin,
      ourHeroes,
      enemyHeroes,
    });
  }

  maps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return {
    maps,
    allOurHeroes: Array.from(allOurHeroesSet).sort(),
    allEnemyHeroes: Array.from(allEnemyHeroesSet).sort(),
  };
}

export function processEnemyHeroAnalysis(sharedData: BaseTeamData): EnemyHeroAnalysis {
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
  if (mapDataRecords.length === 0) return { winrateVsHero: [] };

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

  const enemyHeroData = new Map<
    string,
    { wins: number; losses: number; maps: Set<number> }
  >();

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

    const enemyPlayers = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team !== teamName
    );
    const seenHeroes = new Set<string>();
    for (const enemy of enemyPlayers) {
      const hero = enemy.player_hero;
      if (seenHeroes.has(hero)) continue;
      seenHeroes.add(hero);

      if (!enemyHeroData.has(hero))
        enemyHeroData.set(hero, { wins: 0, losses: 0, maps: new Set() });
      const data = enemyHeroData.get(hero)!;
      if (!data.maps.has(mapDataId)) {
        data.maps.add(mapDataId);
        if (isWin) data.wins++;
        else data.losses++;
      }
    }
  }

  const winrateVsHero: EnemyHeroWinrate[] = [];
  for (const [heroName, data] of enemyHeroData.entries()) {
    const gamesPlayed = data.wins + data.losses;
    if (gamesPlayed < MIN_GAMES_FOR_INCLUSION) continue;
    winrateVsHero.push({
      heroName: heroName as HeroName,
      wins: data.wins,
      losses: data.losses,
      winrate: (data.wins / gamesPlayed) * 100,
      gamesPlayed,
    });
  }
  winrateVsHero.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return { winrateVsHero };
}

export type TeamMatchupServiceInterface = {
  readonly getMatchupWinrateData: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<MatchupWinrateData, TeamQueryError>;

  readonly getEnemyHeroAnalysis: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<EnemyHeroAnalysis, TeamQueryError>;
};

export class TeamMatchupService extends Context.Tag(
  "@app/data/team/TeamMatchupService"
)<TeamMatchupService, TeamMatchupServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getMatchupWinrateData(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<MatchupWinrateData, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getBaseTeamData(teamId, {
        excludePush: true,
        excludeClash: true,
        includeDateInfo: true,
        dateRange,
      });
      const result = processMatchupWinrateData(data);
      wideEvent.outcome = "success";
      wideEvent.map_count = result.maps.length;
      wideEvent.our_hero_count = result.allOurHeroes.length;
      wideEvent.enemy_hero_count = result.allEnemyHeroes.length;
      yield* Metric.increment(matchupQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(matchupQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.matchup.getMatchupWinrateData")
              : Effect.logInfo("team.matchup.getMatchupWinrateData");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(matchupQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.matchup.getMatchupWinrateData")
    );
  }

  function getEnemyHeroAnalysis(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<EnemyHeroAnalysis, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getBaseTeamData(teamId, {
        excludePush: true,
        excludeClash: true,
        dateRange,
      });
      const result = processEnemyHeroAnalysis(data);
      wideEvent.outcome = "success";
      wideEvent.enemy_hero_count = result.winrateVsHero.length;
      yield* Metric.increment(matchupQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(matchupQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.matchup.getEnemyHeroAnalysis")
              : Effect.logInfo("team.matchup.getEnemyHeroAnalysis");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(matchupQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.matchup.getEnemyHeroAnalysis")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const matchupWinrateCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getMatchupWinrateData(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const enemyHeroCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getEnemyHeroAnalysis(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getMatchupWinrateData: (teamId: number, dateRange?: TeamDateRange) =>
      matchupWinrateCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getEnemyHeroAnalysis: (teamId: number, dateRange?: TeamDateRange) =>
      enemyHeroCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamMatchupServiceInterface;
});

export const TeamMatchupServiceLive = Layer.effect(
  TeamMatchupService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
