import "server-only";

import prisma from "@/lib/prisma";
import type { TargetStatKey } from "@/lib/target-stats";
import { removeDuplicateRows, toMins } from "@/lib/utils";
import type { PlayerStat, PlayerTarget } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { cache } from "react";

export async function getPlayerTargets(teamId: number, playerName: string) {
  return prisma.playerTarget.findMany({
    where: { teamId, playerName: { equals: playerName, mode: "insensitive" } },
    include: { creator: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTeamTargets(teamId: number) {
  const targets = await prisma.playerTarget.findMany({
    where: { teamId },
    include: { creator: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const grouped: Record<string, typeof targets> = {};
  for (const target of targets) {
    if (!grouped[target.playerName]) {
      grouped[target.playerName] = [];
    }
    grouped[target.playerName].push(target);
  }
  return grouped;
}

export type ScrimStatPoint = {
  scrimId: number;
  scrimDate: string;
  scrimName: string;
  stats: Record<string, number>;
};

async function getRecentScrimStatsFn(
  playerName: string,
  teamId: number,
  scrimCount: number
): Promise<ScrimStatPoint[]> {
  // 1. Find the last N scrims for the team
  const recentScrims = await prisma.scrim.findMany({
    where: { teamId },
    orderBy: { date: "desc" },
    take: scrimCount,
    select: {
      id: true,
      date: true,
      name: true,
      maps: {
        select: {
          id: true,
          mapData: { select: { id: true } },
        },
      },
    },
  });

  if (recentScrims.length === 0) return [];

  // 2. Get MapData IDs from those scrims
  const mapIds = recentScrims.flatMap((s) =>
    s.maps.flatMap((m) => m.mapData.map((md) => md.id))
  );
  if (mapIds.length === 0) return [];

  // 3. Get final-round PlayerStat rows for this player across those maps
  const stats = removeDuplicateRows(
    await prisma.$queryRaw<PlayerStat[]>`
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
          AND ps."player_name" ILIKE ${playerName}`
  );

  // 4. Aggregate per scrim: sum stat values, compute per-10
  const results: ScrimStatPoint[] = [];
  for (const scrim of recentScrims) {
    const scrimMapIds = new Set(
      scrim.maps.flatMap((m) => m.mapData.map((md) => md.id))
    );
    const scrimStats = stats.filter((s) => scrimMapIds.has(s.MapDataId!));

    if (scrimStats.length === 0) continue;

    const totalTime = scrimStats.reduce(
      (sum, s) => sum + s.hero_time_played,
      0
    );
    const timeMins = toMins(totalTime);
    if (timeMins <= 0) continue;

    const statKeys: TargetStatKey[] = [
      "eliminations",
      "deaths",
      "hero_damage_dealt",
      "damage_taken",
      "damage_blocked",
      "final_blows",
      "healing_dealt",
      "ultimates_earned",
    ];

    const per10Stats: Record<string, number> = {};
    for (const key of statKeys) {
      const total = scrimStats.reduce(
        (sum, s) => sum + (Number(s[key]) || 0),
        0
      );
      per10Stats[key] = (total / timeMins) * 10;
    }

    results.push({
      scrimId: scrim.id,
      scrimDate: scrim.date.toISOString(),
      scrimName: scrim.name,
      stats: per10Stats,
    });
  }

  // Sort chronologically (oldest first)
  return results.sort(
    (a, b) => new Date(a.scrimDate).getTime() - new Date(b.scrimDate).getTime()
  );
}

export const getRecentScrimStats = cache(getRecentScrimStatsFn);

export type TargetProgress = {
  target: PlayerTarget & {
    creator: { name: string | null; email: string };
  };
  currentValue: number;
  progressPercent: number;
  trending: "toward" | "away" | "neutral";
};

export function calculateTargetProgress(
  target: PlayerTarget,
  recentStats: ScrimStatPoint[]
): Omit<TargetProgress, "target"> {
  if (recentStats.length === 0) {
    return {
      currentValue: target.baselineValue,
      progressPercent: 0,
      trending: "neutral",
    };
  }

  // Calculate current average per-10 for the stat
  const values = recentStats
    .map((s) => s.stats[target.stat])
    .filter((v) => v !== undefined && isFinite(v));

  if (values.length === 0) {
    return {
      currentValue: target.baselineValue,
      progressPercent: 0,
      trending: "neutral",
    };
  }

  const currentValue = values.reduce((a, b) => a + b, 0) / values.length;

  // Calculate target value
  const multiplier =
    target.targetDirection === "increase"
      ? 1 + target.targetPercent / 100
      : 1 - target.targetPercent / 100;
  const targetValue = target.baselineValue * multiplier;

  // Calculate progress: how far from baseline toward target
  const totalDistance = targetValue - target.baselineValue;
  if (Math.abs(totalDistance) < 0.001) {
    return { currentValue, progressPercent: 100, trending: "neutral" };
  }

  const currentDistance = currentValue - target.baselineValue;
  const progressPercent = Math.min(
    100,
    Math.max(0, (currentDistance / totalDistance) * 100)
  );

  // Determine trend from last few data points
  let trending: "toward" | "away" | "neutral" = "neutral";
  if (values.length >= 2) {
    const recentHalf = values.slice(Math.floor(values.length / 2));
    const earlierHalf = values.slice(0, Math.floor(values.length / 2));
    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
    const earlierAvg =
      earlierHalf.reduce((a, b) => a + b, 0) / earlierHalf.length;

    const diff = recentAvg - earlierAvg;
    if (target.targetDirection === "increase") {
      trending = diff > 0 ? "toward" : diff < 0 ? "away" : "neutral";
    } else {
      trending = diff < 0 ? "toward" : diff > 0 ? "away" : "neutral";
    }
  }

  return { currentValue, progressPercent, trending };
}
