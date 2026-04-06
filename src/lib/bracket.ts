export type RoundSpec = {
  roundNumber: number;
  roundName: string;
  matchCount: number;
};

export type MatchSpec = {
  roundNumber: number;
  bracketPosition: number;
  team1Seed: number | null;
  team2Seed: number | null;
};

export type BracketSpec = {
  rounds: RoundSpec[];
  matches: MatchSpec[];
};

export function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - roundNumber;
  switch (roundsFromEnd) {
    case 0:
      return "Grand Final";
    case 1:
      return "Semifinals";
    case 2:
      return "Quarterfinals";
    default:
      return `Round of ${Math.pow(2, roundsFromEnd + 1)}`;
  }
}

/**
 * Generate a single-elimination bracket for the given number of teams.
 * Handles byes for non-power-of-2 team counts by giving higher seeds byes.
 */
export function generateSingleEliminationBracket(
  teamCount: number
): BracketSpec {
  if (teamCount < 2) {
    throw new Error("Need at least 2 teams for a bracket");
  }

  const totalSlots = nextPowerOf2(teamCount);
  const totalRounds = Math.log2(totalSlots);
  const byeCount = totalSlots - teamCount;

  const rounds: RoundSpec[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = totalSlots / Math.pow(2, r);
    rounds.push({
      roundNumber: r,
      roundName: getRoundName(r, totalRounds),
      matchCount,
    });
  }

  // Build first round with seeding (1 vs N, 2 vs N-1, etc.)
  const firstRoundMatchCount = totalSlots / 2;
  const seedPairings = generateSeededPairings(totalSlots);

  const matches: MatchSpec[] = [];

  for (let i = 0; i < firstRoundMatchCount; i++) {
    const [seed1, seed2] = seedPairings[i];
    const team1Seed = seed1 <= teamCount ? seed1 : null;
    const team2Seed = seed2 <= teamCount ? seed2 : null;

    matches.push({
      roundNumber: 1,
      bracketPosition: i,
      team1Seed,
      team2Seed,
    });
  }

  // Later rounds have no seeded teams (filled by advancement)
  for (let r = 2; r <= totalRounds; r++) {
    const matchCount = totalSlots / Math.pow(2, r);
    for (let i = 0; i < matchCount; i++) {
      matches.push({
        roundNumber: r,
        bracketPosition: i,
        team1Seed: null,
        team2Seed: null,
      });
    }
  }

  return { rounds, matches };
}

/**
 * Generate standard seeded pairings for a bracket (1 vs N, 2 vs N-1, etc.)
 * arranged so the bracket unfolds correctly (top seeds on opposite sides).
 * Returns an array of [seed1, seed2] tuples in match order.
 */
function generateSeededPairings(totalSlots: number): [number, number][] {
  // Standard bracket ordering: recursively split so 1 and 2 are on opposite sides
  const order = bracketOrder(totalSlots);
  const pairings: [number, number][] = [];
  for (let i = 0; i < order.length; i += 2) {
    pairings.push([order[i], order[i + 1]]);
  }
  return pairings;
}

/**
 * Generate standard bracket seed ordering.
 * For a bracket of size N, produces the seed order such that
 * 1 vs N are on opposite ends, 2 vs N-1 on opposite ends, etc.
 */
function bracketOrder(n: number): number[] {
  if (n === 1) return [1];

  const half = n / 2;
  const previous = bracketOrder(half);

  const result: number[] = [];
  for (const seed of previous) {
    result.push(seed);
    result.push(n + 1 - seed);
  }
  return result;
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Determine which match in the next round a winner advances to.
 * Returns { roundNumber, bracketPosition } of the next match,
 * and whether the winner fills the team1 or team2 slot.
 */
export function getNextMatch(
  roundNumber: number,
  bracketPosition: number,
  totalRounds: number
): {
  roundNumber: number;
  bracketPosition: number;
  slot: "team1" | "team2";
} | null {
  if (roundNumber >= totalRounds) return null;

  return {
    roundNumber: roundNumber + 1,
    bracketPosition: Math.floor(bracketPosition / 2),
    slot: bracketPosition % 2 === 0 ? "team1" : "team2",
  };
}

/**
 * Given a bye match (one team present, one null), return the seed that
 * auto-advances. Returns null if not a bye match.
 */
export function getByeWinner(match: MatchSpec): number | null {
  if (match.team1Seed !== null && match.team2Seed === null) {
    return match.team1Seed;
  }
  if (match.team1Seed === null && match.team2Seed !== null) {
    return match.team2Seed;
  }
  return null;
}
