import prisma from "@/lib/prisma";
import type { Fight } from "@/lib/utils";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  ultimateStartToKillEvent,
} from "@/lib/utils";
import type { RoleName, SubroleName } from "@/types/heroes";
import {
  getHeroRole,
  ROLE_SUBROLES,
  SUBROLE_DISPLAY_NAMES,
} from "@/types/heroes";
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
import { TeamQueryError } from "./errors";
import type { ExtendedTeamData, TeamDateRange } from "./shared-core";
import {
  findTeamNameForMapInMemory,
  parseDateRangeFromCacheKey,
} from "./shared-core";
import { teamCacheRequestTotal, teamCacheMissTotal } from "./metrics";
import {
  TeamSharedDataService,
  TeamSharedDataServiceLive,
} from "./shared-data-service";

import {
  assignPlayersToSubroles,
  type PlayerUltSummary,
  type SubroleUltTiming,
} from "@/data/scrim/ult-helpers";

const ultQuerySuccessTotal = Metric.counter("team.ult.query.success", {
  description: "Total successful team ult queries",
  incremental: true,
});

const ultQueryErrorTotal = Metric.counter("team.ult.query.error", {
  description: "Total team ult query failures",
  incremental: true,
});

const ultQueryDuration = Metric.histogram(
  "team.ult.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team ult query duration in milliseconds"
);

export type {
  ScenarioStats,
  HeroUltImpact,
  UltImpactAnalysis,
  TeamUltRoleBreakdown,
  PlayerUltRanking,
  FightOpeningHero,
  TeamUltStats,
} from "./types";
import type {
  ScenarioStats,
  HeroUltImpact,
  UltImpactAnalysis,
  TeamUltRoleBreakdown,
  PlayerUltRanking,
  FightOpeningHero,
  TeamUltStats,
} from "./types";

function emptyScenario(): ScenarioStats {
  return { fights: 0, wins: 0, losses: 0, winrate: 0 };
}

function finalizeScenario(s: ScenarioStats): ScenarioStats {
  return { ...s, winrate: s.fights > 0 ? (s.wins / s.fights) * 100 : 0 };
}

type ImpactFightEvent = {
  event_type: string;
  match_time: number;
  attacker_team: string;
  attacker_hero: string;
  victim_team?: string;
};

type ImpactFight = {
  events: ImpactFightEvent[];
  start: number;
  end: number;
};

