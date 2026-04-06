import { BracketSide } from "@prisma/client";

export type RoundSpec = {
  roundNumber: number;
  roundName: string;
  matchCount: number;
  bracket: BracketSide;
};

export type MatchSpec = {
  roundNumber: number;
  bracketPosition: number;
  team1Seed: number | null;
  team2Seed: number | null;
  bracket: BracketSide;
};

export type BracketSpec = {
  rounds: RoundSpec[];
  matches: MatchSpec[];
};

export type DoubleEliminationBracketSpec = BracketSpec & {
  wbRoundCount: number;
  lbRoundCount: number;
};

export type AdvancementTarget = {
  roundNumber: number;
  bracketPosition: number;
  bracket: BracketSide;
  slot: "team1" | "team2";
};

export type Advancement = {
  winner: AdvancementTarget | null;
  loser: AdvancementTarget | null;
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
 * Get the display name for a winners bracket round.
 */
export function getWBRoundName(
  roundNumber: number,
  totalWBRounds: number
): string {
  const roundsFromEnd = totalWBRounds - roundNumber;
  switch (roundsFromEnd) {
    case 0:
      return "WB Final";
    case 1:
      return "WB Semifinals";
    case 2:
      return "WB Quarterfinals";
    default:
      return `WB Round of ${Math.pow(2, roundsFromEnd + 1)}`;
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
      bracket: "WINNERS" as BracketSide,
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
      bracket: "WINNERS" as BracketSide,
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
        bracket: "WINNERS" as BracketSide,
      });
    }
  }

  return { rounds, matches };
}

/**
 * Generate a double-elimination bracket for the given number of teams.
 * Includes winners bracket, losers bracket, and grand final.
 * Minimum 4 teams required.
 */
export function generateDoubleEliminationBracket(
  teamCount: number
): DoubleEliminationBracketSpec {
  if (teamCount < 4) {
    throw new Error("Need at least 4 teams for a double elimination bracket");
  }

  const totalSlots = nextPowerOf2(teamCount);
  const wbRoundCount = Math.log2(totalSlots);
  const lbRoundCount = 2 * (wbRoundCount - 1);

  const rounds: RoundSpec[] = [];
  const matches: MatchSpec[] = [];

  // Winners Bracket rounds
  for (let r = 1; r <= wbRoundCount; r++) {
    const matchCount = totalSlots / Math.pow(2, r);
    rounds.push({
      roundNumber: r,
      roundName: getWBRoundName(r, wbRoundCount),
      matchCount,
      bracket: "WINNERS" as BracketSide,
    });
  }

  // Winners Bracket matches - first round with seeding
  const firstRoundMatchCount = totalSlots / 2;
  const seedPairings = generateSeededPairings(totalSlots);

  for (let i = 0; i < firstRoundMatchCount; i++) {
    const [seed1, seed2] = seedPairings[i];
    const team1Seed = seed1 <= teamCount ? seed1 : null;
    const team2Seed = seed2 <= teamCount ? seed2 : null;

    matches.push({
      roundNumber: 1,
      bracketPosition: i,
      team1Seed,
      team2Seed,
      bracket: "WINNERS" as BracketSide,
    });
  }

  // Winners Bracket - later rounds (no seeded teams)
  for (let r = 2; r <= wbRoundCount; r++) {
    const matchCount = totalSlots / Math.pow(2, r);
    for (let i = 0; i < matchCount; i++) {
      matches.push({
        roundNumber: r,
        bracketPosition: i,
        team1Seed: null,
        team2Seed: null,
        bracket: "WINNERS" as BracketSide,
      });
    }
  }

  // Losers Bracket rounds and matches
  for (let lbR = 1; lbR <= lbRoundCount; lbR++) {
    const matchCount = getLBRoundMatchCount(lbR, wbRoundCount);
    const isOdd = lbR % 2 === 1;

    let roundName: string;
    if (lbR === lbRoundCount) {
      roundName = "LB Final";
    } else {
      roundName = `LB Round ${lbR}`;
    }

    rounds.push({
      roundNumber: lbR,
      roundName,
      matchCount,
      bracket: "LOSERS" as BracketSide,
    });

    for (let i = 0; i < matchCount; i++) {
      matches.push({
        roundNumber: lbR,
        bracketPosition: i,
        team1Seed: null,
        team2Seed: null,
        bracket: "LOSERS" as BracketSide,
      });
    }
  }

  // Grand Final: 1 round, 1 match
  rounds.push({
    roundNumber: 1,
    roundName: "Grand Final",
    matchCount: 1,
    bracket: "GRAND_FINAL" as BracketSide,
  });

  matches.push({
    roundNumber: 1,
    bracketPosition: 0,
    team1Seed: null,
    team2Seed: null,
    bracket: "GRAND_FINAL" as BracketSide,
  });

  return { rounds, matches, wbRoundCount, lbRoundCount };
}

