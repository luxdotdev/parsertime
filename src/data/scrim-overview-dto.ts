import "server-only";

import type { TrendsAnalysis } from "@/data/comparison-dto";
import { aggregatePlayerStats, calculateTrends } from "@/data/comparison-dto";
import { getTeamRoster } from "@/data/team-shared-data";
import prisma from "@/lib/prisma";
import type { ValidStatColumn } from "@/lib/stat-percentiles";
import {
  groupEventsIntoFights,
  mercyRezToKillEvent,
  removeDuplicateRows,
  type Fight,
} from "@/lib/utils";
import { calculateWinner } from "@/lib/winrate";
import type { HeroName } from "@/types/heroes";
import { heroRoleMapping } from "@/types/heroes";
import {
  Prisma,
  type CalculatedStat,
  type Kill,
  type MatchStart,
  type ObjectiveCaptured,
  type PlayerStat,
  type RoundEnd,
} from "@prisma/client";
import { cache } from "react";

export type ScrimOutlier = {
  stat: ValidStatColumn;
  zScore: number;
  percentile: number;
  direction: "high" | "low";
  label: string;
};

export type PlayerMapPerformance = {
  mapName: string;
  mapIndex: number;
  kdRatio: number;
  eliminationsPer10: number;
  heroDamagePer10: number;
  healingDealtPer10: number;
  firstDeathRate: number;
  teamFirstDeathRate: number;
};

export type PlayerScrimPerformance = {
  playerKey: string;
  playerName: string;
  primaryHero: HeroName;
  heroes: HeroName[];
  mapsPlayed: number;
  eliminations: number;
  deaths: number;
  heroDamageDealt: number;
  healingDealt: number;
  heroTimePlayed: number;
  kdRatio: number;
  eliminationsPer10: number;
  deathsPer10: number;
  heroDamagePer10: number;
  healingDealtPer10: number;
  firstDeathCount: number;
  firstDeathRate: number;
  teamFirstDeathCount: number;
  teamFirstDeathRate: number;
  perMapPerformance: PlayerMapPerformance[];
  zScores: Partial<Record<ValidStatColumn, number>>;
  outliers: ScrimOutlier[];
  trend: "improving" | "stable" | "declining";
  trendData?: TrendsAnalysis;
};

export type ScrimInsight = {
  type:
    | "mvp"
    | "most_improved"
    | "most_declined"
    | "outlier_positive"
    | "outlier_negative";
  headline: string;
  playerName?: string;
};

export type MapResult = {
  mapId: number;
  mapName: string;
  winner: "our_team" | "opponent" | "draw";
};

export type ScrimTeamTotals = {
  eliminations: number;
  deaths: number;
  heroDamage: number;
  healing: number;
  kdRatio: number;
};

export type ScrimOverviewData = {
  mapCount: number;
  wins: number;
  losses: number;
  draws: number;
  mapResults: MapResult[];
  teamPlayers: PlayerScrimPerformance[];
  insights: ScrimInsight[];
  teamTotals: ScrimTeamTotals;
};

const STAT_LABELS: Record<ValidStatColumn, string> = {
  eliminations: "Eliminations",
  final_blows: "Final Blows",
  deaths: "Deaths",
  hero_damage_dealt: "Hero Damage",
  healing_dealt: "Healing",
  healing_received: "Healing Received",
  damage_blocked: "Damage Blocked",
  damage_taken: "Damage Taken",
  solo_kills: "Solo Kills",
  ultimates_earned: "Ults Earned",
  ultimates_used: "Ults Used",
  objective_kills: "Objective Kills",
  offensive_assists: "Offensive Assists",
  defensive_assists: "Defensive Assists",
};

function statLabelFor(stat: ValidStatColumn): string {
  return STAT_LABELS[stat] ?? stat;
}

function statsForHeroRole(
  primaryHero: HeroName,
  heroDamageDealt: number,
  healingDealt: number,
  damageBlocked: number,
  deaths: number,
  eliminations: number
): { stat: ValidStatColumn; value: number }[] {
  const role = heroRoleMapping[primaryHero];
  const base: { stat: ValidStatColumn; value: number }[] = [
    { stat: "eliminations", value: eliminations },
    { stat: "deaths", value: deaths },
    { stat: "hero_damage_dealt", value: heroDamageDealt },
  ];

  if (role === "Support") {
    base.push({ stat: "healing_dealt", value: healingDealt });
  } else if (role === "Tank") {
    base.push({ stat: "damage_blocked", value: damageBlocked });
  }

  return base;
}

