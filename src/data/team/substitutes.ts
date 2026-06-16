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

/**
 * Of the given scrims, returns the ids in which a marked substitute played.
 *
 * Map-grained reads exclude substitute games at the map level (see
 * `findSubstituteMapIds`). Scrim-grained reads — positional stats and
 * artifacts — can only exclude at scrim granularity, since those tables don't
 * carry per-map lineups. A scrim a substitute appeared in is therefore dropped
 * wholesale, mirroring the map-level rule so no substitute game reaches any
 * team-stats aggregate.
 */
export async function getSubstituteScrimIds(
  teamId: number,
  scrimIds: number[]
): Promise<Set<number>> {
  const substituteNames = await getTeamSubstituteNames(teamId);
  if (substituteNames.size === 0 || scrimIds.length === 0) {
    return new Set<number>();
  }
  const rows = await prisma.playerStat.findMany({
    where: {
      scrimId: { in: scrimIds },
      player_name: { in: [...substituteNames] },
    },
    select: { scrimId: true },
    distinct: ["scrimId"],
  });
  return new Set(rows.map((r) => r.scrimId));
}
