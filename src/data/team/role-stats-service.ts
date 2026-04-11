import { determineRole } from "@/lib/player-table-data";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { getTranslations } from "next-intl/server";
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

const roleStatsQuerySuccessTotal = Metric.counter(
  "team.role_stats.query.success",
  { description: "Total successful team role stats queries", incremental: true }
);

const roleStatsQueryErrorTotal = Metric.counter("team.role_stats.query.error", {
  description: "Total team role stats query failures",
  incremental: true,
});

const roleStatsQueryDuration = Metric.histogram(
  "team.role_stats.query.duration_ms",
  MetricBoundaries.exponential({ start: 10, factor: 2, count: 10 }),
  "Distribution of team role stats query duration in milliseconds"
);

export type {
  RoleStats,
  RolePerformanceStats,
  RoleBalanceAnalysis,
  RoleTrio,
  RoleWinrateByMap,
} from "./types";
import type {
  RoleStats,
  RolePerformanceStats,
  RoleBalanceAnalysis,
  RoleTrio,
  RoleWinrateByMap,
} from "./types";

function createEmptyRoleStats(): RolePerformanceStats {
  const emptyStats: RoleStats = {
    role: "Tank",
    totalPlaytime: 0,
    mapCount: 0,
    eliminations: 0,
    finalBlows: 0,
    deaths: 0,
    assists: 0,
    heroDamage: 0,
    damageTaken: 0,
    healing: 0,
    ultimatesEarned: 0,
    ultimatesUsed: 0,
    kd: 0,
    damagePer10Min: 0,
    healingPer10Min: 0,
    deathsPer10Min: 0,
    ultEfficiency: 0,
  };
  return {
    Tank: { ...emptyStats, role: "Tank" },
    Damage: { ...emptyStats, role: "Damage" },
    Support: { ...emptyStats, role: "Support" },
  };
}