function determineTrend(
  trendData?: TrendsAnalysis
): "improving" | "stable" | "declining" {
  if (!trendData) return "stable";
  const improving = trendData.improvingMetrics.length;
  const declining = trendData.decliningMetrics.length;
  if (improving > declining && improving > 0) return "improving";
  if (declining > improving && declining > 0) return "declining";
  return "stable";
}

function generateInsights(players: PlayerScrimPerformance[]): ScrimInsight[] {
  const insights: ScrimInsight[] = [];

  if (players.length === 0) return insights;

  // MVP: highest eliminations per 10 among players with 2+ maps
  const eligibleForMvp = players.filter((p) => p.mapsPlayed >= 2);
  if (eligibleForMvp.length > 0) {
    const mvp = eligibleForMvp.reduce((best, p) =>
      p.eliminationsPer10 > best.eliminationsPer10 ? p : best
    );
    if (mvp.eliminationsPer10 > 0) {
      insights.push({
        type: "mvp",
        headline: `${mvp.playerName} led with ${mvp.eliminationsPer10.toFixed(1)} elims/10 min on ${mvp.primaryHero}`,
        playerName: mvp.playerName,
      });
    }
  }

  // Most improved: player with trendData showing the most improving metrics
  const mostImproved = players
    .filter((p) => p.trendData && p.trendData.improvingMetrics.length > 0)
    .sort(
      (a, b) =>
        (b.trendData?.improvingMetrics.length ?? 0) -
        (a.trendData?.improvingMetrics.length ?? 0)
    )[0];

  if (mostImproved) {
    const topMetric = mostImproved.trendData!.improvingMetrics[0];
    const sign = topMetric.changePercentage > 0 ? "+" : "";
    insights.push({
      type: "most_improved",
      headline: `${mostImproved.playerName} improved across maps (+${sign}${topMetric.changePercentage.toFixed(0)}% ${topMetric.metric.toLowerCase()})`,
      playerName: mostImproved.playerName,
    });
  }

  // Most declined
  const mostDeclined = players
    .filter((p) => p.trendData && p.trendData.decliningMetrics.length > 0)
    .sort(
      (a, b) =>
        (b.trendData?.decliningMetrics.length ?? 0) -
        (a.trendData?.decliningMetrics.length ?? 0)
    )[0];

  if (mostDeclined && mostDeclined.playerName !== mostImproved?.playerName) {
    const topMetric = mostDeclined.trendData!.decliningMetrics[0];
    insights.push({
      type: "most_declined",
      headline: `${mostDeclined.playerName} declined across maps (${topMetric.changePercentage.toFixed(0)}% ${topMetric.metric.toLowerCase()})`,
      playerName: mostDeclined.playerName,
    });
  }

  // Positive outlier: highest z-score across all players/stats
  const positiveOutliers = players
    .flatMap((p) =>
      p.outliers
        .filter((o) => o.direction === "high")
        .map((o) => ({ player: p, outlier: o }))
    )
    .sort((a, b) => b.outlier.zScore - a.outlier.zScore);

  if (positiveOutliers.length > 0) {
    const { player, outlier } = positiveOutliers[0];
    insights.push({
      type: "outlier_positive",
      headline: `${player.playerName}'s ${statLabelFor(outlier.stat).toLowerCase()} ranks at the ${outlier.percentile}th percentile vs database`,
      playerName: player.playerName,
    });
  }

  // Negative outlier: most concerning stat
  const negativeOutliers = players
    .flatMap((p) =>
      p.outliers
        .filter((o) => o.direction === "low")
        .map((o) => ({ player: p, outlier: o }))
    )
    .sort((a, b) => a.outlier.zScore - b.outlier.zScore);

  if (negativeOutliers.length > 0 && insights.length < 4) {
    const { player, outlier } = negativeOutliers[0];
    insights.push({
      type: "outlier_negative",
      headline: `${player.playerName}'s ${statLabelFor(outlier.stat).toLowerCase()} is below average for ${player.primaryHero} (${outlier.percentile}th %ile)`,
      playerName: player.playerName,
    });
  }

  return insights.slice(0, 4);
}

function emptyOverviewData(): ScrimOverviewData {
  return {
    mapCount: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    mapResults: [],
    teamPlayers: [],
    insights: [],
    teamTotals: {
      eliminations: 0,
      deaths: 0,
      heroDamage: 0,
      healing: 0,
      kdRatio: 0,
    },
  };
}

