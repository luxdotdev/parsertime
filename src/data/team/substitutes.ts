import prisma from "@/lib/prisma";

/**
 * Returns the set of `player_name` strings marked as substitutes for a team.
 *
 * Substitutes stay on the roster and remain individually trackable; this set is
 * used to exclude them from team-level aggregates (team totals, TSR) only.
 */
export async function getTeamSubstituteNames(
  teamId: number
): Promise<Set<string>> {
  const rows = await prisma.teamSubstitute.findMany({
    where: { teamId },
    select: { playerName: true },
  });
  return new Set(rows.map((r) => r.playerName));
}