/**
 * Calculate the number of matches in a given losers bracket round.
 * Odd LB rounds are "internal" (halve after), even are "dropdown" (keep count).
 * LB R1 starts with totalSlots / 4 matches.
 */
export function getLBRoundMatchCount(
  lbRound: number,
  wbRoundCount: number
): number {
  const totalSlots = Math.pow(2, wbRoundCount);
  // LB R1 starts with totalSlots / 4 matches
  let count = totalSlots / 4;

  for (let r = 2; r <= lbRound; r++) {
    if (r % 2 === 1) {
      // Odd (internal): halve the match count
      count = count / 2;
    }
    // Even (dropdown): keep the same count
  }

  return count;
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

/**
 * Get advancement targets for a match in a double elimination bracket.
 * Returns where the winner and loser of the match should go.
 */
export function getAdvancement(
  bracket: BracketSide,
  roundNumber: number,
  bracketPosition: number,
  wbRoundCount: number,
  lbRoundCount: number
): Advancement {
  switch (bracket) {
    case "WINNERS":
      return getWBAdvancement(
        roundNumber,
        bracketPosition,
        wbRoundCount,
        lbRoundCount
      );
    case "LOSERS":
      return getLBAdvancement(
        roundNumber,
        bracketPosition,
        wbRoundCount,
        lbRoundCount
      );
    case "GRAND_FINAL":
      return { winner: null, loser: null };
  }
}

/**
 * Get advancement for a winners bracket match.
 * Winner advances within WB (or to Grand Final from WB Final).
 * Loser drops to the losers bracket.
 */
function getWBAdvancement(
  roundNumber: number,
  bracketPosition: number,
  wbRoundCount: number,
  lbRoundCount: number
): Advancement {
  // Winner advancement
  let winner: AdvancementTarget | null;

  if (roundNumber === wbRoundCount) {
    // WB Final winner goes to Grand Final as team1
    winner = {
      roundNumber: 1,
      bracketPosition: 0,
      bracket: "GRAND_FINAL" as BracketSide,
      slot: "team1",
    };
  } else {
    // Advance within WB (same as single elim)
    winner = {
      roundNumber: roundNumber + 1,
      bracketPosition: Math.floor(bracketPosition / 2),
      bracket: "WINNERS" as BracketSide,
      slot: bracketPosition % 2 === 0 ? "team1" : "team2",
    };
  }

  // Loser drops to LB
  let loser: AdvancementTarget | null;

  // Reverse positions to avoid rematches
  const matchCountInRound = Math.pow(2, wbRoundCount) / Math.pow(2, roundNumber);
  const reversedPosition = matchCountInRound - 1 - bracketPosition;

  if (roundNumber === 1) {
    // WB R1 losers go to LB R1 as team1, positions reversed
    loser = {
      roundNumber: 1,
      bracketPosition: reversedPosition,
      bracket: "LOSERS" as BracketSide,
      slot: "team1",
    };
  } else if (roundNumber === wbRoundCount) {
    // WB Final loser goes to LB Final as team2
    loser = {
      roundNumber: lbRoundCount,
      bracketPosition: 0,
      bracket: "LOSERS" as BracketSide,
      slot: "team2",
    };
  } else {
    // WB R2+ losers go to LB even round 2*(R-1) as team2, positions reversed
    const lbTargetRound = 2 * (roundNumber - 1);
    loser = {
      roundNumber: lbTargetRound,
      bracketPosition: reversedPosition,
      bracket: "LOSERS" as BracketSide,
      slot: "team2",
    };
  }

  return { winner, loser };
}

/**
 * Get advancement for a losers bracket match.
 * Winner advances within LB (or to Grand Final from LB Final).
 * Loser is eliminated.
 */
function getLBAdvancement(
  roundNumber: number,
  bracketPosition: number,
  wbRoundCount: number,
  lbRoundCount: number
): Advancement {
  // Losers in LB are always eliminated
  const loser: AdvancementTarget | null = null;

  let winner: AdvancementTarget | null;

  if (roundNumber === lbRoundCount) {
    // LB Final winner goes to Grand Final as team2
    winner = {
      roundNumber: 1,
      bracketPosition: 0,
      bracket: "GRAND_FINAL" as BracketSide,
      slot: "team2",
    };
  } else {
    const isOddRound = roundNumber % 2 === 1;

    if (isOddRound) {
      // Internal (odd) round: halve position, team1 slot
      winner = {
        roundNumber: roundNumber + 1,
        bracketPosition: Math.floor(bracketPosition / 2),
        bracket: "LOSERS" as BracketSide,
        slot: "team1",
      };
    } else {
      // Dropdown (even) round: keep position, team1 slot
      winner = {
        roundNumber: roundNumber + 1,
        bracketPosition: bracketPosition,
        bracket: "LOSERS" as BracketSide,
        slot: "team1",
      };
    }
  }

  return { winner, loser };
}
