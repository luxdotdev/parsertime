import "server-only";

import { determineRole } from "@/lib/player-table-data";
import prisma from "@/lib/prisma";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { cache } from "react";
import { getTeamRoster } from "./team-stats-dto";

export type RoleStats = {
  role: "Tank" | "Damage" | "Support";
  totalPlaytime: number;
  mapCount: number;
  eliminations: number;
  finalBlows: number;
  deaths: number;
  assists: number;
  heroDamage: number;
  damageTaken: number;
  healing: number;
  ultimatesEarned: number;
  ultimatesUsed: number;
  kd: number;
  damagePerMin: number;
  healingPerMin: number;
  deathsPerMin: number;
  ultEfficiency: number;
};

export type RolePerformanceStats = {
  Tank: RoleStats;
  Damage: RoleStats;
  Support: RoleStats;
};

export type RoleBalanceAnalysis = {
  overall:
    | "Balanced"
    | "Tank-heavy"
    | "Damage-heavy"
    | "Support-heavy"
    | "Insufficient data";
  weakestRole: "Tank" | "Damage" | "Support" | null;
  strongestRole: "Tank" | "Damage" | "Support" | null;
  balanceScore: number;
  insights: string[];
};

export type RoleTrio = {
  tank: string;
  dps1: string;
  dps2: string;
  support1: string;
  support2: string;
  wins: number;
  losses: number;
  winrate: number;
  gamesPlayed: number;
};

async function getRolePerformanceStatsUncached(
  teamId: number
): Promise<RolePerformanceStats> {
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return createEmptyRoleStats();
  }

  const mapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: { id: true },
  });

  const mapDataIds = mapDataRecords.map((md) => md.id);

  if (mapDataIds.length === 0) {
    return createEmptyRoleStats();
  }

  const allPlayerStats = await prisma.playerStat.findMany({
    where: { MapDataId: { in: mapDataIds } },
    select: {
      player_name: true,
      player_team: true,
      player_hero: true,
      MapDataId: true,
      eliminations: true,
      final_blows: true,
      deaths: true,
      offensive_assists: true,
      hero_damage_dealt: true,
      damage_taken: true,
      healing_dealt: true,
      ultimates_earned: true,
      ultimates_used: true,
      hero_time_played: true,
    },
  });

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
      damagePerMin:
        playtimeInMinutes > 0 ? aggregate.heroDamage / playtimeInMinutes : 0,
      healingPerMin:
        playtimeInMinutes > 0 ? aggregate.healing / playtimeInMinutes : 0,
      deathsPerMin:
        playtimeInMinutes > 0 ? aggregate.deaths / playtimeInMinutes : 0,
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
    damagePerMin: 0,
    healingPerMin: 0,
    deathsPerMin: 0,
    ultEfficiency: 0,
  };

  return {
    Tank: { ...emptyStats, role: "Tank" },
    Damage: { ...emptyStats, role: "Damage" },
    Support: { ...emptyStats, role: "Support" },
  };
}

export const getRolePerformanceStats = cache(getRolePerformanceStatsUncached);

async function getRoleBalanceAnalysisUncached(
  teamId: number
): Promise<RoleBalanceAnalysis> {
  const roleStats = await getRolePerformanceStats(teamId);

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
    return {
      overall: "Insufficient data",
      weakestRole: null,
      strongestRole: null,
      balanceScore: 0,
      insights: ["Not enough data to analyze role balance yet."],
    };
  }

  const roleScores = roles.map((role) => {
    const stats = roleStats[role];
    if (stats.totalPlaytime === 0) return { role, score: 0 };

    const kdScore = Math.min(stats.kd / 2, 1);
    const survivalScore = Math.max(0, 1 - stats.deathsPerMin / 2);
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

  let overall: RoleBalanceAnalysis["overall"] = "Balanced";
  if (balanceScore < 0.6) {
    if (roleScores[0].score > 0.7) {
      overall = `${strongestRole}-heavy` as RoleBalanceAnalysis["overall"];
    }
  }

  const insights: string[] = [];

  if (balanceScore >= 0.8) {
    insights.push("Your team shows excellent balance across all roles.");
  } else if (balanceScore >= 0.6) {
    insights.push("Your team is fairly balanced with minor role disparities.");
  } else {
    insights.push(
      `Consider strengthening your ${weakestRole} performance to improve team balance.`
    );
  }

  roles.forEach((role) => {
    const stats = roleStats[role];
    if (stats.kd < 1.0 && stats.totalPlaytime > 600) {
      insights.push(`${role} players have a negative K/D ratio.`);
    }
    if (stats.deathsPerMin > 1.5 && stats.totalPlaytime > 600) {
      insights.push(
        `${role} players are dying frequently - focus on positioning.`
      );
    }
  });

  return {
    overall,
    weakestRole: balanceScore < 0.9 ? weakestRole : null,
    strongestRole: balanceScore < 0.9 ? strongestRole : null,
    balanceScore,
    insights,
  };
}

export const getRoleBalanceAnalysis = cache(getRoleBalanceAnalysisUncached);

function findTeamNameForMapInMemory(
  mapDataId: number,
  allPlayerStats: {
    player_name: string;
    player_team: string;
    MapDataId: number | null;
  }[],
  teamRosterSet: Set<string>
): string | null {
  const teamCounts = new Map<string, number>();

  for (const stat of allPlayerStats) {
    if (stat.MapDataId === mapDataId && teamRosterSet.has(stat.player_name)) {
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

  return teamName;
}

async function getBestRoleTriosUncached(teamId: number): Promise<RoleTrio[]> {
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return [];
  }

  const mapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: { id: true, name: true },
  });

  const mapDataIds = mapDataRecords.map((md) => md.id);

  if (mapDataIds.length === 0) {
    return [];
  }

  const [allPlayerStats, matchStarts, finalRounds, captures] =
    await Promise.all([
      prisma.playerStat.findMany({
        where: { MapDataId: { in: mapDataIds } },
        select: {
          player_name: true,
          player_team: true,
          player_hero: true,
          MapDataId: true,
        },
        distinct: ["player_name", "MapDataId"],
      }),
      prisma.matchStart.findMany({
        where: { MapDataId: { in: mapDataIds } },
      }),
      prisma.roundEnd.findMany({
        where: {
          MapDataId: { in: mapDataIds },
        },
        orderBy: { round_number: "desc" },
      }),
      prisma.objectiveCaptured.findMany({
        where: { MapDataId: { in: mapDataIds } },
      }),
    ]);

  const finalRoundMap = new Map<number, (typeof finalRounds)[0]>();
  for (const round of finalRounds) {
    const mapDataId = round.MapDataId;
    if (mapDataId) {
      const existing = finalRoundMap.get(mapDataId);
      if (!existing || round.round_number > existing.round_number) {
        finalRoundMap.set(mapDataId, round);
      }
    }
  }

  const matchStartMap = new Map<number, (typeof matchStarts)[0]>();
  for (const match of matchStarts) {
    if (match.MapDataId) {
      matchStartMap.set(match.MapDataId, match);
    }
  }

  const team1CapturesMap = new Map<number, typeof captures>();
  const team2CapturesMap = new Map<number, typeof captures>();

  for (const capture of captures) {
    const mapDataId = capture.MapDataId;
    if (!mapDataId) continue;

    const match = matchStartMap.get(mapDataId);
    if (!match) continue;

    if (capture.capturing_team === match.team_1_name) {
      if (!team1CapturesMap.has(mapDataId)) {
        team1CapturesMap.set(mapDataId, []);
      }
      team1CapturesMap.get(mapDataId)!.push(capture);
    } else if (capture.capturing_team === match.team_2_name) {
      if (!team2CapturesMap.has(mapDataId)) {
        team2CapturesMap.set(mapDataId, []);
      }
      team2CapturesMap.get(mapDataId)!.push(capture);
    }
  }

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
    ) {
      continue;
    }

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
    if (isWin) {
      combo.wins++;
    } else {
      combo.losses++;
    }
  }

  const trios: RoleTrio[] = Array.from(rosterCombos.values())
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

  return trios;
}