function processUltImpactAnalysis(
  sharedData: ExtendedTeamData
): UltImpactAnalysis {
  const {
    teamRosterSet,
    mapDataIds,
    allPlayerStats,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;

  if (mapDataIds.length === 0) return { byHero: {}, availableHeroes: [] };

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

  const heroStats = new Map<
    string,
    {
      uncontestedOurs: ScenarioStats;
      uncontestedTheirs: ScenarioStats;
      mirrorOursFirst: ScenarioStats;
      mirrorTheirsFirst: ScenarioStats;
      totalFightsAnalyzed: number;
    }
  >();

  function getOrCreateHero(hero: string) {
    if (!heroStats.has(hero))
      heroStats.set(hero, {
        uncontestedOurs: emptyScenario(),
        uncontestedTheirs: emptyScenario(),
        mirrorOursFirst: emptyScenario(),
        mirrorTheirsFirst: emptyScenario(),
        totalFightsAnalyzed: 0,
      });
    return heroStats.get(hero)!;
  }

  function incrementScenario(scenario: ScenarioStats, won: boolean) {
    scenario.fights++;
    if (won) scenario.wins++;
    else scenario.losses++;
  }

  for (const mapDataId of mapDataIds) {
    const ourTeamName = teamNameByMapId.get(mapDataId);
    if (!ourTeamName) continue;

    const kills = killsByMap.get(mapDataId) ?? [];
    const rezzes = rezzesByMap.get(mapDataId) ?? [];
    const ults = ultsByMap.get(mapDataId) ?? [];
    if (kills.length === 0 && rezzes.length === 0 && ults.length === 0)
      continue;

    const events: ImpactFightEvent[] = [
      ...kills.map((k) => ({
        event_type: k.event_type,
        match_time: k.match_time,
        attacker_team: k.attacker_team,
        attacker_hero: k.attacker_hero,
        victim_team: k.victim_team,
      })),
      ...rezzes.map((rez) => ({
        event_type: "mercy_rez" as const,
        match_time: rez.match_time,
        attacker_team: rez.resurrecter_team,
        attacker_hero: rez.resurrecter_hero,
        victim_team: rez.resurrectee_team,
      })),
      ...ults.map((ult) => ({
        event_type: "ultimate_start" as const,
        match_time: ult.match_time,
        attacker_team: ult.player_team,
        attacker_hero: ult.player_hero,
      })),
    ];
    events.sort((a, b) => a.match_time - b.match_time);

    const fights: ImpactFight[] = [];
    let currentFight: ImpactFight | null = null;
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
      let ourKills = 0,
        enemyKills = 0;
      for (const event of fight.events) {
        if (event.event_type === "mercy_rez") {
          if (event.victim_team === ourTeamName)
            enemyKills = Math.max(0, enemyKills - 1);
          else ourKills = Math.max(0, ourKills - 1);
        } else if (event.event_type === "kill") {
          if (event.attacker_team === ourTeamName) ourKills++;
          else enemyKills++;
        }
      }
      const won = ourKills > enemyKills;

      const ultEvents = fight.events.filter(
        (e) => e.event_type === "ultimate_start"
      );
      const heroUltMap = new Map<
        string,
        { ourUses: ImpactFightEvent[]; theirUses: ImpactFightEvent[] }
      >();
      for (const ult of ultEvents) {
        const hero = ult.attacker_hero;
        if (!heroUltMap.has(hero))
          heroUltMap.set(hero, { ourUses: [], theirUses: [] });
        const entry = heroUltMap.get(hero)!;
        if (ult.attacker_team === ourTeamName) entry.ourUses.push(ult);
        else entry.theirUses.push(ult);
      }

      for (const [hero, { ourUses, theirUses }] of heroUltMap) {
        const stats = getOrCreateHero(hero);
        stats.totalFightsAnalyzed++;
        if (ourUses.length > 0 && theirUses.length === 0)
          incrementScenario(stats.uncontestedOurs, won);
        else if (ourUses.length === 0 && theirUses.length > 0)
          incrementScenario(stats.uncontestedTheirs, won);
        else if (ourUses.length > 0 && theirUses.length > 0) {
          const ourEarliest = Math.min(...ourUses.map((u) => u.match_time));
          const theirEarliest = Math.min(...theirUses.map((u) => u.match_time));
          if (ourEarliest <= theirEarliest)
            incrementScenario(stats.mirrorOursFirst, won);
          else incrementScenario(stats.mirrorTheirsFirst, won);
        }
      }
    }
  }

  const byHero: Record<string, HeroUltImpact> = {};
  for (const [hero, stats] of heroStats) {
    if (stats.totalFightsAnalyzed < 1) continue;
    byHero[hero] = {
      hero,
      totalFightsAnalyzed: stats.totalFightsAnalyzed,
      scenarios: {
        uncontestedOurs: finalizeScenario(stats.uncontestedOurs),
        uncontestedTheirs: finalizeScenario(stats.uncontestedTheirs),
        mirrorOursFirst: finalizeScenario(stats.mirrorOursFirst),
        mirrorTheirsFirst: finalizeScenario(stats.mirrorTheirsFirst),
      },
    };
  }
  const availableHeroes = Object.values(byHero)
    .sort((a, b) => b.totalFightsAnalyzed - a.totalFightsAnalyzed)
    .map((h) => h.hero);
  return { byHero, availableHeroes };
}

function emptyTeamUltStats(): TeamUltStats {
  return {
    totalUltsUsed: 0,
    totalUltsEarned: 0,
    totalMaps: 0,
    ultsPerMap: 0,
    avgChargeTime: 0,
    avgHoldTime: 0,
    fightInitiationRate: 0,
    fightInitiationCount: 0,
    totalFightsWithUlts: 0,
    topFightOpeningHeroes: [],
    roleBreakdown: [],
    playerRankings: [],
  };
}

function primaryHeroForPlayer(entry: PlayerUltSummary): string {
  let bestHero = "";
  let bestCount = 0;
  for (const [hero, count] of entry.heroCountMap) {
    if (count > bestCount) {
      bestCount = count;
      bestHero = hero;
    }
  }
  return bestHero;
}

type UltStartRecord = {
  player_team: string;
  player_name: string;
  player_hero: string;
  match_time: number;
  MapDataId: number | null;
};
type SubroleTimingAccum = {
  count: number;
  initiation: number;
  midfight: number;
  late: number;
};