export function processRolePerformanceStats(
  sharedData: BaseTeamData
): RolePerformanceStats {
  const { teamRosterSet, mapDataIds, allPlayerStats } = sharedData;

  if (mapDataIds.length === 0) return createEmptyRoleStats();

  const roleAggregates: Record<
    "Tank" | "Damage" | "Support",
    {
      eliminations: number;
      finalBlows: number;
      deaths: number;
      assists: number;
      heroDamage: number;
      damageTaken: number;
      healing: number;
      ultimatesEarned: number;
      ultimatesUsed: number;
      totalPlaytime: number;
      mapsPlayed: Set<number>;
    }
  > = {
    Tank: {
      eliminations: 0,
      finalBlows: 0,
      deaths: 0,
      assists: 0,
      heroDamage: 0,
      damageTaken: 0,
      healing: 0,
      ultimatesEarned: 0,
      ultimatesUsed: 0,
      totalPlaytime: 0,
      mapsPlayed: new Set(),
    },
    Damage: {
      eliminations: 0,
      finalBlows: 0,
      deaths: 0,
      assists: 0,
      heroDamage: 0,
      damageTaken: 0,
      healing: 0,
      ultimatesEarned: 0,
      ultimatesUsed: 0,
      totalPlaytime: 0,
      mapsPlayed: new Set(),
    },
    Support: {
      eliminations: 0,
      finalBlows: 0,
      deaths: 0,
      assists: 0,
      heroDamage: 0,
      damageTaken: 0,
      healing: 0,
      ultimatesEarned: 0,
      ultimatesUsed: 0,
      totalPlaytime: 0,
      mapsPlayed: new Set(),
    },
  };

  for (const stat of allPlayerStats) {
    if (!teamRosterSet.has(stat.player_name)) continue;
    if (!stat.MapDataId) continue;
    const role = determineRole(stat.player_hero as HeroName);
    if (role !== "Tank" && role !== "Damage" && role !== "Support") continue;

    const aggregate = roleAggregates[role];
    aggregate.eliminations += stat.eliminations;
    aggregate.finalBlows += stat.final_blows;
    aggregate.deaths += stat.deaths;
    aggregate.assists += stat.offensive_assists;
    aggregate.heroDamage += stat.hero_damage_dealt;
    aggregate.damageTaken += stat.damage_taken;
    aggregate.healing += stat.healing_dealt;
    aggregate.ultimatesEarned += stat.ultimates_earned;
    aggregate.ultimatesUsed += stat.ultimates_used;
    aggregate.totalPlaytime += stat.hero_time_played;
    aggregate.mapsPlayed.add(stat.MapDataId);
  }

  function calculateRoleStats(
    role: "Tank" | "Damage" | "Support",
    aggregate: typeof roleAggregates.Tank
  ): RoleStats {
    const playtimeInMinutes = aggregate.totalPlaytime / 60;
    return {
      role,
      totalPlaytime: aggregate.totalPlaytime,
      mapCount: aggregate.mapsPlayed.size,
      eliminations: aggregate.eliminations,
      finalBlows: aggregate.finalBlows,
      deaths: aggregate.deaths,
      assists: aggregate.assists,
      heroDamage: aggregate.heroDamage,
      damageTaken: aggregate.damageTaken,
      healing: aggregate.healing,
      ultimatesEarned: aggregate.ultimatesEarned,
      ultimatesUsed: aggregate.ultimatesUsed,
      kd: aggregate.deaths > 0 ? aggregate.finalBlows / aggregate.deaths : 0,
      damagePer10Min:
        playtimeInMinutes > 0
          ? (aggregate.heroDamage / playtimeInMinutes) * 10
          : 0,
      healingPer10Min:
        playtimeInMinutes > 0
          ? (aggregate.healing / playtimeInMinutes) * 10
          : 0,
      deathsPer10Min:
        playtimeInMinutes > 0 ? (aggregate.deaths / playtimeInMinutes) * 10 : 0,
      ultEfficiency:
        aggregate.ultimatesUsed > 0
          ? aggregate.eliminations / aggregate.ultimatesUsed
          : 0,
    };
  }

  return {
    Tank: calculateRoleStats("Tank", roleAggregates.Tank),
    Damage: calculateRoleStats("Damage", roleAggregates.Damage),
    Support: calculateRoleStats("Support", roleAggregates.Support),
  };
}

export function processBestRoleTrios(sharedData: BaseTeamData): RoleTrio[] {
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

  if (mapDataRecords.length === 0) return [];

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

  type RosterCombo = {
    tank: string;
    dps1: string;
    dps2: string;
    support1: string;
    support2: string;
    key: string;
    wins: number;
    losses: number;
  };
  const rosterCombos = new Map<string, RosterCombo>();

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

    const playersByRole: Record<"Tank" | "Damage" | "Support", string[]> = {
      Tank: [],
      Damage: [],
      Support: [],
    };
    for (const stat of playersOnMap) {
      const role = determineRole(stat.player_hero as HeroName);
      if (role === "Tank" || role === "Damage" || role === "Support") {
        if (!playersByRole[role].includes(stat.player_name)) {
          playersByRole[role].push(stat.player_name);
        }
      }
    }

    if (
      playersByRole.Tank.length !== 1 ||
      playersByRole.Damage.length !== 2 ||
      playersByRole.Support.length !== 2
    )
      continue;

    const tank = playersByRole.Tank[0];
    const [dps1, dps2] = playersByRole.Damage.sort();
    const [support1, support2] = playersByRole.Support.sort();
    const key = `${tank}|${dps1}|${dps2}|${support1}|${support2}`;

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

    if (!rosterCombos.has(key)) {
      rosterCombos.set(key, {
        tank,
        dps1,
        dps2,
        support1,
        support2,
        key,
        wins: 0,
        losses: 0,
      });
    }

    const combo = rosterCombos.get(key)!;
    if (isWin) combo.wins++;
    else combo.losses++;
  }

  return Array.from(rosterCombos.values())
    .filter((combo) => combo.wins + combo.losses >= 3)
    .map((combo) => ({
      tank: combo.tank,
      dps1: combo.dps1,
      dps2: combo.dps2,
      support1: combo.support1,
      support2: combo.support2,
      wins: combo.wins,
      losses: combo.losses,
      winrate:
        combo.wins + combo.losses > 0
          ? (combo.wins / (combo.wins + combo.losses)) * 100
          : 0,
      gamesPlayed: combo.wins + combo.losses,
    }))
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, 5);
}

