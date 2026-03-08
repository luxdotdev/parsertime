import "server-only";

import type { TrendsAnalysis } from "@/data/comparison-dto";
import { aggregatePlayerStats, calculateTrends } from "@/data/comparison-dto";
import {
  filterUtilityRoundStartSwaps,
  type SwapRecord,
  type SwapTimingOutcome,
  type SwapWinrateBucket,
} from "@/data/team-hero-swap-dto";
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
import type { HeroName, RoleName, SubroleName } from "@/types/heroes";
import {
  getHeroRole,
  heroRoleMapping,
  ROLE_SUBROLES,
  SUBROLE_DISPLAY_NAMES,
  SUBROLE_ORDER,
  subroleHeroMapping,
} from "@/types/heroes";
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

export type ScrimFightAnalysis = {
  totalFights: number;
  fightsWon: number;
  fightWinrate: number;

  teamFirstDeathCount: number;
  teamFirstDeathRate: number;
  firstDeathWinrate: number;

  firstPickCount: number;
  firstPickRate: number;
  firstPickWinrate: number;

  firstUltCount: number;
  firstUltRate: number;
  firstUltWinrate: number;
  opponentFirstUltCount: number;
  opponentFirstUltWinrate: number;
};

export type SubroleUltTiming = {
  subrole: string;
  count: number;
  initiation: number;
  midfight: number;
  late: number;
};

export type ScrimUltRoleBreakdown = {
  role: "Tank" | "Damage" | "Support";
  ourCount: number;
  opponentCount: number;
  ourFirstRate: number;
  ourSubroleTimings: SubroleUltTiming[];
  opponentSubroleTimings: SubroleUltTiming[];
};

export type PlayerUltComparison = {
  subrole: string;
  ourPlayerName: string;
  ourHero: string;
  ourUltCount: number;
  opponentPlayerName: string;
  opponentHero: string;
  opponentUltCount: number;
};

export type FightInitiatingUlt = {
  hero: string;
  count: number;
  isOurTeam: boolean;
};

export type UltEfficiency = {
  ultimateEfficiency: number;
  avgUltsInWonFights: number;
  avgUltsInLostFights: number;
  wastedUltimates: number;
  totalUltsUsedInFights: number;
  fightsWon: number;
  fightsLost: number;
  dryFights: number;
  dryFightWins: number;
  dryFightWinrate: number;
  dryFightReversals: number;
  dryFightReversalRate: number;
  nonDryFights: number;
  nonDryFightReversals: number;
  nonDryFightReversalRate: number;
};

export type ScrimUltAnalysis = {
  ourUltsUsed: number;
  opponentUltsUsed: number;
  ultsByRole: ScrimUltRoleBreakdown[];
  topUltUser: { playerName: string; hero: string; count: number } | null;
  avgChargeTime: number;
  avgHoldTime: number;
  playerComparisons: PlayerUltComparison[];
  ourFightInitiations: number;
  opponentFightInitiations: number;
  fightsWithUlts: number;
  ourTopFightInitiator: FightInitiatingUlt | null;
  opponentTopFightInitiator: FightInitiatingUlt | null;
  ultEfficiency: UltEfficiency;
};

export type ScrimSwapAnalysis = {
  ourSwaps: number;
  opponentSwaps: number;
  ourSwapsPerMap: number;
  opponentSwapsPerMap: number;
  mapsWithOurSwaps: number;
  mapsWithoutOurSwaps: number;
  noSwapWinrate: number;
  noSwapWins: number;
  noSwapLosses: number;
  swapWinrate: number;
  swapWins: number;
  swapLosses: number;
  avgHeroTimeBeforeSwap: number;
  ourTopSwap: { from: string; to: string; count: number } | null;
  opponentTopSwap: { from: string; to: string; count: number } | null;
  topSwapper: {
    playerName: string;
    count: number;
    mapsCount: number;
  } | null;
  winrateBySwapCount: SwapWinrateBucket[];
  timingOutcomes: SwapTimingOutcome[];
};