function aggregateRowsToPlayerStat(rows: PlayerStat[]): PlayerStat | null {
  if (rows.length === 0) return null;
  const base = rows[0];
  const totals = rows.reduce(
    (acc, row) => {
      acc.eliminations += row.eliminations;
      acc.final_blows += row.final_blows;
      acc.deaths += row.deaths;
      acc.all_damage_dealt += row.all_damage_dealt;
      acc.barrier_damage_dealt += row.barrier_damage_dealt;
      acc.hero_damage_dealt += row.hero_damage_dealt;
      acc.healing_dealt += row.healing_dealt;
      acc.healing_received += row.healing_received;
      acc.self_healing += row.self_healing;
      acc.damage_taken += row.damage_taken;
      acc.damage_blocked += row.damage_blocked;
      acc.defensive_assists += row.defensive_assists;
      acc.offensive_assists += row.offensive_assists;
      acc.ultimates_earned += row.ultimates_earned;
      acc.ultimates_used += row.ultimates_used;
      acc.multikill_best = Math.max(acc.multikill_best, row.multikill_best);
      acc.multikills += row.multikills;
      acc.solo_kills += row.solo_kills;
      acc.objective_kills += row.objective_kills;
      acc.environmental_kills += row.environmental_kills;
      acc.environmental_deaths += row.environmental_deaths;
      acc.critical_hits += row.critical_hits;
      acc.scoped_critical_hit_kills += row.scoped_critical_hit_kills;
      acc.shots_fired += row.shots_fired;
      acc.shots_hit += row.shots_hit;
      acc.shots_missed += row.shots_missed;
      acc.scoped_shots += row.scoped_shots;
      acc.scoped_shots_hit += row.scoped_shots_hit;
      acc.hero_time_played += row.hero_time_played;
      return acc;
    },
    {
      eliminations: 0,
      final_blows: 0,
      deaths: 0,
      all_damage_dealt: 0,
      barrier_damage_dealt: 0,
      hero_damage_dealt: 0,
      healing_dealt: 0,
      healing_received: 0,
      self_healing: 0,
      damage_taken: 0,
      damage_blocked: 0,
      defensive_assists: 0,
      offensive_assists: 0,
      ultimates_earned: 0,
      ultimates_used: 0,
      multikill_best: 0,
      multikills: 0,
      solo_kills: 0,
      objective_kills: 0,
      environmental_kills: 0,
      environmental_deaths: 0,
      critical_hits: 0,
      scoped_critical_hit_kills: 0,
      shots_fired: 0,
      shots_hit: 0,
      shots_missed: 0,
      scoped_shots: 0,
      scoped_shots_hit: 0,
      hero_time_played: 0,
    }
  );
  return { ...base, ...totals };
}

function getMapTeamNames(stats: PlayerStat[]): Map<number, string> {
  const countsByMap = new Map<number, Map<string, number>>();
  for (const row of stats) {
    if (!row.MapDataId) continue;
    if (!countsByMap.has(row.MapDataId)) {
      countsByMap.set(row.MapDataId, new Map<string, number>());
    }
    const mapCounts = countsByMap.get(row.MapDataId)!;
    mapCounts.set(row.player_team, (mapCounts.get(row.player_team) ?? 0) + 1);
  }

  const result = new Map<number, string>();
  for (const [mapId, teamCounts] of countsByMap.entries()) {
    let selectedTeam: string | null = null;
    let maxCount = -1;
    for (const [teamName, count] of teamCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        selectedTeam = teamName;
      }
    }
    if (selectedTeam) {
      result.set(mapId, selectedTeam);
    }
  }
  return result;
}

function createBaselineKey(hero: HeroName, stat: ValidStatColumn): string {
  return `${hero}::${stat}`;
}

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

type StatDistributionBaseline = {
  hero: string;
  stat_name: string;
  hero_avg_per10: number;
  hero_std_per10: number;
  total_players: number;
};

type BatchedBaselineRow = {
  hero: string;
  avg_eliminations_per10: number | null;
  std_eliminations_per10: number | null;
  avg_deaths_per10: number | null;
  std_deaths_per10: number | null;
  avg_hero_damage_dealt_per10: number | null;
  std_hero_damage_dealt_per10: number | null;
  avg_healing_dealt_per10: number | null;
  std_healing_dealt_per10: number | null;
  avg_damage_blocked_per10: number | null;
  std_damage_blocked_per10: number | null;
  total_players: number;
};

