export type RoundEndScore = {
  roundNumber: number;
  team1Score: number;
  team2Score: number;
};

/**
 * Round winner = the team whose score increased at that round's RoundEnd
 * versus the previous round (baseline 0-0). Both or neither changing →
 * null. This is score-delta bookkeeping, not game-mode interpretation —
 * good enough for outcome COUNTS, which is all the UI claims.
 */
export function roundOutcomes(
  roundEnds: RoundEndScore[],
  team1Name: string,
  team2Name: string
): Map<number, string | null> {
  const byRound = new Map<number, RoundEndScore>();
  for (const r of roundEnds) byRound.set(r.roundNumber, r);
  const rounds = [...byRound.values()].sort(
    (a, b) => a.roundNumber - b.roundNumber
  );

  const outcomes = new Map<number, string | null>();
  let prev1 = 0;
  let prev2 = 0;
  for (const r of rounds) {
    const d1 = r.team1Score - prev1;
    const d2 = r.team2Score - prev2;
    if (d1 > 0 && d2 <= 0) outcomes.set(r.roundNumber, team1Name);
    else if (d2 > 0 && d1 <= 0) outcomes.set(r.roundNumber, team2Name);
    else outcomes.set(r.roundNumber, null);
    prev1 = r.team1Score;
    prev2 = r.team2Score;
  }
  return outcomes;
}
