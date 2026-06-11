import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

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

export const getLandingPageStats = unstable_cache(
  async () => {
    const results = await Promise.allSettled([
      prisma.playerStat.count(),
      prisma.calculatedStat.count(),
      prisma.kill.count(),
      prisma.map.count(),
      prisma.team.count(),
    ]);

    const [
      playerStatCount,
      calculatedStatCount,
      killCount,
      mapCount,
      teamCount,
    ] = results.map((r) => (r.status === "fulfilled" ? r.value : 0));

    // Use known floor values if a query fails, so the landing page
    // never shows "0+" for a stat that clearly isn't zero.
    return {
      statsCount: Math.max(playerStatCount + calculatedStatCount, 800_000),
      killCount: Math.max(killCount, 450_000),
      mapCount: Math.max(mapCount, 6_000),
      teamCount: Math.max(teamCount, 10),
    };
  },
  ["landing-page-stats"],
  { revalidate: 3600 }
);
