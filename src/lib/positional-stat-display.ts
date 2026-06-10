/**
 * Client-safe display helpers for the 8 positional rollup stats.
 *
 * The value formatters mirror the units used by `STAT_CONFIGS` in
 * `@/components/profile/stat-fluctuation-cards` (m / % / % / m / count / % /
 * m / %). Kept here so client components can format positional values without
 * importing from a server-only data barrel.
 */

export const POSITIONAL_STAT_KEYS = [
  "AVERAGE_ENGAGEMENT_DISTANCE",
  "HIGH_GROUND_KILL_PERCENTAGE",
  "ISOLATION_DEATH_PERCENTAGE",
  "AVERAGE_FIGHT_START_SPREAD",
  "AVERAGE_ULT_CONVERSION_KILLS",
  "ULT_DEATH_PERCENTAGE",
  "AVERAGE_ULT_DISPLACEMENT",
  "ULTS_ON_OBJECTIVE_PERCENTAGE",
] as const;

export type PositionalStatKey = (typeof POSITIONAL_STAT_KEYS)[number];

function meters(value: number): string {
  return `${value.toFixed(1)}m`;
}
function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}
function count(value: number): string {
  return value.toFixed(2);
}

export const POSITIONAL_STAT_FORMATTERS: Record<
  PositionalStatKey,
  (value: number) => string
> = {
  AVERAGE_ENGAGEMENT_DISTANCE: meters,
  HIGH_GROUND_KILL_PERCENTAGE: percent,
  ISOLATION_DEATH_PERCENTAGE: percent,
  AVERAGE_FIGHT_START_SPREAD: meters,
  AVERAGE_ULT_CONVERSION_KILLS: count,
  ULT_DEATH_PERCENTAGE: percent,
  AVERAGE_ULT_DISPLACEMENT: meters,
  ULTS_ON_OBJECTIVE_PERCENTAGE: percent,
};
