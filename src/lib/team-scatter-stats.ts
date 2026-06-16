import { determineRole } from "@/lib/player-table-data";
import type { HeroName, RoleName } from "@/types/heroes";

export const SCATTER_STAT_KEYS = [
  "eliminations",
  "final_blows",
  "deaths",
  "hero_damage_dealt",
  "healing_dealt",
  "healing_received",
  "self_healing",
  "damage_taken",
  "damage_blocked",
  "ultimates_earned",
  "ultimates_used",
  "solo_kills",
  "environmental_kills",
] as const;

/** Numeric PlayerStat fields a user can place on an axis. */
export type ScatterStatKey = (typeof SCATTER_STAT_KEYS)[number];

/** i18n key (under `teamStatsPage.charts.stats`) for each axis stat. */
export const SCATTER_STAT_LABEL_KEYS: Record<ScatterStatKey, string> = {
  eliminations: "eliminations",
  final_blows: "finalBlows",
  deaths: "deaths",
  hero_damage_dealt: "heroDamage",
  healing_dealt: "healingDealt",
  healing_received: "healingReceived",
  self_healing: "selfHealing",
  damage_taken: "damageTaken",
  damage_blocked: "damageBlocked",
  ultimates_earned: "ultimatesEarned",
  ultimates_used: "ultimatesUsed",
  solo_kills: "soloKills",
  environmental_kills: "environmentalKills",
};

export type PlayerScatterBucket = {
  hero: HeroName;
  timePlayed: number;
} & Record<ScatterStatKey, number>;

export type PlayerScatterStats = {
  playerName: string;
  primaryRole: RoleName;
  buckets: PlayerScatterBucket[];
};

export type ScatterPoint = {
  playerName: string;
  primaryRole: RoleName;
  x: number;
  y: number;
};

/** `determineRole` can return "Flex"; the scatter only labels by the 3 roles. */
export function toRoleName(hero: HeroName): RoleName {
  const role = determineRole(hero);
  return role === "Tank" || role === "Support" ? role : "Damage";
}

/**
 * For each player, sum the buckets for the selected heroes (empty selection =
 * all heroes), normalize both stats to per-10-min, and emit a point. Players
 * with zero selected playtime are dropped.
 */
export function computeScatterPoints(
  data: PlayerScatterStats[],
  xStat: ScatterStatKey,
  yStat: ScatterStatKey,
  selectedHeroes: HeroName[]
): ScatterPoint[] {
  const heroSet = selectedHeroes.length > 0 ? new Set(selectedHeroes) : null;
  const points: ScatterPoint[] = [];

  for (const player of data) {
    let time = 0;
    let xSum = 0;
    let ySum = 0;
    for (const b of player.buckets) {
      if (heroSet && !heroSet.has(b.hero)) continue;
      time += b.timePlayed;
      xSum += b[xStat];
      ySum += b[yStat];
    }
    if (time <= 0) continue;
    const mins = time / 60;
    points.push({
      playerName: player.playerName,
      primaryRole: player.primaryRole,
      x: (xSum / mins) * 10,
      y: (ySum / mins) * 10,
    });
  }

  return points;
}

export type Correlation = { slope: number; intercept: number; r: number };

/**
 * Least-squares fit + Pearson r over the points. Returns null when there are
 * fewer than 2 points or x has no variance (no defined slope).
 */
export function computeCorrelation(
  points: { x: number; y: number }[]
): Correlation | null {
  const n = points.length;
  if (n < 2) return null;

  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sx2 = 0;
  let sy2 = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxy += p.x * p.y;
    sx2 += p.x * p.x;
    sy2 += p.y * p.y;
  }

  const denomX = n * sx2 - sx * sx;
  const denomY = n * sy2 - sy * sy;
  if (denomX === 0 || denomY === 0) return null;

  const slope = (n * sxy - sx * sy) / denomX;
  const intercept = (sy - slope * sx) / n;
  const r = (n * sxy - sx * sy) / Math.sqrt(denomX * denomY);

  return { slope, intercept, r };
}
