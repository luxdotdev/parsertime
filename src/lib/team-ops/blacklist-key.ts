export function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function blacklistKey(input: {
  teamId: number | null;
  name: string;
}): string {
  return input.teamId != null
    ? `team:${input.teamId}`
    : `name:${normalizeTeamName(input.name)}`;
}