function createSubroleTimingMap() {
  const roles: RoleName[] = ["Tank", "Damage", "Support"];
  const map = new Map<string, Map<SubroleName, SubroleTimingAccum>>();
  for (const role of roles) {
    const inner = new Map<SubroleName, SubroleTimingAccum>();
    for (const sr of ROLE_SUBROLES[role])
      inner.set(sr, { count: 0, initiation: 0, midfight: 0, late: 0 });
    map.set(role, inner);
  }
  return map;
}

function extractTimings(
  timingMap: Map<string, Map<SubroleName, SubroleTimingAccum>>,
  role: RoleName
): SubroleUltTiming[] {
  const result: SubroleUltTiming[] = [];
  const inner = timingMap.get(role)!;
  for (const sr of ROLE_SUBROLES[role]) {
    const accum = inner.get(sr)!;
    if (accum.count > 0)
      result.push({
        subrole: SUBROLE_DISPLAY_NAMES[sr],
        count: accum.count,
        initiation: accum.initiation,
        midfight: accum.midfight,
        late: accum.late,
      });
  }
  return result;
}

type CalculatedStatRow = { playerName: string; stat: string; value: number };

function processTeamUltStats(
  sharedData: ExtendedTeamData,
  calculatedStats: CalculatedStatRow[]
): TeamUltStats {
  const {
    teamRosterSet,
    mapDataIds,
    allPlayerStats,
    allKills,
    allRezzes,
    allUltimates,
  } = sharedData;
  if (mapDataIds.length === 0) return emptyTeamUltStats();

  const roles: RoleName[] = ["Tank", "Damage", "Support"];

  const teamNameByMapId = new Map<number, string>();
  for (const mapDataId of mapDataIds) {
    const teamName = findTeamNameForMapInMemory(
      mapDataId,
      allPlayerStats,
      teamRosterSet
    );
    if (teamName) teamNameByMapId.set(mapDataId, teamName);
  }

  let totalUltsEarned = 0;
  for (const stat of allPlayerStats) {
    if (!stat.MapDataId) continue;
    const ourTeam = teamNameByMapId.get(stat.MapDataId);
    if (ourTeam && stat.player_team === ourTeam)
      totalUltsEarned += stat.ultimates_earned;
  }

  const killsByMap = new Map<number, Kill[]>();
  const ultsByMap = new Map<number, UltStartRecord[]>();

  for (const kill of allKills) {
    if (kill.MapDataId) {
      if (!killsByMap.has(kill.MapDataId)) killsByMap.set(kill.MapDataId, []);
      killsByMap.get(kill.MapDataId)!.push(kill);
    }
  }
  for (const rez of allRezzes) {
    if (rez.MapDataId) {
      if (!killsByMap.has(rez.MapDataId)) killsByMap.set(rez.MapDataId, []);
      killsByMap.get(rez.MapDataId)!.push(mercyRezToKillEvent(rez));
    }
  }
  for (const ult of allUltimates) {
    if (ult.MapDataId) {
      if (!ultsByMap.has(ult.MapDataId)) ultsByMap.set(ult.MapDataId, []);
      ultsByMap.get(ult.MapDataId)!.push(ult);
    }
  }

  const ourPlayerUltCounts = new Map<string, PlayerUltSummary>();
  const playerMapSets = new Map<string, Set<number>>();
  const playerFightOpenings = new Map<string, Map<string, number>>();

  function trackPlayerUlt(playerName: string, hero: string, mapDataId: number) {
    let entry = ourPlayerUltCounts.get(playerName);
    if (!entry) {
      entry = { heroCountMap: new Map(), totalCount: 0 };
      ourPlayerUltCounts.set(playerName, entry);
    }
    entry.totalCount++;
    entry.heroCountMap.set(hero, (entry.heroCountMap.get(hero) ?? 0) + 1);
    if (!playerMapSets.has(playerName))
      playerMapSets.set(playerName, new Set());
    playerMapSets.get(playerName)!.add(mapDataId);
  }

  const ultsByRole: Record<RoleName, number> = {
    Tank: 0,
    Damage: 0,
    Support: 0,
  };
  let totalOurUltsUsed = 0;
  const fightOpeningHeroCounts = new Map<string, number>();
  let fightInitiationCount = 0;
  let totalFightsWithUlts = 0;
  const subroleTimingByRole = createSubroleTimingMap();

  for (const [mapId, ults] of ultsByMap) {
    const ourTeamName = teamNameByMapId.get(mapId);
    if (!ourTeamName) continue;
    for (const ult of ults) {
      if (ult.player_team === ourTeamName)
        trackPlayerUlt(ult.player_name, ult.player_hero, mapId);
    }
  }

  const ourSubroleAssignment = assignPlayersToSubroles(ourPlayerUltCounts);
  const ourPlayerSubrole = new Map<string, SubroleName>();
  for (const [sr, candidate] of ourSubroleAssignment)
    ourPlayerSubrole.set(candidate.playerName, sr);

  for (const mapId of mapDataIds) {
    const ourTeamName = teamNameByMapId.get(mapId);
    if (!ourTeamName) continue;

    const mapUlts = ultsByMap.get(mapId) ?? [];
    const mapKills = killsByMap.get(mapId) ?? [];

    for (const ult of mapUlts) {
      if (ult.player_team === ourTeamName) {
        const role = getHeroRole(ult.player_hero);
        ultsByRole[role]++;
        totalOurUltsUsed++;
      }
    }

    if (mapKills.length === 0 && mapUlts.length === 0) continue;

    const fightEvents: Kill[] = [
      ...mapKills,
      ...mapUlts.map(ultimateStartToKillEvent),
    ];
    fightEvents.sort((a, b) => a.match_time - b.match_time);
    const fights: Fight[] = groupEventsIntoFights(fightEvents);

    for (const fight of fights) {
      const fightUlts = mapUlts.filter(
        (u) => u.match_time >= fight.start && u.match_time <= fight.end + 15
      );
      if (fightUlts.length === 0) continue;

      totalFightsWithUlts++;
      const opener = fightUlts[0];
      if (opener.player_team === ourTeamName) {
        fightInitiationCount++;
        fightOpeningHeroCounts.set(
          opener.player_hero,
          (fightOpeningHeroCounts.get(opener.player_hero) ?? 0) + 1
        );
        if (!playerFightOpenings.has(opener.player_name))
          playerFightOpenings.set(opener.player_name, new Map());
        const heroMap = playerFightOpenings.get(opener.player_name)!;
        heroMap.set(
          opener.player_hero,
          (heroMap.get(opener.player_hero) ?? 0) + 1
        );
      }

      const fightDuration = fight.end + 15 - fight.start;
      const thirdDuration = fightDuration / 3;
      for (const ult of fightUlts) {
        if (ult.player_team !== ourTeamName) continue;
        const subrole = ourPlayerSubrole.get(ult.player_name);
        if (!subrole) continue;
        const role = getHeroRole(ult.player_hero);
        const accum = subroleTimingByRole.get(role)?.get(subrole);
        if (!accum) continue;
        accum.count++;
        const elapsed = ult.match_time - fight.start;
        if (fightDuration <= 0 || elapsed < thirdDuration) accum.initiation++;
        else if (elapsed < thirdDuration * 2) accum.midfight++;
        else accum.late++;
      }
    }
  }

  const roleBreakdown: TeamUltRoleBreakdown[] = roles.map((role) => ({
    role,
    count: ultsByRole[role],
    percentage:
      totalOurUltsUsed > 0 ? (ultsByRole[role] / totalOurUltsUsed) * 100 : 0,
    subroleTimings: extractTimings(subroleTimingByRole, role),
  }));

  const topFightOpeningHeroes: FightOpeningHero[] = Array.from(
    fightOpeningHeroCounts.entries()
  )
    .map(([hero, count]) => ({ hero, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const playerRankings: PlayerUltRanking[] = [];
  for (const [playerName, entry] of ourPlayerUltCounts) {
    const hero = primaryHeroForPlayer(entry);
    const mapsPlayed = playerMapSets.get(playerName)?.size ?? 0;
    let topFightOpeningHero: string | null = null;
    let fightOpeningCountVal = 0;
    const openings = playerFightOpenings.get(playerName);
    if (openings) {
      for (const [h, count] of openings) {
        if (count > fightOpeningCountVal) {
          fightOpeningCountVal = count;
          topFightOpeningHero = h;
        }
      }
    }
    playerRankings.push({
      playerName,
      primaryHero: hero,
      totalUltsUsed: entry.totalCount,
      mapsPlayed,
      ultsPerMap: mapsPlayed > 0 ? entry.totalCount / mapsPlayed : 0,
      topFightOpeningHero,
      fightOpeningCount: fightOpeningCountVal,
    });
  }
  playerRankings.sort((a, b) => b.totalUltsUsed - a.totalUltsUsed);

  const chargeTimeValues: number[] = [];
  const holdTimeValues: number[] = [];
  for (const cs of calculatedStats) {
    if (!teamRosterSet.has(cs.playerName) || cs.value <= 0) continue;
    if (cs.stat === "AVERAGE_ULT_CHARGE_TIME") chargeTimeValues.push(cs.value);
    else if (cs.stat === "AVERAGE_TIME_TO_USE_ULT")
      holdTimeValues.push(cs.value);
  }
  const avgChargeTime =
    chargeTimeValues.length > 0
      ? chargeTimeValues.reduce((a, b) => a + b, 0) / chargeTimeValues.length
      : 0;
  const avgHoldTime =
    holdTimeValues.length > 0
      ? holdTimeValues.reduce((a, b) => a + b, 0) / holdTimeValues.length
      : 0;
  const totalMaps = mapDataIds.length;

  return {
    totalUltsUsed: totalOurUltsUsed,
    totalUltsEarned,
    totalMaps,
    ultsPerMap: totalMaps > 0 ? totalOurUltsUsed / totalMaps : 0,
    avgChargeTime,
    avgHoldTime,
    fightInitiationRate:
      totalFightsWithUlts > 0
        ? (fightInitiationCount / totalFightsWithUlts) * 100
        : 0,
    fightInitiationCount,
    totalFightsWithUlts,
    topFightOpeningHeroes,
    roleBreakdown,
    playerRankings,
  };
}

export type TeamUltServiceInterface = {
  readonly getTeamUltImpact: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<UltImpactAnalysis, TeamQueryError>;

  readonly getTeamUltStats: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<TeamUltStats, TeamQueryError>;
};

export class TeamUltService extends Context.Tag(
  "@app/data/team/TeamUltService"
)<TeamUltService, TeamUltServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getTeamUltImpact(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<UltImpactAnalysis, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getExtendedTeamData(teamId, { dateRange });
      const result = processUltImpactAnalysis(data);
      wideEvent.outcome = "success";
      wideEvent.hero_count = result.availableHeroes.length;
      yield* Metric.increment(ultQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(ultQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.ult.getTeamUltImpact")
              : Effect.logInfo("team.ult.getTeamUltImpact");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(ultQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.ult.getTeamUltImpact")
    );
  }

  function getTeamUltStats(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<TeamUltStats, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getExtendedTeamData(teamId, { dateRange });

      if (data.mapDataIds.length === 0) {
        wideEvent.outcome = "success";
        wideEvent.total_ults = 0;
        yield* Metric.increment(ultQuerySuccessTotal);
        return emptyTeamUltStats();
      }

      const calculatedStats = yield* Effect.tryPromise({
        try: () =>
          prisma.calculatedStat.findMany({
            where: {
              MapDataId: { in: data.mapDataIds },
              stat: {
                in: ["AVERAGE_ULT_CHARGE_TIME", "AVERAGE_TIME_TO_USE_ULT"],
              },
            },
          }),
        catch: (error) =>
          new TeamQueryError({
            operation: "fetch calculated stats for ult stats",
            cause: error,
          }),
      });

      const result = processTeamUltStats(data, calculatedStats);
      wideEvent.outcome = "success";
      wideEvent.total_ults = result.totalUltsUsed;
      yield* Metric.increment(ultQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(ultQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.ult.getTeamUltStats")
              : Effect.logInfo("team.ult.getTeamUltStats");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(ultQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.ult.getTeamUltStats")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const ultImpactCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getTeamUltImpact(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const ultStatsCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getTeamUltStats(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getTeamUltImpact: (teamId: number, dateRange?: TeamDateRange) =>
      ultImpactCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getTeamUltStats: (teamId: number, dateRange?: TeamDateRange) =>
      ultStatsCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamUltServiceInterface;
});

export const TeamUltServiceLive = Layer.effect(TeamUltService, make).pipe(
  Layer.provide(TeamSharedDataServiceLive)
);
