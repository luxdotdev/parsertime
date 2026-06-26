import { getApproximateCounts } from "@/lib/approximate-count";
import prisma from "@/lib/prisma";
import { cacheLife } from "next/cache";

/**
 * Rounds a count down to a "nice" number for display.
 */
export function roundCount(count: number): { value: number; suffix: string } {
  if (count >= 100_000) {
    const rounded = Math.floor(count / 10_000) * 10_000;
    return { value: rounded, suffix: "+" };
  }
  if (count >= 10_000) {
    const rounded = Math.floor(count / 5_000) * 5_000;
    return { value: rounded, suffix: "+" };
  }
  if (count >= 1_000) {
    const rounded = Math.floor(count / 500) * 500;
    return { value: rounded, suffix: "+" };
  }
  return { value: count, suffix: "+" };
}

export async function getLandingPageStats() {
  "use cache";
  cacheLife("hours");

  // Large tables use approximate counts (pg_class.reltuples) to avoid a full
  // sequential scan per cache refresh; Team is small, so an exact count is fine.
  const [approx, teamResult] = await Promise.allSettled([
    getApproximateCounts(["PlayerStat", "CalculatedStat", "Kill", "Map"]),
    prisma.team.count(),
  ]);

  const counts =
    approx.status === "fulfilled"
      ? approx.value
      : { PlayerStat: 0, CalculatedStat: 0, Kill: 0, Map: 0 };
  const teamCount = teamResult.status === "fulfilled" ? teamResult.value : 0;

  // Use known floor values if a query fails, so the landing page
  // never shows "0+" for a stat that clearly isn't zero.
  return {
    statsCount: Math.max(counts.PlayerStat + counts.CalculatedStat, 800_000),
    killCount: Math.max(counts.Kill, 450_000),
    mapCount: Math.max(counts.Map, 6_000),
    teamCount: Math.max(teamCount, 10),
  };
}
