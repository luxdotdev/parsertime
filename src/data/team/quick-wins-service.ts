import { mercyRezToKillEvent, ultimateStartToKillEvent } from "@/lib/utils";
import { calculateWinner } from "@/lib/winrate";
import type { Kill } from "@prisma/client";
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
import type { TeamFightStats } from "./fight-stats-service";
import {
  TeamFightStatsService,
  TeamFightStatsServiceLive,
} from "./fight-stats-service";
import type { ExtendedTeamData, TeamDateRange } from "./shared-core";
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

const quickWinsQuerySuccessTotal = Metric.counter(
  "team.quick_wins.query.success",
  { description: "Total successful team quick wins queries", incremental: true }
);

const quickWinsQueryErrorTotal = Metric.counter("team.quick_wins.query.error", {
  description: "Total team quick wins query failures",
  incremental: true,
});

const quickWinsQueryDuration = Metric.histogram(
  "team.quick_wins.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team quick wins query duration in milliseconds"
);

export type { QuickWinsStats } from "./types";
import type { QuickWinsStats } from "./types";

type FightEvent = Kill & { ultimate_id?: number };
type Fight = { events: FightEvent[]; start: number; end: number };

function analyzeFightOutcome(
  fight: Fight,
  ourTeamName: string
): { won: boolean; hadFirstPick: boolean } {
  const sortedEvents = [...fight.events].sort(
    (a, b) => a.match_time - b.match_time
  );
  const kills = sortedEvents.filter(
    (e) => e.event_type === "kill" || e.event_type === "mercy_rez"
  );

  let ourKills = 0;
  let enemyKills = 0;

  for (const kill of kills) {
    if (kill.event_type === "mercy_rez") {
      if (kill.victim_team === ourTeamName)
        enemyKills = Math.max(0, enemyKills - 1);
      else ourKills = Math.max(0, ourKills - 1);
    } else {
      if (kill.attacker_team === ourTeamName) ourKills++;
      else enemyKills++;
    }
  }

  const won = ourKills > enemyKills;
  const firstKill = kills.find((k) => k.event_type === "kill");
  const hadFirstPick = firstKill
    ? firstKill.attacker_team === ourTeamName
    : false;

  return { won, hadFirstPick };
}