export const getBestRoleTrios = cache(getBestRoleTriosUncached);

export type RoleWinrateByMap = {
  mapName: string;
  Tank: { wins: number; losses: number; winrate: number };
  Damage: { wins: number; losses: number; winrate: number };
  Support: { wins: number; losses: number; winrate: number };
};

async function getRoleWinratesByMapUncached(
  teamId: number
): Promise<RoleWinrateByMap[]> {
  const teamRoster = await getTeamRoster(teamId);
  const teamRosterSet = new Set(teamRoster);

  if (teamRoster.length === 0) {
    return [];
  }

  const mapDataRecords = await prisma.map.findMany({
    where: { Scrim: { Team: { id: teamId } } },
    select: { id: true, name: true },
  });

  const mapDataIds = mapDataRecords.map((md) => md.id);

  if (mapDataIds.length === 0) {
    return [];
  }

  const [allPlayerStats, matchStarts, finalRounds, captures] =
    await Promise.all([
      prisma.playerStat.findMany({
        where: { MapDataId: { in: mapDataIds } },
        select: {
          player_name: true,
          player_team: true,
          player_hero: true,
          MapDataId: true,
        },
      }),
      prisma.matchStart.findMany({
        where: { MapDataId: { in: mapDataIds } },
      }),
      prisma.roundEnd.findMany({
        where: {
          MapDataId: { in: mapDataIds },
        },
        orderBy: { round_number: "desc" },
      }),
      prisma.objectiveCaptured.findMany({
        where: { MapDataId: { in: mapDataIds } },
      }),
    ]);

  const finalRoundMap = new Map<number, (typeof finalRounds)[0]>();
  for (const round of finalRounds) {
    const mapDataId = round.MapDataId;
    if (mapDataId) {
      const existing = finalRoundMap.get(mapDataId);
      if (!existing || round.round_number > existing.round_number) {
        finalRoundMap.set(mapDataId, round);
      }
    }
  }

  const matchStartMap = new Map<number, (typeof matchStarts)[0]>();
  for (const match of matchStarts) {
    if (match.MapDataId) {
      matchStartMap.set(match.MapDataId, match);
    }
  }

  const team1CapturesMap = new Map<number, typeof captures>();
  const team2CapturesMap = new Map<number, typeof captures>();

  for (const capture of captures) {
    const mapDataId = capture.MapDataId;
    if (!mapDataId) continue;

    const match = matchStartMap.get(mapDataId);
    if (!match) continue;

    if (capture.capturing_team === match.team_1_name) {
      if (!team1CapturesMap.has(mapDataId)) {
        team1CapturesMap.set(mapDataId, []);
      }
      team1CapturesMap.get(mapDataId)!.push(capture);
    } else if (capture.capturing_team === match.team_2_name) {
      if (!team2CapturesMap.has(mapDataId)) {
        team2CapturesMap.set(mapDataId, []);
      }
      team2CapturesMap.get(mapDataId)!.push(capture);
    }
  }

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
      if (role === "Tank" || role === "Damage" || role === "Support") {
        rolesPlayed.add(role);
      }
    }

    for (const role of rolesPlayed) {
      if (isWin) {
        roleData[role].wins++;
      } else {
        roleData[role].losses++;
      }
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

export const getRoleWinratesByMap = cache(getRoleWinratesByMapUncached);