export type ScrimOverviewData = {
  mapCount: number;
  wins: number;
  losses: number;
  draws: number;
  ourTeamName: string;
  opponentTeamName: string;
  mapResults: MapResult[];
  teamPlayers: PlayerScrimPerformance[];
  insights: ScrimInsight[];
  teamTotals: ScrimTeamTotals;
  fightAnalysis: ScrimFightAnalysis;
  ultAnalysis: ScrimUltAnalysis;
  swapAnalysis: ScrimSwapAnalysis;
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

function emptyFightAnalysis(): ScrimFightAnalysis {
  return {
    totalFights: 0,
    fightsWon: 0,
    fightWinrate: 0,
    teamFirstDeathCount: 0,
    teamFirstDeathRate: 0,
    firstDeathWinrate: 0,
    firstPickCount: 0,
    firstPickRate: 0,
    firstPickWinrate: 0,
    firstUltCount: 0,
    firstUltRate: 0,
    firstUltWinrate: 0,
    opponentFirstUltCount: 0,
    opponentFirstUltWinrate: 0,
  };
}

function emptyUltAnalysis(): ScrimUltAnalysis {
  return {
    ourUltsUsed: 0,
    opponentUltsUsed: 0,
    ultsByRole: [],
    topUltUser: null,
    avgChargeTime: 0,
    avgHoldTime: 0,
    playerComparisons: [],
    ourFightInitiations: 0,
    opponentFightInitiations: 0,
    fightsWithUlts: 0,
    ourTopFightInitiator: null,
    opponentTopFightInitiator: null,
    ultEfficiency: {
      ultimateEfficiency: 0,
      avgUltsInWonFights: 0,
      avgUltsInLostFights: 0,
      wastedUltimates: 0,
      totalUltsUsedInFights: 0,
      fightsWon: 0,
      fightsLost: 0,
      dryFights: 0,
      dryFightWins: 0,
      dryFightWinrate: 0,
      dryFightReversals: 0,
      dryFightReversalRate: 0,
      nonDryFights: 0,
      nonDryFightReversals: 0,
      nonDryFightReversalRate: 0,
    },
  };
}

function emptySwapAnalysis(): ScrimSwapAnalysis {
  return {
    ourSwaps: 0,
    opponentSwaps: 0,
    ourSwapsPerMap: 0,
    opponentSwapsPerMap: 0,
    mapsWithOurSwaps: 0,
    mapsWithoutOurSwaps: 0,
    noSwapWinrate: 0,
    noSwapWins: 0,
    noSwapLosses: 0,
    swapWinrate: 0,
    swapWins: 0,
    swapLosses: 0,
    avgHeroTimeBeforeSwap: 0,
    ourTopSwap: null,
    opponentTopSwap: null,
    topSwapper: null,
    winrateBySwapCount: [],
    timingOutcomes: [],
  };
}

function emptyOverviewData(): ScrimOverviewData {
  return {
    mapCount: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    ourTeamName: "",
    opponentTeamName: "",
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
    fightAnalysis: emptyFightAnalysis(),
    ultAnalysis: emptyUltAnalysis(),
    swapAnalysis: emptySwapAnalysis(),
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

type ExtendedFightEvent = Kill & {
  ultimate_id?: number;
};

type ExtendedFight = {
  events: ExtendedFightEvent[];
  start: number;
  end: number;
};

const FIGHT_GAP_SECONDS = 15;

function computeScrimFightAnalysis(
  mapIds: number[],
  killsByMap: Map<number, Kill[]>,
  allUltimates: {
    id: number;
    scrimId: number;
    match_time: number;
    player_team: string;
    player_name: string;
    player_hero: string;
    ultimate_id: number;
    MapDataId: number | null;
  }[],
  ourTeamNameByMap: Map<number, string>
): ScrimFightAnalysis {
  const ultsByMap = new Map<number, typeof allUltimates>();
  for (const ult of allUltimates) {
    if (!ult.MapDataId) continue;
    if (!ultsByMap.has(ult.MapDataId)) {
      ultsByMap.set(ult.MapDataId, []);
    }
    ultsByMap.get(ult.MapDataId)!.push(ult);
  }

  let totalFights = 0;
  let fightsWon = 0;
  let teamFirstDeathCount = 0;
  let firstDeathWins = 0;
  let firstPickCount = 0;
  let firstPickWins = 0;
  let firstUltCount = 0;
  let firstUltWins = 0;
  let opponentFirstUltCount = 0;
  let opponentFirstUltWins = 0;

  for (const mapId of mapIds) {
    const ourTeamName = ourTeamNameByMap.get(mapId);
    if (!ourTeamName) continue;

    const kills = killsByMap.get(mapId) ?? [];
    const ults = ultsByMap.get(mapId) ?? [];

    if (kills.length === 0 && ults.length === 0) continue;

    const events: ExtendedFightEvent[] = [
      ...kills,
      ...ults.map((ult) => ({
        id: ult.id,
        scrimId: ult.scrimId,
        event_type: "ultimate_start" as Kill["event_type"],
        match_time: ult.match_time,
        attacker_team: ult.player_team,
        attacker_name: ult.player_name,
        attacker_hero: ult.player_hero,
        victim_team: "",
        victim_name: "",
        victim_hero: "",
        event_ability: "Ultimate",
        event_damage: 0,
        is_critical_hit: "0",
        is_environmental: "0",
        MapDataId: ult.MapDataId,
        ultimate_id: ult.ultimate_id,
      })),
    ];

    events.sort((a, b) => a.match_time - b.match_time);

    const fights: ExtendedFight[] = [];
    let currentFight: ExtendedFight | null = null;

    for (const event of events) {
      if (
        !currentFight ||
        event.match_time - currentFight.end > FIGHT_GAP_SECONDS
      ) {
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
      const sorted = [...fight.events].sort(
        (a, b) => a.match_time - b.match_time
      );

      const killEvents = sorted.filter(
        (e) => e.event_type === "kill" || e.event_type === "mercy_rez"
      );
      const ultEvents = sorted.filter((e) => e.event_type === "ultimate_start");

      let ourKills = 0;
      let enemyKills = 0;

      for (const event of sorted) {
        if (event.event_type === "mercy_rez") {
          if (event.victim_team === ourTeamName) {
            enemyKills = Math.max(0, enemyKills - 1);
          } else {
            ourKills = Math.max(0, ourKills - 1);
          }
        } else if (event.event_type === "kill") {
          if (event.attacker_team === ourTeamName) {
            ourKills++;
          } else {
            enemyKills++;
          }
        }
      }

      const won = ourKills > enemyKills;

      totalFights++;
      if (won) fightsWon++;

      const firstKill = killEvents.find((k) => k.event_type === "kill");
      if (firstKill) {
        if (firstKill.attacker_team === ourTeamName) {
          firstPickCount++;
          if (won) firstPickWins++;
        }
        if (firstKill.victim_team === ourTeamName) {
          teamFirstDeathCount++;
          if (won) firstDeathWins++;
        }
      }

      const firstUlt = ultEvents[0];
      if (firstUlt) {
        if (firstUlt.attacker_team === ourTeamName) {
          firstUltCount++;
          if (won) firstUltWins++;
        } else {
          opponentFirstUltCount++;
          if (won) opponentFirstUltWins++;
        }
      }
    }
  }

  return {
    totalFights,
    fightsWon,
    fightWinrate: totalFights > 0 ? (fightsWon / totalFights) * 100 : 0,
    teamFirstDeathCount,
    teamFirstDeathRate:
      totalFights > 0 ? (teamFirstDeathCount / totalFights) * 100 : 0,
    firstDeathWinrate:
      teamFirstDeathCount > 0
        ? (firstDeathWins / teamFirstDeathCount) * 100
        : 0,
    firstPickCount,
    firstPickRate: totalFights > 0 ? (firstPickCount / totalFights) * 100 : 0,
    firstPickWinrate:
      firstPickCount > 0 ? (firstPickWins / firstPickCount) * 100 : 0,
    firstUltCount,
    firstUltRate: totalFights > 0 ? (firstUltCount / totalFights) * 100 : 0,
    firstUltWinrate:
      firstUltCount > 0 ? (firstUltWins / firstUltCount) * 100 : 0,
    opponentFirstUltCount,
    opponentFirstUltWinrate:
      opponentFirstUltCount > 0
        ? (opponentFirstUltWins / opponentFirstUltCount) * 100
        : 0,
  };
}

type UltStartRecord = {
  player_team: string;
  player_name: string;
  player_hero: string;
  match_time: number;
  MapDataId: number | null;
};

function computeScrimUltAnalysis(
  allUltimates: UltStartRecord[],
  fightsByMap: Map<number, Fight[]>,
  ourTeamNameByMap: Map<number, string>,
  calculatedStats: CalculatedStat[],
  scrimPlayers: string[]
): ScrimUltAnalysis {
  const roles: RoleName[] = ["Tank", "Damage", "Support"];

  let ourUltsUsed = 0;
  let opponentUltsUsed = 0;
  const ourByRole: Record<RoleName, number> = {
    Tank: 0,
    Damage: 0,
    Support: 0,
  };
  const oppByRole: Record<RoleName, number> = {
    Tank: 0,
    Damage: 0,
    Support: 0,
  };
  const firstByRole: Record<
    RoleName,
    { ourFirst: number; oppFirst: number; total: number }
  > = {
    Tank: { ourFirst: 0, oppFirst: 0, total: 0 },
    Damage: { ourFirst: 0, oppFirst: 0, total: 0 },
    Support: { ourFirst: 0, oppFirst: 0, total: 0 },
  };

  type PlayerUltEntry = {
    heroCountMap: Map<string, number>;
    totalCount: number;
  };
  const ourPlayerUltCounts = new Map<string, PlayerUltEntry>();
  const oppPlayerUltCounts = new Map<string, PlayerUltEntry>();

  function trackPlayerUlt(
    map: Map<string, PlayerUltEntry>,
    playerName: string,
    hero: string
  ) {
    let entry = map.get(playerName);
    if (!entry) {
      entry = { heroCountMap: new Map(), totalCount: 0 };
      map.set(playerName, entry);
    }
    entry.totalCount++;
    entry.heroCountMap.set(hero, (entry.heroCountMap.get(hero) ?? 0) + 1);
  }

  type SubroleTimingAccum = {
    count: number;
    initiation: number;
    midfight: number;
    late: number;
  };

  function createSubroleTimingMap() {
    const map = new Map<string, Map<SubroleName, SubroleTimingAccum>>();
    for (const role of roles) {
      const inner = new Map<SubroleName, SubroleTimingAccum>();
      for (const sr of ROLE_SUBROLES[role]) {
        inner.set(sr, { count: 0, initiation: 0, midfight: 0, late: 0 });
      }
      map.set(role, inner);
    }
    return map;
  }

  const ourSubroleTimingByRole = createSubroleTimingMap();
  const oppSubroleTimingByRole = createSubroleTimingMap();

  const fightInitiatingUlts = new Map<
    string,
    { hero: string; count: number; ourCount: number; oppCount: number }
  >();
  let ourFightInitiations = 0;
  let opponentFightInitiations = 0;
  let fightsWithUlts = 0;

  let effFightsWon = 0;
  let effFightsLost = 0;
  let ultsInWonFights = 0;
  let ultsInLostFights = 0;
  let totalWastedUlts = 0;
  let totalOurUltsInFights = 0;
  let dryFights = 0;
  let dryFightWins = 0;
  let dryFightReversals = 0;
  let nonDryFightReversals = 0;

  const ultsByMap = new Map<number, UltStartRecord[]>();
  for (const ult of allUltimates) {
    if (!ult.MapDataId) continue;
    if (!ultsByMap.has(ult.MapDataId)) ultsByMap.set(ult.MapDataId, []);
    ultsByMap.get(ult.MapDataId)!.push(ult);
  }

  // Pre-compute player ult counts for subrole assignment
  for (const [mapId, ults] of ultsByMap) {
    const ourTeamName = ourTeamNameByMap.get(mapId);
    if (!ourTeamName) continue;
    for (const ult of ults) {
      if (ult.player_team === ourTeamName) {
        trackPlayerUlt(ourPlayerUltCounts, ult.player_name, ult.player_hero);
      } else {
        trackPlayerUlt(oppPlayerUltCounts, ult.player_name, ult.player_hero);
      }
    }
  }

  // Build player-name → subrole lookup from the same assignment algorithm
  // used by the comparison chart, so both charts agree on subrole placement
  const ourSubroleAssignment = assignPlayersToSubroles(ourPlayerUltCounts);
  const oppSubroleAssignment = assignPlayersToSubroles(oppPlayerUltCounts);

  const ourPlayerSubrole = new Map<string, SubroleName>();
  for (const [sr, candidate] of ourSubroleAssignment) {
    ourPlayerSubrole.set(candidate.playerName, sr);
  }
  const oppPlayerSubrole = new Map<string, SubroleName>();
  for (const [sr, candidate] of oppSubroleAssignment) {
    oppPlayerSubrole.set(candidate.playerName, sr);
  }

  for (const [mapId, ults] of ultsByMap) {
    const ourTeamName = ourTeamNameByMap.get(mapId);
    if (!ourTeamName) continue;

    for (const ult of ults) {
      const role = getHeroRole(ult.player_hero);
      if (ult.player_team === ourTeamName) {
        ourUltsUsed++;
        ourByRole[role]++;
      } else {
        opponentUltsUsed++;
        oppByRole[role]++;
      }
    }

    const fights = fightsByMap.get(mapId) ?? [];
    for (const fight of fights) {
      const fightUlts = ults.filter(
        (u) => u.match_time >= fight.start && u.match_time <= fight.end + 15
      );

      if (fightUlts.length > 0) {
        const opener = fightUlts[0];
        fightsWithUlts++;
        const isOurs = opener.player_team === ourTeamName;
        if (isOurs) ourFightInitiations++;
        else opponentFightInitiations++;

        const key = opener.player_hero;
        const existing = fightInitiatingUlts.get(key);
        if (existing) {
          existing.count++;
          if (isOurs) existing.ourCount++;
          else existing.oppCount++;
        } else {
          fightInitiatingUlts.set(key, {
            hero: opener.player_hero,
            count: 1,
            ourCount: isOurs ? 1 : 0,
            oppCount: isOurs ? 0 : 1,
          });
        }
      }

      for (const role of roles) {
        const first = fightUlts.find(
          (u) => getHeroRole(u.player_hero) === role
        );
        if (!first) continue;
        firstByRole[role].total++;
        if (first.player_team === ourTeamName) firstByRole[role].ourFirst++;
        else firstByRole[role].oppFirst++;
      }

      const fightDuration = fight.end + 15 - fight.start;
      const thirdDuration = fightDuration / 3;
      for (const ult of fightUlts) {
        const isOurUlt = ult.player_team === ourTeamName;
        const playerLookup = isOurUlt ? ourPlayerSubrole : oppPlayerSubrole;
        const subrole = playerLookup.get(ult.player_name);
        if (!subrole) continue;
        const role = getHeroRole(ult.player_hero);

        const timingMap = isOurUlt
          ? ourSubroleTimingByRole
          : oppSubroleTimingByRole;
        const accum = timingMap.get(role)?.get(subrole);
        if (!accum) continue;
        accum.count++;

        const elapsed = ult.match_time - fight.start;
        if (fightDuration <= 0 || elapsed < thirdDuration) {
          accum.initiation++;
        } else if (elapsed < thirdDuration * 2) {
          accum.midfight++;
        } else {
          accum.late++;
        }
      }

      const ourUltCount = fightUlts.filter(
        (u) => u.player_team === ourTeamName
      ).length;

      let ourKills = 0;
      let enemyKills = 0;
      let wasDown2Plus = false;
      for (const k of fight.kills) {
        if (k.event_type === "mercy_rez") {
          if (k.victim_team === ourTeamName) {
            enemyKills = Math.max(0, enemyKills - 1);
          } else {
            ourKills = Math.max(0, ourKills - 1);
          }
        } else if (k.event_type === "kill") {
          if (k.attacker_team === ourTeamName) ourKills++;
          else enemyKills++;
        }
        if (enemyKills - ourKills >= 2) {
          wasDown2Plus = true;
        }
      }
      const won = ourKills > enemyKills;
      const isReversal = won && wasDown2Plus;

      if (ourUltCount === 0) {
        dryFights++;
        if (won) dryFightWins++;
        if (isReversal) dryFightReversals++;
      } else {
        totalOurUltsInFights += ourUltCount;
        if (won) {
          effFightsWon++;
          ultsInWonFights += ourUltCount;
        } else {
          effFightsLost++;
          ultsInLostFights += ourUltCount;
        }
        if (isReversal) nonDryFightReversals++;

        const sortedKills = [...fight.kills].sort(
          (a, b) => a.match_time - b.match_time
        );
        for (const ult of fightUlts) {
          if (ult.player_team !== ourTeamName) continue;
          let runOur = 0;
          let runEnemy = 0;
          for (const k of sortedKills) {
            if (k.match_time > ult.match_time) break;
            if (k.event_type === "mercy_rez") {
              if (k.victim_team === ourTeamName)
                runEnemy = Math.max(0, runEnemy - 1);
              else runOur = Math.max(0, runOur - 1);
            } else if (k.event_type === "kill") {
              if (k.attacker_team === ourTeamName) runOur++;
              else runEnemy++;
            }
          }
          if (runOur - runEnemy <= -3) totalWastedUlts++;
        }
      }
    }
  }

  function extractTimings(
    timingMap: Map<string, Map<SubroleName, SubroleTimingAccum>>,
    role: RoleName
  ): SubroleUltTiming[] {
    const result: SubroleUltTiming[] = [];
    const inner = timingMap.get(role)!;
    for (const sr of ROLE_SUBROLES[role]) {
      const accum = inner.get(sr)!;
      if (accum.count > 0) {
        result.push({
          subrole: SUBROLE_DISPLAY_NAMES[sr],
          count: accum.count,
          initiation: accum.initiation,
          midfight: accum.midfight,
          late: accum.late,
        });
      }
    }
    return result;
  }

  const ultsByRole: ScrimUltRoleBreakdown[] = roles.map((role) => ({
    role,
    ourCount: ourByRole[role],
    opponentCount: oppByRole[role],
    ourFirstRate:
      firstByRole[role].total > 0
        ? (firstByRole[role].ourFirst / firstByRole[role].total) * 100
        : 0,
    ourSubroleTimings: extractTimings(ourSubroleTimingByRole, role),
    opponentSubroleTimings: extractTimings(oppSubroleTimingByRole, role),
  }));

  let topUltUser: ScrimUltAnalysis["topUltUser"] = null;
  for (const [name, entry] of ourPlayerUltCounts) {
    if (!topUltUser || entry.totalCount > topUltUser.count) {
      let bestHero = "";
      let bestCount = 0;
      for (const [hero, count] of entry.heroCountMap) {
        if (count > bestCount) {
          bestCount = count;
          bestHero = hero;
        }
      }
      topUltUser = {
        playerName: name,
        hero: bestHero,
        count: entry.totalCount,
      };
    }
  }

  const scrimPlayerSet = new Set(scrimPlayers);
  const chargeTimeValues: number[] = [];
  const holdTimeValues: number[] = [];
  for (const cs of calculatedStats) {
    if (!scrimPlayerSet.has(cs.playerName) || cs.value <= 0) continue;
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

  const playerComparisons = buildPlayerUltComparisons(
    ourPlayerUltCounts,
    oppPlayerUltCounts
  );

  let ourTopFightInitiator: FightInitiatingUlt | null = null;
  let opponentTopFightInitiator: FightInitiatingUlt | null = null;
  for (const entry of fightInitiatingUlts.values()) {
    if (
      entry.ourCount > 0 &&
      (!ourTopFightInitiator || entry.ourCount > ourTopFightInitiator.count)
    ) {
      ourTopFightInitiator = {
        hero: entry.hero,
        count: entry.ourCount,
        isOurTeam: true,
      };
    }
    if (
      entry.oppCount > 0 &&
      (!opponentTopFightInitiator ||
        entry.oppCount > opponentTopFightInitiator.count)
    ) {
      opponentTopFightInitiator = {
        hero: entry.hero,
        count: entry.oppCount,
        isOurTeam: false,
      };
    }
  }

  const nonDryFights = effFightsWon + effFightsLost;
  const ultEfficiency: UltEfficiency = {
    ultimateEfficiency:
      totalOurUltsInFights > 0 ? effFightsWon / totalOurUltsInFights : 0,
    avgUltsInWonFights: effFightsWon > 0 ? ultsInWonFights / effFightsWon : 0,
    avgUltsInLostFights:
      effFightsLost > 0 ? ultsInLostFights / effFightsLost : 0,
    wastedUltimates: totalWastedUlts,
    totalUltsUsedInFights: totalOurUltsInFights,
    fightsWon: effFightsWon,
    fightsLost: nonDryFights - effFightsWon,
    dryFights,
    dryFightWins,
    dryFightWinrate: dryFights > 0 ? (dryFightWins / dryFights) * 100 : 0,
    dryFightReversals,
    dryFightReversalRate:
      dryFights > 0 ? (dryFightReversals / dryFights) * 100 : 0,
    nonDryFights,
    nonDryFightReversals,
    nonDryFightReversalRate:
      nonDryFights > 0 ? (nonDryFightReversals / nonDryFights) * 100 : 0,
  };

  return {
    ourUltsUsed,
    opponentUltsUsed,
    ultsByRole,
    topUltUser,
    avgChargeTime,
    avgHoldTime,
    playerComparisons,
    ourFightInitiations,
    opponentFightInitiations,
    fightsWithUlts,
    ourTopFightInitiator,
    opponentTopFightInitiator,
    ultEfficiency,
  };
}

function heroSubroles(hero: string): SubroleName[] {
  const result: SubroleName[] = [];
  for (const subrole of SUBROLE_ORDER) {
    if ((subroleHeroMapping[subrole] as string[]).includes(hero)) {
      result.push(subrole);
    }
  }
  return result;
}

export type PlayerUltSummary = {
  heroCountMap: Map<string, number>;
  totalCount: number;
};

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

export type SubroleCandidate = {
  playerName: string;
  primaryHero: string;
  possibleSubroles: SubroleName[];
  ultCount: number;
};

/**
 * Assigns each player to a unique subrole slot. Players whose hero fits
 * fewer subroles are assigned first so they don't lose their only option
 * to a more flexible player. This handles overlap (e.g. Tracer appearing
 * in both HitscanDamage and FlexDamage).
 */
export function assignPlayersToSubroles(
  counts: Map<string, PlayerUltSummary>
): Map<SubroleName, SubroleCandidate> {
  const candidates: SubroleCandidate[] = [];
  for (const [name, entry] of counts) {
    const hero = primaryHeroForPlayer(entry);
    const possible = heroSubroles(hero);
    if (possible.length > 0) {
      candidates.push({
        playerName: name,
        primaryHero: hero,
        possibleSubroles: possible,
        ultCount: entry.totalCount,
      });
    }
  }

  candidates.sort(
    (a, b) =>
      a.possibleSubroles.length - b.possibleSubroles.length ||
      b.ultCount - a.ultCount
  );

  const assigned = new Map<SubroleName, SubroleCandidate>();
  const usedPlayers = new Set<string>();

  for (const candidate of candidates) {
    if (usedPlayers.has(candidate.playerName)) continue;
    for (const subrole of candidate.possibleSubroles) {
      if (!assigned.has(subrole)) {
        assigned.set(subrole, candidate);
        usedPlayers.add(candidate.playerName);
        break;
      }
    }
  }

  // Second pass: try to place any remaining unassigned players by checking
  // if the current occupant of a slot could move to an alternative slot.
  for (const candidate of candidates) {
    if (usedPlayers.has(candidate.playerName)) continue;
    for (const subrole of candidate.possibleSubroles) {
      const occupant = assigned.get(subrole);
      if (!occupant) {
        assigned.set(subrole, candidate);
        usedPlayers.add(candidate.playerName);
        break;
      }
      const alternativeForOccupant = occupant.possibleSubroles.find(
        (alt) => alt !== subrole && !assigned.has(alt)
      );
      if (alternativeForOccupant) {
        assigned.set(alternativeForOccupant, occupant);
        assigned.set(subrole, candidate);
        usedPlayers.add(candidate.playerName);
        break;
      }
    }
  }

  return assigned;
}

export function buildPlayerUltComparisons(
  ourPlayerUltCounts: Map<string, PlayerUltSummary>,
  oppPlayerUltCounts: Map<string, PlayerUltSummary>
): PlayerUltComparison[] {
  const ourBySubrole = assignPlayersToSubroles(ourPlayerUltCounts);
  const oppBySubrole = assignPlayersToSubroles(oppPlayerUltCounts);

  const comparisons: PlayerUltComparison[] = [];
  for (const subrole of SUBROLE_ORDER) {
    const ours = ourBySubrole.get(subrole);
    const theirs = oppBySubrole.get(subrole);
    if (!ours && !theirs) continue;

    comparisons.push({
      subrole: SUBROLE_DISPLAY_NAMES[subrole],
      ourPlayerName: ours?.playerName ?? "",
      ourHero: ours?.primaryHero ?? "",
      ourUltCount: ours?.ultCount ?? 0,
      opponentPlayerName: theirs?.playerName ?? "",
      opponentHero: theirs?.primaryHero ?? "",
      opponentUltCount: theirs?.ultCount ?? 0,
    });
  }

  return comparisons;
}

function computeScrimSwapAnalysis(
  allHeroSwaps: SwapRecord[],
  allRoundStarts: { match_time: number; MapDataId: number | null }[],
  allMatchEnds: { match_time: number; MapDataId: number | null }[],
  mapIds: number[],
  ourTeamNameByMap: Map<number, string>,
  mapResults: MapResult[]
): ScrimSwapAnalysis {
  if (allHeroSwaps.length === 0) return emptySwapAnalysis();

  const roundStartsByMap = new Map<number, number[]>();
  for (const rs of allRoundStarts) {
    if (!rs.MapDataId) continue;
    const existing = roundStartsByMap.get(rs.MapDataId) ?? [];
    existing.push(rs.match_time);
    roundStartsByMap.set(rs.MapDataId, existing);
  }

  const ourSwapsByMap = new Map<number, SwapRecord[]>();
  const opponentSwapsByMap = new Map<number, SwapRecord[]>();

  for (const swap of allHeroSwaps) {
    if (!swap.MapDataId) continue;
    const ourTeam = ourTeamNameByMap.get(swap.MapDataId);
    if (!ourTeam) continue;

    if (swap.player_team === ourTeam) {
      const existing = ourSwapsByMap.get(swap.MapDataId) ?? [];
      existing.push(swap);
      ourSwapsByMap.set(swap.MapDataId, existing);
    } else {
      const existing = opponentSwapsByMap.get(swap.MapDataId) ?? [];
      existing.push(swap);
      opponentSwapsByMap.set(swap.MapDataId, existing);
    }
  }

  const filteredOurByMap = new Map<number, SwapRecord[]>();
  for (const [mapId, swaps] of ourSwapsByMap) {
    const rsTimesForMap = roundStartsByMap.get(mapId) ?? [];
    const filtered = filterUtilityRoundStartSwaps(swaps, rsTimesForMap);
    if (filtered.length > 0) filteredOurByMap.set(mapId, filtered);
  }

  const filteredOppByMap = new Map<number, SwapRecord[]>();
  for (const [mapId, swaps] of opponentSwapsByMap) {
    const rsTimesForMap = roundStartsByMap.get(mapId) ?? [];
    const filtered = filterUtilityRoundStartSwaps(swaps, rsTimesForMap);
    if (filtered.length > 0) filteredOppByMap.set(mapId, filtered);
  }

  const allOurSwaps: SwapRecord[] = [];
  for (const swaps of filteredOurByMap.values()) allOurSwaps.push(...swaps);
  const allOppSwaps: SwapRecord[] = [];
  for (const swaps of filteredOppByMap.values()) allOppSwaps.push(...swaps);

  const mapCount = mapIds.length;
  const ourSwaps = allOurSwaps.length;
  const opponentSwaps = allOppSwaps.length;
  const mapsWithOurSwaps = filteredOurByMap.size;
  const mapsWithoutOurSwaps = mapCount - mapsWithOurSwaps;

  const mapResultLookup = new Map<number, MapResult>();
  for (const mr of mapResults) mapResultLookup.set(mr.mapId, mr);

  let noSwapWins = 0;
  let noSwapLosses = 0;
  let swapWins = 0;
  let swapLosses = 0;

  for (const mapId of mapIds) {
    const result = mapResultLookup.get(mapId);
    if (!result || result.winner === "draw") continue;
    const hasSwaps = filteredOurByMap.has(mapId);
    const isWin = result.winner === "our_team";

    if (hasSwaps) {
      if (isWin) swapWins++;
      else swapLosses++;
    } else {
      if (isWin) noSwapWins++;
      else noSwapLosses++;
    }
  }

  const noSwapTotal = noSwapWins + noSwapLosses;
  const swapTotal = swapWins + swapLosses;

  let totalHeroTimeBeforeSwap = 0;
  for (const swap of allOurSwaps)
    totalHeroTimeBeforeSwap += swap.hero_time_played;

  function findTopSwap(swaps: SwapRecord[]) {
    const counts = new Map<
      string,
      { from: string; to: string; count: number }
    >();
    for (const swap of swaps) {
      const key = `${swap.previous_hero}->${swap.player_hero}`;
      const existing = counts.get(key);
      if (existing) existing.count++;
      else
        counts.set(key, {
          from: swap.previous_hero,
          to: swap.player_hero,
          count: 1,
        });
    }
    let best: { from: string; to: string; count: number } | null = null;
    for (const entry of counts.values()) {
      if (!best || entry.count > best.count) best = entry;
    }
    return best;
  }

  const playerSwapCounts = new Map<
    string,
    { count: number; maps: Set<number> }
  >();
  for (const swap of allOurSwaps) {
    if (!swap.MapDataId) continue;
    const entry = playerSwapCounts.get(swap.player_name) ?? {
      count: 0,
      maps: new Set(),
    };
    entry.count++;
    entry.maps.add(swap.MapDataId);
    playerSwapCounts.set(swap.player_name, entry);
  }

  let topSwapper: ScrimSwapAnalysis["topSwapper"] = null;
  for (const [playerName, entry] of playerSwapCounts) {
    if (!topSwapper || entry.count > topSwapper.count) {
      topSwapper = {
        playerName,
        count: entry.count,
        mapsCount: entry.maps.size,
      };
    }
  }

  const swapCountByMap = new Map<number, number>();
  for (const mapId of mapIds) {
    swapCountByMap.set(mapId, filteredOurByMap.get(mapId)?.length ?? 0);
  }

  const countBuckets: { label: string; min: number; max: number }[] = [
    { label: "0 swaps", min: 0, max: 0 },
    { label: "1 swap", min: 1, max: 1 },
    { label: "2 swaps", min: 2, max: 2 },
    { label: "3+ swaps", min: 3, max: Infinity },
  ];

  const winrateBySwapCount: SwapWinrateBucket[] = countBuckets.map((bucket) => {
    let wins = 0;
    let losses = 0;

    for (const mapId of mapIds) {
      const result = mapResultLookup.get(mapId);
      if (!result || result.winner === "draw") continue;
      const count = swapCountByMap.get(mapId) ?? 0;
      if (count >= bucket.min && count <= bucket.max) {
        if (result.winner === "our_team") wins++;
        else losses++;
      }
    }

    const total = wins + losses;
    return {
      label: bucket.label,
      wins,
      losses,
      winrate: total > 0 ? (wins / total) * 100 : 0,
      totalMaps: total,
    };
  });

  const matchEndTimeMap = new Map<number, number>();
  for (const me of allMatchEnds) {
    if (me.MapDataId) {
      const existing = matchEndTimeMap.get(me.MapDataId);
      if (!existing || me.match_time > existing) {
        matchEndTimeMap.set(me.MapDataId, me.match_time);
      }
    }
  }

  const timingLabels = ["Early (0-33%)", "Mid (33-66%)", "Late (66-100%)"];
  const timingMapSets: { wins: Set<number>; losses: Set<number> }[] = [
    { wins: new Set(), losses: new Set() },
    { wins: new Set(), losses: new Set() },
    { wins: new Set(), losses: new Set() },
  ];

  for (const swap of allOurSwaps) {
    if (!swap.MapDataId) continue;
    const totalTime = matchEndTimeMap.get(swap.MapDataId);
    if (!totalTime || totalTime <= 0) continue;

    const pct = (swap.match_time / totalTime) * 100;
    let timingIndex: number;
    if (pct < 33.33) timingIndex = 0;
    else if (pct < 66.67) timingIndex = 1;
    else timingIndex = 2;

    const result = mapResultLookup.get(swap.MapDataId);
    if (!result || result.winner === "draw") continue;

    if (result.winner === "our_team") {
      timingMapSets[timingIndex].wins.add(swap.MapDataId);
    } else {
      timingMapSets[timingIndex].losses.add(swap.MapDataId);
    }
  }

  const timingOutcomes: SwapTimingOutcome[] = timingLabels.map((label, i) => {
    const wins = timingMapSets[i].wins.size;
    const losses = timingMapSets[i].losses.size;
    const total = wins + losses;
    return {
      label,
      wins,
      losses,
      winrate: total > 0 ? (wins / total) * 100 : 0,
      totalMaps: total,
    };
  });

  return {
    ourSwaps,
    opponentSwaps,
    ourSwapsPerMap: mapCount > 0 ? ourSwaps / mapCount : 0,
    opponentSwapsPerMap: mapCount > 0 ? opponentSwaps / mapCount : 0,
    mapsWithOurSwaps,
    mapsWithoutOurSwaps,
    noSwapWinrate: noSwapTotal > 0 ? (noSwapWins / noSwapTotal) * 100 : 0,
    noSwapWins,
    noSwapLosses,
    swapWinrate: swapTotal > 0 ? (swapWins / swapTotal) * 100 : 0,
    swapWins,
    swapLosses,
    avgHeroTimeBeforeSwap:
      ourSwaps > 0 ? totalHeroTimeBeforeSwap / ourSwaps : 0,
    ourTopSwap: findTopSwap(allOurSwaps),
    opponentTopSwap: findTopSwap(allOppSwaps),
    topSwapper,
    winrateBySwapCount,
    timingOutcomes,
  };
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
    payloadProgressRows,
    pointProgressRows,
    allKills,
    allRezzes,
    allUltimates,
    allHeroSwaps,
    allRoundStarts,
    allMatchEnds,
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
      orderBy: [{ round_number: "asc" }, { match_time: "asc" }],
    }),
    prisma.payloadProgress.findMany({
      where: { MapDataId: { in: mapIds } },
      orderBy: [
        { round_number: "asc" },
        { objective_index: "asc" },
        { match_time: "asc" },
      ],
    }),
    prisma.pointProgress.findMany({
      where: { MapDataId: { in: mapIds } },
      orderBy: [
        { round_number: "asc" },
        { objective_index: "asc" },
        { match_time: "asc" },
      ],
    }),
    prisma.kill.findMany({
      where: { MapDataId: { in: mapIds } },
      orderBy: { match_time: "asc" },
    }),
    prisma.mercyRez.findMany({
      where: { MapDataId: { in: mapIds } },
    }),
    prisma.ultimateStart.findMany({
      where: { MapDataId: { in: mapIds } },
      orderBy: { match_time: "asc" },
    }),
    prisma.heroSwap.findMany({
      where: {
        MapDataId: { in: mapIds },
        match_time: { not: 0 },
      },
      select: {
        id: true,
        match_time: true,
        player_team: true,
        player_name: true,
        player_hero: true,
        previous_hero: true,
        hero_time_played: true,
        MapDataId: true,
      },
      orderBy: { match_time: "asc" },
    }),
    prisma.roundStart.findMany({
      where: { MapDataId: { in: mapIds } },
      select: { match_time: true, MapDataId: true },
    }),
    prisma.matchEnd.findMany({
      where: { MapDataId: { in: mapIds } },
      select: { match_time: true, MapDataId: true },
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

  const payloadProgressByMapAndTeam = new Map<
    number,
    Map<string, typeof payloadProgressRows>
  >();
  for (const progressRow of payloadProgressRows) {
    if (!progressRow.MapDataId) continue;
    if (!payloadProgressByMapAndTeam.has(progressRow.MapDataId)) {
      payloadProgressByMapAndTeam.set(
        progressRow.MapDataId,
        new Map<string, typeof payloadProgressRows>()
      );
    }
    const mapProgressRows = payloadProgressByMapAndTeam.get(
      progressRow.MapDataId
    )!;
    if (!mapProgressRows.has(progressRow.capturing_team)) {
      mapProgressRows.set(progressRow.capturing_team, []);
    }
    mapProgressRows.get(progressRow.capturing_team)!.push(progressRow);
  }

  const pointProgressByMapAndTeam = new Map<
    number,
    Map<string, typeof pointProgressRows>
  >();
  for (const progressRow of pointProgressRows) {
    if (!progressRow.MapDataId) continue;
    if (!pointProgressByMapAndTeam.has(progressRow.MapDataId)) {
      pointProgressByMapAndTeam.set(
        progressRow.MapDataId,
        new Map<string, typeof pointProgressRows>()
      );
    }
    const mapProgressRows = pointProgressByMapAndTeam.get(
      progressRow.MapDataId
    )!;
    if (!mapProgressRows.has(progressRow.capturing_team)) {
      mapProgressRows.set(progressRow.capturing_team, []);
    }
    mapProgressRows.get(progressRow.capturing_team)!.push(progressRow);
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

  // Build a separate fight map that includes ults in the event stream,
  // so fight windows expand to cover ultimates used outside kill activity.
  // This ensures the timing chart counts all ults, not just those near kills.
  const fightsByMapWithUlts = new Map<number, Fight[]>();
  for (const mapId of mapIds) {
    const kills = killsByMap.get(mapId) ?? [];
    const mapUlts = allUltimates.filter((u) => u.MapDataId === mapId);
    const merged: Kill[] = [
      ...kills,
      ...mapUlts.map(
        (ult): Kill => ({
          id: ult.id,
          scrimId: ult.scrimId,
          event_type: "ultimate_start" as Kill["event_type"],
          match_time: ult.match_time,
          attacker_team: ult.player_team,
          attacker_name: ult.player_name,
          attacker_hero: ult.player_hero,
          victim_team: "",
          victim_name: "",
          victim_hero: "",
          event_ability: "Ultimate",
          event_damage: 0,
          is_critical_hit: "0",
          is_environmental: "0",
          MapDataId: ult.MapDataId,
        })
      ),
    ];
    merged.sort((a, b) => a.match_time - b.match_time);
    fightsByMapWithUlts.set(mapId, groupEventsIntoFights(merged));
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

  const fightAnalysis = computeScrimFightAnalysis(
    mapIds,
    killsByMap,
    allUltimates,
    ourTeamNameByMap
  );

  const ultAnalysis = computeScrimUltAnalysis(
    allUltimates,
    fightsByMapWithUlts,
    ourTeamNameByMap,
    calculatedStats,
    scrimPlayers
  );

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
    const mapPayloadProgress = payloadProgressByMapAndTeam.get(map.id);
    const team1PayloadProgress = matchStart?.team_1_name
      ? (mapPayloadProgress?.get(matchStart.team_1_name) ?? [])
      : [];
    const team2PayloadProgress = matchStart?.team_2_name
      ? (mapPayloadProgress?.get(matchStart.team_2_name) ?? [])
      : [];
    const mapPointProgress = pointProgressByMapAndTeam.get(map.id);
    const team1PointProgress = matchStart?.team_1_name
      ? (mapPointProgress?.get(matchStart.team_1_name) ?? [])
      : [];
    const team2PointProgress = matchStart?.team_2_name
      ? (mapPointProgress?.get(matchStart.team_2_name) ?? [])
      : [];

    const winnerName = calculateWinner({
      matchDetails: matchStart,
      finalRound,
      team1Captures: team1Caps,
      team2Captures: team2Caps,
      team1PayloadProgress,
      team2PayloadProgress,
      team1PointProgress,
      team2PointProgress,
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

  const firstMapId = mapIds[0];
  const firstOurTeamName = ourTeamNameByMap.get(firstMapId) ?? "";
  const firstMatchStart = matchStartByMapId.get(firstMapId);
  const opponentTeamName =
    firstMatchStart?.team_1_name === firstOurTeamName
      ? (firstMatchStart?.team_2_name ?? "Opponent")
      : (firstMatchStart?.team_1_name ?? "Opponent");

  const swapAnalysis = computeScrimSwapAnalysis(
    allHeroSwaps as SwapRecord[],
    allRoundStarts,
    allMatchEnds,
    mapIds,
    ourTeamNameByMap,
    mapResults
  );

  return {
    mapCount: maps.length,
    wins,
    losses,
    draws,
    ourTeamName: firstOurTeamName,
    opponentTeamName,
    mapResults,
    teamPlayers,
    insights,
    teamTotals,
    fightAnalysis,
    ultAnalysis,
    swapAnalysis,
  };
}

export const getScrimOverview = cache(getScrimOverviewFn);
