import { heroRoleMapping, type HeroName } from "@/types/heroes";
import type { PlayerStat } from "@/generated/prisma/client";

type HeroRole = "Tank" | "Damage" | "Support";

type StatConfig = {
  column: keyof PlayerStat;
  weight: number;
  invert?: boolean;
};

export type TalentLeaderboardPlayer = {
  composite_sr: number;
  player_name: string;
  rank: number;
  percentile: string;
};

const ROLE_STAT_CONFIGS: Record<HeroRole, StatConfig[]> = {
  Damage: [
    { column: "eliminations", weight: 0.3 },
    { column: "final_blows", weight: 0.2 },
    { column: "deaths", weight: 0.2, invert: true },
    { column: "hero_damage_dealt", weight: 0.2 },
    { column: "solo_kills", weight: 0.1 },
  ],
  Tank: [
    { column: "eliminations", weight: 0.2 },
    { column: "final_blows", weight: 0.08 },
    { column: "deaths", weight: 0.3, invert: true },
    { column: "hero_damage_dealt", weight: 0.12 },
    { column: "damage_taken", weight: 0.12, invert: true },
    { column: "solo_kills", weight: 0.15 },
    { column: "ultimates_earned", weight: 0.03 },
  ],
  Support: [
    { column: "eliminations", weight: 0.1 },
    { column: "final_blows", weight: 0.05 },
    { column: "deaths", weight: 0.25, invert: true },
    { column: "hero_damage_dealt", weight: 0.14 },
    { column: "healing_dealt", weight: 0.35 },
    { column: "solo_kills", weight: 0.06 },
    { column: "ultimates_earned", weight: 0.05 },
  ],
};

const MERCY_STAT_CONFIG: StatConfig[] = [
  { column: "deaths", weight: 0.35, invert: true },
  { column: "hero_damage_dealt", weight: 0.25 },
  { column: "healing_dealt", weight: 0.35 },
  { column: "ultimates_earned", weight: 0.05 },
];

const NON_HEALING_SUPPORT_STAT_CONFIGS: StatConfig[] = [
  { column: "eliminations", weight: 0.1 },
  { column: "final_blows", weight: 0.05 },
  { column: "deaths", weight: 0.35, invert: true },
  { column: "hero_damage_dealt", weight: 0.34 },
  { column: "solo_kills", weight: 0.06 },
  { column: "ultimates_earned", weight: 0.11 },
];

type PlayerTotals = {
  player_name: string;
  per10: Map<keyof PlayerStat, number>;
};

function getStatConfigs(hero: HeroName): StatConfig[] {
  if (hero === "Mercy") return MERCY_STAT_CONFIG;
  if (hero === "Juno" || hero === "Wuyang") {
    return NON_HEALING_SUPPORT_STAT_CONFIGS;
  }

  return ROLE_STAT_CONFIGS[heroRoleMapping[hero] ?? "Damage"];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStandardDeviation(values: number[], avg: number): number {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function numericStat(row: PlayerStat, column: keyof PlayerStat): number {
  const value = row[column];
  return typeof value === "number" ? value : 0;
}

export function buildHeroTalentLeaderboard(
  stats: PlayerStat[],
  hero: HeroName,
  { minMaps = 10, minTimeSeconds = 60 } = {}
): TalentLeaderboardPlayer[] {
  const statConfigs = getStatConfigs(hero);
  const totalsByPlayer = new Map<string, PlayerStat[]>();
  const targetHero = hero.toLowerCase();

  for (const row of stats) {
    if (row.player_hero.toLowerCase() !== targetHero) continue;
    if (row.hero_time_played < 60) continue;

    const existing = totalsByPlayer.get(row.player_name) ?? [];
    existing.push(row);
    totalsByPlayer.set(row.player_name, existing);
  }

  const totals: PlayerTotals[] = [];

  for (const [player_name, rows] of totalsByPlayer) {
    const total_secs = rows.reduce((sum, row) => sum + row.hero_time_played, 0);

    if (rows.length < minMaps || total_secs < minTimeSeconds) continue;

    const per10 = new Map<keyof PlayerStat, number>();

    for (const stat of statConfigs) {
      const total = rows.reduce(
        (sum, row) => sum + numericStat(row, stat.column),
        0
      );
      per10.set(stat.column, (total / total_secs) * 600);
    }

    totals.push({
      player_name,
      per10,
    });
  }

  if (totals.length === 0) return [];

  const baselines = new Map<keyof PlayerStat, { avg: number; std: number }>();

  for (const stat of statConfigs) {
    const values = totals.map((player) => player.per10.get(stat.column) ?? 0);
    const avg = mean(values);
    baselines.set(stat.column, {
      avg,
      std: sampleStandardDeviation(values, avg),
    });
  }

  return totals
    .map((player) => {
      const compositeZScore = statConfigs.reduce((sum, stat) => {
        const baseline = baselines.get(stat.column);
        const value = player.per10.get(stat.column) ?? 0;
        const std = baseline?.std ?? 0;
        if (!baseline || std === 0) return sum;

        const z = stat.invert
          ? (baseline.avg - value) / std
          : (value - baseline.avg) / std;

        return sum + z * stat.weight;
      }, 0);

      return {
        player_name: player.player_name,
        composite_z_score: compositeZScore,
      };
    })
    .sort((a, b) => b.composite_z_score - a.composite_z_score)
    .map((player, index, players) => {
      const percentile =
        players.length <= 1
          ? 0
          : ((players.length - index - 1) / (players.length - 1)) * 100;
      const scaled =
        2500 +
        player.composite_z_score *
          (1250 / (1 + Math.abs(player.composite_z_score) / 3));

      return {
        composite_sr: Math.floor(Math.max(1, Math.min(5000, scaled))),
        player_name: player.player_name,
        rank: index + 1,
        percentile: percentile.toFixed(1),
      };
    });
}
