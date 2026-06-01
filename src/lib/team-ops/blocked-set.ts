export type BlockEdge = {
  ownerTeamId: number;
  blockedTeamId: number | null;
};

/**
 * Given blacklist rows touching `searcherTeamId` on either side, return the set
 * of OTHER team ids that should be hidden from the searcher. Off-platform rows
 * (null blockedTeamId) contribute nothing.
 */
export function buildBlockedTeamIdSet(
  rows: BlockEdge[],
  searcherTeamId: number
): Set<number> {
  const ids = new Set<number>();
  for (const row of rows) {
    if (row.blockedTeamId == null) continue;
    if (row.ownerTeamId === searcherTeamId) ids.add(row.blockedTeamId);
    else if (row.blockedTeamId === searcherTeamId) ids.add(row.ownerTeamId);
  }
  return ids;
}