export function processQuickWinsStats(
  sharedData: ExtendedTeamData,
  fightStats: TeamFightStats
): QuickWinsStats {
  const {
    teamRosterSet,
    mapDataRecords: rawMapDataRecords,
    allPlayerStats,
    matchStarts,
    finalRounds,
    captures,
    payloadProgresses,
    pointProgresses,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;

  const mapDataRecords = rawMapDataRecords as {
    id: number;
    name: string | null;
    Scrim?: { id: number; name: string; date: Date };
  }[];

  if (mapDataRecords.length === 0) {
    return {
      last10GamesPerformance: { wins: 0, losses: 0, winrate: 0 },
      bestDayOfWeek: null,
      averageFightDuration: null,
      firstPickSuccessRate: null,
    };
  }

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

  type MatchResult = {
    mapDataId: number;
    scrimDate: Date;
    teamName: string;
    isWin: boolean;
  };
  const matchResults: MatchResult[] = [];

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const scrimDate = mapDataRecord.Scrim?.date ?? new Date();

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

    matchResults.push({
      mapDataId,
      scrimDate,
      teamName,
      isWin: winner === teamName,
    });
  }

  const last10Games = matchResults.slice(0, 10);
  const last10Wins = last10Games.filter((m) => m.isWin).length;
  const last10Losses = last10Games.length - last10Wins;
  const last10Winrate =
    last10Games.length > 0 ? (last10Wins / last10Games.length) * 100 : 0;

  const dayStats = new Map<
    number,
    { wins: number; losses: number; day: string }
  >();
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (const result of matchResults) {
    const dayOfWeek = result.scrimDate.getDay();
    if (!dayStats.has(dayOfWeek))
      dayStats.set(dayOfWeek, {
        wins: 0,
        losses: 0,
        day: daysOfWeek[dayOfWeek],
      });
    const stats = dayStats.get(dayOfWeek)!;
    if (result.isWin) stats.wins++;
    else stats.losses++;
  }

  let bestDay = null;
  let bestWinrate = -1;
  for (const [, stats] of dayStats) {
    const total = stats.wins + stats.losses;
    if (total >= 3) {
      const winrate = (stats.wins / total) * 100;
      if (winrate > bestWinrate) {
        bestWinrate = winrate;
        bestDay = {
          day: stats.day,
          wins: stats.wins,
          losses: stats.losses,
          winrate,
          gamesPlayed: total,
        };
      }
    }
  }

  const killsByMap = new Map<number, typeof allKills>();
  const rezzesByMap = new Map<number, typeof allRezzes>();
  const ultsByMap = new Map<number, typeof allUltimates>();

  for (const kill of allKills) {
    if (kill.MapDataId) {
      if (!killsByMap.has(kill.MapDataId)) killsByMap.set(kill.MapDataId, []);
      killsByMap.get(kill.MapDataId)!.push(kill);
    }
  }
  for (const rez of allRezzes) {
    if (rez.MapDataId) {
      if (!rezzesByMap.has(rez.MapDataId)) rezzesByMap.set(rez.MapDataId, []);
      rezzesByMap.get(rez.MapDataId)!.push(rez);
    }
  }
  for (const ult of allUltimates) {
    if (ult.MapDataId) {
      if (!ultsByMap.has(ult.MapDataId)) ultsByMap.set(ult.MapDataId, []);
      ultsByMap.get(ult.MapDataId)!.push(ult);
    }
  }

  let totalFightDuration = 0;
  let fightCount = 0;
  let successfulFirstPicks = 0;
  let totalFirstPicks = 0;

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const ourTeamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (!ourTeamName) continue;

    const playersOnMap = allPlayerStats.filter(
      (stat) => stat.MapDataId === mapDataId && stat.player_team === ourTeamName
    );
    if (!playersOnMap.every((p) => teamRosterSet.has(p.player_name))) continue;

    const kills = killsByMap.get(mapDataId) ?? [];
    const rezzes = rezzesByMap.get(mapDataId) ?? [];
    const ults = ultsByMap.get(mapDataId) ?? [];

    if (kills.length === 0 && rezzes.length === 0 && ults.length === 0)
      continue;

    const events: FightEvent[] = [
      ...kills,
      ...rezzes.map((rez) => mercyRezToKillEvent(rez)),
      ...ults.map((ult) => ({
        ...ultimateStartToKillEvent(ult),
        ultimate_id: ult.ultimate_id,
      })),
    ];
    events.sort((a, b) => a.match_time - b.match_time);

    const fights: Fight[] = [];
    let currentFight: Fight | null = null;
    for (const event of events) {
      if (!currentFight || event.match_time - currentFight.end > 15) {
        currentFight = {
          events: [event],
          start: event.match_time,
          end: event.match_time,
        };
        fights.push(currentFight);
      } else {
        currentFight.events.push(event);
        currentFight.end = event.match_time;
      }
    }

    for (const fight of fights) {
      const duration = fight.end - fight.start;
      if (duration > 0 && duration < 300) {
        totalFightDuration += duration;
        fightCount++;
      }
      const analysis = analyzeFightOutcome(fight, ourTeamName);
      if (analysis.hadFirstPick) {
        totalFirstPicks++;
        if (analysis.won) successfulFirstPicks++;
      }
    }
  }

  const averageFightDuration =
    fightCount > 0 ? totalFightDuration / fightCount : null;
  const firstPickSuccessRate =
    totalFirstPicks > 0
      ? {
          successfulFirstPicks,
          totalFirstPicks,
          successRate: (successfulFirstPicks / totalFirstPicks) * 100,
        }
      : fightStats.firstPickFights > 0
        ? {
            successfulFirstPicks: fightStats.firstPickWins,
            totalFirstPicks: fightStats.firstPickFights,
            successRate: fightStats.firstPickWinrate,
          }
        : null;

  return {
    last10GamesPerformance: {
      wins: last10Wins,
      losses: last10Losses,
      winrate: last10Winrate,
    },
    bestDayOfWeek: bestDay,
    averageFightDuration,
    firstPickSuccessRate,
  };
}

export type TeamQuickWinsServiceInterface = {
  readonly getQuickWinsStats: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<QuickWinsStats, TeamQueryError>;
};

export class TeamQuickWinsService extends Context.Tag(
  "@app/data/team/TeamQuickWinsService"
)<TeamQuickWinsService, TeamQuickWinsServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;
  const fightStatsService = yield* TeamFightStatsService;

  function getQuickWinsStats(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<QuickWinsStats, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const [fightStats, extendedData] = yield* Effect.all([
        fightStatsService.getTeamFightStats(teamId, dateRange),
        shared.getExtendedTeamData(teamId, {
          excludePush: true,
          excludeClash: true,
          includeDateInfo: true,
          dateRange,
        }),
      ]);

      const result = processQuickWinsStats(extendedData, fightStats);
      wideEvent.outcome = "success";
      wideEvent.last10_winrate = result.last10GamesPerformance.winrate;
      yield* Metric.increment(quickWinsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(quickWinsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.quickWins.getQuickWinsStats")
              : Effect.logInfo("team.quickWins.getQuickWinsStats");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(quickWinsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.quickWins.getQuickWinsStats")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const quickWinsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getQuickWinsStats(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getQuickWinsStats: (teamId: number, dateRange?: TeamDateRange) =>
      quickWinsCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamQuickWinsServiceInterface;
});

export const TeamQuickWinsServiceLive = Layer.effect(
  TeamQuickWinsService,
  make
).pipe(
  Layer.provide(TeamSharedDataServiceLive),
  Layer.provide(TeamFightStatsServiceLive)
);
