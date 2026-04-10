import { mercyRezToKillEvent, ultimateStartToKillEvent } from "@/lib/utils";
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
import type { ExtendedTeamData, TeamDateRange } from "./shared-core";
import { findTeamNameForMapInMemory } from "./shared-core";
import { teamCacheRequestTotal, teamCacheMissTotal } from "./metrics";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

const fightStatsQuerySuccessTotal = Metric.counter(
  "team.fight_stats.query.success",
  {
    description: "Total successful team fight stats queries",
    incremental: true,
  }
);

const fightStatsQueryErrorTotal = Metric.counter(
  "team.fight_stats.query.error",
  { description: "Total team fight stats query failures", incremental: true }
);

const fightStatsQueryDuration = Metric.histogram(
  "team.fight_stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team fight stats query duration in milliseconds"
);

export type TeamFightStats = {
  totalFights: number;
  fightsWon: number;
  fightsLost: number;
  overallWinrate: number;
  firstPickFights: number;
  firstPickWins: number;
  firstPickWinrate: number;
  firstDeathFights: number;
  firstDeathWins: number;
  firstDeathWinrate: number;
  firstUltFights: number;
  firstUltWins: number;
  firstUltWinrate: number;
  dryFights: number;
  dryFightWins: number;
  dryFightWinrate: number;
  nonDryFights: number;
  totalUltsInNonDryFights: number;
  avgUltsPerNonDryFight: number;
  dryFightReversals: number;
  dryFightReversalRate: number;
  nonDryFightReversals: number;
  nonDryFightReversalRate: number;
  ultimateEfficiency: number;
  avgUltsInWonFights: number;
  avgUltsInLostFights: number;
  wastedUltimates: number;
  totalUltsUsed: number;
};

type FightEvent = Kill & { ultimate_id?: number };

type Fight = {
  events: FightEvent[];
  start: number;
  end: number;
};

type FightAnalysis = {
  won: boolean;
  hadFirstPick: boolean;
  hadFirstDeath: boolean;
  usedFirstUlt: boolean;
  isDryFight: boolean;
  isReversal: boolean;
  ultCount: number;
  wastedUlts: number;
};

function analyzeFightOutcome(fight: Fight, ourTeamName: string): FightAnalysis {
  const sortedEvents = [...fight.events].sort(
    (a, b) => a.match_time - b.match_time
  );

  const kills = sortedEvents.filter(
    (e) => e.event_type === "kill" || e.event_type === "mercy_rez"
  );
  const ultimates = sortedEvents.filter(
    (e) => e.event_type === "ultimate_start"
  );

  const ourUlts = ultimates.filter((u) => u.attacker_team === ourTeamName);
  const ultCount = ourUlts.length;
  const isDryFight = ultCount === 0;

  let ourKills = 0;
  let enemyKills = 0;
  let wastedUlts = 0;
  let wasDown2Plus = false;

  for (const event of sortedEvents) {
    if (event.event_type === "mercy_rez") {
      if (event.victim_team === ourTeamName) {
        enemyKills = Math.max(0, enemyKills - 1);
      } else {
        ourKills = Math.max(0, ourKills - 1);
      }
    } else if (event.event_type === "kill") {
      if (event.attacker_team === ourTeamName) ourKills++;
      else enemyKills++;
    }

    if (enemyKills - ourKills >= 2) wasDown2Plus = true;

    if (
      event.event_type === "ultimate_start" &&
      event.attacker_team === ourTeamName
    ) {
      const killDiff = ourKills - enemyKills;
      if (killDiff <= -3) wastedUlts++;
    }
  }

  const won = ourKills > enemyKills;
  const isReversal = won && wasDown2Plus;

  const firstKill = kills.find((k) => k.event_type === "kill");
  const hadFirstPick = firstKill
    ? firstKill.attacker_team === ourTeamName
    : false;
  const hadFirstDeath = firstKill
    ? firstKill.victim_team === ourTeamName
    : false;

  const firstUlt = ultimates[0];
  const usedFirstUlt = firstUlt
    ? firstUlt.attacker_team === ourTeamName
    : false;

  return {
    won,
    hadFirstPick,
    hadFirstDeath,
    usedFirstUlt,
    isDryFight,
    isReversal,
    ultCount,
    wastedUlts,
  };
}

