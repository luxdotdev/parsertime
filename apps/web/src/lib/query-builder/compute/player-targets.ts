import "server-only";

import { calculateTargetProgress } from "@/data/player/targets-service";
import prisma from "@/lib/prisma";
import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { TARGET_STATS, type TargetStatKey } from "@/lib/target-stats";
import { removeDuplicateRows } from "@/lib/utils";
import type { PlayerStat, PlayerTarget } from "@/generated/prisma/client";

type ScrimPoint = {
  scrimId: number;
  scrimDate: string;
  scrimName: string;
  stats: Record<string, number>;
};

type PlayerScrimTotals = {
  timePlayed: number;
} & Record<TargetStatKey, number>;

const TARGET_STAT_KEYS = TARGET_STATS.map((stat) => stat.key);

const STAT_LABELS = new Map(TARGET_STATS.map((stat) => [stat.key, stat]));

function emptyTotals(): PlayerScrimTotals {
  return {
    timePlayed: 0,
    eliminations: 0,
    deaths: 0,
    hero_damage_dealt: 0,
    damage_taken: 0,
    damage_blocked: 0,
    final_blows: 0,
    healing_dealt: 0,
    ultimates_earned: 0,
  };
}

function addStat(totals: PlayerScrimTotals, stat: PlayerStat) {
  totals.timePlayed += stat.hero_time_played;
  for (const key of TARGET_STAT_KEYS) {
    totals[key] += Number(stat[key]) || 0;
  }
}

function targetValue(target: PlayerTarget): number {
  const multiplier =
    target.targetDirection === "increase"
      ? 1 + target.targetPercent / 100
      : 1 - target.targetPercent / 100;
  return target.baselineValue * multiplier;
}

function targetGap(target: PlayerTarget, currentValue: number): number {
  const targetVal = targetValue(target);
  return target.targetDirection === "increase"
    ? targetVal - currentValue
    : currentValue - targetVal;
}

function statusFor(
  progressPercent: number,
  trending: "toward" | "away" | "neutral",
  sampleScrims: number
): string {
  if (sampleScrims === 0) return "no data";
  if (progressPercent >= 100) return "complete";
  if (trending === "toward") return "on track";
  if (trending === "away") return "off track";
  return "stalled";
}

function displayDirection(direction: string): string {
  return direction === "decrease" ? "decrease" : "increase";
}

/**
 * Queryable version of saved player-target progress. Each row is one target
 * with recent scoped per-10 stats, progress-to-target, and trend direction.
 */
export async function computePlayerTargets(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const targets = await prisma.playerTarget.findMany({
    where: { teamId },
    orderBy: { updatedAt: "desc" },
  });
  if (targets.length === 0 || scrimIds.length === 0) return [];

  const players = Array.from(
    new Set(targets.map((target) => target.playerName))
  );
  const playerByNormalized = new Map(
    players.map((player) => [player.toLowerCase(), player])
  );
  const scopedScrims = await prisma.scrim.findMany({
    where: { id: { in: scrimIds }, teamId },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      name: true,
      maps: {
        select: {
          mapData: { select: { id: true } },
        },
      },
    },
  });
  if (scopedScrims.length === 0) return [];

  const scrimByMap = new Map<number, (typeof scopedScrims)[number]>();
  for (const scrim of scopedScrims) {
    for (const map of scrim.maps) {
      for (const mapData of map.mapData) {
        scrimByMap.set(mapData.id, scrim);
      }
    }
  }

  const mapDataIds = Array.from(scrimByMap.keys());
  if (mapDataIds.length === 0) return [];

  const playerStats = removeDuplicateRows(
    await prisma.playerStat.findMany({
      where: {
        MapDataId: { in: mapDataIds },
        player_name: { in: players, mode: "insensitive" },
      },
    })
  );

  const maxTimeByMap = new Map<number, number>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    const maxTime = maxTimeByMap.get(stat.MapDataId) ?? 0;
    if (stat.match_time > maxTime)
      maxTimeByMap.set(stat.MapDataId, stat.match_time);
  }

  const totalsByPlayerScrim = new Map<string, PlayerScrimTotals>();
  for (const stat of playerStats) {
    if (stat.MapDataId == null) continue;
    if (stat.match_time !== maxTimeByMap.get(stat.MapDataId)) continue;
    const scrim = scrimByMap.get(stat.MapDataId);
    if (!scrim) continue;
    const player = playerByNormalized.get(stat.player_name.toLowerCase());
    if (!player) continue;
    const key = `${player}\0${scrim.id}`;
    const totals = totalsByPlayerScrim.get(key) ?? emptyTotals();
    addStat(totals, stat);
    totalsByPlayerScrim.set(key, totals);
  }

  const pointsByPlayer = new Map<string, ScrimPoint[]>();
  for (const scrim of scopedScrims) {
    for (const player of players) {
      const totals = totalsByPlayerScrim.get(`${player}\0${scrim.id}`);
      if (!totals || totals.timePlayed <= 0) continue;
      const stats: Record<string, number> = {};
      for (const key of TARGET_STAT_KEYS) {
        stats[key] = (totals[key] / totals.timePlayed) * 600;
      }
      const points = pointsByPlayer.get(player) ?? [];
      points.push({
        scrimId: scrim.id,
        scrimDate: scrim.date.toISOString(),
        scrimName: scrim.name,
        stats,
      });
      pointsByPlayer.set(player, points);
    }
  }

  for (const points of pointsByPlayer.values()) {
    points.sort(
      (a, b) =>
        new Date(a.scrimDate).getTime() - new Date(b.scrimDate).getTime()
    );
  }

  return targets.flatMap((target) => {
    if (!STAT_LABELS.has(target.stat as TargetStatKey)) return [];
    const statKey = target.stat as TargetStatKey;
    const statConfig = STAT_LABELS.get(statKey)!;
    const points =
      pointsByPlayer.get(target.playerName)?.slice(-target.scrimWindow) ?? [];
    const progress = calculateTargetProgress(target, points);
    const targetVal = targetValue(target);
    const gap = targetGap(target, progress.currentValue);
    return [
      {
        target_id: target.id,
        player: target.playerName,
        stat: statConfig.displayName,
        stat_key: statKey,
        direction: displayDirection(target.targetDirection),
        trending: progress.trending,
        status: statusFor(
          progress.progressPercent,
          progress.trending,
          points.length
        ),
        current_value: progress.currentValue,
        baseline_value: target.baselineValue,
        target_value: targetVal,
        gap_to_target: gap,
        progress_percent: progress.progressPercent,
        target_percent: target.targetPercent,
        scrim_window: target.scrimWindow,
        sample_scrims: points.length,
        note: target.note ?? "",
      },
    ];
  });
}
