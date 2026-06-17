export type SetWinnerOutcome = { ok: true } | { ok: false; error: string };

/**
 * Decide whether a requested winner is a legal choice for a scrim map.
 * Scrim maps never draw, so the winner must be exactly one of the two teams.
 */
export function resolveSetWinnerOutcome(
  winner: string,
  teams: { team1: string; team2: string }
): SetWinnerOutcome {
  if (!teams.team1 || !teams.team2) {
    return { ok: false, error: "Map teams are not available yet" };
  }
  if (winner !== teams.team1 && winner !== teams.team2) {
    return {
      ok: false,
      error: "Winner must be one of the two teams on this map",
    };
  }
  return { ok: true };
}