const BASELINE_STAT_COLUMNS: ValidStatColumn[] = [
  "eliminations",
  "deaths",
  "hero_damage_dealt",
  "healing_dealt",
  "damage_blocked",
];

async function getBatchedStatDistributionBaselines(
  heroes: HeroName[],
  minMaps = 5,
  minTimeSeconds = 300,
  sampleLimit = 150
): Promise<Map<string, StatDistributionBaseline>> {
  if (heroes.length === 0) return new Map();

  const rows = await prisma.$queryRaw<BatchedBaselineRow[]>`
    WITH
      final_rows AS (
        SELECT DISTINCT ON ("MapDataId", player_name, player_hero)
          player_name,
          player_hero,
          eliminations,
          deaths,
          hero_damage_dealt,
          healing_dealt,
          damage_blocked,
          hero_time_played
        FROM
          "PlayerStat"
        WHERE
          player_hero IN (${Prisma.join(heroes)})
          AND hero_time_played >= 60
        ORDER BY
          "MapDataId",
          player_name,
          player_hero,
          round_number DESC,
          id DESC
      ),
      per_player_totals AS (
        SELECT
          player_hero,
          player_name,
          COUNT(*) AS maps,
          (SUM(eliminations)::numeric / SUM(hero_time_played)) * 600.0 AS elims_per10,
          (SUM(deaths)::numeric / SUM(hero_time_played)) * 600.0 AS deaths_per10,
          (SUM(hero_damage_dealt)::numeric / SUM(hero_time_played)) * 600.0 AS dmg_per10,
          (SUM(healing_dealt)::numeric / SUM(hero_time_played)) * 600.0 AS heal_per10,
          (SUM(damage_blocked)::numeric / SUM(hero_time_played)) * 600.0 AS block_per10
        FROM
          final_rows
        GROUP BY
          player_name, player_hero
        HAVING
          COUNT(*) >= ${minMaps}
          AND SUM(hero_time_played) >= ${minTimeSeconds}
      ),
      ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            PARTITION BY player_hero
            ORDER BY maps DESC, player_name
          ) AS rn
        FROM
          per_player_totals
      ),
      limited AS (
        SELECT * FROM ranked WHERE rn <= ${sampleLimit}
      )
    SELECT
      player_hero AS hero,
      ROUND(AVG(elims_per10)::numeric, 2) AS avg_eliminations_per10,
      ROUND(STDDEV_SAMP(elims_per10)::numeric, 2) AS std_eliminations_per10,
      ROUND(AVG(deaths_per10)::numeric, 2) AS avg_deaths_per10,
      ROUND(STDDEV_SAMP(deaths_per10)::numeric, 2) AS std_deaths_per10,
      ROUND(AVG(dmg_per10)::numeric, 2) AS avg_hero_damage_dealt_per10,
      ROUND(STDDEV_SAMP(dmg_per10)::numeric, 2) AS std_hero_damage_dealt_per10,
      ROUND(AVG(heal_per10)::numeric, 2) AS avg_healing_dealt_per10,
      ROUND(STDDEV_SAMP(heal_per10)::numeric, 2) AS std_healing_dealt_per10,
      ROUND(AVG(block_per10)::numeric, 2) AS avg_damage_blocked_per10,
      ROUND(STDDEV_SAMP(block_per10)::numeric, 2) AS std_damage_blocked_per10,
      COUNT(*)::int AS total_players
    FROM
      limited
    GROUP BY
      player_hero
  `;

  const statColumnMapping: Record<
    string,
    { avg: keyof BatchedBaselineRow; std: keyof BatchedBaselineRow }
  > = {
    eliminations: {
      avg: "avg_eliminations_per10",
      std: "std_eliminations_per10",
    },
    deaths: { avg: "avg_deaths_per10", std: "std_deaths_per10" },
    hero_damage_dealt: {
      avg: "avg_hero_damage_dealt_per10",
      std: "std_hero_damage_dealt_per10",
    },
    healing_dealt: {
      avg: "avg_healing_dealt_per10",
      std: "std_healing_dealt_per10",
    },
    damage_blocked: {
      avg: "avg_damage_blocked_per10",
      std: "std_damage_blocked_per10",
    },
  };

  const result = new Map<string, StatDistributionBaseline>();
  for (const row of rows) {
    for (const stat of BASELINE_STAT_COLUMNS) {
      const mapping = statColumnMapping[stat];
      const avg = Number(row[mapping.avg]);
      const std = Number(row[mapping.std]);
      if (Number.isNaN(avg) || Number.isNaN(std)) continue;

      result.set(createBaselineKey(row.hero as HeroName, stat), {
        hero: row.hero,
        stat_name: stat,
        hero_avg_per10: avg,
        hero_std_per10: std,
        total_players: row.total_players,
      });
    }
  }

  return result;
}