export function processRoleWinratesByMap(
  sharedData: BaseTeamData
): RoleWinrateByMap[] {
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

  if (mapDataRecords.length === 0) return [];

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

  type MapRoleStats = {
    Tank: { wins: number; losses: number };
    Damage: { wins: number; losses: number };
    Support: { wins: number; losses: number };
  };
  const mapRoleData = new Map<string, MapRoleStats>();

  for (const mapDataRecord of mapDataRecords) {
    const mapDataId = mapDataRecord.id;
    const mapName = mapDataRecord.name ?? "Unknown";

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

    if (!mapRoleData.has(mapName)) {
      mapRoleData.set(mapName, {
        Tank: { wins: 0, losses: 0 },
        Damage: { wins: 0, losses: 0 },
        Support: { wins: 0, losses: 0 },
      });
    }

    const roleData = mapRoleData.get(mapName)!;
    const rolesPlayed = new Set<"Tank" | "Damage" | "Support">();
    for (const stat of playersOnMap) {
      const role = determineRole(stat.player_hero as HeroName);
      if (role === "Tank" || role === "Damage" || role === "Support")
        rolesPlayed.add(role);
    }

    for (const role of rolesPlayed) {
      if (isWin) roleData[role].wins++;
      else roleData[role].losses++;
    }
  }

  const result: RoleWinrateByMap[] = Array.from(mapRoleData.entries()).map(
    ([mapName, roleData]) => ({
      mapName,
      Tank: {
        wins: roleData.Tank.wins,
        losses: roleData.Tank.losses,
        winrate:
          roleData.Tank.wins + roleData.Tank.losses > 0
            ? (roleData.Tank.wins /
                (roleData.Tank.wins + roleData.Tank.losses)) *
              100
            : 0,
      },
      Damage: {
        wins: roleData.Damage.wins,
        losses: roleData.Damage.losses,
        winrate:
          roleData.Damage.wins + roleData.Damage.losses > 0
            ? (roleData.Damage.wins /
                (roleData.Damage.wins + roleData.Damage.losses)) *
              100
            : 0,
      },
      Support: {
        wins: roleData.Support.wins,
        losses: roleData.Support.losses,
        winrate:
          roleData.Support.wins + roleData.Support.losses > 0
            ? (roleData.Support.wins /
                (roleData.Support.wins + roleData.Support.losses)) *
              100
            : 0,
      },
    })
  );

  return result.sort((a, b) => {
    const totalA =
      a.Tank.wins +
      a.Tank.losses +
      a.Damage.wins +
      a.Damage.losses +
      a.Support.wins +
      a.Support.losses;
    const totalB =
      b.Tank.wins +
      b.Tank.losses +
      b.Damage.wins +
      b.Damage.losses +
      b.Support.wins +
      b.Support.losses;
    return totalB - totalA;
  });
}

export type TeamRoleStatsServiceInterface = {
  readonly getRolePerformanceStats: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<RolePerformanceStats, TeamQueryError>;

  readonly getRoleBalanceAnalysis: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<RoleBalanceAnalysis, TeamQueryError>;

  readonly getBestRoleTrios: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<RoleTrio[], TeamQueryError>;

  readonly getRoleWinratesByMap: (
    teamId: number,
    dateRange?: TeamDateRange
  ) => Effect.Effect<RoleWinrateByMap[], TeamQueryError>;
};

