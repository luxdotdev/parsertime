import type { BracketSide } from "@prisma/client";

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

export type RoundRobinSEBracketSpec = BracketSpec & {
  rrRoundCount: number;
  playoffTeamCount: number;
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

export function generateSingleEliminationBracket(
  teamCount: number
): BracketSpec {
  if (teamCount < 2) {
    throw new Error("Need at least 2 teams for a bracket");
  }

  const totalSlots = nextPowerOf2(teamCount);
  const totalRounds = Math.log2(totalSlots);
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

  for (let r = 1; r <= wbRoundCount; r++) {
    const matchCount = totalSlots / Math.pow(2, r);
    rounds.push({
      roundNumber: r,
      roundName: getWBRoundName(r, wbRoundCount),
      matchCount,
      bracket: "WINNERS" as BracketSide,
    });
  }

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

  for (let lbR = 1; lbR <= lbRoundCount; lbR++) {
    const matchCount = getLBRoundMatchCount(lbR, wbRoundCount);
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

export function getLBRoundMatchCount(
  lbRound: number,
  wbRoundCount: number
): number {
  const totalSlots = Math.pow(2, wbRoundCount);
  let count = totalSlots / 4;

  for (let r = 2; r <= lbRound; r++) {
    if (r % 2 === 1) {
      count = count / 2;
    }
  }

  return count;
}

function generateSeededPairings(totalSlots: number): [number, number][] {
  const order = bracketOrder(totalSlots);
  const pairings: [number, number][] = [];
  for (let i = 0; i < order.length; i += 2) {
    pairings.push([order[i], order[i + 1]]);
  }
  return pairings;
}

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

export function getByeWinner(match: MatchSpec): number | null {
  if (match.team1Seed !== null && match.team2Seed === null) {
    return match.team1Seed;
  }
  if (match.team1Seed === null && match.team2Seed !== null) {
    return match.team2Seed;
  }
  return null;
}

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
    case "ROUND_ROBIN":
      return { winner: null, loser: null };
  }
}

function getWBAdvancement(
  roundNumber: number,
  bracketPosition: number,
  wbRoundCount: number,
  lbRoundCount: number
): Advancement {
  let winner: AdvancementTarget | null;

  if (roundNumber === wbRoundCount) {
    winner = {
      roundNumber: 1,
      bracketPosition: 0,
      bracket: "GRAND_FINAL" as BracketSide,
      slot: "team1",
    };
  } else {
    winner = {
      roundNumber: roundNumber + 1,
      bracketPosition: Math.floor(bracketPosition / 2),
      bracket: "WINNERS" as BracketSide,
      slot: bracketPosition % 2 === 0 ? "team1" : "team2",
    };
  }

  let loser: AdvancementTarget | null;

  const matchCountInRound =
    Math.pow(2, wbRoundCount) / Math.pow(2, roundNumber);
  const reversedPosition = matchCountInRound - 1 - bracketPosition;

  if (roundNumber === 1) {
    loser = {
      roundNumber: 1,
      bracketPosition: reversedPosition,
      bracket: "LOSERS" as BracketSide,
      slot: "team1",
    };
  } else if (roundNumber === wbRoundCount) {
    loser = {
      roundNumber: lbRoundCount,
      bracketPosition: 0,
      bracket: "LOSERS" as BracketSide,
      slot: "team2",
    };
  } else {
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

function getLBAdvancement(
  roundNumber: number,
  bracketPosition: number,
  wbRoundCount: number,
  lbRoundCount: number
): Advancement {
  const loser: AdvancementTarget | null = null;

  let winner: AdvancementTarget | null;

  if (roundNumber === lbRoundCount) {
    winner = {
      roundNumber: 1,
      bracketPosition: 0,
      bracket: "GRAND_FINAL" as BracketSide,
      slot: "team2",
    };
  } else {
    const isOddRound = roundNumber % 2 === 1;

    if (isOddRound) {
      winner = {
        roundNumber: roundNumber + 1,
        bracketPosition: Math.floor(bracketPosition / 2),
        bracket: "LOSERS" as BracketSide,
        slot: "team1",
      };
    } else {
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

function generateRoundRobinSchedule(teamCount: number): [number, number][][] {
  const rounds: [number, number][][] = [];
  const teams = Array.from({ length: teamCount }, (_, i) => i);
  const hasGhost = teamCount % 2 !== 0;
  if (hasGhost) teams.push(-1);
  const n = teams.length;
  const roundCount = n - 1;

  for (let round = 0; round < roundCount; round++) {
    const matches: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home !== -1 && away !== -1) {
        matches.push([home, away]);
      }
    }
    rounds.push(matches);
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }
  return rounds;
}

export function generateRoundRobinSEBracket(
  teamCount: number,
  advancingTeams?: number
): RoundRobinSEBracketSpec {
  if (teamCount < 3) {
    throw new Error("Need at least 3 teams for a round robin bracket");
  }

  const playoffTeamCount = advancingTeams ?? teamCount;
  if (playoffTeamCount < 2 || playoffTeamCount > teamCount) {
    throw new Error(
      `advancingTeams must be between 2 and ${teamCount}, got ${playoffTeamCount}`
    );
  }

  const rrSchedule = generateRoundRobinSchedule(teamCount);
  const rrRoundCount = rrSchedule.length;

  const rounds: RoundSpec[] = [];
  const matches: MatchSpec[] = [];

  for (let r = 0; r < rrRoundCount; r++) {
    const roundMatches = rrSchedule[r];
    rounds.push({
      roundNumber: r + 1,
      roundName: `RR Round ${r + 1}`,
      matchCount: roundMatches.length,
      bracket: "ROUND_ROBIN" as BracketSide,
    });

    for (let m = 0; m < roundMatches.length; m++) {
      const [teamIdx1, teamIdx2] = roundMatches[m];
      matches.push({
        roundNumber: r + 1,
        bracketPosition: m,
        team1Seed: teamIdx1 + 1,
        team2Seed: teamIdx2 + 1,
        bracket: "ROUND_ROBIN" as BracketSide,
      });
    }
  }

  const playoffSlots = nextPowerOf2(playoffTeamCount);
  const playoffRounds = Math.log2(playoffSlots);

  for (let r = 1; r <= playoffRounds; r++) {
    const matchCount = playoffSlots / Math.pow(2, r);
    rounds.push({
      roundNumber: r,
      roundName: getRoundName(r, playoffRounds),
      matchCount,
      bracket: "WINNERS" as BracketSide,
    });

    for (let m = 0; m < matchCount; m++) {
      matches.push({
        roundNumber: r,
        bracketPosition: m,
        team1Seed: null,
        team2Seed: null,
        bracket: "WINNERS" as BracketSide,
      });
    }
  }

  return { rounds, matches, rrRoundCount, playoffTeamCount };
}