function calculateZScoreFromBaseline({
  baseline,
  stat,
  per10Value,
}: {
  baseline: StatDistributionBaseline;
  stat: ValidStatColumn;
  per10Value: number;
}): number | null {
  if (!baseline.hero_std_per10 || baseline.hero_std_per10 === 0) return null;
  const isInverted = stat === "deaths" || stat === "damage_taken";
  const zScore = isInverted
    ? (baseline.hero_avg_per10 - per10Value) / baseline.hero_std_per10
    : (per10Value - baseline.hero_avg_per10) / baseline.hero_std_per10;
  if (!Number.isFinite(zScore)) return null;
  return zScore;
}

async function getScrimOverviewFn(
  scrimId: number,
  teamId: number
): Promise<ScrimOverviewData> {
  const maps = await prisma.map.findMany({
    where: { scrimId },
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });

  if (maps.length === 0) return emptyOverviewData();

  const mapIds = maps.map((m) => m.id);

  // Get team roster and unique players in this scrim in parallel
  const [teamRoster, scrimPlayerNames] = await Promise.all([
    getTeamRoster(teamId),
    prisma.playerStat.findMany({
      where: { MapDataId: { in: mapIds } },
      select: { player_name: true },
      distinct: ["player_name"],
    }),
  ]);

  const teamRosterSet = new Set(teamRoster);
  const scrimPlayers = scrimPlayerNames
    .map((p) => p.player_name)
    .filter((name) => teamRosterSet.has(name));

  if (scrimPlayers.length === 0) return emptyOverviewData();

  const [
    finalRoundStats,
    calculatedStats,
    matchStarts,
    finalRounds,
    captures,
    allKills,
    allRezzes,
  ] = await Promise.all([
    prisma.$queryRaw<PlayerStat[]>`
        WITH maxTime AS (
          SELECT
            MAX("match_time") AS max_time,
            "MapDataId"
          FROM
            "PlayerStat"
          WHERE
            "MapDataId" IN (${Prisma.join(mapIds)})
          GROUP BY
            "MapDataId"
        )
        SELECT
          ps.*
        FROM
          "PlayerStat" ps
          INNER JOIN maxTime m ON ps."match_time" = m.max_time AND ps."MapDataId" = m."MapDataId"
        WHERE
          ps."MapDataId" IN (${Prisma.join(mapIds)})
          AND ps."player_name" IN (${Prisma.join(scrimPlayers)})
      `.then((rows) => removeDuplicateRows(rows)),
    prisma.calculatedStat.findMany({
      where: {
        MapDataId: { in: mapIds },
        playerName: { in: scrimPlayers },
      },
    }),
    prisma.matchStart.findMany({ where: { MapDataId: { in: mapIds } } }),
    prisma.roundEnd.findMany({
      where: { MapDataId: { in: mapIds } },
      orderBy: { round_number: "desc" },
    }),
    prisma.objectiveCaptured.findMany({
      where: { MapDataId: { in: mapIds } },
    }),
    prisma.kill.findMany({
      where: { MapDataId: { in: mapIds } },
      orderBy: { match_time: "asc" },
    }),
    prisma.mercyRez.findMany({
      where: { MapDataId: { in: mapIds } },
    }),
  ]);

  if (finalRoundStats.length === 0) return emptyOverviewData();

  // Build lookup maps for matchStarts, finalRounds
  const matchStartByMapId = new Map<number, MatchStart>();
  for (const ms of matchStarts) {
    if (ms.MapDataId) matchStartByMapId.set(ms.MapDataId, ms);
  }

  const finalRoundByMapId = new Map<number, RoundEnd>();
  for (const round of finalRounds) {
    if (round.MapDataId && !finalRoundByMapId.has(round.MapDataId)) {
      finalRoundByMapId.set(round.MapDataId, round);
    }
  }

  const capturesByMapAndTeam = new Map<
    number,
    Map<string, ObjectiveCaptured[]>
  >();
  for (const capture of captures) {
    if (!capture.MapDataId) continue;
    if (!capturesByMapAndTeam.has(capture.MapDataId)) {
      capturesByMapAndTeam.set(
        capture.MapDataId,
        new Map<string, ObjectiveCaptured[]>()
      );
    }
    const mapCaptures = capturesByMapAndTeam.get(capture.MapDataId)!;
    if (!mapCaptures.has(capture.capturing_team)) {
      mapCaptures.set(capture.capturing_team, []);
    }
    mapCaptures.get(capture.capturing_team)!.push(capture);
  }

  const killsByMap = new Map<number, Kill[]>();
  for (const kill of allKills) {
    if (!kill.MapDataId) continue;
    if (!killsByMap.has(kill.MapDataId)) {
      killsByMap.set(kill.MapDataId, []);
    }
    killsByMap.get(kill.MapDataId)!.push(kill);
  }
  for (const rez of allRezzes) {
    if (!rez.MapDataId) continue;
    if (!killsByMap.has(rez.MapDataId)) {
      killsByMap.set(rez.MapDataId, []);
    }
    killsByMap.get(rez.MapDataId)!.push(mercyRezToKillEvent(rez));
  }

  const fightsByMap = new Map<number, Fight[]>();
  for (const [mapId, events] of killsByMap.entries()) {
    events.sort((a, b) => a.match_time - b.match_time);
    fightsByMap.set(mapId, groupEventsIntoFights(events));
  }

  type MapFirstDeathLookup = {
    fightCount: number;
    overallFirstDeaths: Map<string, number>;
    teamFirstDeaths: Map<string, Map<string, number>>;
  };
  const firstDeathLookup = new Map<number, MapFirstDeathLookup>();
  for (const [mapId, fights] of fightsByMap.entries()) {
    const overallFirstDeaths = new Map<string, number>();
    const teamFirstDeaths = new Map<string, Map<string, number>>();

    for (const fight of fights) {
      const overallVictim = fight.kills[0]?.victim_name;
      if (overallVictim) {
        overallFirstDeaths.set(
          overallVictim,
          (overallFirstDeaths.get(overallVictim) ?? 0) + 1
        );
      }

      const teamsSeen = new Set<string>();
      for (const kill of fight.kills) {
        if (kill.event_type !== "kill" || teamsSeen.has(kill.victim_team))
          continue;
        teamsSeen.add(kill.victim_team);
        if (!teamFirstDeaths.has(kill.victim_team)) {
          teamFirstDeaths.set(kill.victim_team, new Map());
        }
        const playerCounts = teamFirstDeaths.get(kill.victim_team)!;
        playerCounts.set(
          kill.victim_name,
          (playerCounts.get(kill.victim_name) ?? 0) + 1
        );
      }
    }

    firstDeathLookup.set(mapId, {
      fightCount: fights.length,
      overallFirstDeaths,
      teamFirstDeaths,
    });
  }

  const ourTeamNameByMap = getMapTeamNames(finalRoundStats);

  // Determine W/L/D for each map
  const mapResults: MapResult[] = [];
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const map of maps) {
    const matchStart = matchStartByMapId.get(map.id) ?? null;
    const finalRound = finalRoundByMapId.get(map.id) ?? null;
    const mapCaptures = capturesByMapAndTeam.get(map.id);
    const team1Caps = matchStart?.team_1_name
      ? (mapCaptures?.get(matchStart.team_1_name) ?? [])
      : [];
    const team2Caps = matchStart?.team_2_name
      ? (mapCaptures?.get(matchStart.team_2_name) ?? [])
      : [];

    const winnerName = calculateWinner({
      matchDetails: matchStart,
      finalRound,
      team1Captures: team1Caps,
      team2Captures: team2Caps,
    });

    const ourTeamName = ourTeamNameByMap.get(map.id) ?? null;
    let winner: MapResult["winner"];

    if (winnerName === "N/A" || !ourTeamName) {
      winner = "draw";
      draws++;
    } else if (winnerName === ourTeamName) {
      winner = "our_team";
      wins++;
    } else {
      winner = "opponent";
      losses++;
    }

    mapResults.push({ mapId: map.id, mapName: map.name, winner });
  }

  const playerRowsMap = new Map<string, PlayerStat[]>();
  for (const row of finalRoundStats) {
    if (!playerRowsMap.has(row.player_name)) {
      playerRowsMap.set(row.player_name, []);
    }
    playerRowsMap.get(row.player_name)!.push(row);
  }

  const playerCalculatedMap = new Map<string, CalculatedStat[]>();
  for (const row of calculatedStats) {
    if (!playerCalculatedMap.has(row.playerName)) {
      playerCalculatedMap.set(row.playerName, []);
    }
    playerCalculatedMap.get(row.playerName)!.push(row);
  }

  const basePlayers: PlayerScrimPerformance[] = [];
  for (const playerName of scrimPlayers) {
    const playerRows = playerRowsMap.get(playerName) ?? [];
    if (playerRows.length === 0) continue;
    const playerCalcRows = playerCalculatedMap.get(playerName) ?? [];

    const rowsByMap = new Map<number, PlayerStat[]>();
    for (const row of playerRows) {
      if (!row.MapDataId) continue;
      if (!rowsByMap.has(row.MapDataId)) {
        rowsByMap.set(row.MapDataId, []);
      }
      rowsByMap.get(row.MapDataId)!.push(row);
    }

    const calcByMap = new Map<number, CalculatedStat[]>();
    for (const row of playerCalcRows) {
      if (!calcByMap.has(row.MapDataId)) {
        calcByMap.set(row.MapDataId, []);
      }
      calcByMap.get(row.MapDataId)!.push(row);
    }

    const playerTeam = playerRows[0].player_team;

    const perMapStats: PlayerStat[] = [];
    const perMapCalculatedStats: CalculatedStat[][] = [];
    const perMapPerformance: PlayerMapPerformance[] = [];
    let totalFights = 0;
    let totalFirstDeaths = 0;
    let totalTeamFirstDeaths = 0;

    for (let i = 0; i < mapIds.length; i++) {
      const mapId = mapIds[i];
      const rows = rowsByMap.get(mapId) ?? [];
      if (rows.length === 0) continue;
      const aggregatedRow = aggregateRowsToPlayerStat(rows);
      if (!aggregatedRow) continue;
      perMapStats.push(aggregatedRow);
      perMapCalculatedStats.push(calcByMap.get(mapId) ?? []);

      const fdLookup = firstDeathLookup.get(mapId);
      const mapFightCount = fdLookup?.fightCount ?? 0;
      const mapFirstDeaths = fdLookup?.overallFirstDeaths.get(playerName) ?? 0;
      const mapTeamFirstDeaths =
        fdLookup?.teamFirstDeaths.get(playerTeam)?.get(playerName) ?? 0;

      totalFights += mapFightCount;
      totalFirstDeaths += mapFirstDeaths;
      totalTeamFirstDeaths += mapTeamFirstDeaths;

      const time = aggregatedRow.hero_time_played;
      perMapPerformance.push({
        mapName: maps[i].name,
        mapIndex: i,
        kdRatio:
          aggregatedRow.deaths > 0
            ? aggregatedRow.eliminations / aggregatedRow.deaths
            : aggregatedRow.eliminations,
        eliminationsPer10:
          time > 0 ? (aggregatedRow.eliminations / time) * 600 : 0,
        heroDamagePer10:
          time > 0 ? (aggregatedRow.hero_damage_dealt / time) * 600 : 0,
        healingDealtPer10:
          time > 0 ? (aggregatedRow.healing_dealt / time) * 600 : 0,
        firstDeathRate:
          mapFightCount > 0 ? (mapFirstDeaths / mapFightCount) * 100 : 0,
        teamFirstDeathRate:
          mapFightCount > 0 ? (mapTeamFirstDeaths / mapFightCount) * 100 : 0,
      });
    }

    const aggregated = aggregatePlayerStats(
      playerRows,
      playerCalcRows,
      perMapStats,
      perMapCalculatedStats
    );

    const heroTimeMap = new Map<string, number>();
    for (const row of playerRows) {
      heroTimeMap.set(
        row.player_hero,
        (heroTimeMap.get(row.player_hero) ?? 0) + row.hero_time_played
      );
    }
    const heroes = Array.from(heroTimeMap.keys()) as HeroName[];
    if (heroes.length === 0) continue;

    let primaryHero: HeroName = heroes[0] ?? "Ana";
    let maxTime = -1;
    for (const [hero, time] of heroTimeMap.entries()) {
      if (time > maxTime) {
        maxTime = time;
        primaryHero = hero as HeroName;
      }
    }

    const trendData =
      perMapStats.length >= 3
        ? calculateTrends(perMapStats, perMapCalculatedStats)
        : undefined;
    const trend = determineTrend(trendData);
    const rowId = playerRows.reduce(
      (lowest, row) => (row.id < lowest ? row.id : lowest),
      playerRows[0].id
    );

    const kdRatio =
      aggregated.deaths > 0
        ? aggregated.eliminations / aggregated.deaths
        : aggregated.eliminations;

    basePlayers.push({
      playerKey: `${playerName}:${rowId}`,
      playerName,
      primaryHero,
      heroes,
      mapsPlayed: perMapStats.length,
      eliminations: aggregated.eliminations,
      deaths: aggregated.deaths,
      heroDamageDealt: aggregated.heroDamageDealt,
      healingDealt: aggregated.healingDealt,
      heroTimePlayed: aggregated.heroTimePlayed,
      kdRatio,
      eliminationsPer10: aggregated.eliminationsPer10,
      deathsPer10: aggregated.deathsPer10,
      heroDamagePer10: aggregated.heroDamagePer10,
      healingDealtPer10: aggregated.healingDealtPer10,
      firstDeathCount: totalFirstDeaths,
      firstDeathRate:
        totalFights > 0 ? (totalFirstDeaths / totalFights) * 100 : 0,
      teamFirstDeathCount: totalTeamFirstDeaths,
      teamFirstDeathRate:
        totalFights > 0 ? (totalTeamFirstDeaths / totalFights) * 100 : 0,
      perMapPerformance,
      zScores: {},
      outliers: [],
      trend,
      trendData,
    } satisfies PlayerScrimPerformance);
  }

  const uniqueHeroes = new Set<HeroName>();
  for (const player of basePlayers) {
    if (player.heroTimePlayed >= 300) {
      uniqueHeroes.add(player.primaryHero);
    }
  }

  const baselineMap = await getBatchedStatDistributionBaselines(
    Array.from(uniqueHeroes)
  );

  const teamPlayers: PlayerScrimPerformance[] = basePlayers.map((player) => {
    if (player.heroTimePlayed < 300) return player;
    const zScores: Partial<Record<ValidStatColumn, number>> = {};
    const outliers: ScrimOutlier[] = [];

    const comparisonStats = statsForHeroRole(
      player.primaryHero,
      player.heroDamageDealt,
      player.healingDealt,
      0,
      player.deaths,
      player.eliminations
    );

    for (const statDef of comparisonStats) {
      const baseline = baselineMap.get(
        createBaselineKey(player.primaryHero, statDef.stat)
      );
      if (!baseline) continue;

      const per10Value = (statDef.value / player.heroTimePlayed) * 600;
      const zScore = calculateZScoreFromBaseline({
        baseline,
        stat: statDef.stat,
        per10Value,
      });
      if (zScore === null) continue;
      const percentile = Math.round(normalCdf(zScore) * 1000) / 10;

      zScores[statDef.stat] = zScore;
      if (Math.abs(zScore) >= 2) {
        outliers.push({
          stat: statDef.stat,
          zScore,
          percentile,
          direction: zScore > 0 ? "high" : "low",
          label: statLabelFor(statDef.stat),
        });
      }
    }

    outliers.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
    return {
      ...player,
      zScores,
      outliers,
    };
  });

  // Sort by maps played desc, then alphabetically
  teamPlayers.sort(
    (a, b) =>
      b.mapsPlayed - a.mapsPlayed || a.playerName.localeCompare(b.playerName)
  );

  // Team-wide totals
  const teamTotals = teamPlayers.reduce(
    (acc, p) => ({
      eliminations: acc.eliminations + p.eliminations,
      deaths: acc.deaths + p.deaths,
      heroDamage: acc.heroDamage + p.heroDamageDealt,
      healing: acc.healing + p.healingDealt,
      kdRatio: 0, // computed below
    }),
    { eliminations: 0, deaths: 0, heroDamage: 0, healing: 0, kdRatio: 0 }
  );
  teamTotals.kdRatio =
    teamTotals.deaths > 0
      ? teamTotals.eliminations / teamTotals.deaths
      : teamTotals.eliminations;

  const insights = generateInsights(teamPlayers);

  return {
    mapCount: maps.length,
    wins,
    losses,
    draws,
    mapResults,
    teamPlayers,
    insights,
    teamTotals,
  };
}

export const getScrimOverview = cache(getScrimOverviewFn);