export class TeamRoleStatsService extends Context.Tag(
  "@app/data/team/TeamRoleStatsService"
)<TeamRoleStatsService, TeamRoleStatsServiceInterface>() {}

export const make = Effect.gen(function* () {
  const shared = yield* TeamSharedDataService;

  function getRolePerformanceStats(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<RolePerformanceStats, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getBaseTeamData(teamId, { dateRange });
      const result = processRolePerformanceStats(data);
      wideEvent.outcome = "success";
      wideEvent.tank_playtime = result.Tank.totalPlaytime;
      yield* Metric.increment(roleStatsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(roleStatsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.roleStats.getRolePerformanceStats")
              : Effect.logInfo("team.roleStats.getRolePerformanceStats");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(roleStatsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.roleStats.getRolePerformanceStats")
    );
  }

  function getRoleBalanceAnalysis(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<RoleBalanceAnalysis, TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const t = yield* Effect.tryPromise({
        try: () => getTranslations("teamStatsPage.roleBalanceRadar"),
        catch: (error) =>
          new TeamQueryError({
            operation: "get translations for role balance",
            cause: error,
          }),
      });

      const roleStats = yield* getRolePerformanceStats(teamId, dateRange);

      const roles: ("Tank" | "Damage" | "Support")[] = [
        "Tank",
        "Damage",
        "Support",
      ];
      const totalPlaytime = roles.reduce(
        (sum, role) => sum + roleStats[role].totalPlaytime,
        0
      );

      if (totalPlaytime === 0) {
        wideEvent.outcome = "success";
        yield* Metric.increment(roleStatsQuerySuccessTotal);
        return {
          overall: t("insufficientData"),
          weakestRole: null,
          strongestRole: null,
          balanceScore: 0,
          insights: [t("noData")],
        };
      }

      const roleScores = roles.map((role) => {
        const stats = roleStats[role];
        if (stats.totalPlaytime === 0) return { role, score: 0 };
        const kdScore = Math.min(stats.kd / 2, 1);
        const survivalScore = Math.max(0, 1 - stats.deathsPer10Min / 2);
        const ultScore = Math.min(stats.ultEfficiency / 3, 1);
        const activityScore = Math.min(stats.totalPlaytime / 3600, 1);
        const score = (kdScore + survivalScore + ultScore + activityScore) / 4;
        return { role, score };
      });

      roleScores.sort((a, b) => b.score - a.score);
      const strongestRole = roleScores[0].role;
      const weakestRole = roleScores[roleScores.length - 1].role;

      const scoreDiff =
        roleScores[0].score - roleScores[roleScores.length - 1].score;
      const balanceScore = Math.max(0, 1 - scoreDiff);

      let overall: string = t("balanced");
      if (balanceScore < 0.6) {
        if (roleScores[0].score > 0.7) {
          overall = t(`${strongestRole.toLowerCase()}Heavy`);
        }
      }

      const insights: string[] = [];
      if (balanceScore >= 0.8) insights.push(t("excellentBalance"));
      else if (balanceScore >= 0.6) insights.push(t("fairlyBalanced"));
      else insights.push(t("considerStrengthening", { role: weakestRole }));

      roles.forEach((role) => {
        const stats = roleStats[role];
        if (stats.kd < 1.0 && stats.totalPlaytime > 600)
          insights.push(t("negativeKD", { role }));
        if (stats.deathsPer10Min > 7 && stats.totalPlaytime > 600)
          insights.push(t("dyingFrequently", { role }));
      });

      wideEvent.outcome = "success";
      wideEvent.balance_score = balanceScore;
      yield* Metric.increment(roleStatsQuerySuccessTotal);
      return {
        overall,
        weakestRole: balanceScore < 0.9 ? weakestRole : null,
        strongestRole: balanceScore < 0.9 ? strongestRole : null,
        balanceScore,
        insights,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(roleStatsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.roleStats.getRoleBalanceAnalysis")
              : Effect.logInfo("team.roleStats.getRoleBalanceAnalysis");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(roleStatsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.roleStats.getRoleBalanceAnalysis")
    );
  }

  function getBestRoleTrios(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<RoleTrio[], TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getBaseTeamData(teamId, { dateRange });
      const result = processBestRoleTrios(data);
      wideEvent.outcome = "success";
      wideEvent.trio_count = result.length;
      yield* Metric.increment(roleStatsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(roleStatsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.roleStats.getBestRoleTrios")
              : Effect.logInfo("team.roleStats.getBestRoleTrios");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(roleStatsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.roleStats.getBestRoleTrios")
    );
  }

  function getRoleWinratesByMap(
    teamId: number,
    dateRange?: TeamDateRange
  ): Effect.Effect<RoleWinrateByMap[], TeamQueryError> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      teamId,
      hasDateRange: !!dateRange,
    };

    return Effect.gen(function* () {
      yield* Effect.annotateCurrentSpan("teamId", teamId);
      const data = yield* shared.getBaseTeamData(teamId, { dateRange });
      const result = processRoleWinratesByMap(data);
      wideEvent.outcome = "success";
      wideEvent.map_count = result.length;
      yield* Metric.increment(roleStatsQuerySuccessTotal);
      return result;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          wideEvent.outcome = "error";
          wideEvent.error_tag = error._tag;
          wideEvent.error_message = error.message;
        }).pipe(Effect.andThen(Metric.increment(roleStatsQueryErrorTotal)))
      ),
      Effect.ensuring(
        Effect.suspend(() => {
          const durationMs = Date.now() - startTime;
          wideEvent.duration_ms = durationMs;
          wideEvent.outcome ??= "interrupted";
          const log =
            wideEvent.outcome === "error"
              ? Effect.logError("team.roleStats.getRoleWinratesByMap")
              : Effect.logInfo("team.roleStats.getRoleWinratesByMap");
          return log.pipe(
            Effect.annotateLogs(wideEvent),
            Effect.andThen(roleStatsQueryDuration(Effect.succeed(durationMs)))
          );
        })
      ),
      Effect.withSpan("team.roleStats.getRoleWinratesByMap")
    );
  }

  const CACHE_TTL = Duration.seconds(30);
  const CACHE_CAPACITY = 64;

  function cacheKeyOf(teamId: number, dateRange?: TeamDateRange) {
    return `${teamId}:${JSON.stringify(dateRange ?? {})}`;
  }

  const rolePerformanceCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getRolePerformanceStats(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const roleBalanceCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getRoleBalanceAnalysis(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const roleTriosCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getBestRoleTrios(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  const roleWinratesByMapCache = yield* Cache.make({
    capacity: CACHE_CAPACITY,
    timeToLive: CACHE_TTL,
    lookup: (key: string) => {
      const [teamIdStr, rest] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      const dr = parseDateRangeFromCacheKey(rest);
      return getRoleWinratesByMap(Number(teamIdStr), dr).pipe(
        Effect.tap(() => Metric.increment(teamCacheMissTotal))
      );
    },
  });

  return {
    getRolePerformanceStats: (teamId: number, dateRange?: TeamDateRange) =>
      rolePerformanceCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getRoleBalanceAnalysis: (teamId: number, dateRange?: TeamDateRange) =>
      roleBalanceCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getBestRoleTrios: (teamId: number, dateRange?: TeamDateRange) =>
      roleTriosCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
    getRoleWinratesByMap: (teamId: number, dateRange?: TeamDateRange) =>
      roleWinratesByMapCache
        .get(cacheKeyOf(teamId, dateRange))
        .pipe(Effect.tap(() => Metric.increment(teamCacheRequestTotal))),
  } satisfies TeamRoleStatsServiceInterface;
});

export const TeamRoleStatsServiceLive = Layer.effect(
  TeamRoleStatsService,
  make
).pipe(Layer.provide(TeamSharedDataServiceLive));
