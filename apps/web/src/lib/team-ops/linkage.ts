export const LINKAGE_WINDOW_DAYS = 2;

export function isScrimRequestLinkable(input: {
  request: { fromTeamId: number; toTeamId: number; createdAt: Date };
  teamId: number;
  now: Date;
  windowDays?: number;
}): boolean {
  const { request, teamId, now } = input;
  const windowDays = input.windowDays ?? LINKAGE_WINDOW_DAYS;
  const involvesTeam =
    request.fromTeamId === teamId || request.toTeamId === teamId;
  if (!involvesTeam) return false;
  const ageMs = now.getTime() - request.createdAt.getTime();
  return ageMs >= 0 && ageMs <= windowDays * 24 * 3_600_000;
}
