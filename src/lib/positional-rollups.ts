import { SPATIAL_STAT_TYPES } from "@/lib/spatial-stats";
import { ULT_STAT_TYPES } from "@/lib/ult-quality";
import { round } from "@/lib/utils";

/** Team rollups aggregate over the team's most recent N scrims. */
export const E_TEAM_SCRIM_WINDOW = 10;

export const POSITIONAL_STAT_TYPES = [
  ...SPATIAL_STAT_TYPES,
  ...ULT_STAT_TYPES,
] as const;

export type StatRow = { playerName: string; stat: string; value: number };
export type TrendRow = {
  stat: string;
  value: number;
  scrimId: number;
  scrimDate: Date;
};

/** Mean per (player, stat). Absent combinations stay absent — never 0. */
export function aggregateStatsByPlayer(
  rows: StatRow[]
): Map<string, Map<string, number>> {
  const sums = new Map<string, Map<string, { total: number; n: number }>>();
  for (const row of rows) {
    const perStat = sums.get(row.playerName) ?? new Map();
    const acc = perStat.get(row.stat) ?? { total: 0, n: 0 };
    acc.total += row.value;
    acc.n += 1;
    perStat.set(row.stat, acc);
    sums.set(row.playerName, perStat);
  }
  const out = new Map<string, Map<string, number>>();
  for (const [player, perStat] of sums) {
    const averaged = new Map<string, number>();
    for (const [stat, { total, n }] of perStat) {
      averaged.set(stat, round(total / n));
    }
    out.set(player, averaged);
  }
  return out;
}

/** Per stat: per-scrim mean, ordered by scrim date ascending. */
export function buildStatTrends(
  rows: TrendRow[]
): Map<string, { scrimId: number; date: Date; value: number }[]> {
  const byStat = new Map<
    string,
    Map<number, { date: Date; total: number; n: number }>
  >();
  for (const row of rows) {
    const perScrim = byStat.get(row.stat) ?? new Map();
    const acc = perScrim.get(row.scrimId) ?? {
      date: row.scrimDate,
      total: 0,
      n: 0,
    };
    acc.total += row.value;
    acc.n += 1;
    perScrim.set(row.scrimId, acc);
    byStat.set(row.stat, perScrim);
  }
  const out = new Map<
    string,
    { scrimId: number; date: Date; value: number }[]
  >();
  for (const [stat, perScrim] of byStat) {
    out.set(
      stat,
      Array.from(perScrim, ([scrimId, { date, total, n }]) => ({
        scrimId,
        date,
        value: round(total / n),
      })).sort((a, b) => a.date.getTime() - b.date.getTime())
    );
  }
  return out;
}