function processTeamFightStats(sharedData: ExtendedTeamData): TeamFightStats {
  const {
    teamRosterSet,
    mapDataIds,
    allPlayerStats,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;

  if (mapDataIds.length === 0) {
    return emptyFightStats();
  }

  const teamNameByMapId = new Map<number, string>();
  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (teamName) teamNameByMapId.set(mapDataId, teamName);
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

  let totalFights = 0;
  let fightsWon = 0;
  let fightsLost = 0;
  let firstPickFights = 0;
  let firstPickWins = 0;
  let firstDeathFights = 0;
  let firstDeathWins = 0;
  let firstUltFights = 0;
  let firstUltWins = 0;
  let dryFights = 0;
  let dryFightWins = 0;
  let dryFightReversals = 0;
  let nonDryFightReversals = 0;
  let nonDryFights = 0;
  let totalUltsInNonDryFights = 0;
  let totalUltsUsed = 0;
  let ultsInWonFights = 0;
  let ultsInLostFights = 0;
  let totalWastedUlts = 0;

  for (const mapDataId of mapDataIds) {
    const ourTeamName = teamNameByMapId.get(mapDataId);
    if (!ourTeamName) continue;

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
      const analysis = analyzeFightOutcome(fight, ourTeamName);

      totalFights++;
      if (analysis.won) fightsWon++;
      else fightsLost++;

      if (analysis.hadFirstPick) {
        firstPickFights++;
        if (analysis.won) firstPickWins++;
      }
      if (analysis.hadFirstDeath) {
        firstDeathFights++;
        if (analysis.won) firstDeathWins++;
      }
      if (analysis.usedFirstUlt) {
        firstUltFights++;
        if (analysis.won) firstUltWins++;
      }
      if (analysis.isDryFight) {
        dryFights++;
        if (analysis.won) dryFightWins++;
        if (analysis.isReversal) dryFightReversals++;
      } else {
        nonDryFights++;
        totalUltsInNonDryFights += analysis.ultCount;
        if (analysis.isReversal) nonDryFightReversals++;
      }

      totalUltsUsed += analysis.ultCount;
      totalWastedUlts += analysis.wastedUlts;

      if (analysis.won) ultsInWonFights += analysis.ultCount;
      else ultsInLostFights += analysis.ultCount;
    }
  }

  const overallWinrate = totalFights > 0 ? (fightsWon / totalFights) * 100 : 0;
  const firstPickWinrate =
    firstPickFights > 0 ? (firstPickWins / firstPickFights) * 100 : 0;
  const firstDeathWinrate =
    firstDeathFights > 0 ? (firstDeathWins / firstDeathFights) * 100 : 0;
  const firstUltWinrate =
    firstUltFights > 0 ? (firstUltWins / firstUltFights) * 100 : 0;
  const dryFightWinrate = dryFights > 0 ? (dryFightWins / dryFights) * 100 : 0;
  const dryFightReversalRate =
    dryFights > 0 ? (dryFightReversals / dryFights) * 100 : 0;
  const nonDryFightReversalRate =
    nonDryFights > 0 ? (nonDryFightReversals / nonDryFights) * 100 : 0;
  const avgUltsPerNonDryFight =
    nonDryFights > 0 ? totalUltsInNonDryFights / nonDryFights : 0;
  const ultimateEfficiency = totalUltsUsed > 0 ? fightsWon / totalUltsUsed : 0;
  const avgUltsInWonFights = fightsWon > 0 ? ultsInWonFights / fightsWon : 0;
  const avgUltsInLostFights =
    fightsLost > 0 ? ultsInLostFights / fightsLost : 0;

  return {
    totalFights,
    fightsWon,
    fightsLost,
    overallWinrate,
    firstPickFights,
    firstPickWins,
    firstPickWinrate,
    firstDeathFights,
    firstDeathWins,
    firstDeathWinrate,
    firstUltFights,
    firstUltWins,
    firstUltWinrate,
    dryFights,
    dryFightWins,
    dryFightWinrate,
    dryFightReversals,
    dryFightReversalRate,
    nonDryFightReversals,
    nonDryFightReversalRate,
    nonDryFights,
    totalUltsInNonDryFights,
    avgUltsPerNonDryFight,
    ultimateEfficiency,
    avgUltsInWonFights,
    avgUltsInLostFights,
    wastedUltimates: totalWastedUlts,
    totalUltsUsed,
  };
}

function emptyFightStats(): TeamFightStats {
  return {
    totalFights: 0,
    fightsWon: 0,
    fightsLost: 0,
    overallWinrate: 0,
    firstPickFights: 0,
    firstPickWins: 0,
    firstPickWinrate: 0,
    firstDeathFights: 0,
    firstDeathWins: 0,
    firstDeathWinrate: 0,
    firstUltFights: 0,
    firstUltWins: 0,
    firstUltWinrate: 0,
    dryFights: 0,
    dryFightWins: 0,
    dryFightWinrate: 0,
    dryFightReversals: 0,
    dryFightReversalRate: 0,
    nonDryFightReversals: 0,
    nonDryFightReversalRate: 0,
    nonDryFights: 0,
    totalUltsInNonDryFights: 0,
    avgUltsPerNonDryFight: 0,
    ultimateEfficiency: 0,
    avgUltsInWonFights: 0,
    avgUltsInLostFights: 0,
    wastedUltimates: 0,
    totalUltsUsed: 0,
  };
}

export type TeamFightStatsServiceInterface = {
  readonly getTeamFightStats: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<TeamFightStats, TeamQueryError>;
};

export class TeamFightStatsService extends Context.Tag(
  "@app/data/team/TeamFightStatsService"
)<TeamFightStatsService, TeamFightStatsServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getTeamFightStats(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<TeamFightStats, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const sharedData = yield* shared.getExtendedTeamData(teamId, {
        dateRange,
      });
      const result = processTeamFightStats(sharedData);
      wideEvent.outcome = "success";
      wideEvent.total_fights = result.totalFights;
      wideEvent.overall_winrate = result.overallWinrate;
      yield* Metric.increment(fightStatsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(fightStatsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.fightStats.getTeamFightStats")
              : Effect.logInfo("team.fightStats.getTeamFightStats");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(fightStatsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.fightStats.getTeamFightStats")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const fightStatsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dateRange = JSON.parse(rest) as TeamDateRange | undefined;
      const dr = dateRange?.from ? dateRange : undefined;
      return getTeamFightStats(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getTeamFightStats: (teamId: number, dateRange?: TeamDateRange) =>
      fightStatsCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamFightStatsServiceInterface;
});

export const TeamFightStatsServiceLive = Layer.effect(
  TeamFightStatsService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
