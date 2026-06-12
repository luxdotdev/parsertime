export type ModeFamily = "control" | "escort_hybrid" | "push" | "flashpoint";

export const MODE_FAMILIES: ModeFamily[] = [
  "control",
  "escort_hybrid",
  "push",
  "flashpoint",
];

/** Clash is retired and unsupported; unknown future modes are also null. */
export function mapTypeToModeFamily(mapType: string): ModeFamily | null {
  switch (mapType) {
    case "Control":
      return "control";
    case "Escort":
    case "Hybrid":
      return "escort_hybrid";
    case "Push":
      return "push";
    case "Flashpoint":
      return "flashpoint";
    default:
      return null;
  }
}

/** One team's view of the game at an instant. All "Diff"s are own − enemy. */
export type GameState = {
  modeFamily: ModeFamily;
  matchTime: number;
  roundNumber: number;
  aliveDiff: number; // −5..+5
  ultBankDiff: number; // banked (charged, unspent) ults
  scoreDiff: number;
  objProgressOwn: number; // 0..1, latest progress attributed to own team
  objProgressEnemy: number; // 0..1
  timeRemaining: number; // seconds; 0 when unknown
  isAttacker: 0 | 1; // current round's capturing team is own team
};

/** Normalized event log for one map — decoupled from Prisma rows and the
 * parser workbook so the sweep is testable with synthetic data. */
export type WPEventLog = {
  modeFamily: ModeFamily;
  team1: string;
  team2: string;
  kills: {
    time: number;
    victimTeam: string;
    victimName: string;
    attackerTeam?: string;
    attackerName?: string;
  }[];
  rezzes: { time: number; team: string; player: string }[];
  ultCharged: { time: number; team: string; player: string }[];
  ultStart: { time: number; team: string; player: string }[];
  rounds: {
    roundNumber: number;
    start: number;
    end: number;
    capturingTeam: string;
    startScore1: number;
    startScore2: number;
    endScore1: number;
    endScore2: number;
  }[];
  /** Point + payload progress merged; value is the raw 0..100 figure. */
  progress: { time: number; team: string; value: number }[];
  setupCompletes: {
    time: number;
    roundNumber: number;
    timeRemaining: number;
  }[];
};

export type Snapshot = {
  matchTime: number;
  roundNumber: number;
  team1: GameState;
  team2: GameState;
};

export type DatasetRow = {
  matchId: number; // MapDataId — CV grouping key
  roundId: string; // `${matchId}-${roundNumber}`
  label: 0 | 1;
  features: number[];
};

export const RESPAWN_SECONDS = 10;
export const SNAPSHOT_INTERVAL_SECONDS = 5;
